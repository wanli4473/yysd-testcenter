/* english-spell-input.js — block Chinese IME English autocomplete on spell fields */
(function () {
  "use strict";

  // ponytail: keep matches() in sync with server/vocab-grade.js spellMatches
  var SPELL_OK = /[a-zA-Z0-9' ()-]/;
  function asciiSpell(s) {
    return String(s || "").replace(/[^a-zA-Z0-9' ()-]/g, "");
  }

  function normalizeSpell(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  // ponytail: fold UK/US to one key. Keep in sync with server/vocab-grade.js
  // ceiling: same-meaning Oxford pairs + productive -ise/-re/-our; not tyre/tire, cheque/check, storey/story
  var UK_PAIRS = [
    ["neighbourhood", "neighborhood"], ["acknowledgement", "acknowledgment"],
    ["encyclopaedia", "encyclopedia"], ["archaeology", "archeology"],
    ["anaesthetic", "anesthetic"], ["gynaecology", "gynecology"],
    ["haemorrhage", "hemorrhage"], ["manoeuvre", "maneuver"],
    ["jewellery", "jewelry"], ["aeroplane", "airplane"], ["leukaemia", "leukemia"],
    ["speciality", "specialty"], ["instalment", "installment"],
    ["enrolment", "enrollment"], ["fulfilment", "fulfillment"],
    ["honourable", "honorable"], ["favourable", "favorable"],
    ["moustache", "mustache"], ["orientated", "oriented"],
    ["favourite", "favorite"], ["behaviour", "behavior"], ["neighbour", "neighbor"],
    ["jeweller", "jeweler"], ["judgement", "judgment"], ["sceptical", "skeptical"],
    ["aesthetic", "esthetic"], ["artefact", "artifact"], ["yoghurt", "yogurt"],
    ["pyjamas", "pajamas"], ["doughnut", "donut"], ["likeable", "likable"],
    ["sizeable", "sizable"], ["liveable", "livable"], ["moveable", "movable"],
    ["diarrhoea", "diarrhea"], ["oestrogen", "estrogen"], ["paediatric", "pediatric"],
    ["smoulder", "smolder"], ["demeanour", "demeanor"], ["splendour", "splendor"],
    ["aluminium", "aluminum"], ["catalogue", "catalog"], ["dialogue", "dialog"],
    ["analogue", "analog"], ["despatch", "dispatch"], ["licence", "license"],
    ["defence", "defense"], ["offence", "offense"], ["pretence", "pretense"],
    ["practise", "practice"], ["enquiry", "inquiry"], ["enquire", "inquire"],
    ["harbour", "harbor"], ["flavour", "flavor"], ["glamour", "glamor"],
    ["saviour", "savior"], ["tumour", "tumor"], ["parlour", "parlor"],
    ["valour", "valor"], ["fervour", "fervor"], ["candour", "candor"],
    ["rigour", "rigor"], ["vigour", "vigor"], ["succour", "succor"],
    ["clamour", "clamor"], ["colour", "color"], ["favour", "favor"],
    ["honour", "honor"], ["humour", "humor"], ["labour", "labor"],
    ["rumour", "rumor"], ["vapour", "vapor"], ["odour", "odor"],
    ["armour", "armor"], ["ardour", "ardor"], ["sceptic", "skeptic"],
    ["sulphate", "sulfate"], ["sulphide", "sulfide"], ["sulphur", "sulfur"],
    ["ageing", "aging"], ["mould", "mold"], ["plough", "plow"],
    ["foetus", "fetus"], ["anaemia", "anemia"], ["skilful", "skillful"],
    ["wilful", "willful"], ["fulfil", "fulfill"], ["instal", "install"],
    ["enrol", "enroll"], ["appal", "appall"], ["distil", "distill"],
    ["instil", "instill"], ["enthral", "enthrall"], ["focussed", "focused"],
    ["focussing", "focusing"], ["whisky", "whiskey"], ["cosy", "cozy"],
    ["gaol", "jail"], ["grey", "gray"], ["blonde", "blond"], ["axe", "ax"]
  ];
  UK_PAIRS.sort(function (a, b) {
    if (b[0].length !== a[0].length) return b[0].length - a[0].length;
    if (a[0].indexOf(b[0]) === 0) return -1;
    if (b[0].indexOf(a[0]) === 0) return 1;
    return 0;
  });
  var TRE_STEMS = [
    "millimetre", "centimetre", "kilometre", "centre", "theatre", "metre", "litre", "fibre"
  ];
  var ISE_KEEP = {
    advertise: 1, advise: 1, arise: 1, comprise: 1, compromise: 1, concise: 1,
    cruise: 1, devise: 1, disguise: 1, enterprise: 1, excise: 1, exercise: 1,
    expertise: 1, franchise: 1, improvise: 1, likewise: 1, merchandise: 1,
    otherwise: 1, paradise: 1, practise: 1, praise: 1, precise: 1, premise: 1,
    prize: 1, promise: 1, raise: 1, revise: 1, rise: 1, seize: 1, sunrise: 1,
    supervise: 1, surprise: 1, televise: 1, wise: 1
  };
  function toUS(s) {
    if (!s) return s;
    var i, uk, us;
    for (i = 0; i < UK_PAIRS.length; i++) {
      uk = UK_PAIRS[i][0];
      us = UK_PAIRS[i][1];
      if (s === uk) { s = us; continue; }
      if (uk.length < 4 || s.indexOf(uk) < 0) continue;
      if (us.indexOf(uk) === 0 && us.length > uk.length && s.indexOf(us) >= 0) continue;
      s = s.split(uk).join(us);
    }
    for (i = 0; i < TRE_STEMS.length; i++) {
      uk = TRE_STEMS[i];
      us = uk.replace(/re$/, "er");
      if (s === uk) { s = us; break; }
      if (s.length > uk.length && s.slice(-uk.length) === uk) {
        s = s.slice(0, -uk.length) + us;
        break;
      }
    }
    s = s.replace(/^(travel|cancel|label|model|signal|rival|equal|counsel|fuel|pencil|unravel|dial|initial|total|jewel)l(ed|ing|er|ers)$/, "$1$2");
    if (/gramme$/.test(s)) s = s.replace(/gramme$/, "gram");
    if (/isation$/.test(s)) s = s.replace(/isation$/, "ization");
    if (/yse$/.test(s)) s = s.replace(/yse$/, "yze");
    if (/ise$/.test(s) && !ISE_KEEP[s]) s = s.replace(/ise$/, "ize");
    if (/ogue$/.test(s) && s !== "rogue" && s !== "vogue" && s !== "synagogue") {
      s = s.replace(/ogue$/, "og");
    }
    return s;
  }
  function spellingForms(s) {
    s = normalizeSpell(s);
    var out = [];
    function add(x) {
      x = normalizeSpell(x);
      if (!x) return;
      if (out.indexOf(x) < 0) out.push(x);
      var us = toUS(x);
      if (us && out.indexOf(us) < 0) out.push(us);
    }
    add(s);
    if (/\((u|ue|e|l|ll|me)\)/i.test(s)) {
      add(s.replace(/\((u|ue|e|l|ll|me)\)/gi, ""));
      add(s.replace(/\((u|ue|e|l|ll|me)\)/gi, "$1"));
    }
    if (s.indexOf("/") >= 0) {
      var parts = s.split("/");
      var a = parts[0];
      var b = parts[1] || "";
      if (b.indexOf("-") === 0) {
        if (b === "-ise" && /ize$/.test(a)) { add(a); add(a.replace(/ize$/, "ise")); }
        else if (b === "-tre" && /ter$/.test(a)) { add(a); add(a.replace(/ter$/, "tre")); }
        else if (b === "-sation") { add(a); add(a.replace(/zation/, "sation")); }
        else { add(a); add(a + b.slice(1)); }
      } else { add(a); add(b); }
    }
    return out;
  }

  function matches(user, expected) {
    var u = normalizeSpell(user);
    var e = normalizeSpell(expected);
    if (!u || !e) return false;
    if (u === e) return true;
    var uForms = spellingForms(u);
    var eForms = spellingForms(e);
    var i, j;
    for (i = 0; i < uForms.length; i++) {
      for (j = 0; j < eForms.length; j++) {
        if (uForms[i] === eForms[j]) return true;
      }
    }
    var optS = e.replace(/\s*\(s\)\s*$/i, "");
    if (optS !== e && (u === optS || u === optS + "s")) return true;
    if (/wards?$/.test(e)) {
      var stem = e.replace(/s$/, "");
      if (u === stem || u === stem + "s") return true;
    }
    var compactU = u.replace(/[\s'-]/g, "");
    var compactE = e.replace(/[\s'()-]/g, "");
    if (compactU && compactU === compactE) return true;
    if (e === "0" && (u === "zero" || u === "nought" || u === "nil")) return true;
    if (e === "zero" && (u === "0" || u === "o")) return true;
    return false;
  }

  function matchesAny(user, expectedList) {
    var list = Array.isArray(expectedList) ? expectedList : [expectedList];
    for (var i = 0; i < list.length; i++) {
      if (matches(user, list[i])) return true;
    }
    return false;
  }

  var BLOCK_TYPES = {
    insertCompositionText: 1,
    insertFromComposition: 1,
    insertReplacementText: 1,
    insertFromPaste: 1,
    insertFromDrop: 1,
    insertFromYank: 1
  };

  /**
   * @param {HTMLInputElement} el
   * @param {{ onWarn?: function(string), onImeViolation?: function(), isLocked?: function(): boolean }} opts
   */
  function bind(el, opts) {
    opts = opts || {};
    if (!el || el.__yysdEnSpell) return;
    el.__yysdEnSpell = true;
    el.classList.add("yysd-en-spell");
    el.setAttribute("lang", "en");
    el.setAttribute("inputmode", "latin");
    el.setAttribute("autocomplete", "off");
    el.setAttribute("autocorrect", "off");
    el.setAttribute("autocapitalize", "off");
    el.setAttribute("spellcheck", "false");
    try { el.style.imeMode = "disabled"; } catch (e) { /* ignore */ }

    var composing = false;
    var composeBase = "";

    function locked() {
      return !!(opts.isLocked && opts.isLocked());
    }

    function warn(msg) {
      if (locked()) return;
      if (opts.onWarn) opts.onWarn(msg || "请切换到英文输入法后再拼写");
    }

    function imeViolation() {
      if (locked()) return;
      if (opts.onImeViolation) opts.onImeViolation();
    }

    el.addEventListener("compositionstart", function () {
      composing = true;
      composeBase = el.value;
      imeViolation();
    });

    el.addEventListener("compositionend", function () {
      composing = false;
      // ponytail: Chinese IME English联想 commits here — discard whole composition
      if (el.value !== composeBase) {
        el.value = composeBase;
        warn();
      }
    });

    el.addEventListener("beforeinput", function (e) {
      if (locked()) return;
      var t = e.inputType || "";
      if (t.indexOf("delete") === 0) return;
      if (BLOCK_TYPES[t]) {
        e.preventDefault();
        warn(t.indexOf("Paste") >= 0 ? "拼写题不支持粘贴" : undefined);
        if (t.indexOf("Composition") >= 0 || t === "insertCompositionText" || t === "insertFromComposition") {
          imeViolation();
        }
        return;
      }
      if (composing) {
        e.preventDefault();
        return;
      }
      if (t === "insertText" && e.data != null) {
        if (e.data.length !== 1 || !SPELL_OK.test(e.data)) {
          e.preventDefault();
          if (/[\u4e00-\u9fff]/.test(e.data)) warn();
        }
      }
    });

    el.addEventListener("paste", function (e) {
      e.preventDefault();
      warn("拼写题不支持粘贴");
    });

    el.addEventListener("input", function () {
      if (composing) return;
      var next = asciiSpell(el.value);
      if (next !== el.value) {
        el.value = next;
        warn();
      }
    });
  }

  window.YYSD_EN_SPELL = {
    bind: bind, asciiSpell: asciiSpell, matches: matches, matchesAny: matchesAny, normalizeSpell: normalizeSpell
  };
})();
