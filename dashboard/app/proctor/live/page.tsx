"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Video, ShieldAlert, CheckCircle, Search, AlertTriangle, Eye, RefreshCw, AlertCircle } from "lucide-react";
import type { LiveSession } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const POLL_INTERVAL_MS = 10_000; // auto-refresh every 10s

function SessionCard({ s }: { s: LiveSession }) {
  const isFlagged = s.flag_count > 0;
  const isCritical = s.flag_count >= 3;
  const borderColor = isCritical
    ? "border-red-500/40 hover:border-red-500/70"
    : isFlagged
    ? "border-yellow-500/40 hover:border-yellow-500/70"
    : "border-emerald-500/20 hover:border-emerald-500/40";
  const cameraBg = isCritical ? "bg-red-500/5" : isFlagged ? "bg-yellow-500/5" : "bg-emerald-500/5";

  return (
    <Link
      href={`/proctor/live/${s.session_id}`}
      className={`group block rounded-2xl bg-white/[0.03] border ${borderColor} transition-all overflow-hidden`}
    >
      {/* Webcam area */}
      <div className={`aspect-video ${cameraBg} flex items-center justify-center relative bg-black overflow-hidden`}>
        {s.latest_frame ? (
          <img
            src={s.latest_frame}
            alt={s.candidate_name}
            className="w-full h-full object-cover transform -scale-x-100"
          />
        ) : (
          <div className="text-4xl opacity-20">📷</div>
        )}
        {isFlagged && (
          <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isCritical ? "bg-red-500 text-white" : "bg-yellow-500 text-black"}`}>
            <ShieldAlert className="w-3 h-3" />
            {s.flag_count} flag{s.flag_count !== 1 ? "s" : ""}
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded-full text-xs text-white/70">
          <div className={`w-1.5 h-1.5 rounded-full ${s.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-yellow-400"}`} />
          {s.status === "active" ? "Live" : s.status}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-white text-sm">{s.candidate_name}</div>
            <div className="text-xs text-white/40 mt-0.5 truncate max-w-[160px]">{s.candidate_email}</div>
          </div>
          <Eye className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors mt-0.5" />
        </div>
        <div className="mt-3 text-xs text-white/40 truncate">{s.exam_title}</div>
        {s.last_flag && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-400/80 truncate">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>{s.last_flag}</span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-white/30">Integrity</div>
          <div className={`text-xs font-semibold ${(s.integrity_score ?? 100) >= 80 ? "text-emerald-400" : (s.integrity_score ?? 100) >= 60 ? "text-yellow-400" : "text-red-400"}`}>
            {(s.integrity_score ?? 100).toFixed(0)}%
          </div>
        </div>
        <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${(s.integrity_score ?? 100) >= 80 ? "bg-emerald-500" : (s.integrity_score ?? 100) >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${s.integrity_score ?? 100}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

export default function LiveProctoringPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "flagged">("all");
  const [search, setSearch] = useState("");

  const fetchSessions = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    try {
      const res = await fetch(`${API_URL}/sessions/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace("/login"); return; }
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch live sessions");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSessions();
    const timer = setInterval(fetchSessions, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchSessions]);

  const filtered = sessions.filter((s) => {
    const matchesFilter = filter === "all" || (filter === "flagged" && s.flag_count > 0);
    const matchesSearch =
      s.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
      s.exam_title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const flaggedCount = sessions.filter((s) => s.flag_count > 0).length;
  const criticalCount = sessions.filter((s) => s.flag_count >= 3).length;

  // Group sessions by exam title for the "Active Exams" summary
  const examGroups = sessions.reduce<Record<string, { count: number; flags: number }>>((acc, s) => {
    if (!acc[s.exam_title]) acc[s.exam_title] = { count: 0, flags: 0 };
    acc[s.exam_title].count++;
    acc[s.exam_title].flags += s.flag_count;
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Video className="w-6 h-6 text-violet-400" />
            Live Proctoring Monitor
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Real-time AI-assisted exam surveillance — auto-refreshes every 10s
          </p>
        </div>
        <button
          onClick={fetchSessions}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <div className="text-xl font-bold text-white">{sessions.length}</div>
            <div className="text-xs text-white/40">Active Sessions</div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-yellow-400 shrink-0" />
          <div>
            <div className="text-xl font-bold text-white">{flaggedCount}</div>
            <div className="text-xs text-white/40">Flagged Candidates</div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-red-400 shrink-0" />
          <div>
            <div className="text-xl font-bold text-white">{criticalCount}</div>
            <div className="text-xs text-white/40">Critical Alerts</div>
          </div>
        </div>
      </div>

      {/* Active Exams Summary (only if sessions exist) */}
      {Object.keys(examGroups).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Currently Running Exams</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(examGroups).map(([title, { count, flags }]) => (
              <div key={title} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{title}</div>
                  <div className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {count} candidate{count !== 1 ? "s" : ""} attending
                  </div>
                </div>
                {flags > 0 && (
                  <span className="ml-3 shrink-0 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {flags} flag{flags !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">{error}</p>
            <p className="text-sm text-red-400/70 mt-0.5">Backend must be running on port 8000</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates…"
            className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40 w-56"
          />
        </div>
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
          {(["all", "flagged"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {f === "all" ? "All" : `⚠️ Flagged (${flaggedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/10 animate-pulse aspect-[4/5]" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">👁️</div>
          <h3 className="text-lg font-semibold text-white mb-2">No active sessions</h3>
          <p className="text-white/40 text-sm">
            {sessions.length === 0
              ? "No candidates are currently taking an exam."
              : "No candidates match your current filter."}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((s) => (
            <SessionCard key={s.session_id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
