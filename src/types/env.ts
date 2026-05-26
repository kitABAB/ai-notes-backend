// src/types/env.ts
import type { JWTPayload } from "hono/utils/jwt/types";

// 🌍 这是一个全局的 Hono 环境泛型契约
export type AppEnv = {
  Variables: {
    user: JWTPayload; // 告诉全局 Hono，我们有一个叫 user 的变量
  };
};
