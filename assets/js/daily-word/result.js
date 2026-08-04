/* =========================================================================
   daily-word/result.js — 结算页 + 可保存/发给老师的今日报告
   ========================================================================= */
(function () {
  "use strict";
  var DW = window.YYSD_DAILY_WORD;
  var root = document.getElementById("dw-root");

  function loadResult() {
    try {
      return JSON.parse(localStorage.getItem(DW.KEYS.result) || "null");
    } catch (e) {
      return null;
    }
  }

  function maskPhone(p) {
    p = String(p || "");
    if (p.length < 7) return p || "—";
    return p.slice(0, 3) + "****" + p.slice(-4);
  }

  function fmtTime(sec) {
    sec = Number(sec) || 0;
    if (!sec) return "—";
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    if (!m) return s + " 秒";
    return m + " 分" + (s ? s + " 秒" : "");
  }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  function fmtFinished(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
      " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function buildReportText(r) {
    var total = r.total || 0;
    var mastered = r.mastered != null ? r.mastered : total;
    var rate = total ? Math.round((mastered / total) * 100) : 0;
    var lines = [];
    lines.push("【优益思达 · 今日单词学习报告】");
    lines.push("日期：" + (r.date || "—"));
    lines.push("完成时间：" + (fmtFinished(r.finishedAt) || "—"));
    lines.push("学生：" + (r.studentName || "未填写姓名"));
    lines.push("手机：" + maskPhone(r.studentPhone));
    lines.push("词书：" + (r.bookLabel || "—"));
    lines.push("学习数量：" + total + " 词");
    lines.push("掌握率：" + rate + "%（掌握 " + mastered + " / " + total + "）");
    lines.push("用时：" + fmtTime(r.elapsedSec));
    lines.push("");
    lines.push("发音薄弱词：" + ((r.weakSpeak && r.weakSpeak.length) ? r.weakSpeak.join("、") : "无"));
    lines.push("拼写易错词：" + ((r.weakSpell && r.weakSpell.length) ? r.weakSpell.join("、") : "无"));
    lines.push("释义易错词：" + ((r.weakMeaning && r.weakMeaning.length) ? r.weakMeaning.join("、") : "无"));
    lines.push("");
    lines.push("今日学习单词明细：");
    (r.words || []).forEach(function (w, i) {
      var tags = [];
      if (w.speakingWrong) tags.push("发音弱");
      if (w.spellingWrong) tags.push("拼写弱");
      if (w.meaningWrong) tags.push("释义弱");
      lines.push((i + 1) + ". " + w.word +
        (w.ipa ? " " + w.ipa : "") +
        (w.meaning ? " — " + w.meaning : "") +
        (tags.length ? " [" + tags.join("·") + "]" : ""));
    });
    if (!(r.words && r.words.length)) {
      lines.push("（无明细）");
    }
    lines.push("");
    lines.push("—— 学生可截图/转发本报告给老师 ——");
    return lines.join("\n");
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        if (!document.execCommand("copy")) throw new Error("copy failed");
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  function boot() {
    var r = loadResult();
    var task = DW.getTask();
    if (!r && task && task.completed) {
      r = {
        total: task.wordList.length,
        mastered: task.wordList.length,
        weakSpeak: task.weakSpeak || [],
        weakSpell: task.weakSpell || [],
        bookLabel: task.bookLabel || "",
        words: (task.wordList || []).map(function (w) {
          return { word: w.word, meaning: w.meaning || "", ipa: w.ipa || "" };
        }),
        studentName: task.studentName || "",
        studentPhone: task.studentPhone || "",
        elapsedSec: 0,
        date: task.date,
        finishedAt: Date.now()
      };
    }
    if (!r) {
      root.innerHTML = '<div class="dw-fail"><p>暂无今日报告</p>' +
        '<p><a href="daily-word-setup.html">开始今日任务</a></p></div>';
      return;
    }

    var total = r.total || 0;
    var mastered = r.mastered != null ? r.mastered : total;
    var rate = total ? Math.round((mastered / total) * 100) : 0;
    var speakN = (r.weakSpeak || []).length;
    var spellN = (r.weakSpell || []).length;
    var meaningN = (r.weakMeaning || []).length;
    var reportText = buildReportText(r);
    var fileName = "每日单词报告-" + (r.date || DW.todayStr()) +
      (r.studentName ? "-" + r.studentName : "") + ".txt";

    function listHtml(arr) {
      if (!arr || !arr.length) return "<li>无</li>";
      return arr.map(function (w) { return "<li>" + DW.esc(w) + "</li>"; }).join("");
    }

    function wordsTable() {
      var words = r.words || [];
      if (!words.length) return '<p class="dw-hint">无单词明细</p>';
      var rows = words.map(function (w, i) {
        var tags = [];
        if (w.speakingWrong) tags.push('<span class="dw-tag dw-tag--bad">发音</span>');
        if (w.spellingWrong) tags.push('<span class="dw-tag dw-tag--bad">拼写</span>');
        if (w.meaningWrong) tags.push('<span class="dw-tag dw-tag--bad">释义</span>');
        if (!tags.length) tags.push('<span class="dw-tag dw-tag--ok">通过</span>');
        return "<tr>" +
          "<td>" + (i + 1) + "</td>" +
          "<td><strong>" + DW.esc(w.word) + "</strong>" +
            (w.ipa ? '<div class="dw-ipa">' + DW.esc(w.ipa) + "</div>" : "") + "</td>" +
          "<td>" + DW.esc(w.meaning || "—") + "</td>" +
          "<td>" + tags.join(" ") + "</td>" +
          "</tr>";
      }).join("");
      return '<div class="dw-table-wrap"><table class="dw-table">' +
        "<thead><tr><th>#</th><th>单词</th><th>释义</th><th>结果</th></tr></thead>" +
        "<tbody>" + rows + "</tbody></table></div>";
    }

    root.innerHTML =
      '<div class="dw-shell dw-shell--report">' +
        '<header class="dw-top no-print">' +
          '<a class="dw-back" href="zone.html?zone=study&s=vocab" aria-label="返回">←</a>' +
          '<div class="dw-top__title">今日学习报告</div>' +
        "</header>" +
        '<div class="dw-report" id="dw-report-card">' +
          '<div class="dw-report__brand">优益思达 · 今日单词学习报告</div>' +
          '<div class="dw-report__meta">' +
            '<div><span>学生</span><strong>' + DW.esc(r.studentName || "未填写姓名") + "</strong></div>" +
            '<div><span>手机</span><strong>' + DW.esc(maskPhone(r.studentPhone)) + "</strong></div>" +
            '<div><span>日期</span><strong>' + DW.esc(r.date || "—") + "</strong></div>" +
            '<div><span>词书</span><strong>' + DW.esc(r.bookLabel || "每日单词") + "</strong></div>" +
            '<div><span>用时</span><strong>' + DW.esc(fmtTime(r.elapsedSec)) + "</strong></div>" +
            '<div><span>完成</span><strong>' + DW.esc(fmtFinished(r.finishedAt) || "—") + "</strong></div>" +
          "</div>" +
          '<div class="dw-stats">' +
            '<div class="dw-stat"><div class="dw-stat__n">' + total + '</div><div class="dw-stat__l">今日学习</div></div>' +
            '<div class="dw-stat"><div class="dw-stat__n">' + rate + '%</div><div class="dw-stat__l">掌握率</div></div>' +
            '<div class="dw-stat"><div class="dw-stat__n">' + speakN + '</div><div class="dw-stat__l">发音薄弱</div></div>' +
            '<div class="dw-stat"><div class="dw-stat__n">' + (spellN + meaningN) + '</div><div class="dw-stat__l">拼写/释义弱</div></div>' +
          "</div>" +
          '<div class="dw-weak"><h3>发音薄弱词</h3><ul>' + listHtml(r.weakSpeak) + "</ul></div>" +
          '<div class="dw-weak"><h3>拼写易错词</h3><ul>' + listHtml(r.weakSpell) + "</ul></div>" +
          '<div class="dw-weak"><h3>释义易错词</h3><ul>' + listHtml(r.weakMeaning) + "</ul></div>" +
          '<div class="dw-weak"><h3>今日单词明细</h3>' + wordsTable() + "</div>" +
          '<p class="dw-report__foot">请保存或转发本报告给老师</p>' +
        "</div>" +
        '<div class="dw-result-actions no-print">' +
          '<button type="button" class="dw-btn dw-btn--primary" id="dw-copy">复制报告给老师</button>' +
          '<button type="button" class="dw-btn dw-btn--ghost" id="dw-download">下载 TXT 报告</button>' +
          '<button type="button" class="dw-btn dw-btn--ghost" id="dw-print">打印 / 存 PDF</button>' +
          '<a class="dw-btn dw-btn--ghost" href="daily-word-setup.html">再学一组</a>' +
          '<a class="dw-btn dw-btn--ghost" href="zone.html?zone=study&s=vocab">返回单词中心</a>' +
          '<p class="dw-hint" id="dw-share-tip" hidden>已复制，可粘贴到微信发给老师</p>' +
        "</div>" +
      "</div>";

    document.getElementById("dw-copy").addEventListener("click", function () {
      var tip = document.getElementById("dw-share-tip");
      copyText(reportText).then(function () {
        tip.hidden = false;
        tip.textContent = "已复制，可粘贴到微信发给老师";
      }).catch(function () {
        tip.hidden = false;
        tip.textContent = "复制失败，请改用「下载 TXT」";
      });
    });
    document.getElementById("dw-download").addEventListener("click", function () {
      downloadText(fileName, reportText);
    });
    document.getElementById("dw-print").addEventListener("click", function () {
      window.print();
    });

    if (task && task.completed) DW.clearTask();
  }

  boot();
})();
