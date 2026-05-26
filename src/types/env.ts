// src/types/env.ts
import type { JWTPayload } from "hono/utils/jwt/types";
// 💥 魔法在这里：使用交叉类型 (&) 将基础字段和业务字段完美缝合！
export type AppJwtPayload = JWTPayload & {
  sub: number; // 强制覆写：我们的系统里，sub 必须是代表 user.id 的数字
  email: string; // 我们的独家自定义字段
};
// 🌍 这是一个全局的 Hono 环境泛型契约
export type AppEnv = {
  Variables: {
    user: AppJwtPayload; // 告诉全局 Hono，我们有一个叫 user 的变量
  };
};
