# YYSD Design Rules

优益思达前端质感约定。目标不是仿 iOS，而是：**内容像纸，壳像玻璃，交互像物理；考场保持官方工具感。**

核心句：界面像身体的延伸——按下立刻有反应，运动从当前值出发，带着速度，随时可打断。

---

## 1. 三层人格（勿混用）

| 层 | 性格 | 范围 |
| --- | --- | --- |
| **内容** | 象牙纸、沉静、可读 | 真题、单词、报告、Hub 正文 |
| **壳** | 轻霜化、浮在内容上 | 顶栏、底栏、Drawer、确认 / Sheet |
| **考场** | 功利、可信、少装饰 | CDT 及防切屏 —— **不要苹果化** |

新 UI 先问：这是内容、壳，还是考场？

---

## 2. 材料（只许两种）

1. **Paper** — `#f6f3ec` / `#fffcf7` + 极轻纸纹。承载阅读。  
2. **Chrome** — 半透明 + `blur(20px) saturate(180%)` + 亮边高光。承载导航与决策。

- 禁止第三种材料（紫渐变、重投影装饰卡、到处玻璃）。  
- 更大表面更「厚」：Sheet > 卡片 > Chip。  
- 尊重 `prefers-reduced-transparency`：降级为实心底。  
- Token：`--chrome-bg` / `--chrome-blur` / `--chrome-saturate` / `--chrome-edge`。

---

## 3. 字体

| 用途 | 规则 |
| --- | --- |
| 展示标题 | Playfair / 宋体系；字距 `-0.02em`～`-0.03em`；行高 ~1.1 |
| 界面正文 | 系统字体 + PingFang；行高 ~1.5；字距近 0 |
| 小标签 | 略加 tracking；字重略提（霜化底上要可读） |

- **壳层禁止 Inter 及第二套无衬线网红体。**  
- 层级靠「字重 + 字号 + 行高」成套，不只放大字号。  
- `font-optical-sizing: auto`。

---

## 4. 交互物理

### 必须
1. **按压即时** — 反馈在 pointer-down（约 100ms），不是等 click。Token：`--press-ms` / `--press-scale`。  
2. **同路径进出** — 右进右出、底进底出；用 `YYSD_SURFACE`，禁止硬切 `hidden`。  
3. **空间锚定** — 面板从触发源展开（`transform-origin` + `.is-surface-source`）；手机 Sheet 锚定底部。  
4. **默认可打断** — 过渡中允许反向意图；勿长时间 `pointer-events: none`。  
5. **决策用品牌 Sheet** — 壳层用 `YYSD_CONFIRM` / `YYSD_ALERT` / `YYSD_ASK`，不用系统 `confirm`/`alert`（CDT 例外可保留）。

### 弹簧
- 默认：无弹跳（critically damped）。  
- 仅「甩出去」的动量手势可轻微 overshoot。  
- 菜单 / 淡入禁止弹跳。

### Hover
- 抬起、悬停特效仅限 `@media (hover: hover)`。  
- 触控只保留 `:active` 按压。

### 整页转场（Silk）
- Hub 内 hop：短、轻（opacity，~100ms）。  
- Scene：短 fade，**禁止 blur**；二次意图立刻导航。  
- Sheet：支持下拉关闭（跟手 + 速度投影）；学习工具要快而连。

---

## 5. 布局与信息

- 每区块一件事：一个主标题 +（可选）一句说明 + 一组主操作。  
- 卡片是交互容器，不是装饰；去掉边框/阴影后仍清楚 → 不该是卡。  
- Landing / 首屏少卡；Hub 可用卡。  
- Navy = 结构与主操作；Gold = 稀用强调；技能色只作细条 / 图标。  
- 顶栏 / 底栏用**滚动边缘渐隐**，少用硬 1px 分割线。  
- Sheet / Drawer：霜化纸 + 进出时 blur 与 scale 同到（materialize）。  
- 同页内容切换：短 opacity cross-fade（`YYSD_UI_SWAP`），少位移。  
- 尊重 `prefers-reduced-motion` / `prefers-reduced-transparency`。

---

## 5b. Hub 密度（单词 / 雅思）

像 Apple 教育产品，不像营销落地页。

| 规则 | 约定 |
| --- | --- |
| 配色 | 冷近白 `#f5f5f7` + 白表面 + 海军主操作；金极稀 |
| 标题 | 一级约 28–34px 系统无衬线；禁止巨型 Playfair 撑留白 |
| 列表语言 | `.yysd-group` / `.yysd-row` inset 分组列表；一种语言贯穿 |
| 结构 | 一个主 CTA + 若干组；禁止双大标题 / bento 拼盘 / 色脊横条散落 |
| 密度 | 组间距 ~20–28px，行高 ~48–56px |

---

## 6. 上线前五问

1. 这是内容、壳，还是考场？性格对了吗？  
2. 按下有没有在 ~100ms 内说话？  
3. 进出是同一条路径吗？  
4. 能不能少一层卡片 / 边框 / 阴影？  
5. 这里的动效是在表达物理，还是在表演？——表演则删。

---

## 7. 实现锚点（已有代码）

| 能力 | 位置 |
| --- | --- |
| 设计 token | `assets/css/style.css` `:root` |
| 表面开关 | `YYSD_SURFACE` → `assets/js/ui.js` |
| 品牌确认 | `YYSD_CONFIRM` / `YYSD_ALERT` / `YYSD_ASK` → `assets/js/ui.js` |
| 分页转场 | `assets/js/page-transit.js` |
| 自检 | `node scripts/check_surface.js` · `node scripts/check_apple_shell.js` |

---

## 8. 不做清单

- CDT 按钮 / void lock 加 bounce 或毛玻璃「假高级」  
- 全站上 spring 动画库（无示范件需求前）  
- 无动量场景的 overshoot  
- 叠两层浅半透明（可读性崩）  
- 为炫技加的整页 blur

---

*修订时只改规则，不堆案例。新模式先过「五问」，再进代码。*
