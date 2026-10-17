/* 托福官方套题 01-15（新东方官方模考）— 免费全真模考，不进开包体系。
   数据文件在 library/toefl/kl-set-*.json（爬虫产物）；时长为各卷 modules timeSec 真实合计。 */
(function (w) {
  "use strict";
  var Y = w.YYSD = w.YYSD || {};
  var MOCKS = [
    { id: "kl-set-1", no: "01", title: "托福官方套题 01", en: "Official Mock 01", tag: "new", tagZh: "最新", desc: "官方最新套题，四科完整流程，界面与计时同真实考场。", duration: 99, r: 27, l: 40, w: 21, s: 11 },
    { id: "kl-set-2", no: "02", title: "托福官方套题 02", en: "Official Mock 02", tag: "hot", tagZh: "高频", desc: "高频话题整套练，适合第二阶段计时训练。", duration: 99, r: 27, l: 40, w: 21, s: 11 },
    { id: "kl-set-3", no: "03", title: "托福官方套题 03", en: "Official Mock 03", tag: "forecast", tagZh: "预测", desc: "热门方向预测卷，考前摸底查漏。", duration: 92, r: 21, l: 40, w: 21, s: 11 },
    { id: "kl-set-4", no: "04", title: "托福官方套题 04", en: "Official Mock 04", duration: 92, r: 21, l: 40, w: 21, s: 11 },
    { id: "kl-set-5", no: "05", title: "托福官方套题 05", en: "Official Mock 05", duration: 99, r: 27, l: 40, w: 21, s: 11 },
    { id: "kl-set-6", no: "06", title: "托福官方套题 06", en: "Official Mock 06", duration: 99, r: 27, l: 40, w: 21, s: 11 },
    { id: "kl-set-7", no: "07", title: "托福官方套题 07", en: "Official Mock 07", duration: 99, r: 27, l: 40, w: 21, s: 11 },
    { id: "kl-set-8", no: "08", title: "托福官方套题 08", en: "Official Mock 08", duration: 99, r: 27, l: 40, w: 21, s: 11 },
    { id: "kl-set-9", no: "09", title: "托福官方套题 09", en: "Official Mock 09", duration: 99, r: 28, l: 40, w: 21, s: 11 },
    { id: "kl-set-10", no: "10", title: "托福官方套题 10", en: "Official Mock 10", duration: 99, r: 27, l: 40, w: 21, s: 11 },
    { id: "kl-set-11", no: "11", title: "托福官方套题 11", en: "Official Mock 11", duration: 92, r: 21, l: 40, w: 21, s: 11 },
    { id: "kl-set-12", no: "12", title: "托福官方套题 12", en: "Official Mock 12", duration: 92, r: 21, l: 40, w: 21, s: 11 },
    { id: "kl-set-13", no: "13", title: "托福官方套题 13", en: "Official Mock 13", duration: 92, r: 21, l: 40, w: 21, s: 11 },
    { id: "kl-set-14", no: "14", title: "托福官方套题 14", en: "Official Mock 14", duration: 92, r: 21, l: 40, w: 21, s: 11 },
    { id: "kl-set-15", no: "15", title: "托福官方套题 15", en: "Official Mock 15", duration: 92, r: 21, l: 40, w: 21, s: 11 }
  ];
  Y.KL_MOCKS = MOCKS;
  /* 单科时长分钟，来自各卷 modules timeSec 真实合计 */
  function skillMin(m, skill) { return m[skill[0]]; }
  var SKILL_ZH = { reading: "阅读", listening: "听力", writing: "写作", speaking: "口语" };
  function reg(listName, skill) {
    if (!Y[listName]) Y[listName] = [];
    MOCKS.forEach(function (m) {
      Y[listName].push({
        id: m.id,
        title: m.title + " · " + SKILL_ZH[skill],
        file: "library/toefl/" + m.id + "-" + skill + ".json",
        duration: skillMin(m, skill),
        desc: m.title
      });
    });
  }
  reg("TOEFL_READING", "reading");
  reg("TOEFL_LISTENING", "listening");
  reg("TOEFL_WRITING", "writing");
  reg("TOEFL_SPEAKING", "speaking");
})(typeof window !== "undefined" ? window : global);
