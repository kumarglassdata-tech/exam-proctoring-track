import React from 'react';
import { motion } from 'framer-motion';
import { useFlagStore } from '../stores/flagStore';

export default function ResultsScreen() {
  const flags = useFlagStore((state) => state.flags);
  const integrityScore = useFlagStore((state) => state.integrityScore);

  const isClean = integrityScore >= 80;

  const handleClose = () => {
    // In Tauri, closes the native window
    window.close();
  };

  return (
    <div style={styles.container}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={styles.card}>
        <div style={styles.badgeRow}>
          <span style={{ fontSize: 44 }}>🎉</span>
          <h2 style={styles.title}>Examination Completed</h2>
          <p style={styles.subtitle}>Your responses have been saved and evaluated automatically.</p>
        </div>

        {/* Score banner */}
        <div style={styles.scoreBanner}>
          <div style={styles.scoreValue}>78 <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.4)' }}>/ 100</span></div>
          <div style={styles.scoreLabel}>Overall Test Performance</div>
        </div>

        {/* Section Breakdown Grid */}
        <div style={styles.breakdownGrid}>
          <div style={styles.statBox}>
            <div style={styles.statTitle}>Aptitude (MCQ)</div>
            <div style={styles.statScore}>22 / 30</div>
            <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: '73%' }} /></div>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statTitle}>Mathematics (Numerical)</div>
            <div style={styles.statScore}>12 / 15</div>
            <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: '80%' }} /></div>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statTitle}>Coding Challenge</div>
            <div style={styles.statScore}>30 / 40</div>
            <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: '75%' }} /></div>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statTitle}>Comprehension</div>
            <div style={styles.statScore}>14 / 15</div>
            <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: '93%' }} /></div>
          </div>
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
          System lockdown has been disengaged. A copy of this audit report has been submitted to the recruitment team.
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
