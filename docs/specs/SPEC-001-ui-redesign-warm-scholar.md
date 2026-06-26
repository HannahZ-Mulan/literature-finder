# Feature: 全站换肤 — 温暖学术 Warm Scholar

## Feature Description

将 literature-finder 全站从当前 shadcn 默认的纯灰阶配色 + 零散硬编码渐变(blue/purple/pink),统一升级为「温暖学术 Warm Scholar」视觉语言:米白纸面、琥珀主色、赭红点缀、衬线字体。目标是消除页面"无聊感",让科研用户获得文献阅读应有的学术质感与温度,同时保持 shadcn/ui 组件体系的可维护性。

## User Story

**As a** 科研人员(本产品核心用户)
**I want** 一个视觉统一、有学术温度、安静而智能的阅读界面
**So that** 长时间阅读文献时不被廉价配色干扰,工具本身传达出专业可信的质感。

## Problem Statement

当前页面"无聊"的根因是三重色彩问题:

1. **基线零品牌色**:`globals.css` 中所有颜色 HSL 饱和度均为 0(`0 0% X%`),这是 shadcn/ui 裸装默认态,全站灰阶无温度。
2. **硬编码渐变割裂**:22 个源文件(排除 backup/old)中存在 120 处直接写死的 Tailwind 颜色类(`from-blue-600`、`to-purple-600`、`from-blue-50 to-indigo-50` 等),与灰阶基底割裂,显廉价。
3. **缺乏字体语言**:全站无衬线/正文混排,缺少学术出版物气质。

这三点叠加导致首页 hero 硬塞的 `blue→purple` 渐变与全站灰底格格不入,既不统一也不高级。

## Solution Statement

采用**双轨换肤**:

- **轨道一 · CSS 变量层(主)**:重写 `globals.css` 的 `:root` 与 `.dark`,把 `--primary`、`--accent`、`--ring`、`--chart-*`、`--background` 等改为 Warm Scholar 色板。所有 shadcn 组件因消费这些变量,**自动跟随换肤**,这是改动最小、覆盖最广的一步。
- **轨道二 · 硬编码替换(补)**:逐文件替换 22 个源文件中 120 处硬编码 Tailwind 颜色类,统一映射到语义类(`bg-primary`、`text-amber-*` 等)或新增的语义化工具类。
- **轨道三 · 字体语言**:引入 Fraunces(衬线展示)+ Inter(正文)双字体栈,通过 Tailwind 配置与局部 `font-serif` 实用类承载学术感。
- **参考基准**:`design-previews/A-warm-scholar.html` 为视觉契约(配色/字体/交互细节以此为准)。

## Relevant Files

**核心改动文件:**
- `src/app/globals.css` — 颜色变量定义根,改动中枢(轨道一)
- `tailwind.config.ts` — 字体族配置、可能新增语义色映射(轨道三)
- `src/app/layout.tsx` — 全局字体加载(Google Fonts link)、衬线字体注入

**硬编码替换涉及的页面(轨道二)— 按改动量降序:**
- `src/app/upload/page.tsx` — 19 处,渐变最密集(进度条/按钮/标题/icon)
- `src/app/paper/[id]/page.tsx` — 14 处,4 张功能卡渐变 + 遮罩
- `src/app/literature/[id]/page.tsx` — 12 处
- `src/app/statistics/custom/page.tsx` — 5 处
- `src/app/statistics/page.tsx` — 6 处
- `src/app/reading-lists/[id]/page.tsx` — 8 处
- `src/app/demo/[id]/page.tsx` — 9 处
- `src/components/statistics/InsightsDashboard.tsx` — 9 处
- `src/components/statistics/OverviewCards.tsx` — 6 处
- `src/components/recommendations-panel.tsx` — 4 处
- `src/app/library/page.tsx` — 3 处
- `src/components/dashboard/DashboardControls.tsx` — 3 处
- `src/app/page.tsx` — 3 处(hero 渐变标题 + purple→pink 按钮,用户已确认替换)
- 其余单点文件:`notes`、`search`、`paper/[id]/ppt`、`test-citation-js`、`category-sidebar`、`chat/CitationMessage`、`notes/LiteratureNoteSidebar`、`notes/QuickNoteDialog`、`notes-panel`、`statistics/MostCitedTable`

**参考(只读,不改动):**
- `design-previews/A-warm-scholar.html` — 视觉契约
- `src/components/ui/*` — 16 个 shadcn 组件,**预期无需改动**(它们消费 CSS 变量,自动跟随);仅在验证后若个别组件表现异常才局部调整

**忽略:**
- `src/app/literature/[id]/page.tsx.backup`、`page.tsx.old` — 备份文件,不在构建产物中,不改动
- `node_modules/`、`test-*.js`(根目录散落测试脚本)— 非应用代码

## Implementation Plan

### Phase 1: Foundation — 色板与字体基建(轨道一 + 三)

建立换肤的"地基":CSS 变量 + 字体加载。这一步完成后,**所有 shadcn 组件和未硬编码颜色的页面立即获得新外观**,无需逐个改组件。

### Phase 2: Core Implementation — 硬编码颜色清理(轨道二)

按文件逐个替换 120 处硬编码 Tailwind 颜色类。此阶段是工作量主体,需遵循统一映射规则(见下"颜色映射契约")。

### Phase 3: Integration — 页面级视觉精修

针对 hero、统计页图表色、信息卡渐变做精细调校,确保 Warm Scholar 风格在数据可视化等复杂场景也成立。

## 颜色映射契约(实施时严格遵循)

| 现状硬编码 | 替换为 | 用途 |
|---|---|---|
| `from-blue-600 to-purple-600`(按钮/标题) | `bg-primary text-primary-foreground` 或琥珀渐变实用类 | 主 CTA |
| `from-blue-500 to-purple-600`(icon 背景圆角块) | `bg-primary/10 text-primary` 或新增 `.icon-tile` 类 | 圆角图标块 |
| `bg-gradient-to-r from-blue-500 to-purple-500`(进度条) | `bg-primary` 实色 或 `from-amber-600 to-amber-700` | 上传进度 |
| `from-blue-50 to-indigo-50`(功能卡渐变) | `bg-card border-border` 或 `bg-amber-50/40` 浅纸面 | 信息卡 |
| `from-purple-50 to-pink-50` | `bg-amber-50/40 border-amber-200/60` | 高亮卡 |
| `from-green-50 to-emerald-50` | `bg-sage-50/40`(新增 sage 色阶)或保留为语义"成功"绿 | 状态卡 |
| `from-amber-50 to-orange-50` | 保留,与 Warm Scholar 契合 | 已吻合,微调即可 |
| `bg-clip-text text-transparent from-blue-600 via-indigo-600 to-purple-600`(hero 标题) | `text-primary` 衬线 + 下划高亮(见原型 A 的 `<em>` 处理) | hero 标题 |
| `chart-1..5` 变量 | 改为暖色系:琥珀/赭红/苔绿/深蓝/陶土 | 图表配色 |

**原则**:能用 CSS 变量语义类(`bg-primary`、`text-muted-foreground`)解决的,绝不写死十六进制/Tailwind 色阶;确需渐变时收敛到「琥珀单色系」内,不再引入蓝紫粉。

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Task 1: 重写 globals.css 色彩变量(Foundation)

**User Story**: As a developer, I need the color variables to reflect Warm Scholar palette so all components inherit the new look automatically.

- 备份当前 `globals.css` 的 `:root` 块(git 已跟踪,可直接 diff 回溯)
- 将 `:root` 中 `--primary` 改为琥珀墨 `36 60% 18%` 类深色(按钮主色用深墨,高亮用琥珀——见原型 A 的 ink/amber 双层)
- `--accent` → 琥珀 `40 76% 50%`
- `--background` → 米白纸面 `42 38% 96%`
- `--foreground` → 墨色 `30 18% 12%`
- `--muted-foreground` → 弱化墨 `35 12% 45%`
- `--border` → 暖灰线 `38 22% 85%`
- `--ring` → 琥珀 `40 76% 50%`
- `--chart-1..5` → 暖色系(琥珀/赭红/苔绿/深蓝/陶土),参考原型 stats 的配色
- 同步更新 `.dark` 块为深色纸面版本(暖黑底 + 提亮的琥珀)
- 保留 `--radius: 0.5rem` 不变

**Acceptance Criteria**:
- [ ] `globals.css` `:root` 与 `.dark` 完整反映 Warm Scholar 色板
- [ ] `npm run typecheck` 通过
- [ ] 启动 `npm run dev`,首页未硬编码颜色的区域(如纯 `bg-background`、`text-primary`)已自动变为暖色

### Task 2: 引入衬线字体栈(Foundation)

**User Story**: As a developer, I need Fraunces serif loaded so academic typographic feel is available site-wide.

- 在 `layout.tsx` 的 `<head>` 通过 `next/font/google` 引入 `Fraunces`(展示用)与 `Inter`(正文,可能已隐式使用)
- 配置 CSS variable:`--font-serif` → Fraunces,`--font-sans` → Inter
- 在 `tailwind.config.ts` 的 `theme.extend.fontFamily` 注册 `serif: ['var(--font-serif)', 'Georgia', 'serif']`
- 保留所有现有正文用 sans,仅 hero 标题、卡片标题、论文条目标题按需加 `font-serif`(在 Phase 3 精修时局部应用)

**Acceptance Criteria**:
- [ ] `next/font` 正确加载 Fraunces,无控制台字体警告
- [ ] `font-serif` 实用类可用且渲染为 Fraunces
- [ ] `npm run build` 通过(next/font 需构建期校验)

### Task 3: 替换首页 hero 硬编码(Core)

**User Story**: As a researcher, I want the hero to look cohesive with the new palette so the entry point doesn't feel cheap.

- `src/app/page.tsx`:
  - L45 hero 标题 `bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent` → 改为衬线 `font-serif` + 琥珀 `<em>` 高亮(对照原型 A 的 `hero-title em` 写法)
  - L56 上传按钮 `bg-gradient-to-r from-purple-600 to-pink-600 ...` → `bg-primary text-primary-foreground hover:bg-primary/90`
  - L41 `bg-gradient-to-b from-background to-muted/20` → 保留(语义类,已自动换肤),或按原型 A 加纸面 radial gradient 背景
  - emoji 特性卡(📝🌐💬)→ 替换为原型 A 的衬线序号 + 图标块风格(可选,Phase 3)

**Acceptance Criteria**:
- [ ] 首页 hero 标题为 Fraunces 衬线,关键词琥珀高亮,无任何 blue/purple/pink 类
- [ ] 上传按钮为琥珀系实色,hover 状态正常
- [ ] 全页 grep `from-blue\|from-purple\|from-indigo\|via-indigo\|to-purple\|to-pink` 返回 0 结果
- [ ] `npm run typecheck && npm run lint` 通过

### Task 4: 替换 upload 页硬编码(Core,改动最密集)

**User Story**: As a researcher, I want the upload page to feel consistent with the warm theme during the upload workflow.

- `src/app/upload/page.tsx`(19 处):
  - L166 页面底 `from-blue-50 via-white to-purple-50` → `bg-background` 或纸面渐变
  - L170 icon 圆角块 `from-blue-500 to-purple-600` → `bg-primary/10 text-primary` 或 `.icon-tile`
  - L173 标题渐变文字 → 衬线 + 琥珀
  - L335 进度条 `from-blue-500 to-purple-500` → `bg-primary`
  - L369 提交按钮 `from-blue-500 to-purple-600` → `bg-primary`

**Acceptance Criteria**:
- [ ] upload 页所有 blue/purple 渐变替换完毕
- [ ] 上传流程功能不受影响(进度条动画、提交逻辑零改动)
- [ ] grep 该文件硬编码颜色返回 0
- [ ] 手动上传一个 PDF 走完流程,视觉一致

### Task 5: 替换 paper/[id] 详情页硬编码(Core)

**User Story**: As a researcher, I want the paper detail page cards to use warm tones so the reading experience feels scholarly.

- `src/app/paper/[id]/page.tsx`(14 处):
  - 4 张功能卡渐变(`from-blue-50 to-indigo-50`、`from-amber-50 to-orange-50`、`from-purple-50 to-violet-50`、`from-green-50 to-emerald-50`)→ 统一为 `bg-card border-border` 或按功能语义用浅琥珀/苔绿
  - L583 阅读区遮罩 `from-gray-50 dark:from-gray-900` → `from-background`(语义化)

**Acceptance Criteria**:
- [ ] 4 张功能卡视觉统一,无蓝紫绿杂色
- [ ] 阅读区遮罩与背景过渡自然
- [ ] 详情页所有交互(展开/折叠、AI 摘要)功能不受影响
- [ ] grep 该文件硬编码颜色返回 0

### Task 6: 替换 statistics 页与组件硬编码(Core + 图表色)

**User Story**: As a researcher, I want charts and stats to use a coherent warm palette so data is readable and on-brand.

- `src/app/statistics/page.tsx`(6 处)、`statistics/custom/page.tsx`(5 处)
- `src/components/statistics/InsightsDashboard.tsx`(9 处)、`OverviewCards.tsx`(6 处)、`MostCitedTable.tsx`(1 处)
- 重点:图表配色改用 `chart-1..5` CSS 变量(已在 Task 1 改为暖色),recharts 等组件若直接传色值则同步替换

**Acceptance Criteria**:
- [ ] 统计页所有信息卡与图表使用暖色系
- [ ] 图表数据可读性不下降(对比度达标)
- [ ] grep 这 5 个文件硬编码颜色返回 0
- [ ] `npm run typecheck && npm run lint` 通过

### Task 7: 替换其余页面硬编码(Core)

**User Story**: As a developer, I want no file left with legacy hardcoded colors so the reskin is complete and consistent.

- 按改动量从小到大逐文件处理:
  - `demo/[id]`(9)、`reading-lists/[id]`(8)、`library`(3)
  - `dashboard/DashboardControls`(3)、`recommendations-panel`(4)
  - 单点文件:`notes`、`search`、`paper/[id]/ppt`、`test-citation-js`、`category-sidebar`、`chat/CitationMessage`、`notes/LiteratureNoteSidebar`、`QuickNoteDialog`、`notes-panel`、`MostCitedTable`
- 严格遵循"颜色映射契约"

**Acceptance Criteria**:
- [ ] `grep -rn "from-blue\|from-purple\|from-indigo\|from-pink\|from-violet\|to-blue\|to-purple\|to-indigo\|to-pink\|to-violet\|via-indigo\|via-purple" src/` 全站返回 0(排除 backup/old)
- [ ] 所有页面功能不受影响

### Task 8: 页面级视觉精修(Integration)

**User Story**: As a researcher, I want the final result to feel polished and intentional, not just a color swap.

- 首页:应用原型 A 的纸面 radial gradient 背景、AI 摘要卡片样式(可选引入打字机/数字滚动交互)
- 详情页:论文标题加 `font-serif`,元数据用衬线斜体期刊名
- 统计页:确认图表暖色配色在浅/深色模式均达标
- 全站:确认 `.dark` 模式视觉成立(若项目实际启用 dark)

**Acceptance Criteria**:
- [ ] 首页对照原型 A 视觉一致度 ≥ 90%
- [ ] 衬线字体在标题/期刊名等关键位置生效
- [ ] 深色模式(若启用)无对比度问题

### Task 9: 全站验证与回归

**User Story**: As a developer, I want confidence the reskin introduced zero regressions.

- 浏览器逐一访问所有路由(见 glob 出的 21 个 page.tsx),人工确认无样式破损、无功能异常
- 对比 `git diff --stat` 确认改动范围符合预期(预期改动 ~22 个源文件 + globals.css + tailwind.config + layout.tsx)
- 运行全部验证命令

**Acceptance Criteria**:
- [ ] 21 个页面路由全部可访问且样式正常
- [ ] 无控制台报错(字体/样式/运行时)
- [ ] `git diff --stat` 改动文件清单与本 SPEC 吻合

## Testing Strategy

### Unit Tests
- 本项目无单元测试框架配置(package.json 无 jest/vitest),UI 换肤以视觉/类型验证为主,不新增单测。

### Integration Tests
- 无自动化集成测试;以手动端到端走查替代(见 Task 9)。

### Edge Cases
- 深色模式(`.dark`)下暖色是否过暗/对比度不足
- 进度条/图表等"动态着色"组件颜色替换后动画是否正常
- next/font 加载失败时的字体回退(Georgia/serif fallback)
- 同时存在 `bg-card` 与残留硬编码的卡片视觉是否冲突

## Acceptance Criteria

- [ ] 全站 0 处硬编码 blue/purple/indigo/pink/violet Tailwind 颜色类(backup/old 文件除外)
- [ ] `globals.css` 完整反映 Warm Scholar 色板(浅/深色模式)
- [ ] Fraunces 衬线字体加载成功并在标题位生效
- [ ] 首页视觉对照原型 A 一致度 ≥ 90%
- [ ] 21 个页面路由全部可访问,无样式破损
- [ ] `npm run typecheck && npm run lint && npm run build` 全部通过,零回归

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run typecheck` — TypeScript 类型检查,确保字体/组件改动无类型错误
- `npm run lint` — ESLint 检查,确保无 lint 回归
- `npm run build` — 生产构建,校验 next/font 与全站资源打包正常
- `npm run dev` — 启动开发服务器,人工走查所有路由(浏览器访问)
- `grep -rn "from-blue\|from-purple\|from-indigo\|from-pink\|from-violet\|to-blue\|to-purple\|to-indigo\|to-pink\|to-violet\|via-indigo\|via-purple" src/ | grep -v backup | grep -v ".old"` — 必须返回 0 行,确认硬编码颜色清零
- `git diff --stat` — 确认改动范围符合预期(~25 文件)

## Notes

- **视觉契约**:`design-previews/A-warm-scholar.html` 是唯一视觉基准,实施时配色/字体/间距以它为准。B、C 两原型已废弃。
- **backup 文件**:`literature/[id]/page.tsx.backup`、`.old` 不在构建产物中,**不要改动**它们,以免污染 git 历史对比。
- **渐进策略**:Task 1 完成后即可看到大面积换肤效果(因 shadcn 组件自动跟随变量),建议在 Task 1 后先 commit 一次,建立可回滚检查点,再进行 Task 2-7 的硬编码清理。
- **风险点**:recharts 图表若在组件内 hardcode 了颜色数组,需单独排查(在 Task 6 中处理)。
- **不引入新依赖**:Fraunces/Inter 走 next/font,无需手动加 Google Fonts `<link>` 或新 npm 包。
