import { z } from "zod";

export const evaluateSchema = z.object({
  targetSchoolId: z.string().min(1).max(64),
  gpa: z.number().min(0).max(4.5),
  toefl: z.number().int().min(0).max(120).optional().nullable(),
  ielts: z.number().min(0).max(9).optional().nullable(),
  gre: z.number().int().min(260).max(340).optional().nullable(),
  undergradSchool: z.string().min(1).max(200),
  undergradMajor: z.string().min(1).max(200),
  resumeText: z.string().max(50000).optional().nullable(),
  backgroundTags: z.array(z.string().max(64)).max(30).optional(),
});

export type EvaluateInput = z.infer<typeof evaluateSchema>;
