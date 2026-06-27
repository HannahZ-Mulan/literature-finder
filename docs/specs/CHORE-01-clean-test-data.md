# Chore: 清理测试数据

## Chore Description

清理 literature-finder 本地数据库(`sqlite.db`)中的测试垃圾数据。深度审计发现 **42 篇 uploaded_papers 中有 30 篇(71%)是测试残留或失败上传**,严重污染语义搜索索引与库质量。本 chore 删除确凿的测试数据 + 重复论文去重,保留 12 篇真实论文。

## Relevant Files

**操作对象(本地 DB,不进 git):**
- `sqlite.db` — 直接 DELETE 操作
  - `uploaded_papers` — 删除 30 篇测试/失败论文
  - `paper_chunks` — 级联删除(cascade)对应 chunks
  - `chunk_embeddings` — 级联删除对应 embeddings
  - `immersive_readings` 列(JSON 缓存)随 uploaded_papers 行删除而清除

**备份(本 chore 创建):**
- `sqlite.db.backup-{timestamp}` — 操作前完整副本,供回滚

**忽略:**
- `uploads/` 目录的 PDF 文件 — 物理文件不删(只是 DB 记录清理),避免误删;PDF 留作存档

## 清理判定标准(严格)

### 确凿删除(30 篇)— 满足任一:

1. **测试标题**:`title` 命正则 `^(GT4|cynisim|cynisim zh|Test|test|Final Test|Test PDF|Test PDF Upload|regression test|Cynicism Test|Cynicism Test PDF|Untitled)$`
2. **空壳上传**:`paper_chunks` 计数 = 0 且 `extracted_text` 长度 = 0(上传失败/中断残留)
3. **极少内容**:`paper_chunks` ≤ 1 且 `extracted_text` 长度 < 2000(提取失败残留)

### 去重保留(每组保留 id 最小者):

删除重复组中较晚创建的副本(id 较大),每组仅保留最早一篇:
- `GratefulWorkplace2016` ×5 → 保留 #5,删 #6,7,8,9
- `HuiEtalProsocialWellbeingSystematicReview` ×2 → 保留 #37,删 #41
- `90后实习护生` ×2 → 保留 #27,删 #34
- `HarumiBefuSocialExchange` ×2 → 保留 #26,删 #38(注:两者 chunks 都极少,但属真实论文,保留较早的)
- `Contentandthematic analysis` ×7 → 仅 #28 有真实内容(chunks 多),其余 6 篇空壳已在"确凿删除"中处理

### 明确保留(真实论文,约 11 篇):
`#5` GratefulWorkplace、`#22` Cialdini、`#26` HarumiBefu(去重后)、`#27` 90后护生(去重后)、`#28` qualitative content analysis、`#29` ZhangEtAl Nature Medicine、`#37` HuiEtal(去重后)

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: 备份 sqlite.db(可回滚前提)

- 复制 `sqlite.db` → `sqlite.db.backup-{YYYYMMDD-HHMM}`
- 验证备份文件大小与原文件一致
- 记录备份路径,供回滚使用

**验收: 备份文件存在且大小 = 原文件**

### Step 2: 执行删除脚本(DRY-RUN 预览)

- 写清理脚本,但**先以 DRY-RUN 模式运行**:只打印将要删除的 id 列表、数量、关联 chunks/embeddings 数,**不执行 DELETE**
- 人工核对 DRY-RUN 输出与本规划的"确凿删除"清单一致
- 确认无误后,加 `--execute` 参数真正执行

**验收: DRY-RUN 输出的删除清单与规划一致,无误删真实论文**

### Step 3: 执行真实 DELETE

- 按判定标准删除 `uploaded_papers` 中的测试/失败/重复论文
- 确认 `paper_chunks` 和 `chunk_embeddings` 通过外键 cascade 自动清理(`ON DELETE CASCADE` 已在 schema 定义)
- 验证残留:删除后再次审计,确认无遗漏测试数据

**验收: uploaded_papers 从 42 → 约 11;无 chunks 孤儿;无 embeddings 孤儿**

### Step 4: 重新触发语义搜索索引重建(可选但推荐)

- 清理改变了 chunk 集合,虽然内存索引在进程重启时会从 `chunk_embeddings` 重新加载(已自动清理),但为保险起见,重启 dev server 确保索引一致
- 或运行一次 `search/chunks` 触发 `ensureIndexLoaded` 重建

**验收: /search-local 搜索功能正常,只返回保留论文的结果**

## Validation Commands

- DRY-RUN: `npx tsx scripts/clean-test-data.ts`(只打印,不执行)
- 执行: `npx tsx scripts/clean-test-data.ts --execute`
- 删除后审计: `npx tsx scripts/clean-test-data.ts --audit`
- 回滚(如需): `cp sqlite.db.backup-{timestamp} sqlite.db`
- 功能验证: `npm run dev` → /search-local 搜索测试

## Notes

- **破坏性但可回滚**:sqlite.db 有时间戳备份,任何问题用 `cp` 覆盖即可恢复。
- **sqlite.db 不进 git**(被 .gitignore),所以清理不产生 commit、不影响远程。纯本地维护。
- **不删 uploads/ PDF**:只清 DB 记录,物理文件留存,避免误删。如需清理磁盘可后续单独处理。
- **去重策略保守**:每组只保留最早 id,宁可少删不误删。HarumiBefu 两组内容极少但属真实论文,保留较早者。
- **GT4 #36 特殊**:`cynisim zh` 标题但有 132 chunks/655KB 文本——判为测试(标题命中测试词),删除。
