# AI Paper to PPT - 实验性功能

## 🎯 功能概述

**类型**: 实验性功能 (Experimental Feature)
**优先级**: 5（在核心 MVP 功能之后）
**状态**: ✅ 已实现

---

## ✨ 功能说明

用户可以一键将学术论文转换为 5 页的 PPT 演示文稿。

### 📊 PPT 结构（固定 5 页）

1. **Background（研究背景）**
   - 介绍研究领域的背景
   - 说明研究动机

2. **Research Question（研究问题）**
   - 明确的研究目标
   - 要解决的核心问题

3. **Method（方法）**
   - 研究方法概述
   - 实验设计

4. **Findings（发现）**
   - 主要研究结果
   - 关键数据发现

5. **Conclusion（结论）**
   - 研究结论
   - 未来工作展望

---

## 🔧 技术实现

### 前端
- **按钮位置**: 论文详情页顶部
- **样式**: 橙色边框，标识为"实验性功能"
- **交互**: 点击后自动下载 PPTX 文件

### 后端
- **API 端点**: `POST /api/papers/{id}/ppt`
- **依赖库**: pptxgenjs
- **AI 模型**: GPT-4o-mini
- **输出格式**: PPTX 文件（.pptx）

---

## 📝 生成的 PPT 特点

- ✅ 中文内容
- ✅ 简洁明了（每页 3-5 个要点）
- ✅ 专业排版
- ✅ 包含页码
- ✅ 标题页包含论文标题
- ✅ 可直接在 PowerPoint 中编辑

---

## 🎨 UI 设计

### 按钮样式
```tsx
<Button
  variant="outline"
  className="border-orange-200"
>
  <FileOutput className="w-4 h-4 mr-2" />
  生成 PPT
</Button>
```

### 标识
```
⚡ 实验性功能：AI 自动生成 5 页 PPT
```

---

## 💡 使用流程

1. 用户上传论文
2. 打开论文详情页
3. 点击"生成 PPT"按钮
4. 等待 AI 分析（约 10-20 秒）
5. 自动下载 PPTX 文件
6. 在 PowerPoint 中打开和编辑

---

## 🚀 API 详情

### 请求
```http
POST /api/papers/{id}/ppt
```

### 响应
```http
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="{paper_title}.pptx"

[Binary PPTX file]
```

---

## 📦 依赖

```json
{
  "pptxgenjs": "^3.12.0"
}
```

---

## ⚙️ 环境要求

- ✅ `OPENAI_API_KEY` 已设置
- ✅ 已安装 pptxgenjs
- ✅ 论文已提取文本

---

## 🎯 与核心功能的关系

### 不影响核心架构
- ❌ 不修改数据库 schema
- ❌ 不改变核心 UI 布局
- ❌ 不干扰主要功能流程

### 可选功能
- 🔹 用户可以选择使用或不使用
- 🔹 不影响其他功能的使用
- 🔹 独立的 API 端点

---

## 💰 成本估算

**每次 PPT 生成**:
- GPT-4o-mini: ~2000 tokens
- 成本: ~$0.003-0.005
- 时间: ~10-20 秒

---

## 🔮 未来改进方向

### MVP v2.0 可能的增强：
- [ ] 自定义 PPT 页数（3 页 / 5 页 / 7 页）
- [ ] 选择 PPT 模板风格
- [ ] 添加图表/图像支持
- [ ] 支持批量生成多个论文的 PPT
- [ ] 编辑已生成的内容后再导出

---

## 📚 相关文档

- [MVP 规格](./MVP_SPECIFICATION.md)
- [MVP 总结](./MVP_SUMMARY.md)

---

## ✅ 实现状态

- [x] API 端点创建
- [x] AI Prompt 设计
- [x] PPTX 生成逻辑
- [x] UI 按钮集成
- [x] 文件下载功能
- [x] 实验性功能标识

**状态**: ✅ 已完成并可以使用
