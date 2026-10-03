"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ArrowRight, Code, Calculator,
  FileText, CheckSquare, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type QType = "mcq" | "numerical" | "coding" | "descriptive";

interface DraftQuestion {
  tempId: string;
  section: string;
  type: QType;
  text: string;
  marks: number;
  negative_marks: number;
  difficulty: string;
  // MCQ
  options?: string[];
  correct_answer?: string;
  // Numerical
  tolerance?: number;
  // Coding
  test_cases?: { input: string; expected_output: string }[];
  // Descriptive
  model_answer?: string;
  min_words?: number;
  max_words?: number;
}

const TYPE_LABELS: Record<QType, string> = {
  mcq: "Multiple Choice",
  numerical: "Numerical / Math",
  coding: "LeetCode Coding",
  descriptive: "Descriptive Answer",
};

const TYPE_ICONS: Record<QType, React.ReactNode> = {
  mcq: <CheckSquare className="w-3.5 h-3.5" />,
  numerical: <Calculator className="w-3.5 h-3.5" />,
  coding: <Code className="w-3.5 h-3.5" />,
  descriptive: <FileText className="w-3.5 h-3.5" />,
};

function emptyDraft(type: QType): DraftQuestion {
  return {
    tempId: `q-${Date.now()}`,
    section: "General",
    type,
    text: "",
    marks: 2,
    negative_marks: 0.5,
    difficulty: "medium",
    options: type === "mcq" ? ["", "", "", ""] : undefined,
    correct_answer: type === "mcq" ? "A" : undefined,
    tolerance: type === "numerical" ? 0.01 : undefined,
    test_cases: type === "coding" ? [{ input: "", expected_output: "" }] : undefined,
    model_answer: type === "descriptive" ? "" : undefined,
    min_words: type === "descriptive" ? 50 : undefined,
    max_words: type === "descriptive" ? 500 : undefined,
  };
}

export default function NewExamPage() {
  const router = useRouter();

  // Exam metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [companyName, setCompanyName] = useState("Acme Global Tech");
  const [companyLogo, setCompanyLogo] = useState("https://cdn-icons-png.flaticon.com/512/3135/3135715.png");
  const [negativeMarking, setNegativeMarking] = useState(true);
  const [randomize, setRandomize] = useState(true);
  const [forbiddenApps, setForbiddenApps] = useState("Discord, AnyDesk, OBS, WhatsApp, Zoom");

  // Questions
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [activeType, setActiveType] = useState<QType>("mcq");
  const [draft, setDraft] = useState<DraftQuestion>(emptyDraft("mcq"));

  // Save state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function switchType(t: QType) {
    setActiveType(t);
    setDraft(emptyDraft(t));
  }

  function updateDraft(patch: Partial<DraftQuestion>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function addQuestion() {
    if (!draft.text.trim()) return;
    setQuestions((prev) => [...prev, { ...draft, tempId: `q-${Date.now()}` }]);
    setDraft(emptyDraft(activeType));
  }

  function removeQuestion(tempId: string) {
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
  }

  async function handleSave(redirectToEditor: boolean = true) {
    if (!title.trim()) { setError("Exam title is required."); return; }

    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }

    setError("");
    setSaving(true);

    try {
      // 1. Create exam (is_active = false: Draft mode)
      const examRes = await fetch(`${API_URL}/admin/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          description,
          duration_minutes: parseInt(duration) || 60,
          sections: [],
          settings: {
            company_name: companyName,
            company_logo: companyLogo,
            negative_marking: negativeMarking,
            randomize_order: randomize,
            forbidden_apps: forbiddenApps.split(",").map((s) => s.trim()).filter(Boolean),
          },
          is_active: false,
        }),
      });

      if (!examRes.ok) {
        const err = await examRes.json().catch(() => ({}));
        throw new Error(err.detail ?? `Failed to create exam (${examRes.status})`);
      }

      const exam = await examRes.json();
      const examId = exam.id;

      // 2. Add each draft question if any were added
      for (const q of questions) {
        const { tempId, ...payload } = q;
        const qRes = await fetch(`${API_URL}/admin/exams/${examId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!qRes.ok) {
          const err = await qRes.json().catch(() => ({}));
          throw new Error(err.detail ?? `Failed to save question: "${q.text.slice(0, 40)}"`);
        }
      }

      setSaved(true);
      setTimeout(() => {
        if (redirectToEditor) {
          router.push(`/recruiter/exams/${examId}/edit`);
        } else {
          router.push("/recruiter/exams");
        }
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Create New Exam Paper</h1>
        <p className="text-sm text-white/50 mt-1">
          Configure exam settings and compose multi-format questions. Everything is saved to the database.
        </p>
      </div>

      {/* ── SECTION 1: Exam Details ─────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
        <h2 className="text-base font-semibold text-white">1. Examination Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-white/60 mb-1.5 block">Exam Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SDE 1st Round Technical Screening"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/60 mb-1.5 block">Duration (Minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="10"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-white/60 mb-1.5 block">Description (optional)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the exam scope..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-white/60 mb-1.5 block">Company / Institution Name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/60 mb-1.5 block">Company Logo URL / Asset</label>
            <input
              value={companyLogo}
              onChange={(e) => setCompanyLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
            <span className="text-sm text-white/70">Negative Marking</span>
            <button
              type="button"
              onClick={() => setNegativeMarking((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${negativeMarking ? "bg-indigo-600" : "bg-white/10"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${negativeMarking ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
            <span className="text-sm text-white/70">Randomize Order</span>
            <button
              type="button"
              onClick={() => setRandomize((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${randomize ? "bg-indigo-600" : "bg-white/10"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${randomize ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/60 mb-1.5 block">Blocked Apps (comma-separated)</label>
            <input
              value={forbiddenApps}
              onChange={(e) => setForbiddenApps(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Question Composer ─────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">2. Add Questions</h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            {questions.length} Question{questions.length !== 1 ? "s" : ""} Added
          </span>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-2 p-1.5 rounded-xl bg-white/5 border border-white/10 flex-wrap">
          {(["mcq", "numerical", "coding", "descriptive"] as QType[]).map((t) => (
            <button
              key={t}
              onClick={() => switchType(t)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeType === t ? "bg-indigo-600 text-white shadow" : "text-white/60 hover:text-white"
              }`}
            >
              {TYPE_ICONS[t]}
              <span>{TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>

        {/* Common fields */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-white/60 mb-1.5 block">Section Name</label>
            <input
              value={draft.section}
              onChange={(e) => updateDraft({ section: e.target.value })}
              placeholder="e.g. Aptitude, Data Structures…"
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-white/60 mb-1.5 block">Marks</label>
              <input
                type="number"
                value={draft.marks}
                onChange={(e) => updateDraft({ marks: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/60 mb-1.5 block">Neg. Marks</label>
              <input
                type="number"
                value={draft.negative_marks}
                onChange={(e) => updateDraft({ negative_marks: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-white/60 mb-1.5 block">Question Statement *</label>
          <textarea
            rows={3}
            value={draft.text}
            onChange={(e) => updateDraft({ text: e.target.value })}
            placeholder="Enter the question text or problem description…"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* ── MCQ ──────────────────────────────────────────────────────────── */}
        {activeType === "mcq" && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-white/60 block">Answer Choices (click letter to mark correct):</label>
            {(draft.options ?? ["", "", "", ""]).map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateDraft({ correct_answer: letter })}
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all shrink-0 ${
                      draft.correct_answer === letter
                        ? "bg-emerald-600 text-white border border-emerald-400"
                        : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {letter}
                  </button>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const copy = [...(draft.options ?? ["", "", "", ""])];
                      copy[idx] = e.target.value;
                      updateDraft({ options: copy });
                    }}
                    placeholder={`Option ${letter}`}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* ── Numerical ────────────────────────────────────────────────────── */}
        {activeType === "numerical" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-white/60 mb-1.5 block">Correct Answer</label>
              <input
                type="number"
                step="any"
                value={draft.correct_answer ?? ""}
                onChange={(e) => updateDraft({ correct_answer: e.target.value })}
                placeholder="e.g. 42.5"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/60 mb-1.5 block">Accepted Tolerance (±)</label>
              <input
                type="number"
                step="any"
                value={draft.tolerance ?? 0.01}
                onChange={(e) => updateDraft({ tolerance: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
              />
            </div>
          </div>
        )}

        {/* ── Coding ───────────────────────────────────────────────────────── */}
        {activeType === "coding" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/60">Test Cases (input → expected output):</label>
              <button
                type="button"
                onClick={() => updateDraft({ test_cases: [...(draft.test_cases ?? []), { input: "", expected_output: "" }] })}
                className="text-xs text-indigo-400 font-semibold hover:text-indigo-300"
              >
                + Add Case
              </button>
            </div>
            {(draft.test_cases ?? []).map((tc, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-[11px] text-white/40 block mb-1">Input</span>
                  <input
                    value={tc.input}
                    onChange={(e) => {
                      const copy = [...(draft.test_cases ?? [])];
                      copy[idx] = { ...copy[idx], input: e.target.value };
                      updateDraft({ test_cases: copy });
                    }}
                    placeholder="e.g. [2,7,11], 9"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-white/40 block mb-1">Expected Output</span>
                  <input
                    value={tc.expected_output}
                    onChange={(e) => {
                      const copy = [...(draft.test_cases ?? [])];
                      copy[idx] = { ...copy[idx], expected_output: e.target.value };
                      updateDraft({ test_cases: copy });
                    }}
                    placeholder="e.g. [0,1]"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Descriptive / Long Answer ───────────────────────────────────── */}
        {activeType === "descriptive" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-white/60 mb-1.5 block">Minimum Word Count</label>
                <input
                  type="number"
                  value={draft.min_words ?? 50}
                  onChange={(e) => updateDraft({ min_words: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 50"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 mb-1.5 block">Maximum Word Count</label>
                <input
                  type="number"
                  value={draft.max_words ?? 500}
                  onChange={(e) => updateDraft({ max_words: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/60 mb-1.5 block">
                Model / Reference Answer & Key Concepts (for automated AI evaluation):
              </label>
              <textarea
                rows={5}
                value={draft.model_answer ?? ""}
                onChange={(e) => updateDraft({ model_answer: e.target.value })}
                placeholder="Write the expected key points, concepts, and technical terminology. The evaluation engine compares the candidate's response against these points for automatic semantic scoring..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none resize-none"
              />
              <p className="text-[11px] text-white/40 mt-1">
                💡 Tip: Include essential keywords, theories, or reasoning steps that a full-mark answer must contain.
              </p>
            </div>
          </div>
        )}

        {/* Add Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={addQuestion}
            disabled={!draft.text.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors border border-white/10"
          >
            <Plus className="w-4 h-4" />
            Add to Paper
          </button>
        </div>
      </div>

      {/* ── SECTION 3: Question Paper Preview ─────────────────────────────── */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/70">
            Paper Preview — {questions.length} Question{questions.length !== 1 ? "s" : ""}:
          </h3>
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div
                key={q.tempId}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{q.text}</div>
                    <div className="text-[10px] text-white/40 uppercase mt-0.5">
                      {q.section} · {TYPE_LABELS[q.type]} · {q.marks} mark{q.marks !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.tempId)}
                  className="text-white/30 hover:text-red-400 p-1.5 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Save Bar ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-64 right-0 p-5 bg-[#0a0c14]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between gap-4">
        <div className="flex-1">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Exam saved! Redirecting…</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving || saved || !title.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving to DB…</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved! Redirecting…</>
            ) : (
              <><span>Save Draft & Open Question Editor ({questions.length} Qs)</span><ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
