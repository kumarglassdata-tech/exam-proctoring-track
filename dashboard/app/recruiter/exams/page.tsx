"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Send, Eye, Clock, FileQuestion, Users, RefreshCw,
  AlertCircle, Edit3, CheckCircle2, AlertTriangle
} from "lucide-react";
import type { Exam } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Examination & Question Papers</h1>
          <p className="text-sm text-white/50 mt-1">
            Build exam papers progressively, manage questions, and dispatch candidate invites once finalized.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchExams}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/recruiter/exams/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Exam Paper</span>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">{error}</p>
            <p className="text-sm text-red-400/70 mt-0.5">
              Make sure the backend is running: <code className="text-xs bg-red-500/10 px-1.5 py-0.5 rounded">cd backend && uvicorn app.main:app --port 8000 --reload</code>
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 animate-pulse h-64" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && exams.length === 0 && (
        <div className="text-center py-24 space-y-4">
          <div className="text-5xl">📋</div>
          <h3 className="text-lg font-semibold text-white">No exams yet</h3>
          <p className="text-white/40 text-sm max-w-sm mx-auto">
            Create your first exam paper to get started. You can add questions one-by-one and edit them anytime.
          </p>
          <Link
            href="/recruiter/exams/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all mt-2"
          >
            <Plus className="w-4 h-4" />
            Create First Exam
          </Link>
        </div>
      )}

      {/* Exam Cards Grid */}
      {!loading && exams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {exams.map((exam) => {
            const sections = Array.isArray(exam.sections) ? exam.sections : [];
            const isCompleted = Boolean(exam.is_active);

            return (
              <div
                key={exam.id}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-lg text-white">{exam.title}</h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 ${
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Finalized & Active</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Draft (In Progress)</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 mt-2 line-clamp-2">{exam.description || "No description provided."}</p>

                  {/* Meta stats */}
                  <div className="grid grid-cols-3 gap-3 my-5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <div>
                      <div className="text-xs text-white/40 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Duration
                      </div>
                      <div className="text-sm font-semibold text-white mt-1">{exam.duration_minutes} Mins</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 flex items-center justify-center gap-1">
                        <FileQuestion className="w-3.5 h-3.5" /> Sections
                      </div>
                      <div className="text-sm font-semibold text-white mt-1">{sections.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 flex items-center justify-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Candidates
                      </div>
                      <div className="text-sm font-semibold text-white mt-1">
                        {(exam as Exam & { candidate_count?: number }).candidate_count ?? "—"}
                      </div>
                    </div>
                  </div>

                  {/* Sections list */}
                  {sections.length > 0 && (
                    <div className="space-y-1.5 mb-6">
                      <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Exam Sections:</div>
                      {sections.map((sec, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-white/70 py-1 border-b border-white/5">
                          <span>{sec.name}</span>
                          <span className="text-white/40">
                            {sec.time_minutes}m ({sec.question_count} Qs)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/10 flex-wrap">
                  {/* Edit Button — always available so recruiter can add questions progressively */}
                  <Link
                    href={`/recruiter/exams/${exam.id}/edit`}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 transition-colors border border-violet-500/30"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                    <span>{isCompleted ? "Edit Questions" : "Edit Paper"}</span>
                  </Link>

                  {/* Invite Button — unlocked if completed or directs to complete */}
                  <Link
                    href={`/recruiter/exams/${exam.id}/invite`}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                      isCompleted
                        ? "bg-white/5 hover:bg-white/10 text-white border-white/10"
                        : "bg-white/[0.02] text-white/40 border-white/5 hover:text-white/60"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Invite</span>
                  </Link>

                  {/* Results Button */}
                  <Link
                    href={`/recruiter/results?examId=${exam.id}`}
                    className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 transition-colors border border-indigo-500/20"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Results</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
