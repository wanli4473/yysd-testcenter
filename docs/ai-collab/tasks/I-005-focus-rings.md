# I-005 — page-premium 全局 focus-visible

**状态：** done

## 目标

键盘导航在 premium 页可见 focus 环（a11y + 品质感）。

## 允许改动

- `assets/css/dashboard-premium.css`

## 禁止

- 改 `:focus` 去掉 mouse click outline（仅用 `:focus-visible`）

## 变更

```css
.page-premium a:focus-visible,
.page-premium button:focus-visible,
.page-premium .minimal-nav a:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(... var(--ring) ...); }
```

## 验收

- dashboard / zone / results：Tab 遍历 nav 与 btn
- 鼠标点击不出现环（:focus-visible）

## 回滚

删除 focus-visible 规则块。
