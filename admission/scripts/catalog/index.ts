import { expandInstitutions } from "./build";
import { US_INSTITUTIONS } from "./us";
import { UK_INSTITUTIONS } from "./uk";
import { CA_INSTITUTIONS } from "./ca";
import { AU_INSTITUTIONS } from "./au";
import type { SchoolSeed } from "./fields";

export * from "./fields";

export function allSchoolSeeds(): SchoolSeed[] {
  return expandInstitutions([
    ...US_INSTITUTIONS,
    ...UK_INSTITUTIONS,
    ...CA_INSTITUTIONS,
    ...AU_INSTITUTIONS,
  ]);
}
