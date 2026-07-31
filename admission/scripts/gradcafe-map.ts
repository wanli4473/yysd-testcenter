/**
 * Map GradCafe university name strings → catalog School.name
 */
const ALIASES: Array<[RegExp | string, string]> = [
  [/carnegie\s*mellon|cmu/i, "CMU"],
  [/massachusetts\s*institute\s*of\s*technology|^mit$/i, "MIT"],
  [/stanford/i, "Stanford"],
  [/berkeley|uc\s*berkeley|university\s*of\s*california,?\s*berkeley/i, "UC Berkeley"],
  [/california\s*institute\s*of\s*technology|caltech/i, "Caltech"],
  [/harvard/i, "Harvard"],
  [/princeton/i, "Princeton"],
  [/yale/i, "Yale"],
  [/columbia/i, "Columbia"],
  [/penn\s*state|pennsylvania\s*state/i, "Penn State"],
  [/university\s*of\s*pennsylvania|\bupenn\b|u\s*penn\b/i, "UPenn"],
  [/cornell/i, "Cornell"],
  [/chicago/i, "University of Chicago"],
  [/duke/i, "Duke"],
  [/northwestern/i, "Northwestern"],
  [/johns?\s*hopkins|jhu/i, "Johns Hopkins"],
  [/brown\b/i, "Brown"],
  [/rice\b/i, "Rice"],
  [/vanderbilt/i, "Vanderbilt"],
  [/washington\s*university|wustl|washu/i, "Washington University in St. Louis"],
  [/university\s*of\s*california,?\s*los\s*angeles|\bucla\b/i, "UCLA"],
  [/uc\s*san\s*diego|\bucsd\b|university\s*of\s*california,?\s*san\s*diego/i, "UC San Diego"],
  [/southern\s*california|\busc\b/i, "USC"],
  [/new\s*york\s*university|\bnyu\b/i, "NYU"],
  [/university\s*of\s*michigan|\bumich\b/i, "University of Michigan"],
  [/georgia\s*tech|georgia\s*institute/i, "Georgia Tech"],
  [/illinois|uiuc|urbana-champaign/i, "UIUC"],
  [/texas\s*at\s*austin|ut\s*austin|university\s*of\s*texas,?\s*austin/i, "University of Texas at Austin"],
  [/university\s*of\s*washington|\buw\b/i, "University of Washington"],
  [/purdue/i, "Purdue"],
  [/boston\s*university|^bu$/i, "Boston University"],
  [/wisconsin|madison/i, "University of Wisconsin-Madison"],
  [/ohio\s*state/i, "Ohio State University"],
  [/florida(?!\s*state)|^uf$/i, "University of Florida"],
  [/maryland|college\s*park/i, "University of Maryland"],
  [/uc\s*irvine|uci\b|irvine/i, "UC Irvine"],
  [/uc\s*davis|davis/i, "UC Davis"],
  [/northeastern/i, "Northeastern"],
  [/arizona\s*state|^asu$/i, "Arizona State University"],
  [/minnesota/i, "University of Minnesota"],
  [/stony\s*brook|suny\s*stony/i, "Stony Brook"], // may not be in catalog
  [/oxford/i, "University of Oxford"],
  [/cambridge(?!\s*,?\s*ma)/i, "University of Cambridge"],
  [/imperial/i, "Imperial College London"],
  [/^ucl$|university\s*college\s*london/i, "UCL"],
  [/^lse$|london\s*school\s*of\s*economics/i, "LSE"],
  [/edinburgh/i, "University of Edinburgh"],
  [/king'?s\s*college/i, "King's College London"],
  [/manchester/i, "University of Manchester"],
  [/bristol/i, "University of Bristol"],
  [/warwick/i, "University of Warwick"],
  [/toronto/i, "University of Toronto"],
  [/british\s*columbia|^ubc$/i, "University of British Columbia"],
  [/mcgill/i, "McGill University"],
  [/waterloo/i, "University of Waterloo"],
  [/melbourne/i, "University of Melbourne"],
  [/sydney(?!\s*tech)/i, "University of Sydney"],
  [/^anu$|australian\s*national/i, "ANU"],
  [/unsw|new\s*south\s*wales/i, "UNSW Sydney"],
];

export function mapGradcafeUni(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  for (const [pat, name] of ALIASES) {
    if (typeof pat === "string") {
      if (s.toLowerCase() === pat.toLowerCase()) return name;
    } else if (pat.test(s)) {
      return name;
    }
  }
  return null;
}

/** Season like F15 / S16 → calendar year of start */
export function seasonYear(season: string): number | null {
  const m = /^([FS])(\d{2})$/i.exec(season.trim());
  if (!m) return null;
  const yy = Number(m[2]);
  return 2000 + yy;
}

export function redactComment(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[phone]")
    .slice(0, 280)
    .trim();
}
