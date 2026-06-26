/**
 * Immersive Read Prompts - 沉浸式论文深读
 * 为每个论文段落生成"导师级"中文导读，帮助用户边读原文边理解
 */

export interface ChunkReadingGuideInput {
  chunkText: string;
  chunkType: string;
  title: string;
  sectionIndex?: number;
  totalSections?: number;
}

/**
 * 根据章节类型返回导读的侧重点描述
 */
function getSectionGuidance(chunkType: string): string {
  const guidance: Record<string, string> = {
    abstract:
      '这是论文摘要，重点帮助读者快速把握这篇论文的核心概要——它在研究什么、用了什么方法、得出了什么关键结论。',
    introduction:
      '这是引言部分，重点解释研究背景和问题动机——作者为什么要做这个研究，当前领域存在什么空白或不足。',
    literature_review:
      '这是文献综述部分，重点概括前人工作的脉络和本文的定位——前人做到了什么程度，还差什么。',
    methods:
      '这是方法论部分，重点用通俗语言解释技术方案的核心思路——作者是怎么解决问题的，方法的关键创新在哪里。',
    results:
      '这是结果部分，重点解读实验数据的含义——这些数字/图表说明了什么，支持还是反驳了作者的假设。',
    discussion:
      '这是讨论部分，重点说明作者如何解读结果——结果意味着什么，与预期的差异可能是什么原因。',
    conclusion:
      '这是结论部分，重点总结论文的核心贡献和意义——读者应该从这篇论文带走什么。',
    unknown: '',
  };
  return guidance[chunkType] || '';
}

/**
 * 获取章节类型的中文名称
 */
export function getChunkTypeLabel(chunkType: string): string {
  const labels: Record<string, string> = {
    abstract: '摘要',
    introduction: '引言',
    literature_review: '文献综述',
    methods: '方法',
    results: '结果',
    discussion: '讨论',
    conclusion: '结论',
    references: '参考文献',
    appendix: '附录',
    unknown: '正文',
  };
  return labels[chunkType] || '正文';
}

/**
 * 获取沉浸式深读导读 Prompt
 * 要求 AI 以"导师讲解"的口吻，用 2-3 句话通俗解释该段落
 */
export function getChunkReadingGuidePrompt(input: ChunkReadingGuideInput): string {
  const sectionGuidance = getSectionGuidance(input.chunkType);

  return `你是一位研究经验丰富的学术导师。一位学生正在阅读一篇英文学术论文，遇到了下面的段落，请你帮他理解。

【你正在讲解的段落】
论文章节：${input.chunkType}
${sectionGuidance ? `讲解侧重点：${sectionGuidance}` : ''}

【论文标题】
${input.title}

【段落原文】
${input.chunkText}

【要求】
1. 用 2-3 句话、80-150 个中文字，解释这段内容在讲什么
2. 语气像一个懂行的导师在给学生讲解，自然、口语化但不失严谨
3. 优先解释"为什么"而非仅描述"做了什么"
4. 如果这段有重要的概念、术语或逻辑转折，点出来
5. 不要逐句翻译，不要用英文，不要用 markdown 符号
6. 直接输出讲解内容，不要加"这段讲了"之类的开头语

请开始讲解：`;
}
