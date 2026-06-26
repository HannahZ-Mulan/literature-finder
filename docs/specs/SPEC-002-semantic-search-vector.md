# Feature: 语义搜索升级 — 向量检索

## Feature Description

将 literature-finder 的文献搜索从「关键词字面匹配」升级为「语义向量检索 + 关键词融合检索」,让科研用户能用自然语言提问(如"做善事会不会让人更快乐")精准找到相关文献段落,而不必猜测论文里的精确措辞。

## User Story

**As a** 科研人员
**I want** 用自然语言描述我想找的内容,就能搜到语义相关的文献段落,即使我用的词和论文原文完全不同
**So that** 找文献不再受限于"必须猜对关键词",能像问真人同事一样提问。

## Problem Statement

当前 `src/app/api/search/chunks/route.ts` 实现的是**纯关键词字面匹配**(`src/lib/search/keyword-extractor.ts` 的 `calculateRelevanceScore` 基于 `chunkLower.includes(term)` 子串匹配)。这有两个硬伤:

1. **语义盲区**:搜 "做善事会不会让人更快乐" 完全搜不到讨论 "prosocial behavior and wellbeing" 的论文——词面无任何重叠,`relevanceScore` 必为 0 被过滤。
2. **代码原作者已预见此短板**:`search/chunks/route.ts` 第 58-60 行注释明确写着 TODO「Vector embeddings (for semantic search)」。本 SPEC 正是补全这条既定路线。

**数据基础已就位,成本极低**:
- 已有 `paper_chunks` 表,**195 个分块**(42 篇论文,按章节切分:abstract/introduction/methods/results/discussion/conclusion 等)
- 已有智谱 `ZHIPU_API_KEY` 配置(`src/lib/glm/client.ts` 已封装鉴权)
- 195 个 chunk 的 embedding 是**一次性、< 0.1 元、几秒内完成**的批量计算
- 195 个向量(< 1MB)可**全量驻留内存**,余弦相似度计算微秒级,**无需引入向量数据库**

## Solution Statement

采用**混合检索(Hybrid Search)**——这是当前主流做法,也是改造量最小、效果最稳的方案:

1. **新增向量召回**:每个 chunk 预计算 embedding(智谱 `embedding-3`,1024 维),全量驻留进程内存;搜索时对用户 query 算 embedding,与全部 chunk 向量做余弦相似度,top-N 召回。
2. **保留关键词召回**:现有 `calculateRelevanceScore` 逻辑完全保留,作为另一路召回。
3. **融合排序(RRF)**:用 Reciprocal Rank Fusion 算法合并两路结果——不依赖分数绝对值(向量分与关键词分量纲不同),只看各自排名,鲁棒性强。
4. **不引入新数据库依赖**:向量存内存(Map 结构),chunk→vector 映射在进程启动时从 DB 重建;为避免每次重启重算,向量持久化到一张新表 `chunk_embeddings`(可选,Task 4)。

**技术选型依据(基于真实调研)**:
- **智谱 embedding-3 而非 DeepSeek**:DeepSeek 主推 chat,embedding 接口受限;智谱 `embedding-3` 接口成熟、1024 维、中英文双优,且 `ZHIPU_API_KEY` 已配置、`glm/client.ts` 的鉴权/请求范式可直接复用。
- **内存索引而非 sqlite-vec**:195 chunk × 1024 维 ≈ 800KB,全量余弦比对微秒级。即便未来增长到 5000 chunk 仍轻松(< 20MB,几十毫秒)。只有突破约 10 万 chunk 才需要向量数据库——远超个人文献库规模。

## Relevant Files

**新建文件:**
- `src/lib/ai/embeddings.ts` — 智谱 embedding 客户端(复用 `glm/client.ts` 范式)
- `src/lib/search/vector-index.ts` — 内存向量索引(加载、相似度计算、增删)
- `src/lib/search/hybrid-search.ts` — 混合检索融合(RRF 算法)
- `scripts/backfill-embeddings.ts` — 给现有 195 chunk 补算 embedding 的迁移脚本
- `src/app/api/search/semantic/route.ts`(可选)— 纯语义检索端点(调试/对比用)

**修改文件:**
- `src/app/api/search/chunks/route.ts` — POST 升级为混合检索(调用 hybrid-search)
- `src/db/schema.ts` — 新增 `chunk_embeddings` 表(持久化向量,防重启重算)
- `src/app/search/page.tsx` — 搜索框提示词升级,鼓励自然语言提问
- `src/lib/chunker/chunk-storage.ts` — 新建 chunk 时同步算 embedding(增量,防新论文无向量)

**参考(只读):**
- `src/lib/glm/client.ts` — 复用其 fetch 鉴权范式(`open.bigmodel.cn/api/paas/v4`,Bearer token)
- `src/lib/search/keyword-extractor.ts` — 关键词路召回完全保留,不改动
- `src/app/api/search/chunks/route.ts` L58-60 — 原作者已标注的语义检索 TODO

**忽略:**
- `src/lib/ai/deepseek.ts` / `ollama.ts` — 本期不接,保持单一 embedding provider(智谱),降低复杂度

## Implementation Plan

### Phase 1: Foundation — embedding 与向量索引基建

建立 embedding 服务层和内存索引。这一步完成后,系统具备"算向量 + 比相似度"的能力,但尚未接入搜索流程。

### Phase 2: Core — 混合检索与数据回填

回填现有 195 chunk 的向量,把 search/chunks 升级为混合检索。这一步完成后,搜索功能即具备语义能力。

### Phase 3: Integration — UI 与增量维护

搜索框提示升级、新建 chunk 自动算向量,确保系统长期可用。

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Task 1: embedding 服务层(Foundation)

**User Story**: As a developer, I need a reusable embedding client so I can convert text to vectors using Zhipu's embedding-3 model.

- 新建 `src/lib/ai/embeddings.ts`
- 复用 `glm/client.ts` 的鉴权模式:`process.env.ZHIPU_API_KEY`、baseURL `https://open.bigmodel.cn/api/paas/v4/embeddings`
- 实现 `generateEmbedding(text: string): Promise<number[]>` — 单文本
- 实现 `generateEmbeddings(texts: string[]): Promise<number[][]>` — 批量(智谱 embedding-3 支持批量,减少 API 调用)
- 模型用 `embedding-3`(1024 维)
- 错误处理:无 API key 或请求失败时抛明确错误(不静默回退——embedding 是搜索基础,失败应可见)
- 参考 `glm/client.ts` 的 fetch 写法、JSON 解析、usage 记录

**Acceptance Criteria**:
- [ ] `embeddings.ts` 导出 `generateEmbedding` 和 `generateEmbeddings`
- [ ] 调用智谱 embedding-3 返回 1024 维向量
- [ ] 无 ZHIPU_API_KEY 时抛出清晰错误(非静默 mock)
- [ ] `npm run typecheck` 通过

### Task 2: 内存向量索引(Foundation)

**User Story**: As a developer, I need an in-memory vector index so I can store chunk embeddings and compute cosine similarity at search time without a vector database.

- 新建 `src/lib/search/vector-index.ts`
- 用 `Map<number, number[]>` 存 chunkId → embedding(进程单例)
- 实现 `addVector(chunkId, embedding)` / `addVectors(entries)` / `removeVector(chunkId)`
- 实现 `search(queryEmbedding, topK): Array<{chunkId, score}>` — 全量余弦相似度,top-K 返回
- 余弦相似度:点积 / (‖a‖ × ‖b‖),归一化后可优化为纯点积(但首版用标准公式求稳)
- 实现 `size()` 返回已索引数量(供健康检查)
- **不引入外部依赖**:纯 TypeScript 实现,维度动态(不强编码 1024)

**Acceptance Criteria**:
- [ ] `vector-index.ts` 导出单例 index 实例
- [ ] addVector/search/removeVector 工作正常
- [ ] 195 个向量的 search 在 < 5ms 内完成(单元验证)
- [ ] `npm run typecheck` 通过

### Task 3: 持久化层与回填脚本(Core)

**User Story**: As a developer, I need chunk embeddings persisted and backfilled, so the index survives restarts and existing 195 chunks get vectors.

- 在 `src/db/schema.ts` 新增 `chunk_embeddings` 表:
  - `chunk_id` (integer, PK, 引用 paper_chunks.id)
  - `embedding` (text, JSON 编码的 1024 维数组)
  - `model` (text, 如 'embedding-3',便于未来换模型时识别需重算的行)
  - `created_at` (timestamp)
- 新建 `scripts/backfill-embeddings.ts`:
  - 查询所有 `paper_chunks`,找出无 embedding 的
  - 批量调用 `generateEmbeddings`(每批 16-32 条,避免单请求过大)
  - 写入 `chunk_embeddings`
  - 支持断点续传(已存在的跳过),可安全重复执行
  - 打印进度与 token 用量
- 进程启动时(或首次搜索时)从 `chunk_embeddings` 加载全量到 vector-index 内存

**Acceptance Criteria**:
- [ ] `chunk_embeddings` 表 schema 定义并通过 `npm run db:generate`
- [ ] 回填脚本执行后,195 个 chunk 全部有 embedding
- [ ] 脚本可重复执行(幂等),第二次跳过已存在的
- [ ] 进程重启后,内存索引从 DB 正确重建

### Task 4: 混合检索融合(Core)

**User Story**: As a researcher, I want search to combine semantic and keyword matching, so I get results that match both meaning and exact terms.

- 新建 `src/lib/search/hybrid-search.ts`
- 实现 Reciprocal Rank Fusion:
  ```
  RRFScore(d) = Σ over rankings: 1 / (k + rank_i(d))   // k 通常取 60
  ```
- 接口:`hybridSearch(query, options): Promise<SearchResult[]>`
  - 路径 A:现有 `calculateRelevanceScore` 关键词召回 top-50
  - 路径 B:`vector-index.search(queryEmbedding, 50)` 向量召回
  - 两路各自按分数排序取 rank,RRF 融合
  - 融合后按 RRF 分排序,取 limit 条
  - 保留 `SearchResult` 类型兼容(含 matchedKeywords、highlight)
- 边界处理:
  - 内存索引为空(尚未回填)时,**降级为纯关键词检索**(不阻断搜索)
  - query embedding 失败时,同上降级 + 记录警告

**Acceptance Criteria**:
- [ ] `hybrid-search.ts` 正确融合两路结果
- [ ] 索引为空或 embedding 失败时优雅降级到关键词检索(搜索不报错)
- [ ] 向量路能召回关键词路漏掉的语义相关 chunk(对比验证)
- [ ] `npm run typecheck` 通过

### Task 5: 接入 search/chunks 路由(Core)

**User Story**: As a researcher, when I search, the API now uses hybrid retrieval so I find semantically relevant passages.

- 修改 `src/app/api/search/chunks/route.ts` 的 POST:
  - 将原"全量取 → 内存打分"替换为调用 `hybridSearch`
  - 保留入参契约(query/paperId/chunkTypes/limit)不变,前端无需改动
  - 返回体增加可选字段 `matchType: 'hybrid' | 'keyword-only'`(告知前端当前模式,便于 UI 提示)
  - 响应里保留现有字段(results/totalResults/query/queryTerms),新增向量命中信息可选
- **GET 自动补全保持不变**(它走的是前缀匹配,不涉及语义)

**Acceptance Criteria**:
- [ ] POST /api/search/chunks 返回混合检索结果
- [ ] 入参/出参契约向后兼容(前端零改动可用)
- [ ] 自然语言 query(如"做善事让人快乐")能返回语义相关 chunk(此前必返空)
- [ ] `npm run typecheck && npm run lint` 通过

### Task 6: 增量维护与 UI 提示(Integration)

**User Story**: As a researcher, new papers I upload also become searchable semantically, and I'm nudged to ask questions in natural language.

- 修改 `src/lib/chunker/chunk-storage.ts`:
  - 新建 chunk 写入 DB 后,异步调用 `generateEmbedding` 并写入 `chunk_embeddings` + 更新内存索引
  - embedding 计算失败时不阻断上传流程(降级为无向量,该 chunk 仍可关键词检索)
- 修改 `src/app/search/page.tsx`:
  - 搜索框 placeholder 改为鼓励自然语言(如"用自然语言描述你想找的内容…")
  - 结果区可选显示 `matchType` 标识(语义/关键词)
- 文档:在搜索页加一行简短说明"支持语义搜索,可直接提问"

**Acceptance Criteria**:
- [ ] 新上传论文的 chunk 自动获得 embedding 并可被语义检索
- [ ] embedding 计算失败不影响上传流程
- [ ] 搜索框提示词引导自然语言提问
- [ ] `npm run build` 通过

## Testing Strategy

### Unit Tests
- 本项目无单测框架,以脚本验证替代:
  - `vector-index` 的 add/search 在 195 向量下 < 5ms(写进 backfill 脚本的健康检查)
  - RRF 融合结果排序正确性(手工构造两路 ranking 验证)

### Integration Tests
- 端到端搜索对比:用同一自然语言 query,对比改造前后 `/api/search/chunks` 结果(改造前返空、改造后命中)

### Edge Cases
- 内存索引为空(首次部署未回填)→ 降级关键词检索
- query embedding API 失败/超时 → 降级关键词检索
- chunk 文本为空或极短 → embedding 可能质量低,回填脚本跳过
- 新模型未来替换 embedding-3 → 用 `chunk_embeddings.model` 字段识别并支持重算
- 中英文混合 query → embedding-3 双语支持,验证召回效果

## Acceptance Criteria

- [ ] 现有 195 chunk 全部有 embedding(回填完成)
- [ ] 自然语言 query 能搜到语义相关文献(改造前搜不到的现在能搜到)
- [ ] 混合检索延迟 < 200ms(含 embedding API 调用 + 本地融合)
- [ ] 索引为空或 API 失败时优雅降级,搜索不中断
- [ ] 新上传论文自动获得 embedding
- [ ] 现有关键词检索能力不退化(精确词仍能命中)
- [ ] `npm run typecheck && npm run lint && npm run build` 全部通过

## Validation Commands

- `npm run typecheck` — 类型检查
- `npm run lint` — lint 检查
- `npm run db:generate` — 生成 `chunk_embeddings` 表迁移
- `npx tsx scripts/backfill-embeddings.ts` — 执行向量回填(幂等)
- `npm run build` — 生产构建
- `npm run dev` → POST `/api/search/chunks` 用自然语言 query 测试(对比改造前后)

## Notes

- **技术选型已锁死**:智谱 embedding-3(1024 维)+ 内存索引 + RRF 融合。不在本期引入 sqlite-vec 或外部向量数据库——195 chunk 规模完全不需要。
- **降级是关键韧性设计**:任何 embedding 相关失败(无 key、API 错、索引空)都必须降级到现有关键词检索,**绝不让搜索功能不可用**。Task 4/5/6 都包含此降级逻辑。
- **不碰 immersive-read**:那是并行工作流的领域,本期搜索升级与之无交集。
- **token 成本**:回填 195 chunk 约几千 token,< 0.1 元;后续每次搜索 1 次 query embedding(几百 token),单次约 ¥0.001,可忽略。
- **未来扩展**:此架构天然支持"跨论文语义关联""相似文献推荐""智能问答检索增强(RAG)"——都是后续 feature,本期只做搜索本身。
