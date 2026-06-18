# 优益思达雅思考试中心 · YYSD IELTS Test Center

一个**纯静态**的雅思在线模考网站。学生浏览试卷列表 → 进入考场答题 → 交卷自动批改出分；
管理员只需把试卷 HTML **拖到 GitHub 网页上**即可上线，**全程无需编程、无需命令行**。

> 试卷本身自带自动批改功能（HTML 文件）。本网站负责：品牌外观、试卷列表、考场界面、计时、成绩记录。

---

## 📂 项目结构

| 路径 | 作用 |
|------|------|
| `index.html` | 学生首页 —— 模考列表（按科目筛选） |
| `exam.html` | 考场页 —— 在带计时的界面中打开试卷 |
| `results.html` | 我的成绩 —— 记录每次模考分数（存在浏览器本地） |
| `admin/index.html` | 管理后台 —— 上传指引 + 试卷打标签工具 |
| `exams/` | **所有试卷 HTML 放这里**（管理员上传的目录） |
| `exams/manifest.json` | 试卷列表索引，**自动生成，请勿手改** |
| `scripts/build_manifest.py` | 扫描 `exams/` 重建 `manifest.json` 的脚本 |
| `.github/workflows/build-manifest.yml` | 上传试卷后自动重建列表的 GitHub Action |
| `assets/` | 样式与脚本 |

---

## 🚀 如何让网站上线（一次性设置）

1. 把本项目推送到一个 GitHub 仓库（建议命名 `yysd-testcenter`）。
2. 在仓库 **Settings → Pages** 中，把 **Source** 设为 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`，保存。
3. 等待约 1 分钟，GitHub 会给出网址，形如
   `https://<你的用户名>.github.io/yysd-testcenter/` —— 这就是发给学生的链接。

---

## ➕ 如何上传一套新模考（日常操作 · 无需编程）

1.（推荐）打开网站的 **管理后台** → 用「整理试卷」工具给试卷打好标签，下载新文件。
2. 进入 GitHub 仓库的 **`exams` 文件夹** → `Add file` → `Upload files` → 拖入试卷 HTML → `Commit changes`。
3. 完成！系统会**自动重建列表**（约 1 分钟），刷新首页即可看到新试卷。

删除试卷：在 `exams` 文件夹删除对应 HTML 文件即可，列表自动更新。

---

## 🏷️ 试卷标签（可选）

在试卷 HTML 的 `<head>` 中加入以下标签，可控制它在列表中的显示方式（不加则自动猜测）：

```html
<meta name="exam:title"       content="学术类阅读模考 1">
<meta name="exam:type"        content="reading">   <!-- listening/reading/writing/speaking/full -->
<meta name="exam:category"    content="academic">  <!-- academic / general -->
<meta name="exam:duration"    content="60">        <!-- 分钟，0=不限时 -->
<meta name="exam:description" content="3 篇文章共 40 题。">
```

## 📊 成绩自动同步（可选）

试卷批改算出分数后，加一行即可把分数同步到「我的成绩」页：

```js
window.parent.postMessage({ type: "yysd:score", score: 32, total: 40, band: 7 }, "*");
```

参考内置示范卷 `exams/sample-academic-reading-1.html`。

---

## 🧪 本地预览

因为浏览器安全策略，**不要直接双击打开 `index.html`**，请用本地服务器：

```bash
cd "yysd test center"
python3 -m http.server 8080
# 然后浏览器访问 http://localhost:8080
```
