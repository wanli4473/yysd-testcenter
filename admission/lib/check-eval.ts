/**
 * Runnable self-check for calibrated engine (no DB).
 * Usage: npx tsx lib/check-eval.ts
 */
import { calibrateAdmission } from "./calibrate";
import type { School } from "@prisma/client";

const cmuDs = {
  id: "cmu",
  slug: "cmu-ds",
  name: "CMU",
  program: "Data Science",
  degree: "MS",
  country: "US",
  field: "data_ai",
  city: "Pittsburgh",
  avgGpa: 3.8,
  minGpa: 3.0,
  minToefl: 100,
  minIelts: 7,
  gpaScale: 4,
  website: null,
  admissionRequirements: "test",
  tier: 1,
  admitRateOfficial: 0.1,
  admitRateYear: 2023,
  admitRateSource: "test citation",
  admitRateGradcafe: 0.25,
  gradcafeSampleSize: 40,
} as School;

const asuDs = {
  ...cmuDs,
  id: "asu",
  slug: "asu-ds",
  name: "Arizona State University",
  tier: 3,
  avgGpa: 3.4,
  minGpa: 3.0,
  minToefl: 80,
} as School;

const lxr = {
  targetSchoolId: "x",
  gpa: 3.42,
  toefl: 100,
  undergradSchool: "THE PENNSYLVANIA STATE UNIVERSITY",
  undergradMajor: "Social Data Analytics",
};

const cases = Array.from({ length: 10 }, (_, i) => ({
  admissionResult: i % 3 === 0,
  gpa: 3.5,
  undergradSchool: "国际本科（GradCafe 自报）",
  source: "gradcafe" as const,
}));

const cmu = calibrateAdmission({
  school: cmuDs,
  input: lxr,
  cases,
  resume: { research: ["course project"], internships: ["a", "b", "c"], papers: [], tags: ["internship"] },
});
const asu = calibrateAdmission({
  school: asuDs,
  input: lxr,
  cases,
  resume: { research: ["course project"], internships: ["a", "b", "c"], papers: [], tags: ["internship"] },
});

console.assert(cmu.category === "冲刺", `CMU should be 冲刺, got ${cmu.category}`);
console.assert(cmu.probability < 30, `CMU prob should be <30, got ${cmu.probability}`);
console.assert(asu.probability > cmu.probability + 15, `ASU should beat CMU by 15+, ${asu.probability} vs ${cmu.probability}`);
console.assert(cmu.evidence.length >= 4, "evidence required");
console.assert(
  cmu.evidence.some((e) => e.type === "official_admit_rate"),
  "official rate evidence"
);
console.assert(
  cmu.evidence.some((e) => e.detail.includes("GradCafe")),
  "gradcafe evidence"
);
console.log("check-eval OK", {
  cmu: { p: cmu.probability, range: cmu.range, cat: cmu.category, gap: cmu.gap },
  asu: { p: asu.probability, range: asu.range, cat: asu.category, gap: asu.gap },
});
