# Bug memory

- TOEFL writing sentence `bank` must never match `answer` order. Builders use `scripts/toefl_sent.py`. Upload gate: `node scripts/check_toefl_paper.js` (live catalog includes `bank-*-*.json`).
- TOEFL Build a Sentence chips must not show Titlecase (Do/Have leaks the first word). Player lowercases chips; score is case-insensitive. Bank writing JSON is gated for Titlecase / HUD / CJK / ▩.
- TOEFL reading: Complete the Words = one slot per missing letter; academic vocab stem quotes the word so the player can highlight it; daily-life email/notice/schedule must have line breaks or structured layout. Gate: `node scripts/check_toefl_paper.js`.
- After TOEFL paper or reading-engine edits pass the gate, ship immediately via `~/.ssh/yysd_ecs_deploy` to `root@8.159.129.88` (`/opt/yysd/app` + `/opt/yysd/repo/app`; website files to `/opt/yysd/web` + `/opt/yysd/repo`). Do not wait to be asked. `139.224.0.221` is the retired pre-2026-10-13 IP — ignore it and any shell history that points there.
- TOEFL Listen and Repeat: one sentence → 3s think → beep → 8s record. Never show `sample` during the item. One scene photo. HIT Sets 3–10 Q2–7 are `say` stand-ins until real per-sentence audio exists.
- TOEFL listening photos are official-exam portraits on a plain white background, matched to the speaker's accent. Conversation: two people talking. Choose a response: one person, usually with a phone. Announcement and lecture: one person standing. No scenery, no text in the image. Same voice reuses the same file under `library/toefl/img/listen/` on `task.image`.
