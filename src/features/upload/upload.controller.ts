// 📂 src/features/upload/upload.controller.ts
import { Hono } from "hono";
import { authGuard } from "../../middlewares/auth.middleware";
import { processAssetUpload, processBatchAssetUpload } from "./upload.service";
import { uploadSingleSchema, uploadBatchSchema } from "./upload.dto";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../../types/env";

export const uploadRouter = new Hono<AppEnv>();

// 🛡️ 全局强制 Token 认证
uploadRouter.use("/*", authGuard);

/**
 * 🔑 接口一：POST /api/upload/private
 * 单文件上传 -> 强制直击【私有安全桶】
 */
uploadRouter.post("/private", zValidator("form", uploadSingleSchema), async (c) => {
  try {
    const { file } = c.req.valid("form");
    const userId = c.get("user").sub;

    // 第三个参数死锁 false，强制走私有落盘逻辑
    const result = await processAssetUpload(file, userId, false);

    return c.json({ message: "单文件私有资产落盘成功", data: result }, 201);
  } catch (error: any) {
    return c.json({ error: "私有存储引擎内部响应异常" }, 500);
  }
});

/**
 * 🔑 接口二：POST /api/upload/public
 * 单文件上传 -> 强制直击【公有只读桶】（直接分发永久外链）
 */
uploadRouter.post("/public", zValidator("form", uploadSingleSchema), async (c) => {
  try {
    const { file } = c.req.valid("form");
    const userId = c.get("user").sub;

    // 第三个参数死锁 true，强制走公有分发逻辑
    const result = await processAssetUpload(file, userId, true);

    return c.json({ message: "单文件公有资产发布成功", data: result }, 201);
  } catch (error: any) {
    return c.json({ error: "公有存储引擎内部响应异常" }, 500);
  }
});

/**
 * 🔑 接口三：POST /api/upload/batch
 * 批量多文件并发上传 -> 通过 isPublic 参数动态控权（不传默认私有）
 */
uploadRouter.post("/batch", zValidator("form", uploadBatchSchema), async (c) => {
  try {
    const { files, isPublic } = c.req.valid("form");
    const userId = c.get("user").sub;

    // 唤醒 Promise.all 并发矩阵进行多路传输
    const results = await processBatchAssetUpload(files, userId, isPublic);

    return c.json({
      message: isPublic ? "批量公有资产发布成功" : "批量私有资产并发落盘成功",
      data: results,
    }, 201);
  } catch (error: any) {
    return c.json({ error: "批量存储矩阵多路并发传输失败" }, 500);
  }
});