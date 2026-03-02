# 学术文献引用格式问题记录

## 问题描述
当前导出的引用格式与 Google Scholar 导出的格式存在多处不一致。

## 测试用例
**文献ID**: 16
**标题**: "The Gift That Keeps on Giving: Generosity is Contagious in Multiplayer Online Games"
**作者**: Alexander J. Bisberg, Julie Jiang, Yilei Zeng, Emily Chen, Emilio Ferrara
**期刊**: PACM on Human-Computer Interaction 6, CSCW2, Article 395 (November 2022)
**DOI**: 10.1145/3555120
**实际页码**: 1-22

## 当前输出 vs Google Scholar 对比

### APA 格式
**当前输出**:
```
Bisberg, A. J., Jiang, J., Zeng, Y., Chen, E., & Ferrara, E. (2022). The Gift That Keeps on Giving: Generosity is Contagious in Multiplayer Online Games. Proceedings of the ACM on Human-Computer Interaction, 6(CSCW2). https://doi.org/10.1145/3555120
```

**Google Scholar**:
```
Bisberg, A. J., Jiang, J., Zeng, Y., Chen, E., & Ferrara, E. (2022). The gift that keeps on giving: Generosity is contagious in multiplayer online games. Proceedings of the ACM on human-computer interaction, 6(CSCW2), 1-22.
```

**差异**:
- ❌ 标题大小写：当前是 Title Case，应该是 Sentence Case
- ❌ 期刊名大小写：当前每个单词首字母大写，应该是 sentence case
- ❌ 缺少页码：当前无页码，应该有 "1-22"

### Chicago 格式
**当前输出**:
```
Bisberg, A. J., Jiang, J., Zeng, Y., Chen, E., & Ferrara, E. (2022). The Gift That Keeps on Giving: Generosity is Contagious in Multiplayer Online Games. Proceedings of the ACM on Human-Computer Interaction, 6(CSCW2). https://doi.org/10.1145/3555120
```

**Google Scholar**:
```
Bisberg, Alexander J., Julie Jiang, Yilei Zeng, Emily Chen, and Emilio Ferrara. "The gift that keeps on giving: Generosity is contagious in multiplayer online games." Proceedings of the ACM on human-computer interaction 6, no. CSCW2 (2022): 1-22.
```

**差异**:
- ❌ 作者名：当前用首字母缩写 (A. J.)，应该用完整名字 (Alexander J.)
- ❌ 标题应该在引号内
- ❌ "no." 标记：当前缺少 "no. CSCW2"
- ❌ 年份位置：应该在期号后面的括号中 "(2022)"
- ❌ 页码：应该有 ": 1-22"
- ❌ 期刊名大小写：应该是 sentence case

### Harvard 格式
**当前输出**:
```
Bisberg, A. J., Jiang, J., Zeng, Y., Chen, E., & Ferrara, E. (2022). The Gift That Keeps on Giving: Generosity is Contagious in Multiplayer Online Games. Proceedings of the ACM on Human-Computer Interaction, 6(CSCW2). https://doi.org/10.1145/3555120
```

**Google Scholar**:
```
Bisberg, A.J., Jiang, J., Zeng, Y., Chen, E. and Ferrara, E., 2022. The gift that keeps on giving: Generosity is contagious in multiplayer online games. Proceedings of the ACM on human-computer interaction, 6(CSCW2), pp.1-22.
```

**差异**:
- ❌ 最后一个作者前应该用 "and" 不是 "&"
- ❌ 年份应该在作者后面，不加括号
- ❌ 标题应该在单引号内
- ❌ 页码前应该有 "pp."
- ❌ 期刊名大小写：应该是 sentence case

### MLA 格式
**当前输出**:
```
Bisberg, A. J., Jiang, J., Zeng, Y., Chen, E., & Ferrara, E. (2022). The Gift That Keeps on Giving: Generosity is Contagious in Multiplayer Online Games. Proceedings of the ACM on Human-Computer Interaction, 6(CSCW2). https://doi.org/10.1145/3555120
```

**Google Scholar**:
```
Bisberg, Alexander J., et al. "The gift that keeps on giving: Generosity is contagious in multiplayer online games." Proceedings of the ACM on human-computer interaction 6.CSCW2 (2022): 1-22.
```

**差异**:
- ❌ 作者名：应该用完整名字，不是首字母缩写
- ❌ 3个以上作者：应该用 "et al." 不是列出所有作者
- ❌ 标题应该在引号内
- ❌ 卷期格式：应该是 "6.CSCW2" 不是 "6(CSCW2)"
- ❌ 年份位置：应该在期号后面 "(2022)"
- ❌ 页码：应该有 ": 1-22"
- ❌ 期刊名大小写：应该是 sentence case

### Vancouver 格式
**当前输出**:
```
1.  Bisberg AJ, Jiang J, Zeng Y, Chen E, Ferrara E. The Gift That Keeps on Giving: Generosity is Contagious in Multiplayer Online Games. Proceedings of the ACM on Human-Computer Interaction. 2022 Jul 22;6(CSCW2).
```

**Google Scholar**:
```
Bisberg AJ, Jiang J, Zeng Y, Chen E, Ferrara E. The gift that keeps on giving: Generosity is contagious in multiplayer online games. Proceedings of the ACM on human-computer interaction. 2022 Nov 11;6(CSCW2):1-22.
```

**差异**:
- ❌ 序号：当前有 "1."，Google Scholar 没有
- ❌ 标题大小写：应该是 sentence case
- ❌ 期刊名大小写：应该是 sentence case
- ❌ 日期格式：应该是 "2022 Nov 11" 不是 "2022 Jul 22"
- ❌ 页码：应该有 ":1-22"

## 根本原因分析

### 1. 数据问题
- **页码缺失**: 数据库中没有存储页码信息（原始数据从 arXiv/semantic scholar 获取时没有包含）
- **期刊字段混乱**: journal 字段包含了所有信息（期刊名、卷、期、文章号、日期），而不是分开存储

### 2. citation-js 配置问题
- citation-js 的 CSL 样式模板可能与 Google Scholar 使用的模板不完全一致
- 需要检查是否使用了正确的 CSL 样式名称
- 可能需要自定义 CSL 样式

### 3. 大小写处理
- 标题和期刊名需要转换为 sentence case
- 当前已经添加了转换函数，但可能还不够完善

## 已完成的改进

1. ✅ 安装了 citation-js 库
2. ✅ 创建了 format-citation-js.ts 模块
3. ✅ 添加了期刊字段智能解析
4. ✅ 添加了期刊名缩写映射
5. ✅ 添加了 sentence case 转换函数
6. ✅ 更新了导出 API 使用 citation-js

## 待解决的问题

1. ❌ **页码**: 数据库中没有页码，需要从 DOI 或其他来源获取
2. ❌ **citation-js 样式**: 可能需要使用不同的 CSL 样式或自定义样式
3. ❌ **作者名格式**: Chicago/MLA 需要完整名字，当前是首字母缩写
4. ❌ **Harvard 连接词**: 最后一个作者前应该是 "and" 不是 "&"
5. ❌ **日期格式**: Vancouver 格式的日期可能不正确

## 下一步行动

### 选项 1: 使用 Google Scholar API
考虑使用 Google Scholar API 直接获取格式化的引用，确保 100% 准确。

### 选项 2: 自定义 CSL 样式
创建自定义的 CSL 样式文件，完全匹配 Google Scholar 的格式。

### 选项 3: 后处理 citation-js 输出
使用 citation-js 生成引用后，进行字符串级别的后处理，修复特定格式问题。

### 选项 4: 数据增强
在保存文献时，从 DOI 解析获取完整的元数据（包括页码）。

## 测试数据

```json
{
  "id": 16,
  "title": "The Gift That Keeps on Giving: Generosity is Contagious in Multiplayer Online Games",
  "authors": [
    {"name": "Alexander J. Bisberg"},
    {"name": "Julie Jiang"},
    {"name": "Yilei Zeng"},
    {"name": "Emily Chen"},
    {"name": "Emilio Ferrara"}
  ],
  "journal": "PACM on Human-Computer Interaction 6, CSCW2, Article 395 (November 2022)",
  "volume": "6",
  "issue": "CSCW2",
  "pages": null,  // 应该是 "1-22"
  "publication_date": "2022-07-21T17:17:22Z",
  "doi": "10.1145/3555120"
}
```

## 参考资料

- Citation.js: https://citation.js.org/
- Citation Style Language: https://citationstyles.org/
- Google Scholar: https://scholar.google.com
