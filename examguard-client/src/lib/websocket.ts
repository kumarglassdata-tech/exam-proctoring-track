/**
 * WebSocket client for bidirectional communication:
 * - OUTBOUND: flag events from the .exe to the backend
 * - INBOUND: control commands (pause, terminate, proctor message) from backend
 */

import { useFlagStore } from '../stores/flagStore';

type ControlCommandHandler = (command: string, payload: Record<string, unknown>) => void;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId: string | null = null;
let authToken: string | null = null;
let onControlCommand: ControlCommandHandler | null = null;
const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000';

export function connectWebSocket(
  sid: string,
  token: string,
  controlHandler: ControlCommandHandler
): void {
  sessionId = sid;
  authToken = token;
  onControlCommand = controlHandler;
  _connect();
}

function _connect(): void {
  if (ws) {
    ws.close();
    ws = null;
  }

  const url = `${WS_BASE}/ws/session/${sessionId}?token=${authToken}`;
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('[WS] Connected to exam session');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as { type: string; payload: Record<string, unknown> };
      _handleInbound(msg.type, msg.payload);
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    console.warn('[WS] Disconnected — scheduling reconnect in 3s');
    if (sessionId) {
      useFlagStore.getState().addFlag({
        session_id: sessionId,
        type: 'heartbeat_missed',
        severity: 'high',
        source: 'system',
        message: 'WebSocket disconnected',
        flagged_at: new Date().toISOString(),
      });
    }
    reconnectTimer = setTimeout(_connect, 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function _handleInbound(type: string, payload: Record<string, unknown>): void {
  switch (type) {
    case 'session_paused':
      onControlCommand?.('pause', payload);
      break;
    case 'session_resumed':
      onControlCommand?.('resume', payload);
      break;
    case 'session_terminated':
      onControlCommand?.('terminate', payload);
      break;
    case 'proctor_message':
      onControlCommand?.('message', payload);
      break;
    case 'eval_complete':
      onControlCommand?.('eval_complete', payload);
      break;
    default:
      break;
  }
}

export function sendFlag(flag: Record<string, unknown>): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'flag', payload: flag }));
  }
}

export function disconnectWebSocket(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}
