# Literature Finder - 项目架构规则

**更新时间**: 2026-06-21
**项目目标**: AI驱动的文献管理与深度分析系统

---

## 🎯 核心设计原则

### 1. 布局规则（CRITICAL）

#### ✅ 必须遵循的布局模式

**论文详情页（/paper/[id]）**：
- **布局结构**: 左右两列网格布局
  ```tsx
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* 左列：论文内容 */}
    {/* 右列：AI功能 */}
  </div>
  ```
- **左列**: 论文全文/PDF预览（固定或sticky）
- **右列**: 所有AI功能（可滚动，sticky定位）
  ```tsx
  {/* 右列 */}
  <div className="sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
    {/* AI功能卡片 */}
  </div>
  ```

**❌ 禁止的布局**：
- ❌ 横向标签页布局（Tabs）- 导致用户无法一边看论文一边对照解读
- ❌ 垂直长滚动布局 - 需要大量滚动，不便于对照
- ❌ 折叠式布局 - 隐藏重要功能

#### 原因
用户明确要求："我不要横着的，这样我没办法一边看论文，一边对照解读"

---

### 2. 核心功能一致性规则

#### PDF显示功能

**必须提供两种模式**：
1. **PDF预览模式**
   - 使用 `PDFViewer` 组件
   - 显示原始PDF文件
   - 支持翻页、缩放、旋转
   - 工具栏包含：上一页/下一页、缩放按钮、页码输入

2. **文本模式**
   - 显示提取的文本内容
   - 支持选择和翻译
   - 支持展开/收起

**切换按钮**：
```tsx
<Button onClick={() => setViewMode(viewMode === 'text' ? 'pdf' : 'text')}>
  {viewMode === 'text' ? 'PDF预览' : '文本模式'}
</Button>
```

**PDF组件路径**：`src/components/pdf-viewer.tsx`

---

#### AI解读功能

**必须包含引用标注**：
- 每个AI结论必须标注来源位置
- 使用对象数组结构：
  ```typescript
  key_findings: Array<{
    finding: string;
    location: string;  // 如 "Abstract部分"、"第256-260页"
  }>
  ```
- 显示格式：
  ```tsx
  <p>{item.finding}</p>
  <p className="text-xs text-muted-foreground">
    📍 来源: {item.location}
  </p>
  ```

**AI Prompt要求**：
- 必须要求AI标注每个结论的来源
- 明确说明："必须基于实际论文内容，不能编造"
- 如果无法定位，标注为"全文综合推断"

---

#### 笔记功能

**基本要求**：
1. 笔记必须能正常保存（移除isMounted检查）
2. 使用functional state更新：
   ```tsx
   setNotes(prev => [newNote, ...prev])  // ✅ 正确
   setNotes([newNote, ...notes])         // ❌ 错误
   ```
3. Token验证：
   ```tsx
   const token = localStorage.getItem('token');
   if (!token && process.env.NODE_ENV !== 'development') {
     // 处理未登录
   }
   ```

---

#### Google Scholar集成

**必须包含**：
1. 数据库字段：
   - `uploadedPapers.googleScholarUrl`
   - `uploadedPapers.abstract`（用于搜索）

2. 上传后自动搜索：
   - 提取PDF完成后自动调用Google Scholar API
   - 保存搜索链接到数据库

3. 显示链接按钮：
   ```tsx
   {paper.googleScholarUrl && (
     <Button onClick={() => window.open(paper.googleScholarUrl, '_blank')}>
       <ExternalLink /> Google Scholar
     </Button>
   )}
   ```

---

### 3. UI/UX一致性规则

#### 组件使用

**必须使用的组件库**：
- shadcn/ui（Button, Card, Input, Textarea等）
- Lucide React图标
- Tailwind CSS

**Toast通知**：
- ✅ 使用 `useToast` hook
- ❌ 不使用 `alert()` 弹窗
- 示例：
  ```tsx
  toast({
    title: "操作成功",
    description: "数据已保存"
  });
  ```

#### 样式规范

**渐变色使用**：
- 主渐变：`from-blue-500 to-purple-600`
- 背景渐变：`from-blue-50 via-white to-purple-50`

**间距规范**：
- 卡片间距：`gap-6`
- 元素间距：`gap-2`, `gap-4`
- 内边距：`p-4`, `p-6`

**圆角规范**：
- 小元素：`rounded` 或 `rounded-md`
- 卡片：`rounded-xl`
- 大卡片：`rounded-2xl`

---

### 4. 数据库规则

#### 表命名

- ✅ 使用snake_case：`uploaded_papers`, `literature_notes`
- ❌ 不使用camelCase

#### 字段命名

- ✅ 使用snake_case或camelCase（保持一致）
- 时间字段：`created_at`, `updated_at`
- 布尔字段：使用SQLite integer模式（0/1）

#### 迁移流程

1. 修改 `src/db/schema.ts`
2. 创建迁移脚本 `scripts/migrate-xxx.ts`
3. 运行迁移脚本
4. 验证字段已添加

---

### 5. 开发流程

#### 添加新功能的标准流程

**Step 1: 读取规则**
```bash
# 每次开发前，先读取此文件
cat PROJECT_RULES.md
```

**Step 2: 检查现有实现**
- 查看类似功能的现有实现
- 确保遵循相同的模式

**Step 3: 设计功能**
- 参考PROJECT_RULES.md中的布局规则
- 确保UI/UX一致性
- 检查是否影响核心布局（左右两列）

**Step 4: 实现功能**
- 遵循组件命名规范
- 使用现有的类型和接口
- 添加适当的错误处理

**Step 5: 测试**
- 测试构建：`npm run build`
- 测试布局：确保左右两列结构
- 测试响应式：移动端和桌面端

---

### 6. 技术栈

#### 前端
- React 18 + TypeScript
- Next.js 14.2.21
- Tailwind CSS
- shadcn/ui
- Lucide React

#### 后端
- Next.js API Routes
- Drizzle ORM
- SQLite (libsql)

#### AI服务
- Zhipu GLM-4（主要）
- DeepSeek（备用）
- OpenAI GPT（可选）

#### PDF处理
- pdf-parse（文本提取）
- pdfjs-dist（PDF预览）

---

### 7. 文件结构规范

#### 页面组件
```
src/app/
├── paper/[id]/page.tsx        # 论文详情页（左右两列布局）
├── upload/page.tsx              # 上传页
├── my-papers/page.tsx          # 我的论文列表
└── api/
    ├── papers/[id]/           # 论文API
    └── google-scholar/        # Google Scholar搜索
```

#### 共享组件
```
src/components/
├── pdf-viewer.tsx             # PDF预览组件
├── ui/                        # shadcn/ui组件
└── notes/                     # 笔记相关组件
```

#### 数据库
```
src/db/
├── schema.ts                  # 数据库schema定义
├── index-papers.ts          # papers表相关
└── index.ts                 # 数据库主入口
```

---

### 8. 关键约束总结

#### 布局约束（最重要）
1. **论文详情页必须是左右两列布局**
2. **禁止使用横向Tabs布局**
3. **左侧固定（论文），右侧可滚动（AI功能）**

#### 功能约束
1. **必须提供PDF预览和文本两种模式**
2. **AI解读必须包含引用标注**
3. **笔记功能必须正常保存**
4. **使用Toast代替alert弹窗**

#### 开发约束
1. **添加新功能前先读取PROJECT_RULES.md**
2. **遵循现有的组件和样式模式**
3. **确保不破坏核心布局**

---

## 🔧 快速检查清单

在提交代码或完成功能前，检查以下项目：

- [ ] 布局是否保持左右两列结构？
- [ ] 是否添加了PDF预览功能？
- [ ] AI解读是否包含引用标注？
- [ ] 是否使用Toast而不是alert？
- [ ] 笔记功能是否能正常保存？
- [ ] 是否遵循了现有组件和样式模式？
- [ ] 构建是否成功？（`npm run build`）
- [ ] 是否影响了响应式设计？

---

## 📝 更新日志

**2026-06-21**
- 创建PROJECT_RULES.md
- 明确布局规则（左右两列）
- 定义核心功能一致性规则
- 建立开发流程

---

## ⚠️ 常见错误

### 错误1: 改变了核心布局
- **症状**: 使用了Tabs或垂直布局
- **后果**: 用户无法一边看论文一边对照解读
- **修复**: 必须保持左右两列grid布局

### 错误2: 忘记PDF预览功能
- **症状**: 只提供文本模式
- **后果**: 用户无法看到原始PDF格式
- **修复**: 添加PDFViewer组件和切换按钮

### 错误3: AI解读没有引用标注
- **症状**: 用户无法验证AI解读的真实性
- **后果**: 用户不信任AI功能
- **修复**: 添加location字段和显示逻辑

### 错误4: 使用闭包陷阱的setState
- **症状**: 状态更新不生效
- **后果**: UI不同步
- **修复**: 使用functional update: `setNotes(prev => ...)`

---

**记住**: 每次添加新功能前，先读取此文件！
