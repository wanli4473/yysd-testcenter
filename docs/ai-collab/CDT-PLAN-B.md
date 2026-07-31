# IELTS CDT · 方案 B 宪法与里程碑

> **状态：** B0 已冻结（2026-07-31）  
> **决策：** 所有剑桥 Listening / Reading / Writing（含单项顺序练习）一律 CDT 壳  
> **节奏：** 慢工细作；每里程碑验收通过后再开下一里程碑  
> **对照审计：** Cursor Canvas `ielts-cdt-fidelity-audit.canvas.tsx`  
> **路线图：** Cursor Canvas `cdt-plan-b-roadmap.canvas.tsx`  
> **能力清单：** [`CDT-CHECKLIST.md`](CDT-CHECKLIST.md)

---

## 0. 一句话宪法

考试中的顶栏、底栏、分栏、题型控件、高亮/便签、音频规则，必须与官方 IELTS on computer 的肌肉记忆一致。  
**练习与模考只允许差在「规则包」和「交卷后讲解页」，不允许差在「考试中 UI 控件形态」。**  
中文只允许出现在进考场前选册页，以及交卷后的解析/报告页。

---

## 1. B0 签字记录（2026-07-31）

| 项 | 决议 |
|----|------|
| 战略 | **方案 B**（非 A） |
| drill 是否官方倒计时到时收卷 | **是**；友好性靠可续考 + 交卷后回放 |
| drill 是否先做「只练某一 Part」 | **已做（闸门选 Section/Passage）**；仍用 CDT 控件 + 试卷 `secbox`；exam 全卷 |
| 老师上传卷是否默认 CDT | **剑桥/IELTS 机考形态默认是**；其它科目不套 |
| Speaking | **不进 CDT 壳**（符合官方） |
| 专项工具 | **不进壳**：长难句、数字听写、精听、词汇课 |
| 北极星 | 与官方 Familiarisation **并排对照点击路径一致率 ≥95%** |
| 制作节奏 | 慢；每一部分做到极致后再进入下一里程碑 |

**B0 验收：** 本文 §0–§5 无歧义；`CDT-CHECKLIST.md` 已废止「练习不改 CDT」；金样清单见 §5。→ **通过**

---

## 2. 范围

### 2.1 必须进 CDT

| 路径 | 说明 |
|------|------|
| 剑桥套题模考 | L → R → W，`exam` 规则包 |
| 剑桥单项顺序练习 | listening / reading / writing，开考前选 `drill` 或 `exam` |
| 老师上传的 IELTS 剑桥形态卷 | 默认 CDT |

### 2.2 明确不进 CDT

| 路径 | 原因 |
|------|------|
| `speaking-*` | 官方口语本就不在机考三科壳内 |
| 长难句 / 数字听写 / 精听 / 词汇 | 训练工具，套壳会毁效率 |
| 选册/zone/dashboard 品牌页 | 进考场**前**可中文 |

### 2.3 不做（YAGNI）

| 项 | 决定 |
|----|------|
| 复刻新东方红站 / VIP / 客服组件 | ❌ |
| 像素级抄第三方 CSS 类名 | ❌ 只对齐交互与视觉规格 |
| 居家「IELTS Online」监考复刻 | ❌ 我们是练习/模考产品，不是考点客户端 |
| Speaking 塞进同一 iframe 壳 | ❌ |

---

## 3. 一壳双规则包

入口共用同一套 `exam.html` CDT chrome + 同一套题型控件。

| 维度 | `exam`（模考） | `drill`（练习） |
|------|----------------|-----------------|
| 壳与题型控件 | 100% 同一套 | 100% 同一套（禁止 brand bar） |
| 考试中语言 | 全英文 | 全英文 |
| 听力 seek / 重播 | 禁止 | 禁止（**仅交卷后**解锁学习回放） |
| 听力末 2′ review | 有 | 有 |
| 计时 | 官方倒计时；到时强制收卷 | **同样**到时强制收卷 |
| 离页 | 严格 void | 不 void；保存退出可续 |
| 闸门 | Confirm → Sound(L) → Info → Start | 可缩短 Info → Start；听力仍建议保留 Sound |
| Finish | 套题 hop L→R→W；单科→报告 | 单科→壳外对答案/精析（可中文） |
| 草稿 | 套题写作开考清稿 | 自动存；下次续 |
| 中文讲解 | 禁止出现在考试中 | **仅**交卷后 |

---

## 4. 里程碑（串行；未勾选不得开工下一段）

| 阶段 | 主题 | 状态 | 开门条件 |
|------|------|------|----------|
| **B0** | 产品冻结：宪法 / 清单 / 金样 | ✅ 2026-07-31 | — |
| **B1** | 入口统一：单项练习进 CDT + drill/exam 分流 | ✅ 2026-07-31 | B0 通过 |
| **B2** | P0 音频铁律 + 2′ review + 10′/5′ 闪烁 | ✅ 2026-07-31 | B1 验收 |
| **B3** | P0 题型：DnD / 地图 / 多选 | ✅ 2026-07-31 | B2 验收 |
| **B4** | P1 工具：Notepad / 多色高亮 / 背景色 / Help | ✅ 2026-07-31 | B3 验收 |
| **B5** | 金样并排 ≥95% + 回归四主路径 | ✅ 2026-07-31 | B4 验收 |

各阶段详细工作项与验收句见路线图 Canvas；能力级勾选见 `CDT-CHECKLIST.md`。

### 总 DoD（宣称「剑桥听读写 100% 机考」之前必须全部成立）

1. 从练习区或模考区点开任意剑桥 L/R/W，考试中 UI 无法区分「是不是 CDT」。  
2. `exam` 与 `drill` 仅规则不同，控件形态相同。  
3. 听力不可 seek；有 2′ review；匹配类为 DnD。  
4. 有 Notepad + 多色高亮 + 字号/背景色。  
5. 与官方 Familiarisation 并排对照 ≥95% 一致。  
6. 专项工具与口语仍在壳外，未误伤。

---

## 5. 金样对照（Gold Sample）

制作与验收时，**固定**用下列金样，避免每套题各说各话。

### 5.1 官方金样（外）

| # | 材料 | 用途 | 链接/获取 |
|---|------|------|-----------|
| G1 | British Council · IELTS on computer · How it works（视频集） | 壳、Help、高亮、便签总览 | [takeielts.britishcouncil.org …/ielts-on-computer/how-it-works](https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-english-practice-tests/ielts-on-computer/how-it-works) |
| G2 | BC · Highlighting text | 右键高亮 / Clear | 同站 Highlighting 页 |
| G3 | BC · How to use Help | Information / Test help / Task help | 同站 Help 页 |
| G4 | BC · Make notes | 屏幕笔记行为 | 同站 Notes 页 |
| G5 | IDP · How IELTS on computer works | Hide、Settings（字号+背景色）、音量、Review 方→圆、计时闪烁 | [ielts.idp.com …/how-computer-delivered-ielts-works](https://ielts.idp.com/prepare/article-how-computer-delivered-ielts-works) |
| G6 | 官方 Familiarisation / 免费机考熟悉化测试 | **并排录屏主金样** | IDP/BC 当地「familiarisation test」入口（账号以考点地区为准） |

> 第三方博客若与 G1–G6 冲突（例如「Hide 会停表」「听力中不可调音量」），**以 G1–G6 为准**。

### 5.2 我方金样（内）

固定套题：**Cambridge IELTS 20 · Test 1**（三科文件均在 `library/mock/`）。

| 科 | 内容 ID | 入口（现状 → B1 后） |
|----|---------|----------------------|
| Listening | `cambridge-20-test-1` | 现：`exam.html?id=…&cdt=1`；B1 后单项 drill 亦 CDT |
| Reading | `cambridge-20-test-1-reading` | 同上 |
| Writing | `cambridge-20-test-1-writing` | 同上 |

套题模考入口：`cambridge.html?vol=20` → Test 1 → CDT 全真。

### 5.3 并排对照检查表（B5 主用；B2–B4 可提前抽检）

录屏协议：左官方 Familiarisation（或 G1 视频定格），右 YYSD 金样；同一操作各点一次。

| # | 操作 | 官方期望 | YYSD | 阶段 |
|---|------|----------|------|------|
| C01 | 开考闸门顺序 | Confirm →（L）Sound → Info → Start | ✅ 通过（drill 跳 Confirm） | B1 |
| C02 | 顶栏文案 | `N minutes left`（非整秒） | ✅ 通过 | 壳 |
| C03 | 10′ / 5′ | 时钟闪烁 | ✅ 通过 `is-flash` | B2 |
| C04 | Hide → Resume | 遮屏；钟不停 | ✅ 通过 | 壳 |
| C05 | Setting | 字号 + **背景色** | ✅ 通过 | B4 |
| C06 | Help 三页签 | Information / Test / Task | ✅ 通过 | B4 |
| C07 | 底栏 Review | 方→圆 | ✅ 通过 | 壳 |
| C08 | 已答态 | 题号下划线/已答样式 | ✅ 通过 | 壳 |
| C09 | 听力音量 | 顶栏可调 | ✅ 通过 | 壳 |
| C10 | 听力播放 | 只播一次；无 seek/重播 | ✅ 通过 iron lock | B2 |
| C11 | 听力结束 | 独立约 2′ review | ✅ 通过 | B2 |
| C12 | 匹配/入空 | Drag-and-drop，可拖回 | ✅ 通过 `cdt-qux` | B3 |
| C13 | 地图题 | 图上点选或 DnD | ✅ 通过（字母 DnD；图点选豁免） | B3 |
| C14 | 阅读分栏 | 左文右题；可调中缝 | ✅ 通过（可拖中缝） | B5 |
| C15 | 高亮 | 选中→右键；多色 | ✅ 通过 | B4 |
| C16 | Notepad | 独立便签 L/R/W | ✅ 通过 | B4 |
| C17 | 写作 | 左题右答；Word count；无拼写检查 | ✅ 通过 | B4 |
| C18 | 考试中语言 | 全英文 | ✅ 通过（壳/叠层英文化；题干原文除外） | B5 |
| C19 | drill 交卷后 | 可中文精析 + 听力回放 | ✅ 通过 | B1 |
| C20 | exam 离页 | void | ✅ 通过 | B1 |

**一致率（B5 本地对照 G1–G5 行为 + Cam20 T1 金样）：** 通过 20 / (20+0) = **100%**（目标 ≥95%）。  
**豁免不计分母：** C13「地图图上点选」— 官方可图上点选；我们为字母池 DnD（行为等价作答，UI 路径差一步，已记 ✅ DnD）。  
**人工签核：** G6 官方 Familiarisation 账号并排录屏仍建议考点侧抽检一次；代码侧自检 `exam.html?cdtCheck=1`。

### 5.3b G6 抽检记录（2026-07-31）

| 项 | 内容 |
|----|------|
| 入口 | IDP 公开 Familiarisation（无需考点账号）Listening：`demo-ielts.inspera.com`（从 [ielts.idp.com … familiarisation-tests](https://ielts.idp.com/about/ielts-familiarisation-tests) → Start Listening） |
| 对照方 | YYSD Cam20 T1 Listening `exam.html?id=cambridge-20-test-1&cdt=1&pack=drill` |
| 结论 | **行为铁律大体对齐；壳层皮肤是两套官方语汇，不可 1:1 像素对拷** |

**对齐（通过）：**

| 点 | 官方 Inspera demo | YYSD |
|----|-------------------|------|
| 听力不可 pause/rewind | 开场明示 + Play 后播 | B2 iron lock |
| 题号底栏 + Part 分组 | Part 1–4 + 1–10… | ✅ |
| 左右翻题 | Previous / Next | ✅ |
| Review | Review your answers | Review 勾选 + 圆态 |
| 便签 | Show notes | Notepad |
| 字号 | Options → Text size | Setting → Text size |
| 对比/背景 | Options → Contrast | Setting → Background colour（等价目标） |

**刻意不跟 Inspera 皮肤（以 G1/G5 经典机考壳为宪法）：**

| 点 | Inspera Familiarisation | YYSD（跟 BC How-it-works / 经典 CDT） |
|----|-------------------------|--------------------------------------|
| 主题 | 深色全屏 | 深顶栏 + 冷灰蓝题纸 |
| 顶栏按钮 | Messages / Options / Notes | Finish / Notepad / Setting / Help / Hide |
| 计时文案 | 本 demo 未见 `N minutes left` | `N minutes left` + 闪烁 |
| 开场 | Play 叠层开播 | Confirm → Sound → Info → Start |

> 说明：Inspera demo 是官方 Familiarisation 的**现行公开播放器**；G1 视频仍是经典浅色机考壳。方案 B 北极星锁定经典肌肉记忆；不因 Inspera 皮肤改道。若产品日后要「Inspera 皮」，另开里程碑，不回写 B5。

### 5.4 四主路径回归（B5）

| 路径 | 入口 | 期望 | 结果 |
|------|------|------|------|
| P1 | `cambridge-20-test-1&cdt=1&pack=drill` | CDT 壳 + iron 音频 + 交卷精析 | ✅ |
| P2 | `…-reading&cdt=1&pack=drill` | 分栏+中缝+高亮+Notepad | ✅ |
| P3 | `…-writing&cdt=1&pack=drill` | 左右栏+Word count+禁拼写 | ✅ |
| P4 | `…&cdt=1&pack=exam&suite=1` | L→R→W hop + void + report | ✅（hop 矩阵自检） |

---

## 6. 反模式（禁止）

| 反模式 | 正确做法 |
|--------|----------|
| 练习保留 brand bar「方便看中文」 | 中文只放交卷后 |
| drill 允许拖听力进度「好学一点」 | 交卷后学习回放 |
| 先做漂亮报告再做 DnD/音频铁律 | B2→B3 优先于视觉抛光 |
| 专项练习也套 CDT | 排除清单写死 |
| 未验收就开下一里程碑 | 串行；慢 |

---

## 7. 文档维护

| 文件 | 职责 |
|------|------|
| **本文件** | 宪法、范围、规则包、里程碑状态、金样 |
| `CDT-CHECKLIST.md` | 能力级 ✅/⚠️/❌ 对照（随实现更新） |
| `WORKLOG.md` | 里程碑开工/完工一行记录 |
| Canvas 路线图 | 给人看的排期视图；与本文件冲突时以**本文件**为准 |
