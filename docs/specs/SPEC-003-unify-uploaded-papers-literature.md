# Feature: 统一 uploaded_papers 到 literature 体系

## Feature Description

修复 literature-finder 的核心数据模型断层：用户上传的论文(`uploaded_papers`)目前与系统枢纽表 `literature` 完全割裂,导致阅读列表、笔记、分类、标签等所有围绕 `literature` 构建的功能都无法作用于上传的论文。

本 feature 通过在上传流程中**同步创建 literature 记录**并建立反向关联(`uploaded_papers.literature_id`),让上传的论文融入 literature 体系——**一处改动,全系统受益**:笔记/分类/标签/阅读列表全部自动支持上传论文。

## User Story

**As a** 科研人员
**I want** 我上传的论文能加入阅读列表、能记笔记、能分类打标签
**So that** 上传的论文和联网搜索的文献享有同等的管理能力,不必因为来源不同而用两套割裂的工具。

## Problem Statement

数据模型审计发现,系统 6+ 处硬绑定 `literature_id`:
- `reading_list_items.literature_id`(阅读列表)
- `literature_notes.literature_id`(笔记)
- `literature_categories.literature_id`(分类)
- `literature_tags.literature_id`(标签)
- `user_literature.literature_id`(用户收藏关系)

而 `uploaded_papers` 是个**孤立表**,与 `literature` 无任何关联。后果:
1. 上传的论文(6 篇真实论文)**无法加入阅读列表**(reading_list_items 只接 literature)
2. 无法给上传的论文记笔记、分类、打标签
3. 用户真实使用的论文(uploaded_papers,6 篇)反而得不到系统最完整的管理能力
4. `literature` 表只有 2 条数据(几乎空),阅读列表/笔记功能闲置根因正在于此

## Solution Statement

采用**统一到 literature 体系**方案(方案 B,治本):

1. **上传时同步建 literature 记录**:在现有上传流程的异步解析块中,文本提取成功后,在 `literature` 表插入一条对应记录,字段从 uploaded_papers 映射(title/abstract/pdf_url/source='upload' 等),填不了的(authors/doi/journal)用合理默认值。
2. **建立反向关联**:`uploaded_papers` 加 `literature_id` 字段(可空,指向新建的 literature 记录),让任意代码能从 paper 反查其 literature 身份。
3. **历史数据迁移**:给现有 6 篇真实论文补建 literature 记录(数据量小,一次性脚本)。
4. **不改动现有 literature 消费方**(阅读列表/笔记等 API/页面)——它们已经接 literature,统一后自动支持上传论文,无需改动。

**为何不做"加 paper_id"方案(方案 A)**:那只让阅读列表支持上传论文,笔记/分类/标签仍割裂;断层仍在,治标不治本。方案 B 一处改,全系统打通。

## Relevant Files

**修改文件:**
- `src/db/schema.ts` — `uploaded_papers` 加 `literature_id` 字段(integer, 可空, references literature.id)
- `src/app/api/papers/upload/route.ts` — 异步解析块中,文本提取+chunking 成功后,同步插入 literature 记录并回填 uploaded_papers.literature_id
- `src/app/api/reading-lists/[id]/items/route.ts`(可选验证)— 确认加入"上传论文"链路通畅(预期无需改)

**新建文件:**
- `scripts/migrate-papers-to-literature.ts` — 给现有 6 篇论文补建 literature 记录的迁移脚本(幂等,可重复运行)

**参考(只读,不改):**
- `src/db/schema.ts` 的 `literature` 表定义(16 字段,建记录时填映射)
- 现有 `reading-lists`、`literature_notes` 等 API/页面 — 已接 literature,统一后自动支持

**忽略:**
- 前端页面改动(本期不做)——先把数据模型打通,UI 层(如在 paper 详情页加"加入阅读列表"按钮)作为后续独立 feature

## Implementation Plan

### Phase 1: Foundation — 数据模型与迁移基建

加 `literature_id` 字段 + 迁移现有数据。这一步后,6 篇真实论文都有 literature 身份。

### Phase 2: Core — 上传流程集成

让新上传的论文自动获得 literature 身份。这一步后,上传流程完整打通。

### Phase 3: Integration — 验证全系统受益

确认阅读列表能加入上传论文(端到端),证明"一处改全系统受益"成立。

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Task 1: uploaded_papers 加 literature_id 字段(Foundation)

**User Story**: As a developer, I need a link from uploaded_papers to literature so the two systems can reference each other.

- 在 `schema.ts` 的 `uploadedPapers` 加字段:
  ```ts
  literature_id: integer('literature_id').references(() => literature.id),
  ```
  (可空:迁移前/上传失败的论文没有;references literature.id)
- 应用到 DB(直接 SQL 建/改,或 drizzle push)

**Acceptance Criteria**:
- [ ] `uploaded_papers` 表新增 `literature_id` 列(可空)
- [ ] 现有 6 篇论文的 literature_id 暂为 NULL(待 Task 2 填充)
- [ ] `npm run typecheck` 通过

### Task 2: 迁移脚本 — 给 6 篇现有论文补建 literature 记录(Foundation)

**User Story**: As a developer, I need existing papers linked to literature so they get full management capabilities.

- 新建 `scripts/migrate-papers-to-literature.ts`
- 逻辑:
  - 查询所有 `literature_id IS NULL` 的 uploaded_papers
  - 对每篇,在 literature 表插入记录,字段映射:
    - `title` ← paper.title
    - `authors` ← '[]'(JSON 空数组,unknown authors)
    - `abstract` ← paper.abstract(若有)或 paper.extracted_text 前 500 字
    - `source` ← 'upload'
    - `pdf_url` ← paper.file_name(本地文件标识)
    - `doi`/`journal`/`volume`/`issue`/`pages` ← NULL
    - `citation_count` ← 0
  - 回填 `uploaded_papers.literature_id` = 新建的 literature.id
  - **幂等**:已填的跳过,可重复运行
  - 打印进度

**Acceptance Criteria**:
- [ ] 6 篇现有论文的 literature_id 全部填充
- [ ] literature 表从 2 条 → 8 条(2 原有 + 6 新建)
- [ ] 脚本幂等,二次运行跳过
- [ ] 可在 search-local 之外验证:用 literature_id 查 literature 表能拿到对应论文信息

### Task 3: 上传流程集成 literature 同步(Core)

**User Story**: As a researcher, when I upload a paper, it automatically becomes part of the literature system so I can manage it like any other reference.

- 修改 `src/app/api/papers/upload/route.ts` 的异步解析块:
  - 在 chunking 成功后(现有逻辑之后),插入 literature 记录(字段映射同 Task 2)
  - 回填 uploaded_papers.literature_id
  - **失败不阻断上传**:literature 同步失败时只记日志,不影响 paper 本身(降级:该 paper 无 literature 身份,但仍可正常使用 chunking/搜索)
- 字段映射注意:此时 abstract 已提取(L83),直接用

**Acceptance Criteria**:
- [ ] 新上传的论文自动获得 literature 记录 + literature_id 回填
- [ ] literature 同步失败不影响上传主流程
- [ ] `npm run typecheck && npm run build` 通过

### Task 4: 端到端验证 — 阅读列表加入上传论文(Integration)

**User Story**: As a researcher, I can add an uploaded paper to a reading list, proving the unification works end-to-end.

- 创建一个测试阅读列表
- 把一篇上传论文(通过其 literature_id)加入该列表
- 查询确认 reading_list_items 里有这条记录
- (可选)在前端阅读列表页验证能显示
- 这一步**不改任何代码**,纯验证"一处改全系统受益"

**Acceptance Criteria**:
- [ ] 上传论文能成功加入阅读列表(通过 API)
- [ ] reading_list_items.literature_id 指向上传论文的 literature 记录
- [ ] 阅读列表 API 能正常返回该 item

## Testing Strategy

### Integration Tests
- 端到端:上传 → 自动建 literature → 加入阅读列表 → 查询列表 → item 出现
- 迁移幂等:运行 migrate 脚本两次,第二次跳过

### Edge Cases
- literature 同步失败:上传不中断,paper 仍可用(无 literature 身份)
- 重复上传同标题论文:literature 会建多条(去重不在本期范围)
- literature 表 doi 唯一约束:上传论文无 doi(NULL 不冲突)
- 现有 2 条 literature(联网)与 6 条新建(上传)共存无冲突

## Acceptance Criteria

- [ ] uploaded_papers 新增 literature_id 字段并应用
- [ ] 6 篇现有论文迁移完成(literature_id 全部填充)
- [ ] literature 表 2 → 8 条
- [ ] 新上传自动同步 literature
- [ ] 上传论文能加入阅读列表(端到端验证)
- [ ] literature 同步失败不影响上传主流程
- [ ] `npm run typecheck && npm run lint && npm run build` 通过

## Validation Commands

- `npm run typecheck`
- `npx tsx scripts/migrate-papers-to-literature.ts`(幂等迁移)
- `npm run build`
- 端到端:创建列表 → POST /api/reading-lists/[id]/items → 查询确认
- `npm run dev` → 测试上传新论文,查 literature 表是否自动新增

## Notes

- **范围控制**:本期只做数据模型打通 + 上传集成 + 迁移。**前端 UI**(paper 详情页加"加入阅读列表"按钮、阅读列表页展示上传论文)作为后续独立 feature,不混入本期。
- **不改动 literature 消费方**:阅读列表/笔记/分类/标签的 API 和页面都已接 literature,统一后自动支持上传论文,无需逐个改——这是方案 B 的核心收益。
- **source 字段语义**:用 'upload' 标记来源于上传(区别于 arxiv/pubmed/semantic-scholar),便于未来按来源筛选。
- **迁移成本低**:现有只有 6 篇真实论文,迁移几秒完成。即便未来上千篇,脚本幂等可重复运行。
- **后续想象**:统一后,"跨论文语义搜索""相似文献推荐""统一笔记体系"都成为可能——所有论文(上传+联网)在同一体系下。
