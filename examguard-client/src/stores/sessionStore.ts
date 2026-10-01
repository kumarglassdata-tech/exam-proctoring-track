import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TokenResponse, User, Candidate } from '../lib/types';

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  candidate: Candidate | null;
  sessionId: string | null;
  examId: string | null;
  inviteToken: string | null;

  setAuth: (data: TokenResponse) => void;
  setSessionId: (id: string) => void;
  setExamId: (id: string) => void;
  setInviteToken: (token: string) => void;
  clearAuth: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      candidate: null,
      sessionId: null,
      examId: null,
      inviteToken: null,

      setAuth: (data: TokenResponse) =>
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
          candidate: data.candidate,
        }),
      setSessionId: (id: string) => set({ sessionId: id }),
      setExamId: (id: string) => set({ examId: id }),
      setInviteToken: (token: string) => set({ inviteToken: token }),
      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          candidate: null,
          sessionId: null,
          examId: null,
        }),
    }),
    { name: 'examguard-session' }
  )
);
