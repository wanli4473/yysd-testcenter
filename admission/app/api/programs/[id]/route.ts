import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FIELD_LABELS, type Field } from "@/lib/catalog-labels";
import { getInstitutionMeta } from "@/data/institutions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const school = await prisma.school.findUnique({ where: { id: ctx.params.id } });
  if (!school) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }
  const inst = getInstitutionMeta(school.name);
  return NextResponse.json({
    ...school,
    verified: school.verifiedAt != null,
    fieldLabel: FIELD_LABELS[school.field as Field] || school.field,
    schoolNameZh: inst?.nameZh || school.name,
  });
}
