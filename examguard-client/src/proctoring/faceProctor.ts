/**
 * MediaPipe Face Detector + Gaze Tracker
 * Runs at ~10 FPS inside the Tauri renderer process (GPU-accelerated via WebAssembly)
 */

import {
  FaceDetector,
  FaceLandmarker,
  FilesetResolver,
  type FaceDetectorResult,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';

import { useFlagStore } from '../stores/flagStore';
import { sendFlag } from '../lib/websocket';

// ─── State ────────────────────────────────────────────────────────────────────
let faceDetector: FaceDetector | null = null;
let faceLandmarker: FaceLandmarker | null = null;
let videoElement: HTMLVideoElement | null = null;
let animationId: number | null = null;
let sessionId: string | null = null;

// Consecutive miss counters for debouncing
let noFaceFrames = 0;
let gazeAwayFrames = 0;
let multiFaceFrames = 0;
const NO_FACE_THRESHOLD = 15;   // ~1.5s
const GAZE_AWAY_THRESHOLD = 12; // ~1.2s
const MULTI_FACE_THRESHOLD = 5; // ~0.5s

// Per-type cooldown — prevents flag spam
const lastFlagTime: Record<string, number> = {};
const FLAG_COOLDOWN_MS: Record<string, number> = {
  no_face:     6000,  // once per 6s
  multi_face:  4000,  // once per 4s
  gaze_away:   6000,  // once per 6s
};

export type FaceStatus = 'loading' | 'ok' | 'no_face' | 'multi_face' | 'gaze_away';
let _faceStatus: FaceStatus = 'loading';
export function getFaceStatus(): FaceStatus { return _faceStatus; }

export interface FaceBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
}
let _latestFaceBox: FaceBox | null = null;
export function getLatestFaceBox(): FaceBox | null { return _latestFaceBox; }

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initProctoring(
  video: HTMLVideoElement,
  sid: string
): Promise<void> {
  sessionId = sid;
  videoElement = video;
  _faceStatus = 'loading';

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    );

    // Try GPU first, fall back to CPU if WebGL fails
    try {
      faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.35,
      });
    } catch {
      faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.35,
      });
    }

    try {
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 4,
        minFaceDetectionConfidence: 0.35,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    } catch {
      try {
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 4,
          minFaceDetectionConfidence: 0.35,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
      } catch {
        // Gaze landmarker optional; face detector is primary
      }
    }

    _faceStatus = 'ok';
    _startLoop();
  } catch (err) {
    console.warn('MediaPipe online load failed, using local optical detector fallback:', err);
    _startHeuristicLoop();
  }
}

// ─── Detection Loop ───────────────────────────────────────────────────────────

function _startLoop(): void {
  let lastTs = -1;

  const detect = (ts: number) => {
    animationId = requestAnimationFrame(detect);

    // Run at ~10 FPS
    if (ts - lastTs < 100) return;
    lastTs = ts;

    if (!videoElement || videoElement.readyState < 2) return;

    _runProctorAnalysis(ts);
  };

  animationId = requestAnimationFrame(detect);
}

function _startHeuristicLoop(): void {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');

  let lastFrameTime = -1;
  const check = (ts: number) => {
    animationId = requestAnimationFrame(check);
    if (ts - lastFrameTime < 200) return;
    lastFrameTime = ts;

    if (!videoElement || videoElement.readyState < 2 || !ctx) return;
    try {
      ctx.drawImage(videoElement, 0, 0, 64, 48);
      const imgData = ctx.getImageData(0, 0, 64, 48).data;

      let sum = 0;
      let count = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        sum += (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
        count++;
      }
      const avg = sum / count;

      if (avg < 15) {
        noFaceFrames++;
        _faceStatus = 'no_face';
        _latestFaceBox = null;
        if (noFaceFrames >= NO_FACE_THRESHOLD) {
          _raiseFlag('no_face', 'high', 1.0, 'Camera feed obstructed or too dark');
        }
      } else {
        noFaceFrames = 0;
        _faceStatus = 'ok';
        _latestFaceBox = { originX: 40, originY: 30, width: 240, height: 180 };
      }
    } catch {
      _faceStatus = 'ok';
    }
  };
  animationId = requestAnimationFrame(check);
}

function _runProctorAnalysis(ts: number): void {
  if (!videoElement) return;

  let faceCount = 0;
  let primaryBox: FaceBox | null = null;
  let landmarks: { x: number; y: number; z?: number }[] | null = null;

  // 1. Face Detector check
  if (faceDetector) {
    try {
      // MediaPipe requires integer millisecond timestamp
      const frameTs = Math.round(ts);
      const fdRes = faceDetector.detectForVideo(videoElement, frameTs);
      if (fdRes && fdRes.detections) {
        faceCount = Math.max(faceCount, fdRes.detections.length);
        if (fdRes.detections.length > 0 && fdRes.detections[0].boundingBox) {
          const b = fdRes.detections[0].boundingBox;
          primaryBox = { originX: b.originX, originY: b.originY, width: b.width, height: b.height };
        }
      }
    } catch (err) {
      // Ignore timestamp/WASM transient glitches
    }
  }

  // 2. Face Landmarker check (multi-face + 478 3D landmarks)
  if (faceLandmarker) {
    try {
      const frameTs = Math.round(ts);
      const flRes = faceLandmarker.detectForVideo(videoElement, frameTs);
      if (flRes && flRes.faceLandmarks) {
        faceCount = Math.max(faceCount, flRes.faceLandmarks.length);
        if (flRes.faceLandmarks.length > 0) {
          landmarks = flRes.faceLandmarks[0];
          if (!primaryBox) {
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            for (const pt of landmarks) {
              minX = Math.min(minX, pt.x);
              maxX = Math.max(maxX, pt.x);
              minY = Math.min(minY, pt.y);
              maxY = Math.max(maxY, pt.y);
            }
            const vw = videoElement.videoWidth || 320;
            const vh = videoElement.videoHeight || 240;
            primaryBox = {
              originX: minX * vw,
              originY: minY * vh,
              width: Math.max((maxX - minX) * vw, 60),
              height: Math.max((maxY - minY) * vh, 60),
            };
          }
        }
      }
    } catch (err) {
      // Ignore transient errors
    }
  }

  // 3. Fallback Heuristic Check: If MediaPipe detected 0 faces, run Canvas Skin/Luma check
  // Prevents false positive "no_face" when candidate is sitting in front of camera under varying light
  if (faceCount === 0 && videoElement.readyState >= 2) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, 64, 48);
        const data = ctx.getImageData(0, 0, 64, 48).data;
        let skinLumaPixels = 0;
        let totalPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Human skin tone & face brightness heuristic range
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const isSkin = r > 40 && g > 25 && b > 15 && (max - min) > 12 && r > g && r > b;
          if (isSkin) skinLumaPixels++;
          totalPixels++;
        }

        const skinRatio = skinLumaPixels / totalPixels;
        // If center/frame has >8% skin tones, a face/person is present!
        if (skinRatio > 0.08) {
          faceCount = 1;
          primaryBox = { originX: 40, originY: 30, width: 240, height: 180 };
        }
      }
    } catch (err) {
      // Ignore canvas read errors
    }
  }

  _latestFaceBox = primaryBox;

  // ── MULTI-FACE DETECTION ────────────────────────────
  if (faceCount >= 2) {
    multiFaceFrames++;
    noFaceFrames = 0;
    _faceStatus = 'multi_face';
    if (multiFaceFrames >= MULTI_FACE_THRESHOLD) {
      _raiseFlag('multi_face', 'critical', 0.95, `${faceCount} faces detected in frame`);
      multiFaceFrames = 0;
    }
    return;
  } else {
    multiFaceFrames = 0;
  }

  // ── NO-FACE DETECTION ───────────────────────────────
  if (faceCount === 0) {
    noFaceFrames++;
    gazeAwayFrames = 0;
    _faceStatus = 'no_face';
    if (noFaceFrames >= NO_FACE_THRESHOLD) {
      _raiseFlag('no_face', 'high', 1.0, 'No face detected in camera');
    }
    return;
  } else {
    noFaceFrames = 0;
  }

  // ── HEAD ROTATION & GAZE DETECTION (Geometric Landmark Ratios) ─────
  if (landmarks && landmarks.length >= 264) {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    // Eye distance
    const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 0.001;
    const midEyeX = (leftEye.x + rightEye.x) / 2;
    // Yaw: lateral deviation of nose from midpoint
    const yawRatio = (nose.x - midEyeX) / eyeDist;

    // Face height
    const faceH = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || 0.001;
    const midFaceY = (forehead.y + chin.y) / 2;
    // Pitch: vertical deviation of nose from center
    const pitchRatio = (nose.y - midFaceY) / faceH;

    // Normal: yawRatio ~[-0.18, 0.18], pitchRatio ~[-0.14, 0.15]
    const isRotated = Math.abs(yawRatio) > 0.20 || pitchRatio > 0.16 || pitchRatio < -0.15;

    if (isRotated) {
      gazeAwayFrames++;
      _faceStatus = 'gaze_away';
      if (gazeAwayFrames >= GAZE_AWAY_THRESHOLD) {
        const dir = Math.abs(yawRatio) > 0.20 ? (yawRatio > 0 ? 'right' : 'left') : (pitchRatio > 0 ? 'down' : 'up');
        _raiseFlag('gaze_away', 'medium', 0.9, `Candidate turned head ${dir} away from screen`);
      }
      return;
    } else {
      gazeAwayFrames = 0;
    }
  }

  _faceStatus = 'ok';
}

function _raiseFlag(
  type: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  confidence: number,
  message: string
): void {
  if (!sessionId) return;

  // Cooldown check
  const now = Date.now();
  const cooldown = FLAG_COOLDOWN_MS[type] ?? 5000;
  if (lastFlagTime[type] && now - lastFlagTime[type] < cooldown) return;
  lastFlagTime[type] = now;

  const flag = {
    session_id: sessionId,
    type,
    severity,
    confidence,
    source: 'client_ai' as const,
    message,
    flagged_at: new Date().toISOString(),
  };

  useFlagStore.getState().addFlag(flag);
  sendFlag(flag);
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export function stopProctoring(): void {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  faceDetector?.close();
  faceLandmarker?.close();
  faceDetector = null;
  faceLandmarker = null;
  videoElement = null;
  _faceStatus = 'loading';
}
