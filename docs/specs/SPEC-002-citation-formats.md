# SPEC-002: 文献引用导出格式规范

**状态**: 已知存在 bug,待修复
**创建日期**: 2026-06-29
**目的**: 定义 5 种引用格式的官方规范,作为导出功能的准确性契约。所有导出输出必须符合本规范,与 Google Scholar 等权威来源一致。

> ⚠️ 引用格式**不可由 AI 编造**,必须严格遵循下方官方规范。当前实现(`export/route.ts` 手写)存在多处偏差,见文末"已知 Bug"。

---

## 数据来源与权威参考

- APA 7th: [Purdue OWL](https://owl.purdue.edu/owl/research_and_citation/apa_style/apa_formatting_and_style_guide/reference_list_author_authors.html)、[APA 官方博客](https://apastyle.apa.org/blog/more-than-20-authors)
- MLA 9th: MLA Handbook (9th ed.)
- Chicago 17th: Chicago Manual of Style (author-date)
- Harvard: 通用 Harvard 风格(对标 Google Scholar 输出)
- Vancouver: [ICMJE Recommendations](https://www.icmje.org/recommendations/)

---

## 通用规则(所有格式)

### DOI 处理(关键)
- DOI 存储时**可能已含** `https://doi.org/` 前缀,也可能只有裸 DOI(如 `10.1126/science.1062538`)
- 输出时**统一格式**为:`https://doi.org/<裸DOI>`
- **必须去重前缀**:禁止 `https://doi.org/https://doi.org/10.xxx`(当前 bug)
- 规范化逻辑:`doi.replace(/^https?:\/\/doi\.org\//i, '')` 取裸 DOI,再统一加前缀

### 作者名解析
- 输入可能是 `"Fabián Pedregosa"`(First Last)或 `"Pedregosa, Fabián"`(Last, First)
- 需识别复合姓氏前缀:van, von, de, der, di, da, le, la, del, della, des, du, bin, al
- 忽略 "et al." 等占位

### 标题大小写
- APA/MLA/Chicago/Harvard 期刊文章标题用 **sentence case**(仅首字母大写 + 专有名词)
- 专有名词应保留大写:BERT、Transformer、Python、IEEE、DNA 等
- **不能把连字符后的词错误合并**(如 "Clinical resistance" 不能变成 "Clinicalresistance")

---

## 各格式详细规范

### APA 7th Edition

**模板**:
```
Author, A. A., Author, B. B., & Author, C. C. (Year). Title of article. Journal Name, volume(issue), pages. https://doi.org/xxx
```

**作者规则**:
- 姓在前 + 名缩写:`Pedregosa, F.`
- 2 位作者:`A., & B.`(& 前有逗号)
- 3-20 位作者:全部列出,逗号分隔,最后一位前用 `&`
- 21+ 作者:前 19 位 + `...` + 最后一位

**正确示例**:
```
Gorre, M., Mohammed, M., Ellwood, K., Hsu, N. C., Paquette, R., Rao, P. N., & Sawyers, C. L. (2001). Clinical resistance to STI-571 cancer therapy caused by BCR-ABL gene mutation or amplification. Science, 293(5531), 876-880. https://doi.org/10.1126/science.1062538
```

---

### MLA 9th Edition

**模板**:
```
Author Last, First, et al. "Article Title." Journal Name, vol. volume, no. issue, Year, pp. pages.
```

**作者规则**:
- 1-2 位作者:全列(第二位用 `First Last` 原序)
- **3+ 位作者:第一位 + `, et al.`
- 标题用双引号包裹

**正确示例**:
```
Gorre, M., et al. "Clinical Resistance to STI-571 Cancer Therapy Caused by BCR-ABL Gene Mutation or Amplification." Science, vol. 293, no. 5531, 2001, pp. 876-880.
```

---

### Chicago 17th (Author-Date)

**模板**:
```
Author Last, First, Second Author First Last, and Third Author First Last. Year. "Article Title." Journal Name volume, no. issue: pages.
```

**作者规则**(关键):
- **第一位作者**:`Last, First` 格式(反序)
- **后续作者**:`First Last` 格式(正序)← 当前 bug:错误地全部用反序
- 2 位:`Last, First, and First Last`
- 3 位:`Last, First, First Last, and First Last`
- 4-10 位:全列,最后一位前 `and`
- 10+ 位:第一位 + `et al.`

**正确示例**:
```
Gorre, M., Mansoor Mohammed, Katharine Ellwood, and Charles L. Sawyers. 2001. "Clinical Resistance to STI-571 Cancer Therapy." Science 293, no. 5531: 876-880.
```

---

### Harvard(对标 Google Scholar)

**模板**:
```
Author, A.A. and Author, B.B., Year. Title of article. Journal Name, volume, pp.pages.
```

**作者规则**:
- 姓在前 + 名缩写:`Pedregosa, F.`
- 最后一位作者前用 `and`(非 `&`)
- 标题用**单引号**包裹
- 单页 `p.`,页码范围 `pp.`

**正确示例**:
```
Gorre, M., Mohammed, M., Ellwood, K., Hsu, N.C., Paquette, R., Rao, P.N. and Sawyers, C.L., 2001. Clinical resistance to STI-571 cancer therapy caused by BCR-ABL gene mutation or amplification. Science, 293, pp.876-880.
```

---

### Vancouver(ICMJE)

**模板**:
```
Author AA, Author BB, Author CC. Title of article. Journal Name. Year Mon DD;volume(issue):pages.
```

**作者规则**:
- 姓 + 名缩写(无句点):`Pedregosa F`
- 前 6 位作者列出,7+ 用 `, et al.`
- 期刊名用**标准缩写**(如 N Engl J Med)
- 日期格式:`Year Mon` 或 `Year Mon DD`(如 `2001 Aug`)

**正确示例**:
```
Gorre M, Mohammed M, Ellwood K, Hsu NC, Paquette R, Rao PN, et al. Clinical resistance to STI-571 cancer therapy caused by BCR-ABL gene mutation or amplification. Science. 2001 Aug;293(5531):876-880.
```

---

## 元数据补全策略

当数据库缺少 volume/issue/pages 时,应通过 **DOI 查询 Crossref API** 补全(而非留空):
- 端点:`https://api.crossref.org/works/{doi}`
- 提取:volume、issue、page、container-title、published-date
- 项目已有实现:`src/lib/doi/fetch-metadata.ts`(`fetchDOIMetadata`/`extractPages`)

---

## 已知 Bug(2026-06-29 实测发现)

测试文献 ID 2(Gorre et al., Science 2001),对照规范发现:

| # | 格式 | Bug | 根因位置 |
|---|------|-----|---------|
| 1 | 全部 | **DOI 双重前缀**:`https://doi.org/https://doi.org/10.xxx` | `export/route.ts:170` 直接拼接,未去重 |
| 2 | APA/MLA/Chicago/Harvard | **标题连字符合并**:`Clinicalresistance` 应为 `Clinical resistance` | `toSentenceCase` 按空格分割丢失连字符 |
| 3 | Chicago | **作者名顺序错**:后续作者应 `First Last`,实际 `Last, First` | `export/route.ts` 的 `generateChicago` 用 `formatAuthors` 全反序 |
| 4 | MLA | **双句号**:`et al..` | 拼接逻辑多余句点 |
| 5 | 全部 | **缺 volume/issue/pages**:数据库无存,未从 DOI 补全 | `export/route.ts` 不调 Crossref |
| 6 | Chicago | **第三位作者缺 "and"**:`X, Y, Z.` 应为 `X, Y, and Z.` | `generateChicago` 分支逻辑 |

## 修复优先级

1. **P0(必修)**:DOI 双重前缀(导致链接失效)、Chicago 作者顺序、标题连字符
2. **P1**:MLA 双句号、从 DOI 补全元数据
3. **P2**:统一架构(当前 4 套引用实现散落,长期应合并)

---

## 架构问题(技术债)

当前引用格式化散落在 **4 个文件**,互相重复:
- `src/app/api/literature/[id]/export/route.ts`(内联手写,用户实际导出走这)
- `src/lib/citation-formats.ts`(手写 bibtex/ris/endnote)
- `src/lib/citation/format-citation-js.ts`(文件名 citation-js 但实际手写,批量导出用)
- `src/lib/citation/format.ts`(test 页面用)

**长期方向**:合并为单一 `src/lib/citation/` 模块,统一格式化逻辑。本次先修 export route 的 bug(用户实际路径)。
