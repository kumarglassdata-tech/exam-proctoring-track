import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlagStore, FLAG_MESSAGES } from '../stores/flagStore';
import { FlagType } from '../lib/types';

export default function AlertToast() {
  const flags = useFlagStore((state) => state.flags);
  const lastFlag = flags[flags.length - 1];

  const isRecent = lastFlag && (Date.now() - new Date(lastFlag.flagged_at).getTime()) < 4000;
  const message = lastFlag ? (FLAG_MESSAGES[lastFlag.type as FlagType] || lastFlag.message) : '';

  return (
    <AnimatePresence>
      {isRecent && message && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          style={styles.toast}
        >
          <span style={styles.icon}>⚠️</span>
          <span style={styles.text}>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: 'fixed',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(239, 68, 68, 0.92)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    padding: '10px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
    zIndex: 9999,
  },
  icon: { fontSize: 18 },
  text: { color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: '0.2px' },
};
