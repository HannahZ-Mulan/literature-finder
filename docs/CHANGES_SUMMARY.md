# 项目改动记录

**日期**: 2026-03-07
**会话**: AI Provider系统重构与摘要改进

---

## 1. AI Provider 系统重构

### 新增文件

#### `src/lib/ai/deepseek.ts`
- **功能**: DeepSeek AI 提供商客户端
- **支持**: `generateSummary()`, `extractInsights()`, `chatWithPaper()`
- **API**: https://api.deepseek.com
- **定价**: ~¥1-2/1M tokens
- **关键代码**:
  ```typescript
  export class DeepSeekClient {
    private apiKey: string;
    private baseURL: string;
    // 支持摘要生成、洞察提取、聊天功能
  }
  ```

#### `src/lib/ai/prompts.ts`
- **功能**: 学术聚焦的提示词系统
- **双步流程**:
  1. 提取结构化分析（研究问题、方法论、关键结果、贡献、局限性）
  2. 基于分析生成具体摘要
- **关键特点**:
  - 明确禁止通用短语如 "novel approach", "improves performance"
  - 要求具体的方法名称、指标、数字
  - 支持短(100词)、中等(300-500词)、详细(800-1200词)三种格式

### 修改的文件

#### `src/lib/ai/index.ts` - 主要重构
- **新增功能**:
  - 双步摘要生成流程
  - 级联回退机制（Zhipu → DeepSeek → OpenAI → Ollama → Mock）
  - 支持环境变量 `ZHIPU_API_KEY` 和 `ZHIPU_GLM_API_KEY`

- **关键方法**:
  ```typescript
  // 双步摘要生成
  async generateSummary(title, abstract, lengthLevel)
    → Step 1: extractStructuredAnalysis()
    → Step 2: generateSummaryFromAnalysis()
    → Fallback: generateSummaryTraditional()

  // 结构化分析提取
  private async extractStructuredAnalysis(title, abstract, intro?, conclusion?)

  // 基于分析生成摘要
  private async generateSummaryFromAnalysis(content, analysis, lengthLevel, provider)
  ```

#### `src/lib/ai/providers.ts`
- **更新**:
  - 添加 `deepseek` 到 `AIProviderType`
  - 更新 `PROVIDER_FALLBACK_ORDER`: zhipu → deepseek → openai → ollama → mock
  - 更新 `PRICING` 表添加 DeepSeek 定价
  - 更新 `USAGE_EXAMPLES` 包含 DeepSeek

#### `src/lib/glm/client.ts`
- **修改**: 兼容两种环境变量名
  ```typescript
  this.apiKey = apiKey || process.env.ZHIPU_API_KEY || process.env.ZHIPU_GLM_API_KEY || '';
  ```

#### `src/lib/ai/deepseek.ts`
- **修复**: 添加 `insights` 字段到返回类型
  ```typescript
  export interface DeepSeekResponse {
    content: string;
    insights?: any;  // 新增
    usage?: {...};
  }
  ```

#### `src/components/navigation.tsx`
- **新增**: "上传论文" 导航链接
  ```tsx
  <Link href="/upload" className="text-sm hover:text-primary transition-colors">
    上传论文
  </Link>
  ```

---

## 2. 环境变量配置

### `.env.local` 更新

```bash
# AI Provider Configuration
# Primary: Zhipu GLM-4
AI_PROVIDER=zhipu
ZHIPU_API_KEY=你的智谱API密钥

# Secondary: DeepSeek (fallback)
DEEPSEEK_API_KEY=你的DeepSeek密钥

# Optional: OpenAI
# OPENAI_API_KEY=your_key_here
```

### 支持的环境变量

| 变量名 | 提供商 | 状态 |
|--------|--------|------|
| `ZHIPU_API_KEY` | Zhipu GLM-4 | ✅ 推荐（新） |
| `ZHIPU_GLM_API_KEY` | Zhipu GLM-4 | ✅ 兼容（旧） |
| `DEEPSEEK_API_KEY` | DeepSeek | ✅ 新增 |
| `OPENAI_API_KEY` | OpenAI | ✅ 可选 |
| `OLLAMA_ENABLED` | Ollama | ✅ 本地免费 |
| `AI_PROVIDER` | 指定首选提供商 | ✅ 可选 |

---

## 3. API 端点

### 更新的路由

| 端点 | 方法 | 改动 |
|------|------|------|
| `/api/literature/[id]/summary` | POST/GET | ✅ 使用双步摘要系统 |
| `/api/literature/[id]/chat` | POST | ✅ 使用AIProviderManager，支持级联回退 |
| `/api/literature/[id]/insights` | GET | ✅ 使用AIProviderManager，支持级联回退 |
| `/api/literature/library` | GET | 无变化 |
| `/api/papers/upload` | POST | 无变化 |
| `/upload` | 页面 | ✅ 导航栏新增链接 |

---

## 4. 回退机制

### 级联回退顺序

```
摘要生成:
  Zhipu GLM-4 → DeepSeek → OpenAI → Ollama → Mock

聊天功能:
  OpenAI → DeepSeek (仅这两个支持)

洞察提取:
  OpenAI → DeepSeek (仅这两个支持)
```

### 失败处理

- 双步摘要失败 → 自动回退到传统单步方法
- 单个提供商失败 → 自动尝试下一个提供商
- 所有提供商失败 → 返回错误并建议检查API密钥

---

## 5. 成本对比

| 提供商 | 输入成本 | 输出成本 | 1000篇中等摘要 |
|--------|----------|----------|----------------|
| Zhipu GLM-4 | ¥0.5/1M | ¥0.5/1M | ~¥0.50 |
| DeepSeek | ¥1/1M | ¥2/1M | ~¥1.00 |
| OpenAI | ¥7/1M | ¥14/1M | ~¥7.00 |
| Ollama | 免费 | 免费 | 免费 |
| Mock | 免费 | 免费 | 免费 |

---

## 6. 关键代码模式

### 双步摘要生成流程

```typescript
// 步骤1: 提取结构化信息
const { analysis, provider: analysisProvider } = await extractStructuredAnalysis(
  title, abstract, introduction, conclusion
);

// 步骤2: 基于分析生成摘要
const summaryResult = await generateSummaryFromAnalysis(
  { title, abstract },
  analysis,
  lengthLevel,
  preferredProvider
);

// 回退: 如果双步失败
catch (error) {
  return generateSummaryTraditional(title, abstract, lengthLevel);
}
```

### 提示词使用示例

```typescript
import { getExtractionPrompt, getSummaryPrompt } from '@/lib/ai/prompts';

// 步骤1: 提取分析
const extractionPrompt = getExtractionPrompt({ title, abstract, introduction, conclusion });

// 步骤2: 生成摘要
const summaryPrompt = getSummaryPrompt(content, analysis, 'medium');
```

---

## 7. 已知问题

1. **PDF文本提取**: 暂时禁用，需要手动粘贴文本
2. **聊天/洞察功能**: 仅 OpenAI 和 DeepSeek 支持，Zhipu GLM-4 不支持
3. **缓存问题**: 旧摘要被缓存，需要使用新的文献ID测试新系统

---

## 8. 服务器信息

- **当前端口**: localhost:3006
- **状态**: 运行中
- **环境**: .env.local 已加载
- **提供商**: Zhipu (主) + DeepSeek (备用)

---

## 9. 测试命令

### 测试摘要生成
```bash
curl -X POST "http://localhost:3006/api/literature/[id]/summary" \
  -H "Content-Type: application/json" \
  -d '{"length_level":"medium"}'
```

### 测试聊天功能
```bash
curl -X POST "http://localhost:3006/api/literature/[id]/chat" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the main contribution?"}'
```

### 测试洞察提取
```bash
curl "http://localhost:3006/api/literature/[id]/insights"
```

---

## 10. 下次工作建议

1. **启用PDF文本提取**: 集成PDF解析库（如 pdf.js 或 pdf-parse）
2. **添加Claude支持**: 实现Anthropic Claude客户端
3. **优化缓存策略**: 区分新旧摘要，避免返回过时缓存
4. **添加批量摘要**: 支持一次处理多篇论文
5. **性能监控**: 添加各提供商的响应时间和成功率统计
6. **成本追踪**: 记录实际API调用成本

---

## 文件变更清单

### 新建文件 (2个)
- `src/lib/ai/deepseek.ts`
- `src/lib/ai/prompts.ts`

### 修改文件 (6个)
- `src/lib/ai/index.ts`
- `src/lib/ai/providers.ts`
- `src/lib/glm/client.ts`
- `src/components/navigation.tsx`
- `src/app/api/literature/[id]/chat/route.ts`
- `src/app/api/literature/[id]/insights/route.ts`

### 配置文件 (1个)
- `.env.local`

---

**备注**: 所有改动已通过编译测试，服务器正常运行在 localhost:3006
