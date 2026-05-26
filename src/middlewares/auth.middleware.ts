import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { AppEnv, AppJwtPayload } from "../types/env";

export const authGuard = createMiddleware<AppEnv>(async (c, next) => {
  try {
    // 解析 authorization header
    const authHeader =
      c.req.header("Authorization") || c.req.header("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          error: "Unauthorized",
          message: "Missing or invalid authorization header",
        },
        401,
      );
    }
    const token = authHeader.split(" ")[1];

    // 校验 token
    const decodedPayload = (await verify(
      token,
      process.env.JWT_ACCESS_SECRET as string,
      "HS256",
    )) as AppJwtPayload;
    // 装填用户信息到上下文
    c.set("user", decodedPayload);
    await next();
  } catch (error) {
    console.error("Authentication error:", error);
    return c.json(
      { error: "Unauthorized", message: "Invalid or expired token" },
      401,
    );
  }
});
