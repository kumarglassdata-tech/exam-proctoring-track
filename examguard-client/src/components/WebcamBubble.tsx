import React, { useEffect, useRef, useState } from 'react';
import {
  initProctoring,
  stopProctoring,
  getFaceStatus,
  getLatestFaceBox,
  type FaceStatus,
} from '../proctoring/faceProctor';
import { startAudioMonitor, stopAudioMonitor } from '../proctoring/audioMonitor';
import { useFlagStore } from '../stores/flagStore';

interface WebcamBubbleProps {
  sessionId: string;
}

export default function WebcamBubble({ sessionId }: WebcamBubbleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('loading');
  const flags = useFlagStore((state) => state.flags);

  const lastFlag = flags[flags.length - 1];
  const isRecentAnomaly =
    lastFlag && Date.now() - new Date(lastFlag.flagged_at).getTime() < 4000;

  // Media & AI Proctoring lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function setupMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 15 },
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (_e) {
            // Handled
          }
        }

        if (videoRef.current) {
          await initProctoring(videoRef.current, sessionId);
        }
        await startAudioMonitor(sessionId);
        setActive(true);
      } catch (err) {
        console.error('Webcam Bubble media setup failed:', err);
      }
    }

    setupMedia();

    return () => {
      stopProctoring();
      stopAudioMonitor();
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [sessionId]);

  // Transmit live video frames to recruiter dashboard every 1s
  useEffect(() => {
    if (!active || !sessionId) return;
    const offscreen = document.createElement('canvas');
    offscreen.width = 320;
    offscreen.height = 240;
    const offCtx = offscreen.getContext('2d');

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !offCtx) return;
      try {
        offCtx.drawImage(video, 0, 0, 320, 240);
        const dataUrl = offscreen.toDataURL('image/jpeg', 0.45);
        const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
        await fetch(`${apiUrl}/sessions/${sessionId}/frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        }).catch(() => {});
      } catch {}
    }, 1000);

    return () => clearInterval(interval);
  }, [active, sessionId]);

  // Live Canvas Face Overlay & Status Loop
  useEffect(() => {
    let frameId: number;

    const renderOverlay = () => {
      const status = getFaceStatus();
      setFaceStatus(status);

      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cw = canvas.width;
          const ch = canvas.height;
          ctx.clearRect(0, 0, cw, ch);

          const box = getLatestFaceBox();
          if (box && status !== 'no_face') {
            // Mirror coordinates because video is mirrored
            const scaleX = cw / (video.videoWidth || 320);
            const scaleY = ch / (video.videoHeight || 240);

            // In mirrored mode, X is flipped:
            const rawX = box.originX * scaleX;
            const w = box.width * scaleX;
            const h = box.height * scaleY;
            const x = cw - rawX - w;
            const y = box.originY * scaleY;

            // Draw targeting reticle brackets
            const color =
              status === 'multi_face'
                ? '#ef4444'
                : status === 'gaze_away'
                ? '#f59e0b'
                : '#10b981';

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            // Corner brackets
            const len = Math.min(w, h) * 0.25;
            // Top-left
            ctx.beginPath();
            ctx.moveTo(x, y + len);
            ctx.lineTo(x, y);
            ctx.lineTo(x + len, y);
            ctx.stroke();

            // Top-right
            ctx.beginPath();
            ctx.moveTo(x + w - len, y);
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w, y + len);
            ctx.stroke();

            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(x, y + h - len);
            ctx.lineTo(x, y + h);
            ctx.lineTo(x + len, y + h);
            ctx.stroke();

            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(x + w - len, y + h);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x + w, y + h - len);
            ctx.stroke();

            // Subdued face fill
            ctx.fillStyle =
              status === 'multi_face'
                ? 'rgba(239, 68, 68, 0.12)'
                : status === 'gaze_away'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(16, 185, 129, 0.08)';
            ctx.fillRect(x, y, w, h);
          } else if (status === 'no_face' && active) {
            // Red warning outline if no face detected
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(8, 8, cw - 16, ch - 16);
            ctx.setLineDash([]);
          }
        }
      }

      frameId = requestAnimationFrame(renderOverlay);
    };

    frameId = requestAnimationFrame(renderOverlay);
    return () => cancelAnimationFrame(frameId);
  }, [active]);

  // Status text & colors
  const statusConfig = {
    loading: { color: '#f59e0b', text: 'Calibrating AI...', border: 'rgba(99,102,241,0.4)' },
    ok: { color: '#10b981', text: 'Face Tracked', border: 'rgba(16,185,129,0.5)' },
    no_face: { color: '#ef4444', text: 'No Face', border: '#ef4444' },
    multi_face: { color: '#ef4444', text: '2+ Faces', border: '#ef4444' },
    gaze_away: { color: '#f59e0b', text: 'Looking Away', border: '#f59e0b' },
  }[faceStatus] || { color: '#10b981', text: 'Monitoring', border: 'rgba(99,102,241,0.5)' };

  const finalBorder = isRecentAnomaly ? '#ef4444' : statusConfig.border;

  return (
    <div
      style={{
        ...styles.container,
        borderColor: finalBorder,
        boxShadow: isRecentAnomaly
          ? '0 0 16px rgba(239,68,68,0.5)'
          : faceStatus === 'no_face' || faceStatus === 'multi_face'
          ? '0 0 12px rgba(239,68,68,0.4)'
          : '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
      <canvas ref={canvasRef} width={160} height={120} style={styles.canvas} />

      {/* Top AI badge */}
      <div style={styles.aiBadge}>
        <span style={styles.aiText}>AI PROCTOR</span>
      </div>

      {/* Status indicator bar */}
      <div style={styles.statusBar}>
        <div
          style={{
            ...styles.dot,
            background: !active ? '#f59e0b' : statusConfig.color,
          }}
        />
        <span style={styles.statusText}>
          {!active ? 'Starting...' : statusConfig.text}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: 160,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    border: '2px solid',
    background: '#0a0a0f',
    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  aiBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    padding: '2px 6px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  aiText: {
    fontSize: 8,
    fontWeight: 800,
    color: '#a5b4fc',
    letterSpacing: '0.5px',
  },
  statusBar: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(0,0,0,0.7)',
    padding: '3px 8px',
    borderRadius: 8,
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
