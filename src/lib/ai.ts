// 📂 src/lib/ai.ts
import { generateText, streamText } from "ai";
import { google } from "@ai-sdk/google";

/**
 * 统一的核心系统提示词上下文
 */
const SYSTEM_PROMPT = `你是一个顶级的知识管理助手。
你的任务是提取用户提供的所有物料（如文本、链接内容、以及图片或视频等多模态资产）中的核心价值。
请输出结构化、清晰的中文总结，去除冗余废话，保留核心观点。`;

/**
 * 严格的多模态资产荷载类型声明
 */
export interface MultiModalAssetPayload {
  type: "image" | "video";
  url: string;
}

/**
 * 🛡️ 内部纯函数：安全地组装多模态消息体。
 * 具备第一层防线：若某单一资产 URL 损坏，自动打印警告并跳过，不影响其他物料。
 */
function buildContentParts(prompt: string, assets: MultiModalAssetPayload[] = []): any[] {
  const contentParts: any[] = [{ type: "text", text: prompt }];

  assets.forEach((asset) => {
    try {
      const assetUrl = new URL(asset.url);
      
      if (asset.type === "image") {
        contentParts.push({ type: "image", image: assetUrl });
      } else if (asset.type === "video") {
        contentParts.push({ type: "file", data: assetUrl, mimeType: "video/mp4" });
      }
    } catch (urlError) {
      // 容错：单个链接解析失败不至于让整个任务死掉
      console.warn(`[AI 资产过滤警告] 发现无效的资产外链 [${asset.url}]，已跳过此素材。`);
    }
  });

  return contentParts;
}

/**
 * 1. 经典非流式生成方法（已升级多模态与安全自动降级兜底）
 */
export async function generateSummary(
  prompt: string, 
  assets: MultiModalAssetPayload[] = []
): Promise<string | null> {
  try {
    console.log("🔥 炼丹炉点火，正在调用 Gemini 2.5 Flash...");
    const content = buildContentParts(prompt, assets);

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      temperature: 0.3,
    });

    console.log("✅ 炼丹成功！");
    return text;
  } catch (error: any) {
    // 💥 第二层防线：多模态运行时故障自愈
    if (assets.length > 0) {
      console.warn(`⚠️ 多模态炼丹失败 [${error.message}]，正在触发「纯文本降级兜底」重试...`);
      return generateSummary(prompt, []); // 传入空资产数组，剥离所有媒体，转为纯文本模式重试
    }

    console.error("❌ 炼丹炉异常完全炸炉（纯文本模式亦宣告失败）:", error.message);
    return null;
  }
}

/**
 * 2. 现代流式生成方法（已升级多模态与安全自动降级兜底）
 */
export async function generateSummaryStream(
  prompt: string, 
  assets: MultiModalAssetPayload[] = []
): Promise<any> {
  try {
    console.log("🔥 流式炼丹炉点火，正在调用 Gemini 1.5 Flash...");
    const content = buildContentParts(prompt, assets);

    return await streamText({
      model: google("gemini-1.5-flash"),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      temperature: 0.3,
    });
  } catch (error: any) {
    // 💥 第三层防线：流式多模态运行时故障自愈
    if (assets.length > 0) {
      console.warn(`⚠️ 流式多模态调用失败 [${error.message}]，正在触发「流式纯文本降级兜底」重试...`);
      return generateSummaryStream(prompt, []); // 降级为纯文本流重试
    }
    
    console.error("❌ 流式炼丹失败:", error.message);
    throw error;
  }
}