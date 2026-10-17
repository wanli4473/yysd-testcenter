/* ponytail: 题库中心 state machine + pool + no-relist */
var path = require("path");
var fs = require("fs");
var tiku = require("../server/tiku");
tiku.selfCheck(path.join(__dirname, ".."));
var pool = tiku.buildPool(path.join(__dirname, ".."));
if (pool.filter(function (b) { return b.source === "set" && b.set === 1; }).length < 8) {
  throw new Error("set 1 blocks missing");
}
if (pool.filter(function (b) { return b.paperId === "2025-07-16"; }).length < 4) {
  throw new Error("7.16 blocks missing");
}
if (pool.filter(function (b) { return b.source === "bank" && b.type === "complete_words"; }).length < 100) {
  throw new Error("bank cw blocks missing");
}
if (pool.filter(function (b) { return b.source === "bank" && b.type === "daily_life"; }).length < 100) {
  throw new Error("bank rdl blocks missing");
}
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-rap-reading.json"))) {
  if (pool.filter(function (b) { return b.source === "bank" && b.type === "academic" && /^R-RAP/i.test(String(b.set || "")); }).length < 100) {
    throw new Error("bank rap blocks missing");
  }
  if (!pool.some(function (b) { return b.set === "R-RAP1"; })) throw new Error("R-RAP1 missing");
}
if (!pool.some(function (b) { return b.set === "R-CW1"; })) throw new Error("R-CW1 missing");
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-cr-listening.json"))) {
  if (pool.filter(function (b) { return b.source === "bank" && b.type === "choose_response" && b.paperId === "bank-cr"; }).length < 600) {
    throw new Error("bank cr blocks missing");
  }
  if (!pool.some(function (b) { return b.set === "L-CR1"; })) throw new Error("L-CR1 missing");
}
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-lcn-listening.json"))) {
  if (pool.filter(function (b) { return b.source === "bank" && b.type === "conversation" && b.paperId === "bank-lcn"; }).length < 200) {
    throw new Error("bank lcn blocks missing");
  }
  if (!pool.some(function (b) { return b.set === "L-LCN1"; })) throw new Error("L-LCN1 missing");
}
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-ano-listening.json"))) {
  if (pool.filter(function (b) { return b.source === "bank" && b.type === "announcement" && b.paperId === "bank-ano"; }).length < 140) {
    throw new Error("bank ano blocks missing");
  }
  if (!pool.some(function (b) { return b.set === "L-ANO1"; })) throw new Error("L-ANO1 missing");
}
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-at-listening.json"))) {
  if (pool.filter(function (b) { return b.source === "bank" && b.type === "lecture" && b.paperId === "bank-at"; }).length < 150) {
    throw new Error("bank at blocks missing");
  }
  if (!pool.some(function (b) { return b.set === "L-AT1"; })) throw new Error("L-AT1 missing");
}
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-bs-writing.json"))) {
  var bsPaper = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "app/library/toefl/bank-bs-writing.json"), "utf8"));
  var maxSet = 0;
  (bsPaper.tasks || []).forEach(function (t) {
    var m = /^W-BS(\d+)-Q\d+$/.exec(t.set || "");
    if (m) maxSet = Math.max(maxSet, Number(m[1]));
  });
  var setN, q;
  for (setN = 1; setN <= maxSet; setN++) {
    var qMax = setN === 90 ? 5 : 10;
    for (q = 1; q <= qMax; q++) {
      var id = "W-BS" + setN + "-Q" + q;
      var b = pool.filter(function (x) { return x.set === id; })[0];
      if (!b || b.n !== 1 || b.type !== "sentence") throw new Error(id + " missing");
    }
  }
  var bs1 = pool.filter(function (x) { return x.set === "W-BS1-Q1"; })[0];
  if (!bs1 || !bs1.hay || bs1.hay.indexOf("bookstore") < 0) throw new Error("W-BS1-Q1 hay");
}
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-we-writing.json"))) {
  var wePaper = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "app/library/toefl/bank-we-writing.json"), "utf8"));
  var weMax = 0;
  (wePaper.tasks || []).forEach(function (t) {
    var m = /^W-WE(\d+)$/.exec(t.set || "");
    if (m) weMax = Math.max(weMax, Number(m[1]));
  });
  var weN;
  for (weN = 1; weN <= weMax; weN++) {
    var weId = "W-WE" + weN;
    var wb = pool.filter(function (x) { return x.set === weId; })[0];
    if (!wb || wb.n !== 1 || wb.type !== "email") throw new Error(weId + " missing");
  }
}
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-ad-writing.json"))) {
  var adPaper = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "app/library/toefl/bank-ad-writing.json"), "utf8"));
  var adTasks = adPaper.tasks || [];
  if (adTasks.length < 87) throw new Error("bank-ad short " + adTasks.length);
  adTasks.forEach(function (t) {
    var ab = pool.filter(function (x) { return x.set === t.set; })[0];
    if (!ab || ab.n !== 1 || ab.type !== "discussion") throw new Error((t.set || "?") + " missing");
  });
}
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-lr-speaking.json"))) {
  var lrPaper = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "app/library/toefl/bank-lr-speaking.json"), "utf8"));
  var lrMax = 0;
  (lrPaper.tasks || []).forEach(function (t) {
    var m = /^S-LRP(\d+)-Q\d+$/.exec(t.set || "");
    if (m) lrMax = Math.max(lrMax, Number(m[1]));
  });
  var lrN, lrQ;
  for (lrN = 1; lrN <= lrMax; lrN++) {
    for (lrQ = 1; lrQ <= 7; lrQ++) {
      var lrId = "S-LRP" + lrN + "-Q" + lrQ;
      var lrb = pool.filter(function (x) { return x.set === lrId; })[0];
      if (!lrb || lrb.n !== 1 || lrb.type !== "repeat") throw new Error(lrId + " missing");
    }
  }
}
if (fs.existsSync(path.join(__dirname, "..", "app/library/toefl/bank-iv-speaking.json"))) {
  var ivPaper = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "app/library/toefl/bank-iv-speaking.json"), "utf8"));
  var ivSkip = { 57: 1, 58: 1, 59: 1, 60: 1, 61: 1 };
  var ivNums = {};
  (ivPaper.tasks || []).forEach(function (t) {
    var m = /^S-INT(\d+)-Q(\d+)$/.exec(t.set || "");
    if (m) {
      ivNums[m[1]] = 1;
      var ivId = t.set;
      var ivb = pool.filter(function (x) { return x.set === ivId; })[0];
      if (!ivb || ivb.n !== 1 || ivb.type !== "interview") throw new Error(ivId + " missing");
    }
  });
  Object.keys(ivNums).forEach(function (n) {
    if (ivSkip[n]) throw new Error("S-INT" + n + " should be skipped");
    var q;
    for (q = 1; q <= 4; q++) {
      var need = "S-INT" + n + "-Q" + q;
      if (!pool.some(function (x) { return x.set === need; })) throw new Error(need + " missing");
    }
  });
}

(function () {
  var cw = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "app/library/toefl/bank-cw-reading.json"), "utf8"));
  if ((cw.tasks || []).length < 246) throw new Error("cw bank short");
  var hud = /HEREVE|BEREXE|HEREXA|AARUXE|\bOT-U\b|\bOF-0\b|\b57T-0\b/;
  (cw.tasks || []).forEach(function (t) {
    var blob = (t.passage || []).map(function (p) { return (p.t || "") + (p.word || ""); }).join(" ");
    if (hud.test(blob)) throw new Error("cw hud " + t.set);
  });
})();
if (!pool.some(function (b) { return b.set === "R-RDL1"; })) throw new Error("R-RDL1 missing");
["tiku/index.html", "tiku/tiku.js", "tiku/gate.js", "app/bank.html", "app/assets/js/tiku-run.js",
  "server/deploy/nginx-tiku.conf", "desktop-tiku/main.js"].forEach(function (f) {
  if (!fs.existsSync(path.join(__dirname, "..", f))) throw new Error("missing " + f);
});
var ui = fs.readFileSync(path.join(__dirname, "..", "tiku/tiku.js"), "utf8");
if (ui.indexOf("/api/tiku/papers") < 0) throw new Error("tiku ui api");
if (ui.indexOf('["pool", "题块池"]') >= 0) throw new Error("pool tab should be gone");
if (ui.indexOf("f-type") < 0) throw new Error("type filter");
if (ui.indexOf('value="bank"') < 0) throw new Error("bank source filter");
if (ui.indexOf("L-CR") < 0 || ui.indexOf("L-LCN") < 0 || ui.indexOf("L-ANO") < 0 || ui.indexOf("L-AT") < 0 || ui.indexOf("R-CW") < 0 || ui.indexOf("W-BS") < 0 || ui.indexOf("S-LRP") < 0 || ui.indexOf("S-INT") < 0) throw new Error("bank set filter");
if (ui.indexOf("blockMatches") < 0 || ui.indexOf("dropGoneSet") < 0) throw new Error("set dropdown follows skill/type/source");
if (ui.indexOf("cmpSet") < 0 || ui.indexOf(".sort(function (a, b)") < 0) throw new Error("pool sorts by set");
if (ui.indexOf("b.hay") < 0) throw new Error("search uses passage hay");
var rap1 = pool.filter(function (b) { return b.set === "R-RAP1"; })[0];
if (!rap1 || !rap1.hay || rap1.hay.indexOf("hollywood") < 0) throw new Error("rap hay");
var cw1 = pool.filter(function (b) { return b.set === "R-CW1"; })[0];
if (!cw1 || !cw1.hay || cw1.hay.indexOf("pacific") < 0) throw new Error("cw hay");
var rdl1 = pool.filter(function (b) { return b.set === "R-RDL1"; })[0];
if (!rdl1 || !rdl1.hay || rdl1.hay.indexOf("career") < 0) throw new Error("rdl hay");
if (ui.indexOf("refreshNow") < 0) throw new Error("refresh without logout");
if (ui.indexOf("blockPreviewHref") < 0 || ui.indexOf("data-bpv") < 0) throw new Error("block preview");
if (ui.indexOf("preview=1") < 0) throw new Error("block preview flag");
var play = fs.readFileSync(path.join(__dirname, "..", "app/assets/js/play.js"), "utf8");
if (play.indexOf('preview=1') < 0) throw new Error("review keeps preview");
if (play.indexOf("function backHref") < 0 || play.indexOf("tiku.youyisida.com") < 0) {
  throw new Error("preview back goes to tiku, not lab");
}
if (play.indexOf("w.close()") < 0 || play.indexOf("isTikuDesktop") < 0) {
  throw new Error("preview back closes popup");
}
if (ui.indexOf("yysd-preview") < 0 || ui.indexOf("function openPreview") < 0) {
  throw new Error("preview reuses named window");
}
(function () {
  var vm = require("vm");
  function hrefFor(search) {
    var loc = { search: search, hostname: "app.youyisida.com", href: "", replace: function () {} };
    var sandbox = {
      URLSearchParams: URLSearchParams,
      encodeURIComponent: encodeURIComponent,
      sessionStorage: { getItem: function () { return null; }, setItem: function () {} },
      location: loc,
      document: { readyState: "complete", addEventListener: function () {} },
      window: null
    };
    sandbox.window = sandbox;
    sandbox.window.location = loc;
    sandbox.window.YYSD_APP_GATE = { tikuHome: function () { return "https://tiku.youyisida.com/"; } };
    vm.runInNewContext(play, sandbox);
    return sandbox.window.YYSD_PLAY.backHref("reading");
  }
  if (hrefFor("?preview=1") !== "https://tiku.youyisida.com/") throw new Error("preview block back");
  if (hrefFor("?preview=1&bank=p1") !== "bank.html?id=p1&preview=1") throw new Error("preview paper back");
  if (hrefFor("?bank=p1") !== "bank.html?id=p1") throw new Error("student bank back");
  if (hrefFor("") !== "reading-lab.html") throw new Error("student lab back");
})();
var rev = fs.readFileSync(path.join(__dirname, "..", "app/review.html"), "utf8");
if (rev.indexOf("P.backHref") < 0 || rev.indexOf("P.goBack") < 0) throw new Error("review back uses play helper");
if (rev.indexOf("P.isPreview()") < 0) throw new Error("review preview skips student chrome");
var run = fs.readFileSync(path.join(__dirname, "..", "app/assets/js/tiku-run.js"), "utf8");
if (run.indexOf("function doneHref") < 0 || run.indexOf("run.preview") < 0) throw new Error("tiku-run done keeps preview");
var bankHtml = fs.readFileSync(path.join(__dirname, "..", "app/bank.html"), "utf8");
if (bankHtml.indexOf("bindPvBack") < 0 || bankHtml.indexOf("window.close") < 0) {
  throw new Error("bank preview back closes popup");
}
var siteAuth = fs.readFileSync(path.join(__dirname, "..", "assets/js/auth.js"), "utf8");
if ((siteAuth.match(/get\("preview"\) === "1"/g) || []).length < 3) {
  throw new Error("site auth preview skip");
}
var gateApp = fs.readFileSync(path.join(__dirname, "..", "app/assets/js/gate.js"), "utf8");
if (gateApp.indexOf('preview') < 0) throw new Error("app gate preview");
if (gateApp.indexOf("tikuHome") < 0) throw new Error("app gate tikuHome");
if (/if\s*\(\s*!pkgs\s*\)\s*jobs\.push/.test(ui)) throw new Error("packages must refetch on 开通");
if (ui.indexOf("data-refresh") < 0) throw new Error("tab refresh");
if (ui.indexOf("class=\"bench\"") < 0) throw new Error("merged bench");
var html = fs.readFileSync(path.join(__dirname, "..", "tiku/index.html"), "utf8");
if (html.indexOf('id="refresh"') < 0) throw new Error("refresh button");
var gate = fs.readFileSync(path.join(__dirname, "..", "tiku/gate.js"), "utf8");
if (gate.indexOf("injectRefresh") < 0) throw new Error("gate injects refresh");
var plat = fs.readFileSync(path.join(__dirname, "..", "platform.html"), "utf8");
if (plat.indexOf("plat-tiku") < 0) throw new Error("platform tiku");
if (ui.indexOf('[["pool", "题目审阅"], ["mine", "已有试卷"]]') < 0) throw new Error("teacher review tabs");
["data-add", "function saveBuild", "function paintBuild", "function copyPaper", "data-edit"].forEach(function (s) {
  if (ui.indexOf(s) >= 0) throw new Error("manual builder remains: " + s);
});
(function () {
  var assert = require("assert");
  var crypto = require("crypto");
  var root = path.join(__dirname, "..");
  var dir = path.join(root, "server/data/toefl-prediction-2026-10-17");
  if (!fs.existsSync(path.join(dir, "manifest.json"))) return;
  var manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  var snapshot = JSON.parse(fs.readFileSync(path.join(dir, "snapshot.json"), "utf8"));
  assert.strictEqual(manifest.members.length, 67);
  assert.strictEqual(manifest.questionCount, 317);
  assert.strictEqual(manifest.assets.length, 299);
  assert.strictEqual(manifest.members.reduce(function (n, m) { return n + m.questionCount; }, 0), 317);
  var ids = {};
  pool.forEach(function (b) { ids[b.id] = b; });
  manifest.members.forEach(function (m) {
    var b = ids[m.blockId];
    assert.ok(b && b.sources.indexOf("prediction") >= 0);
    assert.strictEqual(b.source === "prediction", !m.reused);
    var detail = tiku.blockDetail(root, m.blockId);
    var source = snapshot.sections[m.key].items.filter(function (item) { return item.num === m.num; })[0];
    assert.ok(detail.sourceItems.some(function (item) { return JSON.stringify(item) === JSON.stringify(source); }));
    var count = detail.tasks.reduce(function (n, task) {
      return n + (task.type === "complete_words" ? task.passage.filter(function (p) { return p.id; }).length : (task.questions || []).length || 1);
    }, 0);
    assert.strictEqual(count, m.questionCount);
    detail.media.forEach(function (a) { assert.ok(/^\/api\/tiku\/prediction\/media\/[a-f0-9]{24}\.[a-z0-9]+$/.test(a.path)); });
  });
  manifest.assets.forEach(function (a) {
    if (a.error) { assert.ok(a.unavailable && a.downloadMethod === "authorized-browser" && /403/.test(a.error)); return; }
    var data = fs.readFileSync(path.join(dir, "media", a.filename));
    assert.strictEqual(data.length, a.bytes);
    assert.strictEqual(crypto.createHash("sha256").update(data).digest("hex"), a.sha256);
  });
  assert.ok(tiku.validateKind("practice", [{ source: "prediction" }]));
  assert.strictEqual(tiku.validateKind("practice", [{ source: "bank", sources: ["bank", "prediction"] }]), "");
  assert.strictEqual(tiku.blockDetail(root, "missing-block"), null);
})();
console.log("tiku ok", pool.length, "blocks");
