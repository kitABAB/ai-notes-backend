// 📂 src/lib/ai.ts
import { generateText, streamText } from "ai";
import { google } from "@ai-sdk/google";

const SYSTEM_PROMPT = `你是一个顶级的知识管理助手。
你的任务是提取用户提供的所有物料（如文本、链接内容）中的核心价值。
请输出结构化、清晰的中文总结，去除冗余废话，保留核心观点。`;

export async function generateSummary(prompt: string): Promise<string | null> {
  try {
    console.log("🔥 炼丹炉点火，正在调用 Gemini 2.5 Flash...");
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: SYSTEM_PROMPT,
      prompt: prompt,
      temperature: 0.3,
    });
    console.log("✅ 炼丹成功！");
    return text;
  } catch (error: any) {
    console.error("❌ 炼丹炉异常炸炉:", error.message);
    return null;
  }
}

// 💥 新增的流式生成方法
export async function generateSummaryStream(prompt: string) {
  console.log("🔥 流式炼丹炉点火，正在调用 Gemini...");
  // Vercel AI SDK 的 streamText 直接返回一个可迭代的流对象
  const result = await streamText({
    model: google("gemini-1.5-flash"),
    system: SYSTEM_PROMPT,
    prompt: prompt,
    temperature: 0.3,
  });

  return result;
}
