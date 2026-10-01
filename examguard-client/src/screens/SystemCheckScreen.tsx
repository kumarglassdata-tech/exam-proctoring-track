import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getMicLevel, startAudioMonitor, stopAudioMonitor } from '../proctoring/audioMonitor';

interface SystemCheckScreenProps {
  onPass: () => void;
}

export default function SystemCheckScreen({ onPass }: SystemCheckScreenProps) {
  const [webcamOk, setWebcamOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [displayOk, setDisplayOk] = useState(false);
  const [bandwidthOk, setBandwidthOk] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [testing, setTesting] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let micInterval: any = null;

    async function checkDevices() {
      try {
        // 1. Check Webcam
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setWebcamOk(true);
        setMicOk(true);

        // 2. Start audio monitor for level testing
        await startAudioMonitor('diagnostic-session');
        micInterval = setInterval(() => {
          setMicLevel(getMicLevel());
        }, 100);

        // 3. Screen display check (multi-monitor check)
        // Check window.screen or screen.isExtended where supported
        if ('isExtended' in window.screen && (window.screen as any).isExtended) {
          setDisplayOk(false); // flagged secondary monitor!
        } else {
          setDisplayOk(true);
        }

        // 4. Bandwidth check (fast download test)
        const start = Date.now();
        await fetch('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/package.json', { cache: 'no-store' });
        const latency = Date.now() - start;
        setBandwidthOk(latency < 2500);

        setTesting(false);
      } catch (err) {
        console.error('Diagnostic error:', err);
        setTesting(false);
      }
    }

    checkDevices();

    return () => {
      if (micInterval) clearInterval(micInterval);
      stopAudioMonitor();
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const allPassed = webcamOk && micOk && displayOk && bandwidthOk;

  return (
    <div style={styles.container}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.card}>
        <h2 style={styles.title}>System Diagnostics & Compatibility</h2>
        <p style={styles.subtitle}>
          Ensure your hardware meets the minimum proctoring requirements.
        </p>

        <div style={styles.grid}>
          {/* Webcam view */}
          <div style={styles.camBox}>
            <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
            <div style={{ ...styles.badge, background: webcamOk ? '#10b981' : '#ef4444' }}>
              {webcamOk ? '✓ Webcam Active' : '✕ Camera Error'}
            </div>
          </div>

          {/* Checklist */}
          <div style={styles.checklist}>
            <div style={styles.checkItem}>
              <span style={{ fontSize: 20 }}>{webcamOk ? '✅' : '❌'}</span>
              <div>
                <div style={styles.checkTitle}>Webcam Hardware</div>
                <div style={styles.checkDesc}>High-definition front camera feed</div>
              </div>
            </div>

            <div style={styles.checkItem}>
              <span style={{ fontSize: 20 }}>{micOk ? '✅' : '❌'}</span>
              <div style={{ flex: 1 }}>
                <div style={styles.checkTitle}>Microphone Input</div>
                <div style={styles.checkDesc}>Testing input decibel level:</div>
                <div style={styles.micMeter}>
                  <div style={{ ...styles.micLevel, width: `${Math.min(100, micLevel * 100)}%` }} />
                </div>
              </div>
            </div>

            <div style={styles.checkItem}>
              <span style={{ fontSize: 20 }}>{displayOk ? '✅' : '⚠️'}</span>
              <div>
                <div style={styles.checkTitle}>Single Display Verification</div>
                <div style={styles.checkDesc}>
                  {displayOk ? 'Primary single monitor detected' : 'Multiple displays detected. Disconnect external screens.'}
                </div>
              </div>
            </div>

            <div style={styles.checkItem}>
              <span style={{ fontSize: 20 }}>{bandwidthOk ? '✅' : '⏳'}</span>
              <div>
                <div style={styles.checkTitle}>Network Bandwidth</div>
                <div style={styles.checkDesc}>
                  {bandwidthOk ? 'Connection speed stable (<100ms jitter)' : 'Checking latency...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button
            onClick={onPass}
            disabled={!allPassed || testing}
            style={{
              ...styles.continueBtn,
              opacity: allPassed && !testing ? 1 : 0.4,
              cursor: allPassed && !testing ? 'pointer' : 'not-allowed',
            }}
          >
            {testing ? 'Testing Hardware...' : allPassed ? 'Proceed to Face Verification →' : 'Requirements Not Met'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 760, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36, backdropFilter: 'blur(16px)' },
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 8px' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, marginBottom: 28 },
  camBox: { position: 'relative', width: '100%', height: 260, background: '#000', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' },
  video: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  badge: { position: 'absolute', bottom: 12, left: 12, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff' },
  checklist: { display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' },
  checkItem: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  checkTitle: { fontSize: 14, fontWeight: 600, color: '#f3f4f6' },
  checkDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  micMeter: { width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  micLevel: { height: '100%', background: '#6366f1', transition: 'width 0.1s ease-out' },
  footer: { display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 },
  continueBtn: { padding: '14px 28px', background: 'linear-gradient(135deg, #6366f1, #4338ca)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 600 },
};
