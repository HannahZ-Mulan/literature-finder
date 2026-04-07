/**
 * Chinese Summary Prompts - 人性化中文解读
 * 专门用于生成"真正给人看的"中文论文解读
 */

export interface PaperContentForSummary {
  title: string;
  content: string;
}

/**
 * 获取人性化中文解读提示词
 */
export function getHumanChineseSummaryPrompt(paper: PaperContentForSummary): string {
  return `请基于以下论文内容，生成一份"严肃但易读"的中文解读。

【核心要求】
- 用自然、流畅的中文表达，避免翻译腔
- 不要逐句复述原文，必须重新组织语言
- 保持学术严谨，但表达要清晰、易懂
- 像一个理解很深的人在讲，而不是在念论文

【写作风格】
- 克制、理性，不夸张
- 句子简洁，避免冗长
- 可以适当解释，但不要啰嗦
- 不使用网络流行语或营销语气

【输出结构】

1. 一句话总结
（用一句话讲清这篇论文最重要的结论）

2. 研究在解决什么问题
（用通俗但准确的语言解释背景）

3. 作者是怎么做的
（简要说明方法，不堆术语）

4. 最重要的发现
（只写最关键的2到3点）

5. 这篇论文的意义
（它为什么重要，对理解问题有什么帮助）

6. 局限或需要注意的地方（如果可以判断）

【禁止】
- 不要使用英文
- 不要使用markdown符号（如 * # - 等）
- 不要复制原文句子

【重点】
请优先解释"为什么"，而不是仅描述"做了什么"。

论文标题：${paper.title}

论文内容：
${paper.content}

请开始生成解读：`;
}

/**
 * 获取简短版中文解读提示词
 */
export function getShortChineseSummaryPrompt(paper: PaperContentForSummary): string {
  return `请用通俗易懂的中文，总结这篇论文的核心内容。

论文标题：${paper.title}

要求：
1. 一句话说明这篇论文在研究什么
2. 用简单语言解释研究方法
3. 列出2-3个最重要的发现
4. 说明这项研究的意义

请用段落形式输出，不要使用markdown符号或列表。

论文内容：
${paper.content}`;
}
