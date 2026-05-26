// 📂 src/features/notes/notes.dto.ts
import { z } from "zod";

export const createNoteSchema = z.object({});

export const addMaterialSchema = z.object({
  // 💥 类型严格对齐 AI SDK
  type: z.enum(["text", "image", "file", "url"] as const, {
    message:
      "非法的物料类型，仅支持 text(文本), image(图片), file(文件), url(网页链接)",
  }),
  rawContent: z.string().min(1, "物料内容不能为空"),
});

export type AddMaterialDto = z.infer<typeof addMaterialSchema>;

export const noteIdParamSchema = z.object({
  // 使用 z.coerce.number()：自动把 URL 里的字符串尝试转成数字，转失败直接报错
  id: z.coerce.number().int("ID必须是整数").positive("ID必须是正数"),
});
