/**
 * Download university logos into public/logos and print mapping.
 * Usage: npx tsx scripts/fetch-logos.ts
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import https from "https";
import http from "http";
import { US_INSTITUTIONS } from "./catalog/us";
import { UK_INSTITUTIONS } from "./catalog/uk";
import { CA_INSTITUTIONS } from "./catalog/ca";
import { AU_INSTITUTIONS } from "./catalog/au";

const OUT = path.join(__dirname, "../public/logos");
mkdirSync(OUT, { recursive: true });

type Row = { name: string; website: string };

const ALL: Row[] = [
  ...US_INSTITUTIONS,
  ...UK_INSTITUTIONS,
  ...CA_INSTITUTIONS,
  ...AU_INSTITUTIONS,
].map((i) => ({ name: i.name, website: i.website }));

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function domainOf(website: string) {
  try {
    const u = new URL(website);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

function fetchBuf(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "YYSD-AdmissionLogoBot/1.0",
          Accept: "image/*,*/*",
        },
        timeout: 20000,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchBuf(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} ${url}`));
          res.resume();
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function downloadOne(name: string, website: string) {
  const slug = slugify(name);
  const domain = domainOf(website);
  const destPng = path.join(OUT, `${slug}.png`);
  if (existsSync(destPng) && readFileSync(destPng).length > 500) {
    return { name, slug, ok: true, skipped: true };
  }

  const sources = [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];

  for (const src of sources) {
    try {
      const buf = await fetchBuf(src);
      if (buf.length < 200) continue;
      // detect ico vs png loosely
      const isIco = buf[0] === 0 && buf[1] === 0;
      const dest = isIco ? path.join(OUT, `${slug}.ico`) : destPng;
      writeFileSync(dest, buf);
      // prefer png name in map; if ico, also copy as .png for <img> (browsers often still render)
      if (isIco) writeFileSync(destPng, buf);
      console.log("OK", name, "←", src, buf.length);
      return { name, slug, ok: true, skipped: false };
    } catch (e) {
      console.warn("fail", name, src, e instanceof Error ? e.message : e);
    }
  }
  return { name, slug, ok: false, skipped: false };
}

async function main() {
  const results = [];
  for (const row of ALL) {
    results.push(await downloadOne(row.name, row.website));
    await new Promise((r) => setTimeout(r, 120));
  }
  const ok = results.filter((r) => r.ok).length;
  console.log(`\nDone ${ok}/${results.length}`);
  const missing = results.filter((r) => !r.ok);
  if (missing.length) console.log("Missing:", missing.map((m) => m.name).join(", "));

  // write slug map for institutions generator
  const map: Record<string, string> = {};
  for (const r of results) {
    if (r.ok) map[r.name] = `/admission/logos/${r.slug}.png`;
  }
  writeFileSync(
    path.join(__dirname, "../data/logo-map.json"),
    JSON.stringify(map, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
