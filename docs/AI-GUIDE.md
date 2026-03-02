# AI 文献摘要功能配置指南

## 📋 目录
1. [快速开始](#快速开始)
2. [AI 提供商对比](#ai-提供商对比)
3. [详细配置步骤](#详细配置步骤)
4. [常见问题](#常见问题)

---

## 🚀 快速开始

### 最简单的方式（测试模式）

不需要任何配置，系统默认使用 **mock 模式**，会返回模板化的摘要内容。

```bash
# 直接运行，无需配置
npm run dev
```

### 推荐方式（使用 Ollama，完全免费）

1. 下载并安装 [Ollama](https://ollama.ai)
2. 在终端运行：
   ```bash
   # 启动 Ollama 服务
   ollama serve

   # 拉取中文模型（推荐）
   ollama pull qwen2.5:7b
   ```

3. 在 `.env` 文件中配置：
   ```bash
   AI_PROVIDER=ollama
   OLLAMA_ENABLED=true
   ```

4. 启动项目：
   ```bash
   npm run dev
   ```

---

## 💰 AI 提供商对比

| 提供商 | 成本 (1000篇摘要) | 优点 | 缺点 | 推荐场景 |
|--------|------------------|------|------|----------|
| **智谱 GLM** | ≈ ¥0.50 | 国内访问快，价格便宜 | 效果略逊于 GPT | 🌟 国内用户首选 |
| **Ollama** | 免费 | 完全免费，数据隐私 | 需要本地部署 | 🌟 个人学习、测试 |
| **OpenAI GPT** | ≈ ¥7.00 | 效果最好，生态完善 | 价格较高，需代理 | 商业项目、需要最高质量 |
| **Claude** | ≈ ¥21.00 | 长文本能力强 | 价格最高 | 长文献摘要 |
| **Mock** | 免费 | 无需配置 | 不是真实 AI | 开发测试 |

### 详细定价

```
智谱 GLM (glm-4):
  - 输入: ¥0.50 / 1M tokens
  - 输出: ¥0.50 / 1M tokens
  - 1000篇中等摘要: ≈ ¥0.50

OpenAI GPT-4o-mini:
  - 输入: $0.15 / 1M tokens (≈ ¥1.05)
  - 输出: $0.60 / 1M tokens (≈ ¥4.20)
  - 1000篇中等摘要: ≈ ¥3.00

Ollama:
  - 完全免费
  - 需要本地电脑资源（推荐 16GB+ RAM）
```

---

## 🔧 详细配置步骤

### 方案 1: 智谱 GLM（推荐国内用户）

1. **注册并获取 API Key**
   - 访问: https://open.bigmodel.cn/
   - 注册账号并完成实名认证
   - 创建 API Key

2. **配置环境变量**
   ```bash
   # 复制示例文件
   cp .env.example .env

   # 编辑 .env 文件
   AI_PROVIDER=zhipu
   ZHIPU_GLM_API_KEY=你的API密钥
   ```

3. **启动项目**
   ```bash
   npm run dev
   ```

### 方案 2: OpenAI GPT（推荐国外用户）

1. **注册并获取 API Key**
   - 访问: https://platform.openai.com/
   - 注册并创建 API Key

2. **配置环境变量**
   ```bash
   AI_PROVIDER=openai
   OPENAI_API_KEY=你的API密钥
   # 可选：使用代理
   OPENAI_BASE_URL=https://你的代理地址/v1
   ```

### 方案 3: Ollama（完全免费）

**Windows 安装：**
1. 下载: https://ollama.ai/download/windows
2. 安装后运行: `ollama serve`
3. 拉取模型:
   ```bash
   # 推荐：通义千问 7B（中文能力强，轻量）
   ollama pull qwen2.5:7b

   # 或选择 Llama 3.2 3B（更轻量）
   ollama pull llama3.2:3b
   ```

**Mac/Linux 安装：**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull qwen2.5:7b
```

**配置：**
```bash
AI_PROVIDER=ollama
OLLAMA_ENABLED=true
OLLAMA_MODEL=qwen2.5:7b  # 可选
```

---

## 📊 成本估算工具

你可以使用内置的成本计算功能：

```typescript
import { calculateCost, PRICING } from '@/lib/ai/providers';

// 计算单篇摘要成本
const cost = calculateCost('zhipu', 'medium');
console.log(`单篇中等摘要成本: ¥${cost}`);

// 批量成本估算
const papersCount = 1000;
const totalCost = cost * papersCount;
console.log(`${papersCount} 篇摘要总成本: ¥${totalCost}`);
```

### 实际成本示例

| 数量 | 短摘要 | 中等摘要 | 详细摘要 |
|------|--------|----------|----------|
| 10 篇 | ¥0.003 | ¥0.005 | ¥0.01 |
| 100 篇 | ¥0.03 | ¥0.05 | ¥0.10 |
| 1000 篇 | ¥0.30 | ¥0.50 | ¥1.00 |
| 10000 篇 | ¥3.00 | ¥5.00 | ¥10.00 |

*以上价格基于智谱 GLM*

---

## ❓ 常见问题

### Q1: 我应该选择哪个提供商？

**个人学习/测试：**
- 使用 Ollama（免费）

**小型项目：**
- 国内用户：智谱 GLM（便宜）
- 国外用户：OpenAI GPT（方便）

**商业项目：**
- 根据质量要求和预算选择
- 建议混合使用：常用 GLM，重要文献用 GPT

### Q2: Ollama 需要什么配置？

**推荐配置：**
- CPU: 4核以上
- RAM: 16GB（运行 7B 模型）
- 硬盘: 10GB 可用空间

**最低配置：**
- CPU: 2核
- RAM: 8GB（运行 3B 模型）

### Q3: 如何切换提供商？

```bash
# 修改 .env 文件
AI_PROVIDER=openai  # 或 zhipu, ollama, claude

# 重启开发服务器
npm run dev
```

### Q4: 可以同时使用多个提供商吗？

可以！在代码中指定：

```typescript
import { getAIManagerWithProvider } from '@/lib/ai';

// 使用特定提供商
const openaiManager = getAIManagerWithProvider('openai');
const glmManager = getAIManagerWithProvider('zhipu');
```

### Q5: API 调用失败怎么办？

系统会自动 fallback 到 mock 模式，确保功能正常运行。你也可以：

1. 检查 API Key 是否正确
2. 查看网络连接
3. 查看错误日志

---

## 📝 使用示例

### 生成文献摘要

```bash
# API 调用
POST /api/literature/15/summary
{
  "length_level": "medium"
}

# 响应
{
  "message": "Summary generated",
  "summary": "论文摘要内容...",
  "length_level": "medium",
  "provider": "zhipu",
  "estimatedCost": 0.0005,
  "usage": {
    "prompt_tokens": 400,
    "completion_tokens": 600,
    "total_tokens": 1000
  }
}
```

---

## 🔒 隐私说明

- **Ollama**: 完全本地运行，数据不上传
- **智谱 GLM**: 数据发送到智谱 AI 服务器
- **OpenAI/Claude**: 数据发送到对应 API 服务器

建议处理敏感数据时使用 Ollama。

---

## 📞 获取帮助

- 智谱 GLM 文档: https://open.bigmodel.cn/dev/api
- OpenAI 文档: https://platform.openai.com/docs
- Ollama 文档: https://github.com/ollama/ollama
