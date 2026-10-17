---
name: yysd-site
description: >
  制作或改优益思达网站与系统。官网 Hub、题库、教师端、新托福机考 app、
  Electron 桌面端、词书、上线。用户提到改首页、做页面、上试卷、改播放器、
  教师端、座位、租户、部署时使用。
---

# 优益思达网站 / 系统

先读 `AGENTS.md` 和 `YYSD-DESIGN-RULES.md`。本机部署看 `AGENTS.local.md`。

## 动手前

1. 这是内容、壳，还是考场？性格不要混。
2. 已有页面 / helper / 播放器能不能复用？禁止第二套引擎。
3. 落地页手感用 `design-taste-frontend`；壳层动效用 `apple-design`；改旧站用 `redesign-existing-projects`。考场不要苹果化。

## 改哪里

| 要做的事 | 去哪 |
| --- | --- |
| 官网 / Hub | `index.html`、`assets/css/style.css`、`assets/js/` |
| 表面 / 确认框 | `assets/js/ui.js`（`YYSD_SURFACE` / `YYSD_CONFIRM`） |
| 分区与科目 | `assets/js/config.js` |
| 新托福机考 | `app/` + `app/library/toefl/` |
| 网站日期卷 | `library/toefl/` |
| 后端 / 座位 / 租户 | `server/server.js` |
| 桌面端 | `desktop/` |
| 题库页 | `tiku/` |

## 硬门禁

- Writing sentence：`bank` 不得与 `answer` 同序。`scripts/toefl_sent.py`。chips 禁止 Titlecase。
- 过门再上：`node scripts/check_toefl_paper.js`
- 听后续说：`conversation` / `announcement` / `lecture` 先放完音频再出题
- Listen and Repeat：一句一音频 → 3 秒想 → beep → 8 秒录。作答中不显示 `sample`
- 不要 `rsync --delete` 官网
- UI 改完在浏览器里点一遍，不是只看截图
