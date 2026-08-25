/* ponytail: CDT suite P1 — prompts, time-up hop, draft isolation, calendar cdt */
var fs = require("fs");
function assert(cond, msg) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } }
var bridge = fs.readFileSync("assets/js/exam-bridge.js", "utf8");
var exam = fs.readFileSync("assets/js/exam.js", "utf8");
var cdt = fs.readFileSync("assets/js/exam-cdt.js", "utf8");
var cal = fs.readFileSync("assets/js/student-calendar.js", "utf8");
var dash = fs.readFileSync("assets/js/dashboard.js", "utf8");
var teach = fs.readFileSync("assets/js/teacher-calendar.js", "utf8");
var cfg = fs.readFileSync("assets/js/config.js", "utf8");
var server = fs.readFileSync("server/server.js", "utf8");
var report = fs.readFileSync("assets/js/cdt-report.js", "utf8");
var css = fs.readFileSync("assets/css/exam-cdt.css", "utf8");
var thtml = fs.readFileSync("teacher-calendar.html", "utf8");

assert(/writingPrompt1: promptForTask/.test(bridge), "writing score includes prompts");
assert(/writingChartNote: chartNoteFromTest/.test(bridge), "writing score includes chart note");
assert(/clearCdtWritingDraft/.test(bridge) && /cdtPack\(\) === "exam"/.test(bridge), "CDT clears writing draft on exam start");
assert(/if \(!cdtWanted\)/.test(exam) && /practiceDraftElapsed/.test(exam), "CDT skips practice elapsed");
assert(/function hopAfterSubmit/.test(cdt) && /timeUpHop/.test(cdt), "time-up hops suite");
assert(/alreadyScoredThisPaper/.test(cdt), "re-Finish skips 12s wait when scored");
assert(/function showSubmitLoading/.test(cdt) && /submitLoadingMsg/.test(cdt), "CDT submit loading helpers");
var examHtml = fs.readFileSync("exam.html", "utf8");
assert(/id="cdt-submit-loading"/.test(examHtml), "exam.html submit loading host");
assert(/cdt-submit-loading/.test(css), "exam-cdt.css submit loading styles");
assert(/cambridgeCdtQs/.test(cal), "calendar uses cambridgeCdtQs");
assert(/cambridgeCdtQs/.test(dash), "dashboard uses cambridgeCdtQs");
assert(/function cambridgeCdtQs/.test(cfg), "config cambridgeCdtQs");
assert(/data-ex-cat="skill"/.test(thtml), "teacher skill mock cat");
assert(/data-ex-cat="part"/.test(thtml) && /补弱练习/.test(thtml), "teacher part cat renamed");
assert(/data-ex-cat="qtype"/.test(thtml) && /听力题型练习/.test(thtml), "teacher qtype cat");
assert(/data-ex-cat="scene"/.test(thtml) && /听力场景练习/.test(thtml), "teacher scene cat");
assert(/data-ex-cat="rqtype"/.test(thtml) && /阅读题型练习/.test(thtml), "teacher reading qtype cat");
assert(/data-ex-cat="rscene"/.test(thtml) && /阅读场景练习/.test(thtml), "teacher reading scene cat");
assert(!/data-ex-cat="listening"/.test(thtml), "no listening practice chip");
assert(/exercise-browse|exercise-vol-filter/.test(thtml), "browse cascade hosts");
assert(/cdtPackForCat/.test(teach) && /ensureBrowseDefaults/.test(teach), "teacher cascade browse");
assert(/cat === "qtype" \|\| cat === "scene"/.test(teach) || /cat === "part" \|\| cat === "qtype"/.test(teach), "qtype/scene drill pack");
assert(/isTaxonomyBrowse/.test(teach) && /loadListeningTaxonomy/.test(teach) && /loadReadingTaxonomy/.test(teach), "teacher taxonomy browse");
assert(/assign-desk/.test(thtml) && /cal-modal__panel--desk/.test(thtml), "assign desk layout");
assert(!/id="f-desc"/.test(thtml) && /assign-desk__students-body/.test(thtml), "no desc field; student body wrap");
assert(/全部册/.test(teach) && /concat\(vols\)/.test(teach), "all-volumes chip");
assert(/全部 Tests/.test(teach), "all-tests chip");
assert(/matchVolTest/.test(teach) && /cambridgeVolumes/.test(teach), "vol/test filter helpers");
assert(/ensureVocabBrowseDefaults/.test(teach) && /data-ex-vbook/.test(teach), "teacher vocab book browse");
assert(/vocabRangesForBook/.test(teach) && /listsInVocabRange/.test(teach), "vocab range filter");
assert(/cdt_pack/.test(server) && /cdtPack/.test(server), "server cdt_pack");
assert(/writingPrompt1/.test(server) && /writingChartNote/.test(server), "sanitizeScore keeps prompts");
assert(/event/.test(report) && /rpt-retry/.test(report), "report retry keeps event");
assert(/keep 52px chrome height/.test(css) || /height: 52px/.test(css), "mobile header stays 52px");

assert(/function parseGroupId/.test(cfg), "parseGroupId");
assert(/function isAssignedStudentDrill/.test(cdt) && /skipAssignedGatesToStart/.test(cdt), "assigned drill skips section gate");
assert(/if \(!range\) return s/.test(bridge), "clip whole part when no q range");
assert(/function clipAssignedGroup/.test(bridge), "clip assigned q-range group");
assert(/TEST\.passages = clipBlocks/.test(bridge), "clip reading passages");
assert(/assignQFrom/.test(exam), "exam.js passes qFrom");
assert(/loadListeningTaxonomy/.test(cfg) && /loadReadingTaxonomy/.test(cfg), "config loads taxonomies");
assert(/replace\("manifest\.json", file\)/.test(cfg), "taxonomy url keeps ?v=");

var tax = JSON.parse(fs.readFileSync("library/listening-taxonomy.json", "utf8"));
assert(tax.groups && tax.groups.length > 400, "taxonomy groups");
assert(tax.parts && tax.parts.length > 200, "taxonomy scene parts");
assert(tax.types && tax.types.indexOf("填空题") >= 0, "taxonomy types");
assert(tax.scenes && tax.scenes.indexOf("求职") >= 0, "taxonomy scenes");

var rtax = JSON.parse(fs.readFileSync("library/reading-taxonomy.json", "utf8"));
assert(rtax.groups && rtax.groups.length > 400, "reading taxonomy groups");
assert(rtax.parts && rtax.parts.length > 150, "reading taxonomy scene parts");
assert(rtax.types && rtax.types.indexOf("判断题") >= 0, "reading taxonomy types");
assert(rtax.scenes && rtax.scenes.indexOf("社会人文") >= 0, "reading taxonomy scenes");
assert(rtax.groups[0].id.indexOf("-reading-p") > 0, "reading group id shape");
function taxById(arr, id) {
  for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
}
var c14mcq = taxById(tax.groups, "cambridge-14-test-2-s3-q21-24");
assert(c14mcq && c14mcq.qType === "单选题", "c14 t2 p3 q21-24 单选题");
assert(taxById(rtax.parts, "cambridge-19-test-2-reading-p1").scene === "历史发展", "c19 t2 p1 scene");
assert(taxById(rtax.parts, "cambridge-19-test-3-reading-p1").scene === "历史发展", "c19 t3 p1 scene");
assert(taxById(rtax.parts, "cambridge-15-test-4-reading-p2").scene === "语言教育", "c15 t4 p2 scene");
assert(taxById(rtax.parts, "cambridge-14-test-3-reading-p1").scene === "语言教育", "c14 t3 p1 scene");
assert(taxById(rtax.parts, "cambridge-14-test-3-reading-p3").scene === "语言教育", "c14 t3 p3 scene");
assert(taxById(rtax.parts, "cambridge-12-test-3-reading-p3").scene === "社会人文", "c12 t3 p3 scene");

var start = cfg.indexOf("function cambridgeCdtQs");
var end = cfg.indexOf("\n  function makePartItem");
assert(start > 0 && end > start, "cambridgeCdtQs slice");
var qs = Function(cfg.slice(start, end) + "\nreturn cambridgeCdtQs;")();
assert(qs("cambridge-16-test-4-reading-p3", ["cambridge-16-test-4-reading-p3"]) === "&cdt=1&pack=drill", "part drill cdt");
assert(qs("cambridge-16-test-4-reading", ["cambridge-16-test-4-reading"], "exam") === "&cdt=1&pack=exam", "skill mock exam");
assert(qs("cambridge-16-test-4-s2", ["cambridge-16-test-4-s2"]) === "&cdt=1&pack=drill", "listening section drill");
assert(qs("cambridge-21-test-1-s1-q1-6", ["cambridge-21-test-1-s1-q1-6"]) === "&cdt=1&pack=drill", "qtype group drill");
assert(qs("cambridge-21-test-1-reading-p1-q1-7", ["cambridge-21-test-1-reading-p1-q1-7"]) === "&cdt=1&pack=drill", "reading qtype group drill");
assert(qs("cambridge-16-test-4", ["cambridge-16-test-4", "cambridge-16-test-4-reading", "cambridge-16-test-4-writing"]) === "&cdt=1&pack=exam&suite=1", "suite cdt");
assert(qs("not-cambridge", []) === "", "non-cam empty");

var pgStart = cfg.indexOf("function parseGroupId");
var pgEnd = cfg.indexOf("\n  function cambridgeCdtQs");
assert(pgStart > 0 && pgEnd > pgStart, "parseGroupId slice");
var parseGroupId = Function(cfg.slice(pgStart, pgEnd) + "\nreturn parseGroupId;")();
var g = parseGroupId("cambridge-21-test-1-s1-q1-6");
assert(g && g.parentId === "cambridge-21-test-1" && g.num === 1 && g.qFrom === 1 && g.qTo === 6, "parseGroupId fields");
assert(!parseGroupId("cambridge-21-test-1-s1"), "parseGroupId ignores section id");
var rg = parseGroupId("cambridge-21-test-1-reading-p1-q1-7");
assert(rg && rg.parentId === "cambridge-21-test-1-reading" && rg.kind === "p" && rg.num === 1 && rg.qFrom === 1 && rg.qTo === 7, "parseGroupId reading");
assert(!parseGroupId("cambridge-21-test-1-reading-p1"), "parseGroupId ignores passage id");

var mgStart = cfg.indexOf("function makePartItem");
var mgEnd = cfg.indexOf("\n  function resolveItem");
assert(mgStart > 0 && mgEnd > mgStart, "makeGroupItem slice");
var makeGroupItem = Function(cfg.slice(mgStart, mgEnd) + "\nreturn makeGroupItem;")();
var rItem = makeGroupItem({ id: "cambridge-21-test-1-reading", subject: "cambridge-reading", title: "剑21" }, 1, 1, 7);
assert(rItem && rItem.id === "cambridge-21-test-1-reading-p1-q1-7" && rItem.partKind === "p", "makeGroupItem reading");
var lItem = makeGroupItem({ id: "cambridge-21-test-1", subject: "cambridge-listening", title: "剑21" }, 1, 1, 6);
assert(lItem && lItem.id === "cambridge-21-test-1-s1-q1-6" && lItem.partKind === "s", "makeGroupItem listening");

console.log("ok: cdt p1 guards");
