import { Exam, Question, CandidateResult, Flag, LiveSession } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API request failed');
  }
  return res.json();
}

// Exams
export async function getExams(): Promise<Exam[]> {
  return fetcher<Exam[]>('/admin/exams');
}

export async function createExam(data: Partial<Exam>): Promise<Exam> {
  return fetcher<Exam>('/admin/exams', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addQuestion(examId: string, data: Partial<Question>): Promise<Question> {
  return fetcher<Question>(`/admin/exams/${examId}/questions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendInvites(examId: string, candidateEmails: string[]): Promise<{ sent: number }> {
  return fetcher<{ sent: number }>(`/admin/exams/${examId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ candidate_emails: candidateEmails }),
  });
}

export async function getExamResults(examId: string): Promise<CandidateResult[]> {
  return fetcher<CandidateResult[]>(`/admin/exams/${examId}/results`);
}

// Live Monitoring & Proctoring
export async function getActiveSessions(): Promise<LiveSession[]> {
  return fetcher<LiveSession[]>('/sessions/active');
}

export async function getSessionFlags(sessionId: string): Promise<Flag[]> {
  return fetcher<Flag[]>(`/sessions/${sessionId}/flags`);
}

export async function pauseSession(sessionId: string): Promise<void> {
  return fetcher<void>(`/sessions/${sessionId}/pause`, { method: 'POST' });
}

export async function resumeSession(sessionId: string): Promise<void> {
  return fetcher<void>(`/sessions/${sessionId}/resume`, { method: 'POST' });
}

export async function terminateSession(sessionId: string): Promise<void> {
  return fetcher<void>(`/sessions/${sessionId}/terminate`, { method: 'POST' });
}
