/**
 * Self-check: verified catalog has unique slugs and Top schools covered.
 * Usage: npx tsx lib/check-verified.ts
 */
import {
  VERIFIED_PROGRAMS,
  VERIFIED_SCHOOL_NAMES,
  isVerifiedSchool,
} from "../data/verified-programs";

const slugs = VERIFIED_PROGRAMS.map((p) => p.slug);
console.assert(new Set(slugs).size === slugs.length, "duplicate slugs");
for (const name of VERIFIED_SCHOOL_NAMES) {
  const n = VERIFIED_PROGRAMS.filter((p) => p.name === name).length;
  console.assert(n >= 3, `${name} should have ≥3 verified programs, got ${n}`);
  console.assert(isVerifiedSchool(name), name);
}
for (const p of VERIFIED_PROGRAMS) {
  console.assert(!!p.officialUrl && p.officialUrl.startsWith("http"), p.slug);
  console.assert(!!p.programZh, p.slug);
}
console.log("check-verified OK", {
  schools: VERIFIED_SCHOOL_NAMES.length,
  programs: VERIFIED_PROGRAMS.length,
});
