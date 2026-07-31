"use client";

import { useMemo, useState } from "react";
import { Search, Send, X, ExternalLink, ArrowLeft } from "lucide-react";
import type { InstitutionCard } from "@/lib/aggregate-schools";
import { AdmissionEval } from "@/components/AdmissionEval";
import { COUNTRIES, COUNTRY_LABELS, type Country } from "@/lib/catalog-labels";
import type { AdvisorBackground } from "@/lib/advisor-bg";

type Step = 1 | 2 | 3;

type ChatMsg = { role: "user" | "assistant"; text: string };

type ProgramHit = {
  id: string;
  program: string;
  programZh: string | null;
  degree: string;
  fieldLabel: string;
  blurb: string | null;
  duration: string | null;
  isStem: boolean | null;
  why: string;
  fitNotes?: string[];
};

type ProgramDetail = {
  id: string;
  name: string;
  schoolNameZh: string;
  program: string;
  programZh: string | null;
  degree: string;
  fieldLabel: string;
  duration: string | null;
  officialUrl: string | null;
  website: string | null;
  minGpa: number;
  avgGpa: number;
  minToefl: number | null;
  minIelts: number | null;
  applicationDeadline: string | null;
  blurb: string | null;
  summaryOfficial: string | null;
  tuitionNote: string | null;
  isStem: boolean | null;
  greRequired: boolean | null;
  admissionRequirements: string;
  verified: boolean;
};

type BgDraft = {
  gpa: string;
  toefl: string;
  ielts: string;
  gre: string;
  undergradSchool: string;
  undergradMajor: string;
};

const emptyBg: BgDraft = {
  gpa: "",
  toefl: "",
  ielts: "",
  gre: "",
  undergradSchool: "",
  undergradMajor: "",
};

export function AdvisorWizard({ institutions }: { institutions: InstitutionCard[] }) {
  const [step, setStep] = useState<Step>(1);
  const [country, setCountry] = useState<Country | "">("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<InstitutionCard | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [undergradSoon, setUndergradSoon] = useState(false);

  const [bgDraft, setBgDraft] = useState<BgDraft>(emptyBg);
  const [background, setBackground] = useState<AdvisorBackground | null>(null);
  const [editingBg, setEditingBg] = useState(true);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [hits, setHits] = useState<ProgramHit[]>([]);
  const [detail, setDetail] = useState<ProgramDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [evalProgramId, setEvalProgramId] = useState<string | null>(null);
  const [evalLabel, setEvalLabel] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return institutions.filter((i) => {
      if (country && i.country !== country) return false;
      if (!qq) return true;
      return (
        i.nameZh.toLowerCase().includes(qq) ||
        i.nameEn.toLowerCase().includes(qq) ||
        i.countryLabel.includes(q.trim())
      );
    });
  }, [institutions, country, q]);

  function openSchool(school: InstitutionCard) {
    setPicked(school);
    setUndergradSoon(false);
    setModalOpen(true);
  }

  function chooseGraduate() {
    setModalOpen(false);
    setUndergradSoon(false);
    setMessages([]);
    setHits([]);
    setDetail(null);
    setInput("");
    setEditingBg(true);
    // keep prior background draft if user switches school mid-flow
    setStep(2);
  }

  function saveBackground(e: React.FormEvent) {
    e.preventDefault();
    const gpa = Number(bgDraft.gpa);
    if (!Number.isFinite(gpa) || gpa <= 0 || gpa > 4.5) return;
    if (!bgDraft.undergradSchool.trim() || !bgDraft.undergradMajor.trim()) return;
    const bg: AdvisorBackground = {
      gpa,
      toefl: bgDraft.toefl ? Number(bgDraft.toefl) : null,
      ielts: bgDraft.ielts ? Number(bgDraft.ielts) : null,
      gre: bgDraft.gre ? Number(bgDraft.gre) : null,
      undergradSchool: bgDraft.undergradSchool.trim(),
      undergradMajor: bgDraft.undergradMajor.trim(),
    };
    setBackground(bg);
    setEditingBg(false);
    setMessages([
      {
        role: "assistant",
        text: `已记录你的背景：GPA ${bg.gpa} · ${bg.undergradSchool} / ${bg.undergradMajor}${
          bg.toefl != null ? ` · TOEFL ${bg.toefl}` : ""
        }${bg.ielts != null ? ` · IELTS ${bg.ielts}` : ""}。${
          picked?.verified ? "该校项目库已核验。" : "该校目前为参考目录。"
        }请用一句话描述感兴趣的研究生方向，例如「数据科学」「人工智能偏量化」。我会结合你的背景匹配专业并给出门槛适配提示。`,
      },
    ]);
  }

  function goStep(n: Step) {
    if (n === 1) {
      setStep(1);
      setDetail(null);
      setEvalProgramId(null);
      return;
    }
    if (n === 2 && picked) {
      setStep(2);
      setEvalProgramId(null);
      return;
    }
    if (n === 3 && evalProgramId) setStep(3);
  }

  async function sendChat(e?: React.FormEvent) {
    e?.preventDefault();
    if (!picked || !background || !input.trim() || chatLoading) return;
    const msg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setChatLoading(true);
    setDetail(null);
    try {
      const res = await fetch("/admission/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: picked.name,
          message: msg,
          background,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "顾问回复失败");
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
      setHits(data.programs || []);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: err instanceof Error ? err.message : "顾问暂时不可用，请稍后重试。",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/admission/api/programs/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setDetail(data);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: err instanceof Error ? err.message : "专业详情加载失败",
        },
      ]);
    } finally {
      setDetailLoading(false);
    }
  }

  function startEval() {
    if (!detail) return;
    const label = `${detail.schoolNameZh} · ${detail.programZh || detail.program}（${detail.degree}）`;
    setEvalProgramId(detail.id);
    setEvalLabel(label);
    setStep(3);
  }

  return (
    <div className="advisor-skin space-y-8">
      <header className="space-y-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-sky-300/80">YYSD · AI Advisor</p>
          <h1 className="tech-title mt-1 text-3xl sm:text-4xl">AI升学顾问</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            选学校 → 填写背景 → 对话匹配专业 → 申请评估。
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-3 sm:gap-5" aria-label="评估步骤">
          <StepItem n={1} label="选学校" active={step === 1} done={step > 1} onClick={() => goStep(1)} />
          <span className="text-slate-600">›</span>
          <StepItem
            n={2}
            label="AI顾问"
            active={step === 2}
            done={step > 2}
            onClick={() => goStep(2)}
            disabled={!picked}
          />
          <span className="text-slate-600">›</span>
          <StepItem
            n={3}
            label="评估"
            active={step === 3}
            done={false}
            onClick={() => goStep(3)}
            disabled={!evalProgramId}
          />
        </nav>

        {picked && (
          <p className="text-sm text-slate-400">
            已选：
            <span className="text-sky-200">
              {picked.nameZh}
              {step >= 2 ? " · 研究生" : ""}
              {background && step >= 2
                ? ` · GPA ${background.gpa}${background.toefl != null ? ` · TOEFL ${background.toefl}` : ""}`
                : ""}
              {evalLabel && step === 3 ? ` · ${evalLabel.split(" · ").slice(1).join(" · ")}` : ""}
            </span>
            {step > 1 && (
              <button
                type="button"
                className="ml-3 text-sky-400 underline-offset-2 hover:underline"
                onClick={() => goStep(1)}
              >
                更改学校
              </button>
            )}
          </p>
        )}
      </header>

      {step === 1 && (
        <section className="space-y-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="tech-input pl-10"
              placeholder="搜索大学中文名或英文名…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`tech-chip ${country === "" ? "is-active" : ""}`}
              onClick={() => setCountry("")}
            >
              全部
            </button>
            {COUNTRIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`tech-chip ${country === c ? "is-active" : ""}`}
                onClick={() => setCountry(c)}
              >
                {flag(c)} {COUNTRY_LABELS[c]}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">{filtered.length} 所院校</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <button
                key={s.name}
                type="button"
                className="tech-card flex items-center gap-3 p-4 text-left"
                onClick={() => openSchool(s)}
              >
                <SchoolLogo mark={s.mark} logoUrl={s.logoUrl} nameZh={s.nameZh} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-50">{s.nameZh}</span>
                  <span className="mt-0.5 block truncate text-sm text-slate-400">{s.nameEn}</span>
                  <span className="mt-1 block text-xs text-sky-300/80">
                    {flag(s.country as Country)} {s.countryLabel} · {s.programCount} 个研究生项目
                    {s.verified ? " · 已核验" : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && picked && (
        <section className="space-y-4">
          {editingBg || !background ? (
            <form onSubmit={saveBackground} className="tech-card-static space-y-4 p-5">
              <div>
                <p className="font-semibold text-slate-50">先填写申请背景</p>
                <p className="mt-1 text-xs text-slate-500">
                  顾问将用这些信息比对项目门槛；进入评估时会自动带入，无需重填。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-400">
                  GPA (4.0)
                  <input
                    className="tech-input"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.5"
                    required
                    value={bgDraft.gpa}
                    onChange={(e) => setBgDraft((d) => ({ ...d, gpa: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  TOEFL（可选）
                  <input
                    className="tech-input"
                    type="number"
                    min="0"
                    max="120"
                    value={bgDraft.toefl}
                    onChange={(e) => setBgDraft((d) => ({ ...d, toefl: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  IELTS（可选）
                  <input
                    className="tech-input"
                    type="number"
                    step="0.5"
                    min="0"
                    max="9"
                    value={bgDraft.ielts}
                    onChange={(e) => setBgDraft((d) => ({ ...d, ielts: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  GRE（可选）
                  <input
                    className="tech-input"
                    type="number"
                    min="260"
                    max="340"
                    value={bgDraft.gre}
                    onChange={(e) => setBgDraft((d) => ({ ...d, gre: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-400 sm:col-span-1">
                  本科院校
                  <input
                    className="tech-input"
                    required
                    value={bgDraft.undergradSchool}
                    onChange={(e) =>
                      setBgDraft((d) => ({ ...d, undergradSchool: e.target.value }))
                    }
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  本科专业
                  <input
                    className="tech-input"
                    required
                    value={bgDraft.undergradMajor}
                    onChange={(e) =>
                      setBgDraft((d) => ({ ...d, undergradMajor: e.target.value }))
                    }
                  />
                </label>
              </div>
              <button type="submit" className="tech-btn">
                保存并开始对话
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/50 px-4 py-3 text-sm ring-1 ring-sky-500/20">
              <p className="text-slate-300">
                背景：GPA {background.gpa} · {background.undergradSchool} /{" "}
                {background.undergradMajor}
                {background.toefl != null ? ` · TOEFL ${background.toefl}` : ""}
                {background.ielts != null ? ` · IELTS ${background.ielts}` : ""}
              </p>
              <button
                type="button"
                className="text-sky-400 underline-offset-2 hover:underline"
                onClick={() => setEditingBg(true)}
              >
                修改
              </button>
            </div>
          )}

          {background && !editingBg && (
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="tech-card-static flex min-h-[420px] flex-col lg:col-span-3">
                <div className="border-b border-sky-500/15 px-4 py-3">
                  <p className="font-semibold text-slate-50">AI Advisor · {picked.nameZh}</p>
                  <p className="text-xs text-slate-500">
                    描述兴趣，匹配该校研究生专业；结合你的背景给出门槛适配提示。
                  </p>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "ml-auto bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                          : "bg-slate-900/70 text-slate-200 ring-1 ring-sky-500/20"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                  {chatLoading && (
                    <p className="text-xs text-sky-300/80">顾问正在检索项目库…</p>
                  )}
                </div>
                <form onSubmit={sendChat} className="flex gap-2 border-t border-sky-500/15 p-3">
                  <input
                    className="tech-input flex-1"
                    placeholder="例如：对数据科学和 AI 感兴趣，偏应用…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    className="tech-btn px-3"
                    disabled={chatLoading || !input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>

              <div className="space-y-3 lg:col-span-2">
                <p className="text-sm font-medium text-slate-300">匹配专业</p>
                {!hits.length && !detail && (
                  <p className="text-sm text-slate-500">发送兴趣描述后，相关专业将显示在这里。</p>
                )}
                {hits.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="tech-card w-full p-3 text-left"
                    onClick={() => openDetail(h.id)}
                  >
                    <span className="text-[11px] font-medium uppercase tracking-wide text-sky-300/90">
                      {h.fieldLabel}
                      {h.isStem ? " · STEM" : ""}
                    </span>
                    <span className="mt-0.5 block font-semibold text-slate-50">
                      {h.programZh || h.program}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {h.program} · {h.degree}
                      {h.duration ? ` · ${h.duration}` : ""}
                    </span>
                    {h.why && (
                      <span className="mt-1 block text-xs text-amber-200/80">{h.why}</span>
                    )}
                  </button>
                ))}

                {(detail || detailLoading) && (
                  <div className="tech-card-static p-4">
                    {detailLoading && <p className="text-sm text-slate-400">加载专业详情…</p>}
                    {detail && !detailLoading && (
                      <ProgramDetailPanel
                        detail={detail}
                        onBack={() => setDetail(null)}
                        onEval={startEval}
                      />
                    )}
                  </div>
                )}

                <button type="button" className="tech-btn-ghost text-sm" onClick={() => goStep(1)}>
                  ← 返回选学校
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 3 && evalProgramId && (
        <section className="space-y-4">
          <AdmissionEval
            key={evalProgramId + (background?.gpa ?? "")}
            schoolId={evalProgramId}
            schoolName={evalLabel}
            variant="tech"
            initial={
              background
                ? {
                    gpa: String(background.gpa),
                    toefl: background.toefl != null ? String(background.toefl) : "",
                    ielts: background.ielts != null ? String(background.ielts) : "",
                    gre: background.gre != null ? String(background.gre) : "",
                    undergradSchool: background.undergradSchool,
                    undergradMajor: background.undergradMajor,
                  }
                : undefined
            }
          />
        </section>
      )}

      {modalOpen && picked && (
        <div
          className="tech-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false);
              setUndergradSoon(false);
            }
          }}
        >
          <div className="tech-card-static w-full max-w-md p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <SchoolLogo mark={picked.mark} logoUrl={picked.logoUrl} nameZh={picked.nameZh} />
                <div>
                  <h2 className="text-lg font-semibold text-slate-50">{picked.nameZh}</h2>
                  <p className="text-sm text-slate-400">{picked.nameEn}</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-400 hover:bg-white/5"
                onClick={() => {
                  setModalOpen(false);
                  setUndergradSoon(false);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {!undergradSoon ? (
              <>
                <p className="mb-4 text-sm text-slate-400">请选择申请学历</p>
                <div className="grid gap-3">
                  <button type="button" className="tech-btn w-full" onClick={chooseGraduate}>
                    申请研究生
                  </button>
                  <button
                    type="button"
                    className="tech-btn-ghost w-full"
                    onClick={() => setUndergradSoon(true)}
                  >
                    申请本科
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4 py-2 text-center">
                <p className="text-base font-medium text-sky-200">本科评估即将开放</p>
                <p className="text-sm text-slate-400">当前版本仅支持研究生申请顾问与评估。</p>
                <button type="button" className="tech-btn" onClick={chooseGraduate}>
                  改为申请研究生
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgramDetailPanel({
  detail,
  onBack,
  onEval,
}: {
  detail: ProgramDetail;
  onBack: () => void;
  onEval: () => void;
}) {
  const url = detail.officialUrl || detail.website;
  const gre =
    detail.greRequired === true
      ? "需要 GRE"
      : detail.greRequired === false
        ? "不需要 GRE"
        : "GRE 可选 / 以官网为准";
  return (
    <div className="space-y-3 text-sm">
      <button type="button" className="inline-flex items-center gap-1 text-sky-400" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> 返回列表
      </button>
      <div>
        <p className="text-xs uppercase tracking-wide text-sky-300/80">
          {detail.fieldLabel}
          {detail.verified ? (
            <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-emerald-300">
              已核验
            </span>
          ) : (
            <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-amber-200/90">
              参考
            </span>
          )}
        </p>
        <h3 className="text-lg font-semibold text-slate-50">
          {detail.programZh || detail.program}
        </h3>
        <p className="text-slate-400">
          {detail.program} · {detail.degree}
          {detail.duration ? ` · 学制 ${detail.duration}` : ""}
        </p>
      </div>
      {detail.blurb && <p className="text-slate-300">{detail.blurb}</p>}
      {detail.summaryOfficial && (
        <p className="rounded-xl bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-400">
          {detail.summaryOfficial}
        </p>
      )}
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <KV k="GPA 门槛" v={`最低约 ${detail.minGpa.toFixed(1)} · 均分参考 ${detail.avgGpa.toFixed(2)}`} />
        <KV
          k="语言"
          v={
            detail.minToefl != null
              ? `TOEFL ≥ ${detail.minToefl}${detail.minIelts != null ? ` / IELTS ≥ ${detail.minIelts}` : ""}`
              : detail.minIelts != null
                ? `IELTS ≥ ${detail.minIelts}`
                : "以官网为准"
          }
        />
        <KV k="申请截止" v={detail.applicationDeadline || "以官网为准"} />
        <KV k="学费" v={detail.tuitionNote || "以官网为准"} />
        <KV k="STEM" v={detail.isStem == null ? "未标注" : detail.isStem ? "是" : "否"} />
        <KV k="GRE" v={gre} />
      </dl>
      <p className="text-xs text-slate-500">{detail.admissionRequirements}</p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sky-400 hover:underline"
        >
          官方项目 / 学校页面 <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <button type="button" className="tech-btn w-full" onClick={onEval}>
        申请评估
      </button>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-2">
      <dt className="text-slate-500">{k}</dt>
      <dd className="mt-0.5 text-slate-200">{v}</dd>
    </div>
  );
}

function StepItem({
  n,
  label,
  active,
  done,
  onClick,
  disabled,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`tech-step ${active ? "is-active" : ""} ${done ? "is-done" : ""} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <span className="dot" />
      <span>
        {n}. {label}
      </span>
    </button>
  );
}

function flag(c: Country | string) {
  return ({ US: "🇺🇸", UK: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺" } as Record<string, string>)[c] || "";
}

function SchoolLogo({
  mark,
  logoUrl,
  nameZh,
}: {
  mark: string;
  logoUrl?: string;
  nameZh: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) return <span className="tech-mark">{mark}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={`${nameZh} 校徽`}
      className="h-[52px] w-[52px] shrink-0 rounded-[14px] bg-white object-contain p-1 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
      onError={() => setFailed(true)}
    />
  );
}
