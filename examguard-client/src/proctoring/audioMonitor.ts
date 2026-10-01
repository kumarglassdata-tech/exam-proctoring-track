/**
 * Audio monitor using Web Audio API
 * Monitors mic dB levels and fires voice activity flags
 */

import { useFlagStore } from '../stores/flagStore';
import { sendFlag } from '../lib/websocket';

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let stream: MediaStream | null = null;
let monitorInterval: ReturnType<typeof setInterval> | null = null;
let sessionId: string | null = null;

// Raised thresholds — only flag genuinely loud sounds
const SPIKE_DB_THRESHOLD = -20;   // dB — louder than normal breathing/ambient
const VOICE_DB_THRESHOLD = -25;   // dB — sustained speech-level sound
let voiceFrameCount = 0;
const VOICE_SUSTAINED_FRAMES = 14; // ~7 seconds at 500ms interval

// Per-type cooldown to avoid flag spam
const lastFlagTime: Record<string, number> = {};
const FLAG_COOLDOWN_MS: Record<string, number> = {
  audio_spike: 5000,    // max 1 spike flag per 5 seconds
  voice_detected: 10000, // max 1 voice flag per 10 seconds
};

export async function startAudioMonitor(sid: string): Promise<void> {
  sessionId = sid;

  stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const dataArray = new Float32Array(analyser.frequencyBinCount);

  monitorInterval = setInterval(() => {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(dataArray);

    // Compute RMS dB
    const rms = Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length);
    const db = 20 * Math.log10(Math.max(rms, 1e-6));

    if (db > SPIKE_DB_THRESHOLD) {
      _raiseFlag('audio_spike', 'medium', Math.min(1, (db + 60) / 60), `Audio spike: ${db.toFixed(1)} dB`);
    }

    if (db > VOICE_DB_THRESHOLD) {
      voiceFrameCount++;
      if (voiceFrameCount >= VOICE_SUSTAINED_FRAMES) {
        _raiseFlag('voice_detected', 'high', 0.9, 'Sustained voice activity detected');
        voiceFrameCount = 0; // Reset after flagging
      }
    } else {
      voiceFrameCount = 0;
    }
  }, 500);
}

function _raiseFlag(
  type: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  confidence: number,
  message: string
): void {
  if (!sessionId) return;

  // Cooldown check — avoid spamming the same flag type
  const now = Date.now();
  const cooldown = FLAG_COOLDOWN_MS[type] ?? 3000;
  if (lastFlagTime[type] && now - lastFlagTime[type] < cooldown) return;
  lastFlagTime[type] = now;

  const flag = {
    session_id: sessionId,
    type,
    severity,
    confidence,
    source: 'client_ai' as const,
    message,
    flagged_at: new Date().toISOString(),
  };
  useFlagStore.getState().addFlag(flag);
  sendFlag(flag);
}

export function stopAudioMonitor(): void {
  if (monitorInterval) clearInterval(monitorInterval);
  stream?.getTracks().forEach((t) => t.stop());
  audioCtx?.close();
  audioCtx = null;
  analyser = null;
  stream = null;
  monitorInterval = null;
}

// Returns current mic level 0-1 for UI visualization
export function getMicLevel(): number {
  if (!analyser) return 0;
  const data = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatTimeDomainData(data);
  const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);
  return Math.min(1, rms * 20); // Normalize to 0-1
}
