/** Save latest CDP Runtime.evaluate JSON dump containing __qsExport-like payload. */
import fs from "fs";
import path from "path";

const logDir = process.env.BROWSER_LOGS || path.join(
  process.env.HOME || "",
  ".cursor/browser-logs"
);
const outDir = path.join(__dirname, "..", "data", "raw", "qs-official");

function findExportString(o: unknown): string | null {
  if (typeof o === "string" && o.startsWith("{") && o.includes('"entries"')) {
    try {
      const p = JSON.parse(o);
      if (p.entries && p.slug) return o;
    } catch {
      /* ignore */
    }
  }
  if (o && typeof o === "object") {
    for (const v of Object.values(o as Record<string, unknown>)) {
      const f = findExportString(v);
      if (f) return f;
    }
  }
  return null;
}

const files = fs
  .readdirSync(logDir)
  .filter((f) => f.startsWith("cdp-response-Runtime.evaluate-") && f.endsWith(".json"))
  .map((f) => ({ f, t: fs.statSync(path.join(logDir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);

if (!files.length) throw new Error("no cdp dumps");
const latest = path.join(logDir, files[0].f);
const raw = JSON.parse(fs.readFileSync(latest, "utf8"));
const s = findExportString(raw);
if (!s) throw new Error(`no export in ${latest}`);
const data = JSON.parse(s);
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${data.slug}-${data.year}.json`);
fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log(`wrote ${out} count=${data.count}`);
