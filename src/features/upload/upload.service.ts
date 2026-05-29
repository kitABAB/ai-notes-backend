// 📂 src/features/upload/upload.service.ts
import {
  generateSecureStorageKey,
  uploadPrivateAsset,
  uploadPublicAsset,
  STORAGE_CONFIG
} from "../../lib/storage";

export interface UploadResult {
  storageKey: string;
  fileName: string;
  fileSize: number;
  url?: string;
}

/**
 * 核心原子函数：单资产处理管道 (保持不变)
 */
export const processAssetUpload = async (file: File, userId: number, isPublic = false): Promise<UploadResult> => {
  const originalName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;

  const modulePath = isPublic ? `public_assets/user_${userId}` : `notes_materials/user_${userId}`;
  const storageKey = generateSecureStorageKey(originalName, modulePath);

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  if (isPublic) {
    await uploadPublicAsset(storageKey, fileBuffer, mimeType);
    const publicUrl = `${STORAGE_CONFIG.ENDPOINT}/${STORAGE_CONFIG.BUCKETS.PUBLIC}/${storageKey}`;
    return { storageKey, fileName: originalName, fileSize, url: publicUrl };
  }

  await uploadPrivateAsset(storageKey, fileBuffer, mimeType);
  return { storageKey, fileName: originalName, fileSize };
};

/**
 * 👑 💥 新增核心函数：多模态多文件高并发处理管道
 * 利用 Bun 优秀的底层异步 I/O 线程池，同时向 RustFS 倾泄数据流
 */
export const processBatchAssetUpload = async (
  files: File[],
  userId: number,
  isPublic = false
): Promise<UploadResult[]> => {
  // 映射出并发 Promise 阵列
  const uploadTasks = files.map((file) => processAssetUpload(file, userId, isPublic));

  // 轰发！并发执行所有落盘任务，完美吃满网络带宽
  return Promise.all(uploadTasks);
};