import React from 'react';

interface TimerProps {
  seconds: number;
}

export default function Timer({ seconds }: TimerProps) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const isLow = seconds < 300; // < 5 mins
  const isCritical = seconds < 60; // < 1 min

  return (
    <div
      style={{
        ...styles.container,
        borderColor: isCritical ? '#ef4444' : isLow ? '#f59e0b' : 'rgba(255,255,255,0.1)',
        background: isCritical ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ fontSize: 16 }}>⏱️</span>
      <span
        style={{
          ...styles.digits,
          color: isCritical ? '#f87171' : isLow ? '#fbbf24' : '#fff',
        }}
      >
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 10,
    border: '1.5px solid',
    backdropFilter: 'blur(8px)',
  },
  digits: {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: 'monospace',
    letterSpacing: '1px',
  },
};
