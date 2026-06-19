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
| `library/` | **所有内容 HTML 放这里**（老师上传的目录） |
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

## ➕ 上传新内容（日常操作 · 无需编程）

1.（推荐）打开 **管理后台** → 用「整理内容」工具选好**板块 + 科目**、填标题，下载新文件。
2. 进入 GitHub 仓库 **`library` 文件夹** → `Add file` → `Upload files` → 拖入 HTML → `Commit changes`。
3. 完成！系统**自动重建列表**（约 1 分钟），刷新前台即可看到。

删除内容：在 `library` 文件夹删除对应 HTML 文件即可，列表自动更新。

---

## 🏷️ 内容标签（可选）

在 HTML 的 `<head>` 中加入以下标签控制归类与显示（不加则自动猜测）：

```html
<meta name="exam:title"       content="雅思全真模考（第四卷）">
<meta name="exam:zone"        content="mock">    <!-- mock / study / practice -->
<meta name="exam:subject"     content="ielts">   <!-- 模考/练习: ielts pte toefl ｜ 学习: grammar vocab -->
<meta name="exam:duration"    content="0">       <!-- 分钟，0=不限时 -->
<meta name="exam:description" content="3 篇文章共 40 题。">
```

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
