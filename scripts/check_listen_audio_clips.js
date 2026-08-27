/* Assert every listening taxonomy group for a volume has audioEnd > audioStart. */
var fs = require("fs");
var path = require("path");
var vol = String(process.argv[2] || "");
if (!vol) {
  console.error("usage: node scripts/check_listen_audio_clips.js VOLUME");
  process.exit(1);
}
var root = path.join(__dirname, "..");
var tax = JSON.parse(fs.readFileSync(path.join(root, "library/listening-taxonomy.json"), "utf8"));
var groups = tax.groups.filter(function (g) {
  return String(g.volume) === vol && g.qFrom != null;
});
if (!groups.length) {
  console.error("FAIL: no taxonomy groups for volume", vol);
  process.exit(1);
}

function clipsIn(html) {
  var out = [];
  var re = /audioClips"\s*:\s*\[([^\]]*)\]|audioClips\s*:\s*\[([^\]]*)\]/g;
  var m;
  while ((m = re.exec(html))) {
    var body = m[1] || m[2] || "";
    var item = /qFrom["'\s:]+(\d+)[\s"',]*qTo["'\s:]+(\d+)[\s"',]*audioStart["'\s:]+([\d.]+)[\s"',]*audioEnd["'\s:]+([\d.]+)/g;
    var x;
    while ((x = item.exec(body))) {
      out.push({ qFrom: +x[1], qTo: +x[2], start: +x[3], end: +x[4] });
    }
  }
  return out;
}

var missing = [];
var bad = [];
groups.forEach(function (g) {
  var file = path.join(root, "library/mock/cambridge-listening/cambridge-" + vol + "-test-" + g.test + ".html");
  if (!fs.existsSync(file)) {
    missing.push(g.id + " (no paper)");
    return;
  }
  var html = fs.readFileSync(file, "utf8");
  var clips = clipsIn(html);
  var hit = clips.filter(function (c) { return c.qFrom === g.qFrom && c.qTo === g.qTo; })[0];
  if (!hit) {
    missing.push(g.id);
    return;
  }
  if (!(hit.end > hit.start)) bad.push(g.id + " " + hit.start + "→" + hit.end);
});

if (missing.length || bad.length) {
  console.error("FAIL vol", vol, "missing", missing.length, "bad", bad.length);
  missing.concat(bad).forEach(function (l) { console.error(" ", l); });
  process.exit(1);
}
console.log("ok: listen audio clips vol", vol, groups.length, "groups");
