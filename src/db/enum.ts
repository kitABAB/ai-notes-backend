import { pgEnum } from "drizzle-orm/pg-core";

/**
 * AI 总结任务的生命周期状态枚举
 */
export const aiStatusEnum = pgEnum("ai_status", [
  "idle",       // 闲置
  "gathering",  // 物料收集中
  "processing", // AI 正在处理
  "completed",  // 处理成功完成
  "failed",     // 处理失败
]);

/**
 * 严格的多模态物料类型枚举
 */
export const materialTypeEnum = pgEnum("material_type", [
  "text",  // 纯文本或 Markdown
  "image", // 图片（安全存储于 RustFS/OSS）
  "video", // 视频（安全存储于 RustFS/OSS）
  "file",  // PDF/Word 等附件（存储于 RustFS/OSS）
  "url",   // 网页链接/剪藏书签
]);