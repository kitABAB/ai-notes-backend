import { z } from "zod";

// ==========================================
// 🏛️ 认证模块核心 Zod 校验规则 (最高物理指示)
// ==========================================
export const authCredentialSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ==========================================
// 📥 Request DTO 类型推导 (输入契约)
// ==========================================
export type AuthRequestDto = z.infer<typeof authCredentialSchema>;

// ==========================================
// 📤 Response DTO 接口声明 (输出契约)
// ==========================================
export interface UserInfoDto {
  id: number;
  email: string;
  role: string;
  aiQuota: number;
}

export interface LoginResponseDto {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: UserInfoDto;
}

export interface RegisterResponseDto {
  message: string;
  user: Pick<UserInfoDto, "id" | "email">;
}

// 新增：换票请求契约
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
