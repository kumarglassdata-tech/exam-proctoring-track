// ─── Core Domain Types ─────────────────────────────────────────────────────

export type UserRole = 'candidate' | 'proctor' | 'recruiter' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Candidate {
  id: string;
  user_id: string;
  candidate_code: string;
  profile_photo_url?: string;
  device_fingerprint?: string;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  invite_token?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  candidate?: Candidate;
}

export interface OTPVerifyRequest {
  code: string;
}

// ─── Invite ─────────────────────────────────────────────────────────────────

export interface InviteValidateResponse {
  exam_title: string;
  candidate_name: string;
  username: string;
  exam_window_start: string;
  exam_window_end: string;
  duration_minutes: number;
  valid: boolean;
}

// ─── Exam & Questions ────────────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'numerical' | 'coding' | 'paragraph';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface TestCase {
  input: string;
  expected_output: string;
}

export interface SubQuestion {
  sub_type: 'short_answer' | 'mcq' | 'fill_blank';
  text: string;
  options?: string[];
  correct_answer?: string;
  model_answer?: string;
  similarity_threshold?: number;
  marks: number;
}

export interface Question {
  id: string;
  exam_id: string;
  section: string;
  type: QuestionType;
  text: string;
  // MCQ
  options?: string[];
  correct_answer?: string;
  // Numerical
  tolerance?: number;
  // Coding
  test_cases?: TestCase[];
  time_limit_ms?: number;
  memory_limit_mb?: number;
  allowed_languages?: string[];
  // Paragraph
  passage?: string;
  sub_questions?: SubQuestion[];
  // Scoring
  marks: number;
  negative_marks: number;
  difficulty: Difficulty;
}

export interface ExamSection {
  name: string;
  time_minutes: number;
  question_count: number;
}

export interface ExamSettings {
  negative_marking: boolean;
  randomize_order: boolean;
  forbidden_apps: string[];
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  sections: ExamSection[];
  settings: ExamSettings;
  window_start: string;
  window_end: string;
}

export interface NextQuestionResponse {
  question: Question;
  index: number;
  total: number;
  section: string;
  section_index: number;
  section_total: number;
  time_remaining_seconds: number;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export type SessionStatus = 'pending' | 'active' | 'paused' | 'submitted' | 'terminated';

export interface Session {
  id: string;
  candidate_id: string;
  exam_id: string;
  status: SessionStatus;
  start_time?: string;
  end_time?: string;
  integrity_score?: number;
  total_score?: number;
  exam?: Exam;
}

export interface AnswerSubmit {
  question_id: string;
  response: string;
  language_id?: number;
  time_taken_seconds: number;
}

// ─── Proctoring & Flags ─────────────────────────────────────────────────────

export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FlagSource = 'client_ai' | 'system' | 'proctor_manual';

export interface Flag {
  id?: string;
  session_id: string;
  type: string;
  severity: FlagSeverity;
  confidence?: number;
  evidence_ref?: string;
  source: FlagSource;
  message?: string;
  flagged_at: string;
}

export type FlagType =
  | 'no_face'
  | 'multi_face'
  | 'gaze_away'
  | 'audio_spike'
  | 'voice_detected'
  | 'focus_loss'
  | 'alt_tab_attempt'
  | 'forbidden_app'
  | 'multi_monitor'
  | 'copy_paste_attempt'
  | 'heartbeat_missed';

// ─── Results ─────────────────────────────────────────────────────────────────

export interface SectionScore {
  section: string;
  score: number;
  max_score: number;
}

export interface EvaluationResult {
  total_score: number;
  max_score: number;
  section_scores: Record<string, { score: number; max: number }>;
  integrity_score: number;
  flag_count: number;
}

// ─── Running Process ─────────────────────────────────────────────────────────

export interface RunningProcess {
  name: string;
  pid: number;
  is_forbidden: boolean;
  category?: string;
}

// ─── WebSocket Messages ───────────────────────────────────────────────────────

export type WsMessageType =
  | 'flag_ack'
  | 'session_paused'
  | 'session_resumed'
  | 'session_terminated'
  | 'proctor_message'
  | 'eval_complete';

export interface WsMessage {
  type: WsMessageType;
  payload: Record<string, unknown>;
}
