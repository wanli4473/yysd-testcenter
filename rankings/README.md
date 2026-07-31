# 全球大学排行榜（优益思达）

Next.js 应用，挂载于 `youyisida.com/rankings`（`basePath: /rankings`，端口 3002）。

## 本地开发

```bash
cd rankings
npm install
npm run db:push
npm run seed
npm run dev
```

打开 http://localhost:3002/rankings

## 数据

- `npm run seed`：策展 THE/ARWU/US News + 合并 `data/raw/qs-official` 的 QS 真表 → 导入 SQLite
- `npm run fetch:qs`：用 Chrome 从 TopUniversities 抓 QS World + 优先学科（各榜最多前 500）
- `npm run build:qs`：仅重跑官方 JSON → editions 合并
- 一期 QS 已换官网公开表；THE / 软科 / US News 仍为可替换策展数据

## 检查

```bash
npm run check
```
