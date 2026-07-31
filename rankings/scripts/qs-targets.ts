/** QS TopUniversities targets for official fetch. */

export type QsTarget = {
  slug: string;
  categorySlug: string;
  categoryName: string;
  categoryNameZh: string;
  year: number;
  isSubject: boolean;
  path: string;
};

export const QS_TARGETS: QsTarget[] = [
  {
    slug: "world",
    categorySlug: "world",
    categoryName: "World University Rankings",
    categoryNameZh: "世界大学排名",
    year: 2027,
    isSubject: false,
    path: "/world-university-rankings",
  },
  {
    slug: "computer-science-information-systems",
    categorySlug: "computer-science",
    categoryName: "Computer Science and Information Systems",
    categoryNameZh: "计算机科学与信息系统",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/computer-science-information-systems",
  },
  {
    slug: "data-science-artificial-intelligence",
    categorySlug: "data-science",
    categoryName: "Data Science and Artificial Intelligence",
    categoryNameZh: "数据科学与人工智能",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/data-science-artificial-intelligence",
  },
  {
    slug: "business-management-studies",
    categorySlug: "business-management",
    categoryName: "Business and Management Studies",
    categoryNameZh: "商业与管理研究",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/business-management-studies",
  },
  {
    slug: "accounting-finance",
    categorySlug: "accounting-finance",
    categoryName: "Accounting and Finance",
    categoryNameZh: "会计与金融",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/accounting-finance",
  },
  {
    slug: "electrical-electronic-engineering",
    categorySlug: "electrical-electronic",
    categoryName: "Engineering - Electrical and Electronic",
    categoryNameZh: "电气与电子工程",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/electrical-electronic-engineering",
  },
  {
    slug: "mechanical-aeronautical-manufacturing-engineering",
    categorySlug: "mechanical-engineering",
    categoryName: "Engineering - Mechanical",
    categoryNameZh: "机械工程",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/mechanical-aeronautical-manufacturing-engineering",
  },
  {
    slug: "mathematics",
    categorySlug: "mathematics",
    categoryName: "Mathematics",
    categoryNameZh: "数学",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/mathematics",
  },
  {
    slug: "law-legal-studies",
    categorySlug: "law",
    categoryName: "Law and Legal Studies",
    categoryNameZh: "法学",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/law-legal-studies",
  },
  {
    slug: "education-training",
    categorySlug: "education",
    categoryName: "Education and Training",
    categoryNameZh: "教育",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/education-training",
  },
  {
    slug: "economics-econometrics",
    categorySlug: "economics",
    categoryName: "Economics and Econometrics",
    categoryNameZh: "经济学与计量经济学",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/economics-econometrics",
  },
  {
    slug: "art-design",
    categorySlug: "art-design",
    categoryName: "Art and Design",
    categoryNameZh: "艺术与设计",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/art-design",
  },
  {
    slug: "biological-sciences",
    categorySlug: "biological-sciences",
    categoryName: "Biological Sciences",
    categoryNameZh: "生物科学",
    year: 2026,
    isSubject: true,
    path: "/university-subject-rankings/biological-sciences",
  },
];

export const BASE = "https://www.topuniversities.com";
