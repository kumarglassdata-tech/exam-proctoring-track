import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import { useExamStore } from '../stores/examStore';
import { useSessionStore } from '../stores/sessionStore';
import { useFlagStore } from '../stores/flagStore';
import { Question } from '../lib/types';
import Timer from '../components/Timer';
import WebcamBubble from '../components/WebcamBubble';
import AlertToast from '../components/AlertToast';
import IntegrityBadge from '../components/IntegrityBadge';
import MCQQuestion from '../question-types/MCQQuestion';
import NumericalQuestion from '../question-types/NumericalQuestion';
import CodingQuestion from '../question-types/CodingQuestion';
import DescriptiveQuestion from '../question-types/DescriptiveQuestion';

interface ExamScreenProps {
  onSubmit: () => void;
}

// Default questions if running standalone or awaiting server feed
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    exam_id: 'e1',
    section: 'Aptitude & Problem Solving',
    type: 'mcq',
    text: 'A car travels a certain distance at 60 km/h and returns at 40 km/h. What is the average speed for the entire journey?',
    options: ['48 km/h', '50 km/h', '52 km/h', '45 km/h'],
    correct_answer: 'A',
    marks: 2,
    negative_marks: 0.5,
    difficulty: 'easy',
  },
  {
    id: 'q2',
    exam_id: 'e1',
    section: 'Mathematics & Algorithms',
    type: 'numerical',
    text: 'Evaluate the limit as x approaches 0: $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$',
    correct_answer: '3',
    tolerance: 0.01,
    marks: 3,
    negative_marks: 0,
    difficulty: 'medium',
  },
  {
    id: 'q3',
    exam_id: 'e1',
    section: 'Coding & Data Structures',
    type: 'coding',
    text: 'Write a function that takes an integer n and returns true if it is a prime number, or false otherwise.',
    test_cases: [
      { input: '7', expected_output: 'true' },
      { input: '10', expected_output: 'false' },
      { input: '2', expected_output: 'true' },
    ],
    time_limit_ms: 1000,
    marks: 10,
    negative_marks: 0,
    difficulty: 'medium',
  },
  {
    id: 'q4',
    exam_id: 'e1',
    section: 'System Design & Analysis',
    type: 'descriptive',
    text: 'Explain the trade-offs between SQL and NoSQL databases. In your answer, discuss consistency, scalability, schema flexibility, and when you would choose one over the other in a real-world system design.',
    min_words: 80,
    max_words: 400,
    model_answer: 'SQL databases offer ACID compliance, strong consistency, and structured schema suited for relational data. NoSQL databases provide horizontal scalability, flexible schema, and high availability at the cost of eventual consistency. SQL is preferred for financial systems or complex joins; NoSQL for large-scale, high-throughput applications like social feeds or real-time analytics.',
    marks: 8,
    negative_marks: 0,
    difficulty: 'medium',
  },
];

export default function ExamScreen({ onSubmit }: ExamScreenProps) {
  const [questions] = useState<Question[]>(SAMPLE_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  const [showConfirm, setShowConfirm] = useState(false);

  const sessionId = useSessionStore((s) => s.sessionId) || 'live-session-1';
  const addFlag = useFlagStore((s) => s.addFlag);

  const currentQ = questions[currentIndex];

  // ── Engage lockdown the moment ExamScreen mounts ─────────────────────────
  useEffect(() => {
    invoke('engage_lockdown').catch(() => {
      // Falls back gracefully if running in browser (non-Tauri) during dev
    });
    return () => {
      // unlock is called only after submission, not here
    };
  }, []);

  // ── Auto-recapture focus — prevents switching to other apps ──────────────
  useEffect(() => {
    let refocusTimer: ReturnType<typeof setTimeout> | null = null;

    const handleBlur = () => {
      // Flag the focus loss
      addFlag({
        session_id: sessionId,
        type: 'focus_loss',
        severity: 'high',
        source: 'system',
        message: 'Exam window lost focus / Alt-Tab attempted',
        flagged_at: new Date().toISOString(),
      });

      // Force window back to front via Tauri after 80ms
      refocusTimer = setTimeout(() => {
        invoke('refocus_window').catch(() => {});
      }, 80);
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
      if (refocusTimer) clearTimeout(refocusTimer);
    };
  }, [sessionId, addFlag]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          onSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onSubmit]);

  const handleAnswer = (val: any) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
  };

  return (
    <div
      style={styles.container}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      <AlertToast />

      {/* Top Header Bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>🛡️ ExamGuard</div>
          <div style={styles.divider} />
          <div style={styles.sectionBadge}>{currentQ.section}</div>
        </div>

        <div style={styles.headerRight}>
          <IntegrityBadge />
          <Timer seconds={timeLeft} />
          <WebcamBubble sessionId={sessionId} />
        </div>
      </header>

      {/* Main Examination Workspace */}
      <main style={styles.main}>
        {/* Question content card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.qCounter}>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span style={styles.marksBadge}>+{currentQ.marks} marks</span>
          </div>

          <div style={styles.cardBody}>
            {currentQ.type === 'mcq' && (
              <MCQQuestion
                question={currentQ}
                selectedAnswer={answers[currentQ.id] || ''}
                onSelect={handleAnswer}
              />
            )}
            {currentQ.type === 'numerical' && (
              <NumericalQuestion
                question={currentQ}
                value={answers[currentQ.id] || ''}
                onChange={handleAnswer}
              />
            )}
            {currentQ.type === 'coding' && (
              <CodingQuestion
                question={currentQ}
                code={answers[currentQ.id] || ''}
                onChange={handleAnswer}
              />
            )}
            {currentQ.type === 'descriptive' && (
              <DescriptiveQuestion
                question={currentQ}
                value={answers[currentQ.id] || ''}
                onChange={handleAnswer}
              />
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <footer style={styles.footer}>
        <div style={styles.navRow}>
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            style={{ ...styles.navBtn, opacity: currentIndex === 0 ? 0.3 : 1 }}
          >
            ← Previous
          </button>

          {/* Quick jump pills */}
          <div style={styles.pills}>
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    ...styles.pill,
                    borderColor: isCurrent ? '#6366f1' : 'transparent',
                    background: isCurrent ? '#4f46e5' : isAnswered ? '#10b981' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              style={styles.navBtn}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              style={styles.submitBtn}
            >
              Submit Exam ✓
            </button>
          )}
        </div>
      </footer>

      {/* Submit Confirmation Modal */}
      {showConfirm && (
        <div style={styles.modalOverlay}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.modal}>
            <h3 style={{ margin: '0 0 12px', fontSize: 20 }}>Submit Examination?</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 24px' }}>
              You have answered {Object.keys(answers).length} of {questions.length} questions.
              Once submitted, your responses will be evaluated automatically and your session will close.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} style={styles.cancelBtn}>Return to Exam</button>
              <button onClick={onSubmit} style={styles.confirmSubmitBtn}>Yes, Submit Now</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0f', userSelect: 'none' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 17, 23, 0.8)', backdropFilter: 'blur(12px)', zIndex: 10 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: { fontSize: 18, fontWeight: 800, color: '#a5b4fc', letterSpacing: '-0.5px' },
  divider: { width: 1, height: 20, background: 'rgba(255,255,255,0.1)' },
  sectionBadge: { fontSize: 13, color: '#e5e7eb', fontWeight: 600 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  main: { flex: 1, padding: 20, overflowY: 'auto', display: 'flex', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 1100, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' },
  qCounter: { fontSize: 14, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px' },
  marksBadge: { fontSize: 12, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 20 },
  cardBody: { flex: 1, padding: 24, overflowY: 'auto' },
  footer: { borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 24px', background: 'rgba(15, 17, 23, 0.8)', backdropFilter: 'blur(12px)' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1100, margin: '0 auto' },
  navBtn: { padding: '10px 20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  pills: { display: 'flex', gap: 8 },
  pill: { width: 34, height: 34, borderRadius: 8, border: '1px solid', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  submitBtn: { padding: '10px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { width: '100%', maxWidth: 460, background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28 },
  cancelBtn: { padding: '10px 18px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14 },
  confirmSubmitBtn: { padding: '10px 20px', background: '#10b981', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
};
