// 📂 src/lib/storage.ts
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// config
export const STORAGE_CONFIG = {
  ENDPOINT: process.env.RUSTFS_ENDPOINT,
  ACCESS_KEY: process.env.RUSTFS_ACCESS_KEY,
  SECRET_KEY: process.env.RUSTFS_SECRET_KEY,
  // 过期时间
  URL_EXPIRATION: Number(process.env.RUSTFS_URL_EXPIRATION ?? 600),
  BUCKETS: {
    PRIVATE: process.env.RUSTFS_PRIVATE_BUCKET,
    PUBLIC: process.env.RUSTFS_PUBLIC_BUCKET,
  },
} as const;

/**
 * 配置断言校验器
 */
const assertStorageConfig = (config: typeof STORAGE_CONFIG): void => {
  const essentials: (keyof typeof STORAGE_CONFIG)[] = [
    "ENDPOINT",
    "ACCESS_KEY",
    "SECRET_KEY",
  ];
  const missing = essentials.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ [核心配置崩溃] 缺少关键 RustFS 对象存储环境变量: [${missing.join(", ")}]. 系统已安全拦截启动。`,
    );
  }
};

// 模块加载时立即强制执行校验
assertStorageConfig(STORAGE_CONFIG);
export type StorageBucketType =
  (typeof STORAGE_CONFIG.BUCKETS)[keyof typeof STORAGE_CONFIG.BUCKETS];

// 初始化 RustFS 客户端（完美复用 S3 协议）
const s3Client = new S3Client({
  endpoint: STORAGE_CONFIG.ENDPOINT!,
  region: "auto",
  credentials: {
    accessKeyId: STORAGE_CONFIG.ACCESS_KEY!,
    secretAccessKey: STORAGE_CONFIG.SECRET_KEY!,
  },
  forcePathStyle: true,
});

/**
 * 🎨 纯函数：生成扁平、无时间泄露的安全云端追踪键
 * 彻底移除年月日，不再向前端或 URL 暴露任何上传时间线索
 * @param fileName 原始文件名
 * @param modulePath 业务域隔离路径 (如 "user_1/notes")
 */
export const generateSecureStorageKey = (
  fileName: string,
  modulePath: string,
): string => {
  const uuid = crypto.randomUUID();
  const sanitizedName = fileName.replace(/\s+/g, "_"); // 清理空格畸形

  // 💥 仅用一个斜杠划分用户空间，后续全平铺，绝无深层路径交错
  // 最终生成：user_1/notes/f81d4fae-7dec-11d0-a765-00a0c91e6bf6_avatar.png
  return `${modulePath}/${uuid}_${sanitizedName}`;
};

/**
 * 🔒 纯函数：轰入【私有安全桶】
 */
export const uploadPrivateAsset = async (
  storageKey: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: STORAGE_CONFIG.BUCKETS.PRIVATE,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
};

/**
 * 🌐 纯函数：轰入【公有只读桶】
 */
export const uploadPublicAsset = async (
  storageKey: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: STORAGE_CONFIG.BUCKETS.PUBLIC, // 💥 锁定公有桶
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
};

export const resolveAssetUrl = async (storageKey: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: STORAGE_CONFIG.BUCKETS.PRIVATE,
    Key: storageKey,
  });
  return getSignedUrl(s3Client, command, {
    expiresIn: STORAGE_CONFIG.URL_EXPIRATION,
  });
};
