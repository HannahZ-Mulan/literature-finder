/**
 * 统一的 AI 客户端
 * 根据配置自动选择最佳的 AI 提供商，支持级联回退
 *
 * Provider Fallback Order:
 * Zhipu GLM-4 (primary, domestic, stable)
 * -> DeepSeek (secondary, affordable)
 * -> OpenAI (optional, best quality)
 * -> Ollama (local, free)
 * -> Mock (development fallback)
 */

import { GLMClient } from '../glm/client';
import { OpenAIClient } from './openai';
import { OllamaClient } from './ollama';
import { DeepSeekClient } from './deepseek';
import { AIProviderType, calculateCost, PRICING, PROVIDER_FALLBACK_ORDER } from './providers';
import {
  getExtractionPrompt,
  getSummaryPrompt,
  getChatPrompt,
  PaperContent,
  StructuredAnalysis
} from './prompts';

export interface AISummaryResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  provider: AIProviderType;
  estimatedCost?: number;
}

export interface ProviderRetryResult {
  success: boolean;
  provider?: AIProviderType;
  content?: string;
  usage?: any;
  error?: string;
}

export class AIProviderManager {
  private preferredProvider: AIProviderType;
  private fallbackEnabled: boolean;

  constructor(config?: { preferredProvider?: AIProviderType; fallbackEnabled?: boolean }) {
    // 1. 使用指定的提供商
    // 2. 使用环境变量配置的提供商
    // 3. 自动检测可用的提供商
    this.preferredProvider = config?.preferredProvider ||
      (process.env.AI_PROVIDER as AIProviderType) ||
      this.detectBestProvider();
    this.fallbackEnabled = config?.fallbackEnabled !== false; // 默认启用回退
  }

  /**
   * 自动检测最佳可用提供商
   */
  private detectBestProvider(): AIProviderType {
    // 按优先级检测可用的提供商
    const providerPriority: Array<{ type: AIProviderType; envKey: string }> = [
      { type: 'zhipu', envKey: 'ZHIPU_API_KEY' },
      { type: 'zhipu', envKey: 'ZHIPU_GLM_API_KEY' }, // 兼容旧变量名
      { type: 'deepseek', envKey: 'DEEPSEEK_API_KEY' },
      { type: 'openai', envKey: 'OPENAI_API_KEY' },
      { type: 'claude', envKey: 'ANTHROPIC_API_KEY' },
    ];

    for (const { type, envKey } of providerPriority) {
      if (process.env[envKey]) {
        console.log(`[AI] Auto-detected provider: ${type} (from ${envKey})`);
        return type;
      }
    }

    // 如果配置了 Ollama，使用 Ollama
    if (process.env.OLLAMA_ENABLED === 'true') {
      console.log('[AI] Auto-detected provider: ollama');
      return 'ollama';
    }

    // 默认使用 mock 模式
    console.log('[AI] No API keys found, using mock mode');
    return 'mock';
  }

  /**
   * 检查提供商是否可用
   */
  private async isProviderAvailable(provider: AIProviderType): Promise<boolean> {
    switch (provider) {
      case 'zhipu':
        return !!(process.env.ZHIPU_API_KEY || process.env.ZHIPU_GLM_API_KEY);
      case 'deepseek':
        return !!process.env.DEEPSEEK_API_KEY;
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'claude':
        return !!process.env.ANTHROPIC_API_KEY;
      case 'ollama':
        try {
          const client = new OllamaClient();
          return await client.testConnection();
        } catch {
          return false;
        }
      case 'mock':
        return true; // Mock always available
      default:
        return false;
    }
  }

  /**
   * 尝试使用指定提供商生成摘要
   */
  private async tryGenerateSummary(
    provider: AIProviderType,
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed'
  ): Promise<ProviderRetryResult> {
    try {
      console.log(`[AI] Trying provider: ${provider}`);

      let result: any;

      switch (provider) {
        case 'openai':
          const openaiClient = new OpenAIClient();
          result = await openaiClient.generateSummary(title, abstract, lengthLevel);
          break;

        case 'zhipu':
          const glmClient = new GLMClient();
          result = await glmClient.generateSummary(title, abstract, lengthLevel);
          break;

        case 'deepseek':
          const deepSeekClient = new DeepSeekClient();
          result = await deepSeekClient.generateSummary(title, abstract, lengthLevel);
          break;

        case 'ollama':
          const ollamaClient = new OllamaClient();
          const connected = await ollamaClient.testConnection();
          if (!connected) {
            throw new Error('Ollama service not available');
          }
          result = await ollamaClient.generateSummary(title, abstract, lengthLevel);
          break;

        case 'mock':
          result = await this.generateMockSummary(title, abstract, lengthLevel);
          break;

        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      return {
        success: true,
        provider,
        content: result.content,
        usage: result.usage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AI] Provider ${provider} failed:`, errorMessage);
      return {
        success: false,
        provider,
        error: errorMessage,
      };
    }
  }

  /**
   * Step 1: Extract structured analysis from paper
   * Uses providers that support JSON response format (OpenAI, DeepSeek)
   */
  private async extractStructuredAnalysis(
    title: string,
    abstract: string,
    introduction?: string,
    conclusion?: string
  ): Promise<{ analysis: StructuredAnalysis; provider: AIProviderType; usage?: any }> {
    const content: PaperContent = { title, abstract, introduction, conclusion };
    const prompt = getExtractionPrompt(content);

    console.log('[AI] Step 1: Extracting structured analysis...');

    // Try providers in order that support JSON output
    const analysisProviders: AIProviderType[] = ['openai', 'deepseek'];

    for (const provider of analysisProviders) {
      try {
        console.log(`[AI] Trying analysis extraction with: ${provider}`);

        let result: any;
        switch (provider) {
          case 'openai':
            if (!process.env.OPENAI_API_KEY) continue;
            const openaiClient = new OpenAIClient();
            // Use extractInsights with a custom prompt
            result = await this.callAIWithPrompt(provider, prompt, 'json');
            break;

          case 'deepseek':
            if (!process.env.DEEPSEEK_API_KEY) continue;
            const deepSeekClient = new DeepSeekClient();
            result = await deepSeekClient.extractInsights(title, abstract);
            break;

          default:
            continue;
        }

        if (result && result.insights) {
          console.log(`[AI] Successfully extracted analysis using: ${provider}`);
          return {
            analysis: result.insights,
            provider,
            usage: result.usage,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AI] Provider ${provider} analysis failed:`, errorMessage);
        // Continue to next provider
      }
    }

    // If all fail, return generic analysis based on abstract
    console.warn('[AI] All analysis providers failed, using fallback');
    return {
      analysis: {
        research_question: `Analysis of ${title}`,
        methodology: 'See abstract for details',
        key_results: 'Refer to paper for specific results',
        contributions: 'See paper for details',
        limitations: 'Not specified in abstract',
      },
      provider: 'fallback',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  /**
   * Helper: Call AI with custom prompt
   */
  private async callAIWithPrompt(
    provider: AIProviderType,
    prompt: string,
    format: 'text' | 'json'
  ): Promise<any> {
    switch (provider) {
      case 'openai':
        const openaiClient = new OpenAIClient();
        return await openaiClient.generateSummary(
          'Custom Analysis',
          prompt,
          'medium'
        );

      case 'deepseek':
        const deepSeekClient = new DeepSeekClient();
        return await deepSeekClient.generateSummary(
          'Custom Analysis',
          prompt,
          'medium'
        );

      case 'zhipu':
        const glmClient = new GLMClient();
        return await glmClient.generateSummary(
          'Custom Analysis',
          prompt,
          'medium'
        );

      default:
        throw new Error(`Provider ${provider} not supported for custom prompts`);
    }
  }

  /**
   * Step 2: Generate summary from structured analysis
   */
  private async generateSummaryFromAnalysis(
    content: PaperContent,
    analysis: StructuredAnalysis,
    lengthLevel: 'short' | 'medium' | 'detailed',
    preferredProvider: AIProviderType
  ): Promise<{ content: string; provider: AIProviderType; usage?: any }> {
    const prompt = getSummaryPrompt(content, analysis, lengthLevel);

    console.log(`[AI] Step 2: Generating summary with ${preferredProvider}...`);

    // Try the preferred provider first
    const result = await this.tryGenerateSummary(preferredProvider, content.title, prompt, lengthLevel);

    if (result.success) {
      return {
        content: result.content!,
        provider: result.provider!,
        usage: result.usage,
      };
    }

    throw new Error(`Failed to generate summary with ${preferredProvider}`);
  }

  /**
   * 生成文献摘要（带级联回退）- Two-step process
   * Step 1: Extract structured analysis (DeepSeek/OpenAI)
   * Step 2: Generate summary from analysis (Preferred provider)
   */
  async generateSummary(
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed' = 'medium'
  ): Promise<AISummaryResponse> {
    console.log(`[AI] Starting TWO-STEP summary generation`);
    console.log(`[AI] Preferred provider: ${this.preferredProvider}, Fallback enabled: ${this.fallbackEnabled}`);

    const startTime = Date.now();

    try {
      // STEP 1: Extract structured analysis
      console.log(`[AI] === STEP 1: Extracting structured analysis ===`);
      const { analysis, provider: analysisProvider, usage: analysisUsage } =
        await this.extractStructuredAnalysis(title, abstract);

      console.log(`[AI] ✓ Analysis extracted using: ${analysisProvider}`);
      console.log(`[AI]   Research Question: ${analysis.research_question.substring(0, 80)}...`);
      console.log(`[AI]   Methodology: ${analysis.methodology.substring(0, 80)}...`);

      // STEP 2: Generate summary from analysis
      console.log(`[AI] === STEP 2: Generating structured summary ===`);
      const content: PaperContent = { title, abstract };
      const summaryResult = await this.generateSummaryFromAnalysis(
        content,
        analysis,
        lengthLevel,
        this.preferredProvider
      );

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`[AI] ✓ Summary generated in ${elapsedTime}s`);
      console.log(`[AI]   Analysis by: ${analysisProvider}`);
      console.log(`[AI]   Summary by: ${summaryResult.provider}`);

      // Calculate combined costs
      const estimatedCost = calculateCost(analysisProvider, lengthLevel) +
        calculateCost(summaryResult.provider, lengthLevel);

      return {
        content: summaryResult.content,
        usage: {
          prompt_tokens: (analysisUsage?.prompt_tokens || 0) + (summaryResult.usage?.prompt_tokens || 0),
          completion_tokens: (analysisUsage?.completion_tokens || 0) + (summaryResult.usage?.completion_tokens || 0),
          total_tokens: (analysisUsage?.total_tokens || 0) + (summaryResult.usage?.total_tokens || 0),
        },
        provider: summaryResult.provider,
        estimatedCost,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[AI] Two-step summary failed:`, errorMessage);

      // FALLBACK: Use traditional one-step approach if two-step fails
      console.log(`[AI] Falling back to one-step traditional approach...`);

      return this.generateSummaryTraditional(title, abstract, lengthLevel);
    }
  }

  /**
   * Fallback: Traditional one-step summarization
   */
  private async generateSummaryTraditional(
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed'
  ): Promise<AISummaryResponse> {
    console.log(`[AI] Using traditional summarization approach...`);

    if (!this.fallbackEnabled) {
      const result = await this.tryGenerateSummary(this.preferredProvider, title, abstract, lengthLevel);
      if (result.success) {
        return {
          content: result.content!,
          usage: result.usage,
          provider: result.provider!,
          estimatedCost: calculateCost(result.provider!, lengthLevel),
        };
      }
      throw new Error(`Provider ${this.preferredProvider} failed and fallback is disabled`);
    }

    // 确定回退顺序
    let fallbackOrder: AIProviderType[];
    const preferredIndex = PROVIDER_FALLBACK_ORDER.indexOf(this.preferredProvider);

    if (preferredIndex !== -1) {
      fallbackOrder = [
        this.preferredProvider,
        ...PROVIDER_FALLBACK_ORDER.slice(preferredIndex + 1)
      ];
    } else {
      fallbackOrder = PROVIDER_FALLBACK_ORDER;
    }

    // 尝试每个提供商，直到成功
    for (const provider of fallbackOrder) {
      const result = await this.tryGenerateSummary(provider, title, abstract, lengthLevel);

      if (result.success) {
        const estimatedCost = provider === 'ollama' || provider === 'mock'
          ? 0
          : calculateCost(provider, lengthLevel);

        console.log(`[AI] Traditional summary generated using: ${provider}`);
        return {
          content: result.content!,
          usage: result.usage,
          provider: result.provider!,
          estimatedCost,
        };
      }

      console.log(`[AI] Provider ${provider} failed, trying next...`);
    }

    throw new Error('All AI providers failed. Please check your API keys and network connection.');
  }

  /**
   * 使用首选提供商生成摘要（不回退）
   */
  async generateSummaryWithProvider(
    provider: AIProviderType,
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed' = 'medium'
  ): Promise<AISummaryResponse> {
    console.log(`[AI] Using specific provider: ${provider} (no fallback)`);

    const result = await this.tryGenerateSummary(provider, title, abstract, lengthLevel);

    if (!result.success) {
      throw new Error(`Provider ${provider} failed: ${result.error}`);
    }

    const estimatedCost = provider === 'ollama' || provider === 'mock'
      ? 0
      : calculateCost(provider, lengthLevel);

    return {
      content: result.content!,
      usage: result.usage,
      provider: result.provider!,
      estimatedCost,
    };
  }

  /**
   * 生成快速预览摘要（中英文对照，无需保存即可使用）
   */
  async generateQuickPreview(
    title: string,
    abstract: string
  ): Promise<AISummaryResponse> {
    console.log(`[AI] Generating quick preview with provider: ${this.preferredProvider}`);

    // 重用 generateSummary，使用 short 长度级别
    const result = await this.generateSummary(title, abstract, 'short');
    return result;
  }

  /**
   * 生成 mock 摘要（用于测试/开发）
   */
  private async generateMockSummary(
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed'
  ): Promise<{ content: string; usage?: any }> {
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

  /**
   * 获取当前提供商信息
   */
  getProviderInfo(): {
    provider: AIProviderType;
    pricing: typeof PRICING[keyof typeof PRICING];
    estimatedCosts: Record<string, number>;
    fallbackEnabled: boolean;
  } {
    const estimatedCosts = {
      short: calculateCost(this.preferredProvider, 'short'),
      medium: calculateCost(this.preferredProvider, 'medium'),
      detailed: calculateCost(this.preferredProvider, 'detailed'),
    };

    return {
      provider: this.preferredProvider,
      pricing: PRICING[this.preferredProvider],
      estimatedCosts,
      fallbackEnabled: this.fallbackEnabled,
    };
  }

  /**
   * 设置首选提供商
   */
  setPreferredProvider(provider: AIProviderType): void {
    this.preferredProvider = provider;
    console.log(`[AI] Preferred provider changed to: ${provider}`);
  }

  /**
   * 启用/禁用回退
   */
  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
    console.log(`[AI] Fallback ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 与论文对话（带级联回退）
   * 注意：目前只有 OpenAI 和 DeepSeek 支持此功能
   */
  async chatWithPaper(
    question: string,
    title: string,
    abstract: string,
    chatHistory?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): Promise<{ content: string; usage?: any; provider: AIProviderType }> {
    console.log(`[AI] Chat with paper using provider: ${this.preferredProvider}`);

    // 确定支持聊天功能的提供商顺序
    const chatProviders: AIProviderType[] = ['openai', 'deepseek'];

    // 尝试每个支持聊天的提供商
    for (const provider of chatProviders) {
      try {
        console.log(`[AI] Trying chat with provider: ${provider}`);

        let result: any;

        switch (provider) {
          case 'openai':
            const openaiClient = new OpenAIClient();
            result = await openaiClient.chatWithPaper(question, title, abstract, chatHistory);
            break;

          case 'deepseek':
            const deepSeekClient = new DeepSeekClient();
            result = await deepSeekClient.chatWithPaper(question, title, abstract, chatHistory);
            break;

          default:
            continue;
        }

        console.log(`[AI] Successfully chatted using: ${provider}`);
        return {
          content: result.content,
          usage: result.usage,
          provider,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AI] Provider ${provider} chat failed:`, errorMessage);
        // 继续尝试下一个提供商
      }
    }

    throw new Error('No chat provider available. Please configure OPENAI_API_KEY or DEEPSEEK_API_KEY.');
  }

  /**
   * 提取论文洞察（带级联回退）
   * 注意：目前只有 OpenAI 和 DeepSeek 支持此功能
   */
  async extractInsights(
    title: string,
    abstract: string
  ): Promise<{ content: string; insights?: any; usage?: any; provider: AIProviderType }> {
    console.log(`[AI] Extract insights using provider: ${this.preferredProvider}`);

    // 确定支持洞察提取的提供商顺序
    const insightProviders: AIProviderType[] = ['openai', 'deepseek'];

    // 尝试每个支持洞察提取的提供商
    for (const provider of insightProviders) {
      try {
        console.log(`[AI] Trying insights with provider: ${provider}`);

        let result: any;

        switch (provider) {
          case 'openai':
            const openaiClient = new OpenAIClient();
            result = await openaiClient.extractInsights(title, abstract);
            break;

          case 'deepseek':
            const deepSeekClient = new DeepSeekClient();
            result = await deepSeekClient.extractInsights(title, abstract);
            break;

          default:
            continue;
        }

        console.log(`[AI] Successfully extracted insights using: ${provider}`);
        return {
          content: result.content,
          insights: result.insights,
          usage: result.usage,
          provider,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AI] Provider ${provider} insights failed:`, errorMessage);
        // 继续尝试下一个提供商
      }
    }

    throw new Error('No insights provider available. Please configure OPENAI_API_KEY or DEEPSEEK_API_KEY.');
  }
}

// Singleton instance
let aiManager: AIProviderManager | null = null;

export function getAIManager(): AIProviderManager {
  if (!aiManager) {
    aiManager = new AIProviderManager();
  }
  return aiManager;
}

/**
 * 使用指定提供商创建 AI 管理器实例
 */
export function getAIManagerWithProvider(
  provider: AIProviderType,
  options?: { fallbackEnabled?: boolean }
): AIProviderManager {
  return new AIProviderManager({
    preferredProvider: provider,
    fallbackEnabled: options?.fallbackEnabled,
  });
}

/**
 * 获取可用的提供商列表
 */
export function getAvailableProviders(): AIProviderType[] {
  const providers: AIProviderType[] = [];

  if (process.env.ZHIPU_API_KEY || process.env.ZHIPU_GLM_API_KEY) providers.push('zhipu');
  if (process.env.DEEPSEEK_API_KEY) providers.push('deepseek');
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.ANTHROPIC_API_KEY) providers.push('claude');
  if (process.env.OLLAMA_ENABLED === 'true') providers.push('ollama');
  providers.push('mock'); // Mock always available

  return providers;
}
