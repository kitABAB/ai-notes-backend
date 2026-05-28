// 📂 src/lib/storage.ts
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
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
    PUBLIC: process.env.RUSTFS_PUBLIC_BUCKET 
  },
} as const;

/**
 * 配置断言校验器
 */
const assertStorageConfig = (config: typeof STORAGE_CONFIG): void => {
  const essentials: (keyof typeof STORAGE_CONFIG)[] = ["ENDPOINT", "ACCESS_KEY", "SECRET_KEY"];
  const missing = essentials.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ [核心配置崩溃] 缺少关键 RustFS 对象存储环境变量: [${missing.join(", ")}]. 系统已安全拦截启动。`
    );
  }
};

// 模块加载时立即强制执行校验
assertStorageConfig(STORAGE_CONFIG);
export type StorageBucketType = typeof STORAGE_CONFIG.BUCKETS[keyof typeof STORAGE_CONFIG.BUCKETS];


// 初始化 RustFS 客户端（完美复用 S3 协议）
const s3Client = new S3Client({
  endpoint: STORAGE_CONFIG.ENDPOINT!,
  region: "auto",
  credentials: {
    accessKeyId: STORAGE_CONFIG.ACCESS_KEY!,
    secretAccessKey: STORAGE_CONFIG.SECRET_KEY!,
  },

  forcePathStyle: true, // 自部署对象存储强制开启路径样式
});


/**
 * 📤 纯函数：将多模态二进制文件（Buffer / Uint8Array）稳稳写入私有安全桶
 * @param storageKey 云端相对路径（如 "user_1/notes/uuid.mp4"）
 * @param fileBuffer 二进制流数据
 * @param mimeType 文件媒体类型（如 "video/mp4", "image/png"）
 */
export const uploadPrivateAsset = async (
  storageKey: string,
  fileBuffer: Buffer | Uint8Array,
  mimeType: string
): Promise<void> => {
  const { BUCKETS } = STORAGE_CONFIG;

  const command = new PutObjectCommand({
    Bucket: BUCKETS.PRIVATE,
    Key: storageKey,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
};


/**
 * 🗺️ 纯函数：动态解析多模态资源公网访问 URL
 * @param storageKey 相对路径键
 * @param isPublic 是否路由至公共桶
 */
export const resolveAssetUrl = async (
  storageKey: string,
  isPublic: boolean = false
): Promise<string> => {
  const { ENDPOINT, BUCKETS, URL_EXPIRATION } = STORAGE_CONFIG;

  // 情况 A：公共资产，直接字符串冷拼接，发生 0 次网络 I/O
  if (isPublic) {
    return `${ENDPOINT}/${BUCKETS.PUBLIC}/${storageKey}`;
  }

  // 情况 B：私有资产，在内存中快速计算 10 分钟有效的临时加密签名外链
  const command = new GetObjectCommand({
    Bucket: BUCKETS.PRIVATE,
    Key: storageKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn: URL_EXPIRATION });
};