#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "library", "mock", "cambridge-listening");
function read(n) { return fs.readFileSync(path.join(root, n), "utf8"); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

var t1 = read("cambridge-8-test-1.html");
must(t1.indexOf("In the library George found") >= 0, "T1 example stem");
must(t1.indexOf("a brochure") >= 0, "T1 example B");
must(t1.indexOf("exampleHtml") >= 0, "T1 exampleHtml");
must(t1.indexOf("g.exampleHtml") >= 0, "T1 example renderer");
must(t1.indexOf('"kind": "table"') >= 0, "T1 Q6-10 table");
must(t1.indexOf("Price per ticket") >= 0, "T1 table col");
must(t1.indexOf("Singer (price includes <Q n=\\\"6\\\"> in the garden)") >= 0, "T1 Q6");
must(t1.indexOf("<Q n=\\\"7\\\"> (Anna Ventura)") >= 0, "T1 Q7");
must(t1.indexOf("afterHtml") >= 0, "T1 Q10 under table");
must(t1.indexOf("have <Q n=\\\"10\\\"> discount") >= 0, "T1 Q10 NB");
must(t1.indexOf("Instrumental group") >= 0 && t1.indexOf("Date:</strong> 5 June") < 0, "T1 no pipe rows");
must(t1.indexOf('"html": "a) maps"') >= 0, "T1 Q38 maps heading");
must(t1.indexOf("easy to carry") >= 0, "T1 Q38 dash");
must(t1.indexOf("some <Q n=\\\"38\\\">") >= 0, "T1 Q38 blank");
must(t1.indexOf("maps – easy to carry; can show") < 0, "T1 38-40 not one line");

var t2 = read("cambridge-8-test-2.html");
must(t2.length > 1000, "T2 still present");

var t3 = read("cambridge-8-test-3.html");
must(t3.indexOf('"html": "concert rooms"') >= 0, "T3 Q12 concert rooms bullet");
must(t3.indexOf('"html": "theatres"') >= 0, "T3 Q12 theatres");
must(t3.indexOf("a <Q n=\\\"12\\\">") >= 0, "T3 Q12 blank");
must(t3.indexOf("Complex consists of:</strong> concert rooms, theatres") < 0, "T3 Q12 not one line");
must(t3.indexOf('"html": "Manager tries to:"') >= 0, "T3 Q35 heading");
must(t3.indexOf("improve on the original process") >= 0, "T3 Q35 first bullet");
must(t3.indexOf("create an ideal <Q n=\\\"35\\\">") >= 0, "T3 Q35 blank");
must(t3.indexOf("Manager tries to: improve on the original") < 0, "T3 Q35 not one line");
must(t3.indexOf('"html": "copy original very closely:"') >= 0, "T3 Q39 heading");
must(t3.indexOf("physical features of the <Q n=\\\"39\\\">") >= 0, "T3 Q39");
must(t3.indexOf("the <Q n=\\\"40\\\"> of original employees") >= 0, "T3 Q40");
must(t3.indexOf("copy original very closely: physical features") < 0, "T3 39-40 not one line");

var t4 = read("cambridge-8-test-4.html");
must(t4.indexOf("Advice on exam preparation") >= 0, "T4 flow title");
must(t4.indexOf("Planning an essay") < 0, "T4 no old essay title");
must(t4.indexOf('"flow": true') >= 0, "T4 flow flag");
must(t4.indexOf("Work out your <Q n=\\\"27\\\"> for revision") >= 0, "T4 Q27");
must(t4.indexOf("Make a <Q n=\\\"28\\\"> and keep it in view") >= 0, "T4 Q28");
must(t4.indexOf("Divide revision into <Q n=\\\"29\\\">") >= 0, "T4 Q29");
must(t4.indexOf("Write one <Q n=\\\"30\\\"> about each topic") >= 0, "T4 Q30");
must(t4.indexOf("Practise writing some exam answers") >= 0, "T4 last box");
must(t4.indexOf("Rainbow Serpent image") >= 0, "T4 Q40 heading");
must(t4.indexOf("symbolises <Q n=\\\"40\\\"> in Aboriginal culture") >= 0, "T4 Q40 stem");
must(t4.indexOf('"creation"') >= 0, "T4 Q40 answer");
must(t4.indexOf('"html": "<Q n=\\\"40\\\">"') < 0, "T4 no stub Q40");

console.log("check_c8_teacher: ok");
