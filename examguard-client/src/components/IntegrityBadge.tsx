import React from 'react';
import { useFlagStore } from '../stores/flagStore';

export default function IntegrityBadge() {
  const score = useFlagStore((state) => state.integrityScore);

  const isGood = score >= 85;
  const isWarning = score >= 70 && score < 85;

  const color = isGood ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';
  const bg = isGood ? 'rgba(16, 185, 129, 0.1)' : isWarning ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div style={{ ...styles.badge, borderColor: color, background: bg }}>
      <span style={{ fontSize: 13 }}>🛡️</span>
      <span style={styles.label}>Integrity:</span>
      <span style={{ ...styles.score, color }}>{score}%</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1.5px solid',
    backdropFilter: 'blur(8px)',
  },
  label: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 },
  score: { fontSize: 13, fontWeight: 700 },
};
