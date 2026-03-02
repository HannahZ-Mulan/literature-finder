/**
 * 统一的 AI 客户端
 * 根据配置自动选择最佳的 AI 提供商
 */

import { GLMClient } from '../glm/client';
import { OpenAIClient } from './openai';
import { OllamaClient } from './ollama';
import { AIProviderType, calculateCost, PRICING } from './providers';

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

export class AIProviderManager {
  private preferredProvider: AIProviderType;

  constructor(preferredProvider?: AIProviderType) {
    // 1. 使用指定的提供商
    // 2. 使用环境变量配置的提供商
    // 3. 自动检测可用的提供商
    this.preferredProvider = preferredProvider ||
      (process.env.AI_PROVIDER as AIProviderType) ||
      this.detectBestProvider();
  }

  /**
   * 自动检测最佳可用提供商
   */
  private detectBestProvider(): AIProviderType {
    // 优先级：OpenAI/Claude > 智谱 GLM > Ollama > Mock
    if (process.env.OPENAI_API_KEY) {
      return 'openai';
    }
    if (process.env.ANTHROPIC_API_KEY) {
      return 'claude';
    }
    if (process.env.ZHIPU_GLM_API_KEY) {
      return 'zhipu';
    }
    if (process.env.OLLAMA_ENABLED === 'true') {
      return 'ollama';
    }
    // 默认使用 mock 模式
    return 'mock';
  }

  /**
   * 生成文献摘要
   */
  async generateSummary(
    title: string,
    abstract: string,
    lengthLevel: 'short' | 'medium' | 'detailed' = 'medium'
  ): Promise<AISummaryResponse> {
    const provider = this.preferredProvider;

    console.log(`[AI] Using provider: ${provider} for ${lengthLevel} summary`);

    try {
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

        case 'ollama':
          const ollamaClient = new OllamaClient();
          // 测试连接
          const connected = await ollamaClient.testConnection();
          if (!connected) {
            console.warn('[AI] Ollama not available, falling back to mock');
            result = await this.generateMockSummary(title, abstract, lengthLevel);
            break;
          }
          result = await ollamaClient.generateSummary(title, abstract, lengthLevel);
          break;

        case 'mock':
        default:
          result = await this.generateMockSummary(title, abstract, lengthLevel);
          break;
      }

      // 计算估算成本（Ollama 和 mock 是免费的）
      const estimatedCost = provider === 'ollama' || provider === 'mock'
        ? 0
        : calculateCost(provider, lengthLevel);

      return {
        ...result,
        provider,
        estimatedCost,
      };
    } catch (error) {
      console.error(`[AI] Provider ${provider} failed:`, error);

      // 如果不是 mock，尝试 fallback 到 mock
      if (provider !== 'mock') {
        console.log('[AI] Falling back to mock summary');
        const fallbackResult = await this.generateMockSummary(title, abstract, lengthLevel);
        return {
          ...fallbackResult,
          provider: 'mock',
          estimatedCost: 0,
        };
      }

      throw error;
    }
  }

  /**
   * 生成快速预览摘要（中英文对照，无需保存即可使用）
   */
  async generateQuickPreview(
    title: string,
    abstract: string
  ): Promise<AISummaryResponse> {
    const provider = this.preferredProvider;

    console.log(`[AI] Using provider: ${provider} for quick preview`);

    try {
      let result: any;

      switch (provider) {
        case 'openai':
          const openaiClient = new OpenAIClient();
          const openaiResult = await openaiClient.generateSummary(title, abstract, 'short');
          result = { content: openaiResult.content, usage: openaiResult.usage };
          break;

        case 'zhipu':
          const glmClient = new GLMClient();
          const glmResult = await glmClient.generateSummary(title, abstract, 'short');
          result = { content: glmResult.content, usage: glmResult.usage };
          break;

        case 'ollama':
          const ollamaClient = new OllamaClient();
          const connected = await ollamaClient.testConnection();
          if (!connected) {
            console.warn('[AI] Ollama not available, falling back to mock');
            result = await this.generateMockQuickPreview(title, abstract);
            break;
          }
          const ollamaResult = await ollamaClient.generateSummary(title, abstract, 'short');
          result = { content: ollamaResult.content, usage: ollamaResult.usage };
          break;

        case 'mock':
        default:
          result = await this.generateMockQuickPreview(title, abstract);
          break;
      }

      return {
        ...result,
        provider,
        estimatedCost: 0,
      };
    } catch (error) {
      console.error(`[AI] Provider ${provider} failed:`, error);
      if (provider !== 'mock') {
        console.log('[AI] Falling back to mock preview');
        const fallbackResult = await this.generateMockQuickPreview(title, abstract);
        return {
          ...fallbackResult,
          provider: 'mock',
          estimatedCost: 0,
        };
      }
      throw error;
    }
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
   * 生成 mock 快速预览（中英文对照，智能总结核心内容）
   */
  private async generateMockQuickPreview(
    title: string,
    abstract: string
  ): Promise<{ content: string; usage?: any; chinese: string; english: string }> {
    if (!abstract) {
      return {
        content: `**Paper**: ${title}\n\nNo abstract available for preview.`,
        chinese: `**论文**: ${title}\n\n暂无摘要可供预览。`,
        english: `**Paper**: ${title}\n\nNo abstract available for preview.`,
        usage: { prompt_tokens: 0, completion_tokens: 10, total_tokens: 10 },
      };
    }

    // 智能总结：从摘要中提炼核心内容，而不是照抄
    const generateCoreSummary = (text: string): { summary: string; hasMethod: boolean; hasResults: boolean } => {
      const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 10);
      if (sentences.length === 0) {
        return { summary: text.substring(0, 200) + '...', hasMethod: false, hasResults: false };
      }

      // 提取关键信息
      let problemStmt = '';
      let methodStmt = '';
      let resultStmt = '';

      // 找问题陈述
      const problemPatterns = [
        /this\s+paper\s+(addresses|investigates|explores|studies)/i,
        /we\s+(investigate|study|explore|examine)/i,
        /in\s+this\s+work/i,
      ];
      for (const s of sentences) {
        if (problemPatterns.some(p => p.test(s))) {
          problemStmt = s.trim();
          break;
        }
      }
      if (!problemStmt && sentences.length > 0) {
        problemStmt = sentences[0].trim().substring(0, 100);
      }

      // 找方法
      const methodPatterns = [
        /we\s+(propose|present|introduce|develop)/i,
        /our?\s+(approach|method|framework|model)/i,
        /using\s+(a\s+)?(novel|new)/i,
      ];
      for (const s of sentences) {
        if (methodPatterns.some(p => p.test(s))) {
          methodStmt = s.trim();
          break;
        }
      }

      // 找结果
      const resultPatterns = [
        /results?\s+(show|demonstrate|indicate|reveal)/i,
        /experiments?\s+(show|demonstrate|indicate)/i,
        /achieves?\s+(state-of-the-art|significant|improved)/i,
      ];
      for (const s of sentences) {
        if (resultPatterns.some(p => p.test(s))) {
          resultStmt = s.trim();
          break;
        }
      }

      // 组合成简洁总结
      const parts: string[] = [];
      if (problemStmt) parts.push(problemStmt);
      if (methodStmt) parts.push(methodStmt);
      if (resultStmt) parts.push(resultStmt);

      // 如果没有找到具体内容，取前两句并压缩
      if (parts.length === 0) {
        const summary = sentences.slice(0, 2).join('. ').substring(0, 180);
        return { summary: summary + '.', hasMethod: false, hasResults: false };
      }

      // 控制长度
      let summary = parts.join('. ');
      if (summary.length > 200) {
        summary = summary.substring(0, 200) + '...';
      }

      return { summary, hasMethod: !!methodStmt, hasResults: !!resultStmt };
    };

    const { summary: coreSummary } = generateCoreSummary(abstract);

    // 英文版本 - 真正的总结，不是照抄
    const english = `**Paper**: ${title}

**Quick Summary**: ${coreSummary}`;

    // 中文版本 - 更完整的翻译
    const translateToChinese = (text: string): string => {
      let translated = text;

      // 更全面的翻译词典
      const translations: Record<string, string> = {
        // 动词
        'proposes': '提出', 'proposed': '提出',
        'presents': '展示', 'presented': '展示',
        'demonstrates': '证明', 'demonstrated': '证明',
        'shows': '显示', 'showed': '显示', 'shown': '显示',
        'introduces': '介绍', 'introduced': '介绍',
        'develops': '开发', 'developed': '开发',
        'achieves': '实现', 'achieved': '实现',
        'improves': '改进', 'improved': '改进',
        'addresses': '解决', 'investigates': '研究',
        'explores': '探索', 'studies': '研究',
        'examines': '检查', 'analyzes': '分析',

        // 名词
        'approach': '方法', 'method': '方法',
        'framework': '框架', 'model': '模型',
        'algorithm': '算法', 'system': '系统',
        'performance': '性能', 'accuracy': '准确率',
        'efficiency': '效率', 'effective': '有效',
        'novel': '新颖的', 'new': '新的',
        'state-of-the-art': '最先进的',
        'significant': '显著的', 'results': '结果',
        'experiments': '实验', 'experimental': '实验的',
        'paper': '论文', 'study': '研究', 'work': '工作',
        'problem': '问题', 'challenge': '挑战',
        'solution': '解决方案', 'technique': '技术',
        'data': '数据', 'dataset': '数据集',
        'training': '训练', 'learning': '学习',
        'network': '网络', 'neural': '神经的',
      };

      Object.entries(translations).forEach(([en, zh]) => {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        translated = translated.replace(regex, zh);
      });

      return translated;
    };

    const translatedSummary = translateToChinese(coreSummary);
    const chinese = `**论文**: ${title}

**快速总结**: ${translatedSummary}`;

    return {
      content: english,
      chinese,
      english,
      usage: {
        prompt_tokens: abstract.split(' ').length,
        completion_tokens: coreSummary.split(' ').length,
        total_tokens: abstract.split(' ').length + coreSummary.split(' ').length,
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
    };
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

export function getAIManagerWithProvider(provider: AIProviderType): AIProviderManager {
  return new AIProviderManager(provider);
}
