// 📂 src/features/upload/upload.dto.ts
import { z } from "zod";

const STORAGE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024, // 10MB
    video: 50 * 1024 * 1024, // 50MB
    audio: 20 * 1024 * 1024, // 20MB
    file: 20 * 1024 * 1024,  // 20MB
} as const;

/**
 * 🔒 共享的单资产动态体积校验原子
 */
const verifyFilePayload = (file: File, ctx: z.RefinementCtx) => {
    if (file.size === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `文件 [${file.name}] 是空资产，拒绝落盘` });
        return;
    }

    let limit = STORAGE_SIZE_LIMITS.file;
    let label = "普通附件";

    if (file.type.startsWith("image/")) {
        limit = STORAGE_SIZE_LIMITS.image;
        label = "图片资产";
    } else if (file.type.startsWith("video/")) {
        limit = STORAGE_SIZE_LIMITS.video;
        label = "视频切片";
    } else if (file.type.startsWith("audio/")) {
        limit = STORAGE_SIZE_LIMITS.audio;
        label = "音频录音";
    }

    if (file.size > limit) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} [${file.name}] 体积超标，当前模态最大限制为 ${limit / 1024 / 1024}MB`,
        });
    }
};

/**
 * 🟢 1. 单文件上传 DTO（供单私有、单公网接口共用）
 */
export const uploadSingleSchema = z.object({
    file: z.instanceof(File, { message: "上传载荷必须是一个有效的物理文件对象" }),
}).superRefine((data, ctx) => verifyFilePayload(data.file, ctx));

/**
 * 🟢 2. 批量多文件上传 DTO（含权限参数自愈，默认私有）
 */
export const uploadBatchSchema = z.object({
    files: z.preprocess((val) => {
        if (!val) return [];
        return Array.isArray(val) ? val : [val];
    }, z.array(z.instanceof(File), { message: "批量上传载荷必须是文件阵列" })),

    isPublic: z.preprocess((val) => {
        if (val === "true" || val === true) return true;
        return false;
    }, z.boolean().default(false)),
}).superRefine((data, ctx) => {
    if (data.files.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "上传的文件列表不能为空" });
        return;
    }
    if (data.files.length > 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "单次批量上传上限为 10 个文件" });
        return;
    }
    data.files.forEach((file) => verifyFilePayload(file, ctx));
});