import { create } from 'zustand';
import { Flag, FlagType, FlagSeverity } from '../lib/types';

interface FlagState {
  flags: Flag[];
  integrityScore: number;
  addFlag: (flag: Omit<Flag, 'id'>) => void;
  clearFlags: () => void;
}

// Severity weights for integrity score deduction
const SEVERITY_DEDUCTIONS: Record<FlagSeverity, number> = {
  low: 1,
  medium: 3,
  high: 6,
  critical: 12,
};

export const useFlagStore = create<FlagState>((set) => ({
  flags: [],
  integrityScore: 100,

  addFlag: (flag) => {
    const deduction = SEVERITY_DEDUCTIONS[flag.severity] ?? 3;
    set((state) => ({
      flags: [...state.flags, { ...flag, id: crypto.randomUUID() }],
      integrityScore: Math.max(0, state.integrityScore - deduction),
    }));
  },

  clearFlags: () => set({ flags: [], integrityScore: 100 }),
}));

export const FLAG_MESSAGES: Record<FlagType, string> = {
  no_face: '⚠️ No face detected. Please stay in front of your camera.',
  multi_face: '🚨 Multiple faces detected. Ensure you are alone.',
  gaze_away: '👀 Please look at your screen.',
  audio_spike: '🎤 Unexpected noise detected. Please stay quiet.',
  voice_detected: '🔊 Voice detected. This is a silent exam.',
  focus_loss: '⚠️ Exam window lost focus. Do not switch windows.',
  alt_tab_attempt: '🚫 Alt+Tab is not allowed during the exam.',
  forbidden_app: '🚫 Forbidden application detected and closed.',
  multi_monitor: '🖥️ Additional monitor detected. Please disconnect it.',
  copy_paste_attempt: '📋 Copy/paste is disabled during the exam.',
  heartbeat_missed: '📡 Connection interrupted. Reconnecting...',
};
