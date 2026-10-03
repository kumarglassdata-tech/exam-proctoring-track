import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
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
    text: 'Evaluate the limit as x approaches 0: \\lim_{x \\to 0} \\frac{\\sin(3x)}{x}',
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
    text: 'Write a Python function `solution(nums, target)` that returns the indices of the two numbers such that they add up to target.',
    test_cases: [
      { input: '[2, 7, 11, 15], 9', expected_output: '[0, 1]' },
      { input: '[3, 2, 4], 6', expected_output: '[1, 2]' },
      { input: '[3, 3], 6', expected_output: '[0, 1]' },
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
    text: 'Explain the trade-offs between SQL and NoSQL databases. In your answer, discuss consistency, scalability, schema flexibility, and real-world system design choices.',
    min_words: 50,
    max_words: 400,
    model_answer: 'SQL databases offer ACID compliance and relational structure. NoSQL provides horizontal scalability and schema flexibility.',
    marks: 8,
    negative_marks: 0,
    difficulty: 'medium',
  },
];

export default function ExamScreen({ onSubmit }: ExamScreenProps) {
  const [questions] = useState<Question[]>(SAMPLE_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({ q1: true });
  const [timeLeft, setTimeLeft] = useState(3600); // 60 mins
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPaletteDrawer, setShowPaletteDrawer] = useState(false);

  const sessionId = useSessionStore((s) => s.sessionId) || 'live-session-1';
  const examDetails = (useExamStore as any).getState?.()?.currentExam;
  const addFlag = useFlagStore((s) => s.addFlag);

  const companyLogo = examDetails?.settings?.company_logo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  const companyName = examDetails?.settings?.company_name || 'ACME GLOBAL TECH';

  const currentQ = questions[currentIndex];

  useEffect(() => {
    invoke('engage_lockdown').catch(() => {});
  }, []);

  useEffect(() => {
    let refocusTimer: ReturnType<typeof setTimeout> | null = null;
    const handleBlur = () => {
      addFlag({
        session_id: sessionId,
        type: 'focus_loss',
        severity: 'high',
        source: 'system',
        message: 'Exam window lost focus / Alt-Tab attempted',
        flagged_at: new Date().toISOString(),
      });
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

  const handleSelectQuestion = (index: number) => {
    setCurrentIndex(index);
    setVisited((prev) => ({ ...prev, [questions[index].id]: true }));
  };

  const handleAnswer = (val: any) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
  };

  const toggleMarkForReview = () => {
    setMarkedForReview((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  // Stats calculation for CBT review palette
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div
      style={styles.container}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* Low Opacity Watermark of Company Logo */}
      <div style={styles.watermarkContainer}>
        <div style={styles.watermarkGrid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={styles.watermarkItem}>
              {companyLogo && (
                <img
                  src={companyLogo}
                  alt="Watermark"
                  style={styles.watermarkImg}
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                />
              )}
              <span style={styles.watermarkText}>{companyName}</span>
            </div>
          ))}
        </div>
      </div>

      <AlertToast />

      {/* Top Header Bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoBadge}>
            <img src={companyLogo} alt="Logo" style={styles.logoIcon} />
            <span style={styles.logoTitle}>{companyName}</span>
          </div>
          <div style={styles.divider} />
          <div style={styles.sectionBadge}>
            Section: <span>{currentQ.section}</span>
          </div>
        </div>

        <div style={styles.headerRight}>
          <IntegrityBadge />
          <Timer seconds={timeLeft} />
          <WebcamBubble sessionId={sessionId} />
        </div>
      </header>

      {/* Main Examination Grid */}
      <main style={styles.main}>
        {/* Left / Main Question Area */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.qMetaLeft}>
              <span style={styles.qCounter}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span style={styles.typeTag}>{(currentQ.type || 'MCQ').toUpperCase()}</span>
            </div>

            <div style={styles.qMetaRight}>
              <button
                onClick={toggleMarkForReview}
                style={{
                  ...styles.markBtn,
                  background: markedForReview[currentQ.id] ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                  color: markedForReview[currentQ.id] ? '#000' : '#f59e0b',
                  borderColor: '#f59e0b',
                }}
              >
                {markedForReview[currentQ.id] ? '★ Marked for Review' : '☆ Mark for Review'}
              </button>
              <span style={styles.marksBadge}>+{currentQ.marks} Marks</span>
            </div>
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

        {/* Right CBT Question Navigation Palette */}
        <aside style={styles.cbtPalette}>
          <div style={styles.paletteTitle}>Question Review Palette</div>

          {/* Status Counter Chips */}
          <div style={styles.legendGrid}>
            <div style={{ ...styles.legendItem, borderColor: '#10b981' }}>
              <span style={{ ...styles.legendDot, background: '#10b981' }} />
              <span style={styles.legendText}>Answered: {answeredCount}</span>
            </div>
            <div style={{ ...styles.legendItem, borderColor: '#f59e0b' }}>
              <span style={{ ...styles.legendDot, background: '#f59e0b' }} />
              <span style={styles.legendText}>Review: {markedCount}</span>
            </div>
            <div style={{ ...styles.legendItem, borderColor: 'rgba(255,255,255,0.2)' }}>
              <span style={{ ...styles.legendDot, background: 'rgba(255,255,255,0.2)' }} />
              <span style={styles.legendText}>Unanswered: {unansweredCount}</span>
            </div>
          </div>

          <div style={styles.gridHeader}>Question Palette Grid:</div>

          <div style={styles.questionGrid}>
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAns = answers[q.id] !== undefined && answers[q.id] !== '';
              const isMarked = markedForReview[q.id];
              const isVis = visited[q.id];

              let bg = 'rgba(255, 255, 255, 0.05)';
              let border = 'rgba(255, 255, 255, 0.15)';
              let textColor = 'rgba(255, 255, 255, 0.6)';

              if (isMarked) {
                bg = '#f59e0b';
                border = '#f59e0b';
                textColor = '#000';
              } else if (isAns) {
                bg = '#10b981';
                border = '#10b981';
                textColor = '#fff';
              } else if (isVis) {
                bg = 'rgba(239, 68, 68, 0.15)';
                border = 'rgba(239, 68, 68, 0.4)';
                textColor = '#ef4444';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuestion(idx)}
                  style={{
                    ...styles.gridBtn,
                    background: bg,
                    borderColor: isCurrent ? '#818cf8' : border,
                    boxShadow: isCurrent ? '0 0 10px rgba(129, 140, 248, 0.6)' : 'none',
                    color: textColor,
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button onClick={() => setShowConfirm(true)} style={styles.reviewSummaryBtn}>
            📋 Review Attempted & Submit
          </button>
        </aside>
      </main>

      {/* Bottom Action Footer */}
      <footer style={styles.footer}>
        <div style={styles.navRow}>
          <button
            onClick={() => handleSelectQuestion(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{ ...styles.navBtn, opacity: currentIndex === 0 ? 0.4 : 1 }}
          >
            ← Previous
          </button>

          <div style={styles.quickStats}>
            <span>
              Attempted: <strong style={{ color: '#10b981' }}>{answeredCount}</strong> / {totalQuestions}
            </span>
          </div>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => handleSelectQuestion(Math.min(questions.length - 1, currentIndex + 1))}
              style={{ ...styles.navBtn, background: '#4f46e5', borderColor: '#4f46e5' }}
            >
              Next Question →
            </button>
          ) : (
            <button onClick={() => setShowConfirm(true)} style={styles.submitBtn}>
              Submit Final Exam ✓
            </button>
          )}
        </div>
      </footer>

      {/* CBT Attempted Review & Confirmation Modal */}
      {showConfirm && (
        <div style={styles.modalOverlay}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.modal}>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, color: '#fff' }}>Exam Submission Review</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 16px' }}>
              Please review your question attempts before final submission.
            </p>

            <div style={styles.reviewSummaryCard}>
              <div style={styles.summaryRow}>
                <span>Total Questions:</span>
                <strong>{totalQuestions}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Answered Questions:</span>
                <strong style={{ color: '#10b981' }}>{answeredCount}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Marked for Review:</span>
                <strong style={{ color: '#f59e0b' }}>{markedCount}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Unattempted / Skipped:</span>
                <strong style={{ color: '#ef4444' }}>{unansweredCount}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowConfirm(false)} style={styles.cancelBtn}>
                Back to Questions
              </button>
              <button onClick={onSubmit} style={styles.confirmSubmitBtn}>
                Confirm & Submit Exam
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#090a10',
    color: '#fff',
    overflow: 'hidden',
    userSelect: 'none',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    opacity: 0.05,
    zIndex: 1,
    overflow: 'hidden',
  },
  watermarkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 120,
    transform: 'rotate(-25deg) scale(1.3)',
    marginTop: -50,
  },
  watermarkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  watermarkImg: {
    width: 60,
    height: 60,
    objectFit: 'contain',
    filter: 'grayscale(100%) brightness(200%)',
  },
  watermarkText: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: '2px',
    color: '#ffffff',
    whiteSpace: 'nowrap',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15, 17, 26, 0.85)',
    backdropFilter: 'blur(12px)',
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    objectFit: 'contain',
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#a5b4fc',
    letterSpacing: '-0.3px',
  },
  divider: {
    width: 1,
    height: 20,
    background: 'rgba(255,255,255,0.12)',
  },
  sectionBadge: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 600,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  main: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    gap: 16,
    padding: 16,
    overflow: 'hidden',
    zIndex: 5,
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.2)',
  },
  qMetaLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  qCounter: {
    fontSize: 13,
    fontWeight: 800,
    color: '#818cf8',
    textTransform: 'uppercase',
  },
  typeTag: {
    fontSize: 10,
    fontWeight: 800,
    background: 'rgba(255,255,255,0.08)',
    padding: '2px 8px',
    borderRadius: 6,
    color: 'rgba(255,255,255,0.6)',
  },
  qMetaRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  markBtn: {
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  marksBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: '#10b981',
    background: 'rgba(16,185,129,0.12)',
    padding: '4px 10px',
    borderRadius: 20,
  },
  cardBody: {
    flex: 1,
    padding: 20,
    overflowY: 'auto',
  },
  cbtPalette: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
  },
  paletteTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  legendGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid',
    background: 'rgba(0,0,0,0.2)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  legendText: {
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.8)',
  },
  gridHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  questionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  gridBtn: {
    height: 36,
    borderRadius: 8,
    border: '1.5px solid',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  reviewSummaryBtn: {
    marginTop: 'auto',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    padding: '12px 24px',
    background: 'rgba(15, 17, 26, 0.85)',
    backdropFilter: 'blur(12px)',
    zIndex: 10,
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    padding: '8px 18px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  quickStats: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  submitBtn: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    background: '#11131f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 24,
  },
  reviewSummaryCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  cancelBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
  },
  confirmSubmitBtn: {
    padding: '8px 18px',
    background: '#10b981',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
