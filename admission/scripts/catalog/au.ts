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

export const AU_INSTITUTIONS: Institution[] = [
  { name: "University of Melbourne", country: "AU", city: "Melbourne", tier: 1, website: "https://www.unimelb.edu.au/", fields: FULL },
  { name: "University of Sydney", country: "AU", city: "Sydney", tier: 1, website: "https://www.sydney.edu.au/", fields: FULL },
  { name: "ANU", country: "AU", city: "Canberra", tier: 1, website: "https://www.anu.edu.au/", fields: ["cs", "data_ai", "science", "social", "law", "business"] },
  { name: "University of Queensland", country: "AU", city: "Brisbane", tier: 2, website: "https://www.uq.edu.au/", fields: BROAD },
  { name: "UNSW Sydney", country: "AU", city: "Sydney", tier: 1, website: "https://www.unsw.edu.au/", fields: ["cs", "engineering", "data_ai", "business", "finance", "science"] },
  { name: "Monash University", country: "AU", city: "Melbourne", tier: 2, website: "https://www.monash.edu/", fields: FULL },
  { name: "University of Western Australia", country: "AU", city: "Perth", tier: 2, website: "https://www.uwa.edu.au/", fields: BROAD },
  { name: "University of Adelaide", country: "AU", city: "Adelaide", tier: 2, website: "https://www.adelaide.edu.au/", fields: ["cs", "engineering", "data_ai", "science", "life_health"] },
  { name: "University of Technology Sydney", country: "AU", city: "Sydney", tier: 3, website: "https://www.uts.edu.au/", fields: ["cs", "engineering", "data_ai", "business", "arts_design"] },
  { name: "RMIT University", country: "AU", city: "Melbourne", tier: 3, website: "https://www.rmit.edu.au/", fields: ["cs", "engineering", "data_ai", "business", "arts_design"] },
  { name: "Queensland University of Technology", country: "AU", city: "Brisbane", tier: 3, website: "https://www.qut.edu.au/", fields: ["cs", "engineering", "data_ai", "business", "education"] },
  { name: "Macquarie University", country: "AU", city: "Sydney", tier: 3, website: "https://www.mq.edu.au/", fields: ["cs", "data_ai", "business", "finance", "education"] },
];
