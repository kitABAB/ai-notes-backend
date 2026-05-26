import { Hono } from "hono";
import { AppEnv } from "../../types/env";
import { authGuard } from "../../middlewares/auth.middleware";
import {
  addMaterialToNote,
  createCollectionBox,
  getNoteWithMaterials,
} from "./notes.service";
import { addMaterialSchema, noteIdParamSchema } from "./notes.dto";
import { zValidator } from "@hono/zod-validator";

const notesFeature = new Hono<AppEnv>();
// 🛡️ 绝对防御：Notes 模块全部接口强制需要 Token
notesFeature.use("/*", authGuard);

// 1. 创建笔记
notesFeature.post("/", async (c) => {
  try {
    return c.json(
      {
        message: "收集箱创建成功",
        data: await createCollectionBox(c.get("user").sub),
      },
      201,
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// 🟢 2. 投喂物料 (POST /api/notes/:id/materials)
notesFeature.post(
  "/:id/materials",
  zValidator("param", noteIdParamSchema),
  zValidator("json", addMaterialSchema),
  async (c) => {
    try {
      const material = await addMaterialToNote(
        c.req.valid("param").id,
        c.get("user").sub,
        c.req.valid("json"),
      );

      return c.json({ message: "物料投喂成功", data: material }, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  },
);

// 🟢 3. 查看收集箱全貌 (GET /api/notes/:id)
notesFeature.get("/:id", zValidator("param", noteIdParamSchema), async (c) => {
  try {
    const noteDetails = await getNoteWithMaterials(
      c.req.valid("param").id,
      c.get("user").sub,
    );
    return c.json({ message: "获取成功", data: noteDetails }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 404);
  }
});

export default notesFeature;
