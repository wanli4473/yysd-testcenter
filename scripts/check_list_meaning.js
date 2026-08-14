#!/usr/bin/env node
"use strict";
var fs = require("fs");
var path = require("path");
var src = fs.readFileSync(path.join(__dirname, "../assets/js/vocab-learn.js"), "utf8");
var m = src.match(/^function yysdMeaningForList\(raw, accept\) \{\n[\s\S]*?\n\}\n/m);
if (!m) {
  console.error("FAIL: yysdMeaningForList not found");
  process.exit(1);
}
var fn = Function(m[0] + "\nreturn yysdMeaningForList;")();

function eq(got, want, label) {
  if (got !== want) {
    console.error("FAIL:", label);
    console.error(" got ", JSON.stringify(got));
    console.error(" want", JSON.stringify(want));
    process.exit(1);
  }
}

eq(
  fn("adj. ①空的，空无一人的；②空洞的，无意义的（empty promises）。v. 倒空，清空（empty the bin）。n. 空瓶，空箱。empty of（没有…）。反义 full。"),
  "adj. ①空的，空无一人的；②空洞的，无意义的。v. 倒空，清空。n. 空瓶，空箱。",
  "empty"
);
eq(
  fn("n. 踝，踝关节。twist / sprain one's ankle（扭伤脚踝）；ankle boots（踝靴）。"),
  "n. 踝，踝关节。",
  "ankle"
);
eq(
  fn("v. 游泳；游过（swim the river）；旋转、眩晕（my head is swimming）；充满（eyes swimming with tears）。n. 游泳。go for a swim；swimming pool。不规则：swim–swam–swum。"),
  "v. 游泳；游过；旋转、眩晕；充满。n. 游泳。",
  "swim"
);
eq(
  fn("v. ①祝福，保佑（God bless you；bless sb with sth 赋予某人某物）；②使有幸得到。n. blessing 祝福，幸事。a blessing in disguise（因祸得福）。be blessed with（有幸拥有）。宗教用语已日常化，口语 God bless 表祝愿或打喷嚏时的回应。"),
  "v. ①祝福，保佑；②使有幸得到。n. 祝福，幸事。",
  "bless"
);
eq(fn("按照；根据"), "按照；根据", "cet4 passthrough");
eq(fn("adv. 因此，从而，这样。较正式，相当于 therefore / so。thus far（到目前为止）。"), "adv. 因此，从而，这样。", "thus");

console.log("OK: list meaning");
