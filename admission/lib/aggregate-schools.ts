import { prisma } from "./db";
import {
  COUNTRY_LABELS,
  FIELD_LABELS,
  type Country,
  type Field,
} from "./catalog-labels";
import {
  getInstitutionMeta,
  institutionMark,
} from "@/data/institutions";

export type ProgramOption = {
  id: string;
  program: string;
  programZh: string | null;
  degree: string;
  field: string;
  fieldLabel: string;
  avgGpa: number;
  tier: number;
  blurb: string | null;
  duration: string | null;
  isStem: boolean | null;
  verified: boolean;
};

export type InstitutionCard = {
  name: string;
  nameZh: string;
  nameEn: string;
  country: string;
  countryLabel: string;
  mark: string;
  logoUrl?: string;
  programCount: number;
  programs: ProgramOption[];
  verified: boolean;
};

export async function loadInstitutionCards(): Promise<InstitutionCard[]> {
  const rows = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      program: true,
      programZh: true,
      degree: true,
      field: true,
      country: true,
      avgGpa: true,
      tier: true,
      blurb: true,
      duration: true,
      isStem: true,
      verifiedAt: true,
    },
    orderBy: [{ country: "asc" }, { tier: "asc" }, { name: "asc" }, { program: "asc" }],
  });

  const verifiedNames = new Set(
    rows.filter((r) => r.verifiedAt != null).map((r) => r.name)
  );

  const map = new Map<string, InstitutionCard>();
  for (const r of rows) {
    // hide template filler for schools that have verified programs
    if (verifiedNames.has(r.name) && r.verifiedAt == null) continue;

    let card = map.get(r.name);
    if (!card) {
      const meta = getInstitutionMeta(r.name);
      const country = (r.country || meta?.country || "US") as Country;
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
        verified: verifiedNames.has(r.name),
      };
      map.set(r.name, card);
    }
    card.programs.push({
      id: r.id,
      program: r.program,
      programZh: r.programZh,
      degree: r.degree,
      field: r.field,
      fieldLabel: FIELD_LABELS[r.field as Field] || r.field,
      avgGpa: r.avgGpa,
      tier: r.tier,
      blurb: r.blurb,
      duration: r.duration,
      isStem: r.isStem,
      verified: r.verifiedAt != null,
    });
    card.programCount = card.programs.length;
  }
  return [...map.values()];
}
