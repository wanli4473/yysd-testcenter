# 优益思达国际课程中心

官网 + 题库 + 教师端 + 机考 app + 桌面端。设计看 @YYSD-DESIGN-RULES.md。本机部署看 @AGENTS.local.md。

## 这是什么

- 官网 / Hub：根目录 `index.html`、`assets/`、`library/`
- 新托福机考：`app/`（HIT Sets 在 `app/library/toefl/`）
- 网站日期卷：`library/toefl/`（不要把 HIT set JSON 丢进这里）
- 后端：`server/server.js`（Node，多租户、座位、词书、题库）
- 桌面端：`desktop/`（Electron）
- 申请子站：`admission/`（Next.js）
- 题库页：`tiku/`

首页分区：单词区 → 练习区 → 真题区。共享分类在 `assets/js/config.js`。

## 设计（始终遵守）

内容像纸，壳像玻璃，交互像物理；考场保持官方工具感。

- 内容：象牙纸 `#f6f3ec` / `#fffcf7`
- 壳：半透明 + `blur(20px) saturate(180%)`，token `--chrome-bg` / `--chrome-blur`
- 考场 / CDT：功利、可信、少装饰 — **不要苹果化**
- Token：`assets/css/style.css` `:root`
- 表面开关：`YYSD_SURFACE` → `assets/js/ui.js`
- 品牌确认：`YYSD_CONFIRM` / `YYSD_ALERT` / `YYSD_ASK`，不用系统 `confirm`/`alert`（CDT 例外）
- 自检：`node scripts/check_surface.js` · `node scripts/check_apple_shell.js`

新 UI 先问：这是内容、壳，还是考场？不要做第二套播放器或第二套视觉系统。

## 题库硬规则（摘要）

完整规则在 `.qoder/rules/toefl-papers.md` 和 `toefl-listening.md`。

- Writing sentence `bank` 不得与 `answer` 同序。用 `scripts/toefl_sent.py`。默认门禁包含 `bank-*-*.json`。
- Bank chips 禁止 Titlecase（`Do`/`Have` 会漏出首词）。手写 writing：一 PNG 一题，绿条只核对。
- Complete the Words = 每个缺字母一个空。学术词汇题干必须引用原文单词。
- 日常邮件/通知/课表必须有换行或结构化 layout。
- Listen and Repeat：一句一音频 → 3 秒想 → beep → 8 秒录。作答中不显示 `sample`。
- 听力配图用正式考试的白底人物照，按说话人口音配人。对话两人对谈；听句选回应一个人（常拿手机）；通知和讲座各一个人站立。图里不要场景、不要文字。同一人复用同一张。路径 `library/toefl/img/listen/`，写入 `task.image`。
- 过门禁：`node scripts/check_toefl_paper.js`。不过不要上线。
- 不要 `rsync --delete` 官网。

## 不要做

- 第二套阅读 / 听力 / 口语 / 写作引擎
- 全站上 spring 动画库
- CDT 按钮加 bounce 或毛玻璃
- 把密钥写进仓库
