import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdmissionEval } from "@/components/AdmissionEval";
import { MOCK_SCHOOLS } from "@/lib/mock-schools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COUNTRY_LABELS, FIELD_LABELS, type Country, type Field } from "@/lib/catalog-labels";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

async function loadSchool(id: string) {
  try {
    const s = await prisma.school.findUnique({ where: { id } });
    if (s) return s;
  } catch {
    /* DB offline → mock */
  }
  return MOCK_SCHOOLS.find((s) => s.id === id) || null;
}

export default async function SchoolDetailPage({ params }: Props) {
  const school = await loadSchool(params.id);
  if (!school) notFound();

  let peers: Array<{ id: string; name: string; program: string; degree: string }> =
    [];
  try {
    peers = await prisma.school.findMany({
      where: {
        country: school.country,
        field: school.field,
        id: { not: school.id },
      },
      orderBy: [{ tier: "asc" }, { name: "asc" }],
      take: 5,
      select: { id: true, name: true, program: true, degree: true },
    });
  } catch {
    peers = MOCK_SCHOOLS.filter(
      (s) =>
        s.id !== school.id &&
        s.country === school.country &&
        s.field === school.field
    ).slice(0, 5);
  }

  const countryLabel =
    COUNTRY_LABELS[school.country as Country] || school.country;
  const fieldLabel = FIELD_LABELS[school.field as Field] || school.field;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>
            {school.name} · {school.program}（{school.degree}）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-stone-600">
          <p>
            {countryLabel} · {fieldLabel}
            {school.city ? ` · ${school.city}` : ""}
          </p>
          <p>
            均分 GPA {school.avgGpa.toFixed(2)} · 最低 GPA{" "}
            {school.minGpa.toFixed(2)}
            {school.minToefl != null ? ` · TOEFL ≥ ${school.minToefl}` : ""}
            {school.minIelts != null ? ` · IELTS ≥ ${school.minIelts}` : ""}
          </p>
          <p className="text-stone-500">
            成绩说明：系统内 GPA 按 4.0 量表；英/澳百分制或等级制请先换算后再填写。
          </p>
          <p>{school.admissionRequirements}</p>
          {school.website && (
            <a
              href={school.website}
              target="_blank"
              rel="noreferrer"
              className="text-stone-900 underline"
            >
              官方网站
            </a>
          )}
        </CardContent>
      </Card>

      <AdmissionEval schoolId={school.id} schoolName={school.name} />

      {peers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">同国同学门类可对比</h2>
          <ul className="space-y-2 text-sm">
            {peers.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/schools/${p.id}`}
                  className="text-stone-800 underline"
                >
                  {p.name} · {p.program}（{p.degree}）
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/schools?country=${school.country}&field=${school.field}`}
            className="text-sm text-stone-600 underline"
          >
            查看全部同学门类 →
          </Link>
        </div>
      )}
    </div>
  );
}
