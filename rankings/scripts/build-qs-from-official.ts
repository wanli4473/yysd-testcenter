/**
 * Merge qs-official/*.json into data/raw universities.json + editions.json.
 * Replaces curated QS world/subject editions; keeps THE/ARWU/US News from seed-raw.
 */
import fs from "fs";
import path from "path";
import { slugify } from "../lib/systems";
import { QS_TARGETS } from "./qs-targets";

const ROOT = path.join(__dirname, "..");
const RAW = path.join(ROOT, "data", "raw");
const OFF = path.join(RAW, "qs-official");
const TOP_N = 500;

type UniRow = {
  slug: string;
  nameEn: string;
  nameZh: string;
  country: string;
  aliases: string[];
};

type EntryRow = {
  nameEn: string;
  rank: number;
  rankDisplay: string;
  score?: number | null;
  metrics?: Record<string, number>;
};

type EditionRow = {
  system: string;
  categorySlug: string;
  categoryName: string;
  year: number;
  title: string;
  isSubject: boolean;
  sourceUrl: string;
  entries: EntryRow[];
};

type OfficialFile = {
  slug: string;
  categorySlug: string;
  categoryName: string;
  categoryNameZh: string;
  year: number;
  isSubject: boolean;
  path: string;
  source?: string;
  entries: {
    rankDisplay: string;
    rank: number;
    score: number | null;
    name: string;
    href: string;
    location?: string;
    country?: string;
    city?: string;
    metrics?: Record<string, number>;
  }[];
};

const COUNTRY_MAP: Record<string, string> = {
  "United States": "US",
  "United Kingdom": "UK",
  Canada: "CA",
  Australia: "AU",
  China: "CN",
  "China (Mainland)": "CN",
  "Hong Kong SAR": "HK",
  "Hong Kong": "HK",
  Singapore: "SG",
  Japan: "JP",
  "South Korea": "KR",
  Korea: "KR",
  Germany: "DE",
  France: "FR",
  Switzerland: "CH",
  Netherlands: "NL",
  Sweden: "SE",
  Italy: "IT",
  Spain: "ES",
  Belgium: "BE",
  Denmark: "DK",
  Norway: "NO",
  Finland: "FI",
  Ireland: "IE",
  "New Zealand": "NZ",
  India: "IN",
  Taiwan: "TW",
  "Chinese Taipei": "TW",
  Malaysia: "MY",
  Austria: "AT",
  Portugal: "PT",
  Brazil: "BR",
  Mexico: "MX",
  Israel: "IL",
  Russia: "RU",
  "Saudi Arabia": "SA",
  "United Arab Emirates": "AE",
  Egypt: "EG",
  Turkey: "TR",
  "South Africa": "ZA",
  Poland: "PL",
  Czechia: "CZ",
  "Czech Republic": "CZ",
};

function countryCode(raw?: string): string {
  if (!raw) return "OTHER";
  return COUNTRY_MAP[raw] || COUNTRY_MAP[raw.replace(/\s+/g, " ").trim()] || "OTHER";
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[().,]/g, "")
    .trim();
}

function canonicalName(qsName: string): string {
  // strip trailing (MIT) style alias for matching; keep full as nameEn if new
  return qsName.replace(/\s+/g, " ").trim();
}

function buildAliasIndex(unis: UniRow[]) {
  const map = new Map<string, UniRow>();
  for (const u of unis) {
    map.set(normalizeName(u.nameEn), u);
    map.set(normalizeName(u.slug.replace(/-/g, " ")), u);
    for (const a of u.aliases || []) map.set(normalizeName(a), u);
  }
  return map;
}

function matchUni(index: Map<string, UniRow>, qsName: string, href: string): UniRow | null {
  const full = normalizeName(qsName);
  if (index.has(full)) return index.get(full)!;
  // parenthetical alias: "Massachusetts Institute of Technology (MIT)"
  const m = qsName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    const base = normalizeName(m[1]);
    const alias = normalizeName(m[2]);
    if (index.has(base)) return index.get(base)!;
    if (index.has(alias)) return index.get(alias)!;
  }
  if (href) {
    const slug = href.split("/").filter(Boolean).pop() || "";
    const fromSlug = normalizeName(slug.replace(/-/g, " "));
    if (index.has(fromSlug)) return index.get(fromSlug)!;
    // try slug as university slug field
    for (const u of index.values()) {
      if (u.slug === slug) return u;
    }
  }
  // contains / starts-with loose match among known
  for (const [k, u] of index) {
    if (k.length < 6) continue;
    if (full.includes(k) || k.includes(full)) return u;
  }
  return null;
}

function main() {
  if (!fs.existsSync(path.join(RAW, "universities.json")) || !fs.existsSync(path.join(RAW, "editions.json"))) {
    throw new Error("Run seed-raw.ts first to create base THE/ARWU/US News editions");
  }

  const universities = JSON.parse(
    fs.readFileSync(path.join(RAW, "universities.json"), "utf8")
  ) as UniRow[];
  const editions = JSON.parse(fs.readFileSync(path.join(RAW, "editions.json"), "utf8")) as EditionRow[];

  // drop curated QS editions — replaced by official
  const kept = editions.filter((e) => e.system !== "qs");
  const unmatched: string[] = [];
  let index = buildAliasIndex(universities);

  for (const t of QS_TARGETS) {
    const file = path.join(OFF, `${t.slug}-${t.year}.json`);
    if (!fs.existsSync(file)) {
      console.warn("missing official file", file);
      continue;
    }
    const off = JSON.parse(fs.readFileSync(file, "utf8")) as OfficialFile;
    const entries: EntryRow[] = [];
    for (const row of off.entries) {
      if (!row.name || !row.rank || row.rank > TOP_N) continue;
      let uni = matchUni(index, row.name, row.href || "");
      if (!uni) {
        const nameEn = canonicalName(row.name);
        const slug = slugify(nameEn);
        const aliases = [] as string[];
        const paren = row.name.match(/\(([^)]+)\)\s*$/);
        if (paren) aliases.push(paren[1]);
        if (row.href) {
          const hs = row.href.split("/").filter(Boolean).pop();
          if (hs) aliases.push(hs);
        }
        uni = {
          slug,
          nameEn,
          nameZh: nameEn,
          country: countryCode(row.country),
          aliases,
        };
        universities.push(uni);
        index = buildAliasIndex(universities);
        unmatched.push(`NEW\t${row.name}\t${row.country || ""}`);
      }
      entries.push({
        nameEn: uni.nameEn,
        rank: row.rank,
        rankDisplay: row.rankDisplay || String(row.rank),
        score: row.score,
        metrics: row.metrics,
      });
    }
    // dedupe by university within edition (keep best/lowest rank)
    const byUni = new Map<string, EntryRow>();
    for (const e of entries.sort((a, b) => a.rank - b.rank)) {
      if (!byUni.has(e.nameEn)) byUni.set(e.nameEn, e);
    }
    const finalEntries = [...byUni.values()].sort((a, b) => a.rank - b.rank).slice(0, TOP_N);
    kept.push({
      system: "qs",
      categorySlug: t.categorySlug,
      categoryName: t.categoryNameZh || t.categoryName,
      year: t.year,
      title: `QS ${t.categoryNameZh || t.categoryName} ${t.year}`,
      isSubject: t.isSubject,
      sourceUrl: off.source || `https://www.topuniversities.com${t.path}`,
      entries: finalEntries,
    });
    console.log(`QS ${t.slug} ${t.year}: ${finalEntries.length} entries`);
  }

  fs.writeFileSync(path.join(RAW, "universities.json"), JSON.stringify(universities, null, 2));
  fs.writeFileSync(path.join(RAW, "editions.json"), JSON.stringify(kept, null, 2));
  fs.writeFileSync(path.join(OFF, "unmatched.txt"), unmatched.join("\n") + "\n");
  console.log(
    `Wrote ${universities.length} universities, ${kept.length} editions (${kept.filter((e) => e.system === "qs").length} QS)`
  );
}

main();
