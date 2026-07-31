# AI 留学录取评估（admission 子应用）

Next.js 14 + Prisma + Supabase Postgres（pgvector）+ 通义千问（DashScope）。

## 文件说明

| 路径 | 作用 |
|------|------|
| `prisma/schema.prisma` | School / Case / UserQuery 表结构 |
| `prisma/migrations/.../migration.sql` | 含 `vector` 扩展与建表 SQL |
| `scripts/catalog/` | 美英加澳全科目录（country/field/slug） |
| `scripts/seed-cases.ts` | upsert 目录 + 每项目约 4 条合成脱敏案例 |
| `scripts/import-gradcafe.ts` | 导入 GradCafe 历史真实自报（脱敏） |
| `scripts/apply-official-stats.ts` | 写入可引用公开/近似录取率 |
| `data/gradcafe_cs.csv` | GradCafe CS 公开历史数据集 |
| `data/official-stats.json` | 公开录取率引用条目 |
| `scripts/sync-embeddings.ts` | 将 Case 文本嵌入写入 pgvector |
| `scripts/scrape_gradcafe.py` | 可选 GradCafe 抓取骨架（默认不跑） |
| `app/api/evaluate/route.ts` | 评估 API：硬门槛 → 概率 → 相似案例 → 千问 |
| `lib/qwen.ts` | DashScope Chat / Embedding |
| `lib/hard-gate.ts` / `probability.ts` / `similar.ts` / `resume.ts` | 评估子逻辑 |
| `components/AdmissionEval.tsx` | 学校详情页内的评估表单与结果展示 |
| `lib/mock.ts` | 前端 Mock 结果（`NEXT_PUBLIC_USE_MOCK=1`） |

## 本地运行

### 1. Supabase

1. 创建项目 → **Database → Extensions** → 启用 `vector`
2. **Project Settings → Database** 复制连接串：
   - `DATABASE_URL`：Transaction pooler（6543，加 `?pgbouncer=true`）
   - `DIRECT_URL`：Session / Direct（5432）

### 2. 环境变量

```bash
cd admission
cp .env.example .env.local
# 编辑 .env.local：DATABASE_URL、DIRECT_URL、DASHSCOPE_API_KEY
# 先跑 UI 可保持 NEXT_PUBLIC_USE_MOCK=1
```

### 3. 安装与迁移

```bash
npm install --registry=https://registry.npmmirror.com --ignore-scripts
# 国内拉取 Prisma Engine 慢时：
PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma npx prisma generate

npx prisma migrate deploy
# 或开发：npx prisma migrate dev
npm run seed
npm run apply:stats
npm run import:gradcafe
# 有 DASHSCOPE_API_KEY 后再同步向量：
npm run sync:embeddings
```

### 4. 启动

```bash
npm run dev
# http://localhost:3001
# Mock：打开任意 /schools/mock-cmu 点评估
# 真实：NEXT_PUBLIC_USE_MOCK=0，并用 seed 后的学校 id
```

### 5. 自检（无需 DB）

```bash
npx tsx lib/check-eval.ts
```

## 校准引擎（准确性）

- 概率与「冲刺/匹配/保底」由 `lib/calibrate.ts` **锁定**（本科档次 × 项目选择性 × GPA/专业匹配/简历信号）
- 千问只写分析，**不能改概率**
- 返回 `range` 区间 + `evidence` 可追溯依据
- 校准优先使用 `source=gradcafe` 真实案例；合成样本仅作回退
- evidence 展示公开录取率引用 + GradCafe 样本率
- 简历支持 PDF / DOC / DOCX（macOS `textutil`）

## 隐私

- 简历仅在请求内存中解析，不落盘、不入库存原文
- `UserQuery` 只存结构化特征 JSON
- GradCafe 案例已脱敏（去邮箱/链接）；合成案例为模板描述
