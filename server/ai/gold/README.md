# IELTS AI gold set

- `samples.json` — 25 calibration rows (20 writing + 5 speaking) with teacher `human` bands.
- Offline MAE: `node scripts/ai_grade_mae.js --assert` (uses stored `aiOverall`).
- Target: MAE ≤ 0.5 vs school examiners. Replace `aiOverall` after live re-grades / teacher corrections (`/api/teacher/ai-corrections`).
