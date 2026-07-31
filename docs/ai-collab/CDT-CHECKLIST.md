# IELTS CDT 能力对照 Checklist（方案 B）

> **宪法与里程碑：** [`CDT-PLAN-B.md`](CDT-PLAN-B.md)（B0 已冻结 2026-07-31）  
> **对照基准：** 官方 IELTS on computer（BC/IDP Familiarisation），不以新东方为唯一金样  
> **图例：** `✅` 已对齐 · `⚠️` 有但不像/不全 · `❌` 缺失 · `N/A` 刻意不做  
> **更新规则：** 每完成一个里程碑验收后，改本表对应行；勿再写回「仅模考套壳」旧策略

---

## 策略摘要

| 项 | 决议 |
|----|------|
| 范围 | 剑桥 L/R/W **练习 + 模考** 一律 CDT 壳 |
| 规则 | 一壳双包：`exam` / `drill`（差规则不差控件） |
| 排除 | 口语、长难句、数字听写、精听、词汇 |
| 现状总判 | **方案 B DoD 达成**（B0–B5）；金样 C01–C20 本地 20/20；G6 并排录屏建议人工抽检 |

---

## 0. 产品与入口

| # | 能力 | 官方/目标 | YYSD | 阶段 |
|---|------|-----------|------|------|
| 0.1 | 套题 L→R→W 一体模考 | ✅ | ✅ `?cdt=1` hop + `cdt-report` | 壳 DONE |
| 0.2 | 单项顺序练习也走 CDT | ✅ 同壳 | ✅ `cambridge` → `?cdt=1`，闸门选 pack | B1 DONE |
| 0.3 | 开考前选 drill / exam（只选规则） | — | ✅ CDT gate「Practice / Mock test」 | B1 DONE |
| 0.4 | Speaking 与三科壳分离 | ✅ | ✅ | N/A |
| 0.5 | 专项工具不进壳 | — | ✅ | N/A |
| 0.6 | 老师上传 IELTS 剑桥形态默认 CDT | — | ⚠️ 可选 `cdt=1`，未默认策略 | B1 |
| 0.7 | 交卷报告 | 运营出分 / 练习解析 | ✅ 套题报告；drill 精析待统一 | B1 |

---

## 1. 开考闸门

| # | 能力 | YYSD | 阶段 |
|---|------|------|------|
| 1.1 | Confirm your details | ⚠️ 有；EXAMPLE 占位 | B1 抛光 |
| 1.2 | Test sound（听力） | ⚠️ 有；合成 beep 非官方样轨 | B1/B4 |
| 1.3 | Instructions → Start test | ✅ 套题 CDT 有 | 壳 DONE |
| 1.4 | drill 可缩短闸门（Sound/Info→Start，跳过 Confirm） | ✅ | B1 DONE |
| 1.4b | drill 开考前可选 Section/Passage（写作跳过；续考用草稿 sections） | ✅ 闸门 `cdt-gate-sections` → `.secbox` | 2026-07-31 |
| 1.5 | 文案与真实计时一致（含 2′ review） | ✅ 闸门写 two minutes；播完进 review | B2 DONE |

---

## 2. 顶栏 Chrome

| # | 能力 | YYSD | 阶段 |
|---|------|------|------|
| 2.1 | 深色顶栏 | ✅（`?cdt=1`） | 壳 DONE |
| 2.2 | Logo + 套题名 | ✅ | 壳 DONE |
| 2.3 | `N minutes left` | ✅ | 壳 DONE |
| 2.4 | Finish section | ✅ + disclaimer | 壳 DONE |
| 2.5 | Setting → 字号 | ✅ | 壳 DONE |
| 2.6 | Setting → **背景色** | ✅ White / Cream / Pale blue | B4 DONE |
| 2.7 | Help 三页签 | ✅ Information / Test / Task 英文文案 | B4 DONE |
| 2.8 | Hide（钟不停） | ✅ | 壳 DONE |
| 2.9 | 听力顶栏音量 | ✅ | 壳 DONE |
| 2.10 | 10′ / 5′ **闪烁** | ✅ `is-flash` ≤10′；颜色阈值保留 | B2 DONE |

---

## 3. 底栏 Chrome

| # | 能力 | YYSD | 阶段 |
|---|------|------|------|
| 3.1 | Review 方→圆 | ✅ | 壳 DONE |
| 3.2 | Part 分组题号 | ✅ | 壳 DONE |
| 3.3 | 已答 / 未答 / Review 态 | ✅ | 壳 DONE |
| 3.4 | 左右箭头 | ✅ | 壳 DONE |
| 3.5 | Writing Part 1/2 | ✅ | 壳 DONE |

---

## 4. 工作区 · Listening

| # | 能力 | YYSD | 阶段 |
|---|------|------|------|
| 4A.1 | 冷灰蓝 + 白题纸 | ✅ CDT skin | 壳 DONE |
| 4A.2 | 开考自动播；**禁止 seek/重播** | ✅ CDT 锁 progress/play/section | B2 DONE |
| 4A.3 | 独立 **2′ review** | ✅ 播完 → 120s review 条 + 倒计时 | B2 DONE |
| 4A.4 | 填空 input | ✅ | — |
| 4A.5 | 匹配 DnD | ✅ `cdt-qux.js` 池→槽；`<select>` 仍为答题源 | B3 DONE |
| 4A.6 | 地图点选/DnD | ✅ 同 DnD 字母槽（图保留） | B3 DONE |
| 4A.6b | 多选 Choose TWO | ✅ 字母点选写回双 select；去中文 helper | B3 DONE |
| 4A.7 | 交卷后才解锁学习回放（drill） | ✅ drill 交卷后 unlock + 显示播放器 | B2 DONE |

---

## 5. 工作区 · Reading

| # | 能力 | YYSD | 阶段 |
|---|------|------|------|
| 4B.1 | 左 passage / 右 questions | ✅ | 壳 DONE |
| 4B.2 | 两栏独立滚动 | ✅ | 壳 DONE |
| 4B.3 | 可拖中缝 | ✅ `.yysd-cdt-split` 拖宽 | B5 DONE |
| 4B.4 | 匹配/入空 DnD | ✅ 同 `cdt-qux`（match + letter-bank select） | B3 DONE |
| 4B.5 | 阅读复制粘贴作答（能力保留+验收） | ⚠️ 浏览器默认 | B3/B4 |

---

## 6. 工作区 · Writing

| # | 能力 | YYSD | 阶段 |
|---|------|------|------|
| 4C.1 | 左题(+图) / 右答 | ✅ | 壳 DONE |
| 4C.2 | Word count: N | ✅ | 壳 DONE |
| 4C.3 | Task 字数门槛提示 | ✅ | — |
| 4C.4 | `spellcheck=false` 全覆盖 | ✅ CDT writing textarea 禁拼写/自动更正 | B4 DONE |

---

## 7. 工具

| # | 能力 | YYSD | 阶段 |
|---|------|------|------|
| 7.1 | 高亮：右键 + **多色** | ✅ 黄/绿/粉/蓝；CDT 菜单全英 | B4 DONE |
| 7.2 | 独立 Notepad（L/R/W） | ✅ 顶栏 Notepad + session 持久；选区 Notes 仍保留 | B4 DONE |
| 7.3 | 考试中 UI 全英文 | ✅ CDT 高亮菜单英文化；闸门/壳英 | B4 DONE |

---

## 8. 规则包行为

| # | 能力 | YYSD | 阶段 |
|---|------|------|------|
| 8.1 | exam：离页 void | ✅ pack=exam → startTest("exam") + lock | B1 DONE |
| 8.2 | drill：可存续考、不 void | ✅ pack=drill + 闸门 Continue/Start over | B1 DONE |
| 8.3 | exam/drill 控件形态相同 | ✅ 同 CDT 壳；仅规则包不同 | B1 DONE |
| 8.4 | 到时强制收卷（两包皆是） | ✅ 父钟倒计时；到时 submit→review/hop | B1 DONE |

---

## 9. 里程碑映射（旧 M1–M6）

| 旧 | 含义 | 新位置 |
|----|------|--------|
| M1–M6 壳（2026-07-23） | 套题 `?cdt=1` 壳层 | **保留为底座**；不再表示「项目完成」 |
| — | 练习进壳 + 双规则包 | **B1** |
| — | 音频铁律 + 2′ | **B2** |
| — | DnD 题型 | **B3 DONE** |
| — | Notepad / 多色 / 背景色 | **B4 DONE** |
| — | 金样 ≥95% | **B5 DONE（20/20）** |

---

## 10. 壳层一页验收（已满足 ≠ 方案 B 完成）

打开剑桥套题全真模考（`?cdt=1`）应已满足：

1. 深色顶栏 + `minutes left` + Finish / Setting / Help / Hide  
2. 底栏 Review + Part 题号 + 圆箭头  
3. 冷灰蓝工作区  
4. 听力音量与音测闸门；阅读/写作左右分栏 + Word count  
5. Hide 后钟仍走；Finish 可 hop 或出报告  

以上 = **壳底座**。方案 B 总 DoD 见 `CDT-PLAN-B.md` §4。
