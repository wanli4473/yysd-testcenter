"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var arg = process.argv[2];
if (!arg) throw new Error("need set id stem e.g. 1 or 73a or all");
var bankPath = path.join(root, "app/library/toefl/bank-ad-writing.json");
var paper = JSON.parse(fs.readFileSync(bankPath, "utf8"));

var PHOTO = {
  professor: "library/toefl/img/2025-09-02/diaz.png",
  female: "library/toefl/img/2025-09-02/kelly.png",
  male: "library/toefl/img/2025-09-02/andrew.png"
};
var FEMALE = /^(kelly|claire|maya|lena|nora|emma|sophia|olivia|ava|mia|amelia|harper|evelyn|abigail|emily|elizabeth|sofia|camila|gina|anna|sarah|susan|jennifer|lisa|karen|nancy|betty|helen|sandra|donna|carol|ruth|sharon|michelle|laura|kimberly|deborah|stephanie|rebecca|sharon|cynthia|kathleen|amy|angela|shirley|brenda|emma|olivia|charlotte|isabella|mia|evelyn|harper|luna|ella|scarlett|chloe|victoria|madison|eleanor|grace|penelope|layla|riley|zoey|nora|lily|eleanor|hannah|lillian|addison|aubrey|ellie|stella|natalie|zoe|leah|hazel|violet|aurora|savannah|audrey|brooklyn|bella|claire|skylar|lucy|paisley|everly|anna|caroline|nova|genesis|emilia|kennedy|samantha|maya|willow|kinsley|naomi|aaliyah|elena|sarah|ariana|allison|gabriella|alice|madelyn|cora|ruby|eva|serenity|autumn|adeline|hailey|gianna|valentina|isla|eliana|quinn|nevaeh|ivy|sadie|piper|lydia|alexa|josephine|emery|julia|delilah|ariella|iris|jose|maria|maria)$/i;
var MALE = /^(andrew|paul|daniel|omar|ethan|liam|noah|oliver|james|william|benjamin|lucas|henry|theodore|jack|levi|alexander|julian|mateo|anthony|dylan|ezra|thomas|charles|christopher|jaiuden|josiah|caleb|isaiah|nathan|ryan|adrian|miles|cameron|colton|landon|roman|austin|jonathan|luke|robert|aaron|adam|ian|jordan|kevin|jason|eric|brian|tyler|brandon|justin|samuel|david|joseph|john|michael|matthew|mark|steven|timothy|jeffrey|gary|ronald|edward|jason|jeffrey|frank|scott|stephen|raymond|gregory|joshua|jerry|dennis|walter|patrick|peter|harold|douglas|henry|carl|arthur|ryan)$/i;

function genderPhoto(name) {
  var n = String(name || "").trim();
  if (/^(dr\.?|professor|prof\.?)\b/i.test(n)) return PHOTO.professor;
  var first = n.replace(/^(dr\.?|professor|prof\.?)\s+/i, "").split(/\s+/)[0] || "";
  if (FEMALE.test(first)) return PHOTO.female;
  if (MALE.test(first)) return PHOTO.male;
  // default: alternate-ish by name hash
  var h = 0;
  for (var i = 0; i < first.length; i++) h = (h + first.charCodeAt(i)) % 2;
  return h ? PHOTO.female : PHOTO.male;
}

function ensurePhotos(t) {
  if (!t.professor.photo) t.professor.photo = genderPhoto(t.professor.name) === PHOTO.female ? PHOTO.professor : PHOTO.professor;
  // professors always diaz portrait pool
  t.professor.photo = PHOTO.professor;
  (t.posts || []).forEach(function (p) {
    if (!p.photo) p.photo = genderPhoto(p.name);
  });
}

function mergeFile(filePath) {
  var pack = JSON.parse(fs.readFileSync(filePath, "utf8"));
  var tasks = Array.isArray(pack) ? pack : pack.tasks;
  if (!tasks || !tasks.length) throw new Error(filePath + " empty");
  tasks.forEach(function (t) {
    if (t.type !== "discussion") throw new Error((t.set || "?") + " not discussion");
    if (!t.professor || !t.professor.name || !t.professor.text) throw new Error(t.set + " professor");
    if (!t.posts || t.posts.length !== 2) throw new Error(t.set + " posts");
    ensurePhotos(t);
    if (!t.set) throw new Error("missing set");
  });
  tasks.forEach(function (t) {
    paper.tasks = paper.tasks.filter(function (x) { return String(x.set || "") !== t.set; });
    paper.tasks.push(Object.assign({}, t, {
      type: "discussion",
      title: t.title || "Academic Discussion",
      titleZh: t.titleZh || "学术讨论",
      sample: t.sample || "",
      analysis: t.analysis || "",
      instruction: t.instruction || "Your professor is teaching a class. Write a post responding to the professor's question.\nIn your response, you should do the following:\n• Express and support your personal opinion.\n• Make a contribution to the discussion in your own words.\nAn effective response will contain at least 100 words."
    }));
  });
}

if (arg === "all") {
  var dir = path.join(root, "app/library/toefl/incoming");
  fs.readdirSync(dir).filter(function (f) { return /^W-AD.+\.json$/.test(f); })
    .sort()
    .forEach(function (f) { mergeFile(path.join(dir, f)); });
} else {
  // accept numeric or full stem filename without .json
  var candidates = [
    path.join(root, "app/library/toefl/incoming/W-AD" + arg + ".json"),
    path.join(root, "app/library/toefl/incoming/" + arg + ".json")
  ];
  var hit = candidates.filter(function (p) { return fs.existsSync(p); })[0];
  if (!hit) throw new Error("missing incoming for " + arg);
  mergeFile(hit);
}

paper.tasks.sort(function (a, b) {
  function key(s) {
    var m = /^W-AD(\d+)(?:-(.+))?$/.exec(String(s || ""));
    if (!m) return [9999, String(s || "")];
    return [Number(m[1]), m[2] || ""];
  }
  var ka = key(a.set), kb = key(b.set);
  return ka[0] - kb[0] || String(ka[1]).localeCompare(String(kb[1]));
});
paper.tasks.forEach(function (t, i) { t.id = i + 1; t.module = 1; });
var maxId = paper.tasks.length;
paper.modules[0].to = maxId;
paper.modules[0].from = maxId ? 1 : 0;
paper.modules[0].timeSec = Math.max(600, maxId * 600);
fs.writeFileSync(bankPath, JSON.stringify(paper, null, 2) + "\n");
console.log("merged ad total=" + maxId);
