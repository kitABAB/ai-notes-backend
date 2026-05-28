// 📂 src/features/notes/notes.builder.ts
import type { Material } from "../../db/schema"; // 假设你导出了对应类型

/**
 * 纯函数：构建 AI 总结所需的上下文 Prompt
 */
export const buildSummaryPrompt = (materials: Material[]): string => {
  const header = `以下是我收集的物料清单：\n\n`;
  const body = materials
    .map(
      (mat, index) =>
        `--- 物料 ${index + 1} (${mat.type}) ---\n${mat.rawContent}\n`,
    )
    .join("\n");
  const footer = `\n请根据以上物料，生成一篇高质量的中文结构化总结笔记，去除冗余废话，保留核心观点。`;

  return `${header}${body}${footer}`;
};
