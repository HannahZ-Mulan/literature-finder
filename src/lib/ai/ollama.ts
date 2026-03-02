/**
 * Ollama Local Provider
 * 本地运行的开源大模型，完全免费
 *
 * 前置要求：
 * 1. 安装 Ollama: https://ollama.ai
 * 2. 运行: ollama serve
 * 3. 拉取模型: ollama pull qwen2.5:7b (或其他模型)
 *
 * 推荐模型：
 * - qwen2.5:7b - 通义千问，中文能力强，轻量级
 * - llama3.2:3b - Meta Llama，轻量级
 * - mistral:7b - Mistral AI，效果好
 * - qwen2.5:14b - 更强的中文能力，但需要更多资源
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OllamaClient {
  private baseURL: string;
  private model: string;

  constructor(config?: { baseURL?: string; model?: string }) {
    this.baseURL = config?.baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = config?.model || process.env.OLLAMA_MODEL || 'qwen2.5:7b';
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

  /**
   * 测试 Ollama 服务是否可用
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateSummary(
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed' = 'medium'
  ): Promise<OllamaResponse> {
    const prompt = this.generatePrompt(title, abstract, lengthLevel);

    try {
      const messages: OllamaMessage[] = [
        {
          role: 'system',
          content: 'You are an expert academic assistant specializing in summarizing research papers clearly and accurately.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: lengthLevel === 'short' ? 200 : lengthLevel === 'medium' ? 800 : 2000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.message?.content || '';

      // 估算 token 数（Ollama 不返回准确计数）
      const estimatedTokens = {
        prompt_tokens: prompt.split(' ').length,
        completion_tokens: content.split(' ').length,
        total_tokens: prompt.split(' ').length + content.split(' ').length,
      };

      return {
        content,
        usage: estimatedTokens,
      };
    } catch (error) {
      console.error('[Ollama] API error:', error);
      throw new Error(`Ollama connection failed. Make sure Ollama is running with: ollama serve\nError: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Singleton instance
let ollamaClient: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  if (!ollamaClient) {
    ollamaClient = new OllamaClient();
  }
  return ollamaClient;
}
