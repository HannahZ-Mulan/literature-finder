# Feature: 全站功能卡 UI 升级 — 玻璃态 + 堆叠布局

## Feature Description

将 literature-finder 全站 22 个页面、150+ 个 Card、100+ 个 Button 的视觉质量全面提升。核心策略:**升级 shadcn 底层组件 `Card.tsx` + `Button.tsx`**,让全站自动跟随——彻底解决"之前 UI 优化只针对首页,其他页面(upload/paper/statistics 等)按钮和卡片还是旧框架"的痛点。

视觉语言采用融合方案:**C 的玻璃质感**(半透明 + backdrop-blur + 背景暖光 + 琥珀渐变边框)+ **A 的堆叠布局**(大主卡 + 序号次卡群)+ **静止不飘动**(卡片只在 hover 时微抬,平时稳定)。

## User Story

**As a** 科研用户
**I want** 全站所有页面(upload/paper 详情/搜索/统计/阅读列表...)的功能卡和按钮都有一致的玻璃质感与琥珀渐变边框,而不是只有首页漂亮、其他页还是旧的死板方框
**So that** 整个产品在任何一个页面都保持统一的智能感与高级感,不会有"半新半旧"的割裂体验。

## Problem Statement

当前 UI 状态的两大痛点:

1. **升级覆盖不均**:前期 SPEC-001 换肤只改了 globals.css 的 CSS 变量 + 少量页面硬编码。首页通过 page.tsx 重写获得了衬线标题、纸面背景等升级,但 **upload/paper 详情/statistics 等页面的 Card 和 Button 仍是 shadcn 默认的 `rounded-lg border bg-card shadow-sm` 死板方框**,视觉上与首页割裂。

2. **逐页改造不可行**:全站 22 个页面、150+ Card、100+ Button。逐页改 150 个使用点会:① 工作量爆炸 ② 产生不一致(每个开发者改法不同)③ 难以维护。**唯一可行的方式是升级底层组件**。

## Solution Statement

采用**底层组件升级 + 全局背景 + 逐页兼容性验证**三轨并行:

1. **轨道一(核心):升级 `Card.tsx` + `Button.tsx`**。改组件的 className 定义(Card 只有一行 L12、Button 的 cva variants),全站 150+ Card、100+ Button **自动跟随**。这是解决痛点的根本,一处改全站变。
2. **轨道二(全局背景):全站玻璃基底**。在 `layout.tsx` 的 body 加固定的暖光背景 blob(流动),让玻璃卡片有"悬浮在光中"的质感。背景流动但**卡片不飘**——卡片保持静止,只在 hover 时 -3px 微抬。
3. **轨道三(逐页验证):兼容性扫描**。150+ Card 里有部分带自定义 className(如 `bg-gradient-to-br from-sage-50`),会与玻璃基底叠加产生预期外效果。需逐页验证视觉,对异常点局部调整(改自定义类或加 `variant` prop 区分)。

**为何不做"逐页重写 Card"**:工作量大、不一致、难维护。底层升级让全站统一,异常点局部修,ROI 最高。

**为何不引入新组件库**:玻璃态用纯 CSS(backdrop-filter + mask 边框)实现,无新依赖,保持 shadcn 体系。

## Relevant Files

**核心改动文件(轨道一):**
- `src/components/ui/card.tsx` — Card 组件 className 升级为玻璃态(只改 L12 一行)
- `src/components/ui/button.tsx` — Button 的 cva variants 升级(墨色渐变 + 琥珀高光 + 玻璃描边)

**全局背景(轨道二):**
- `src/app/globals.css` — 加 `.warm-glow-bg` 工具类(固定暖光 blob,流动)
- `src/app/layout.tsx` — body 应用暖光背景类

**逐页兼容性验证(轨道三)涉及的页面(按 Card 密度排序):**
- `src/app/paper/[id]/page.tsx`(43 Card)— 6 张功能卡用 `from-sage-50`/`from-clay-50` 渐变,需验证叠加
- `src/app/literature/[id]/page.tsx`(25 Card)
- `src/app/literature/preview/page.tsx`(33 Card)
- `src/app/library/page.tsx`、`src/app/upload/page.tsx`、`src/app/statistics/page.tsx` 等 19 个页面

**参考(只读,视觉契约):**
- `design-previews/H-fusion-glass-stacked.html` — 融合方案预览(唯一视觉基准)

**忽略:**
- `src/app/literature/[id]/page.tsx.backup`、`.old` — 备份文件
- 登录/注册页(login/register)— 可选,优先级低

## Implementation Plan

### Phase 1: Foundation — 组件升级 + 全局背景

改 Card.tsx + Button.tsx + 全局背景。这一步后,全站立即获得玻璃质感(底层生效),但可能有兼容性异常。

### Phase 2: Core — 逐页兼容性验证与调整

扫描 22 个页面,对玻璃基底 + 自定义类叠加产生异常的 Card 局部调整。

### Phase 3: Integration — 关键页面布局精修

对 paper 详情页、upload、statistics、search-local 等核心页面的功能卡应用 A 布局(大主卡 + 序号次卡群),不只是底层跟随,而是结构性升级。

## 颜色与质感契约(实施时严格遵循)

| 元素 | 升级为 |
|---|---|
| **Card 基底** | `bg-[rgba(255,253,246,0.62)] backdrop-blur-[16px] border border-white/70 rounded-2xl shadow-[暖琥珀]` |
| **Card hover** | `hover:-translate-y-[3px] hover:shadow-[增强琥珀]`(静止不飘,只 hover 抬升) |
| **Card 渐变边框** | mask 技术实现的琥珀渐变描边(`.glass-glow` 工具类,可选应用) |
| **Button primary** | 墨色渐变 `bg-gradient-to-br from-[#2a2418] to-[#1c1812]` + hover 时琥珀高光扫过 |
| **Button secondary** | 玻璃描边 `bg-white/60 backdrop-blur border-amber-500/30` |
| **Button destructive** | 赭红渐变 `from-[#c4573a] to-destructive` |
| **全局背景** | 两个固定暖光 blob(琥珀 + 陶土),流动但卡片静止 |

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Task 1: 升级 Card 组件(Foundation)

**User Story**: As a developer, I upgrade the Card base so all 150+ Cards inherit glass treatment.

- 修改 `src/components/ui/card.tsx` 的 Card className(L12):
  - 旧:`"rounded-lg border bg-card text-card-foreground shadow-sm"`
  - 新:`"rounded-2xl border border-white/70 bg-card/62 backdrop-blur-[16px] text-card-foreground shadow-[0_8px_28px_-14px_hsl(40_76%_40%/0.18)] transition-all hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-16px_hsl(40_76%_40%/0.32)]"`
  - 注意:`bg-card/62` 是不透明度写法,确保与 globals.css 的 `--card` 变量兼容
- 在 globals.css 加 `.glass-glow` 工具类(渐变边框,可选应用,通过 className 传入)
- **不改动** CardHeader/CardTitle/CardContent/CardFooter 的 padding(保持向后兼容)

**Acceptance Criteria**:
- [ ] Card.tsx className 升级,glass-glow 工具类定义
- [ ] `npm run typecheck` 通过
- [ ] 启动 dev,任意页面 Card 显示玻璃质感(半透明 + 模糊)

### Task 2: 升级 Button 组件(Foundation)

**User Story**: As a developer, I upgrade Button variants so all 100+ Buttons get glass + amber treatment.

- 修改 `src/components/ui/button.tsx` 的 cva variants:
  - `default`(primary):墨色渐变 `bg-gradient-to-br from-[#2a2418] to-primary` + hover 琥珀高光(用 `relative overflow-hidden` + `::after` 扫光)
  - `secondary`:玻璃描边 `bg-card/60 backdrop-blur border-[hsl(40_76%_40%/0.3)]`
  - `destructive`:赭红渐变 `bg-gradient-to-br from-[#c4573a] to-destructive`
  - `outline`:保留描边但用琥珀色边框
  - `ghost`/`link`:hover 时琥珀色背景
- primary 的扫光效果:在 cva 里加 `relative overflow-hidden`,扫光用 CSS `.btn-shine::after`(在 globals.css 定义)

**Acceptance Criteria**:
- [ ] Button 5 变体升级,primary 有琥珀扫光
- [ ] `npm run typecheck && npm run build` 通过
- [ ] 全站按钮显示新样式,hover 扫光正常

### Task 3: 全局暖光背景(Foundation)

**User Story**: As a user, the glass cards appear to float in warm ambient light across all pages.

- 在 `globals.css` 加 `.warm-glow-bg` 工具类:
  - 两个固定 `position:fixed` 暖光 blob(琥珀 + 陶土)
  - `filter:blur(90px)` 柔化
  - 慢速 `@keyframes drift` 动画(20s+ 周期,缓慢流动)
  - `pointer-events:none` + `z-index:0`(不影响交互)
- 在 `layout.tsx` body 加 `warm-glow-bg` 类,body 内容用 `relative z-10`
- **卡片静止**:背景流动,但 Card 不加 float 动画(只 hover 抬升)

**Acceptance Criteria**:
- [ ] 全站页面有暖光流动背景
- [ ] 玻璃卡片悬浮在光中,质感成立
- [ ] 卡片本身静止(无持续飘动),只 hover 抬升
- [ ] 背景不阻挡交互(pointer-events:none)

### Task 4: 逐页兼容性扫描(Core)

**User Story**: As a developer, I verify no Card breaks when glass base stacks with custom classes.

- 逐页(22 个 page.tsx)启动 dev 走查,重点检查:
  - 带 `bg-gradient-to-br from-sage-50` 的 Card:玻璃基底 + 渐变叠加是否合理(预期:渐变变浅,保留色相;若完全不可见或脏,需调整为 `glass-glow` + 语义色边框)
  - 带 `bg-white dark:bg-gray-900` 的 Card:是否与玻璃冲突(预期:被玻璃覆盖;若需保留,加 `bg-solid` variant)
  - 文字对比度:玻璃半透明下文字是否清晰
- 记录异常点,局部调整(优先改自定义类适配玻璃,而非回退玻璃)
- **优先级**:paper/[id](43 Card)、literature/[id](25)、library、upload、statistics、search-local

**Acceptance Criteria**:
- [ ] 22 个页面全部走查,记录并修复异常
- [ ] 玻璃基底与语义渐变卡(sage/clay)和谐共存
- [ ] 文字对比度达标,无不可读

### Task 5: 核心页面 A 布局精修(Integration)

**User Story**: As a researcher, core pages show the stacked layout (hero card + numbered feature cluster), not just default glass Cards.

- 对以下页面的主功能卡区应用 A 布局(大主卡 + 序号次卡群):
  - `upload/page.tsx`:上传主卡大尺寸 + AI 解析/语义索引/文献系统 3 次卡(带 01-03 序号)
  - `paper/[id]/page.tsx`:AI 核心解读为主卡,翻译/问答/笔记为次卡
  - `statistics/page.tsx`:4 张状态卡 + 完成率(参考预览 A 的 duo 布局)
- 次卡加序号水印(衬线 italic,amber-soft 色)+ hover 角装饰显形
- **不破坏现有功能逻辑**,只升级视觉结构

**Acceptance Criteria**:
- [ ] upload/paper/statistics 核心页应用 A 布局
- [ ] 次卡有序号水印 + hover 角装饰
- [ ] 功能逻辑零回归

## Testing Strategy

### 视觉走查(主)
- Task 1-2 后:全站 22 页面快速走查,确认玻璃质感生效
- Task 4 后:逐页详细走查,记录异常并修复
- Task 5 后:核心页面 A 布局对照预览 H 一致度 ≥ 85%

### 功能回归
- 改底层组件风险:确保 Card/Button 的 props 合约不变(variant/size/asChild 不动)
- 关键交互:按钮点击、Card hover、表单提交不受影响

### Edge Cases
- 玻璃基底 + 自定义渐变叠加(可能产生"脏色")
- backdrop-filter 在某些浏览器/低端设备的性能(降级:不支持时回退实色)
- 文字对比度(玻璃半透明下白底文字可能模糊)
- 深色模式(本期不做深色,但玻璃在深色下的表现记录备用)

## Acceptance Criteria

- [ ] Card.tsx + Button.tsx 底层升级,全站 150+ Card / 100+ Button 自动跟随
- [ ] 全站 22 页面玻璃质感统一,无"半新半旧"割裂
- [ ] 全局暖光背景流动,卡片静止(只 hover 抬升)
- [ ] primary 按钮有琥珀扫光,hover 抬升
- [ ] 核心页面(upload/paper/statistics)应用 A 堆叠布局
- [ ] 文字对比度达标,玻璃 + 语义渐变和谐
- [ ] 功能零回归,props 合约不变
- [ ] `npm run typecheck && npm run lint && npm run build` 通过

## Validation Commands

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run dev` → 逐页走查 22 个 page.tsx
- 对照 `design-previews/H-fusion-glass-stacked.html` 视觉一致性

## Notes

- **底层升级是核心**:本 SPEC 的精髓是"改 2 个文件,全站 150+ 卡片跟随"。这不是偷懒,是唯一可行的全站统一方案。逐页改 150 个会失控。
- **兼容性风险真实存在**:150+ Card 里有自定义类(尤其 paper 详情页的 sage/clay 渐变卡),Task 4 必须认真逐页验证,不能假设底层改完就完美。
- **静止是用户明确要求**:背景流动 + 卡片静止 + hover 微抬。不要给 Card 加 float/floaty 持续动画。
- **不引入新依赖**:玻璃态用纯 CSS(backdrop-filter + mask),保持 shadcn 体系。
- **深色模式**:本期不做(.dark 仍是死代码),但玻璃在深色下的视觉记录备用,未来接 next-themes 时参考。
- **预览 H 是视觉契约**:`design-previews/H-fusion-glass-stacked.html` 是唯一基准,实施时对照。
- **范围控制**:登录/注册页优先级低,可最后处理或跳过。聚焦用户高频页(upload/paper/search-local/statistics/library)。
