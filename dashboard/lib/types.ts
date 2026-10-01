export type UserRole = 'candidate' | 'proctor' | 'recruiter' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  is_active?: boolean;
  window_start?: string;
  window_end?: string;
  created_at: string;
  candidate_count?: number;
}

export interface Question {
  id: string;
  exam_id: string;
  section: string;
  type: 'mcq' | 'numerical' | 'coding' | 'paragraph';
  text: string;
  options?: string[];
  correct_answer?: string;
  tolerance?: number;
  test_cases?: { input: string; expected_output: string }[];
  passage?: string;
  sub_questions?: any[];
  marks: number;
  negative_marks?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CandidateResult {
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  session_id: string;
  status: 'submitted' | 'active' | 'terminated';
  total_score: number;
  max_score: number;
  integrity_score: number;
  time_taken_seconds: number;
  flag_count: number;
  submitted_at: string;
}

export interface Flag {
  id: string;
  session_id: string;
  candidate_name?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  message: string;
  flagged_at: string;
}

export interface LiveSession {
  session_id: string;
  candidate_name: string;
  candidate_email: string;
  exam_title: string;
  status: 'active' | 'paused' | 'flagged';
  integrity_score: number;
  flag_count: number;
  start_time: string;
  last_flag?: string;
  latest_frame?: string;
}
