/**
 * Self-check for background fit notes (no DB).
 * Usage: npx tsx lib/check-advisor-bg.ts
 */
import { fitNotes, fitPenalty } from "./advisor-bg";

const hard = {
  minGpa: 3.5,
  avgGpa: 3.85,
  minToefl: 100,
  minIelts: 7.0,
};
const soft = {
  minGpa: 3.0,
  avgGpa: 3.4,
  minToefl: 90,
  minIelts: 6.5,
};
const bg = {
  gpa: 3.42,
  toefl: 100,
  ielts: null as number | null,
  gre: null as number | null,
  undergradSchool: "PSU",
  undergradMajor: "CS",
};

const nHard = fitNotes(hard, bg);
const nSoft = fitNotes(soft, bg);
console.assert(nHard.some((x) => x.includes("冲刺") || x.includes("低于")), nHard);
console.assert(nSoft.some((x) => x.includes("达参考")), nSoft);
console.assert(fitPenalty(nHard) > fitPenalty(nSoft), "hard should rank worse");
console.log("check-advisor-bg OK", { nHard, nSoft });
