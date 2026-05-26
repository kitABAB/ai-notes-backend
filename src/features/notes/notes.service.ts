// 📂 src/features/notes/notes.service.ts
import { db } from "../../db";
import { notes, materials } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import type { AddMaterialDto } from "./notes.dto";

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
