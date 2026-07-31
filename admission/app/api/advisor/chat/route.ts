import { NextResponse } from "next/server";
import { z } from "zod";
import { matchProgramsForSchool } from "@/lib/advisor-match";
import type { AdvisorBackground } from "@/lib/advisor-bg";

export const runtime = "nodejs";

const Body = z.object({
  schoolName: z.string().min(1),
  message: z.string().min(1).max(2000),
  background: z
    .object({
      gpa: z.number().min(0).max(4.5),
      toefl: z.number().min(0).max(120).nullable().optional(),
      ielts: z.number().min(0).max(9).nullable().optional(),
      gre: z.number().min(260).max(340).nullable().optional(),
      undergradSchool: z.string().min(1).max(200),
      undergradMajor: z.string().min(1).max(200),
    })
    .optional()
    .nullable(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = Body.parse(json);
    const bg: AdvisorBackground | null = body.background
      ? {
          gpa: body.background.gpa,
          toefl: body.background.toefl ?? null,
          ielts: body.background.ielts ?? null,
          gre: body.background.gre ?? null,
          undergradSchool: body.background.undergradSchool,
          undergradMajor: body.background.undergradMajor,
        }
      : null;
    const result = await matchProgramsForSchool(
      body.schoolName,
      body.message,
      8,
      bg
    );
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "顾问服务失败" },
      { status: 500 }
    );
  }
}
