import { pgEnum } from "drizzle-orm/pg-core";

// 1. 核心枚举定义 (物理级防脏数据)
export const aiStatusEnum = pgEnum("ai_status", [
  "idle",
  "gathering",
  "processing",
  "completed",
  "failed",
]);
export const materialTypeEnum = pgEnum("material_type", [
  "text",
  "image",
  "file",
  "url",
]);
