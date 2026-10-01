import { TokenResponse, LoginRequest, NextQuestionResponse, AnswerSubmit, Flag, Session, EvaluationResult, InviteValidateResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

// ─── Low-level fetch ──────────────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? 'API Error');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string, invite_token?: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, invite_token } as LoginRequest),
  });
}

export async function verifyOTP(code: string, token: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }, token);
}

export async function refreshToken(refresh_token: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  });
}

export async function validateInvite(token: string): Promise<InviteValidateResponse> {
  return apiFetch<InviteValidateResponse>(`/auth/invite/${token}`);
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function startSession(exam_id: string, token: string): Promise<Session> {
  return apiFetch<Session>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ exam_id }),
  }, token);
}

export async function getSession(sessionId: string, token: string): Promise<Session> {
  return apiFetch<Session>(`/sessions/${sessionId}`, {}, token);
}

export async function sendHeartbeat(sessionId: string, token: string): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({}),
  }, token);
}

export async function fetchNextQuestion(sessionId: string, token: string): Promise<NextQuestionResponse> {
  return apiFetch<NextQuestionResponse>(`/sessions/${sessionId}/next-question`, {}, token);
}

export async function submitAnswer(sessionId: string, answer: AnswerSubmit, token: string): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify(answer),
  }, token);
}

export async function submitExam(sessionId: string, token: string): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({}),
  }, token);
}

export async function getResult(sessionId: string, token: string): Promise<EvaluationResult> {
  return apiFetch<EvaluationResult>(`/sessions/${sessionId}/result`, {}, token);
}

// ─── Flags ────────────────────────────────────────────────────────────────────

export async function submitFlag(sessionId: string, flag: Omit<Flag, 'id' | 'flagged_at' | 'session_id'>, token: string): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/flags`, {
    method: 'POST',
    body: JSON.stringify(flag),
  }, token);
}

// ─── Identity ────────────────────────────────────────────────────────────────

export async function verifyFace(sessionId: string, imageBlob: Blob, token: string): Promise<{ match: boolean; confidence: number }> {
  const form = new FormData();
  form.append('image', imageBlob, 'selfie.jpg');
  form.append('session_id', sessionId);
  const res = await fetch(`${API_BASE}/identity/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error('Face verification failed');
  return res.json();
}
