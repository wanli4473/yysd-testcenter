/* ponytail: load Set 1 clip + jump to HIT review */
(function (w) {
  "use strict";
  var KEY = "yysd:app-review";

  function qs() { return new URLSearchParams(location.search); }
  function paperId() { return qs().get("id") || ""; }
  function isFreePaper() { return paperId().indexOf("free-") === 0; }
  function setId() {
    var n = Number(qs().get("set"));
    return n > 0 ? String(n) : "1";
  }
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
  function showLoadError(skill) {
    var box = document.getElementById("load-fail");
    if (!box) {
      box = document.createElement("div");
      box.id = "load-fail";
      box.hidden = true;
      box.innerHTML = '<div><h2>Unable to load this set</h2>' +
        '<p>Check your connection and try again. If it keeps failing, go back and pick another set.</p>' +
        '<div class="ets-modal-acts">' +
        '<a id="load-back" href="#">Back to list</a>' +
        '<button type="button" id="load-retry">Retry</button></div></div>';
      document.body.appendChild(box);
    }
    document.getElementById("load-back").href = backHref(skill);
    document.getElementById("load-retry").onclick = function () { location.reload(); };
    box.hidden = false;
  }
  function loadPaper(skill) {
    var id = qs().get("id");
    var url = id
      ? "library/toefl/" + encodeURIComponent(id) + "-" + skill + ".json"
      : "library/toefl/set-" + setId() + "-" + skill + ".json";
    return fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("题库未加载");
        return r.json();
      })
      .catch(function (err) {
        showLoadError(skill);
        throw err;
      });
  }
  function saveAttempt(payload) {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  }
  function readAttempt() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function finish(skill, rec) {
    rec = rec || {};
    rec.set = rec.set || paperId() || setId();
    if (w.YYSD_HIT && rec.tasks) {
      rec.tasks.forEach(function (t) {
        var piece = rec.perTask && rec.perTask[t] ? rec.perTask[t] : rec;
        w.YYSD_HIT.markDone(skill, t, {
          at: Date.now(),
          set: rec.set,
          score: piece.score,
          total: piece.total,
          ok: piece.total ? piece.score === piece.total : true
        });
      });
    }
    saveAttempt(rec);
    var preview = qs().get("preview") === "1";
    var bank = qs().get("bank");
    if (!isFreePaper() && !(preview && !bank) && w.YYSD_TIKU_RUN && w.YYSD_TIKU_RUN.advance(skill, rec)) return;
    var next = "review.html?skill=" + encodeURIComponent(skill);
    if (bank) next += "&bank=" + encodeURIComponent(bank);
    if (preview) next += "&preview=1";
    location.replace(next);
  }
  function openSubmit(msg, onOk, onCancel) {
    var box = document.getElementById("submit-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "submit-box";
      box.hidden = true;
      box.innerHTML = '<div><h2>Submit</h2><p id="submit-msg"></p><div class="ets-modal-acts">' +
        '<button type="button" id="submit-cancel">Cancel</button>' +
        '<button type="button" id="submit-ok">Submit</button></div></div>';
      document.body.appendChild(box);
    }
    box.querySelector("#submit-msg").textContent = msg;
    box.hidden = false;
    box.querySelector("#submit-ok").onclick = function () { box.hidden = true; onOk(); };
    box.querySelector("#submit-cancel").onclick = function () {
      box.hidden = true;
      if (onCancel) onCancel();
    };
  }

  function submitGuard(skill, pending, total, onOk, onCancel) {
    var msg;
    if (pending > 0) {
      if (skill === "speaking") {
        msg = "You have " + pending + " missing recording" + (pending > 1 ? "s" : "") + " of " + total +
          ". Missing recordings are not scored. Submit anyway?";
      } else if (skill === "writing") {
        msg = "You have " + pending + " task" + (pending > 1 ? "s" : "") + " without a response, of " + total +
          ". Those tasks are not scored. Submit anyway?";
      } else {
        msg = "You have " + pending + " unanswered question" + (pending > 1 ? "s" : "") + " of " + total +
          ". Unanswered questions are scored as incorrect. Submit anyway?";
      }
    } else {
      msg = "You have completed all " + total + " " +
        (skill === "speaking" ? "recordings" : skill === "writing" ? "tasks" : "questions") + ". Submit?";
    }
    openSubmit(msg, onOk, onCancel);
  }

  function labOf(skill) {
    return ["reading", "listening", "writing", "speaking"].indexOf(skill) >= 0
      ? "practice.html?skill=" + skill : "home.html";
  }
  function isPreview() { return qs().get("preview") === "1"; }
  function tikuHome() {
    return (w.YYSD_APP_GATE && w.YYSD_APP_GATE.tikuHome)
      ? w.YYSD_APP_GATE.tikuHome()
      : "https://tiku.youyisida.com/";
  }
  function backHref(skill) {
    var bank = qs().get("bank");
    if (isPreview()) {
      return bank
        ? ("bank.html?id=" + encodeURIComponent(bank) + "&preview=1")
        : tikuHome();
    }
    if (bank) return "bank.html?id=" + encodeURIComponent(bank);
    if (isFreePaper()) return "free.html";
    return labOf(skill);
  }
  function isTikuDesktop() {
    return !!(w.yysdDesktop && w.yysdDesktop.kind === "tiku");
  }
  function goBack(skill) {
    if (!isPreview()) {
      w.location.replace(backHref(skill));
      return;
    }
    // ponytail: preview is a popup from 题库中心. Close it; don't navigate this
    // window to tiku (no preload → gate) or the public site login.
    try { w.close(); } catch (e) {}
    if (w.closed) return;
    if (w.opener && !w.opener.closed) {
      try { w.opener.focus(); } catch (e2) {}
      try { w.close(); } catch (e3) {}
      if (w.closed) return;
    }
    if (isTikuDesktop()) w.location.replace(tikuHome());
    else if (qs().get("bank")) {
      w.location.replace("bank.html?id=" + encodeURIComponent(qs().get("bank")) + "&preview=1");
    }
  }
  if (!isFreePaper() && w.YYSD_TIKU_RUN && w.YYSD_TIKU_RUN.armTimer) w.YYSD_TIKU_RUN.armTimer();

  w.YYSD_PLAY = {
    qs: qs,
    setId: setId,
    taskIndex: taskIndex,
    taskEnd: taskEnd,
    loadPaper: loadPaper,
    finish: finish,
    openSubmit: openSubmit,
    submitGuard: submitGuard,
    readAttempt: readAttempt,
    labOf: labOf,
    isPreview: isPreview,
    backHref: backHref,
    goBack: goBack
  };
})(window);
