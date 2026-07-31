import { AdvisorWizard } from "@/components/AdvisorWizard";
import { loadInstitutionCards } from "@/lib/aggregate-schools";
import { getInstitutionMeta, institutionMark } from "@/data/institutions";
import { COUNTRY_LABELS, FIELD_LABELS, type Country, type Field } from "@/lib/catalog-labels";
import { MOCK_SCHOOLS } from "@/lib/mock-schools";
import type { InstitutionCard } from "@/lib/aggregate-schools";

export const dynamic = "force-dynamic";

function fromMock(): InstitutionCard[] {
  const map = new Map<string, InstitutionCard>();
  for (const r of MOCK_SCHOOLS) {
    let card = map.get(r.name);
    if (!card) {
      const meta = getInstitutionMeta(r.name);
      const country = (r.country || "US") as Country;
      card = {
        name: r.name,
        nameZh: meta?.nameZh || r.name,
        nameEn: r.name,
        country,
        countryLabel: COUNTRY_LABELS[country] || r.country,
        mark: institutionMark(r.name),
        logoUrl: meta?.logoUrl,
        programCount: 0,
        programs: [],
        verified: false,
      };
      map.set(r.name, card);
    }
    card.programs.push({
      id: r.id,
      program: r.program,
      programZh: null,
      degree: r.degree,
      field: r.field,
      fieldLabel: FIELD_LABELS[r.field as Field] || r.field,
      avgGpa: r.avgGpa,
      tier: r.tier,
      blurb: null,
      duration: null,
      isStem: null,
      verified: false,
    });
    card.programCount = card.programs.length;
  }
  return [...map.values()];
}

export default async function HomePage() {
  let institutions: InstitutionCard[] = [];
  try {
    institutions = await loadInstitutionCards();
  } catch {
    institutions = fromMock();
  }
  if (!institutions.length) institutions = fromMock();

  return <AdvisorWizard institutions={institutions} />;
}
