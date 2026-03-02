/**
 * OpenAI GPT Provider
 * 需要: OPENAI_API_KEY 环境变量
 */

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIClient {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    // 支持代理或自定义 endpoint
    this.baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  private generatePrompt(
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed'
  ): string {
    const lengthInstructions = {
      short: 'Provide a concise 2-3 sentence summary (approximately 100 words) that MUST include: (1) 研究背景 (Research Background) - what problem is being addressed, (2) 核心方法 (Core Methods) - the main approach, and (3) 关键结论 (Key Conclusions) - the primary outcome.',
      medium: 'Provide a comprehensive paragraph-style summary (approximately 300-500 words) that MUST include four sections: (1) 研究背景 (Research Background) - context and motivation, (2) 核心方法 (Core Methods) - methodology and experimental design, (3) 主要结果 (Main Results) - key findings and data, and (4) 关键结论 (Key Conclusions) - implications and contributions.',
      detailed: 'Provide an in-depth structured summary (approximately 800-1200 words) with clear section headers for: (1) 研究背景 (Research Background) - context, problem statement, and motivation, (2) 核心方法 (Core Methods) - detailed methodology, experimental design, and data analysis, (3) 主要结果 (Main Results) - comprehensive findings with specific details, and (4) 关键结论 (Key Conclusions) - implications, limitations, and future directions.',
    };

    return `Please summarize the following academic paper:\n\nTitle: ${title}\n\nAbstract: ${abstract}\n\n${lengthInstructions[lengthLevel]}\n\nImportant: Your summary MUST cover all four required aspects (研究背景、核心方法、主要结果、关键结论) to be complete.\n\nSummary:`;
  }

  async generateSummary(
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed' = 'medium'
  ): Promise<OpenAIResponse> {
    const prompt = this.generatePrompt(title, abstract, lengthLevel);

    // Check if API key is available
    if (!this.apiKey) {
      console.warn('[OpenAI] API key not found.');
      throw new Error('OpenAI API key not configured');
    }

    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: 'You are an expert academic assistant specializing in summarizing research papers clearly and accurately.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      // 根据长度级别选择合适的模型
      const model = lengthLevel === 'detailed' ? 'gpt-4o' : 'gpt-4o-mini'; // mini 更便宜

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: lengthLevel === 'short' ? 200 : lengthLevel === 'medium' ? 800 : 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return {
        content,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('[OpenAI] API error:', error);
      throw error;
    }
  }
}

// Singleton instance
let openaiClient: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!openaiClient) {
    openaiClient = new OpenAIClient();
  }
  return openaiClient;
}
