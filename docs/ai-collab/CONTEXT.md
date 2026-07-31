# YYSD 学习平台 — 项目地图（CONTEXT）

> Task D-001 · 生成：2026-07-22 · 维护：Kimi 刷新 / Cursor 初版

## 1. 产品一句话 & 用户

**一句话：** 优益思达国际课程中心 — 雅思与 A-Level 备考的「学习 · 练习 · 模考」一站式静态 Web 平台，支持多机构白标子域。

| 用户 | 入口 | 核心页面 |
|------|------|----------|
| 学生 | `login.html` / `register.html` | `dashboard.html` → `zone.html` → `exam.html` → `results.html` |
| 教师 | `teacher-login.html` / `teacher-register.html` | `teacher.html` · `teacher-calendar.html` · `admin-assign.html` |
| 平台超管 | 总部 `platform.html` | 机构 CRUD、密钥、到期关停 |

试点租户示例：`ease.youyisida.com`（见 `docs/ease-onboarding.md`）。

---

## 2. 信息架构（文字版）

```
index.html（公开首页）
├── login / register / forgot-password
├── dashboard.html（学生待办 · premium 壳）
│   └── student-calendar.js → /api/student/calendar
├── zone.html?zone=study|practice|mock（三区 · premium 壳）
│   ├── study → library/study/* · vocab · saved-words · wrong-words
│   ├── practice → library/practice/*
│   └── mock → cambridge.html · alevel.html · exam 入口
├── exam.html（考试壳）
│   ├── ?cdt=1 → CDT 机考壳（exam-cdt.js/css）· 方案 B：剑桥 L/R/W 练习+模考最终一律走此壳
│   ├── 无 cdt → 品牌 viewer（专项/过渡；B1 后剑桥真题不再走此路径）
│   └── iframe 加载 library/mock/* HTML
├── cdt-report.html（套题三科报告）
├── results.html（本地 + 云端成绩）
├── profile.html · ai-tutor.html · speaking-*.html（口语独立，不进 CDT）
├── teacher.html · teacher-calendar.html（premium 壳）
└── platform.html（总部主控 · 超管）

suspended.html ← 租户到期跳转
```

---

## 3. 核心页面清单（≥25）

| 路径 | 角色 | 主要 JS | 主要 CSS | page-premium |
|------|------|---------|----------|--------------|
| `index.html` | 公开 | home.js, config.js, auth.js, nav.js | style.css, mascot.css | 否 |
| `dashboard.html` | 学生 | dashboard.js, student-calendar.js | style + dashboard-premium + mascot | **是** |
| `zone.html` | 学生 | zone.js, ai-word.js, config.js | style + dashboard-premium + ai-tutor | **是** |
| `exam.html` | 学生 | exam.js, exam-bridge.js | style + exam-shell.css | 否 |
| `results.html` | 学生 | inline + config.js | style + dashboard-premium（I-001 后） | **是** |
| `login.html` | 公开 | auth.js, nav.js | style.css | 否 |
| `register.html` | 公开 | auth.js | style.css | 否 |
| `profile.html` | 学生 | auth.js | style.css | 否 |
| `cambridge.html` | 学生 | cambridge.js | style.css | 否 |
| `alevel.html` | 学生 | alevel.js | style.css | 否 |
| `alevel-subject.html` | 学生 | alevel-subject.js | style.css | 否 |
| `alevel-view.html` | 学生 | alevel-view.js | style.css | 否 |
| `vocab.html` | 学生 | vocab-bridge.js | style.css | 否 |
| `saved-words.html` | 学生 | saved-words.js | style.css | 否 |
| `wrong-words.html` | 学生 | wrong-words.js | style.css | 否 |
| `ai-tutor.html` | 学生 | ai-tutor.js | style + ai-tutor.css | 否 |
| `speaking.html` | 学生 | speaking-common.js | style.css | 否 |
| `speaking-select.html` | 学生 | speaking-common.js | style.css | 否 |
| `speaking-session.html` | 学生 | speaking-session.js | style.css | 否 |
| `teacher.html` | 教师 | teacher.js, teacher-auth.js | style + dashboard-premium | **是** |
| `teacher-calendar.html` | 教师 | teacher-calendar.js | style + dashboard-premium | **是** |
| `teacher-login.html` | 教师 | teacher-auth.js | style.css | 否 |
| `teacher-register.html` | 教师 | teacher-auth.js | style.css | 否 |
| `admin-assign.html` | 管理员 | admin-assign.js | style.css | 否 |
| `platform.html` | 超管 | platform.js | style.css | 否 |
| `suspended.html` | 租户 | tenant-boot only | style.css | 否 |
| `calendar.html` | 学生 | student-calendar.js | style.css | 否 |
| `forgot-password.html` | 公开 | auth.js | style.css | 否 |

**壳页面 vs 内容 HTML：**

- **壳页面：** 根目录 `*.html`，负责导航、auth、API、iframe 容器
- **内容 HTML：** `library/mock/`、`library/practice/`、`library/study/` 内套题（由 manifest 索引，`config.js` CONTENT_VER 控缓存）

---

## 4. 设计系统摘要

### 4.1 `style.css` `:root` token（节选）

| Token | 值 | 用途 |
|-------|-----|------|
| `--brand-navy` | `#07192f` | 主色、nav active 底 |
| `--brand-gold` | `#c7a45d` |  accent、eyebrow |
| `--brand-ivory` / `--bg` | `#f7f3ea` / `#f6f3ec` | 页面底 |
| `--radius-lg` | `20px` | 卡片圆角 |
| `--shadow-paper` | inset + 软阴影 | 纸质感卡片 |
| `--font-serif` | Playfair Display | 标题 editorial |
| `--c-zone-study/practice/mock` | 金 / 灰 /  navy | 三区 accent |

来源：[`assets/css/style.css`](../assets/css/style.css) L7–78。

### 4.2 两表分工

| 文件 | 范围 |
|------|------|
| `style.css` | 全局 minimal-* 壳、首页 hero、auth、exam、footer、mobile-tabs |
| `dashboard-premium.css` | `.page-premium` 内 Inter 字体、topbar 毛玻璃、dash-* 日历/目录、表单 focus 环 |

**规则：** 学生活跃路径（dashboard / zone / teacher）已 premium；成绩、词书、A-Level 列表仍为旧壳 → P1 逐步迁移。

---

## 5. 多租户机制

1. **`tenant-boot.js`（head 同步）：** 非 `yysd` slug 时 `html.tenant-brand-pending` 隐藏 body，防品牌闪现
2. **`auth.js` → `/api/tenant/bootstrap`：** 拉 org name/logo，改 `.minimal-brand__text b`、logo src、`document.title`
3. **slug 解析：** 子域 `{slug}.youyisida.com` 或 `?tenant=`；保留字见 `docs/multi-tenant.md`
4. **到期：** `org.usable === false` → `suspended.html`

**改版约束：** 不在 CSS `content:` 写机构名；标题/ logo 仅 JS 替换。

---

## 6. API 触面（前端 fetch）

| 路径 | 页面/模块 |
|------|-----------|
| `/api/tenant/bootstrap` | auth.js（全站） |
| `/api/auth/me` · login/register | auth.js |
| `/api/student/calendar` | dashboard.js, student-calendar.js |
| `/api/student/assignments/*/meta` | exam.js |
| `/api/calendar/events` | teacher-calendar.js, exam.js |
| `/api/teacher/me` · `/api/teacher/students` | teacher.js |
| `/api/platform/orgs` | platform.js |
| `/api/ai-tutor/*` | ai-tutor.js, exam.js |
| `/api/speaking/grade` | speaking-common.js |
| `/api/health` | speaking-common.js |
| `library/manifest.json`（fetch） | config.js |

后端实现：[`server/server.js`](../server/server.js)。

---

## 7. 内容库 `library/`

```
library/
├── mock/           # 真题：cambridge-listening/reading/writing, alevel/, ielts*
├── practice/       # 练习：changnanju, jingting, shuzi-tingxie, ielts-speaking
└── study/          # 学习：grammar, vocab, vocab-cet4, vocab-special-*
```

`.staging/` 为待入库 Cambridge 21 T2–T4，尚未进 manifest。

---

## 8. 已知设计债务

| # | 问题 | 路径 |
|---|------|------|
| 1 | **双壳并存：** premium（dashboard/zone/teacher）vs 旧 minimal（results/profile/vocab/alevel） | 见 §3 表 |
| 2 | **Auth 页无 Inter：** login/register 仅 Playfair + system | login.html, register.html |
| 3 | **移动端 ≤820px：** top nav 隐藏，依赖 bottom `mobile-tabs`；部分页未加 `has-mobile-tabs` body class | style.css L3694+ · nav.js |
| 4 | **CSS 版本 query 不统一：** 各页 `?v=` 日期各异，缓存 bust 靠人工 | 全部 shell HTML |
| 5 | **results 空状态：** 普通 `.state` 块，视觉弱于 premium dash | results.html L107 |
| 6 | **exam 壳独立：** exam-shell.css 与 premium token 部分脱节 | exam.html |
| 7 | **tenant 首屏：** 非 yysd 子域 body visibility hidden 直到 bootstrap | tenant-boot.js |

---

## 9. 改版优先级

| 级别 | 项 | 理由 |
|------|-----|------|
| **P0** | **雅思 CDT 方案 B**（见 `CDT-PLAN-B.md`） | 老板定调：剑桥听读写 100% 机考肌肉记忆；串行 B0→B5 |
| **P1** | 统一学生活跃路径 premium 壳 | dashboard→zone→results（I-001～005 已完成一轮） |
| **P1** | profile / vocab / saved-words premium 迁移 | 单词区深度使用 |
| **P2** | alevel 列表页 editorial 统一 | 次要路径 |

CDT 进度：B0–B2 完成（2026-07-31）；下一刀 **B3**（DnD 题型）。能力勾选：`CDT-CHECKLIST.md`。

---

## 10. 线上 vs 本地

| 维度 | 本地 | 线上 |
|------|------|------|
| 租户 | `localhost` → yysd；`?tenant=ease` 模拟 | `ease.youyisida.com` 真实 bootstrap |
| API | 需启 `server/` | 生产 API 同域 |
| 内容 | `.staging/` 可见 | 未部署 staging |
| 品牌 | 默认优益思达 logo | ease 已换 Logo（ease-onboarding） |

**验证建议：** 本地 `python -m http.server` + 另终端 `node server/server.js`；租户用 `?tenant=ease` 或 hosts 指向。
