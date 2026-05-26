import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../../types/env";
import { authCredentialSchema, refreshTokenSchema } from "./auth.dto";
import * as AuthService from "./auth.service";
import { Hono } from "hono";
import { authGuard } from "../../middlewares/auth.middleware";

const authFeature = new Hono<AppEnv>();

authFeature.post(
  "/register",
  zValidator("json", authCredentialSchema),
  async (c) => {
    try {
      // 这里的 validatedData 会被完美推导为 AuthRequestDto
      const validatedData = c.req.valid("json");

      // 呼叫后台大脑
      const result = await AuthService.registerUser(validatedData);

      return c.json(result, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  },
);

authFeature.post(
  "/login",
  zValidator("json", authCredentialSchema),
  async (c) => {
    try {
      const validatedData = c.req.valid("json");

      const result = await AuthService.loginUser(validatedData);

      return c.json(result, 200);
    } catch (error: any) {
      return c.json({ error: error.message }, 401);
    }
  },
);

authFeature.get("/me", authGuard, async (c) => {
  // 拿到通过 JWT 验证挂载的 Payload
  const userPayload = c.get("user");

  // 如果需要完整的 UserInfoDto，这里可以调用 Service 再去库里捞一次最新数据
  // const fullUserInfo = await AuthService.getUserProfile(userPayload.sub);

  return c.json(
    {
      message: "身份获取成功",
      user: userPayload,
    },
    200,
  );
});

// 加在 getProfile 之前
authFeature.post(
  "/refresh",
  zValidator("json", refreshTokenSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await AuthService.refreshAccessToken(data);
      return c.json(result, 200);
    } catch (error: any) {
      return c.json({ error: error.message }, 401);
    }
  },
);
export default authFeature;
