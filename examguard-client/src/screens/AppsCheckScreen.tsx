import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AppsCheckScreenProps {
  onClean: () => void;
}

interface ProcessInfo {
  name: string;
  pid: u32 | number;
  category: string;
}

type u32 = number;

async function callTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  } catch (e) {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__?.invoke) {
      return await (window as any).__TAURI_INTERNALS__.invoke(cmd, args);
    }
    throw e;
  }
}

export default function AppsCheckScreen({ onClean }: AppsCheckScreenProps) {
  const [apps, setApps] = useState<ProcessInfo[]>([]);
  const [scanning, setScanning] = useState(true);
  const [killing, setKilling] = useState<number | 'all' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const scan = async () => {
    setScanning(true);
    setStatusMessage('');
    try {
      const detected = await callTauri<ProcessInfo[]>('get_forbidden_processes');
      setApps(detected || []);
    } catch (err) {
      console.warn('Tauri process scan error (may be in non-Tauri mode):', err);
      setApps([]);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    scan();
    // Re-check periodically every 4 seconds while on this screen
    const interval = setInterval(() => {
      callTauri<ProcessInfo[]>('get_forbidden_processes')
        .then((detected) => setApps(detected || []))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (pid: number, name: string) => {
    setKilling(pid);
    try {
      await callTauri('kill_process', { pid });
      setStatusMessage(`Terminated ${name} (PID: ${pid})`);
      setTimeout(scan, 600);
    } catch (err) {
      setStatusMessage(`Could not terminate ${name}: please close it manually.`);
    } finally {
      setKilling(null);
    }
  };

  const handleKillAll = async () => {
    setKilling('all');
    try {
      const count = await callTauri<number>('kill_all_forbidden');
      setStatusMessage(`Terminated ${count} restricted background processes.`);
      setTimeout(scan, 800);
    } catch (err) {
      setStatusMessage('Failed to close some apps. Please close them manually.');
    } finally {
      setKilling(null);
    }
  };

  const isClean = apps.length === 0;

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.card}
      >
        <div style={styles.header}>
          <div style={styles.badge}>
            {isClean && !scanning ? 'STATUS: SECURE' : 'ENVIRONMENT AUDIT'}
          </div>
          <h2 style={styles.title}>
            {scanning
              ? '🔍 Auditing active processes...'
              : isClean
              ? '✅ System Environment Clean'
              : `⚠️ ${apps.length} Restricted App${apps.length > 1 ? 's' : ''} Detected`}
          </h2>
          <p style={styles.subtitle}>
            {isClean && !scanning
              ? 'No prohibited background applications, remote desktop, or recording software detected.'
              : 'The examination policy requires closing all communication, browser, recording, and remote desktop apps.'}
          </p>
        </div>

        {statusMessage && (
          <div style={styles.statusToast}>
            ℹ️ {statusMessage}
          </div>
        )}

        {scanning && (
          <div style={styles.scanningRow}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                style={styles.scanDot}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
              />
            ))}
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              Scanning memory & active process tree...
            </span>
          </div>
        )}

        {!scanning && !isClean && (
          <div style={styles.listContainer}>
            <div style={styles.listHeader}>
              <span>Running Application</span>
              <span>Action</span>
            </div>
            <div style={styles.appList}>
              <AnimatePresence>
                {apps.map((app) => (
                  <motion.div
                    key={`${app.name}-${app.pid}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    style={styles.appRow}
                  >
                    <div style={styles.appInfo}>
                      <div style={styles.appName}>
                        <span style={styles.appDot} />
                        {app.name}
                      </div>
                      <div style={styles.appMeta}>
                        <span style={styles.categoryBadge}>{app.category}</span>
                        <span style={styles.pidText}>PID: {app.pid}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleKill(Number(app.pid), app.name)}
                      disabled={killing === app.pid || killing === 'all'}
                      style={styles.killBtn}
                    >
                      {killing === app.pid ? 'Closing...' : 'Close App'}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {!scanning && isClean && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={styles.successBox}
          >
            <div style={{ fontSize: 44, marginBottom: 8 }}>🛡️</div>
            <div style={{ color: '#4ade80', fontSize: 16, fontWeight: 700 }}>
              Integrity Check Passed
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
              WhatsApp, Discord, Browsers, and Remote Desktop tools verified closed.
            </div>
          </motion.div>
        )}

        <div style={styles.actions}>
          {!isClean && (
            <motion.button
              onClick={handleKillAll}
              disabled={scanning || killing === 'all'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={styles.killAllBtn}
            >
              {killing === 'all' ? 'Terminating all...' : '⚡ Close All Restricted Apps'}
            </motion.button>
          )}

          <motion.button
            onClick={scan}
            disabled={scanning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ ...styles.rescanBtn, flex: isClean ? 1 : undefined }}
          >
            🔄 Re-scan
          </motion.button>

          {isClean && !scanning && (
            <motion.button
              onClick={onClean}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={styles.continueBtn}
            >
              Continue to System Check →
            </motion.button>
          )}
        </div>
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
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 580,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: '36px 32px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(16px)',
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 6,
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.8px',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: '0 0 8px',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
    lineHeight: 1.5,
  },
  statusToast: {
    padding: '10px 14px',
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 8,
    color: '#c7d2fe',
    fontSize: 13,
    marginBottom: 16,
  },
  scanningRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '28px 0',
    justifyContent: 'center',
  },
  scanDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#818cf8',
  },
  listContainer: {
    marginBottom: 24,
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    overflow: 'hidden',
    background: 'rgba(0,0,0,0.25)',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  appList: {
    maxHeight: 220,
    overflowY: 'auto' as const,
  },
  appRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  appInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  appName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  appDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#ef4444',
  },
  appMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    fontSize: 11,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    fontWeight: 500,
  },
  pidText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
  },
  killBtn: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid rgba(239,68,68,0.4)',
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  successBox: {
    padding: '32px 20px',
    textAlign: 'center',
    background: 'rgba(34,197,94,0.06)',
    border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: 16,
    marginBottom: 24,
  },
  actions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  killAllBtn: {
    flex: 2,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    border: 'none',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
  },
  rescanBtn: {
    padding: '12px 18px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  continueBtn: {
    flex: 2,
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    border: 'none',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
  },
};
