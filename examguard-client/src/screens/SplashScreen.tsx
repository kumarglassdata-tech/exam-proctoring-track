import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={styles.container}>
      {/* Animated background glow */}
      <motion.div
        style={styles.glow}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={styles.content}
      >
        {/* Shield icon */}
        <motion.div
          style={styles.iconWrapper}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <path
              d="M36 6L10 16V34C10 50.4 21.6 65.8 36 70C50.4 65.8 62 50.4 62 34V16L36 6Z"
              fill="url(#shieldGrad)"
              stroke="rgba(99,102,241,0.5)"
              strokeWidth="1.5"
            />
            <path
              d="M26 36L32 42L46 28"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="shieldGrad" x1="10" y1="6" x2="62" y2="70" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#4338ca" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        <motion.h1
          style={styles.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          ExamGuard
        </motion.h1>

        <motion.p
          style={styles.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          Secure Interview Assessment Platform
        </motion.p>

        {/* Loading dots */}
        <motion.div
          style={styles.dots}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={styles.dot}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>

        <motion.div
          style={styles.version}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          v1.0.0
        </motion.div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    zIndex: 1,
  },
  iconWrapper: {
    marginBottom: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: 800,
    letterSpacing: '-1px',
    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.5px',
    margin: 0,
  },
  dots: {
    display: 'flex',
    gap: 8,
    marginTop: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#6366f1',
  },
  version: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 8,
  },
};
