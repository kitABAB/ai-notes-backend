import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { sign, verify } from "hono/jwt";
import type {
  AuthRequestDto,
  UserInfoDto,
  LoginResponseDto,
  RegisterResponseDto,
} from "./auth.dto";
import type { RefreshTokenDto } from "./auth.dto"; // 确保引入了 Dto

export const registerUser = async (
  data: AuthRequestDto,
): Promise<RegisterResponseDto> => {
  const { email, password } = data;

  // 1. 实弹下井：查重
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    throw new Error("该邮箱已被注册");
  }

  // 2. 核心计算：加盐哈希
  const passwordHash = await Bun.password.hash(password);

  // 3. 实弹下井：入库并返回新行
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      // 假设 schema 里有默认值，如果没有，Drizzle 会根据你的蓝图要求填入
    })
    .returning();

  // 4. 组装输出契约 (严格符合 RegisterResponseDto)
  return {
    message: "注册成功",
    user: {
      id: newUser.id,
      email: newUser.email,
    },
  };
};

export const loginUser = async (
  data: AuthRequestDto,
): Promise<LoginResponseDto> => {
  const { email, password } = data;

  // 1. 实弹下井：根据邮箱捞人
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new Error("邮箱或密码错误");
  }

  // 2. 核心计算：物理碰撞比对密码
  const isMatch = await Bun.password.verify(password, user.passwordHash);
  if (!isMatch) {
    throw new Error("邮箱或密码错误");
  }

  // 3. 核心计算：签发双 Token
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await sign(
    { sub: user.id, email: user.email, exp: now + 60 * 15 },
    process.env.JWT_ACCESS_SECRET as string,
    "HS256",
  );

  const refreshToken = await sign(
    { sub: user.id, exp: now + 60 * 60 * 24 * 7 },
    process.env.JWT_REFRESH_SECRET as string,
    "HS256",
  );

  // 4. 组装输出契约 (严格映射到 UserInfoDto，假设 db 里有这些字段)
  const userInfo: UserInfoDto = {
    id: user.id,
    email: user.email,
    role: user.role || "user", // 降级保护，防止 schema 中没有对应字段报错
    aiQuota: user.aiQuota || 100, // 降级保护
  };

  return {
    message: "登录成功",
    accessToken,
    refreshToken,
    user: userInfo,
  };
};

export const refreshAccessToken = async (data: RefreshTokenDto) => {
  const { refreshToken } = data;
  try {
    const decoded = await verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string,
      "HS256",
    );

    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.sub as number),
    });

    if (!user) throw new Error("用户不存在或已被禁用");

    const now = Math.floor(Date.now() / 1000);
    const newAccessToken = await sign(
      { sub: user.id, email: user.email, exp: now + 60 * 15 },
      process.env.JWT_ACCESS_SECRET as string,
      "HS256",
    );

    return { message: "Token 续签成功", accessToken: newAccessToken };
  } catch (err) {
    throw new Error("无效或已过期的 Refresh Token");
  }
};
