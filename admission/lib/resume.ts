import { parseJsonFromLLM, qwenChat } from "./qwen";

export type ResumeFeatures = {
  research: string[];
  internships: string[];
  papers: string[];
  contests: string[];
  tags: string[];
};

const SYSTEM = `你是留学申请材料解析助手。从简历文本提取结构化特征，只返回 JSON，不要姓名/电话/邮箱等隐私字段。
格式：{"research":[],"internships":[],"papers":[],"contests":[],"tags":[]}
tags 用短英文标签，如 research, internship, publication, competition, leadership。`;

export async function parseResumeFeatures(
  resumeText: string
): Promise<ResumeFeatures> {
  const text = resumeText.slice(0, 12000);
  const raw = await qwenChat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: text },
    ],
    { temperature: 0.1, maxTokens: 800 }
  );
  const parsed = parseJsonFromLLM<Partial<ResumeFeatures>>(raw);
  return {
    research: arr(parsed.research),
    internships: arr(parsed.internships),
    papers: arr(parsed.papers),
    contests: arr(parsed.contests),
    tags: arr(parsed.tags).slice(0, 20),
  };
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).slice(0, 15) : [];
}
