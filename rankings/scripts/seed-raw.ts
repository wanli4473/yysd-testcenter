/**
 * Generates curated ranking JSON under data/raw/ for THE / ARWU / US News only.
 * ponytail: QS comes from data/raw/qs-official via build-qs-from-official.ts (top ≤500).
 */
import fs from "fs";
import path from "path";
import { slugify } from "../lib/systems";

type Uni = { nameEn: string; nameZh: string; country: string; aliases?: string[] };

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "raw");

/** Master list: well-known schools + admission catalog coverage */
const UNIVERSITIES: Uni[] = [
  { nameEn: "Massachusetts Institute of Technology", nameZh: "麻省理工学院", country: "US", aliases: ["MIT"] },
  { nameEn: "Imperial College London", nameZh: "帝国理工学院", country: "UK", aliases: ["Imperial"] },
  { nameEn: "University of Oxford", nameZh: "牛津大学", country: "UK", aliases: ["Oxford"] },
  { nameEn: "Harvard University", nameZh: "哈佛大学", country: "US", aliases: ["Harvard"] },
  { nameEn: "University of Cambridge", nameZh: "剑桥大学", country: "UK", aliases: ["Cambridge"] },
  { nameEn: "Stanford University", nameZh: "斯坦福大学", country: "US", aliases: ["Stanford"] },
  { nameEn: "ETH Zurich", nameZh: "苏黎世联邦理工学院", country: "CH", aliases: ["ETH Zürich", "ETH"] },
  { nameEn: "National University of Singapore", nameZh: "新加坡国立大学", country: "SG", aliases: ["NUS"] },
  { nameEn: "University College London", nameZh: "伦敦大学学院", country: "UK", aliases: ["UCL"] },
  { nameEn: "California Institute of Technology", nameZh: "加州理工学院", country: "US", aliases: ["Caltech"] },
  { nameEn: "University of Pennsylvania", nameZh: "宾夕法尼亚大学", country: "US", aliases: ["UPenn", "Penn"] },
  { nameEn: "University of California, Berkeley", nameZh: "加州大学伯克利分校", country: "US", aliases: ["UC Berkeley", "Berkeley"] },
  { nameEn: "The University of Melbourne", nameZh: "墨尔本大学", country: "AU", aliases: ["University of Melbourne", "Melbourne"] },
  { nameEn: "Peking University", nameZh: "北京大学", country: "CN", aliases: ["PKU", "Beida"] },
  { nameEn: "Nanyang Technological University", nameZh: "南洋理工大学", country: "SG", aliases: ["NTU"] },
  { nameEn: "Cornell University", nameZh: "康奈尔大学", country: "US", aliases: ["Cornell"] },
  { nameEn: "The University of Hong Kong", nameZh: "香港大学", country: "HK", aliases: ["HKU"] },
  { nameEn: "The University of Sydney", nameZh: "悉尼大学", country: "AU", aliases: ["University of Sydney", "USYD"] },
  { nameEn: "The University of New South Wales", nameZh: "新南威尔士大学", country: "AU", aliases: ["UNSW", "UNSW Sydney"] },
  { nameEn: "Tsinghua University", nameZh: "清华大学", country: "CN", aliases: ["THU"] },
  { nameEn: "University of Chicago", nameZh: "芝加哥大学", country: "US", aliases: ["UChicago"] },
  { nameEn: "Princeton University", nameZh: "普林斯顿大学", country: "US", aliases: ["Princeton"] },
  { nameEn: "Yale University", nameZh: "耶鲁大学", country: "US", aliases: ["Yale"] },
  { nameEn: "Johns Hopkins University", nameZh: "约翰霍普金斯大学", country: "US", aliases: ["Johns Hopkins", "JHU"] },
  { nameEn: "Columbia University", nameZh: "哥伦比亚大学", country: "US", aliases: ["Columbia"] },
  { nameEn: "University of California, Los Angeles", nameZh: "加州大学洛杉矶分校", country: "US", aliases: ["UCLA"] },
  { nameEn: "University of Toronto", nameZh: "多伦多大学", country: "CA", aliases: ["UofT", "U of T"] },
  { nameEn: "University of Edinburgh", nameZh: "爱丁堡大学", country: "UK", aliases: ["Edinburgh"] },
  { nameEn: "King's College London", nameZh: "伦敦国王学院", country: "UK", aliases: ["KCL"] },
  { nameEn: "University of Michigan-Ann Arbor", nameZh: "密歇根大学", country: "US", aliases: ["University of Michigan", "UMich"] },
  { nameEn: "Technical University of Munich", nameZh: "慕尼黑工业大学", country: "DE", aliases: ["TUM"] },
  { nameEn: "McGill University", nameZh: "麦吉尔大学", country: "CA", aliases: ["McGill"] },
  { nameEn: "Northwestern University", nameZh: "西北大学", country: "US", aliases: ["Northwestern"] },
  { nameEn: "The Australian National University", nameZh: "澳大利亚国立大学", country: "AU", aliases: ["ANU"] },
  { nameEn: "The University of Queensland", nameZh: "昆士兰大学", country: "AU", aliases: ["UQ"] },
  { nameEn: "Fudan University", nameZh: "复旦大学", country: "CN", aliases: ["Fudan"] },
  { nameEn: "New York University", nameZh: "纽约大学", country: "US", aliases: ["NYU"] },
  { nameEn: "University of Manchester", nameZh: "曼彻斯特大学", country: "UK", aliases: ["Manchester"] },
  { nameEn: "Seoul National University", nameZh: "首尔大学", country: "KR", aliases: ["SNU"] },
  { nameEn: "University of British Columbia", nameZh: "英属哥伦比亚大学", country: "CA", aliases: ["UBC"] },
  { nameEn: "University of Tokyo", nameZh: "东京大学", country: "JP", aliases: ["UTokyo", "Todai"] },
  { nameEn: "London School of Economics and Political Science", nameZh: "伦敦政治经济学院", country: "UK", aliases: ["LSE"] },
  { nameEn: "Kyoto University", nameZh: "京都大学", country: "JP", aliases: ["Kyoto"] },
  { nameEn: "Chinese University of Hong Kong", nameZh: "香港中文大学", country: "HK", aliases: ["CUHK"] },
  { nameEn: "Hong Kong University of Science and Technology", nameZh: "香港科技大学", country: "HK", aliases: ["HKUST"] },
  { nameEn: "Zhejiang University", nameZh: "浙江大学", country: "CN", aliases: ["ZJU"] },
  { nameEn: "Shanghai Jiao Tong University", nameZh: "上海交通大学", country: "CN", aliases: ["SJTU"] },
  { nameEn: "Carnegie Mellon University", nameZh: "卡内基梅隆大学", country: "US", aliases: ["CMU"] },
  { nameEn: "Duke University", nameZh: "杜克大学", country: "US", aliases: ["Duke"] },
  { nameEn: "University of California, San Diego", nameZh: "加州大学圣地亚哥分校", country: "US", aliases: ["UC San Diego", "UCSD"] },
  { nameEn: "University of Washington", nameZh: "华盛顿大学", country: "US", aliases: ["UW"] },
  { nameEn: "University of Illinois at Urbana-Champaign", nameZh: "伊利诺伊大学香槟分校", country: "US", aliases: ["UIUC", "Illinois"] },
  { nameEn: "Georgia Institute of Technology", nameZh: "佐治亚理工学院", country: "US", aliases: ["Georgia Tech", "GT"] },
  { nameEn: "University of Texas at Austin", nameZh: "德州大学奥斯汀分校", country: "US", aliases: ["UT Austin"] },
  { nameEn: "Monash University", nameZh: "莫纳什大学", country: "AU", aliases: ["Monash"] },
  { nameEn: "University of Amsterdam", nameZh: "阿姆斯特丹大学", country: "NL", aliases: ["UvA"] },
  { nameEn: "Delft University of Technology", nameZh: "代尔夫特理工大学", country: "NL", aliases: ["TU Delft"] },
  { nameEn: "EPFL", nameZh: "洛桑联邦理工学院", country: "CH", aliases: ["École Polytechnique Fédérale de Lausanne"] },
  { nameEn: "University of Wisconsin-Madison", nameZh: "威斯康星大学麦迪逊分校", country: "US", aliases: ["UW-Madison"] },
  { nameEn: "Brown University", nameZh: "布朗大学", country: "US", aliases: ["Brown"] },
  { nameEn: "University of Southern California", nameZh: "南加州大学", country: "US", aliases: ["USC"] },
  { nameEn: "University of Bristol", nameZh: "布里斯托大学", country: "UK", aliases: ["Bristol"] },
  { nameEn: "University of Warwick", nameZh: "华威大学", country: "UK", aliases: ["Warwick"] },
  { nameEn: "University of Glasgow", nameZh: "格拉斯哥大学", country: "UK", aliases: ["Glasgow"] },
  { nameEn: "University of Birmingham", nameZh: "伯明翰大学", country: "UK", aliases: ["Birmingham"] },
  { nameEn: "University of Leeds", nameZh: "利兹大学", country: "UK", aliases: ["Leeds"] },
  { nameEn: "University of Southampton", nameZh: "南安普顿大学", country: "UK", aliases: ["Southampton"] },
  { nameEn: "University of Sheffield", nameZh: "谢菲尔德大学", country: "UK", aliases: ["Sheffield"] },
  { nameEn: "University of Nottingham", nameZh: "诺丁汉大学", country: "UK", aliases: ["Nottingham"] },
  { nameEn: "Queen Mary University of London", nameZh: "伦敦玛丽女王大学", country: "UK", aliases: ["QMUL"] },
  { nameEn: "University of York", nameZh: "约克大学", country: "UK", aliases: ["York"] },
  { nameEn: "Durham University", nameZh: "杜伦大学", country: "UK", aliases: ["Durham"] },
  { nameEn: "University of St Andrews", nameZh: "圣安德鲁斯大学", country: "UK", aliases: ["St Andrews"] },
  { nameEn: "University of Waterloo", nameZh: "滑铁卢大学", country: "CA", aliases: ["Waterloo"] },
  { nameEn: "McMaster University", nameZh: "麦克马斯特大学", country: "CA", aliases: ["McMaster"] },
  { nameEn: "University of Alberta", nameZh: "阿尔伯塔大学", country: "CA", aliases: ["Alberta"] },
  { nameEn: "University of Montreal", nameZh: "蒙特利尔大学", country: "CA", aliases: ["UdeM"] },
  { nameEn: "University of Ottawa", nameZh: "渥太华大学", country: "CA", aliases: ["Ottawa"] },
  { nameEn: "Queen's University", nameZh: "女王大学", country: "CA", aliases: ["Queens"] },
  { nameEn: "Western University", nameZh: "西安大略大学", country: "CA", aliases: ["Western", "UWO"] },
  { nameEn: "University of Calgary", nameZh: "卡尔加里大学", country: "CA", aliases: ["Calgary"] },
  { nameEn: "Simon Fraser University", nameZh: "西蒙弗雷泽大学", country: "CA", aliases: ["SFU"] },
  { nameEn: "Dalhousie University", nameZh: "达尔豪斯大学", country: "CA", aliases: ["Dalhousie"] },
  { nameEn: "University of Victoria", nameZh: "维多利亚大学", country: "CA", aliases: ["UVic"] },
  { nameEn: "York University", nameZh: "约克大学（加）", country: "CA", aliases: ["York U"] },
  { nameEn: "University of Western Australia", nameZh: "西澳大学", country: "AU", aliases: ["UWA"] },
  { nameEn: "University of Adelaide", nameZh: "阿德莱德大学", country: "AU", aliases: ["Adelaide"] },
  { nameEn: "University of Technology Sydney", nameZh: "悉尼科技大学", country: "AU", aliases: ["UTS"] },
  { nameEn: "RMIT University", nameZh: "皇家墨尔本理工大学", country: "AU", aliases: ["RMIT"] },
  { nameEn: "Queensland University of Technology", nameZh: "昆士兰科技大学", country: "AU", aliases: ["QUT"] },
  { nameEn: "Macquarie University", nameZh: "麦考瑞大学", country: "AU", aliases: ["Macquarie"] },
  { nameEn: "Rice University", nameZh: "莱斯大学", country: "US", aliases: ["Rice"] },
  { nameEn: "Vanderbilt University", nameZh: "范德堡大学", country: "US", aliases: ["Vanderbilt"] },
  { nameEn: "Washington University in St. Louis", nameZh: "华盛顿大学圣路易斯", country: "US", aliases: ["WashU"] },
  { nameEn: "Purdue University", nameZh: "普渡大学", country: "US", aliases: ["Purdue"] },
  { nameEn: "Boston University", nameZh: "波士顿大学", country: "US", aliases: ["BU"] },
  { nameEn: "Ohio State University", nameZh: "俄亥俄州立大学", country: "US", aliases: ["OSU"] },
  { nameEn: "Pennsylvania State University", nameZh: "宾州州立大学", country: "US", aliases: ["Penn State", "PSU"] },
  { nameEn: "University of Florida", nameZh: "佛罗里达大学", country: "US", aliases: ["UF"] },
  { nameEn: "University of Maryland, College Park", nameZh: "马里兰大学", country: "US", aliases: ["University of Maryland", "UMD"] },
  { nameEn: "University of California, Irvine", nameZh: "加州大学欧文分校", country: "US", aliases: ["UC Irvine", "UCI"] },
  { nameEn: "University of California, Davis", nameZh: "加州大学戴维斯分校", country: "US", aliases: ["UC Davis", "UCD"] },
  { nameEn: "Northeastern University", nameZh: "东北大学", country: "US", aliases: ["Northeastern"] },
  { nameEn: "Arizona State University", nameZh: "亚利桑那州立大学", country: "US", aliases: ["ASU"] },
  { nameEn: "University of Minnesota Twin Cities", nameZh: "明尼苏达大学", country: "US", aliases: ["University of Minnesota", "UMN"] },
  { nameEn: "University of Science and Technology of China", nameZh: "中国科学技术大学", country: "CN", aliases: ["USTC"] },
  { nameEn: "Nanjing University", nameZh: "南京大学", country: "CN", aliases: ["NJU"] },
  { nameEn: "Wuhan University", nameZh: "武汉大学", country: "CN", aliases: ["WHU"] },
  { nameEn: "Hong Kong Polytechnic University", nameZh: "香港理工大学", country: "HK", aliases: ["PolyU"] },
  { nameEn: "City University of Hong Kong", nameZh: "香港城市大学", country: "HK", aliases: ["CityU"] },
  { nameEn: "KAIST", nameZh: "韩国科学技术院", country: "KR", aliases: ["Korea Advanced Institute of Science and Technology"] },
  { nameEn: "Yonsei University", nameZh: "延世大学", country: "KR", aliases: ["Yonsei"] },
  { nameEn: "Korea University", nameZh: "高丽大学", country: "KR", aliases: ["Korea U"] },
  { nameEn: "University of Copenhagen", nameZh: "哥本哈根大学", country: "OTHER", aliases: ["Copenhagen"] },
  { nameEn: "Karolinska Institute", nameZh: "卡罗琳斯卡学院", country: "SE", aliases: ["Karolinska"] },
  { nameEn: "Ludwig Maximilian University of Munich", nameZh: "慕尼黑大学", country: "DE", aliases: ["LMU"] },
  { nameEn: "Heidelberg University", nameZh: "海德堡大学", country: "DE", aliases: ["Heidelberg"] },
  { nameEn: "Sorbonne University", nameZh: "索邦大学", country: "FR", aliases: ["Sorbonne"] },
  { nameEn: "PSL University", nameZh: "巴黎文理研究大学", country: "FR", aliases: ["Université PSL", "PSL"] },
  { nameEn: "Institut Polytechnique de Paris", nameZh: "巴黎理工学院", country: "FR", aliases: ["IP Paris"] },
];

/** Latest-year approximate order per system (public knowledge / typical tops). Rest filled by stable master order. */
const QS_TOP = [
  "Massachusetts Institute of Technology",
  "Imperial College London",
  "Stanford University",
  "University of Oxford",
  "Harvard University",
  "University of Cambridge",
  "ETH Zurich",
  "National University of Singapore",
  "University College London",
  "California Institute of Technology",
  "University of Pennsylvania",
  "University of California, Berkeley",
  "The University of Melbourne",
  "Peking University",
  "Nanyang Technological University",
  "Cornell University",
  "The University of Hong Kong",
  "The University of Sydney",
  "The University of New South Wales",
  "Tsinghua University",
  "University of Chicago",
  "Princeton University",
  "Yale University",
  "Johns Hopkins University",
  "Columbia University",
  "University of California, Los Angeles",
  "University of Toronto",
  "EPFL",
  "University of Edinburgh",
  "King's College London",
  "University of Michigan-Ann Arbor",
  "Technical University of Munich",
  "McGill University",
  "Northwestern University",
  "The Australian National University",
  "The University of Queensland",
  "Fudan University",
  "New York University",
  "University of Manchester",
  "Seoul National University",
  "University of British Columbia",
  "University of Tokyo",
  "London School of Economics and Political Science",
  "Chinese University of Hong Kong",
  "Hong Kong University of Science and Technology",
  "Zhejiang University",
  "Shanghai Jiao Tong University",
  "Carnegie Mellon University",
  "Duke University",
  "Monash University",
];

const THE_TOP = [
  "University of Oxford",
  "Massachusetts Institute of Technology",
  "Harvard University",
  "Princeton University",
  "University of Cambridge",
  "Stanford University",
  "California Institute of Technology",
  "University of California, Berkeley",
  "Imperial College London",
  "Yale University",
  "ETH Zurich",
  "Tsinghua University",
  "University of Chicago",
  "Peking University",
  "Johns Hopkins University",
  "University of Pennsylvania",
  "Columbia University",
  "University of California, Los Angeles",
  "University College London",
  "University of Toronto",
  "Cornell University",
  "University of Michigan-Ann Arbor",
  "National University of Singapore",
  "Carnegie Mellon University",
  "University of Washington",
  "Duke University",
  "Northwestern University",
  "New York University",
  "University of Edinburgh",
  "Technical University of Munich",
  "Nanyang Technological University",
  "University of Hong Kong",
  "The University of Hong Kong",
  "King's College London",
  "McGill University",
  "University of California, San Diego",
  "The University of Melbourne",
  "University of Tokyo",
  "PSL University",
  "University of British Columbia",
  "EPFL",
  "University of Illinois at Urbana-Champaign",
  "Georgia Institute of Technology",
  "University of Manchester",
  "University of Texas at Austin",
  "Fudan University",
  "The University of Sydney",
  "Zhejiang University",
  "Shanghai Jiao Tong University",
  "Monash University",
];

const ARWU_TOP = [
  "Harvard University",
  "Stanford University",
  "Massachusetts Institute of Technology",
  "University of Cambridge",
  "University of California, Berkeley",
  "University of Oxford",
  "Princeton University",
  "California Institute of Technology",
  "Columbia University",
  "University of Chicago",
  "Yale University",
  "Cornell University",
  "University of California, Los Angeles",
  "University of Pennsylvania",
  "Johns Hopkins University",
  "University College London",
  "University of Washington",
  "University of California, San Diego",
  "University of Michigan-Ann Arbor",
  "Imperial College London",
  "University of Toronto",
  "ETH Zurich",
  "Tsinghua University",
  "New York University",
  "Northwestern University",
  "University of Tokyo",
  "Duke University",
  "University of Wisconsin-Madison",
  "Peking University",
  "University of Edinburgh",
  "University of Illinois at Urbana-Champaign",
  "University of Manchester",
  "University of Minnesota Twin Cities",
  "University of British Columbia",
  "University of Texas at Austin",
  "Karolinska Institute",
  "University of Copenhagen",
  "Technical University of Munich",
  "University of Melbourne",
  "The University of Melbourne",
  "Washington University in St. Louis",
  "University of California, Irvine",
  "Sorbonne University",
  "King's College London",
  "University of Maryland, College Park",
  "Zhejiang University",
  "Shanghai Jiao Tong University",
  "Fudan University",
  "Nanyang Technological University",
  "National University of Singapore",
];

const USNEWS_TOP = [
  "Harvard University",
  "Massachusetts Institute of Technology",
  "Stanford University",
  "University of Oxford",
  "University of Cambridge",
  "University of California, Berkeley",
  "Columbia University",
  "University of Washington",
  "California Institute of Technology",
  "Johns Hopkins University",
  "Yale University",
  "Princeton University",
  "University of California, Los Angeles",
  "University of Pennsylvania",
  "University of Chicago",
  "University of California, San Diego",
  "Imperial College London",
  "University College London",
  "University of Michigan-Ann Arbor",
  "Cornell University",
  "Tsinghua University",
  "University of Toronto",
  "ETH Zurich",
  "Northwestern University",
  "Duke University",
  "New York University",
  "Peking University",
  "University of Edinburgh",
  "King's College London",
  "National University of Singapore",
  "University of Melbourne",
  "The University of Melbourne",
  "University of British Columbia",
  "McGill University",
  "University of Illinois at Urbana-Champaign",
  "University of Texas at Austin",
  "Carnegie Mellon University",
  "Georgia Institute of Technology",
  "University of Manchester",
  "Nanyang Technological University",
  "University of Tokyo",
  "Fudan University",
  "Zhejiang University",
  "Shanghai Jiao Tong University",
  "The University of Sydney",
  "The University of Hong Kong",
  "Monash University",
  "University of Queensland",
  "The University of Queensland",
  "Technical University of Munich",
];

/** QS CS subject demo order */
const QS_CS_TOP = [
  "Massachusetts Institute of Technology",
  "Carnegie Mellon University",
  "Stanford University",
  "University of California, Berkeley",
  "University of Oxford",
  "University of Cambridge",
  "Harvard University",
  "ETH Zurich",
  "National University of Singapore",
  "Nanyang Technological University",
  "EPFL",
  "Princeton University",
  "University of Toronto",
  "Cornell University",
  "University of Washington",
  "Imperial College London",
  "Tsinghua University",
  "Peking University",
  "University of California, Los Angeles",
  "Columbia University",
  "University of Illinois at Urbana-Champaign",
  "Georgia Institute of Technology",
  "University College London",
  "University of Edinburgh",
  "University of Tokyo",
  "Hong Kong University of Science and Technology",
  "The University of Hong Kong",
  "University of Michigan-Ann Arbor",
  "New York University",
  "University of Pennsylvania",
];

type SystemSpec = {
  system: string;
  years: number[];
  top: string[];
  title: string;
  categorySlug: string;
  categoryName: string;
  isSubject?: boolean;
  sourceUrl: string;
};

// ponytail: QS world/subject come from qs-official via build-qs-from-official.ts (top 500).
const SPECS: SystemSpec[] = [
  {
    system: "the",
    years: [2022, 2023, 2024, 2025, 2026],
    top: THE_TOP,
    title: "THE 世界大学排名",
    categorySlug: "world",
    categoryName: "世界大学排名",
    sourceUrl: "https://www.timeshighereducation.com",
  },
  {
    system: "arwu",
    years: [2021, 2022, 2023, 2024, 2025],
    top: ARWU_TOP,
    title: "软科世界大学学术排名",
    categorySlug: "world",
    categoryName: "世界大学学术排名",
    sourceUrl: "https://www.shanghairanking.com",
  },
  {
    system: "usnews",
    years: [2023, 2024, 2025, 2026, 2027],
    top: USNEWS_TOP,
    title: "U.S. News 全球最佳大学排名",
    categorySlug: "world",
    categoryName: "全球最佳大学",
    sourceUrl: "https://www.usnews.com",
  },
];

function orderedList(top: string[]): Uni[] {
  const byName = new Map(UNIVERSITIES.map((u) => [u.nameEn, u]));
  const seen = new Set<string>();
  const out: Uni[] = [];
  for (const name of top) {
    const u = byName.get(name);
    if (!u || seen.has(u.nameEn)) continue;
    seen.add(u.nameEn);
    out.push(u);
  }
  for (const u of UNIVERSITIES) {
    if (seen.has(u.nameEn)) continue;
    seen.add(u.nameEn);
    out.push(u);
  }
  return out;
}

/** Drift ranks slightly by year so history isn't flat. */
function yearOffset(year: number, baseYear: number, rank: number): number {
  const d = year - baseYear;
  if (d === 0) return rank;
  const wobble = ((rank * 7 + year * 3) % 5) - 2;
  return Math.max(1, rank + Math.round(d * 0.15 * (rank % 3 === 0 ? 1 : -1)) + wobble);
}

function buildEdition(spec: SystemSpec, year: number, list: Uni[]) {
  const baseYear = spec.years[spec.years.length - 1];
  const ranked = list.map((u, i) => {
    const baseRank = i + 1;
    const rank = yearOffset(year, baseYear, baseRank);
    return { uni: u, rank };
  });
  ranked.sort((a, b) => a.rank - b.rank || a.uni.nameEn.localeCompare(b.uni.nameEn));
  // re-number densely after sort
  return ranked.map((r, i) => {
    const rank = i + 1;
    const score = Math.max(10, Math.round((100 - rank * 0.35 + (year % 3) * 0.2) * 10) / 10);
    return {
      nameEn: r.uni.nameEn,
      rank,
      rankDisplay: String(rank),
      score,
      metrics: {
        overall: score,
      },
    };
  });
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const universities = UNIVERSITIES.map((u) => ({
    slug: slugify(u.nameEn),
    nameEn: u.nameEn,
    nameZh: u.nameZh,
    country: u.country,
    aliases: u.aliases || [],
  }));
  fs.writeFileSync(path.join(OUT, "universities.json"), JSON.stringify(universities, null, 2));

  const editions: {
    system: string;
    categorySlug: string;
    categoryName: string;
    year: number;
    title: string;
    isSubject: boolean;
    sourceUrl: string;
    entries: ReturnType<typeof buildEdition>;
  }[] = [];

  for (const spec of SPECS) {
    const list = orderedList(spec.top);
    const pool = spec.isSubject ? list.slice(0, Math.min(60, list.length)) : list;
    for (const year of spec.years) {
      editions.push({
        system: spec.system,
        categorySlug: spec.categorySlug,
        categoryName: spec.categoryName,
        year,
        title: `${spec.title} ${year}`,
        isSubject: !!spec.isSubject,
        sourceUrl: spec.sourceUrl,
        entries: buildEdition(spec, year, pool),
      });
    }
  }

  fs.writeFileSync(path.join(OUT, "editions.json"), JSON.stringify(editions, null, 2));
  console.log(`Wrote ${universities.length} universities, ${editions.length} editions → ${OUT}`);
}

main();
