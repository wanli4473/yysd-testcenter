# 优益思达学习中心 · YYSD Learning Center

一个**纯静态**的综合英语学习网站。学生浏览三大板块 → 进入模考/学习/练习内容 → 交卷自动批改出分；
老师只需把 HTML 文件**拖到 GitHub 网页上**即可上线，**全程无需编程、无需命令行**。

> 每份内容（模考卷 / 学习册 / 练习题）都是自带批改的 HTML 文件。本网站负责：品牌外观、板块分类、内容列表、考场/学习界面、计时、成绩记录。

---

## 🗂️ 三大板块

| 板块 | 科目 |
|------|------|
| 🎯 **模考区** (mock) | 雅思 ielts · PTE pte · 托福 toefl |
| 📚 **学习区** (study) | 语法 grammar · 单词 vocab |
| ✏️ **练习区** (practice) | 雅思 ielts · PTE pte · 托福 toefl |

---

## 📂 项目结构

| 路径 | 作用 |
|------|------|
| `index.html` | 首页 —— 三大板块入口 + 最新上传 |
| `zone.html?zone=mock` | 板块页 —— 按科目分组展示内容（mock/study/practice） |
| `exam.html?id=…` | 内容查看器 —— 在带计时的界面中打开模考/学习/练习 |
| `results.html` | 我的成绩 —— 记录每次得分（存浏览器本地） |
| `admin/index.html` | 管理后台 —— 上传指引 + 打标签工具 |
| `library/<板块>/<科目>/` | **按文件夹分类存放内容**（见下） |
| `library/manifest.json` | 内容索引，**自动生成，请勿手改** |
| `scripts/build_manifest.py` | 扫描 `library/` 重建索引的脚本 |
| `.github/workflows/build-manifest.yml` | 上传后自动重建列表的 GitHub Action |
| `assets/` | 样式与脚本（`config.js` 含板块/科目定义） |

---

## 🚀 让网站上线（一次性设置）

1. 把本项目推送到 GitHub 仓库。
2. 仓库 **Settings → Pages** → Source 选 `Deploy from a branch`，分支 `main`、目录 `/ (root)`，保存。
3. 约 1 分钟后得到网址 `https://<用户名>.github.io/<仓库名>/` —— 这就是发给学生的链接。

---

## 🗃️ 内容按文件夹分类（核心）

`library/` 下按「板块/科目」分成文件夹，**文件放在哪个文件夹，就归到哪个分类**——无需任何标签：

```
library/
├── mock/        🎯 模考区
│   ├── ielts/     雅思模考
│   ├── pte/       PTE模考
│   └── toefl/     托福模考
├── study/       📚 学习区
│   ├── grammar/   语法学习
│   └── vocab/     单词学习
└── practice/    ✏️ 练习区
    ├── ielts/     雅思练习
    ├── pte/       PTE练习
    └── toefl/     托福练习
```

## ➕ 上传新内容（日常操作 · 无需编程）

1. 打开 **管理后台** → 在「选择分类上传」中点对应分类的 **「📤 上传到这里」**（直接打开该文件夹的 GitHub 上传页）。
2. 拖入 HTML → 点绿色 `Commit changes`。
3. 完成！系统**自动重建列表**（约 1 分钟），刷新前台即可在对应分类看到。

删除内容：进入对应文件夹，打开文件 → 右上角垃圾桶删除即可。

---

## 🏷️ 内容标签（全部可选）

分类由**文件夹**决定，无需标签。若想自定义显示的标题/时长/简介，可在 `<head>` 加：

```html
<meta name="exam:title"       content="学术高频词 第二组">
<meta name="exam:duration"    content="0">       <!-- 分钟，0=不限时 -->
<meta name="exam:description" content="50 个高频学术词。">
```

> 如把文件放在 `library/` 根目录（不推荐），可用 `exam:zone` / `exam:subject` 标签指定分类。

## 📊 成绩自动同步（可选）

批改算出分数后加一行，即可把分数同步到「我的成绩」：

```js
window.parent.postMessage({ type: "yysd:score", score: 32, total: 40, band: 7 }, "*");
```

参考 `library/` 内的示范文件（语法、单词、阅读练习、入学模考）。

---

## 🧪 本地预览

不要直接双击打开 `index.html`，请用本地服务器：

```bash
cd "yysd test center"
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080
```
