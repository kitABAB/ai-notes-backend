// 📂 src/features/notes/notes.service.ts
import { db } from "../../db";
import { notes, materials, users } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import type { AddMaterialDto } from "./notes.dto";
import { createConcurrencyLock } from "../../lib/p-limit";
import { BusinessError } from "../../lib/error";
import { runSummaryTaskAsync } from "./notes.task";
import { redis } from "../../lib/redis";

// 1. 建筐
export const createCollectionBox = async (userId: number) => {
  const [newNote] = await db
    .insert(notes)
    .values({
      userId,
      aiStatus: "gathering",
    })
    .returning();
  return newNote;
};

// 2. 投喂
export const addMaterialToNote = async (
  noteId: number,
  userId: number,
  data: AddMaterialDto,
) => {
  // 越权校验：必须是本人的笔记
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
  });

  if (!note) throw new Error("找不到该笔记或无权操作");
  if (note.aiStatus === "processing")
    throw new Error("AI 正在炼丹中，请稍后再试");

  const [newMaterial] = await db
    .insert(materials)
    .values({
      noteId,
      type: data.type,
      rawContent: data.rawContent,
    })
    .returning();

  return newMaterial;
};

// 3. 查全貌 (感受 with 的威力)
export const getNoteWithMaterials = async (noteId: number, userId: number) => {
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
    with: {
      materials: true, // 💥 魔法开启：连表嵌套查询
    },
  });

  if (!note) throw new Error("找不到该笔记或无权操作");
  return note;
};

// 💥 实例化一个全局并发锁，限制最多同时有 5 个大模型请求在跑
const aiConcurrencyLock = createConcurrencyLock(5);

// 4. 召唤大模型炼丹 (核心状态机与调度逻辑)
export const dispatchSummaryTask = async (noteId: number, userId: number) => {
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
    with: { materials: true },
  });

  if (!note) throw new BusinessError(404, "找不到该笔记或无权操作");
  if (note.materials.length === 0)
    throw new BusinessError(400, "该收集箱为空，无法总结");
  if (note.aiStatus === "processing")
    throw new BusinessError(429, "AI 正在处理中，请勿重复提交");

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.aiQuota <= 0)
    throw new BusinessError(402, "AI 免费额度已用完，请充值");

  // 流转笔记状态到 processing，并扣减用户 AI 配额
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ aiQuota: user.aiQuota - 1 })
      .where(eq(users.id, userId));
    await tx
      .update(notes)
      .set({ aiStatus: "processing" })
      .where(eq(notes.id, noteId));
  });

  // 调大模型的炼丹任务，注意这里没有 await，任务会在后台默默执行
  aiConcurrencyLock(() =>
    runSummaryTaskAsync(noteId, userId, note.materials, user.aiQuota),
  ).catch(console.error);

  return { noteId, status: "processing" };
};

export const consumeNoteStream = async (
  noteId: number,
  writeEvent: (data: string) => Promise<void>,
  isAborted: () => boolean,
) => {
  const streamKey = `note:stream:${noteId}`;
  let lastSeenId = "0";

  while (!isAborted()) {
    const response = await redis.xread(
      "BLOCK",
      2000,
      "STREAMS",
      streamKey,
      lastSeenId,
    );
    if (!response) continue;

    for (const [id, fields] of response[0][1]) {
      lastSeenId = id;

      if (fields[0] === "text") {
        await writeEvent(`data: ${JSON.stringify({ text: fields[1] })}\n\n`);
      } else if (fields[0] === "event") {
        if (fields[1] === "DONE") {
          await writeEvent(`data: [DONE]\n\n`);
          return; // 结束消费
        }
        if (fields[1] === "ERROR") {
          await writeEvent(`data: [ERROR] ${fields[3]}\n\n`);
          return; // 结束消费
        }
      }
    }
  }
};
