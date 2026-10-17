#!/usr/bin/env node
"use strict";
/**
 * Build 四级词汇（精简版） List HTML + ebbinghaus schedule + manifest entries
 * from Desktop Excel + existing CET4/gaozhong cards.
 */
var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");

var ROOT = path.join(__dirname, "..");
var OUT_DIR = path.join(ROOT, "library/study/vocab-cet4-lite");
var XLSX = "/Users/frankman/Desktop/四级单词精简版.xlsx";
var TODAY = "2026-08-21";

function parseWordData(html) {
  var m = String(html || "").match(/(?:const|var|let)\s+wordData\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return [];
  try {
    var arr = Function('"use strict"; return (' + m[1] + ");")();
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function addWords(map, words) {
  (words || []).forEach(function (w) {
    var k = String((w && w.word) || "").trim().toLowerCase();
    if (k && !map[k]) map[k] = w;
  });
}

function indexExisting() {
  var map = Object.create(null);
  function walkHtml(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(function (f) {
      if (!f.endsWith(".html")) return;
      addWords(map, parseWordData(fs.readFileSync(path.join(dir, f), "utf8")));
    });
  }
  walkHtml(path.join(ROOT, "library/study/vocab-cet4"));
  walkHtml(path.join(ROOT, "library/study/vocab"));
  for (var i = 1; i <= 35; i++) {
    var p = path.join(ROOT, "library/study/vocab-cet4-data", "list-" + String(i).padStart(2, "0") + ".json");
    if (!fs.existsSync(p)) continue;
    addWords(map, JSON.parse(fs.readFileSync(p, "utf8")).words || []);
  }
  return map;
}

function variants(raw) {
  var w = String(raw || "").trim();
  var out = {};
  function add(s) {
    s = String(s || "").trim().toLowerCase();
    if (s) out[s] = true;
  }
  add(w);
  if (w.indexOf("/") >= 0) {
    var parts = w.split("/");
    var a = parts[0];
    var b = parts[1] || "";
    add(a);
    if (b.indexOf("-") === 0) {
      if (b === "-ise" && /ize$/i.test(a)) add(a.replace(/ize$/i, "ise"));
      else if (b === "-tre" && /ter$/i.test(a)) add(a.replace(/ter$/i, "tre"));
      else if (b === "-sation") add(a.replace(/zation/i, "sation"));
      else add(a + b.slice(1));
    } else add(b);
  }
  [["(u)", "u"], ["(l)", "l"], ["(e)", "e"], ["(ue)", "ue"], ["(me)", "me"]].forEach(function (pair) {
    if (w.indexOf(pair[0]) >= 0) {
      add(w.split(pair[0]).join(""));
      add(w.split(pair[0]).join(pair[1]));
    }
  });
  return Object.keys(out);
}

function splitSpellings(raw) {
  var w = String(raw || "").trim();
  var us = w;
  var uk = w;
  if (w.indexOf("/") >= 0) {
    var parts = w.split("/");
    var a = parts[0];
    var b = parts[1] || "";
    if (b.indexOf("-") === 0) {
      if (b === "-ise" && /ize$/i.test(a)) {
        us = a;
        uk = a.replace(/ize$/i, "ise");
      } else if (b === "-tre" && /ter$/i.test(a)) {
        us = a;
        uk = a.replace(/ter$/i, "tre");
      } else if (b === "-sation") {
        us = a;
        uk = a.replace(/zation/i, "sation");
      } else {
        us = a;
        uk = a + b.slice(1);
      }
    } else if (/re$/i.test(a) && /er$/i.test(b)) {
      uk = a;
      us = b;
    } else if (/er$/i.test(a) && /re$/i.test(b)) {
      us = a;
      uk = b;
    } else if (/yze$/i.test(a) && /yse$/i.test(b)) {
      us = a;
      uk = b;
    } else if (/yse$/i.test(a) && /yze$/i.test(b)) {
      uk = a;
      us = b;
    } else {
      us = a;
      uk = b;
    }
  } else if (w.indexOf("(u)") >= 0) {
    us = w.split("(u)").join("");
    uk = w.split("(u)").join("u");
  } else if (w.indexOf("(l)") >= 0) {
    uk = w.split("(l)").join("");
    us = w.split("(l)").join("l");
  } else if (w.indexOf("(e)") >= 0) {
    us = w.split("(e)").join("");
    uk = w.split("(e)").join("e");
  } else if (w.indexOf("(ue)") >= 0) {
    us = w.split("(ue)").join("");
    uk = w.split("(ue)").join("ue");
  } else if (w.indexOf("(me)") >= 0) {
    us = w.split("(me)").join("");
    uk = w.split("(me)").join("me");
  }
  return { wordUs: us, wordUk: uk };
}

function splitIpa(ipa) {
  var s = String(ipa || "").trim();
  if (!s) return { uk: "", us: "" };
  var parts = s.split(/\s*·\s*/).map(function (p) { return p.trim(); }).filter(Boolean);
  if (parts.length >= 2) return { uk: parts[0], us: parts[1] };
  return { uk: parts[0] || s, us: parts[0] || s };
}

function loadExcel() {
  var py = [
    "import zipfile, xml.etree.ElementTree as ET, json, sys",
    "ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}",
    "path=sys.argv[1]",
    "z=zipfile.ZipFile(path)",
    "ss=[]",
    "r=ET.fromstring(z.read('xl/sharedStrings.xml'))",
    "for si in r.findall('m:si', ns):",
    "    ss.append(''.join(t.text or '' for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')))",
    "ws=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))",
    "def cell_val(c):",
    "    t=c.get('t'); v=c.find('m:v', ns)",
    "    if t=='s' and v is not None: return ss[int(v.text)]",
    "    return (v.text or '') if v is not None else ''",
    "rows=[]",
    "for row in ws.findall('m:sheetData/m:row', ns)[1:]:",
    "    vals=[cell_val(c) for c in row.findall('m:c', ns)]",
    "    if len(vals)>=3 and str(vals[2]).strip():",
    "        rows.append({'list':vals[0],'n':int(float(vals[1])),'word':vals[2].strip()})",
    "print(json.dumps(rows, ensure_ascii=False))"
  ].join("\n");
  var tmp = path.join("/tmp", "dump_cet4_lite.py");
  fs.writeFileSync(tmp, py);
  var raw = execFileSync("python3", [tmp, XLSX], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(raw);
}

function lookup(map, raw) {
  var keys = variants(raw);
  for (var i = 0; i < keys.length; i++) {
    if (map[keys[i]]) return map[keys[i]];
  }
  return null;
}

function cloneCard(src, excelWord, id) {
  var sp = splitSpellings(excelWord);
  var ipa = splitIpa(src && src.ipa);
  var spellings = [];
  [sp.wordUs, sp.wordUk].forEach(function (x) {
    if (x && spellings.indexOf(x) < 0) spellings.push(x);
  });
  var meaning = String((src && src.meaning) || "").trim();
  if (!meaning) throw new Error("no meaning for " + excelWord);
  var out = {
    id: id,
    word: sp.wordUs,
    wordUs: sp.wordUs,
    wordUk: sp.wordUk,
    spellings: spellings,
    ipa: ipa.us || ipa.uk,
    ipaUs: ipa.us || ipa.uk,
    ipaUk: ipa.uk || ipa.us,
    pos: String((src && src.pos) || "").trim(),
    meaning: meaning,
    phrases: src.phrases || "",
    example: src.example || "",
    exampleEn: src.exampleEn || src.exampleEN || "",
    exampleZh: src.exampleZh || src.exampleCN || "",
    acceptCN: Array.isArray(src.acceptCN) ? src.acceptCN.slice() : [],
    collocations: Array.isArray(src.collocations) ? src.collocations : [],
    root: src.root || src.mnemonic || "",
    synonyms: Array.isArray(src.synonyms) ? src.synonyms : [],
    antonyms: Array.isArray(src.antonyms) ? src.antonyms : [],
    examTag: src.examTag || { source: "大学英语四级", frequency: 4, commonUsage: "", topic: "精简版" }
  };
  if (!out.exampleEn && out.example) {
    var em = String(out.example).match(/^(.+?)[（(](.+)[）)]\s*$/);
    if (em) {
      out.exampleEn = em[1].trim();
      out.exampleZh = out.exampleZh || em[2].trim();
    }
  }
  return out;
}

function htmlFor(listNo, words) {
  var title = "四级词汇（精简版） List " + listNo;
  return "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n" +
    "<meta charset=\"UTF-8\">\n" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
    "<meta name=\"exam:title\" content=\"" + title + "\">\n" +
    "<title>" + title + "</title>\n" +
    "</head>\n<body>\n" +
    "<p>" + title + " · " + words.length + " 词</p>\n" +
    "<script>\nconst wordData = " + JSON.stringify(words, null, 2) + ";\n</script>\n" +
    "</body>\n</html>\n";
}

function buildSchedule(listCount) {
  var gz = JSON.parse(fs.readFileSync(
    path.join(ROOT, "server/schedules/gaozhong-ebbinghaus-schedule.json"), "utf8"
  ));
  function offsets(n) {
    var newDay = null;
    var revs = [];
    Object.keys(gz.days).forEach(function (d) {
      var p = gz.days[d];
      var day = Number(d);
      if (p.new === n) newDay = day;
      if ((p.reviews || []).indexOf(n) >= 0) revs.push(day);
    });
    if (!newDay) return [];
    return revs.map(function (d) { return d - newDay; }).filter(function (g) { return g > 0; });
  }
  var days = {};
  var maxDay = 0;
  for (var n = 1; n <= listCount; n++) {
    var newDay = n;
    if (!days[newDay]) days[newDay] = { new: n, reviews: [] };
    else days[newDay].new = n;
    maxDay = Math.max(maxDay, newDay);
    offsets(n).forEach(function (g) {
      var d = newDay + g;
      if (!days[d]) days[d] = { new: null, reviews: [] };
      if (days[d].reviews.indexOf(n) < 0) days[d].reviews.push(n);
      maxDay = Math.max(maxDay, d);
    });
  }
  var outDays = {};
  for (var d = 1; d <= maxDay; d++) {
    var p = days[d] || { new: null, reviews: [] };
    outDays[String(d)] = {
      new: p.new == null ? null : p.new,
      reviews: (p.reviews || []).slice().sort(function (a, b) { return a - b; })
    };
  }
  return { bookId: "cet4-lite", totalDays: maxDay, totalLists: listCount, days: outDays };
}

function main() {
  if (!fs.existsSync(XLSX)) throw new Error("missing " + XLSX);
  var map = indexExisting();
  var excel = loadExcel();
  var byList = {};
  excel.forEach(function (r) {
    var n = Number(String(r.list).replace(/\D/g, ""));
    if (!byList[n]) byList[n] = [];
    byList[n].push(r);
  });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  var miss = [];
  Object.keys(byList).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
    var rows = byList[n].slice().sort(function (a, b) { return a.n - b.n; });
    var words = rows.map(function (r, i) {
      var src = lookup(map, r.word);
      if (!src) {
        miss.push(r.word);
        throw new Error("unmatched " + r.word);
      }
      return cloneCard(src, r.word, i + 1);
    });
    var file = "四级精简LIST" + n + ".html";
    fs.writeFileSync(path.join(OUT_DIR, file), htmlFor(n, words));
    console.log("wrote", file, words.length);
  });
  if (miss.length) throw new Error("miss " + miss.length);

  var sched = buildSchedule(Object.keys(byList).length);
  fs.writeFileSync(
    path.join(ROOT, "server/schedules/cet4-lite-ebbinghaus-schedule.json"),
    JSON.stringify(sched, null, 2) + "\n"
  );
  console.log("schedule days", sched.totalDays);

  var manPath = path.join(ROOT, "library/manifest.json");
  var man = JSON.parse(fs.readFileSync(manPath, "utf8"));
  man.items = (man.items || []).filter(function (it) {
    return it.subject !== "vocab-cet4-lite";
  });
  Object.keys(byList).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
    man.items.push({
      id: "四级精简list" + n,
      file: "study/vocab-cet4-lite/四级精简LIST" + n + ".html",
      title: "四级词汇（精简版） List " + n,
      zone: "study",
      subject: "vocab-cet4-lite",
      duration: 0,
      description: byList[n].length + " 词 · 按 Excel 顺序",
      added: TODAY
    });
  });
  man.count = man.items.length;
  man.generated = new Date().toISOString();
  fs.writeFileSync(manPath, JSON.stringify(man, null, 2) + "\n");
  console.log("manifest items", man.count);
}

main();
