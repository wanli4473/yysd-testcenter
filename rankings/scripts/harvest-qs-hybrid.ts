/**
 * Hybrid XHR-hook harvest matching the proven browser MCP evaluate pattern.
 * ponytail: Cursor IDE browser MCP unavailable in this subagent; Chrome is the ceiling.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";
import { BASE, QS_TARGETS, type QsTarget } from "./qs-targets";

const OUT = path.join(__dirname, "..", "data", "raw", "qs-official");
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ONLY = (process.env.QS_ONLY || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MIN_OK = 150;

/** Plain JS string — avoids tsx/esbuild injecting __name into page.evaluate. */
function harvestExpr(metaJson: string): string {
  return `new Promise(async (resolve) => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let cards=0; for(let i=0;i<60;i++){ cards=document.querySelectorAll('#ranking-data-load .new-ranking-cards').length; if(cards>=50) break; await sleep(250);}
  const TOP_N=500;
  const meta=${metaJson};
  const XO = XMLHttpRequest.prototype.open;
  const XS = XMLHttpRequest.prototype.send;
  window.__qsPages={};
  XMLHttpRequest.prototype.open=function(m,u,...r){this.__u=u;return XO.call(this,m,u,...r)};
  XMLHttpRequest.prototype.send=function(...a){this.addEventListener('load',function(){if(!String(this.__u||'').includes('/rankings/endpoint'))return;try{const d=JSON.parse(this.responseText);window.__qsPages[d.current_page]=d;}catch(e){}});return XS.apply(this,a)};
  const setPer=async(n)=>{const dd=document.querySelector('.perpage_dropdown_js'); if(!dd) return; dd.click(); await sleep(400); const item=[...dd.querySelectorAll('.item')].find(el=>(el.textContent||'').trim()===String(n)); if(item){ item.click(); await sleep(2200);} };
  try { await setPer(50); } catch(e) {}
  window.__qsPages={};
  try { await setPer(100); } catch(e) {}
  let guard=0; while(!window.__qsPages[0] && guard++<40) await sleep(250);
  // if still empty, try 150 once more
  if(!window.__qsPages[0]){ window.__qsPages={}; try { await setPer(150); } catch(e) {} guard=0; while(!window.__qsPages[0] && guard++<40) await sleep(250); }
  const extractDom=()=>[...document.querySelectorAll('#ranking-data-load .new-ranking-cards')].map(c=>{const rankDisplay=(c.querySelector('.rank-no')?.textContent||'').replace(/\\s+/g,' ').trim();const scoreRaw=(c.querySelector('.rank-score')?.textContent||'').trim();const a=c.querySelector('a.uni-link');const rankNum=(()=>{const range=rankDisplay.match(/^(\\d+)\\s*-\\s*\\d+$/);if(range)return Number(range[1]);return Number(rankDisplay.replace(/^=/,'').replace(/[^\\d].*$/,''))||0;})();return{rankDisplay,rank:rankNum,score:scoreRaw?Number(scoreRaw):null,name:(a?.textContent||'').trim(),href:a?.getAttribute('href')||'',location:''};});
  const fromNodes=(nodes)=>{const out=[];for(const n of nodes||[]){const rankDisplay=String(n.rank_display||n.rank||'').trim();const rankNum=(()=>{const range=rankDisplay.match(/^(\\d+)\\s*-\\s*\\d+$/);if(range)return Number(range[1]);return Number(rankDisplay.replace(/^=/,'').replace(/[^\\d].*$/,''))||0;})();if(!rankNum||rankNum>TOP_N)continue;out.push({rankDisplay,rank:rankNum,score:n.overall_score!=null&&n.overall_score!==''?Number(n.overall_score):null,name:String(n.title||'').trim(),href:String(n.path||'').trim(),location:[n.city,n.country].filter(Boolean).join(', '),country:n.country||'',city:n.city||''});}return out;};
  let all = window.__qsPages[0] ? fromNodes(window.__qsPages[0].score_nodes) : extractDom();
  const maxPages=Math.min(window.__qsPages[0]?.total_pages||10, 10);
  for(let p=1;p<maxPages;p++){
    if(all.length>=TOP_N) break;
    const next=document.querySelector('#alt-style-pagination a.page-link.next');
    if(!next) break;
    next.click();
    let ok=false;
    for(let w=0;w<60;w++){await sleep(250); if(window.__qsPages[p]){ all=all.concat(fromNodes(window.__qsPages[p].score_nodes)); ok=true; break; }}
    if(!ok) break;
  }
  const seen=new Set(); const uniq=[];
  for(const e of all.sort((a,b)=>a.rank-b.rank||a.name.localeCompare(b.name))){
    const k=e.rank+'|'+e.name; if(!e.name||!e.rank||e.rank>TOP_N||seen.has(k)) continue; seen.add(k); uniq.push(e); if(uniq.length>=TOP_N) break;
  }
  window.__qsExport={fetchedAt:new Date().toISOString(),source:location.href.split('?')[0],...meta,count:uniq.length,entries:uniq};
  resolve({count:uniq.length, api:Object.keys(window.__qsPages), first:uniq[0]?.name});
})`;
}

async function harvestOne(
  page: import("playwright-core").Page,
  t: QsTarget
): Promise<{ count: number; first?: string }> {
  const url = `${BASE}${t.path}?items_per_page=150`;
  console.log(`→ ${t.slug} ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });

  for (let i = 0; i < 60; i++) {
    const title = await page.title();
    if (!/请稍候|Just a moment/i.test(title)) break;
    await page.waitForTimeout(1000);
  }

  await page.waitForFunction(
    "document.querySelectorAll('#ranking-data-load .new-ranking-cards').length >= 50",
    { timeout: 90000 }
  );

  const meta = {
    slug: t.slug,
    categorySlug: t.categorySlug,
    categoryName: t.categoryName,
    categoryNameZh: t.categoryNameZh,
    year: t.year,
    isSubject: t.isSubject,
    path: t.path,
  };

  const result = (await page.evaluate(harvestExpr(JSON.stringify(meta)))) as {
    count: number;
    api: string[];
    first?: string;
  };

  const exportData = await page.evaluate("window.__qsExport");
  if (!exportData || !(exportData as { count?: number }).count) {
    throw new Error(`empty export for ${t.slug}: ${JSON.stringify(result)}`);
  }
  const out = path.join(OUT, `${t.slug}-${t.year}.json`);
  fs.writeFileSync(out, JSON.stringify(exportData, null, 2));
  console.log(
    `  wrote ${out} count=${(exportData as { count: number }).count} api=${JSON.stringify(result.api)} first=${result.first}`
  );
  return result;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const targets = QS_TARGETS.filter((t) => ONLY.includes(t.slug));
  if (!targets.length) throw new Error("no targets — set QS_ONLY");

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: process.env.QS_HEADED === "1" ? false : true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  const summary: { slug: string; count: number }[] = [];
  try {
    for (const t of targets) {
      const existing = path.join(OUT, `${t.slug}-${t.year}.json`);
      if (fs.existsSync(existing)) {
        const prev = JSON.parse(fs.readFileSync(existing, "utf8"));
        if ((prev.count || 0) >= MIN_OK) {
          console.log(`skip ${t.slug} count=${prev.count}`);
          summary.push({ slug: t.slug, count: prev.count });
          continue;
        }
      }
      const r = await harvestOne(page, t);
      summary.push({ slug: t.slug, count: r.count });
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
