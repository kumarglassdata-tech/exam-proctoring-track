import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useExamStore } from '../stores/examStore';

interface ConsentScreenProps {
  onAgreed: () => void;
}

export default function ConsentScreen({ onAgreed }: ConsentScreenProps) {
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const { activateLockdown } = useExamStore();

  const allChecked = check1 && check2 && check3;

  const handleStart = () => {
    activateLockdown();
    onAgreed();
  };

  return (
    <div style={styles.container}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.card}>
        <div style={styles.header}>
          <span style={{ fontSize: 32 }}>🛡️</span>
          <div>
            <h2 style={styles.title}>Examination Rules & Integrity Undertaking</h2>
            <p style={styles.subtitle}>Please review the compliance standards before entering fullscreen lockdown.</p>
          </div>
        </div>

        <div style={styles.rulesList}>
          <div style={styles.ruleItem}>
            <div style={styles.ruleNum}>01</div>
            <div>
              <div style={styles.ruleTitle}>Workspace Clean Desk Protocol</div>
              <div style={styles.ruleDesc}>No mobile phones, secondary laptops, external monitors, or earphones permitted.</div>
            </div>
          </div>

          <div style={styles.ruleItem}>
            <div style={styles.ruleNum}>02</div>
            <div>
              <div style={styles.ruleTitle}>Continuous AI Vision & Audio Vigilance</div>
              <div style={styles.ruleDesc}>Absence from camera frame, multiple faces, or persistent gaze away will raise security flags.</div>
            </div>
          </div>

          <div style={styles.ruleItem}>
            <div style={styles.ruleNum}>03</div>
            <div>
              <div style={styles.ruleTitle}>Total OS Lockdown & Clipboard Suppression</div>
              <div style={styles.ruleDesc}>App will lock into exclusive kiosk mode. Alt-Tab, Windows key, print screen, and copy-paste are disabled.</div>
            </div>
          </div>
        </div>

        <div style={styles.checkboxes}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={check1} onChange={(e) => setCheck1(e.target.checked)} style={styles.checkbox} />
            <span>I confirm my room is quiet and desk is clear of prohibited electronic devices and notes.</span>
          </label>

          <label style={styles.checkLabel}>
            <input type="checkbox" checked={check2} onChange={(e) => setCheck2(e.target.checked)} style={styles.checkbox} />
            <span>I give explicit consent for video, audio, and screen capture for proctoring audit trails.</span>
          </label>

          <label style={styles.checkLabel}>
            <input type="checkbox" checked={check3} onChange={(e) => setCheck3(e.target.checked)} style={styles.checkbox} />
            <span>I understand that any detected anomaly reduces the integrity score and may invalidate my test.</span>
          </label>
        </div>

        <div style={styles.footer}>
          <button
            onClick={handleStart}
            disabled={!allChecked}
            style={{
              ...styles.startBtn,
              opacity: allChecked ? 1 : 0.4,
              cursor: allChecked ? 'pointer' : 'not-allowed',
            }}
          >
            🔒 Lock Screen & Start Exam
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 680, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36, backdropFilter: 'blur(16px)' },
  header: { display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#f3f4f6' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 },
  rulesList: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, padding: 18, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' },
  ruleItem: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  ruleNum: { fontSize: 14, fontWeight: 800, color: '#6366f1', background: 'rgba(99,102,241,0.15)', padding: '4px 8px', borderRadius: 6 },
  ruleTitle: { fontSize: 14, fontWeight: 600, color: '#e5e7eb' },
  ruleDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  checkboxes: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 },
  checkLabel: { display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, color: 'rgba(255,255,255,0.8)', cursor: 'pointer', userSelect: 'none' },
  checkbox: { width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' },
  footer: { display: 'flex', justifyContent: 'center' },
  startBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #4f46e5, #3730a3)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 700, transition: 'all 0.2s ease' },
};
