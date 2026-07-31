import type { Institution } from "./build";
import type { Field } from "./fields";

const BROAD: Field[] = [
  "cs",
  "engineering",
  "data_ai",
  "business",
  "finance",
  "science",
  "social",
  "education",
];
const FULL: Field[] = [...BROAD, "life_health", "arts_design", "law"];

export const UK_INSTITUTIONS: Institution[] = [
  { name: "University of Oxford", country: "UK", city: "Oxford", tier: 1, website: "https://www.ox.ac.uk/", fields: ["cs", "data_ai", "science", "social", "law", "education"] },
  { name: "University of Cambridge", country: "UK", city: "Cambridge", tier: 1, website: "https://www.cam.ac.uk/", fields: ["cs", "engineering", "science", "business", "law"] },
  { name: "Imperial College London", country: "UK", city: "London", tier: 1, website: "https://www.imperial.ac.uk/", fields: ["cs", "engineering", "data_ai", "science", "business", "life_health"] },
  { name: "UCL", country: "UK", city: "London", tier: 1, website: "https://www.ucl.ac.uk/", fields: FULL },
  { name: "LSE", country: "UK", city: "London", tier: 1, website: "https://www.lse.ac.uk/", fields: ["business", "finance", "social", "data_ai", "law"] },
  { name: "University of Edinburgh", country: "UK", city: "Edinburgh", tier: 2, website: "https://www.ed.ac.uk/", fields: FULL },
  { name: "King's College London", country: "UK", city: "London", tier: 2, website: "https://www.kcl.ac.uk/", fields: ["cs", "data_ai", "life_health", "social", "law", "arts_design"] },
  { name: "University of Manchester", country: "UK", city: "Manchester", tier: 2, website: "https://www.manchester.ac.uk/", fields: BROAD },
  { name: "University of Bristol", country: "UK", city: "Bristol", tier: 2, website: "https://www.bristol.ac.uk/", fields: ["cs", "engineering", "data_ai", "science", "social"] },
  { name: "University of Warwick", country: "UK", city: "Coventry", tier: 2, website: "https://warwick.ac.uk/", fields: ["cs", "data_ai", "business", "finance", "science"] },
  { name: "University of Glasgow", country: "UK", city: "Glasgow", tier: 2, website: "https://www.gla.ac.uk/", fields: BROAD },
  { name: "University of Birmingham", country: "UK", city: "Birmingham", tier: 3, website: "https://www.birmingham.ac.uk/", fields: BROAD },
  { name: "University of Leeds", country: "UK", city: "Leeds", tier: 3, website: "https://www.leeds.ac.uk/", fields: BROAD },
  { name: "University of Southampton", country: "UK", city: "Southampton", tier: 3, website: "https://www.southampton.ac.uk/", fields: ["cs", "engineering", "data_ai", "science", "business"] },
  { name: "University of Sheffield", country: "UK", city: "Sheffield", tier: 3, website: "https://www.sheffield.ac.uk/", fields: BROAD },
  { name: "University of Nottingham", country: "UK", city: "Nottingham", tier: 3, website: "https://www.nottingham.ac.uk/", fields: BROAD },
  { name: "Queen Mary University of London", country: "UK", city: "London", tier: 3, website: "https://www.qmul.ac.uk/", fields: ["cs", "engineering", "data_ai", "business", "law"] },
  { name: "University of York", country: "UK", city: "York", tier: 3, website: "https://www.york.ac.uk/", fields: ["cs", "data_ai", "science", "social", "education"] },
  { name: "Durham University", country: "UK", city: "Durham", tier: 2, website: "https://www.durham.ac.uk/", fields: ["cs", "business", "finance", "science", "social"] },
  { name: "University of St Andrews", country: "UK", city: "St Andrews", tier: 2, website: "https://www.st-andrews.ac.uk/", fields: ["cs", "science", "social", "arts_design"] },
];
