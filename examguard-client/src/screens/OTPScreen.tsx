import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '../stores/sessionStore';
import { verifyOTP } from '../lib/api';

interface OTPScreenProps {
  onSuccess: () => void;
}

export default function OTPScreen({ onSuccess }: OTPScreenProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { accessToken, setAuth } = useSessionStore();

  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInput = (i: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[i] = value.slice(-1);
    setOtp(next);
    if (value && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join('').length === 6) {
      handleSubmit(next.join(''));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handleSubmit = async (code: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await verifyOTP(code, accessToken!);
      setAuth(data);
      onSuccess();
    } catch (err: unknown) {
      setError('Invalid or expired code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={styles.card}
      >
        <div style={styles.iconRow}>
          <span style={{ fontSize: 40 }}>📧</span>
        </div>
        <h2 style={styles.title}>Check your email</h2>
        <p style={styles.subtitle}>
          We sent a 6-digit verification code to your email address.
          Enter it below to continue.
        </p>

        <div style={styles.otpRow}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              value={digit}
              onChange={(e) => handleInput(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              maxLength={1}
              style={{
                ...styles.otpInput,
                borderColor: digit ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.1)',
              }}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {loading && (
          <div style={styles.verifying}>Verifying...</div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.error}
          >
            ⚠️ {error}
          </motion.div>
        )}

        <div style={styles.resend}>
          {resendTimer > 0 ? (
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>
              Resend code in {resendTimer}s
            </span>
          ) : (
            <button
              onClick={() => setResendTimer(60)}
              style={styles.resendBtn}
            >
              Resend code
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 400,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: '40px 36px',
    textAlign: 'center',
  },
  iconRow: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, margin: '0 0 12px', color: 'rgba(255,255,255,0.9)' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 32px', lineHeight: 1.6 },
  otpRow: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 },
  otpInput: {
    width: 48, height: 56,
    background: 'rgba(255,255,255,0.06)',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: '#fff',
    fontSize: 24, fontWeight: 700,
    textAlign: 'center' as const, outline: 'none',
    transition: 'border-color 0.2s',
  },
  verifying: { color: '#a5b4fc', fontSize: 14, marginBottom: 12 },
  error: {
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, color: '#fca5a5', fontSize: 13, marginBottom: 16,
  },
  resend: { fontSize: 13, marginTop: 8 },
  resendBtn: {
    background: 'none', border: 'none',
    color: '#6366f1', fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
  },
};
