/* =========================================================================
   alevel-papers.js — CAIE / A-Level official paper component labels
   Paper code e.g. "12" → Paper 1, variant 2 → display as 9709/12
   ========================================================================= */
window.YYSD_ALEVEL_PAPERS = (function () {
  "use strict";

  var SEASON_MM = { m: "03", s: "06", w: "11" };
  var SEASON_ZH = { m: "春季", s: "夏季", w: "冬季" };
  var SEASON_SHORT = { m: "春", s: "夏", w: "冬" };

  // ponytail: desc from CAIE syllabi — enough for teachers to pick the right paper
  var BY_CODE = {
    "9709": [
      { d: 1, short: "P1", name: "Pure Mathematics 1", nameZh: "纯数 P1", level: "AS/A2",
        desc: "代数、函数、坐标几何、三角、数列、微积分入门" },
      { d: 2, short: "P2", name: "Pure Mathematics 2", nameZh: "纯数 P2", level: "AS",
        desc: "代数、指数对数、三角、微积分、数值解方程（仅 AS 路线）" },
      { d: 3, short: "P3", name: "Pure Mathematics 3", nameZh: "纯数 P3", level: "A2",
        desc: "向量、微分方程、复数等 A2 纯数" },
      { d: 4, short: "M", name: "Mechanics", nameZh: "力学 M", level: "AS/A2",
        desc: "力与平衡、直线运动、动量、牛顿定律、功与能" },
      { d: 5, short: "S1", name: "Probability & Statistics 1", nameZh: "概率统计 S1", level: "AS/A2",
        desc: "数据表示、排列组合、概率、离散随机变量、正态分布" },
      { d: 6, short: "S2", name: "Probability & Statistics 2", nameZh: "概率统计 S2", level: "A2",
        desc: "泊松分布、连续随机变量、估计与假设检验" },
      { d: 7, short: "M2", name: "Mechanics 2", nameZh: "力学 M2", level: "A2",
        desc: "进阶力学" }
    ],
    "9231": [
      { d: 1, short: "FP1", name: "Further Pure 1", nameZh: "高数 FP1", level: "AS/A2",
        desc: "进阶纯数：矩阵、复数、级数等" },
      { d: 2, short: "FP2", name: "Further Pure 2", nameZh: "高数 FP2", level: "A2",
        desc: "进阶纯数 A2 内容" },
      { d: 3, short: "FM", name: "Further Mechanics", nameZh: "高数 FM", level: "AS/A2",
        desc: "进阶力学" },
      { d: 4, short: "FS", name: "Further Statistics", nameZh: "高数 FS", level: "AS/A2",
        desc: "进阶概率统计" }
    ],
    "9700": "science",
    "9701": "science",
    "9702": "science",
    "9708": [
      { d: 1, short: "P1", name: "Multiple Choice", nameZh: "P1 选择题", level: "AS",
        desc: "30 道选择题，考查 AS 考纲" },
      { d: 2, short: "P2", name: "Data Response and Essays", nameZh: "P2 数据回应", level: "AS",
        desc: "数据回应与简答，考查 AS 考纲" },
      { d: 3, short: "P3", name: "Essay", nameZh: "P3 论述题", level: "A2",
        desc: "论述题，考查 A2 考纲" },
      { d: 4, short: "P4", name: "Data Response", nameZh: "P4 数据回应", level: "A2",
        desc: "数据回应题，考查 A2 考纲" }
    ],
    "9706": [
      { d: 1, short: "P1", name: "Multiple Choice", nameZh: "P1 选择题", level: "AS",
        desc: "选择题，考查 AS 考纲" },
      { d: 2, short: "P2", name: "Structured Questions", nameZh: "P2 结构题", level: "AS",
        desc: "结构化试题，考查 AS 考纲" },
      { d: 3, short: "P3", name: "Structured Questions", nameZh: "P3 结构题", level: "A2",
        desc: "结构化试题，考查 A2 考纲" },
      { d: 4, short: "P4", name: "Structured Questions", nameZh: "P4 结构题", level: "A2",
        desc: "结构化试题，考查 A2 考纲" }
    ]
  };

  var SCIENCE = [
    { d: 1, short: "P1", name: "Multiple Choice", nameZh: "P1 选择题", level: "AS",
      desc: "40 道选择题，考查 AS 考纲" },
    { d: 2, short: "P2", name: "Structured Questions", nameZh: "P2 AS结构题", level: "AS",
      desc: "结构化问答题，考查 AS 考纲" },
    { d: 3, short: "P3", name: "Advanced Practical Skills", nameZh: "P3 AS实验题", level: "AS",
      desc: "实验操作与数据分析，考查 AS 实验技能" },
    { d: 4, short: "P4", name: "Structured Questions", nameZh: "P4 A2结构题", level: "A2",
      desc: "结构化问答题，考查 A2 考纲（含 AS 内容）" },
    { d: 5, short: "P5", name: "Planning, Analysis and Evaluation", nameZh: "P5 A2实验题", level: "A2",
      desc: "实验设计、数据分析与评估" }
  ];

  function schema(code) {
    var key = String(code).toUpperCase();
    var s = BY_CODE[key];
    if (s === "science") return SCIENCE;
    if (Array.isArray(s)) return s;
    return null;
  }

  function paperDigit(paper) {
    var p = String(paper);
    if (p.length < 2) return parseInt(p, 10) || 0;
    return parseInt(p.charAt(0), 10);
  }

  function paperVariant(paper) {
    return String(paper).slice(-1);
  }

  function componentMeta(code, paper) {
    var digit = paperDigit(paper);
    var list = schema(code);
    if (!list) {
      return {
        digit: digit,
        short: "P" + digit,
        name: "Paper " + digit,
        nameZh: "Paper " + digit,
        level: ""
      };
    }
    var hit = list.find(function (c) { return c.d === digit; });
    if (hit) return Object.assign({ digit: digit }, hit);
    return {
      digit: digit,
      short: "P" + digit,
      name: "Paper " + digit,
      nameZh: "Paper " + digit,
      level: ""
    };
  }

  function officialCode(code, paper) {
    return String(code).toUpperCase() + "/" + String(paper);
  }

  function fileStem(code, season, yy, paper) {
    return String(code).toLowerCase() + "_" + season + String(yy).slice(-2) + "_" + String(paper);
  }

  function sessionLine(year, season) {
    return year + " " + (SEASON_ZH[season] || season);
  }

  function sessionShort(season) {
    return SEASON_SHORT[season] || season;
  }

  function subjectFileTag(name) {
    return String(name || "").replace(/[^A-Za-z0-9]+/g, "");
  }

  function displayFilename(type, subjectName, year, season, paper) {
    return type + "-" + year + (SEASON_MM[season] || "06") + "-" +
      subjectFileTag(subjectName) + "-P" + paper + ".pdf";
  }

  function matchesLevel(code, paper, filter) {
    if (!filter || filter === "all") return true;
    var lvl = componentMeta(code, paper).level || "";
    if (filter === "as") return lvl.indexOf("AS") >= 0;
    if (filter === "a2") return lvl.indexOf("A2") >= 0;
    return true;
  }

  // 学为贵：数学/高数按卷别(P1/FP1…)，生物等按 AS/A2
  function filterMode(code) {
    var key = String(code).toUpperCase();
    if (key === "9709" || key === "9231") return "component";
    if (key === "9700") return "level";
    return "level";
  }

  function matchesComponent(code, paper, filter) {
    if (!filter || filter === "all") return true;
    return String(paperDigit(paper)) === String(filter);
  }

  function sortFlatRows(rows) {
    return rows.slice().sort(function (a, b) {
      if (b.year !== a.year) return b.year - a.year;
      var order = { s: 1, w: 2, m: 3 };
      var sa = order[a.season] || 9;
      var sb = order[b.season] || 9;
      if (sa !== sb) return sa - sb;
      return String(a.paper).localeCompare(String(b.paper), undefined, { numeric: true });
    });
  }

  function rowSubtitle(code, paper) {
    var meta = componentMeta(code, paper);
    return officialCode(code, paper) + " · " + meta.nameZh + " · " + (meta.level || "");
  }

  function componentTitle(comp) {
    return comp.short + " · " + comp.nameZh;
  }

  function rowTitle(code, paper, year, season) {
    return officialCode(code, paper) + " · " + sessionLine(year, season);
  }

  function rowMeta(paper) {
    return "变卷 " + paperVariant(paper);
  }

  function sectionHeading(comp) {
    return comp.name + "（" + comp.nameZh + "）";
  }

  function componentsPresent(code, items) {
    var seen = {};
    items.forEach(function (it) {
      seen[paperDigit(it.paper)] = true;
    });
    var list = schema(code) || [];
    var out = [];
    list.forEach(function (c) {
      if (seen[c.d]) out.push(c);
    });
    Object.keys(seen).forEach(function (d) {
      d = parseInt(d, 10);
      if (!out.some(function (c) { return c.d === d; })) {
        out.push(componentMeta(code, d + "1"));
      }
    });
    out.sort(function (a, b) { return a.d - b.d; });
    return out;
  }

  function pairRows(items) {
    var map = {};
    items.forEach(function (it) {
      var key = it.year + "|" + it.season + "|" + it.paper;
      if (!map[key]) {
        map[key] = {
          year: it.year,
          season: it.season,
          seasonLabelZh: it.seasonLabelZh,
          paper: it.paper,
          code: it.code,
          qp: null,
          ms: null
        };
      }
      map[key][it.type] = it;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function groupByComponent(code, items) {
    var rows = pairRows(items);
    var groups = {};
    rows.forEach(function (row) {
      var digit = paperDigit(row.paper);
      if (!groups[digit]) groups[digit] = [];
      groups[digit].push(row);
    });
    Object.keys(groups).forEach(function (d) {
      groups[d].sort(function (a, b) {
        if (b.year !== a.year) return b.year - a.year;
        var order = { s: 1, w: 2, m: 3 };
        var sa = order[a.season] || 9;
        var sb = order[b.season] || 9;
        if (sa !== sb) return sa - sb;
        return String(a.paper).localeCompare(String(b.paper), undefined, { numeric: true });
      });
    });
    return groups;
  }

  function hintFor(code) {
    if (schema(code)) {
      return "按 Paper 分组 · 组内年份新→旧、考季夏→冬→春。模考请选相同变卷尾数（如 11、31、51）。";
    }
    return "";
  }

  return {
    schema: schema,
    paperDigit: paperDigit,
    paperVariant: paperVariant,
    componentMeta: componentMeta,
    officialCode: officialCode,
    fileStem: fileStem,
    sessionLine: sessionLine,
    sessionShort: sessionShort,
    displayFilename: displayFilename,
    filterMode: filterMode,
    matchesLevel: matchesLevel,
    matchesComponent: matchesComponent,
    sortFlatRows: sortFlatRows,
    rowSubtitle: rowSubtitle,
    componentTitle: componentTitle,
    rowTitle: rowTitle,
    rowMeta: rowMeta,
    sectionHeading: sectionHeading,
    componentsPresent: componentsPresent,
    pairRows: pairRows,
    groupByComponent: groupByComponent,
    hintFor: hintFor
  };
})();
