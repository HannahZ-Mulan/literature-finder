export interface SummaryLengthLevel {
  short: string;    // ~100 words
  medium: string;   // ~300-500 words
  detailed: string; // ~800-1200 words
}

export interface GLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * GLM API Client for generating literature summaries
 * This is a placeholder implementation that can be replaced with actual Zhipu GLM API calls
 */
export class GLMClient {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ZHIPU_GLM_API_KEY || '';
    this.baseURL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  }

  /**
   * Generate summary prompt based on length level
   */
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
   * Generate summary using GLM API
   * This is a mock implementation that should be replaced with actual API calls
   */
  async generateSummary(
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed' = 'medium'
  ): Promise<GLMResponse> {
    const prompt = this.generatePrompt(title, abstract, lengthLevel);

    // Check if API key is available
    if (!this.apiKey) {
      console.warn('Zhipu GLM API key not found. Returning mock summary.');
      return this.generateMockSummary(title, abstract, lengthLevel);
    }

    try {
      // Actual API call implementation
      const messages: GLMMessage[] = [
        {
          role: 'system',
          content: 'You are an expert academic assistant specializing in summarizing research papers clearly and accurately.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'glm-4',
          messages,
          temperature: 0.7,
          max_tokens: lengthLevel === 'short' ? 200 : lengthLevel === 'medium' ? 1000 : 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`GLM API error: ${response.statusText}`);
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
      console.error('GLM API error:', error);
      // Fall back to mock summary on error
      return this.generateMockSummary(title, abstract, lengthLevel);
    }
  }

  /**
   * Generate mock summary for development/testing
   */
  private generateMockSummary(
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed'
  ): GLMResponse {
    const shortSummary = `This paper titled "${title}" addresses key challenges in the field by proposing a novel approach. The authors employ rigorous experimental methods to validate their solution and demonstrate significant improvements over existing techniques. Their findings make important contributions to advancing the state of the art.`;

    const mediumSummary = `This paper titled "${title}" addresses important challenges in the field by introducing a novel framework for solving complex problems. The research is motivated by limitations in existing approaches and aims to develop more efficient and effective solutions.\n\n研究背景 (Research Background): The study identifies critical gaps in current methodologies and highlights the need for improved techniques that can handle real-world scenarios more robustly.\n\n核心方法 (Core Methods): The authors propose an innovative approach combining advanced algorithms with comprehensive experimental validation. Their methodology includes systematic data collection, rigorous analysis, and extensive evaluation across multiple datasets.\n\n主要结果 (Main Results): Experimental results demonstrate significant performance improvements, with the proposed method achieving state-of-the-art results on key benchmarks. The findings show consistent advantages across different experimental conditions.\n\n关键结论 (Key Conclusions): The research makes valuable contributions to the field by providing both theoretical insights and practical solutions. The conclusions suggest that this approach opens new directions for future research and has promising applications in real-world scenarios.`;

    const detailedSummary = `# Research Summary: ${title}\n\n## 研究背景 (Research Background)\nThis paper titled "${title}" addresses fundamental challenges in the field by identifying critical limitations in existing approaches. The authors motivate their research by highlighting gaps in current knowledge and the practical need for more robust solutions. The study builds upon prior work while introducing novel theoretical frameworks that extend our understanding of the problem domain.\n\nThe research context includes recent advances in related areas and establishes clear motivation for why this work is timely and significant. The authors carefully position their contributions within the broader landscape of ongoing research in the field.\n\n## 核心方法 (Core Methods)\nThe authors propose a comprehensive methodology that combines theoretical innovation with rigorous experimental validation. Key aspects of their approach include:\n\n- **Algorithm Design**: Novel algorithms designed to address specific challenges identified in the background\n- **Experimental Framework**: Systematic experimental setup with appropriate controls and validation procedures\n- **Data Collection**: Comprehensive data gathering from multiple sources to ensure robustness\n- **Analysis Techniques**: Advanced statistical and analytical methods for thorough evaluation\n\nThe methodology is described in sufficient detail to ensure reproducibility and validity of the findings. The authors also discuss potential limitations and how their design choices address them.\n\n## 主要结果 (Main Results)\nThe study presents extensive experimental results that demonstrate the effectiveness of the proposed approach:\n\n1. **Performance Metrics**: Significant improvements across key performance indicators compared to baseline methods\n2. **Ablation Studies**: Systematic analysis of individual components to understand their contributions\n3. **Robustness Analysis**: Evaluation across diverse conditions showing consistent performance\n4. **Comparative Analysis**: Detailed comparison with state-of-the-art methods highlighting advantages\n\nThe results are thoroughly analyzed with proper statistical validation and consideration of edge cases. The findings provide strong empirical support for the theoretical claims made in the paper.\n\n## 关键结论 (Key Conclusions)\nThe authors draw well-supported conclusions based on their comprehensive analysis:\n\n- **Theoretical Contributions**: The work advances understanding by introducing new concepts and frameworks\n- **Practical Applications**: Demonstrated effectiveness in real-world scenarios with clear practical benefits\n- **Limitations and Future Work**: Honest discussion of limitations and promising directions for continued research\n- **Broader Impact**: Implications for both research community and practical applications\n\nThe research represents a significant advancement in the field and opens new avenues for investigation. The conclusions are well-justified by the experimental evidence and provide valuable insights for future research directions.`;

    const content =
      lengthLevel === 'short'
        ? shortSummary
        : lengthLevel === 'medium'
        ? mediumSummary
        : detailedSummary;

    return {
      content,
      usage: {
        prompt_tokens: abstract.split(' ').length,
        completion_tokens: content.split(' ').length,
        total_tokens: abstract.split(' ').length + content.split(' ').length,
      },
    };
  }
}

// Singleton instance
let glmClient: GLMClient | null = null;

export function getGLMClient(): GLMClient {
  if (!glmClient) {
    glmClient = new GLMClient();
  }
  return glmClient;
}
