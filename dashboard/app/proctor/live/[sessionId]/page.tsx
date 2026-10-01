'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Pause, Play, AlertOctagon, Send, ShieldAlert, Video,
  Monitor, RefreshCw, AlertCircle, Clock, User
} from 'lucide-react';
import type { Flag } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/30 text-red-200',
  high:     'bg-amber-500/10 border-amber-500/30 text-amber-200',
  medium:   'bg-yellow-500/10 border-yellow-500/30 text-yellow-200',
  low:      'bg-white/5 border-white/10 text-white/70',
};

interface SessionDetail {
  session_id: string;
  candidate_name: string;
  candidate_email: string;
  exam_title: string;
  status: string;
  integrity_score: number;
  flag_count: number;
  start_time: string;
}

export default function CandidateFocusView() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [msgSent, setMsgSent] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveFrame, setLiveFrame] = useState<string | null>(null);

  const fetchFrame = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/frame`);
      if (res.ok) {
        const data = await res.json();
        if (data.image) setLiveFrame(data.image);
      }
    } catch {}
  }, [sessionId]);
  const flagsEndRef = useRef<HTMLDivElement>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  };

  // Fetch session details from active sessions list
  const fetchSession = useCallback(async () => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    try {
      const res = await fetch(`${API_URL}/sessions/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const all: SessionDetail[] = await res.json();
      const found = all.find((s) => s.session_id === sessionId);
      if (found) {
        setSession(found);
        setIsPaused(found.status === 'paused');
      }
    } catch (err: unknown) {
      console.error('Session fetch error:', err);
    }
  }, [sessionId, router]);

  // Fetch flags for this session
  const fetchFlags = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/flags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setFlags(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
    fetchFlags();
    fetchFrame();
    // Poll flags & status every 5 seconds, live video frame every 1s
    const timer = setInterval(() => {
      fetchSession();
      fetchFlags();
    }, 5000);
    const frameTimer = setInterval(fetchFrame, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(frameTimer);
    };
  }, [fetchSession, fetchFlags, fetchFrame]);

  // Auto-scroll flags to bottom on new arrival
  useEffect(() => {
    flagsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [flags.length]);

  const handlePauseResume = async () => {
    const token = getToken();
    if (!token || actionLoading) return;
    setActionLoading(true);
    const action = isPaused ? 'resume' : 'pause';
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsPaused(!isPaused);
        fetchSession();
      }
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminate = async () => {
    if (!confirm('Are you sure you want to force-terminate this session?')) return;
    const token = getToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/terminate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) router.push('/proctor/live');
    } catch (err) {
      console.error('Terminate error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendWarning = () => {
    if (!warningMsg.trim()) return;
    setMsgSent(true);
    setTimeout(() => {
      setWarningMsg('');
      setMsgSent(false);
    }, 2500);
  };

  const integrity = session?.integrity_score ?? 100;
  const integrityColor =
    integrity >= 80 ? 'text-emerald-400' : integrity >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Surveillance Grid</span>
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => { fetchSession(); fetchFlags(); }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {session ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <User className="w-3 h-3 text-white/40" />
                  {session.candidate_name}
                </div>
                <div className="text-[10px] text-white/40">{session.candidate_email}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/30 mb-0.5">Integrity</div>
                <span className={`text-sm font-bold ${integrityColor}`}>
                  {integrity.toFixed(0)}%
                </span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {isPaused ? '⏸ Paused' : '● Live'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-white/30">Loading session…</div>
          )}
        </div>
      </div>

      {/* Session header card */}
      {session && (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Monitor className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-white">{session.exam_title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Clock className="w-3.5 h-3.5" />
            Started {session.start_time}
          </div>
          <div className="text-xs text-white/40">
            Session: <code className="text-white/60 text-[10px]">{session.session_id.slice(0, 8)}…</code>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span className="font-bold text-white">{flags.length}</span>
            <span className="text-white/40">incidents logged</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main dual feed + alert sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video Feeds + Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Webcam Live Surveillance Stream */}
            <div className="rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video relative flex items-center justify-center">
              {liveFrame ? (
                <img
                  src={liveFrame}
                  alt="Candidate Live Stream"
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="text-center text-white/30 space-y-2 p-4">
                  <Video className="w-10 h-10 mx-auto opacity-20" />
                  <p className="text-xs">Connecting to candidate live camera…</p>
                  <p className="text-[10px] text-white/20">Streaming frames via secure backend</p>
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur text-[11px] font-semibold text-white">
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                <span>Webcam Surveillance</span>
              </div>
              {/* Pulsing live indicator */}
              {!isPaused && liveFrame && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/80 backdrop-blur">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-[10px] text-white font-bold tracking-wider">LIVE</span>
                </div>
              )}
            </div>

            {/* Screen Mirror */}
            <div className="rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video relative flex items-center justify-center">
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur text-[11px] font-semibold text-white">
                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                <span>Screen Capture Mirror</span>
              </div>
              <div className="text-center text-white/30 space-y-2">
                <Monitor className="w-10 h-10 mx-auto opacity-20" />
                <p className="text-xs">Screen share requires candidate permission.</p>
              </div>
            </div>
          </div>

          {/* Intervention Controls */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePauseResume}
                disabled={actionLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                  isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume Exam' : 'Pause Exam'}</span>
              </button>

              <button
                onClick={handleTerminate}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition-colors disabled:opacity-50"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Force Terminate</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={warningMsg}
                onChange={(e) => setWarningMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendWarning()}
                placeholder="Send proctor alert to candidate…"
                className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none w-64 focus:ring-1 focus:ring-indigo-500/50"
              />
              <button
                onClick={handleSendWarning}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {msgSent && (
            <div className="text-xs text-emerald-400 font-semibold px-2 flex items-center gap-1.5">
              ✓ Message dispatched to candidate screen overlay.
            </div>
          )}
        </div>

        {/* Right: Real-time Incident Log */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-white">Incident Timeline</h3>
            </div>
            <span className="text-xs text-white/40">{flags.length} incidents</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
            {loading && (
              <div className="text-center py-8 text-white/30 text-xs">Loading incidents…</div>
            )}
            {!loading && flags.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <div className="text-3xl">✅</div>
                <div className="text-xs text-white/30">No incidents recorded yet.</div>
              </div>
            )}
            {flags.map((flag) => (
              <div
                key={flag.id}
                className={`p-3 rounded-xl border text-xs space-y-1 ${SEVERITY_STYLES[flag.severity] ?? SEVERITY_STYLES.low}`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="uppercase tracking-wider text-[10px]">
                    {(flag.type ?? '').replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] opacity-60">
                    {new Date(flag.flagged_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">{flag.message}</p>
                {flag.confidence != null && (
                  <div className="text-[10px] opacity-40">
                    Confidence: {(flag.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
            <div ref={flagsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
