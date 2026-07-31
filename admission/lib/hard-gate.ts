import type { School } from "@prisma/client";
import type { EvaluateInput } from "./validate";

export type GateResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

export function checkHardGate(school: School, input: EvaluateInput): GateResult {
  const reasons: string[] = [];
  if (input.gpa < school.minGpa) {
    reasons.push(
      `GPA ${input.gpa.toFixed(2)} 低于该校最低要求 ${school.minGpa.toFixed(2)}`
    );
  }
  const hasLang =
    (input.toefl != null && input.toefl > 0) ||
    (input.ielts != null && input.ielts > 0);
  if (!hasLang && (school.minToefl != null || school.minIelts != null)) {
    reasons.push("未提供 TOEFL/IELTS 成绩，无法通过语言硬门槛");
  } else {
    const toeflOk =
      school.minToefl == null ||
      (input.toefl != null && input.toefl >= school.minToefl);
    const ieltsOk =
      school.minIelts == null ||
      (input.ielts != null && input.ielts >= school.minIelts);
    // pass if either language score meets its minimum when provided
    if (school.minToefl != null || school.minIelts != null) {
      const anyPass =
        (input.toefl != null && toeflOk) || (input.ielts != null && ieltsOk);
      if (!anyPass) {
        if (input.toefl != null && school.minToefl != null && input.toefl < school.minToefl) {
          reasons.push(`TOEFL ${input.toefl} 低于最低要求 ${school.minToefl}`);
        }
        if (input.ielts != null && school.minIelts != null && input.ielts < school.minIelts) {
          reasons.push(`IELTS ${input.ielts} 低于最低要求 ${school.minIelts}`);
        }
        if (reasons.length === 0) {
          reasons.push("语言成绩未达到该校最低要求");
        }
      }
    }
  }
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
