import React from 'react';
import { motion } from 'framer-motion';
import { useFlagStore } from '../stores/flagStore';
import { useExamStore } from '../stores/examStore';

export default function ResultsScreen() {
  const flags = useFlagStore((state) => state.flags);
  const integrityScore = useFlagStore((state) => state.integrityScore);
  const evaluatedResults = useExamStore((state) => state.evaluatedResults);

  const isClean = integrityScore >= 80;

  const scoreObtained = evaluatedResults?.scoreObtained ?? 0;
  const totalMaxMarks = evaluatedResults?.totalMaxMarks ?? 10;
  const percentage = evaluatedResults?.percentage ?? 0;
  const answeredCount = evaluatedResults?.answeredCount ?? 0;
  const totalQuestions = evaluatedResults?.totalQuestions ?? 0;
  const sections = evaluatedResults?.sectionBreakdown ?? [
    { section: 'Aptitude & Problem Solving', obtained: 2, total: 2, percentage: 100 },
    { section: 'Mathematics & Logic', obtained: 3, total: 3, percentage: 100 },
    { section: 'Logical Reasoning', obtained: 4, total: 4, percentage: 100 },
    { section: 'System Design & Analysis', obtained: 8, total: 8, percentage: 100 },
  ];

  const handleClose = () => {
    window.close();
  };

  return (
    <div style={styles.container}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={styles.card}>
        <div style={styles.badgeRow}>
          <span style={{ fontSize: 44 }}>🎉</span>
          <h2 style={styles.title}>Assessment Completed</h2>
          <p style={styles.subtitle}>
            Attempted {answeredCount} of {totalQuestions} questions. Evaluation computed dynamically.
          </p>
        </div>

        {/* Dynamic Score Banner */}
        <div style={styles.scoreBanner}>
          <div style={styles.scoreValue}>
            {scoreObtained} <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.4)' }}>/ {totalMaxMarks} Marks</span>
          </div>
          <div style={styles.scoreLabel}>
            Overall Score: <strong style={{ color: '#38bdf8' }}>{percentage}%</strong>
          </div>
        </div>

        {/* Dynamic Section Breakdown Grid */}
        <div style={styles.breakdownGrid}>
          {sections.map((sec, i) => (
            <div key={i} style={styles.statBox}>
              <div style={styles.statTitle}>{sec.section}</div>
              <div style={styles.statScore}>
                {sec.obtained} / {sec.total} Marks
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${Math.min(100, sec.percentage)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Proctoring Integrity Summary */}
        <div style={styles.integritySummary}>
          <div style={styles.integrityLeft}>
            <span style={{ fontSize: 24 }}>🛡️</span>
            <div>
              <div style={styles.integrityScoreText}>
                Integrity Score: <span style={{ color: isClean ? '#10b981' : '#f59e0b' }}>{integrityScore}%</span>
              </div>
              <div style={styles.integrityDesc}>
                {isClean ? 'No critical violations observed during the session.' : `${flags.length} anomaly event(s) recorded for review.`}
              </div>
            </div>
          </div>
          <div style={{ ...styles.statusTag, background: isClean ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: isClean ? '#10b981' : '#fbbf24' }}>
            {isClean ? 'Verified' : 'Flagged for Review'}
          </div>
        </div>

        <div style={styles.footerNotice}>
          System lockdown has been disengaged. Your candidate performance report has been transmitted to the evaluation portal.
        </div>

        <button onClick={handleClose} style={styles.exitBtn}>
          Exit & Close Application
        </button>
      </motion.div>
    </div>
  );
}


const styles: Record<string, React.CSSProperties> = {
  container: { width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 640, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36, textAlign: 'center', backdropFilter: 'blur(16px)' },
  badgeRow: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, margin: '12px 0 6px', color: '#f3f4f6' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 },
  scoreBanner: { background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.05))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, padding: '20px', margin: '20px 0' },
  scoreValue: { fontSize: 44, fontWeight: 800, color: '#a5b4fc', letterSpacing: '-1px' },
  scoreLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: 500 },
  breakdownGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  statBox: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, textAlign: 'left' },
  statTitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  statScore: { fontSize: 16, fontWeight: 700, color: '#f3f4f6', margin: '4px 0 8px' },
  progressBar: { width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#6366f1' },
  integritySummary: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 20, textAlign: 'left' },
  integrityLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  integrityScoreText: { fontSize: 14, fontWeight: 700, color: '#f3f4f6' },
  integrityDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  statusTag: { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  footerNotice: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20, lineHeight: 1.5 },
  exitBtn: { width: '100%', padding: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
