"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Shield, CheckCircle2, Copy, Check, ExternalLink,
  Clock, Calendar, AlertTriangle, Video, Lock, Loader2,
  Sparkles, Key
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface InviteData {
  valid: boolean;
  token: string;
  exam_id: string;
  exam_title: string;
  duration_minutes: number;
  exam_window_start?: string;
  exam_window_end?: string;
  candidate_name: string;
  username: string;
  status: string;
}

export default function CandidateInvitePortal() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<InviteData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchInvite() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/auth/invite/${token}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail ?? "Invalid or expired invitation token.");
        }
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load invitation details.");
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [token]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLaunchApp = () => {
    if (!token) return;
    setLaunching(true);
    const deepLink = `examguard://login?token=${token}`;
    window.location.href = deepLink;
    setTimeout(() => setLaunching(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-white/60 text-sm">Verifying invitation access...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white/[0.03] border border-red-500/20 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Invitation Not Found</h1>
          <p className="text-sm text-white/50">{error || "This invitation link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col items-center justify-center p-4 py-12">
      <div className="max-w-xl w-full space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ExamGuard</h1>
            <p className="text-xs text-indigo-400 font-medium">Candidate Examination Portal</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Invitation Confirmed</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{data.exam_title}</h2>
            <p className="text-sm text-white/60">
              Welcome, <strong className="text-white">{data.candidate_name}</strong>. You have been scheduled to take this assessment.
            </p>
          </div>

          {/* Schedule & Timing Info */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-black/40 border border-white/5 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-white/40 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>Duration</span>
              </div>
              <div className="text-base font-bold text-indigo-300">{data.duration_minutes} Mins</div>
            </div>

            <div className="space-y-1 border-x border-white/5 px-2">
              <div className="flex items-center justify-center gap-1 text-white/40 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                <span>Start Time</span>
              </div>
              <div className="text-xs font-bold text-emerald-400 leading-tight">
                {data.exam_window_start || "Available Now"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-white/40 text-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Proctoring</span>
              </div>
              <div className="text-xs font-bold text-amber-300">AI + Kiosk</div>
            </div>
          </div>

          {/* Credentials Box */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Your Exam Login Credentials
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="text-xs">
                  <span className="text-white/40 block">Email / Username:</span>
                  <span className="font-mono font-semibold text-white">{data.username}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(data.username, "user")}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  {copiedKey === "user" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="text-xs">
                  <span className="text-white/40 block">One-Time Token:</span>
                  <span className="font-mono font-semibold text-indigo-300 truncate max-w-[280px] block">
                    {data.token}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(data.token, "token")}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  {copiedKey === "token" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Primary Action: Launch App */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleLaunchApp}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-indigo-200" />
              <span>Launch ExamGuard Desktop App</span>
            </button>

            {launching && (
              <p className="text-xs text-center text-amber-300 animate-pulse">
                Sending launch command to ExamGuard desktop app...
              </p>
            )}

            <p className="text-xs text-center text-white/40 leading-relaxed">
              If the app doesn't open automatically, open <strong>ExamGuard</strong> from your Start Menu / desktop and paste your credentials above.
            </p>
          </div>

          {/* Pre-Exam Checklist */}
          <div className="pt-4 border-t border-white/5 space-y-2.5 text-xs text-white/50">
            <div className="font-semibold text-white/70">Before you begin:</div>
            <div className="flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Ensure your webcam and microphone are connected and permitted.</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Close background applications (Discord, WhatsApp, Zoom, etc.).</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Full-screen kiosk mode will be engaged during the assessment.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
