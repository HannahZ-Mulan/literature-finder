# Literature Finder

AI 驱动的文献管理与深度阅读助手,帮助用户(尤其需要阅读英文学术论文的中国学生)在几分钟内理解一篇论文:上传 PDF → AI 生成结构化中文解读 → 选中段落翻译+解释 → 与论文对话(RAG 问答)。

> 产品愿景来自 `MVP_SPECIFICATION.md`:专注**论文理解**,而非论文管理。

---

## ✨ 核心功能(MVP 4 件套)

| # | 功能 | 说明 |
|---|------|------|
| 1 | **上传论文** | 上传 PDF,自动提取文本并按学术章节(Abstract / Methods / Results …)分块入库 |
| 2 | **AI 中文总结** | 结构化解读:一句话总结、研究问题、方法、关键发现、贡献、局限性,每条结论标注 📍 引用位置 |
| 3 | **段落翻译 + 解释** | 选中任意段落,AI 同时返回**准确翻译**与**通俗解释** |
| 4 | **与论文对话** | 基于 RAG 的问答——先检索最相关的章节分块,再交给 LLM 回答,避免全文截断丢信息 |

### 附加能力

- **外部学术搜索** — 一站式检索 OpenAlex / arXiv / PubMed / Semantic Scholar(2.5 亿+ 论文)
- **Google Scholar 集成** — 论文页一键跳转 Scholar 检索
- **关键词搜索** — 对已上传论文的分块做相关性打分检索
- **Warm Scholar 主题** — 米白纸面 / 琥珀点缀的学术质感视觉语言(换肤进行中,详见 `docs/specs/SPEC-001-ui-redesign-warm-scholar.md`)

---

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14.2.21 · React 18 · TypeScript · Tailwind CSS · shadcn/ui · Lucide |
| 后端 | Next.js API Routes · Drizzle ORM |
| 数据库 | SQLite(libsql) |
| AI | DeepSeek(主)· 智谱 GLM-4 · OpenAI(可选,通过 AI Manager 级联回退) |
| PDF | pdf-parse(文本提取)· pdfjs-dist(预览) |

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18(开发环境使用 v24)
- npm

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local   # 然后填入你的 API Key(见下)

# 3. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

### 环境变量

复制 `.env.example` 为 `.env.local`,填入至少一个 AI 提供商的 Key(模板内有详细注释与成本对比):

```bash
cp .env.example .env.local
```

支持的提供商(详见 `.env.example`):

| 提供商 | 环境变量 | 说明 |
|--------|---------|------|
| 智谱 GLM-4 | `ZHIPU_GLM_API_KEY` | 国内推荐,访问快、价格低 |
| DeepSeek | `DEEPSEEK_API_KEY` | 高性价比 |
| OpenAI | `OPENAI_API_KEY` | 效果好,国内需代理 |
| Ollama | `OLLAMA_BASE_URL` | 本地免费,需自行部署 |
| Claude | `ANTHROPIC_API_KEY` | 长文本处理强 |

可选指定首选提供商:`AI_PROVIDER=zhipu`(不设则自动检测回退)。

> 💡 **路由说明**:摘要功能直连 DeepSeek;对话与翻译经 AI Manager,当前实际尝试顺序为 `openai → deepseek`。配置多提供商时,失败会自动回退。详见 `src/lib/ai/`。

---

## 📁 项目结构

```
src/
├── app/
│   ├── paper/[id]/          # 论文详情页(左右两栏:论文 | AI 功能)
│   ├── upload/              # PDF 上传
│   ├── search/              # 外部学术搜索
│   ├── my-papers/           # 我的论文列表
│   └── api/
│       ├── papers/[id]/     # 论文 API(summary / core-insights / chat / chunk)
│       ├── translate/       # 段落翻译 + 解释
│       ├── search/chunks/   # 分块关键词搜索
│       └── google-scholar/  # Scholar 检索链接
├── lib/
│   ├── ai/                  # AI 客户端 + Manager(级联回退)
│   ├── chunker/             # 学术章节检测 + 分块存储
│   └── search/              # 关键词提取 / 打分 / RAG 检索
└── db/                      # Drizzle schema + 连接
```

---

## 🧠 关键设计

### RAG 问答(功能 4)

与论文对话不是"把全文塞进 prompt",而是真正的检索增强:

1. 上传时按学术章节**分块**入库(`src/lib/chunker/`)
2. 提问时用**关键词打分**检索最相关的 top-5 分块(`src/lib/search/chunk-retriever.ts`)
3. 仅把相关分块作为上下文交给 LLM 回答

检索召回为空时有**三级降级**:章节开头(Abstract/Intro)→ 全文截断,确保总有上下文。

### AI 诚实性

所有 AI 端点(summary / core-insights / translate / chat)在生成失败时**返回 `degraded: true` + HTTP 5xx + 明确错误提示**,而非静默返回假数据。前端检测到降级会显示红色错误提示。

---

## 📜 常用脚本

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run typecheck    # TypeScript 类型检查

# 诊断工具(scripts/)
npx tsx scripts/check-db-state.ts              # 查看论文/分块数量
npx tsx scripts/validate-chunk-completeness.ts # 校验所有论文已分块
npx tsx scripts/analyze-text-stats.ts          # 文本长度/保留率统计
```

---

## 📌 状态与路线

**MVP 4 大功能已全部完成。** 后续路线见 `IMPLEMENTATION_ROADMAP.md`:

- Warm Scholar 换肤轨道二(替换 120 处硬编码颜色类)、轨道三(字体)
- 引用格式优化、PDF 预览增强

---

## 📄 文档

- `MVP_SPECIFICATION.md` — 产品规格(功能范围、不在范围内项)
- `IMPLEMENTATION_ROADMAP.md` — 实施路线图
- `PROJECT_RULES.md` — 开发约定(布局规则、组件规范)
- `docs/specs/` — 功能规格(SPEC-001 UI 重设计)

---

## ⚠️ 已知限制

- PDF 文本提取依赖 `pdf-parse`,扫描版(图片)PDF 需 OCR(尚未集成)
- 关键词检索为词频打分,非语义向量检索——长论文的细粒度问答可考虑后续接入向量库
- `uploads/` 目录在 `.gitignore` 中,PDF 不进版本库(运行时数据)

---

*Built as an MVP focused on the core reading comprehension experience.*
