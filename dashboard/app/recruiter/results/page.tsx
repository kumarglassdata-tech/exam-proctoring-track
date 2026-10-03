"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Search, Download, CheckCircle, AlertTriangle, XCircle,
  FileText, RefreshCw, AlertCircle
} from "lucide-react";
import type { CandidateResult } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function pct(score: number, max: number) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

export default function ResultsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-white/50 text-sm">Loading results…</div>}>
      <ResultsContent />
    </React.Suspense>
  );
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId");

  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"score" | "integrity" | "flags">("score");

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    try {
      const url = examId
        ? `${API_URL}/admin/exams/${examId}/results`
        : `${API_URL}/admin/results/all`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { router.replace("/login"); return; }
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [router, examId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const filtered = useMemo(() => {
    return results
      .filter((r) =>
        r.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
        r.candidate_email.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sortKey === "score") return pct(b.total_score, b.max_score) - pct(a.total_score, a.max_score);
        if (sortKey === "integrity") return (b.integrity_score ?? 0) - (a.integrity_score ?? 0);
        return (b.flag_count ?? 0) - (a.flag_count ?? 0);
      });
  }, [results, search, sortKey]);

  function exportCSV() {
    const header = "Name,Email,Score,Max,Pct,Integrity,Flags,Time,Status\n";
    const rows = filtered.map((r) =>
      `"${r.candidate_name}","${r.candidate_email}",${r.total_score},${r.max_score},${pct(r.total_score, r.max_score)}%,${r.integrity_score ?? "-"},${r.flag_count ?? 0},${fmt(r.time_taken_seconds ?? 0)},${r.status}`
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `results-${examId ?? "all"}.csv`; a.click();
  }

  function downloadAnswerSheet(sessionId: string) {
    const token = localStorage.getItem("access_token");
    window.open(`${API_URL}/admin/answers/download/${sessionId}?token=${token}`, "_blank");
  }

  function downloadBulkAnswerSheets() {
    if (!examId) return;
    const token = localStorage.getItem("access_token");
    window.open(`${API_URL}/admin/answers/download_all/${examId}?token=${token}`, "_blank");
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Candidate Results & Answer Sheets</h1>
          <p className="text-sm text-white/50 mt-1">
            {examId ? `Showing results for exam ${examId}` : "All exam results & AI-evaluable answer sheets"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchResults}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {examId && (
            <button
              onClick={downloadBulkAnswerSheets}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30"
            >
              <FileText className="w-4 h-4" />
              Download All Answer Sheets (for AI Scoring)
            </button>
          )}

          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 text-sm font-semibold transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
          {(["score", "integrity", "flags"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                sortKey === k ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              Sort by {k}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-white/50">No results found. Candidates need to complete the exam first.</p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10">
                <th className="text-left text-xs text-white/40 font-semibold px-5 py-3.5">Candidate</th>
                <th className="text-center text-xs text-white/40 font-semibold px-4 py-3.5">Score</th>
                <th className="text-center text-xs text-white/40 font-semibold px-4 py-3.5">Integrity</th>
                <th className="text-center text-xs text-white/40 font-semibold px-4 py-3.5">Flags</th>
                <th className="text-center text-xs text-white/40 font-semibold px-4 py-3.5">Time</th>
                <th className="text-center text-xs text-white/40 font-semibold px-4 py-3.5">Status</th>
                <th className="text-center text-xs text-white/40 font-semibold px-4 py-3.5">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r) => {
                const p = pct(r.total_score, r.max_score);
                const scoreColor = p >= 70 ? "text-emerald-400" : p >= 50 ? "text-yellow-400" : "text-red-400";
                const integrity = r.integrity_score ?? 100;
                const intColor = integrity >= 80 ? "text-emerald-400" : integrity >= 60 ? "text-yellow-400" : "text-red-400";
                return (
                  <tr key={r.session_id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{r.candidate_name}</div>
                      <div className="text-xs text-white/40 mt-0.5">{r.candidate_email}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`font-bold ${scoreColor}`}>{p}%</div>
                      <div className="text-xs text-white/30">{r.total_score}/{r.max_score}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`font-semibold ${intColor}`}>{integrity.toFixed(0)}%</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`font-semibold ${(r.flag_count ?? 0) > 2 ? "text-red-400" : (r.flag_count ?? 0) > 0 ? "text-yellow-400" : "text-white/40"}`}>
                        {r.flag_count ?? 0}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-white/50 text-xs">
                      {fmt(r.time_taken_seconds ?? 0)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {r.status === "submitted" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Submitted
                        </span>
                      ) : r.status === "terminated" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                          <XCircle className="w-3 h-3" /> Terminated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          <AlertTriangle className="w-3 h-3" /> {r.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={`/proctor/reports/${r.session_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View
                        </a>
                        <button
                          onClick={() => downloadAnswerSheet(r.session_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all"
                          title="Download Candidate Answer Sheet JSON for AI Evaluation"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Answer Sheet
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
