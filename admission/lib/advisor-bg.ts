/** Shared applicant background for advisor chat + eval prefill. */

export type AdvisorBackground = {
  gpa: number;
  toefl: number | null;
  ielts: number | null;
  gre: number | null;
  undergradSchool: string;
  undergradMajor: string;
};

export function fitNotes(
  p: { minGpa: number; avgGpa: number; minToefl: number | null; minIelts: number | null },
  bg: AdvisorBackground | null | undefined
): string[] {
  if (!bg) return [];
  const notes: string[] = [];
  if (bg.gpa < p.minGpa) notes.push(`GPA ${bg.gpa} 低于参考最低 ${p.minGpa}`);
  else if (bg.gpa + 0.15 < p.avgGpa) notes.push(`GPA 相对均分偏冲刺（参考均分约 ${p.avgGpa.toFixed(2)}）`);
  else if (bg.gpa >= p.avgGpa) notes.push("GPA 达参考均分附近");

  const langOk =
    (p.minToefl != null && bg.toefl != null && bg.toefl >= p.minToefl) ||
    (p.minIelts != null && bg.ielts != null && bg.ielts >= p.minIelts);
  const langLow =
    (p.minToefl != null && bg.toefl != null && bg.toefl < p.minToefl) ||
    (p.minIelts != null && bg.ielts != null && bg.ielts < p.minIelts);

  if (langLow) {
    notes.push(
      p.minToefl != null && bg.toefl != null && bg.toefl < p.minToefl
        ? `TOEFL ${bg.toefl} 可能低于 ${p.minToefl}`
        : `IELTS ${bg.ielts} 可能低于 ${p.minIelts}`
    );
  } else if (langOk) {
    notes.push("语言成绩达参考门槛");
  } else if (p.minToefl != null || p.minIelts != null) {
    notes.push("未填语言成绩，无法比对门槛");
  }
  return notes;
}

/** Secondary sort key: lower = better fit when interest scores tie. */
export function fitPenalty(notes: string[]): number {
  let p = 0;
  for (const n of notes) {
    if (n.includes("低于")) p += 2;
    if (n.includes("冲刺")) p += 1;
    if (n.includes("达参考")) p -= 1;
  }
  return p;
}
