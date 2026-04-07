# Literature Finder - 开发工作流程指南

> **文档版本**: v1.0
> **创建日期**: 2026-03-04
> **用途**: 规范开发流程，减少重复错误，提高开发效率

---

## 🎯 开发前检查清单

在开始开发新功能前，请按以下顺序检查：

### 1. 了解当前状态
- [ ] 读取 `progress.txt` 了解项目当前状态
- [ ] 确认要开发的功能是否已存在
- [ ] 检查是否有相关的技术债务需要处理

### 2. 规划修改
- [ ] 列出将要修改的所有文件
- [ ] 对每个要修改的文件：
  - 先 Read 完整文件内容
  - 检查是否需要添加新的 import（如 `useRef`, `Loader2` 等）
  - 预判可能的编译错误点
  - 确认修改不会影响其他功能

### 3. 执行修改
- [ ] 一次性修改所有相关文件
- [ ] 同类型文件使用统一的修改模式
- [ ] 最后统一运行 `npm run build` 检查

### 4. 测试验证
- [ ] 编译成功无错误
- [ ] 启动开发服务器
- [ ] 手动测试修改的功能
- [ ] 检查控制台是否有错误

### 5. 记录文档
- [ ] 更新 `progress.txt`
- [ ] 记录修改的文件和内容
- [ ] 记录遇到的问题和解决方案

---

## 🔒 异步组件保护规范

当修改任何包含异步操作的 React 组件时（如 `fetch`、API 调用），**必须**添加 `isMounted` 保护机制。

### 标准模板

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

export function MyComponent() {
  // 1. 添加 isMounted ref
  const isMounted = useRef(true);

  // 2. 在 useEffect 中添加清理函数
  useEffect(() => {
    // 组件逻辑
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 3. 在所有异步操作中添加检查
  async function loadData() {
    try {
      const response = await fetch('/api/data');
      if (response.ok && isMounted.current) {
        const data = await response.json();
        if (isMounted.current) {
          setState(data);
        }
      }
    } catch (error) {
      if (isMounted.current) {
        console.error(error);
      }
    }
  }

  // 4. 在 setState 前检查
  function updateState() {
    if (isMounted.current) {
      setState(newValue);
    }
  }

  return <div>...</div>;
}
```

### 适用场景

- ✅ Dialog 组件（QuickNoteDialog 等）
- ✅ Sidebar 组件（LiteratureNoteSidebar 等）
- ✅ 任何有 API 调用的组件
- ✅ 任何使用 `setTimeout` 或 `setInterval` 的组件
- ✅ 任何添加事件监听器的组件

### 常见错误

**错误 1: 忘记检查 isMounted**
```typescript
// ❌ 错误
async function handleSubmit() {
  const response = await fetch('/api/data');
  setState(response.json()); // 可能导致 "removeChild" 错误
}

// ✅ 正确
async function handleSubmit() {
  const response = await fetch('/api/data');
  if (isMounted.current) {
    setState(response.json());
  }
}
```

**错误 2: 忘记在 useEffect 清理函数中设置**
```typescript
// ❌ 错误
useEffect(() => {
  loadData();
}, []);

// ✅ 正确
useEffect(() => {
  loadData();
  return () => {
    isMounted.current = false;
  };
}, []);
```

---

## 🐛 调试流程规范

### 1. 编译错误

**症状**: `npm run build` 失败，显示语法错误

**排查步骤**:
1. 查看完整错误信息，定位文件和行号
2. 检查是否缺少 import：
   - 图标: `Loader2`, `Download`, `Copy` 等（从 `lucide-react`）
   - React hooks: `useRef`, `Suspense` 等（从 `react`）
   - UI 组件: 确认从正确的路径导入
3. 检查语法错误：
   - JSX 中的动态组件是否正确渲染
   - 是否有未闭合的标签
   - 是否有 TypeScript 类型错误
4. 修复后重新 build

**常见问题**:
```typescript
// 问题 1: 缺少 Loader2 import
import { Download, Copy } from 'lucide-react'; // ❌
import { Download, Copy, Loader2 } from 'lucide-react'; // ✅

// 问题 2: 动态组件渲染错误
<step.icon className="..." /> // ❌ step 未定义
{(() => {
  const CurrentIcon = quickStartSteps[currentStep].icon;
  return <CurrentIcon className="..." />;
})()} // ✅
```

### 2. 运行时错误 - removeChild

**症状**: `NotFoundError: Failed to execute 'removeChild' on 'Node'`

**原因**: 组件卸载后尝试更新状态

**解决方案**: 添加 `isMounted` 保护（见上文）

### 3. 运行时错误 - 样式不加载

**症状**: 页面显示纯 HTML，无任何样式

**排查步骤**:
1. 清理缓存: `rm -rf .next`
2. 重启服务器
3. 硬刷新浏览器: `Ctrl + Shift + R`
4. 检查浏览器 Network 标签，确认 CSS 文件返回 200
5. 检查 `tailwind.config.ts` 的 content 配置是否正确

### 4. 功能不工作

**症状**: 点击按钮无反应，页面跳转失败

**排查步骤**:
1. 检查条件渲染逻辑:
   ```typescript
   {user && <Navigation />} // ❌ 测试模式下不显示
   {(user || !user) && <Navigation />} // ✅ 始终显示
   ```
2. 检查事件处理函数是否正确定义
3. 检查函数定义顺序（const 函数不会提升）
4. 打开浏览器控制台查看错误信息

---

## 📦 功能开发 Checklist

### 引用/导出类功能

- [ ] 添加复制到剪贴板功能
  - 使用 `navigator.clipboard.writeText()`
  - 添加成功提示 toast
- [ ] 添加下载文件功能
  - 使用 `new Blob([content], { type: 'text/plain;charset=utf-8' })`
  - 使用 `URL.createObjectURL()` 创建下载链接
  - 记得 `URL.revokeObjectURL()` 释放内存
- [ ] 添加加载状态
  - `isLoading`, `isExporting`, `isSaving` 等
  - 禁用按钮防止重复提交
- [ ] 添加成功/失败提示
  - 使用 `toast()` 显示操作结果
  - 错误使用 `variant: "destructive"`
- [ ] 考虑批量操作场景
  - 批量选择状态管理
  - 批量操作的进度提示

### 异步表单/对话框

- [ ] 添加 `isMounted` 保护
- [ ] 防止重复提交
  - 按钮 `disabled` 属性
  - 或使用 `loading` 状态
- [ ] 错误处理
  - `try-catch` 包裹异步代码
  - 友好的错误提示
- [ ] 成功后操作
  - 关闭对话框
  - 刷新列表数据
  - 清空表单

### 测试模式兼容

- [ ] 检查是否依赖 `user` 状态
- [ ] 无 `user` 时是否需要显示/隐藏功能
- [ ] API 调用是否使用测试用户 ID
  ```typescript
  const userId = user?.id || '1'; // ✅ 测试模式兼容
  ```

---

## 🚀 批量修改优化

当需要同时修改多个相似文件时：

### 工作流程

1. **查找所有相关文件**
   ```bash
   # 使用 Grep 查找模式
   Grep: pattern="useEffect"

   # 使用 Glob 查找文件
   Glob: "src/components/notes/*.tsx"
   ```

2. **逐个分析文件**
   - Read 完整内容
   - 定位需要修改的行
   - 记录上下文

3. **统一修改模式**
   - 制定统一的修改方案
   - 确保所有文件使用相同的模式

4. **执行修改**
   - 使用 Edit 工具逐个修改
   - 或使用 `replace_all=true` 批量替换

### 示例场景

**场景 1: 给多个组件添加 isMounted 保护**
```
1. 找到所有有 fetch 调用的组件
2. 每个组件添加: const isMounted = useRef(true);
3. 在 useEffect 清理函数中设置
4. 在所有 setState 前检查
```

**场景 2: 给多个 API 路由添加动态配置**
```
1. 找到所有使用了 request.url/searchParams 的路由
2. 在文件顶部添加: export const dynamic = 'force-dynamic';
```

---

## 🎨 UI 组件开发规范

### 图标使用

- 所有图标需从 `lucide-react` 导入
- 常用图标：
  - `Loader2` - 加载状态（需要 `animate-spin` 类）
  - `Download` - 下载
  - `Copy` - 复制
  - `Check` - 成功
  - `X` - 关闭/取消
  - `Plus` - 添加
  - `Trash2` - 删除
  - `Edit3` - 编辑
- 动态图标渲染：
  ```typescript
  {(() => {
    const Icon = iconMap[iconName];
    return <Icon className="w-4 h-4" />;
  })()}
  ```

### 样式类名

- 优先使用 `shadcn/ui` 组件
- Tailwind 类名顺序建议：
  1. 布局: `flex`, `grid`, `container`, `mx-auto`
  2. 间距: `p-4`, `m-2`, `gap-4`
  3. 尺寸: `w-full`, `h-12`, `max-w-md`
  4. 颜色: `bg-white`, `text-primary`, `border-border`
  5. 效果: `rounded-lg`, `shadow-md`, `hover:bg-muted`
  6. 响应式: `sm:flex-row`, `md:grid-cols-3`

### 条件渲染

- 避免使用 `{user && ...}` 导致测试模式不显示
- 改为 `{(user || !user) && ...}` 或始终显示
- 示例：
  ```typescript
  // ❌ 测试模式下导航栏不显示
  {user && <Navigation />}

  // ✅ 始终显示导航栏
  <Navigation />

  // ✅ 或显式处理
  {(user || !user) && <Navigation />}
  ```

### Dialog/Modal 组件

- 使用 `shadcn/ui` 的 Dialog 组件
- 记得添加 `isMounted` 保护
- 关闭时清理状态：
  ```typescript
  const onOpenChange = (open: boolean) => {
    if (!open) {
      // 清理状态
      form.reset();
    }
    onOpenChange(open);
  };
  ```

---

## 💾 提交前检查清单

每次完成功能后，更新 `progress.txt`：

### 1. 更新时间戳
```markdown
- Timestamp: 2026-03-04
```

### 2. 更新状态
```markdown
- Status: **功能名称完成！**
  - ✅ 功能点 1
  - ✅ 功能点 2
```

### 3. 记录修改详情

在对应的章节下记录：
- **修改了哪些文件**（完整路径）
- **解决了什么问题**
- **使用了什么技术方案**
- **是否有遗留问题**

示例：
```markdown
### 引用导出功能优化
1. **ExportButton 组件** (`src/components/literature/ExportButton.tsx`)
   - ✅ 添加"复制全部格式"功能
   - ✅ 添加"导出全部格式"功能
   - ✅ 修复 Loader2 图标导入

2. **Bug 修复**
   - ✅ 修复 removeChild 错误（添加 isMounted 保护）
   - ✅ 修复导航栏测试模式不显示
```

### 4. 添加已知问题

如果有未解决的问题，记录到 "已知问题" 部分：
```markdown
## 已知问题
- ⚠️ 首次访问可能需要硬刷新
- ⚠️ 开发服务器端口可能冲突
```

---

## 🔧 推荐工作流程

### 日常开发流程

```
1️⃣ 开始工作
   ├─ Read progress.txt
   ├─ 理解当前状态
   └─ 明确开发目标

2️⃣ 规划修改
   ├─ 列出要改的文件
   ├─ 预判可能的错误
   ├─ 准备所有 import
   └─ 设计统一模式

3️⃣ 执行修改
   ├─ 逐个文件修改
   ├─ 同类型批量修改
   ├─ 添加必要保护
   └─ 统一代码风格

4️⃣ 测试验证
   ├─ npm run build
   ├─ 启动 dev 服务器
   ├─ 手动测试功能
   └─ 检查控制台

5️⃣ 记录文档
   ├─ 更新 progress.txt
   ├─ 记录问题
   └─ 记录方案
```

### 问题排查流程

```
遇到问题
   ↓
检查错误类型
   ├─ 编译错误 → 检查 import/语法
   ├─ 运行时错误 → 检查逻辑/isMounted
   └─ 样式问题 → 清理缓存/重启
   ↓
应用对应解决方案
   ↓
验证修复
   ↓
记录到 progress.txt
```

---

## 📚 相关文档

- [产品策略文档](PRODUCT_STRATEGY.md)
- [项目进度追踪](../progress.txt)
- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)

---

## ✅ 快速参考

### 常用 import

```typescript
// React
import { useState, useEffect, useRef, Suspense } from 'react';

// Next.js
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Icons (lucide-react)
import { Loader2, Download, Copy, Check, X, Plus, Trash2 } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
```

### 常用代码片段

**isMounted 保护**:
```typescript
const isMounted = useRef(true);
useEffect(() => {
  return () => { isMounted.current = false; };
}, []);
```

**动态路由配置**:
```typescript
export const dynamic = 'force-dynamic';
```

**文件下载**:
```typescript
const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'filename.txt';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);
```

---

**最后更新**: 2026-03-04
**维护者**: Claude (AI Assistant)
