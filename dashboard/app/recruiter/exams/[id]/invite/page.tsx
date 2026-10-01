"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Send, CheckCircle2, Copy, AlertCircle, ArrowLeft,
  Mail, Key, Link2, ExternalLink, Loader2, Check,
  AlertTriangle, UserCheck, RefreshCw, Edit3
} from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface InvitationResult {
  email: string;
  candidate_name: string;
  username: string;
  temp_password: string;
  token: string;
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

export default function InviteCandidatesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = params.id;

  const [exam, setExam] = useState<{ id: string; title: string; is_active: boolean } | null>(null);
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
      const res = await fetch(`${API_URL}/admin/exams/${examId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ candidate_emails: list }),
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

      {/* Deep Link Information Banner */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs leading-relaxed space-y-2">
        <div className="font-semibold text-indigo-200 flex items-center gap-1.5">
          <span>⚡ Smart Deep-Linking Enabled (examguard://login?token=...)</span>
        </div>
        <p>
          Each candidate receives a secure one-time token, temporary password, and smart deep link. Clicking the link will launch the desktop <span className="font-mono text-white">ExamGuard</span> application directly with their credentials pre-filled.
        </p>
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
                  ? `Successfully sent ${deliveryStats.delivered} email(s) via SMTP server.`
                  : "SMTP email is not configured in backend/.env. Access credentials & deep links are available below for distribution."}
              </p>
            </div>
          </div>

          {!deliveryStats.emailEnabled && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between">
              <span>
                💡 <strong>To enable automated Gmail sending:</strong> add <code className="bg-black/40 px-1.5 py-0.5 rounded text-white">SMTP_USER</code> and <code className="bg-black/40 px-1.5 py-0.5 rounded text-white">SMTP_PASS</code> (App Password) in <code className="bg-black/40 px-1.5 py-0.5 rounded text-white">backend/.env</code> and set <code className="bg-black/40 px-1.5 py-0.5 rounded text-white">EMAIL_ENABLED=True</code>.
              </span>
            </div>
          )}
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
                      `Candidate: ${inv.candidate_name}\nEmail/User: ${inv.username}\nPassword: ${inv.temp_password}\nDeep Link: ${inv.deep_link}\n---`
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

                  {/* Deep link row */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-white/40 shrink-0">App Link:</span>
                      <span className="font-mono text-white/80 truncate">{inv.deep_link}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(inv.deep_link, `link-${idx}`)}
                      className="p-1 rounded text-white/40 hover:text-white shrink-0 ml-2"
                      title="Copy Deep Link"
                    >
                      {copiedKey === `link-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
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
                {existingCandidates.map((c, i) => (
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
                        onClick={() =>
                          copyToClipboard(
                            `examguard://login?token=${c.invite_token}`,
                            `roster-${i}`
                          )
                        }
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
