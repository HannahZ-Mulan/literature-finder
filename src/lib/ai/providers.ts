/**
 * AI Provider Configuration
 * 支持多个 AI 提供商，可根据需要选择
 */

export interface AIProvider {
  name: string;
  generateSummary(title: string, abstract: string, lengthLevel: 'short' | 'medium' | 'detailed'): Promise<{
    content: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;
}

export type AIProviderType = 'zhipu' | 'openai' | 'claude' | 'ollama' | 'mock';

// 各提供商的定价（人民币/1M tokens）
export const PRICING = {
  zhipu: {
    input: 0.5,    // ¥0.5/1M tokens
    output: 0.5,   // ¥0.5/1M tokens
    note: '国内访问快，价格便宜'
  },
  openai: {
    input: 7,      // $1 ≈ ¥7
    output: 14,    // GPT-4 定价
    note: '效果最好，但价格较高'
  },
  claude: {
    input: 21,     // $3 ≈ ¥21
    output: 63,    // Claude 3 Opus
    note: '长文本处理能力强'
  },
  ollama: {
    input: 0,      // 完全免费
    output: 0,     // 本地运行
    note: '免费但需要本地部署，消耗电脑资源'
  },
  mock: {
    input: 0,
    output: 0,
    note: '仅用于测试，不调用真实 AI'
  }
};

// 每篇文献摘要的平均 token 消耗
export const ESTIMATED_TOKENS_PER_SUMMARY = {
  short: {
    input: 300,     // 论文标题+摘要+指令
    output: 150,    // 简短摘要
  },
  medium: {
    input: 400,
    output: 600,
  },
  detailed: {
    input: 500,
    output: 1500,
  }
};

// 计算成本
export function calculateCost(
  provider: AIProviderType,
  lengthLevel: 'short' | 'medium' | 'detailed'
): number {
  const pricing = PRICING[provider];
  const tokens = ESTIMATED_TOKENS_PER_SUMMARY[lengthLevel];

  const inputCost = (tokens.input / 1000000) * pricing.input;
  const outputCost = (tokens.output / 1000000) * pricing.output;

  return inputCost + outputCost;
}

// 使用示例和成本对比
export const USAGE_EXAMPLES = {
  '100篇论文-中等摘要': {
    short: {
      zhipu: '≈ ¥0.02',
      openai: '≈ ¥0.28',
      claude: '≈ ¥0.84',
      ollama: '免费',
    },
    medium: {
      zhipu: '≈ ¥0.05',
      openai: '≈ ¥0.70',
      claude: '≈ ¥2.10',
      ollama: '免费',
    }
  },
  '1000篇论文-中等摘要': {
    medium: {
      zhipu: '≈ ¥0.50',
      openai: '≈ ¥7.00',
      claude: '≈ ¥21.00',
      ollama: '免费',
    }
  }
};
