# I-003 — 移动端 bottom tabs 毛玻璃

**状态：** done

## 目标

≤820px 主路径底部 `mobile-tabs` 与 premium topbar 同级质感。

## 允许改动

- `assets/css/style.css`：`.mobile-tabs`、`.mobile-tabs__item.is-active`

## 禁止

- nav.js drawer 逻辑

## 变更

- tabs 容器：`backdrop-filter` + 半透明白底 + 顶边 `var(--border)`
- active item：浅金底 `color-mix(in srgb, var(--brand-gold) 12%, transparent)`

## 验收

- 375px dashboard / zone / results
- active tab 可读；safe-area 仍生效

## 回滚

恢复 `.mobile-tabs` 原 background。
