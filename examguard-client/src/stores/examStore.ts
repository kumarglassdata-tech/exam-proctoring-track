import { create } from 'zustand';
import { Question, NextQuestionResponse, AnswerSubmit } from '../lib/types';

export interface EvaluatedResults {
  scoreObtained: number;
  totalMaxMarks: number;
  percentage: number;
  answeredCount: number;
  totalQuestions: number;
  sectionBreakdown: Array<{
    section: string;
    obtained: number;
    total: number;
    percentage: number;
  }>;
}

interface ExamState {
  currentQuestion: Question | null;
  currentIndex: number;
  totalQuestions: number;
  currentSection: string;
  sectionIndex: number;
  sectionTotal: number;
  timeRemainingSeconds: number;
  answers: Record<string, AnswerSubmit>;
  questionStartTime: number;
  isLockdownActive: boolean;
  evaluatedResults: EvaluatedResults | null;

  setNextQuestion: (data: NextQuestionResponse) => void;
  saveAnswer: (questionId: string, response: string, languageId?: number) => void;
  setEvaluatedResults: (results: EvaluatedResults) => void;
  tick: () => void;
  setTimeRemaining: (t: number) => void;
  activateLockdown: () => void;
  deactivateLockdown: () => void;
  reset: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  currentQuestion: null,
  currentIndex: 0,
  totalQuestions: 0,
  currentSection: '',
  sectionIndex: 0,
  sectionTotal: 0,
  timeRemainingSeconds: 0,
  answers: {},
  questionStartTime: Date.now(),
  isLockdownActive: false,
  evaluatedResults: null,
  setEvaluatedResults: (results: EvaluatedResults) => set({ evaluatedResults: results }),


  setNextQuestion: (data: NextQuestionResponse) =>
    set({
      currentQuestion: data.question,
      currentIndex: data.index,
      totalQuestions: data.total,
      currentSection: data.section,
      sectionIndex: data.section_index,
      sectionTotal: data.section_total,
      timeRemainingSeconds: data.time_remaining_seconds,
      questionStartTime: Date.now(),
    }),

  saveAnswer: (questionId: string, response: string, languageId?: number) => {
    const timeTaken = Math.floor((Date.now() - get().questionStartTime) / 1000);
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: {
          question_id: questionId,
          response,
          language_id: languageId,
          time_taken_seconds: timeTaken,
        },
      },
    }));
  },

  tick: () =>
    set((state) => ({
      timeRemainingSeconds: Math.max(0, state.timeRemainingSeconds - 1),
    })),

  setTimeRemaining: (t: number) => set({ timeRemainingSeconds: t }),
  activateLockdown: () => set({ isLockdownActive: true }),
  deactivateLockdown: () => set({ isLockdownActive: false }),
  reset: () =>
    set({
      currentQuestion: null,
      currentIndex: 0,
      totalQuestions: 0,
      answers: {},
      timeRemainingSeconds: 0,
      isLockdownActive: false,
    }),
}));
