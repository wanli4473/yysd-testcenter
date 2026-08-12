#!/usr/bin/env node
"use strict";
/**
 * Hide embedded 「单词检测」UI in legacy list HTML (data source pages).
 * ponytail: CSS hide only — wordData parsing untouched.
 */
var fs = require("fs");
var path = require("path");

var MARK = "<!-- yysd:hide-legacy-test -->";
var SNIP =
  MARK +
  '<style id="yysd-hide-legacy-test">' +
  '.nav-tab[data-mode="test"],#testSection,.test-section,[data-mode="test"]{display:none!important}' +
  "</style>";

var root = path.join(__dirname, "../library");
var n = 0;
function walk(dir) {
  fs.readdirSync(dir).forEach(function (name) {
    var fp = path.join(dir, name);
    var st = fs.statSync(fp);
    if (st.isDirectory()) return walk(fp);
    if (!/\.html$/i.test(name)) return;
    var html = fs.readFileSync(fp, "utf8");
    if (html.indexOf('data-mode="test"') < 0 && html.indexOf("单词检测") < 0) return;
    if (html.indexOf(MARK) >= 0) return;
    if (!/<\/head>/i.test(html)) return;
    var out = html.replace(/<\/head>/i, SNIP + "\n</head>");
    fs.writeFileSync(fp, out);
    n++;
  });
}
walk(root);
console.log("hide_legacy_vocab_test ok · patched=" + n);
