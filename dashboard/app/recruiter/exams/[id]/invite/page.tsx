"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Send, CheckCircle2, Copy, AlertCircle, ArrowLeft,
  Mail, Key, Link2, ExternalLink, Loader2, Check,
  AlertTriangle, UserCheck, RefreshCw, Edit3, Calendar,
  Clock, Globe
} from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface InvitationResult {
  email: string;
  candidate_name: string;
  username: string;
  temp_password: string;
  token: string;
  web_link?: string;
  deep_link: string;
  email_sent: boolean;
}

interface ExistingCandidate {
  candidate_id: string;
  name: string;
  email: string;
  invite_status: string;
  invite_token: string;
}

const toLocalISO = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDisplayDateTime = (dtStr: string): string => {
  if (!dtStr) return "";
  try {
    const d = new Date(dtStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dtStr;
  }
};

export default function InviteCandidatesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = params.id;

  const [exam, setExam] = useState<{
    id: string;
    title: string;
    duration_minutes?: number;
    window_start?: string;
    window_end?: string;
    is_active: boolean;
  } | null>(null);

  // Timing controls
  const [startTime, setStartTime] = useState(() => toLocalISO(new Date()));
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toLocalISO(d);
  });
  const [duration, setDuration] = useState("60");

  const [emailsText, setEmailsText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [invitations, setInvitations] = useState<InvitationResult[]>([]);
  const [deliveryStats, setDeliveryStats] = useState<{
    sent: number;
    delivered: number;
    emailEnabled: boolean;
  } | null>(null);

  const [existingCandidates, setExistingCandidates] = useState<ExistingCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch exam metadata
  const fetchExam = useCallback(async () => {
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExam(data);
        if (data.duration_minutes) {
          setDuration(String(data.duration_minutes));
        }
        if (data.window_start) {
          try {
            setStartTime(toLocalISO(new Date(data.window_start)));
          } catch {}
        }
        if (data.window_end) {
          try {
            setEndTime(toLocalISO(new Date(data.window_end)));
          } catch {}
        }
      }
    } catch {
      /* ignore */
    }
  }, [examId, token, router]);

  // Fetch already invited candidates
  const fetchCandidates = useCallback(async () => {
    if (!token) return;
    setLoadingCandidates(true);
    try {
      const res = await fetch(`${API_URL}/admin/exams/${examId}/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExistingCandidates(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingCandidates(false);
    }
  }, [examId, token]);

  useEffect(() => {
    fetchExam();
    fetchCandidates();
  }, [fetchExam, fetchCandidates]);

  const handleSend = async () => {
    const list = emailsText
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes("@"));

    if (list.length === 0) {
      setError("Please enter at least one valid email address.");
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    setSending(true);
    setError("");

    try {
      const payload = {
        candidate_emails: list,
        window_start: startTime ? new Date(startTime).toISOString() : undefined,
        window_end: endTime ? new Date(endTime).toISOString() : undefined,
        window_start_display: startTime ? formatDisplayDateTime(startTime) : undefined,
        window_end_display: endTime ? formatDisplayDateTime(endTime) : undefined,
        duration_minutes: parseInt(duration) || undefined,
        frontend_url: typeof window !== "undefined" ? window.location.origin : undefined,
      };

      const res = await fetch(`${API_URL}/admin/exams/${examId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail ?? `Failed to send invites (${res.status})`);
      }

      const data = await res.json();
      setDeliveryStats({
        sent: data.sent ?? 0,
        delivered: data.emails_delivered ?? 0,
        emailEnabled: Boolean(data.email_enabled),
      });
      setInvitations(data.invitations ?? []);
      setEmailsText("");
      // Refresh existing candidate roster
      fetchCandidates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dispatch invitations");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6 pb-20">
      {/* Back button */}
      <button
        onClick={() => router.push("/recruiter/exams")}
        className="flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Examination List</span>
      </button>

      {/* Title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Dispatch Candidate Exam Invitations
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Exam: <strong className="text-white">{exam?.title || examId}</strong>
          </p>
        </div>

        {exam && (
          <Link
            href={`/recruiter/exams/${examId}/edit`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium border border-white/10 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Question Paper</span>
          </Link>
        )}
      </div>

      {/* Draft Mode Warning if exam is not completed */}
      {exam && !exam.is_active && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-200">
              Question Paper is currently in Draft Mode
            </div>
            <p className="text-xs text-amber-300/80">
              The questions in this exam paper have not yet been marked as Complete. You can still pre-generate candidate invitations, but candidates cannot take the assessment until you open the question paper editor and click <strong>Mark as Complete</strong>.
            </p>
            <Link
              href={`/recruiter/exams/${examId}/edit`}
              className="inline-flex items-center gap-1.5 text-xs text-amber-200 underline font-semibold mt-1"
            >
              <span>Go to Question Paper Editor & Mark Complete</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── SCHEDULE & TIMING CARD ────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Exam Schedule & Candidate Timing</h2>
        </div>
        <p className="text-xs text-white/50">
          Set the exact examination window and duration. These values are saved to the exam and printed directly on candidate invitation emails.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>Exam Starts At *</span>
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Valid Until / Deadline *</span>
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Duration (Minutes) *</span>
            </label>
            <input
              type="number"
              min={5}
              max={300}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Live timing preview */}
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex flex-wrap items-center gap-4">
          <span>
            📅 <strong>Starts:</strong> {formatDisplayDateTime(startTime)}
          </span>
          <span>
            ⏳ <strong>Deadline:</strong> {formatDisplayDateTime(endTime)}
          </span>
          <span>
            ⏱️ <strong>Duration:</strong> {duration} Mins
          </span>
        </div>
      </div>

      {/* Email Input Card */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <label className="text-xs font-semibold text-white/70 block">
          Candidate Email Addresses (one per line, comma or semicolon separated):
        </label>
        <textarea
          rows={5}
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
          placeholder={`candidate1@example.com\ncandidate2@example.com\ncandidate3@example.com`}
          className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono outline-none focus:border-indigo-500"
        />

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-white/40">
            Real DB records will be created immediately for each candidate.
          </p>
          <button
            onClick={handleSend}
            disabled={sending || !emailsText.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating & Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Dispatch Exam Invitations</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Delivery Summary Banner */}
      {deliveryStats && (
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            {deliveryStats.emailEnabled && deliveryStats.delivered > 0 ? (
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Mail className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-white text-base">
                {deliveryStats.sent} Invitation Token{deliveryStats.sent !== 1 ? "s" : ""} Generated
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                {deliveryStats.emailEnabled && deliveryStats.delivered > 0
                  ? `Successfully sent ${deliveryStats.delivered} email(s) via SMTP server with Candidate Portal & Desktop App links.`
                  : "Access credentials & invitation links are available below for distribution."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Newly Generated Credentials Table */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/80">
              Newly Generated Candidate Credentials ({invitations.length})
            </h2>
            <button
              onClick={() => {
                const text = invitations
                  .map(
                    (inv) =>
                      `Candidate: ${inv.candidate_name}\nEmail/User: ${inv.username}\nPassword: ${inv.temp_password}\nPortal Link: ${inv.web_link || inv.deep_link}\n---`
                  )
                  .join("\n");
                copyToClipboard(text, "all-creds");
              }}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
            >
              {copiedKey === "all-creds" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === "all-creds" ? "All Copied!" : "Copy All Credentials"}</span>
            </button>
          </div>

          <div className="space-y-3">
            {invitations.map((inv, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-white flex items-center gap-2">
                      <span>{inv.candidate_name}</span>
                      <span className="text-xs text-white/40 font-mono">({inv.email})</span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                      inv.email_sent
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {inv.email_sent ? "Email Dispatched" : "Manual Share Ready"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Password row */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-white/40">Temporary Password:</span>
                      <span className="font-mono font-bold text-white">{inv.temp_password}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(inv.temp_password, `pwd-${idx}`)}
                      className="p-1 rounded text-white/40 hover:text-white"
                      title="Copy Password"
                    >
                      {copiedKey === `pwd-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Portal web link row */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-white/40 shrink-0">Portal Link:</span>
                      <span className="font-mono text-white/80 truncate">
                        {inv.web_link || inv.deep_link}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {inv.web_link && (
                        <a
                          href={inv.web_link}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded text-white/40 hover:text-white"
                          title="Open Portal in New Tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => copyToClipboard(inv.web_link || inv.deep_link, `link-${idx}`)}
                        className="p-1 rounded text-white/40 hover:text-white"
                        title="Copy Portal Link"
                      >
                        {copiedKey === `link-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previously Invited Candidates Section */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-white/60" />
            <h2 className="text-sm font-semibold text-white/80">
              Exam Candidate Roster ({existingCandidates.length})
            </h2>
          </div>
          <button
            onClick={fetchCandidates}
            className="text-xs text-white/40 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCandidates ? "animate-spin" : ""}`} />
            <span>Refresh Roster</span>
          </button>
        </div>

        {existingCandidates.length === 0 ? (
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-white/40">
            No candidates have been registered for this exam yet.
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.02] border-b border-white/10 text-white/40">
                <tr>
                  <th className="text-left p-3 font-semibold">Candidate Name</th>
                  <th className="text-left p-3 font-semibold">Email</th>
                  <th className="text-center p-3 font-semibold">Invite Status</th>
                  <th className="text-right p-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {existingCandidates.map((c, i) => {
                  const webLink =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/invite/${c.invite_token}`
                      : `/invite/${c.invite_token}`;
                  return (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-white font-medium">{c.name}</td>
                      <td className="p-3 text-white/60 font-mono">{c.email}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-white/70 border border-white/10 uppercase">
                          {c.invite_status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => copyToClipboard(webLink, `roster-${i}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-indigo-300 font-mono"
                        >
                          {copiedKey === `roster-${i}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedKey === `roster-${i}` ? "Copied" : "Copy Link"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
