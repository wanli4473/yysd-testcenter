/**
 * Import anonymized GradCafe CS self-reports into Case rows.
 * Source CSV: data/gradcafe_cs.csv (deedy/gradcafe_data mirror)
 *
 * Usage: npx tsx scripts/import-gradcafe.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { mapGradcafeUni, redactComment, seasonYear } from "./gradcafe-map";

const prisma = new PrismaClient();
const CSV = path.join(__dirname, "../data/gradcafe_cs.csv");
const MAX_PER_SCHOOL = 80;
const PREFER_WITH_GPA = true;

type Row = {
  rowId: string;
  uni: string;
  major: string;
  degree: string;
  season: string;
  decision: string;
  gpa: string;
  greV: string;
  greQ: string;
  status: string;
  comment: string;
};

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function greTotal(v: string, q: string): number | null {
  const a = Number(v);
  const b = Number(q);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a > 170 || b > 170) return null; // old GRE scale — skip
  return Math.round(a + b);
}

async function loadCsv(): Promise<Row[]> {
  const rl = createInterface({ input: createReadStream(CSV), crlfDelay: Infinity });
  const rows: Row[] = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    const c = parseLine(line);
    if (c.length < 19) continue;
    rows.push({
      rowId: c[0],
      uni: c[1],
      major: c[2],
      degree: c[3],
      season: c[4],
      decision: c[5],
      gpa: c[9],
      greV: c[10],
      greQ: c[11],
      status: c[15],
      comment: c[18] || "",
    });
  }
  return rows;
}

async function main() {
  const schools = await prisma.school.findMany({
    where: { field: { in: ["cs", "data_ai"] }, country: "US" },
    select: { id: true, name: true, field: true, program: true, avgGpa: true },
  });
  const byName = new Map<string, typeof schools>();
  for (const s of schools) {
    const list = byName.get(s.name) || [];
    list.push(s);
    byName.set(s.name, list);
  }

  function pickSchool(catalogName: string) {
    const list = byName.get(catalogName);
    if (!list?.length) return null;
    const cs = list.find((s) => s.field === "cs");
    return cs || list[0];
  }

  console.log(`Loading ${CSV}…`);
  const raw = await loadCsv();
  const ms = raw.filter(
    (r) =>
      ["MS", "MEng", "MSc", "MCS"].includes(r.degree) &&
      (r.decision === "Accepted" || r.decision === "Rejected")
  );
  console.log(`MS Acc/Rej rows: ${ms.length}`);

  const perSchool = new Map<string, number>();
  const batch: Array<{
    schoolId: string;
    gpa: number;
    toefl: null;
    ielts: null;
    gre: number | null;
    undergradSchool: string;
    undergradMajor: string;
    backgroundTags: string[];
    admissionResult: boolean;
    year: number;
    description: string;
    source: string;
    externalId: string;
  }> = [];

  let skippedNoMap = 0;
  let skippedNoGpa = 0;
  let skippedCap = 0;

  // Prefer GPA-present, then International, then newer seasons
  const ranked = [...ms].sort((a, b) => {
    const ga = a.gpa.trim() ? 1 : 0;
    const gb = b.gpa.trim() ? 1 : 0;
    if (gb !== ga) return gb - ga;
    const ia = /international/i.test(a.status) ? 1 : 0;
    const ib = /international/i.test(b.status) ? 1 : 0;
    if (ib !== ia) return ib - ia;
    return (seasonYear(b.season) || 0) - (seasonYear(a.season) || 0);
  });

  for (const r of ranked) {
    const catalog = mapGradcafeUni(r.uni);
    if (!catalog) {
      skippedNoMap++;
      continue;
    }
    const school = pickSchool(catalog);
    if (!school) {
      skippedNoMap++;
      continue;
    }
    const n = perSchool.get(school.id) || 0;
    if (n >= MAX_PER_SCHOOL) {
      skippedCap++;
      continue;
    }
    const gpaNum = Number(r.gpa);
    const hasGpa = Number.isFinite(gpaNum) && gpaNum >= 2.0 && gpaNum <= 4.0;
    if (PREFER_WITH_GPA && !hasGpa) {
      skippedNoGpa++;
      continue;
    }
    const year = seasonYear(r.season) || 2016;
    const admitted = r.decision === "Accepted";
    const gre = greTotal(r.greV, r.greQ);
    const ug =
      /international/i.test(r.status)
        ? "国际本科（GradCafe 自报）"
        : /american/i.test(r.status)
          ? "美国本科（GradCafe 自报）"
          : "未标注本科（GradCafe 自报）";
    const note = redactComment(r.comment);
    const gpa = hasGpa ? Math.round(gpaNum * 100) / 100 : school.avgGpa;
    const tags = ["gradcafe"];
    if (/international/i.test(r.status)) tags.push("international");
    if (note.toLowerCase().includes("research")) tags.push("research");
    if (note.toLowerCase().includes("internship")) tags.push("internship");

    batch.push({
      schoolId: school.id,
      gpa,
      toefl: null,
      ielts: null,
      gre,
      undergradSchool: ug,
      undergradMajor: r.major || "CS",
      backgroundTags: tags,
      admissionResult: admitted,
      year,
      description: `GradCafe 真实自报（脱敏）：${ug}，GPA ${gpa.toFixed(2)}${gre != null ? `，GRE ${gre}` : ""}，${year} ${r.season} 申请 ${catalog} ${school.program}，${admitted ? "录取" : "拒绝"}${note ? `。备注：${note}` : ""}。来源：The GradCafe（历史公开数据集）。`,
      source: "gradcafe",
      externalId: `gradcafe-deedy-${r.rowId}`,
    });
    perSchool.set(school.id, n + 1);
  }

  console.log(
    `Prepared ${batch.length} cases (skip noMap≈${skippedNoMap}, noGpa=${skippedNoGpa}, cap=${skippedCap})`
  );

  let upserted = 0;
  const chunk = 40;
  for (let i = 0; i < batch.length; i += chunk) {
    const slice = batch.slice(i, i + chunk);
    await Promise.all(
      slice.map((row) =>
        prisma.case.upsert({
          where: { externalId: row.externalId },
          create: row,
          update: {
            gpa: row.gpa,
            gre: row.gre,
            undergradSchool: row.undergradSchool,
            undergradMajor: row.undergradMajor,
            backgroundTags: row.backgroundTags,
            admissionResult: row.admissionResult,
            year: row.year,
            description: row.description,
            source: row.source,
            schoolId: row.schoolId,
          },
        })
      )
    );
    upserted += slice.length;
    if (upserted % 200 === 0 || upserted === batch.length) {
      console.log(`upserted ${upserted}/${batch.length}`);
    }
  }

  // Refresh per-school GradCafe sample rates
  const schoolIds = [...perSchool.keys()];
  for (const sid of schoolIds) {
    const all = await prisma.case.findMany({
      where: { schoolId: sid, source: "gradcafe" },
      select: { admissionResult: true },
    });
    if (!all.length) continue;
    const rate = all.filter((c) => c.admissionResult).length / all.length;
    await prisma.school.update({
      where: { id: sid },
      data: {
        admitRateGradcafe: Math.round(rate * 1000) / 1000,
        gradcafeSampleSize: all.length,
      },
    });
  }

  const real = await prisma.case.count({ where: { source: "gradcafe" } });
  console.log(`Done. gradcafe cases in DB: ${real}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
