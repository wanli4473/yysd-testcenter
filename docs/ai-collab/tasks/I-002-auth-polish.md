# I-002 — Auth 表单 focus 与 auth-card 视觉

**状态：** done

## 目标

login/register 输入框 focus 与 premium 表单一致；auth-card 边框更清晰。

## 允许改动

- `assets/css/style.css`：`.auth-card`、`.auth-field input:focus-visible`

## 禁止

- login.html / register.html 结构
- auth.js

## 变更

```css
.auth-card { border: 1px solid var(--border); box-shadow: var(--shadow-paper); }
.auth-field input:focus-visible { border-color: var(--brand-gold); box-shadow: 0 0 0 3px color-mix(...); outline: none; }
```

## 验收

- `/login.html` · `/register.html`
- Tab 到输入框可见 gold ring
- 1280 / 375

## 回滚

删除新增 CSS 规则。
