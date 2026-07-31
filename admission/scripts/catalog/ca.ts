import type { Institution } from "./build";
import type { Field } from "./fields";

const BROAD: Field[] = [
  "cs",
  "engineering",
  "data_ai",
  "business",
  "finance",
  "science",
  "life_health",
  "social",
  "education",
];
const FULL: Field[] = [...BROAD, "arts_design", "law"];

export const CA_INSTITUTIONS: Institution[] = [
  { name: "University of Toronto", country: "CA", city: "Toronto", tier: 1, website: "https://www.utoronto.ca/", fields: FULL },
  { name: "University of British Columbia", country: "CA", city: "Vancouver", tier: 1, website: "https://www.ubc.ca/", fields: FULL },
  { name: "McGill University", country: "CA", city: "Montreal", tier: 1, website: "https://www.mcgill.ca/", fields: FULL },
  { name: "University of Waterloo", country: "CA", city: "Waterloo", tier: 1, website: "https://uwaterloo.ca/", fields: ["cs", "engineering", "data_ai", "science", "business"] },
  { name: "McMaster University", country: "CA", city: "Hamilton", tier: 2, website: "https://www.mcmaster.ca/", fields: ["cs", "engineering", "data_ai", "life_health", "science"] },
  { name: "University of Alberta", country: "CA", city: "Edmonton", tier: 2, website: "https://www.ualberta.ca/", fields: BROAD },
  { name: "University of Montreal", country: "CA", city: "Montreal", tier: 2, website: "https://www.umontreal.ca/", fields: ["cs", "data_ai", "science", "life_health", "social"] },
  { name: "University of Ottawa", country: "CA", city: "Ottawa", tier: 3, website: "https://www.uottawa.ca/", fields: BROAD },
  { name: "Queen's University", country: "CA", city: "Kingston", tier: 2, website: "https://www.queensu.ca/", fields: ["cs", "engineering", "business", "finance", "education"] },
  { name: "Western University", country: "CA", city: "London", tier: 2, website: "https://www.uwo.ca/", fields: ["cs", "business", "finance", "life_health", "social"] },
  { name: "University of Calgary", country: "CA", city: "Calgary", tier: 3, website: "https://www.ucalgary.ca/", fields: BROAD },
  { name: "Simon Fraser University", country: "CA", city: "Burnaby", tier: 3, website: "https://www.sfu.ca/", fields: ["cs", "data_ai", "business", "science", "arts_design"] },
  { name: "Dalhousie University", country: "CA", city: "Halifax", tier: 3, website: "https://www.dal.ca/", fields: ["cs", "engineering", "life_health", "science", "law"] },
  { name: "University of Victoria", country: "CA", city: "Victoria", tier: 3, website: "https://www.uvic.ca/", fields: ["cs", "data_ai", "science", "social", "education"] },
  { name: "York University", country: "CA", city: "Toronto", tier: 3, website: "https://www.yorku.ca/", fields: ["cs", "business", "finance", "social", "arts_design", "law"] },
];
