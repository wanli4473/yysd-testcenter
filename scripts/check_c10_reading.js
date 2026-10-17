#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-reading");

function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }
function load(n) {
  var html = read(n);
  var m = html.match(/const TEST = (\{[\s\S]*?\n\});/);
  must(m, n + " TEST");
  var TEST;
  eval("TEST = " + m[1]);
  return { html: html, TEST: TEST };
}

function renderWbank(g) {
  var src = g.box || g.bank || {};
  var letters = Object.keys(src);
  must(letters.length > 0, "wbank box empty");
  var rawLines = g.lines || (g.text ? [{ html: g.text }] : []);
  must(rawLines.length > 0, "wbank lines empty");
  rawLines.forEach(function (l) { must(l.html, "wbank line html"); });
}

var t1 = load("cambridge-10-test-1-reading.html");
must(t1.html.indexOf("having a shared objective") >= 0, "T1 Q27 C");
must(t1.html.indexOf("conscious of their own limitations") >= 0, "T1 Q28 A");
must(t1.html.indexOf("strengthen commitment to an idea") >= 0, "T1 Q29 D");
must(t1.html.indexOf("feel that their contributions are valued") >= 0, "T1 Q30 B");
must(t1.html.indexOf("physical surroundings in which a person works") >= 0, "T1 Q36");
must(t1.html.indexOf("Most people have the potential to be creative") >= 0, "T1 Q37");
must(t1.html.indexOf("equally matched intelligence") >= 0, "T1 Q38");
must(t1.html.indexOf("easier for smaller companies to be innovative") >= 0, "T1 Q39");
must(t1.html.indexOf("manager's approval of an idea") >= 0, "T1 Q40");
must(t1.html.indexOf("the importance of having the right mix") < 0, "T1 old Q27 gone");
must(t1.TEST.passages[2].groups[0].questions[0].answer[0] === "C", "T1 27 C");
must(t1.TEST.passages[2].groups[2].questions[0].answer[0] === "NO", "T1 36 NO");

var t2 = load("cambridge-10-test-2-reading.html");
var w = t2.TEST.passages[2].groups[0];
must(w.kind === "wbank", "T2 P3 wbank");
renderWbank(w);
must((w.box || w.bank).B === "mass production", "T2 bank B");
must(t2.html.indexOf("const src=g.box||g.bank||{}") >= 0, "T2 wbank harden");
t2.TEST.passages.forEach(function (p) {
  must(p.passage.paras.length, "T2 P" + p.id + " paras");
  p.groups.forEach(function (g) {
    if (g.kind === "wbank") renderWbank(g);
    if (g.kind === "note") must(g.lines && g.lines.length, "T2 note lines");
  });
});

var t3 = load("cambridge-10-test-3-reading.html");
must(t3.html.indexOf("The development of mass tourism") >= 0, "T3 headings");
must(t3.html.indexOf("Paragraph B") >= 0, "T3 Q1 Paragraph B");
must(t3.html.indexOf("the rapid expansion of international travel") < 0, "T3 old Q1 gone");
must(t3.TEST.passages[0].groups[0].questions[0].answer[0] === "ii", "T3 Q1 ii");
must(t3.TEST.passages[0].passage.paras[0].indexOf("Travel has existed") >= 0, "T3 P1 A");
must(t3.html.indexOf("more than 300 in Fiji alone") >= 0, "T3 P3 last para");
must(t3.TEST.passages[2].groups[0].kind === "wbank", "T3 Q27 wbank");
renderWbank(t3.TEST.passages[2].groups[0]);
must(t3.TEST.passages[2].groups[0].questions.map(function (q) { return q.answer[0]; }).join("") === "BFIGD", "T3 27-31 BFIGD");

var t4 = load("cambridge-10-test-4-reading.html");
var p2 = t4.TEST.passages[1].passage.paras.join("\n");
must(p2.indexOf("para-label\">A</span>Psychologists") >= 0, "T4 P2 A");
must(p2.indexOf("para-label\">B</span>'The evidence") >= 0, "T4 P2 B Peterson");
must(p2.indexOf("Kenneth Pedeleose") >= 0, "T4 P2 H Pedeleose");
must(p2.indexOf("internal adventure") >= 0, "T4 P2 last");
must(p2.indexOf("para-label\">H</span>G In 2004") < 0, "T4 P2 old H/G gone");
must(t4.TEST.passages[2].passage.paras.length === 10, "T4 P3 10 paras");
must(t4.TEST.passages[2].passage.paras[1].indexOf("atavism") >= 0, "T4 P3 split Lombroso");
must(t4.TEST.passages[2].passage.paras[2].indexOf("Dollo") >= 0, "T4 P3 Dollo own para");
must(t4.TEST.passages[2].passage.paras[9].indexOf("leading to an atavism") >= 0, "T4 P3 last");

["cambridge-10-test-1-reading.html", "cambridge-10-test-2-reading.html",
 "cambridge-10-test-3-reading.html", "cambridge-10-test-4-reading.html"].forEach(function (n) {
  must(read(n).indexOf("g.labels && g.labels.length") >= 0, n + " yn labels");
});

console.log("check_c10_reading: ok");
