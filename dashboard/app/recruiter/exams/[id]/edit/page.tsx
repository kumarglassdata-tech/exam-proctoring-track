"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus, Trash2, ArrowRight, Code, Calculator, FileText,
  CheckSquare, Loader2, AlertCircle, CheckCircle2, Edit3,
  Save, Send, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
type QType = "mcq" | "numerical" | "coding" | "descriptive";

interface Question {
  id: string;
  section: string;
  type: QType;
  text: string;
  marks: number;
  negative_marks: number;
  difficulty: string;
  options?: string[];
  correct_answer?: string;
  tolerance?: number;
  test_cases?: { input: string; expected_output: string }[];
  model_answer?: string;
  min_words?: number;
  max_words?: number;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  is_active: boolean;
  questions?: Question[];
}

const TYPE_LABELS: Record<QType, string> = {
  mcq: "MCQ", numerical: "Numerical", coding: "Coding", descriptive: "Descriptive",
};

const TYPE_COLORS: Record<QType, string> = {
  mcq: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  numerical: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  coding: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  descriptive: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

function emptyQuestion(type: QType): Omit<Question, "id"> {
  return {
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

export default function ExamEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = params.id;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add-question form
  const [showForm, setShowForm] = useState(false);
  const [activeType, setActiveType] = useState<QType>("mcq");
  const [draft, setDraft] = useState<Omit<Question, "id">>(emptyQuestion("mcq"));
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Marking complete
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const fetchExam = useCallback(async () => {
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace("/login"); return; }
      if (!res.ok) throw new Error(`Failed to load exam (${res.status})`);
      const data = await res.json();
      setExam(data);
      setQuestions(data.questions ?? []);
      setCompleted(data.is_active);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading exam");
    } finally {
      setLoading(false);
    }
  }, [examId, token, router]);

  useEffect(() => { fetchExam(); }, [fetchExam]);

  function switchType(t: QType) {
    setActiveType(t);
    setDraft(emptyQuestion(t));
  }

  function updateDraft(patch: Partial<Omit<Question, "id">>) {
    setDraft((p) => ({ ...p, ...patch }));
  }

  async function handleAddQuestion() {
    if (!draft.text.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch(`${API_URL}/admin/exams/${examId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Failed to add question (${res.status})`);
      }
      const q = await res.json();
      setQuestions((prev) => [...prev, q]);
      setDraft(emptyQuestion(activeType));
      setShowForm(false);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add question");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteQuestion(qId: string) {
    if (!confirm("Remove this question from the paper?")) return;
    try {
      await fetch(`${API_URL}/admin/questions/${qId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
    } catch { /* ignore */ }
  }

  async function handleMarkComplete() {
    if (questions.length === 0) {
      setError("Add at least one question before marking the exam as complete.");
      return;
    }
    setCompleting(true);
    try {
      const res = await fetch(`${API_URL}/admin/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: true }),
      });
      if (!res.ok) throw new Error("Failed to update exam status");
      setCompleted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to mark complete");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8 text-red-400">{error || "Exam not found."}</div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.push("/recruiter/exams")} className="text-xs text-white/40 hover:text-white/70 transition-colors">← Exams</button>
            <span className="text-white/20">/</span>
            <span className="text-xs text-white/60">Edit</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-violet-400" />
            {exam.title}
          </h1>
          <p className="text-sm text-white/40 mt-1">{exam.duration_minutes} min · {questions.length} question{questions.length !== 1 ? "s" : ""} · ID: {exam.id.slice(0, 8)}…</p>
        </div>
        <button
          onClick={fetchExam}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Status Banner */}
      {completed ? (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <div>
              <div className="font-semibold text-sm">Exam paper is complete & active</div>
              <div className="text-xs text-emerald-400/70 mt-0.5">You can now invite candidates to take this exam</div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/recruiter/exams/${examId}/invite`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/30"
          >
            <Send className="w-4 h-4" />
            Send Invites
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-3 text-yellow-400">
            <Edit3 className="w-5 h-5" />
            <div>
              <div className="font-semibold text-sm">Exam is in draft mode</div>
              <div className="text-xs text-yellow-400/70 mt-0.5">Add all your questions, then mark it complete to unlock invitations</div>
            </div>
          </div>
          <button
            onClick={handleMarkComplete}
            disabled={completing || questions.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
          >
            {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {completing ? "Saving…" : "Mark as Complete"}
          </button>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70">
            Questions ({questions.length})
          </h2>
        </div>

        {questions.length === 0 && (
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-white/40 text-sm">No questions yet. Add your first question below.</p>
          </div>
        )}

        {questions.map((q, idx) => (
          <div key={q.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-start justify-between gap-4 group">
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-7 h-7 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-white font-medium leading-snug">{q.text}</div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[q.type]}`}>
                    {TYPE_LABELS[q.type]}
                  </span>
                  <span className="text-[10px] text-white/40">{q.section}</span>
                  <span className="text-[10px] text-white/40">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                  {q.options && (
                    <span className="text-[10px] text-white/30">Answer: {q.correct_answer}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDeleteQuestion(q.id)}
              className="text-white/20 hover:text-red-400 p-1.5 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Question Toggle */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-sm font-semibold text-white hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-400" />
            Add New Question
          </div>
          {showForm ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </button>

        {showForm && (
          <div className="p-5 border-t border-white/10 space-y-5">
            {/* Type tabs */}
            <div className="flex gap-2 flex-wrap">
              {(["mcq", "numerical", "coding", "descriptive"] as QType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeType === t ? "bg-violet-600 text-white" : "bg-white/5 text-white/50 hover:text-white"
                  }`}
                >
                  {t === "mcq" && <CheckSquare className="w-3.5 h-3.5" />}
                  {t === "numerical" && <Calculator className="w-3.5 h-3.5" />}
                  {t === "coding" && <Code className="w-3.5 h-3.5" />}
                  {t === "descriptive" && <FileText className="w-3.5 h-3.5" />}
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Common fields */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-white/50 mb-1.5 block">Section</label>
                <input value={draft.section} onChange={(e) => updateDraft({ section: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Marks</label>
                <input type="number" value={draft.marks} onChange={(e) => updateDraft({ marks: +e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Neg.Marks</label>
                <input type="number" value={draft.negative_marks} onChange={(e) => updateDraft({ negative_marks: +e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Question Text *</label>
              <textarea rows={3} value={draft.text} onChange={(e) => updateDraft({ text: e.target.value })}
                placeholder="Enter question…"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 resize-none" />
            </div>

            {/* MCQ */}
            {activeType === "mcq" && (
              <div className="space-y-2">
                {(draft.options ?? ["", "", "", ""]).map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <button onClick={() => updateDraft({ correct_answer: letter })}
                        className={`w-8 h-8 rounded-lg text-xs font-bold shrink-0 transition-all ${draft.correct_answer === letter ? "bg-emerald-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"}`}>
                        {letter}
                      </button>
                      <input value={opt} onChange={(e) => { const c = [...(draft.options ?? [])]; c[idx] = e.target.value; updateDraft({ options: c }); }}
                        placeholder={`Option ${letter}`}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Numerical */}
            {activeType === "numerical" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Correct Answer</label>
                  <input type="number" step="any" value={draft.correct_answer ?? ""} onChange={(e) => updateDraft({ correct_answer: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Tolerance (±)</label>
                  <input type="number" step="any" value={draft.tolerance ?? 0.01} onChange={(e) => updateDraft({ tolerance: +e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                </div>
              </div>
            )}

            {/* Coding */}
            {activeType === "coding" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-white/50">Test Cases</label>
                  <button onClick={() => updateDraft({ test_cases: [...(draft.test_cases ?? []), { input: "", expected_output: "" }] })}
                    className="text-xs text-violet-400 hover:text-violet-300">+ Add</button>
                </div>
                {(draft.test_cases ?? []).map((tc, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input value={tc.input} onChange={(e) => { const c = [...(draft.test_cases ?? [])]; c[idx] = { ...c[idx], input: e.target.value }; updateDraft({ test_cases: c }); }}
                      placeholder="Input" className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs text-white font-mono outline-none" />
                    <input value={tc.expected_output} onChange={(e) => { const c = [...(draft.test_cases ?? [])]; c[idx] = { ...c[idx], expected_output: e.target.value }; updateDraft({ test_cases: c }); }}
                      placeholder="Expected output" className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs text-white font-mono outline-none" />
                  </div>
                ))}
              </div>
            )}

            {/* Descriptive */}
            {activeType === "descriptive" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Min Words</label>
                    <input type="number" value={draft.min_words ?? 50} onChange={(e) => updateDraft({ min_words: +e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Max Words</label>
                    <input type="number" value={draft.max_words ?? 500} onChange={(e) => updateDraft({ max_words: +e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Model / Reference Answer & Key Concepts (AI Evaluation)</label>
                  <textarea rows={4} value={draft.model_answer ?? ""} onChange={(e) => updateDraft({ model_answer: e.target.value })}
                    placeholder="Enter expected key concepts, formulas, or explanation steps for automated AI grading…"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none resize-none" />
                </div>
              </div>
            )}

            {addError && (
              <div className="text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />{addError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-sm">Cancel</button>
              <button onClick={handleAddQuestion} disabled={adding || !draft.text.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-all">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {adding ? "Saving…" : "Add Question"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-64 right-0 p-4 bg-[#0a0c14]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between">
        <p className="text-xs text-white/40">
          {questions.length} question{questions.length !== 1 ? "s" : ""} · {exam.duration_minutes} min exam
          {completed ? " · ✅ Complete" : " · ⏳ Draft"}
        </p>
        <div className="flex items-center gap-3">
          {!completed && (
            <button onClick={handleMarkComplete} disabled={completing || questions.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
              {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark Complete
            </button>
          )}
          {completed && (
            <button onClick={() => router.push(`/recruiter/exams/${examId}/invite`)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20">
              <Send className="w-4 h-4" />
              Send Invites
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
