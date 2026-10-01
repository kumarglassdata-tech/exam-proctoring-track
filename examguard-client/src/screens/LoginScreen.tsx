import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '../stores/sessionStore';
import { login, validateInvite } from '../lib/api';
import { InviteValidateResponse } from '../lib/types';

interface LoginScreenProps {
  onSuccess: () => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ exam_title: string; candidate_name: string } | null>(null);

  const { setAuth, inviteToken, setInviteToken } = useSessionStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') ?? inviteToken;
    if (token) {
      setInviteToken(token);
      validateInvite(token)
        .then((data: InviteValidateResponse) => {
          setEmail(data.username);
          setInviteInfo({ exam_title: data.exam_title, candidate_name: data.candidate_name });
        })
        .catch(() => {});
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password, inviteToken ?? undefined);
      setAuth(data);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={styles.card}
      >
        <div style={styles.logoRow}>
          <svg width="32" height="32" viewBox="0 0 72 72" fill="none">
            <path d="M36 6L10 16V34C10 50.4 21.6 65.8 36 70C50.4 65.8 62 50.4 62 34V16L36 6Z" fill="url(#g1)" />
            <path d="M26 36L32 42L46 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="g1" x1="10" y1="6" x2="62" y2="70" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" /><stop offset="1" stopColor="#4338ca" />
              </linearGradient>
            </defs>
          </svg>
          <span style={styles.logoText}>ExamGuard</span>
        </div>

        <h2 style={styles.title}>Sign in to your exam</h2>

        {inviteInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.inviteBanner}
          >
            <div style={styles.inviteLabel}>📩 Invited for</div>
            <div style={styles.inviteExam}>{inviteInfo.exam_title}</div>
            <div style={styles.inviteCandidate}>Hello, {inviteInfo.candidate_name}</div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email / Username</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={styles.input}
              autoComplete="username"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              style={styles.error}
            >
              ⚠️ {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in...' : 'Continue →'}
          </motion.button>
        </form>

        <p style={styles.footer}>
          Your credentials were sent via email invite.<br />
          Contact your recruiter if you need assistance.
        </p>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%', maxWidth: 420,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '40px 36px',
    backdropFilter: 'blur(12px)',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28,
  },
  logoText: {
    fontSize: 20, fontWeight: 700,
    background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  title: {
    fontSize: 22, fontWeight: 700, margin: '0 0 24px',
    color: 'rgba(255,255,255,0.9)',
  },
  inviteBanner: {
    background: 'rgba(99,102,241,0.12)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 12, padding: '12px 16px', marginBottom: 24,
  },
  inviteLabel: { fontSize: 11, color: 'rgba(165,180,252,0.7)', marginBottom: 4 },
  inviteExam: { fontSize: 15, fontWeight: 600, color: '#a5b4fc' },
  inviteCandidate: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' },
  input: {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#fff', fontSize: 14,
    outline: 'none',
  },
  error: {
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, color: '#fca5a5', fontSize: 13,
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(135deg, #6366f1, #4338ca)',
    border: 'none', borderRadius: 10,
    color: '#fff', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 4,
  },
  footer: {
    marginTop: 24, fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center', lineHeight: 1.6,
  },
};
