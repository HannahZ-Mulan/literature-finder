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

export interface PaperInsights {
  research_question: string;
  methodology: string;
  key_findings: string;
  limitations: string;
  future_work: string;
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

  /**
   * Extract structured insights from paper
   */
  async extractInsights(
    title: string,
    abstract: string
  ): Promise<OpenAIResponse & { insights?: PaperInsights }> {
    if (!this.apiKey) {
      console.warn('[OpenAI] API key not found.');
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Analyze the following academic paper and extract key insights:

Title: ${title}
Abstract: ${abstract}

Please provide a structured analysis with these sections:
1. Research Question - What problem does this paper address?
2. Methodology - What approach or methods were used?
3. Key Findings - What are the main results or contributions?
4. Limitations - What are the limitations or weaknesses?
5. Future Work - What future directions are suggested?

Respond in JSON format with these exact keys: research_question, methodology, key_findings, limitations, future_work`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert research analyst. Extract structured insights from academic papers and respond in valid JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      let insights: PaperInsights | undefined;
      try {
        insights = JSON.parse(content) as PaperInsights;
      } catch (e) {
        console.warn('[OpenAI] Failed to parse insights JSON');
      }

      return {
        content,
        insights,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('[OpenAI] Extract insights error:', error);
      throw error;
    }
  }

  /**
   * Chat with paper context
   */
  async chatWithPaper(
    question: string,
    title: string,
    abstract: string,
    chatHistory?: OpenAIMessage[]
  ): Promise<OpenAIResponse> {
    if (!this.apiKey) {
      console.warn('[OpenAI] API key not found.');
      throw new Error('OpenAI API key not configured');
    }

    const systemMessage = `你是一个严谨但表达清晰的论文解读助手。

论文标题：${title}
论文内容：${abstract}

请基于提供的论文内容回答问题，要求：

1. **使用自然、清晰的中文**
   - 避免翻译腔，用母语表达
   - 不使用markdown符号（* # 等）

2. **不要编造信息**
   - 只基于论文内容回答
   - 如果论文中没有提到，请明确说明"论文未提及"
   - 不用"可能"、"大概"等模糊词

3. **优先解释原因和逻辑**
   - 不要简单复述"做了什么"
   - 重点解释"为什么这样做"和"意味着什么"
   - 说明研究设计的逻辑

4. **回答要简洁，但有信息量**
   - 避免冗长和啰嗦
   - 每句话都要有价值
   - 可以分点，但用数字而非符号

5. **保持学术严谨**
   - 数据要精确（效应量、样本量等）
   - 不夸大结论
   - 适当说明局限性`;

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemMessage },
      ...(chatHistory || []),
      { role: 'user', content: question },
    ];

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 1500, // Increased for more detailed responses
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
      console.error('[OpenAI] Chat error:', error);
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
