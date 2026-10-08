/* ponytail: load Set 1 clip + jump to HIT review */
(function (w) {
  "use strict";
  var KEY = "yysd:app-review";

  function qs() { return new URLSearchParams(location.search); }
  function taskIndex() {
    var n = Number(qs().get("task"));
    return isNaN(n) ? 0 : n;
  }
  function taskEnd() {
    var raw = qs().get("end");
    if (raw == null || raw === "") return taskIndex();
    var n = Number(raw);
    return isNaN(n) ? taskIndex() : n;
  }
  function loadPaper(skill) {
    return fetch("library/toefl/set-1-" + skill + ".json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("题库未加载");
        return r.json();
      });
  }
  function saveAttempt(payload) {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  }
  function readAttempt() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function finish(skill, rec) {
    if (w.YYSD_HIT && rec && rec.tasks) {
      rec.tasks.forEach(function (t) {
        var piece = rec.perTask && rec.perTask[t] ? rec.perTask[t] : rec;
        w.YYSD_HIT.markDone(skill, t, {
          at: Date.now(),
          score: piece.score,
          total: piece.total,
          ok: piece.total ? piece.score === piece.total : true
        });
      });
    }
    saveAttempt(rec);
    location.replace("review.html?skill=" + encodeURIComponent(skill));
  }
  function labOf(skill) {
    return ({ reading: "reading-lab.html", listening: "listening-lab.html", writing: "writing-lab.html", speaking: "speaking-lab.html" })[skill] || "home.html";
  }
  w.YYSD_PLAY = {
    qs: qs,
    taskIndex: taskIndex,
    taskEnd: taskEnd,
    loadPaper: loadPaper,
    finish: finish,
    readAttempt: readAttempt,
    labOf: labOf
  };
})(window);
