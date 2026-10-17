/* Download koolearn media (audio + images) listed in media-download.json into library/toefl/. Idempotent: skips files that already exist with matching size. */
"use strict";
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const LIST = process.argv[2] || "/tmp/kl-out/media-download.json";
const CONCURRENCY = 6;
const MAX_RETRY = 2;

const items = JSON.parse(fs.readFileSync(LIST, "utf8"));
console.log("items:", items.length);

function fetchBuf(url, redirectsLeft) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        return resolve(fetchBuf(res.headers.location, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("timeout", () => reject(new Error("timeout"))).on("error", reject);
  });
}

async function downloadOne(it) {
  const dest = path.join(ROOT, it.dest);
  try {
    const st = fs.statSync(dest);
    if (st.size > 0) return "skip";
  } catch (e) {}
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let lastErr = null;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      const buf = await fetchBuf(it.url, 3);
      if (!buf.length) throw new Error("empty body");
      fs.writeFileSync(dest, buf);
      return "ok";
    } catch (e) {
      lastErr = e;
    }
  }
  return "fail: " + lastErr.message;
}

(async () => {
  const results = { ok: 0, skip: 0, fail: 0 };
  const failures = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      const r = await downloadOne(items[i]);
      if (r === "ok") results.ok++;
      else if (r === "skip") results.skip++;
      else { results.fail++; failures.push({ url: items[i].url, err: r }); }
      if ((results.ok + results.skip + results.fail) % 50 === 0) {
        console.log("progress", results.ok + results.skip + results.fail, "/", items.length, JSON.stringify(results));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("DONE", JSON.stringify(results));
  if (failures.length) {
    fs.writeFileSync("/tmp/kl-out/media-fail.json", JSON.stringify(failures, null, 2));
    console.log("failures written to /tmp/kl-out/media-fail.json", failures.length);
  }
})();
