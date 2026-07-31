# I-004 — results 空状态 premium 卡片

**状态：** done

## 目标

无成绩时 `.results-empty` 从 plain state 升级为纸感卡片。

## 允许改动

- `assets/css/dashboard-premium.css`：`.page-premium .results-empty` 及子元素

## 禁止

- results.html inline script 模板字符串（除非仅加 class `results-empty`）

## 变更

- results inline：空状态 div 增加 class `results-empty`（若尚未有）
- CSS：padding、border、shadow-paper、居中 typography

## 验收

- 清空 localStorage 成绩 → `/results.html` 见卡片化空状态
- CTA 按钮间距保持

## 回滚

删除 dashboard-premium 中 `.results-empty` 规则。
