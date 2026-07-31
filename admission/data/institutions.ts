import type { Country } from "@/lib/catalog-labels";
import logoMap from "./logo-map.json";

export type InstitutionMeta = {
  name: string;
  nameZh: string;
  country: Country;
  /** Optional image URL; letter mark used when absent */
  logoUrl?: string;
};

/** Chinese display names keyed by catalog English `School.name` */
export const INSTITUTIONS: InstitutionMeta[] = [
  // US
  { name: "MIT", nameZh: "麻省理工学院", country: "US" },
  { name: "Stanford", nameZh: "斯坦福大学", country: "US" },
  { name: "CMU", nameZh: "卡内基梅隆大学", country: "US" },
  { name: "UC Berkeley", nameZh: "加州大学伯克利分校", country: "US" },
  { name: "Caltech", nameZh: "加州理工学院", country: "US" },
  { name: "Harvard", nameZh: "哈佛大学", country: "US" },
  { name: "Princeton", nameZh: "普林斯顿大学", country: "US" },
  { name: "Yale", nameZh: "耶鲁大学", country: "US" },
  { name: "Columbia", nameZh: "哥伦比亚大学", country: "US" },
  { name: "UPenn", nameZh: "宾夕法尼亚大学", country: "US" },
  { name: "Cornell", nameZh: "康奈尔大学", country: "US" },
  { name: "University of Chicago", nameZh: "芝加哥大学", country: "US" },
  { name: "Duke", nameZh: "杜克大学", country: "US" },
  { name: "Northwestern", nameZh: "西北大学", country: "US" },
  { name: "Johns Hopkins", nameZh: "约翰霍普金斯大学", country: "US" },
  { name: "Brown", nameZh: "布朗大学", country: "US" },
  { name: "Rice", nameZh: "莱斯大学", country: "US" },
  { name: "Vanderbilt", nameZh: "范德堡大学", country: "US" },
  { name: "Washington University in St. Louis", nameZh: "华盛顿大学圣路易斯", country: "US" },
  { name: "UCLA", nameZh: "加州大学洛杉矶分校", country: "US" },
  { name: "UC San Diego", nameZh: "加州大学圣地亚哥分校", country: "US" },
  { name: "USC", nameZh: "南加州大学", country: "US" },
  { name: "NYU", nameZh: "纽约大学", country: "US" },
  { name: "University of Michigan", nameZh: "密歇根大学", country: "US" },
  { name: "Georgia Tech", nameZh: "佐治亚理工学院", country: "US" },
  { name: "UIUC", nameZh: "伊利诺伊大学香槟分校", country: "US" },
  { name: "University of Texas at Austin", nameZh: "德州大学奥斯汀分校", country: "US" },
  { name: "University of Washington", nameZh: "华盛顿大学", country: "US" },
  { name: "Purdue", nameZh: "普渡大学", country: "US" },
  { name: "Boston University", nameZh: "波士顿大学", country: "US" },
  { name: "University of Wisconsin-Madison", nameZh: "威斯康星大学麦迪逊分校", country: "US" },
  { name: "Ohio State University", nameZh: "俄亥俄州立大学", country: "US" },
  { name: "Penn State", nameZh: "宾州州立大学", country: "US" },
  { name: "University of Florida", nameZh: "佛罗里达大学", country: "US" },
  { name: "University of Maryland", nameZh: "马里兰大学", country: "US" },
  { name: "UC Irvine", nameZh: "加州大学欧文分校", country: "US" },
  { name: "UC Davis", nameZh: "加州大学戴维斯分校", country: "US" },
  { name: "Northeastern", nameZh: "东北大学", country: "US" },
  { name: "Arizona State University", nameZh: "亚利桑那州立大学", country: "US" },
  { name: "University of Minnesota", nameZh: "明尼苏达大学", country: "US" },
  // UK
  { name: "University of Oxford", nameZh: "牛津大学", country: "UK" },
  { name: "University of Cambridge", nameZh: "剑桥大学", country: "UK" },
  { name: "Imperial College London", nameZh: "帝国理工学院", country: "UK" },
  { name: "UCL", nameZh: "伦敦大学学院", country: "UK" },
  { name: "LSE", nameZh: "伦敦政治经济学院", country: "UK" },
  { name: "University of Edinburgh", nameZh: "爱丁堡大学", country: "UK" },
  { name: "King's College London", nameZh: "伦敦国王学院", country: "UK" },
  { name: "University of Manchester", nameZh: "曼彻斯特大学", country: "UK" },
  { name: "University of Bristol", nameZh: "布里斯托大学", country: "UK" },
  { name: "University of Warwick", nameZh: "华威大学", country: "UK" },
  { name: "University of Glasgow", nameZh: "格拉斯哥大学", country: "UK" },
  { name: "University of Birmingham", nameZh: "伯明翰大学", country: "UK" },
  { name: "University of Leeds", nameZh: "利兹大学", country: "UK" },
  { name: "University of Southampton", nameZh: "南安普顿大学", country: "UK" },
  { name: "University of Sheffield", nameZh: "谢菲尔德大学", country: "UK" },
  { name: "University of Nottingham", nameZh: "诺丁汉大学", country: "UK" },
  { name: "Queen Mary University of London", nameZh: "伦敦玛丽女王大学", country: "UK" },
  { name: "University of York", nameZh: "约克大学", country: "UK" },
  { name: "Durham University", nameZh: "杜伦大学", country: "UK" },
  { name: "University of St Andrews", nameZh: "圣安德鲁斯大学", country: "UK" },
  // CA
  { name: "University of Toronto", nameZh: "多伦多大学", country: "CA" },
  { name: "University of British Columbia", nameZh: "英属哥伦比亚大学", country: "CA" },
  { name: "McGill University", nameZh: "麦吉尔大学", country: "CA" },
  { name: "University of Waterloo", nameZh: "滑铁卢大学", country: "CA" },
  { name: "McMaster University", nameZh: "麦克马斯特大学", country: "CA" },
  { name: "University of Alberta", nameZh: "阿尔伯塔大学", country: "CA" },
  { name: "University of Montreal", nameZh: "蒙特利尔大学", country: "CA" },
  { name: "University of Ottawa", nameZh: "渥太华大学", country: "CA" },
  { name: "Queen's University", nameZh: "女王大学", country: "CA" },
  { name: "Western University", nameZh: "西安大略大学", country: "CA" },
  { name: "University of Calgary", nameZh: "卡尔加里大学", country: "CA" },
  { name: "Simon Fraser University", nameZh: "西蒙弗雷泽大学", country: "CA" },
  { name: "Dalhousie University", nameZh: "达尔豪斯大学", country: "CA" },
  { name: "University of Victoria", nameZh: "维多利亚大学", country: "CA" },
  { name: "York University", nameZh: "约克大学（加）", country: "CA" },
  // AU
  { name: "University of Melbourne", nameZh: "墨尔本大学", country: "AU" },
  { name: "University of Sydney", nameZh: "悉尼大学", country: "AU" },
  { name: "ANU", nameZh: "澳大利亚国立大学", country: "AU" },
  { name: "University of Queensland", nameZh: "昆士兰大学", country: "AU" },
  { name: "UNSW Sydney", nameZh: "新南威尔士大学", country: "AU" },
  { name: "Monash University", nameZh: "莫纳什大学", country: "AU" },
  { name: "University of Western Australia", nameZh: "西澳大学", country: "AU" },
  { name: "University of Adelaide", nameZh: "阿德莱德大学", country: "AU" },
  { name: "University of Technology Sydney", nameZh: "悉尼科技大学", country: "AU" },
  { name: "RMIT University", nameZh: "皇家墨尔本理工大学", country: "AU" },
  { name: "Queensland University of Technology", nameZh: "昆士兰科技大学", country: "AU" },
  { name: "Macquarie University", nameZh: "麦考瑞大学", country: "AU" },
];

const LOGO_BY_NAME = logoMap as Record<string, string>;
const BY_NAME = new Map(
  INSTITUTIONS.map((i) => [
    i.name,
    { ...i, logoUrl: i.logoUrl || LOGO_BY_NAME[i.name] },
  ])
);

export function getInstitutionMeta(name: string): InstitutionMeta | undefined {
  const base = BY_NAME.get(name);
  if (base) return base;
  const logoUrl = LOGO_BY_NAME[name];
  if (!logoUrl) return undefined;
  return { name, nameZh: name, country: "US", logoUrl };
}

/** Short mark for letter avatar, e.g. CMU / MIT / 多伦多 → UT */
export function institutionMark(name: string): string {
  const known: Record<string, string> = {
    MIT: "MIT",
    CMU: "CMU",
    UCLA: "UCLA",
    NYU: "NYU",
    USC: "USC",
    UIUC: "UIUC",
    UCL: "UCL",
    LSE: "LSE",
    ANU: "ANU",
    UPenn: "UP",
    "UC Berkeley": "UCB",
    "UC San Diego": "UCSD",
    "UC Irvine": "UCI",
    "UC Davis": "UCD",
    "Georgia Tech": "GT",
    "Penn State": "PSU",
    Northeastern: "NEU",
    "Arizona State University": "ASU",
    "UNSW Sydney": "UNSW",
  };
  if (known[name]) return known[name];
  const words = name.replace(/University|of|the|at|College|Institute/gi, " ").trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
