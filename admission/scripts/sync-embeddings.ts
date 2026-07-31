/**
 * Embed Case.description into pgvector column.
 * Usage: npm run sync:embeddings
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { qwenEmbed } from "../lib/qwen";

const prisma = new PrismaClient();

async function main() {
  // Prefer real GradCafe rows so similar-case search cites authentic samples first
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; description: string }>>(
    `SELECT id, description FROM cases
     WHERE embedding IS NULL
     ORDER BY CASE WHEN source IN ('gradcafe','manual') THEN 0 ELSE 1 END, year DESC`
  );
  console.log(`Cases needing embedding: ${rows.length}`);
  let ok = 0;
  for (const row of rows) {
    try {
      const emb = await qwenEmbed(row.description);
      const vec = `[${emb.join(",")}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE cases SET embedding = $1::vector WHERE id = $2`,
        vec,
        row.id
      );
      ok++;
      if (ok % 10 === 0) console.log(`… ${ok}/${rows.length}`);
      // gentle rate limit
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.error(`fail ${row.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Synced ${ok}/${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
