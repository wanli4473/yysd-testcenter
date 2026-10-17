---
trigger: glob
glob:
  - library/toefl/**/*.json
  - app/library/toefl/**/*.json
  - scripts/build_toefl*.py
  - scripts/build_set*_hit.py
  - scripts/check_toefl*.js
  - scripts/toefl_sent.py
---

# TOEFL papers — make and upload

Before any new or edited TOEFL paper goes live:

1. Writing `sentence` chips: `bank` must not be the answer left-to-right. Use `scripts/toefl_sent.py` `scramble(bank, answer)` in every `sent()`. Extra distractors are good; order leak is a ship blocker. Bank chips must not show Titlecase (`Do` / `Have` leaks the first word). The player lowercases chips; `I` and ALLCAPS stay. Do not invent a second chip style.
2. Audio filenames: ASCII kebab-case, no spaces or parentheses. Player encodes spaces, but new files must not need that.
3. Dated mock papers go in `library/toefl/` (and `library/toefl/audio/YYYY-MM-DD/`). HIT Set 1/2 papers go in `app/library/toefl/`. Do not dump set JSON into the website dated-paper folder.
4. After writing JSON, run `node scripts/check_toefl_paper.js path/to/paper.json`. A pack: `node scripts/check_toefl_paper.js` (live catalog, including `app/library/toefl/bank-*-*.json`). Do not upload if it fails.
5. After a paper or reading-engine change passes the gate, ship it the same turn. See `AGENTS.local.md`. Do not `rsync --delete` the website. Do not wait for a later “上线” ask.
5b. Hand writing banks: one PNG → one task in `bank-bs|we|ad-writing.json`. PNG is source of truth; do not OCR-batch. Green answer bar verifies the reconstructed sentence — do not copy Titlecase from it into `bank`. Email needs `prompt` / `bullets` / `to` / `subject`. Discussion needs professor name+text and two student posts. Duplicate `task.set` fails. CJK/HUD/▩ in English fields fail.

Reading (Jiajia / official Enhanced TOEFL):

6. Complete the Words: `prefix` + `answer` only. Engine draws one slot per `answer` letter. Do not invent a second blank UI. `answer` must be letters only.
7. Academic vocab: stem must be `The word "X" in the passage is closest in meaning to` (or `The phrase "X"`). X must appear in `paras`. The player highlights X — do not add a second highlight field.
8. Daily life: emails / notices / schedules / signs are not one paragraph. Put real line breaks in `layout.body`, or use `kind: schedule|steps|course|poster` with `columns` / `fields` / `steps`. The player keeps whitespace; do not flatten into one `<p>`.

Speaking (Xiaochun / official Listen and Repeat):

9. One sentence per item — one kebab-case audio file. Do not share one long mp3 plus `fromSec`. A spoken scene intro is `modules[].intro.audio`, its own file — never a numbered task.
10. Cadence is listen → 3s prep (`prepSec`) → beep → 8s record. Never show `sample` during the item. One scene `image` stays on screen for the set. Review shows `sample` as 应复述.
11. Interview: `instruction` (scenario) may stay on screen. Never show `stem` during the item. Cadence is listen → 45s record. No prep, no beep. Review shows `stem` as 题目.

Do not add a second exam engine. Reuse `toefl-*.html` + existing players.
