# 优益思达学习中心

雅思与国际课程（A-Level 等）在线备考平台。线上站点：[youyisida.com](https://youyisida.com)

静态前端 + Node API（手机号登录、成绩同步、教师布置、AI 能力等）。内容以 `library/` 下自带批改的 HTML 试卷为主，外层提供品牌壳、计时考场（CDT）、任务中心与教师端。

## 学生端

| 入口 | 说明 |
|------|------|
| 单词 | 高中 / 四级 / 雅思听读写专项词书、分类词库、错题本 |
| 雅思真题 | 剑桥听力 / 阅读 / 写作；补弱 Section·Passage；单项模考；全套模考（CDT 机考壳） |
| 练习 | 长难句、数字听写、口语练习等 |
| 国际课程 | A-Level 等资料入口 |
| 任务中心 | 教师布置的作业、日程与待办 |
| 口语 / AI | 口语练习、写作 AI 批改（额度受限） |

全套模考结束进入三科成绩报告（`cdt-report.html`）；交卷等待时有加载提示。

## 教师端

- 登录：`teacher-login.html`
- 日历布置：`teacher-calendar.html` — 按类型（单词 / 补弱 / 单项模考 / 全套）下钻勾选，支持上传自有 HTML
- 学生诊断与其它教师页见仓库内 `teacher-*.html`

## 技术结构

```
├── *.html                 # 站点页面（首页、考场、单词、教师端等）
├── assets/                # CSS / JS（config 分类、exam CDT、auth）
├── library/               # 题目与词书 HTML（按 zone/subject 分目录）
│   └── manifest.json      # 内容索引（脚本/CI 生成，勿手改）
├── server/                # Express API + SQLite（登录、成绩、日历、AI 代理等）
├── rankings/              # 排行榜子应用（可选）
├── admission/             # 招生相关子应用（可选）
└── scripts/               # manifest、词库、自检脚本
```

API 依赖见 [`server/package.json`](server/package.json)；环境变量模板见 [`server/.env.example`](server/.env.example)。生产部署脚本在 [`server/deploy/`](server/deploy/)。

## 本地预览

前端不要直接双击打开 HTML，需本地静态服务；API 另开进程。

```bash
# 前端
python3 -m http.server 8080
# → http://localhost:8080

# API（需 Node ≥ 18）
cd server && cp -n .env.example .env && npm i && npm start
# → 默认 http://localhost:3000
```

前端如何指向本地 API，以 `assets/js/auth.js` / 环境配置为准。

## 内容与成绩

- 新题放入 `library/<zone>/<subject>/`，提交后由 Actions 或 `scripts/build_manifest.py` 重建 `manifest.json`。
- 可选 meta：`exam:title` / `exam:duration` / `exam:description`。
- 试卷批改后向父页同步分数：

```js
parent.postMessage({ type: "yysd:score", score: 32, total: 40, band: 7 }, "*");
```

写作模考另可附带 `writingTask1` / `writingTask2` 等字段供报告页使用。

## 相关文档

- 剑桥听力内容说明：[`library/mock/cambridge-listening/README.md`](library/mock/cambridge-listening/README.md)
- A-Level 库：[`library/mock/alevel/README.md`](library/mock/alevel/README.md)
