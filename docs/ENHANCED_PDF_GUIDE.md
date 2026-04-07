# AI PDF 智能解析系统 - 部署和使用指南

## 🎯 系统概述

这是一个生产级别的AI PDF解析系统，支持：
- ✅ 并行分页提取（快速）
- ✅ AI实时分析每页内容（智能）
- ✅ 实时进度展示（透明）
- ✅ 对话助手（交互）
- ✅ 大PDF处理（50-200页）

## 📋 系统架构

```
用户上传PDF
    ↓
立即返回paperId
    ↓
后台并行提取（每批6页）
    ↓
每页写入数据库
    ↓
AI分块分析（每批3页）
    ↓
实时更新进度
    ↓
前端每1.5秒轮询显示
```

## 🚀 快速开始

### 第一步：安装依赖

```bash
# Python依赖（用于PDF分页提取）
pip install PyPDF2

# Node.js依赖（应该已安装）
npm install
```

### 第二步：初始化数据库

```bash
# 运行数据库初始化脚本
node scripts/init-enhanced-db.js
```

这会创建以下表：
- `papers` - 论文主表
- `paper_pages` - 每页内容和分析
- `paper_chats` - 对话历史

### 第三步：配置AI密钥

在 `.env.local` 文件中配置：

```env
# 选择一个或多个配置
OPENAI_API_KEY=sk-xxx...
DEEPSEEK_API_KEY=sk-xxx...
ZHIPU_API_KEY=xxx...
```

### 第四步：启动开发服务器

```bash
npm run dev
```

访问：http://localhost:3000/upload/enhanced

## 📁 文件结构

```
literature-finder/
├── src/
│   ├── db/
│   │   ├── schema-enhanced.ts          # 增强的数据库Schema
│   │   └── index-enhanced.ts            # 数据库访问层
│   ├── lib/
│   │   ├── pdf-extractor-per-page.ts    # 分页PDF提取器
│   │   └── ai/
│   │       └── page-analyzer.ts         # AI分析服务
│   └── app/api/papers/
│       ├── enhanced/upload/route.ts     # 增强上传API
│       └── [id]/enhanced/
│           ├── status/route.ts          # 状态查询API
│           └── analyze/route.ts         # AI分析触发API
├── scripts/
│   ├── init-enhanced-db.js             # 数据库初始化
│   └── extract-pdf-pages.py            # Python分页提取脚本
└── docs/
    └── ENHANCED_PDF_GUIDE.md           # 本文档
```

## 🔧 API接口说明

### 1. 上传PDF

**POST** `/api/papers/enhanced/upload`

请求：
```typescript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('title', '论文标题');

const response = await fetch('/api/papers/enhanced/upload', {
  method: 'POST',
  body: formData,
});
```

响应：
```json
{
  "success": true,
  "paperId": 123,
  "fileName": "timestamp-paper.pdf",
  "title": "论文标题",
  "message": "File uploaded successfully. Extraction starting in background."
}
```

### 2. 查询状态

**GET** `/api/papers/[id]/enhanced/status`

响应：
```json
{
  "paper": {
    "id": 123,
    "title": "论文标题",
    "totalPages": 58,
    "extractedPages": 58,
    "analyzedPages": 45,
    "isExtractionComplete": true,
    "isAnalysisComplete": false,
    "extractionProgress": 100,
    "analysisProgress": 78,
    "overallProgress": 89
  },
  "pages": [
    {
      "pageNumber": 1,
      "textLength": 1234,
      "isAnalyzed": true,
      "aiAnalysis": "第1页的主要内容...",
      "extractStatus": "completed",
      "hasError": false
    }
  ],
  "summary": null
}
```

### 3. 触发AI分析

**POST** `/api/papers/[id]/enhanced/analyze`

响应：
```json
{
  "success": true,
  "message": "AI analysis started",
  "isComplete": false
}
```

### 4. 对话助手

**POST** `/api/papers/[id]/chat`

请求：
```json
{
  "question": "这篇论文的主要方法是什么？",
  "chat_history": []
}
```

响应：
```json
{
  "answer": "根据论文内容...",
  "provider": "openai",
  "usage": {
    "prompt_tokens": 1500,
    "completion_tokens": 500
  }
}
```

## 🎨 前端使用

### 方式1：使用增强上传页面

访问：`http://localhost:3000/upload/enhanced`

功能：
- 上传PDF
- 实时查看提取进度
- 实时查看AI分析结果
- 自动跳转到论文列表

### 方式2：集成到现有页面

```tsx
'use client';

import { useState, useEffect } from 'react';

export function PDFAnalyzer() {
  const [paperId, setPaperId] = useState<number | null>(null);
  const [status, setStatus] = useState(null);

  // 上传PDF
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/papers/enhanced/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setPaperId(data.paperId);

    // 开始轮询
    startPolling(data.paperId);
  };

  // 轮询状态
  const startPolling = (id: number) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/papers/${id}/enhanced/status`);
      const data = await res.json();
      setStatus(data.paper);

      if (data.paper.isExtractionComplete && data.paper.isAnalysisComplete) {
        clearInterval(interval);
      }
    }, 1500);
  };

  return (
    <div>
      {/* 上传界面 */}
      {/* 进度显示 */}
      {/* AI分析结果 */}
    </div>
  );
}
```

## ⚙️ 配置选项

### 提取批处理大小

在 `src/lib/pdf-extractor-per-page.ts` 中：

```typescript
const result = await extractPDFPerPage(filePath, {
  batchSize: 6,  // 每批处理6页（可调整）
});
```

### AI分析批处理大小

在 `src/lib/ai/page-analyzer.ts` 中：

```typescript
await analyzePaperPages(paperId, {
  batchSize: 3,  // 每批分析3页（可调整）
});
```

### 轮询间隔

在前端页面中：

```typescript
const interval = setInterval(async () => {
  // ...
}, 1500);  // 每1.5秒轮询一次
```

## 🔍 性能优化建议

### 1. 大PDF处理

对于100+页的PDF：
- 提取批处理大小设为10
- AI分析批处理大小设为5
- 轮询间隔设为2000ms

### 2. 小PDF处理

对于<20页的PDF：
- 提取批处理大小设为3
- AI分析批处理大小设为2
- 轮询间隔设为1000ms

### 3. AI成本优化

- 使用更便宜的模型（如DeepSeek）
- 减少批处理大小（每次发送更少内容）
- 只分析关键页面

## 🐛 故障排除

### 问题1：Python脚本找不到

```bash
# 确保Python3已安装
python3 --version

# 安装PyPDF2
pip3 install PyPDF2
```

### 问题2：数据库错误

```bash
# 重新初始化数据库
rm data/papers.db
node scripts/init-enhanced-db.js
```

### 问题3：AI分析不工作

检查：
1. `.env.local` 文件中的API密钥是否配置
2. API密钥是否有额度
3. 网络连接是否正常

### 问题4：进度卡住

```bash
# 查看服务器日志
npm run dev

# 应该看到类似输出：
# [Extraction] Saved page 1/58
# [AI Analysis] ✅ Page 1 analyzed (1/58)
```

## 📊 数据库查询示例

```sql
-- 查看所有论文
SELECT * FROM papers;

-- 查看某论文的所有页面
SELECT * FROM paper_pages WHERE paper_id = 123;

-- 查看已分析的页面
SELECT * FROM paper_pages
WHERE paper_id = 123 AND is_analyzed = 1;

-- 查看对话历史
SELECT * FROM paper_chats
WHERE paper_id = 123
ORDER BY created_at DESC;
```

## 🚀 生产部署

### 1. 环境变量

```env
NODE_ENV=production
DATABASE_URL=/path/to/prod.db
OPENAI_API_KEY=sk-xxx...
```

### 2. 性能优化

```typescript
// 使用连接池
// 启用缓存
// 使用CDN
// 配置反向代理
```

### 3. 监控

- 记录提取失败率
- 记录AI分析时间
- 记录API响应时间
- 设置告警

## 📝 TODO

- [ ] 支持OCR fallback（Tesseract.js）
- [ ] 支持更多PDF格式
- [ ] 添加导出功能（Markdown、Word）
- [ ] 添加批量上传
- [ ] 添加PDF预览
- [ ] 优化AI提示词
- [ ] 添加缓存机制

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可

MIT
