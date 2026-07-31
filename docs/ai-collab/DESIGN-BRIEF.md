# 设计约束与审计（DESIGN-BRIEF）

> Kimi 维护审计章节；Cursor 参考 tasks/ 实现

## 品牌规范（不可破）

- **Palette：** navy `#07192f` · gold `#c7a45d` · ivory `#f7f3ea`
- **Typography：** Playfair（hero/标题）· Inter（`.page-premium` 正文 UI）
- **Motif：** 金色 star crumb、纸感 `--shadow-paper`、细金边 `rgba(199,164,93,.34)`
- **禁止：** 紫渐变 hero、三列 icon SaaS 模板、CSS 写死机构名

## 组件 class 体系

| 前缀 | 用途 |
|------|------|
| `minimal-*` | 全站 shell：topbar、nav、page-head、footer |
| `page-premium` | body 级开关，启用 dashboard-premium.css |
| `dash-*` | 日历、目录、teacher 卡片 |
| `auth-*` | 登录注册布局 |
| `results-*` | 成绩 hero / 空状态 |

---

## Audit 2026-07-22

### index.html

**A. 保留：** editorial hero、SVG motif、双列 home-dual 入口  
**B. 问题：** 与 logged-in premium 路径风格跳跃；hero 动画对 `prefers-reduced-motion` 已部分处理  
**C. 改法：** 保持首页 editorial，不在此页加 page-premium  
**D. premium 壳：** 否（ intentional 营销页）

### dashboard.html

**A. 保留：** dash-premium-eyebrow、日历 hero、focus 条动画  
**B. 问题：** 与 results 返回后视觉不一致（已用 I-001 缓解）  
**C. 改法：** 维持；作为 premium 参考页  
**D. premium 壳：** 是（参考标准）

### zone.html（study / practice / mock）

**A. 保留：** 目录卡片、catalog-search、zone accent  
**B. 问题：** page-head 与 dashboard  eyebrow 命名不统一（`minimal-eyebrow` vs `dash-premium-eyebrow`）  
**C. 改法：** P2 统一 eyebrow class；暂不拆 JS  
**D. premium 壳：** 是

### login.html / register.html

**A. 保留：** auth-aside  navy 渐变侧栏、双栏布局  
**B. 问题：** auth-card 阴影偏旧；input focus 无 ring；无 Inter  
**C. 改法：** I-002 — style.css `.auth-card` border + input `:focus-visible`  
**D. premium 壳：** 否（侧栏已足够品牌化）

### exam.html

**A. 保留：** 沉浸 exam-shell、最小干扰  
**B. 问题：** `--brand-*` 与 exam-shell 局部变量未完全对齐  
**C. 改法：** P2 exam-shell.css token 映射  
**D. premium 壳：** 否

### teacher.html / teacher-calendar.html

**A. 保留：** 与 dashboard 一致的 premium topbar  
**B. 问题：** teacher-search 在窄屏换行  
**C. 改法：** P2 flex-wrap 微调  
**D. premium 壳：** 是

### results.html

**A. 保留：** results-hero 统计、timeline band  
**B. 问题：** 缺 page-premium；空状态弱；mobile hero 已 stack 但 empty 仍 plain  
**C. 改法：** I-001 premium 壳 · I-004 空状态卡片  
**D. premium 壳：** **应为是**（I-001 已实施）

---

## Implementation Tasks（首批）

| ID | 目标 | 规模 | 规格文件 |
|----|------|------|----------|
| I-001 | results.html premium 壳 | 小 | [tasks/I-001-results-premium.md](tasks/I-001-results-premium.md) |
| I-002 | auth 表单 focus + card | 小 | [tasks/I-002-auth-polish.md](tasks/I-002-auth-polish.md) |
| I-003 | mobile-tabs 毛玻璃 | 小 | [tasks/I-003-mobile-tabs.md](tasks/I-003-mobile-tabs.md) |
| I-004 | results 空状态 | 小 | [tasks/I-004-results-empty.md](tasks/I-004-results-empty.md) |
| I-005 | page-premium focus-visible | 小 | [tasks/I-005-focus-rings.md](tasks/I-005-focus-rings.md) |

---

## 已完成实现（Cursor 2026-07-22）

- **I-001：** `results.html` 增加 Inter、`dashboard-premium.css`、`body.page-premium`
- **I-002：** `style.css` auth-card 边框/阴影；auth input `:focus-visible` ring
- **I-003：** `style.css` `.mobile-tabs` backdrop + active 背景
- **I-004：** `dashboard-premium.css` `.page-premium .results-empty` 卡片样式
- **I-005：** `dashboard-premium.css` 扩展 `:focus-visible` 到 btn / nav / minimal-nav

Kimi 下一轮请读 WORKLOG + 本节，派 I-006+（建议：profile/vocab premium 迁移、zone eyebrow 统一）。
