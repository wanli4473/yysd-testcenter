#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build CET-4 LIST HTML from library/study/vocab-cet4-data/list-XX.json."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "library" / "study" / "vocab-cet4-data"
OUT = ROOT / "library" / "study" / "vocab-cet4"


def js_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def word_js(w: dict) -> str:
    coll = w.get("collocations") or ""
    if isinstance(coll, list):
        coll = json.dumps(coll, ensure_ascii=False)
    else:
        coll = js_str(coll)
    exam = w.get("examTag")
    exam_js = json.dumps(exam, ensure_ascii=False) if exam else "null"
    syn = w.get("synonyms") if isinstance(w.get("synonyms"), list) else []
    ant = w.get("antonyms") if isinstance(w.get("antonyms"), list) else []
    return (
        "{\n"
        f"  id: {int(w.get('id') or 0)},\n"
        f"  word: {js_str(w.get('word') or '')},\n"
        f"  ipa: {js_str(w.get('ipa') or '')},\n"
        f"  pos: {js_str(w.get('pos') or '')},\n"
        f"  meaning: {js_str(w.get('meaning') or '')},\n"
        f"  mnemonic: {js_str(w.get('mnemonic') or '')},\n"
        f"  root: {js_str(w.get('root') or w.get('mnemonic') or '')},\n"
        f"  collocations: {coll},\n"
        f"  phrases: {js_str(w.get('phrases') or ('' if isinstance(w.get('collocations'), list) else (w.get('collocations') or '')))},\n"
        f"  example: {js_str(w.get('example') or '')},\n"
        f"  exampleEN: {js_str(w.get('exampleEN') or w.get('exampleEn') or '')},\n"
        f"  exampleCN: {js_str(w.get('exampleCN') or w.get('exampleZh') or '')},\n"
        f"  exampleEn: {js_str(w.get('exampleEn') or w.get('exampleEN') or '')},\n"
        f"  exampleZh: {js_str(w.get('exampleZh') or w.get('exampleCN') or '')},\n"
        f"  derivatives: {js_str(w.get('derivatives') or '')},\n"
        f"  distinguish: {js_str(w.get('distinguish') or '')},\n"
        f"  synonyms: {json.dumps(syn, ensure_ascii=False)},\n"
        f"  antonyms: {json.dumps(ant, ensure_ascii=False)},\n"
        f"  examTag: {exam_js},\n"
        f"  acceptCN: {json.dumps(w.get('acceptCN') or [], ensure_ascii=False)}\n"
        "}"
    )


def render_html(meta: dict) -> str:
    n = int(meta["listNo"])
    words = meta.get("words") or []
    total = len(words)
    band = meta.get("band") or "high"
    title = meta.get("title") or f"单元 {n}"
    word_data = ",\n".join(word_js(w) for w in words)
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="exam:title" content="四级词汇 {title}">
<meta name="exam:duration" content="0">
<meta name="exam:description" content="频段 {band} · {total} 词 · 边学边测">
<meta name="exam:band" content="{band}">
<title>四级词汇 {title} · 语速0.8 · 宽松评判</title>
<style>
:root {{
  --bg:#f5f3f0; --card:#fff; --primary:#2c3e6b; --primary-light:#3d5a99;
  --accent:#2f6f4e; --text:#2d2d2d; --muted:#888; --border:#e0dcd5;
  --shadow:0 1px 4px rgba(0,0,0,.04); --radius:12px; --ok:#3a7d5a; --bad:#c0392b;
}}
* {{ box-sizing:border-box; margin:0; padding:0 }}
body {{ font-family:"PingFang SC","Inter",sans-serif; background:var(--bg); color:var(--text); line-height:1.55 }}
.header {{ background:var(--card); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:10 }}
.header-inner {{ max-width:1100px; margin:0 auto; height:56px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; gap:12px }}
.logo {{ font-weight:700; color:var(--primary); display:flex; align-items:center; gap:8px }}
.nav-tabs {{ display:flex; gap:4px; background:#f0ebe4; border-radius:999px; padding:3px }}
.nav-tab {{ border:0; background:transparent; padding:8px 16px; border-radius:999px; cursor:pointer; font-weight:600; color:#666 }}
.nav-tab.active {{ background:#fff; color:var(--primary); box-shadow:var(--shadow) }}
.badge {{ font-size:.8rem; color:var(--muted); background:#f0ebe4; padding:4px 10px; border-radius:999px }}
.main {{ max-width:1100px; margin:0 auto; padding:20px 16px 40px }}
.learn-section,.test-section {{ display:none }}
.learn-section.active,.test-section.active {{ display:block }}
.learn-grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px }}
.word-card {{ background:var(--card); border:1px solid transparent; border-radius:var(--radius); padding:14px 16px; box-shadow:var(--shadow); cursor:pointer }}
.word-card:hover {{ border-color:#d5cec4 }}
.word-card.expanded {{ border-color:var(--primary); grid-column:1/-1 }}
.word-head {{ display:flex; justify-content:space-between; gap:8px; align-items:flex-start }}
.word-headword {{ font-size:1.2rem; font-weight:700; color:var(--primary) }}
.word-ipa {{ color:#666; font-size:.92rem }}
.btn-play {{ border:0; background:#eef2fb; color:var(--primary); width:34px; height:34px; border-radius:50%; cursor:pointer }}
.btn-play.playing {{ background:var(--primary); color:#fff }}
.word-pos {{ color:var(--accent); font-weight:600; margin-right:6px }}
.word-blocks {{ display:none; margin-top:10px; border-top:1px dashed var(--border); padding-top:10px }}
.word-card.expanded .word-blocks {{ display:block }}
.block {{ margin:8px 0; font-size:.92rem }}
.block b {{ display:inline-block; min-width:2em; color:var(--accent); margin-right:4px }}
.hint {{ color:var(--muted); font-size:.8rem; margin-top:6px; display:none }}
.word-card.expanded .hint {{ display:block }}
.test-setup,.test-active-area,.test-results {{ background:var(--card); border-radius:var(--radius); padding:24px; box-shadow:var(--shadow) }}
.test-active-area,.test-results {{ display:none }}
.test-active-area.visible,.test-results.visible {{ display:block }}
.btn-start-test,.btn-submit,.btn-next,.btn-retry {{ border:0; border-radius:10px; padding:12px 18px; font-weight:700; cursor:pointer; background:var(--primary); color:#fff; margin-top:12px }}
.btn-next {{ display:none }} .btn-next.visible {{ display:inline-block }}
.test-input-group {{ margin:12px 0 }}
.test-input-group input {{ width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; font-size:1rem }}
.test-feedback {{ margin-top:12px; padding:12px; border-radius:8px; display:none }}
.test-feedback.visible {{ display:block }}
.test-feedback.correct-all {{ background:#eaf5ee; color:var(--ok) }}
.test-feedback.partial {{ background:#fef9ee; color:#b8860b }}
.test-feedback.wrong-all {{ background:#fdf0ee; color:var(--bad) }}
.progress-bar-wrap {{ flex:1; height:8px; background:#eee; border-radius:999px; overflow:hidden; margin:0 10px }}
.progress-bar-fill {{ height:100%; background:var(--primary); width:0 }}
.test-progress {{ display:flex; align-items:center; margin-bottom:16px; font-size:.9rem }}
.history-title {{ margin-top:20px; font-weight:700 }}
.btn-clear-history {{ margin-left:8px; border:0; background:#eee; padding:4px 8px; border-radius:6px; cursor:pointer }}
</style>
</head>
<body>
<header class="header"><div class="header-inner">
  <div class="logo"><span>📖</span><span>四级词汇 {title}</span></div>
  <nav class="nav-tabs" id="navTabs">
    <button class="nav-tab active" data-mode="learn">词汇总览</button>
    <button class="nav-tab" data-mode="test">单词检测</button>
  </nav>
  <span class="badge">共 {total} 词</span>
</div></header>
<div class="main">
  <section class="learn-section active" id="learnSection"><div class="learn-grid" id="learnGrid"></div></section>
  <section class="test-section" id="testSection">
    <div class="test-setup" id="testSetup">
      <h3>四级词汇 {title} · 单词检测</h3>
      <p>听读音后填写拼写与中文含义（宽松评判）。</p>
      <button class="btn-start-test" id="btnStartTest">开始检测（{total} 题）</button>
      <div class="history-title">历史记录 <button class="btn-clear-history" id="btnClearHistory">清除</button></div>
      <div id="historyContent"></div>
    </div>
    <div class="test-active-area" id="testActiveArea">
      <div class="test-progress"><span id="testProgressLabel">第 1 / {total} 题</span><div class="progress-bar-wrap"><div class="progress-bar-fill" id="progressBarFill"></div></div><span id="testScoreLabel">得分: 0</span></div>
      <button class="btn-play" id="btnPlayTest" style="width:64px;height:64px;font-size:1.4rem">▶</button>
      <div class="test-inputs">
        <div class="test-input-group"><label>英文拼写</label><input id="inputSpelling" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
        <div class="test-input-group"><label>中文含义</label><input id="inputMeaning" autocomplete="off"></div>
      </div>
      <button class="btn-submit" id="btnSubmit">提交答案</button>
      <div class="test-feedback" id="testFeedback"></div>
      <button class="btn-next" id="btnNext">下一题</button>
    </div>
    <div class="test-results" id="testResults">
      <h3>检测完成</h3>
      <div id="resultsScore" style="font-size:2rem;font-weight:700;color:var(--primary)"></div>
      <div id="resultsDetail"></div>
      <table style="width:100%;margin-top:12px;border-collapse:collapse;font-size:.9rem"><thead><tr><th>#</th><th>单词</th><th>拼写</th><th>含义</th><th>结果</th></tr></thead><tbody id="resultsTableBody"></tbody></table>
      <button class="btn-retry" id="btnRetry">重新检测</button>
      <button class="btn-retry" id="btnBackToSetup" style="background:#666">返回</button>
    </div>
  </section>
</div>
<script>
  // var (not let/const): vocab-bridge reads these as iframe globals
  var wordData = [
{word_data}
  ];
  var TOTAL_QUESTIONS = {total};
  var testResultsData = [];
(function(){{
  const HISTORY_KEY = 'cet4_vocab_history_list{n}';

  function esc(s){{
    return String(s||'').replace(/[&<>"']/g, c => ({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}})[c]);
  }}
  function block(label, text){{
    if(!text) return '';
    return '<div class="block"><b>'+label+'</b>'+esc(text)+'</div>';
  }}

  let synth = window.speechSynthesis, voice = null;
  function loadVoices(){{
    if(!synth) return;
    const pick = () => {{
      const vs = synth.getVoices();
      voice = vs.find(v => v.lang.startsWith('en-GB')) || vs.find(v => v.lang.startsWith('en')) || vs[0];
    }};
    pick();
    if(synth.onvoiceschanged !== undefined) synth.onvoiceschanged = pick;
  }}
  function speakWord(word, cb){{
    if(!synth){{ if(cb) cb(); return; }}
    synth.cancel();
    const u = new SpeechSynthesisUtterance(word);
    if(voice) u.voice = voice;
    u.lang = 'en-GB'; u.rate = 0.8;
    if(cb){{ u.onend = cb; u.onerror = () => cb(); }}
    synth.speak(u);
  }}
  loadVoices();

  const learnGrid = document.getElementById('learnGrid');
  wordData.forEach(w => {{
    const card = document.createElement('div');
    card.className = 'word-card';
    card.innerHTML =
      '<div class="word-head"><div><span class="word-headword">'+esc(w.word)+'</span> <span class="word-ipa">'+esc(w.ipa)+'</span></div>'+
      '<button class="btn-play btn-play-card" data-word="'+esc(w.word)+'">▶</button></div>'+
      '<div><span class="word-pos">'+esc(w.pos)+'</span><span>'+esc(w.meaning)+'</span></div>'+
      '<div class="word-blocks">'+
        block('记', w.mnemonic)+
        block('考', w.collocations || w.phrases)+
        block('例', w.example)+
        block('派', w.derivatives)+
        block('辨', w.distinguish)+
      '</div><div class="hint">点击收起</div>';
    card.addEventListener('click', e => {{
      if(e.target.closest('.btn-play-card')) return;
      const open = card.classList.contains('expanded');
      document.querySelectorAll('.word-card.expanded').forEach(c => c.classList.remove('expanded'));
      if(!open) card.classList.add('expanded');
    }});
    card.querySelector('.btn-play-card').addEventListener('click', function(e){{
      e.stopPropagation();
      document.querySelectorAll('.btn-play.playing').forEach(b => b.classList.remove('playing'));
      this.classList.add('playing');
      speakWord(w.word, () => this.classList.remove('playing'));
    }});
    learnGrid.appendChild(card);
  }});

  const navTabs = document.getElementById('navTabs');
  const learnSection = document.getElementById('learnSection');
  const testSection = document.getElementById('testSection');
  let currentMode = 'learn';
  navTabs.addEventListener('click', e => {{
    const tab = e.target.closest('.nav-tab'); if(!tab) return;
    const mode = tab.dataset.mode; if(mode === currentMode) return;
    currentMode = mode;
    navTabs.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t === tab));
    learnSection.classList.toggle('active', mode === 'learn');
    testSection.classList.toggle('active', mode === 'test');
    if(mode === 'test'){{ showTestSetup(); renderHistory(); }}
    if(synth) synth.cancel();
  }});

  const testSetup = document.getElementById('testSetup');
  const testActiveArea = document.getElementById('testActiveArea');
  const testResults = document.getElementById('testResults');
  const btnStartTest = document.getElementById('btnStartTest');
  const btnPlayTest = document.getElementById('btnPlayTest');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnNext = document.getElementById('btnNext');
  const btnRetry = document.getElementById('btnRetry');
  const btnBackToSetup = document.getElementById('btnBackToSetup');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const inputSpelling = document.getElementById('inputSpelling');
  const inputMeaning = document.getElementById('inputMeaning');
  const testFeedback = document.getElementById('testFeedback');
  const testProgressLabel = document.getElementById('testProgressLabel');
  const testScoreLabel = document.getElementById('testScoreLabel');
  const progressBarFill = document.getElementById('progressBarFill');
  const resultsScore = document.getElementById('resultsScore');
  const resultsDetail = document.getElementById('resultsDetail');
  const resultsTableBody = document.getElementById('resultsTableBody');
  const historyContent = document.getElementById('historyContent');

  function getHistory(){{ try {{ return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }} catch(e){{ return []; }} }}
  function saveHistory(r){{ const h = getHistory(); h.unshift(r); if(h.length>50) h.length=50; localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }}
  function renderHistory(){{
    const h = getHistory();
    if(!h.length){{ historyContent.innerHTML = '<div style="color:#888;margin-top:8px">暂无记录</div>'; return; }}
    historyContent.innerHTML = '<ul style="margin-top:8px;padding-left:18px">'+h.map(r => {{
      const t = new Date(r.timestamp);
      return '<li>'+r.score+'/'+r.total+'（'+r.percent+'%） · '+t.toLocaleString()+'</li>';
    }}).join('')+'</ul>';
  }}
  btnClearHistory.addEventListener('click', () => {{ if(confirm('清除历史？')){{ localStorage.removeItem(HISTORY_KEY); renderHistory(); }} }});

  let testWords=[], testCurrentIndex=0, testScore=0, testSubmitted=false;
  function shuffle(a){{ const x=[...a]; for(let i=x.length-1;i>0;i--){{ const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; }} return x; }}
  function resetTestState(){{
    testSetup.style.display=''; testActiveArea.classList.remove('visible'); testResults.classList.remove('visible');
    testFeedback.className='test-feedback'; testFeedback.textContent=''; btnNext.classList.remove('visible');
    inputSpelling.value=''; inputMeaning.value=''; btnSubmit.disabled=false; btnSubmit.style.display='';
  }}
  function showTestSetup(){{ resetTestState(); }}
  btnStartTest.addEventListener('click', () => {{
    testWords = shuffle(wordData).slice(0, TOTAL_QUESTIONS);
    testCurrentIndex=0; testScore=0; testResultsData=[]; testSubmitted=false;
    testSetup.style.display='none'; testActiveArea.classList.add('visible'); testResults.classList.remove('visible');
    updateProgress(); setTimeout(playCurrent, 300);
  }});
  function updateProgress(){{
    testProgressLabel.textContent = '第 '+(testCurrentIndex+1)+' / '+TOTAL_QUESTIONS+' 题';
    testScoreLabel.textContent = '得分: '+testScore;
    progressBarFill.style.width = Math.round((testCurrentIndex/TOTAL_QUESTIONS)*100)+'%';
  }}
  function playCurrent(){{ if(testCurrentIndex>=testWords.length) return; btnPlayTest.classList.add('playing'); speakWord(testWords[testCurrentIndex].word, ()=>btnPlayTest.classList.remove('playing')); }}
  btnPlayTest.addEventListener('click', () => {{ if(!testSubmitted) playCurrent(); }});

  function cleanCN(s){{ return String(s||'').replace(/[，,、。；;：:！!？?（）()【】\\[\\]"\"''\\s]/g,''); }}
  function submitAnswer(){{
    if(testSubmitted || testCurrentIndex>=testWords.length) return;
    testSubmitted = true; btnSubmit.disabled = true;
    const w = testWords[testCurrentIndex];
    const userSpelling = inputSpelling.value.trim();
    const userMeaningClean = cleanCN(inputMeaning.value);
    const spellingOk = userSpelling.toLowerCase() === w.word.toLowerCase();
    let meaningOk = false;
    if(userMeaningClean){{
      for(const a of (w.acceptCN||[])){{
        const ac = cleanCN(a);
        if(ac && (userMeaningClean.includes(ac) || ac.includes(userMeaningClean))){{ meaningOk = true; break; }}
      }}
      if(!meaningOk){{
        const m = cleanCN(w.meaning);
        if(m && (userMeaningClean.includes(m) || m.includes(userMeaningClean))) meaningOk = true;
      }}
    }}
    const both = spellingOk && meaningOk;
    const earned = both ? 1 : ((spellingOk || meaningOk) ? 0.5 : 0);
    testScore += earned;
    testFeedback.className = 'test-feedback visible '+(both?'correct-all':(spellingOk||meaningOk?'partial':'wrong-all'));
    testFeedback.innerHTML = (both?'全对':(spellingOk||meaningOk?'部分正确':'再看看'))+
      '<div style="margin-top:6px;font-size:.9rem">答案：'+esc(w.word)+' · '+esc(w.meaning)+'</div>';
    testResultsData.push({{
      word: w.word, ipa: w.ipa || '', meaning: w.meaning,
      userSpelling: userSpelling, userMeaning: inputMeaning.value.trim(),
      spellingCorrect: spellingOk, meaningCorrect: meaningOk, earned: earned
    }});
    btnNext.classList.add('visible');
  }}
  btnSubmit.addEventListener('click', submitAnswer);
  inputMeaning.addEventListener('keydown', e => {{ if(e.key==='Enter') submitAnswer(); }});
  inputSpelling.addEventListener('keydown', e => {{ if(e.key==='Enter') inputMeaning.focus(); }});

  function nextQ(){{
    testCurrentIndex++; testSubmitted=false; btnSubmit.disabled=false; btnNext.classList.remove('visible');
    testFeedback.className='test-feedback'; inputSpelling.value=''; inputMeaning.value='';
    if(testCurrentIndex >= TOTAL_QUESTIONS){{ finish(); return; }}
    updateProgress(); setTimeout(playCurrent, 250); inputSpelling.focus();
  }}
  btnNext.addEventListener('click', nextQ);

  function finish(){{
    testActiveArea.classList.remove('visible'); testResults.classList.add('visible');
    const percent = Math.round((testScore/TOTAL_QUESTIONS)*100);
    resultsScore.textContent = testScore + ' / ' + TOTAL_QUESTIONS;
    resultsDetail.textContent = '正确率 '+percent+'%';
    resultsTableBody.innerHTML = testResultsData.map((r,i) => {{
      const ok = r.earned === 1;
      const cls = ok ? 'row-ok' : 'row-wrong';
      return '<tr class="'+cls+'"><td>'+(i+1)+'</td><td><strong>'+esc(r.word)+'</strong></td><td style="color:'+(r.spellingCorrect?'#3a7d5a':'#c0392b')+'">'+esc(r.userSpelling||'—')+'</td><td style="color:'+(r.meaningCorrect?'#3a7d5a':'#c0392b')+'">'+esc(r.userMeaning||'—')+'</td><td>'+(ok?'✓':(r.earned? '△':'✗'))+'</td></tr>';
    }}).join('');
    saveHistory({{ score:testScore, total:TOTAL_QUESTIONS, percent, timestamp:Date.now() }});
  }}
  btnRetry.addEventListener('click', () => btnStartTest.click());
  btnBackToSetup.addEventListener('click', showTestSetup);

  // URL mode from parent
  try {{
    const m = new URLSearchParams(location.search).get('vocabMode') ||
      (parent !== window ? new URLSearchParams(parent.location.search).get('vocabMode') : null);
    if(m === 'test'){{
      const tab = navTabs.querySelector('[data-mode="test"]');
      if(tab) tab.click();
    }}
  }} catch(e){{}}
}})();
</script>
</body>
</html>
"""


def build_one(path: Path) -> Path:
    meta = json.loads(path.read_text(encoding="utf-8"))
    if not meta.get("published", True):
        print("skip unpublished", path.name)
        return None
    n = int(meta["listNo"])
    out = OUT / f"四级单词LIST{n}.html"
    OUT.mkdir(parents=True, exist_ok=True)
    out.write_text(render_html(meta), encoding="utf-8")
    print("wrote", out.relative_to(ROOT), "words", len(meta.get("words") or []))
    return out


def main(argv: list[str]) -> int:
    files = sorted(DATA.glob("list-*.json"))
    if argv[1:]:
        want = {int(x) for x in argv[1:]}
        files = [f for f in files if int(re.search(r"list-(\d+)", f.name).group(1)) in want]
    if not files:
        print("no list json found", file=sys.stderr)
        return 1
    for f in files:
        build_one(f)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
