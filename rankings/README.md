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

- `npm run seed`：生成 `data/raw/*.json` 并导入 SQLite
- 一期为可替换的策展数据（公开知识榜首 + 稳定扩展序）；换成完整官方表后重跑 seed/import 即可

## 检查

```bash
npm run check
```
