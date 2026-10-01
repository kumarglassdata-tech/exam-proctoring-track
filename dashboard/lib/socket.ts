import io from "socket.io-client";
import { Flag, LiveSession } from "./types";

type Socket = ReturnType<typeof io>;

class SocketService {
  private socket: Socket | null = null;
  private backendUrl: string;

  constructor() {
    this.backendUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000";
  }

  public connectProctor(token: string): Socket {
    if (!this.socket) {
      this.socket = io(this.backendUrl, {
        auth: { token },
        transports: ["websocket"],
      });

      this.socket.on("connect", () => {
        console.log("Proctor socket connected", this.socket?.id);
        this.socket?.emit("join_proctor_room");
      });

      this.socket.on("disconnect", () => {
        console.log("Proctor socket disconnected");
      });
    }
    return this.socket;
  }

  public disconnectProctor() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public onFlagEvent(callback: (flag: Flag) => void) {
    this.socket?.on("flag_event", callback as any);
  }

  public offFlagEvent(callback: (flag: Flag) => void) {
    this.socket?.off("flag_event", callback as any);
  }

  public onSessionUpdate(callback: (session: LiveSession) => void) {
    this.socket?.on("session_update", callback as any);
  }

  public offSessionUpdate(callback: (session: LiveSession) => void) {
    this.socket?.off("session_update", callback as any);
  }

  public getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
