import { Hono } from "hono";
import { AppEnv } from "../../types/env";
import { authGuard } from "../../middlewares/auth.middleware";
import {
  addMaterialToNote,
  consumeNoteStream,
  createCollectionBox,
  dispatchSummaryTask,
  getNoteWithMaterials,
} from "./notes.service";
import { addMaterialSchema, noteIdParamSchema } from "./notes.dto";
import { zValidator } from "@hono/zod-validator";
import { BusinessError } from "../../lib/error";
import { createSubClient, redis } from "../../lib/redis";
import { stream } from "hono/streaming";
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

// 【接口 1】触发生成 (保留你原本严谨的代码逻辑)
notesFeature.post(
  "/:id/summary",
  authGuard,
  zValidator("param", noteIdParamSchema),
  async (c) => {
    try {
      // 继续使用你封装好的 dispatchSummaryTask，它内部包含了状态拦截和任务分发
      const result = await dispatchSummaryTask(
        c.req.valid("param").id,
        c.get("user").sub,
      );

      return c.json(
        {
          message: "任务已提交，后台正在处理中",
          data: result,
        },
        202,
      );
    } catch (error: any) {
      if (error instanceof BusinessError) {
        return c.json({ error: error.message }, error.statusCode as any);
      }
      console.error("未捕获的系统异常:", error);
      return c.json({ error: "服务器内部错误" }, 500);
    }
  },
);

// 【接口 2】监听追赶流 (SSE) - 同样加上严谨的校验
notesFeature.get(
  "/:id/listen-stream",
  authGuard,
  zValidator("param", noteIdParamSchema),
  async (c) => {
    const noteId = c.req.valid("param").id;

    return stream(c, async (streamInstance) => {
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");

      let alive = true;
      streamInstance.onAbort(() => {
        console.log(`📡 [SSE Close] 用户离开，释放 Stream 监听`);
        alive = false;
      });

      try {
        // 将外层的 stream 写入方法和存活状态，注入到底层 Service 中
        await consumeNoteStream(
          noteId,
          async (data) => {
            await streamInstance.write(data); // 明确等待写入完成，但没有 return 语句，因此返回类型变成了 Promise<void>
          },
          () => !alive,
        );
      } catch (err) {
        console.error("Redis Stream 读取暴雷:", err);
        await streamInstance.write(`data: [ERROR] 服务器流处理异常\n\n`);
      }
    });
  },
);

export default notesFeature;
