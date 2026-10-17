---
trigger: always_on
---

# YYSD 前端质感

目标不是仿 iOS，而是：**内容像纸，壳像玻璃，交互像物理；考场保持官方工具感。**

完整条文见仓库根目录 `YYSD-DESIGN-RULES.md`。冲突时以该文件为准。

## 三层人格（勿混用）

| 层 | 性格 | 范围 |
| --- | --- | --- |
| **内容** | 象牙纸、沉静、可读 | 真题、单词、报告、Hub 正文 |
| **壳** | 轻霜化、浮在内容上 | 顶栏、底栏、Drawer、确认 / Sheet |
| **考场** | 功利、可信、少装饰 | CDT 及防切屏 — 不要苹果化 |

新 UI 先问：这是内容、壳，还是考场？

## 材料（只许两种）

1. Paper — `#f6f3ec` / `#fffcf7` + 极轻纸纹。承载阅读。
2. Chrome — 半透明 + `blur(20px) saturate(180%)` + 亮边高光。承载导航与决策。

禁止第三种材料（紫渐变、重投影装饰卡、到处玻璃）。

## 交互物理

- 按压即时：反馈在 pointer-down（约 100ms），不是等 click。
- 同路径进出：右进右出、底进底出；用 `YYSD_SURFACE`，禁止硬切 `hidden`。
- 空间锚定：面板从触发源展开。
- 默认可打断：过渡中允许反向意图。
- 决策用品牌 Sheet：`YYSD_CONFIRM` / `YYSD_ALERT` / `YYSD_ASK`。
- Hover 特效仅限 `@media (hover: hover)`。触控只保留 `:active`。

## 实现锚点

- Token：`assets/css/style.css` `:root`
- 表面：`assets/js/ui.js`
- 分页转场：`assets/js/page-transit.js`
- 自检：`node scripts/check_surface.js` · `node scripts/check_apple_shell.js`

## 不做

- CDT 按钮 / void lock 加 bounce 或毛玻璃
- 全站上 spring 动画库
- 无动量场景的 overshoot
- 叠两层浅半透明
- 为炫技加的整页 blur
- 第二套视觉系统或第二套播放器
