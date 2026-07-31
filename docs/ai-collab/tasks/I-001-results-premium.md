# I-001 — results.html 接入 page-premium 壳

**状态：** done（Cursor 2026-07-22）

## 目标

学生活路径 dashboard → zone → **results** 视觉连贯，与 premium 顶栏/背景一致。

## 允许改动

- `results.html`：`<head>` 字体/CSS；`body` class
- `assets/css/dashboard-premium.css`：`.page-premium` 下 results 页头（可选）

## 禁止

- `results.html` 内联 script 逻辑
- `config.js` results 数据结构

## 变更

1. 增加 Inter Google Font link（与 dashboard 一致）
2. 增加 `dashboard-premium.css` link
3. `body class="home-minimal page-premium"`
4. page-head eyebrow 改用 `dash-premium-eyebrow`（可选）

## 验收

- URL：`/results.html`（登录态）
- 1280px：topbar 毛玻璃、背景 `#fbf8f1`
- 375px：mobile-tabs 正常；hero stack 不变
- `?tenant=ease`：品牌名/logo 正常

## 回滚

移除 premium CSS link 与 `page-premium` class。
