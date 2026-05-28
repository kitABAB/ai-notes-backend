// 📂 src/features/notes/notes.task.ts
import { db } from "../../db";
import { Material, notes, users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { buildSummaryPrompt } from "./notes.builder";

import { generateSummaryStream } from "../../lib/ai";
import { redis } from "../../lib/redis";

export const runSummaryTaskAsync = async (
  noteId: number,
  userId: number,
  materials: any[],
  originalQuota: number,
) => {
  // 💥 改用 stream 专用的 key
  const streamKey = `note:stream:${noteId}`;

  try {
    // 1. 构建 AI 总结的 Prompt
    const prompt = buildSummaryPrompt(materials);

    // 炼丹前，删掉可能存在的旧流
    await redis.del(streamKey);

    const result = await generateSummaryStream(prompt);
    let fullText = "";

    // 2. 边监听真实网络流，边使用 XADD 写入 Redis Stream
    for await (const textPart of result.textStream) {
      fullText += textPart;

      // 💥 核心修改：XADD key * field value
      // '*' 代表让 Redis 自动生成带时间戳的严格递增 ID (如 1685000-0)
      // 我们在每条消息里存一个键值对：'text' -> textPart
      await redis.xadd(streamKey, "*", "text", textPart);
    }

    if (!fullText) throw new Error("大模型返回空结果");

    // 3. 稳稳落盘到 PG
    await db
      .update(notes)
      .set({ content: fullText, aiStatus: "completed", updatedAt: new Date() })
      .where(eq(notes.id, noteId));

    // 4. 💥 写入特殊的结束标记行
    await redis.xadd(streamKey, "*", "event", "DONE");
    // 设置 1 小时过期，防内存撑爆
    await redis.expire(streamKey, 3600);

    console.log(`✅ [Task Success] Note ${noteId} Stream 生产完毕.`);
  } catch (error: any) {
    console.error(`❌ [Task Failed] Note ${noteId}:`, error.message);

    await db.transaction(async (tx) => {
      await tx
        .update(notes)
        .set({ aiStatus: "failed" })
        .where(eq(notes.id, noteId));
      await tx
        .update(users)
        .set({ aiQuota: originalQuota })
        .where(eq(users.id, userId));
    });

    // 💥 写入特殊的错误标记行
    await redis.xadd(streamKey, "*", "event", "ERROR", "msg", error.message);
    await redis.expire(streamKey, 3600);
  }
};
