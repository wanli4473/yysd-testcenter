/* diagnostic-charts.js — tiny SVG line + radar (no chart lib) */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /** series: [{label, color, points:[{xLabel, y:0..1}]}] */
  function lineChartSVG(series, opts) {
    opts = opts || {};
    var w = opts.width || 560;
    var h = opts.height || 220;
    var pad = { t: 16, r: 16, b: 36, l: 40 };
    var iw = w - pad.l - pad.r;
    var ih = h - pad.t - pad.b;
    var maxN = 1;
    series.forEach(function (s) {
      if (s.points.length > maxN) maxN = s.points.length;
    });
    var xLabels = [];
    series.forEach(function (s) {
      s.points.forEach(function (p, i) {
        if (!xLabels[i]) xLabels[i] = p.xLabel || String(i + 1);
      });
    });

    function xAt(i) {
      if (maxN <= 1) return pad.l + iw / 2;
      return pad.l + (i / (maxN - 1)) * iw;
    }
    function yAt(v) {
      v = Math.max(0, Math.min(1, Number(v) || 0));
      return pad.t + (1 - v) * ih;
    }

    var grid = "";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      var y = yAt(v);
      grid +=
        '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (pad.l + iw) +
        '" y2="' + y + '" stroke="#e8e4dc" stroke-width="1"/>' +
        '<text x="' + (pad.l - 6) + '" y="' + (y + 4) +
        '" text-anchor="end" font-size="10" fill="#888">' +
        Math.round(v * 100) + "%</text>";
    });

    var paths = series.map(function (s) {
      if (!s.points.length) return "";
      var d = s.points.map(function (p, i) {
        return (i ? "L" : "M") + xAt(i) + "," + yAt(p.y);
      }).join(" ");
      var dots = s.points.map(function (p, i) {
        return '<circle cx="' + xAt(i) + '" cy="' + yAt(p.y) +
          '" r="3.5" fill="' + esc(s.color) + '"/>';
      }).join("");
      return (
        '<path d="' + d + '" fill="none" stroke="' + esc(s.color) +
        '" stroke-width="2.2"/>' + dots
      );
    }).join("");

    var xl = xLabels.map(function (lab, i) {
      if (maxN > 6 && i % Math.ceil(maxN / 5) !== 0 && i !== maxN - 1) return "";
      return (
        '<text x="' + xAt(i) + '" y="' + (h - 10) +
        '" text-anchor="middle" font-size="10" fill="#888">' +
        esc(String(lab).slice(5, 10) || lab) + "</text>"
      );
    }).join("");

    var legend = series.map(function (s, i) {
      return (
        '<span class="diag-chart-legend__i"><i style="background:' +
        esc(s.color) + '"></i>' + esc(s.label) + "</span>"
      );
    }).join("");

    return (
      '<div class="diag-chart">' +
      '<div class="diag-chart-legend">' + legend + "</div>" +
      '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" role="img">' +
      grid + paths + xl +
      "</svg></div>"
    );
  }

  /** values: {high_school, cet4, ielts} 0..1; missing = 0 */
  function radarSVG(values, opts) {
    opts = opts || {};
    var size = opts.size || 260;
    var cx = size / 2;
    var cy = size / 2;
    var r = size * 0.36;
    var labels = [
      { key: "high_school", name: "高中" },
      { key: "cet4", name: "四级" },
      { key: "ielts", name: "雅思" }
    ];
    var n = labels.length;

    function pt(i, ratio) {
      var ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return {
        x: cx + Math.cos(ang) * r * ratio,
        y: cy + Math.sin(ang) * r * ratio
      };
    }

    var rings = [0.25, 0.5, 0.75, 1].map(function (ratio) {
      var pts = labels.map(function (_, i) {
        var p = pt(i, ratio);
        return p.x + "," + p.y;
      }).join(" ");
      return '<polygon points="' + pts + '" fill="none" stroke="#e8e4dc" stroke-width="1"/>';
    }).join("");

    var axes = labels.map(function (lab, i) {
      var p = pt(i, 1);
      var lp = pt(i, 1.22);
      return (
        '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x + '" y2="' + p.y +
        '" stroke="#ddd6cb"/>' +
        '<text x="' + lp.x + '" y="' + (lp.y + 4) +
        '" text-anchor="middle" font-size="12" fill="#2c3e6b" font-weight="600">' +
        esc(lab.name) + "</text>"
      );
    }).join("");

    var dataPts = labels.map(function (lab, i) {
      var v = Number(values[lab.key]);
      if (!isFinite(v)) v = 0;
      return pt(i, Math.max(0, Math.min(1, v)));
    });
    var poly = dataPts.map(function (p) { return p.x + "," + p.y; }).join(" ");
    var dots = dataPts.map(function (p) {
      return '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#c8963e"/>';
    }).join("");

    return (
      '<div class="diag-radar">' +
      '<svg viewBox="0 0 ' + size + " " + size + '" width="100%" max-width="' +
      size + '" role="img" aria-label="能力雷达图">' +
      rings + axes +
      '<polygon points="' + poly +
      '" fill="rgba(200,150,62,0.25)" stroke="#c8963e" stroke-width="2"/>' +
      dots +
      "</svg></div>"
    );
  }

  global.YYSD_DIAG_CHARTS = {
    lineChartSVG: lineChartSVG,
    radarSVG: radarSVG
  };
})(typeof window !== "undefined" ? window : this);
