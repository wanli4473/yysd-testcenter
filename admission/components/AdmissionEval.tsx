"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProbabilityRing } from "@/components/ProbabilityRing";
import { MOCK_EVAL } from "@/lib/mock";
import { ChevronDown, Upload } from "lucide-react";

type EvidenceItem = {
  type: string;
  title: string;
  detail: string;
  weight?: string;
};

type EvalResult = {
  probability: number;
  range?: { low: number; high: number };
  category?: "冲刺" | "匹配" | "保底";
  analysis: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  comparison: string;
  evidence?: EvidenceItem[];
  similar_cases: Array<{
    id: string;
    description: string;
    admissionResult: boolean;
    similarity: number;
    gpa: number;
    year: number;
    peerBand?: boolean;
    source?: string;
    caseProgram?: string;
    caseDegree?: string;
    sameProgram?: boolean;
  }>;
  similar_scope?: "program" | "field" | "school" | "none";
  rejected?: boolean;
  calibrated?: boolean;
  error?: string;
};

const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "1";

export function AdmissionEval({
  schoolId,
  schoolName,
  variant = "default",
  initial,
}: {
  schoolId: string;
  schoolName: string;
  /** tech = blue futuristic skin for wizard */
  variant?: "default" | "tech";
  /** Prefill from advisor background step */
  initial?: {
    gpa?: string;
    toefl?: string;
    ielts?: string;
    gre?: string;
    undergradSchool?: string;
    undergradMajor?: string;
  };
}) {
  const tech = variant === "tech";
  const [gpa, setGpa] = useState(initial?.gpa ?? "3.42");
  const [toefl, setToefl] = useState(initial?.toefl ?? "100");
  const [ielts, setIelts] = useState(initial?.ielts ?? "");
  const [gre, setGre] = useState(initial?.gre ?? "");
  const [undergradSchool, setUndergradSchool] = useState(
    initial?.undergradSchool ?? "THE PENNSYLVANIA STATE UNIVERSITY"
  );
  const [undergradMajor, setUndergradMajor] = useState(
    initial?.undergradMajor ?? "Social Data Analytics"
  );
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setResumeFile(f);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (useMock) {
        await new Promise((r) => setTimeout(r, 600));
        setResult(MOCK_EVAL);
        return;
      }
      const fd = new FormData();
      fd.set("targetSchoolId", schoolId);
      fd.set("gpa", gpa);
      if (toefl) fd.set("toefl", toefl);
      if (ielts) fd.set("ielts", ielts);
      if (gre) fd.set("gre", gre);
      fd.set("undergradSchool", undergradSchool);
      fd.set("undergradMajor", undergradMajor);
      if (resumeFile) fd.set("resume", resumeFile);

      // basePath=/admission — absolute /api/* would hit the static site (HTML 404)
      const res = await fetch("/admission/api/evaluate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "评估失败");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "评估失败");
    } finally {
      setLoading(false);
    }
  }

  const dropCls = tech
    ? `mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-sm text-slate-400 ${
        dragOver ? "border-sky-400 bg-sky-500/10" : "border-sky-500/30"
      }`
    : `mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-sm text-stone-600 ${
        dragOver ? "border-stone-800 bg-stone-50" : "border-stone-300"
      }`;

  return (
    <div className="space-y-8">
      <Panel tech={tech}>
        <PanelHead
          tech={tech}
          title="填写背景并评估"
          desc={`目标：${schoolName}${useMock ? " · Mock" : " · 校准引擎锁定概率"}`}
        />
        <FormBody tech={tech}>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            {tech ? (
              <>
                <TechField label="GPA (4.0)">
                  <input className="tech-input" type="number" step="0.01" min="0" max="4.5" required value={gpa} onChange={(e) => setGpa(e.target.value)} />
                </TechField>
                <TechField label="TOEFL（可选）">
                  <input className="tech-input" type="number" min="0" max="120" value={toefl} onChange={(e) => setToefl(e.target.value)} />
                </TechField>
                <TechField label="IELTS（可选）">
                  <input className="tech-input" type="number" step="0.5" min="0" max="9" value={ielts} onChange={(e) => setIelts(e.target.value)} />
                </TechField>
                <TechField label="GRE（可选）">
                  <input className="tech-input" type="number" min="260" max="340" value={gre} onChange={(e) => setGre(e.target.value)} />
                </TechField>
                <TechField label="本科院校">
                  <input className="tech-input" required value={undergradSchool} onChange={(e) => setUndergradSchool(e.target.value)} />
                </TechField>
                <TechField label="本科专业">
                  <input className="tech-input" required value={undergradMajor} onChange={(e) => setUndergradMajor(e.target.value)} />
                </TechField>
              </>
            ) : (
              <>
                <Field label="GPA (4.0)">
                  <Input type="number" step="0.01" min="0" max="4.5" required value={gpa} onChange={(e) => setGpa(e.target.value)} />
                </Field>
                <Field label="TOEFL（可选）">
                  <Input type="number" min="0" max="120" value={toefl} onChange={(e) => setToefl(e.target.value)} />
                </Field>
                <Field label="IELTS（可选）">
                  <Input type="number" step="0.5" min="0" max="9" value={ielts} onChange={(e) => setIelts(e.target.value)} />
                </Field>
                <Field label="GRE（可选）">
                  <Input type="number" min="260" max="340" value={gre} onChange={(e) => setGre(e.target.value)} />
                </Field>
                <Field label="本科院校">
                  <Input required value={undergradSchool} onChange={(e) => setUndergradSchool(e.target.value)} />
                </Field>
                <Field label="本科专业">
                  <Input required value={undergradMajor} onChange={(e) => setUndergradMajor(e.target.value)} />
                </Field>
              </>
            )}
            <div className="sm:col-span-2">
              {tech ? (
                <label className="text-sm text-slate-400">简历 PDF / Word（解析后不保留原文件）</label>
              ) : (
                <Label>简历 PDF / Word（解析后不保留原文件）</Label>
              )}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={dropCls}
                onClick={() => document.getElementById("resume-input")?.click()}
              >
                <Upload className="h-5 w-5" />
                {resumeFile ? resumeFile.name : "拖拽 PDF / DOC / DOCX，或点击选择"}
                <input
                  id="resume-input"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              {tech ? (
                <button type="submit" disabled={loading} className="tech-btn w-full sm:w-auto">
                  {loading ? "评估中…" : "开始评估"}
                </button>
              ) : (
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? "评估中…" : "开始评估"}
                </Button>
              )}
            </div>
          </form>
          {error && (
            <p className={`mt-4 text-sm ${tech ? "text-rose-300" : "text-red-600"}`}>
              {error}
            </p>
          )}
        </FormBody>
      </Panel>

      {result && (
        <div className="space-y-6">
          <Panel tech={tech}>
            <PanelHead
              tech={tech}
              title="录取成功率估算"
              desc={`顾问口径估算 · 非院校官方录取率${result.calibrated ? " · 已校准" : ""}`}
            />
            <div className={`flex justify-center py-6 ${tech ? "px-5" : ""}`}>
              <ProbabilityRing
                probability={result.probability}
                category={result.category}
                range={result.range}
                variant={variant}
              />
            </div>
          </Panel>

          {result.evidence && result.evidence.length > 0 && (
            <EvidencePanel items={result.evidence} tech={tech} />
          )}

          <div>
            <h3 className={`mb-3 text-lg font-semibold ${tech ? "text-slate-50" : ""}`}>
              相似案例
            </h3>
            <p className={`mb-3 text-xs ${tech ? "text-slate-500" : "text-stone-500"}`}>
              仅展示本校 GradCafe 真实自报；当前项目不足时回退同校相近项目。不展示合成样本与其他大学案例。
              {result.similar_scope === "field" || result.similar_scope === "school"
                ? "（下列含同校其他相关项目）"
                : ""}
            </p>
            <div className="grid gap-3">
              {result.similar_cases.length === 0 && (
                <p className={`text-sm ${tech ? "text-slate-500" : "text-stone-500"}`}>
                  该校暂无足够 GradCafe 公开真实案例，故不展示相似案例（避免合成/跨校样本）。
                </p>
              )}
              {result.similar_cases.map((c) => {
                const real = c.source === "gradcafe" || c.source === "manual";
                return (
                  <div
                    key={c.id}
                    className={
                      tech
                        ? "tech-card-static flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
                        : undefined
                    }
                  >
                    {tech ? (
                      <>
                        <div className="space-y-1 text-sm">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[11px] font-medium text-cyan-200">
                              真实案例 · GradCafe
                            </span>
                            {c.sameProgram === false && (
                              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-200">
                                同校相近项目
                                {c.caseProgram ? ` · ${c.caseProgram}` : ""}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-200">{c.description}</p>
                          <p className="text-slate-500">
                            GPA {c.gpa} · {c.year} · 相似度 {Math.round(c.similarity * 100)}%
                            {c.peerBand === false ? " · 跨档参考" : ""}
                            {c.peerBand === true ? " · 同档" : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded px-2 py-1 text-xs font-medium text-white ${
                            c.admissionResult ? "bg-cyan-700" : "bg-slate-600"
                          }`}
                        >
                          {c.admissionResult ? "录取" : "拒绝"}
                        </span>
                      </>
                    ) : (
                      <Card>
                        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1 text-sm">
                            <div className="flex flex-wrap gap-1.5">
                              {real ? (
                                <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[11px] font-medium text-teal-800">
                                  真实案例 · GradCafe
                                </span>
                              ) : null}
                              {c.sameProgram === false && (
                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                                  同校相近项目
                                  {c.caseProgram ? ` · ${c.caseProgram}` : ""}
                                </span>
                              )}
                            </div>
                            <p className="text-stone-800">{c.description}</p>
                            <p className="text-stone-500">
                              GPA {c.gpa} · {c.year} · 相似度{" "}
                              {Math.round(c.similarity * 100)}%
                              {c.peerBand === false ? " · 跨档参考" : ""}
                              {c.peerBand === true ? " · 同档" : ""}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded px-2 py-1 text-xs font-medium text-white ${
                              c.admissionResult ? "bg-teal-700" : "bg-stone-500"
                            }`}
                          >
                            {c.admissionResult ? "录取" : "拒绝"}
                          </span>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <AnalysisPanel result={result} tech={tech} />

          {tech ? (
            <Link href="/" className="tech-btn-ghost inline-flex">
              重新选择学校
            </Link>
          ) : (
            <Button asChild variant="outline">
              <Link href="/schools">对比其他学校</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Panel({
  tech,
  children,
}: {
  tech: boolean;
  children: React.ReactNode;
}) {
  if (tech) return <div className="tech-card-static overflow-hidden">{children}</div>;
  return <Card>{children}</Card>;
}

function PanelHead({
  tech,
  title,
  desc,
}: {
  tech: boolean;
  title: string;
  desc: string;
}) {
  if (tech) {
    return (
      <div className="space-y-1 p-5 pb-3">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
    );
  }
  return (
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{desc}</CardDescription>
    </CardHeader>
  );
}

function TechField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function FormBody({ tech, children }: { tech: boolean; children: React.ReactNode }) {
  if (tech) return <div className="p-5 pt-0">{children}</div>;
  return <CardContent>{children}</CardContent>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EvidencePanel({ items, tech }: { items: EvidenceItem[]; tech?: boolean }) {
  const [open, setOpen] = useState(true);
  const body = (
    <div className="space-y-3 p-5 pt-0 text-sm">
      {items.map((e, i) => (
        <div
          key={i}
          className={`border-b pb-3 last:border-0 ${tech ? "border-sky-500/15" : "border-stone-100"}`}
        >
          <p className={`font-medium ${tech ? "text-slate-100" : "text-stone-800"}`}>
            {e.title}
            {e.weight ? (
              <span className={`ml-2 text-xs font-normal ${tech ? "text-slate-500" : "text-stone-500"}`}>
                [{e.weight}]
              </span>
            ) : null}
          </p>
          <p className={`mt-1 whitespace-pre-wrap ${tech ? "text-slate-400" : "text-stone-600"}`}>
            {e.detail}
          </p>
        </div>
      ))}
    </div>
  );
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Panel tech={!!tech}>
        <div className={`flex items-center justify-between ${tech ? "p-5 pb-2" : ""}`}>
          {tech ? (
            <div>
              <h3 className="text-lg font-semibold text-slate-50">依据与来源</h3>
              <p className="text-sm text-slate-400">可追溯的评估依据</p>
            </div>
          ) : (
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
              <div>
                <CardTitle>依据与来源</CardTitle>
                <CardDescription>可追溯的评估依据（点击展开）</CardDescription>
              </div>
            </CardHeader>
          )}
          <CollapsibleTrigger asChild>
            <button type="button" className={tech ? "tech-btn-ghost px-2 py-1" : undefined}>
              {tech ? (
                <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
              ) : (
                <Button variant="ghost" size="sm">
                  <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                </Button>
              )}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>{tech ? body : <CardContent className="space-y-3 text-sm">{body}</CardContent>}</CollapsibleContent>
      </Panel>
    </Collapsible>
  );
}

function AnalysisPanel({ result, tech }: { result: EvalResult; tech?: boolean }) {
  const [open, setOpen] = useState(true);
  const a = result.analysis;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Panel tech={!!tech}>
        <div className={`flex items-center justify-between ${tech ? "p-5 pb-2" : ""}`}>
          {tech ? (
            <div>
              <h3 className="text-lg font-semibold text-slate-50">顾问分析</h3>
              <p className="text-sm text-slate-400">优势 / 劣势 / 建议</p>
            </div>
          ) : (
            <CardHeader className="p-0">
              <CardTitle>顾问分析</CardTitle>
              <CardDescription>优势 / 劣势 / 建议（不改动概率）</CardDescription>
            </CardHeader>
          )}
          <CollapsibleTrigger asChild>
            <button type="button" className={tech ? "rounded-lg p-2 text-slate-400 hover:bg-white/5" : undefined}>
              <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className={`space-y-4 text-sm ${tech ? "p-5 pt-0" : "p-6 pt-0"}`}>
            <Section title="优势" items={a.strengths} tech={tech} />
            <Section title="劣势" items={a.weaknesses} tech={tech} />
            <Section title="提升建议" items={a.suggestions} tech={tech} />
            {result.comparison && (
              <div>
                <p className={`mb-1 font-medium ${tech ? "text-slate-100" : "text-stone-800"}`}>
                  与相似案例对比
                </p>
                <p className={tech ? "text-slate-400" : "text-stone-600"}>{result.comparison}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Panel>
    </Collapsible>
  );
}

function Section({
  title,
  items,
  tech,
}: {
  title: string;
  items: string[];
  tech?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <p className={`mb-1 font-medium ${tech ? "text-slate-100" : "text-stone-800"}`}>{title}</p>
      <ul className={`list-disc space-y-1 pl-5 ${tech ? "text-slate-400" : "text-stone-600"}`}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
