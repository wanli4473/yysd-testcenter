#!/usr/bin/env node
/* Assert CDT post-submit review UI wiring stays intact. */
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

var css = read("assets/css/cdt-review.css");
var js = read("assets/js/exam-cdt.js");
var html = read("exam.html");

console.assert(css.indexOf("body.yysd-cdt-review .res-card") >= 0, "review css missing res-card rules");
console.assert(css.indexOf("stat-box.s3") >= 0, "review css missing band prominence");
console.assert(js.indexOf("injectReviewStyles") >= 0, "exam-cdt missing injectReviewStyles");
console.assert(js.indexOf("polishResultDom") >= 0, "exam-cdt missing polishResultDom");
console.assert(js.indexOf("cdt-review.css") >= 0, "exam-cdt must load cdt-review.css");
console.assert(js.indexOf("location.origin") >= 0, "review css href must be origin-absolute for iframe");
console.assert(html.indexOf("exam-cdt.js?v=20260825skip1") >= 0, "exam.html cache bump for exam-cdt");
console.assert(html.indexOf("exam-cdt.css?v=20260801load1") >= 0, "exam.html cache bump for exam-cdt.css");
console.log("check_cdt_review_ui: ok");
