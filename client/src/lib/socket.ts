import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@shared/constants';

let socketInstance: Socket | null = null;
let serverClockOffset: number = 0; // serverTime - clientTime
let pingIntervalTimer: any = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    // In production, connects directly to origin (e.g. http://192.168.1.50:3000)
    // In dev Vite proxy, connects to localhost:3000 or proxy
    const serverUrl = window.location.port === '5173'
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : window.location.origin;

    socketInstance = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    socketInstance.on('connect', () => {
      syncClock();
      if (!pingIntervalTimer) {
        pingIntervalTimer = setInterval(syncClock, 10000);
      }
    });

    socketInstance.on(SOCKET_EVENTS.TIME_SYNC_PONG, (data: { clientSendTime: number; serverReceiveTime: number }) => {
      const now = Date.now();
      const rtt = Math.max(0, now - data.clientSendTime);
      const estimatedServerTime = data.serverReceiveTime + rtt / 2;
      serverClockOffset = estimatedServerTime - now;
    });

    socketInstance.on('disconnect', () => {
      if (pingIntervalTimer) {
        clearInterval(pingIntervalTimer);
        pingIntervalTimer = null;
      }
    });
  }

  return socketInstance;
}

export const getGameSocket = getSocket;

export function syncClock(): void {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit(SOCKET_EVENTS.TIME_SYNC_PING, { clientSendTime: Date.now() });
  }
}

export function getServerTime(): number {
  return Date.now() + serverClockOffset;
}

export function getRemainingTimerMs(timerStartedAt: number | null, durationSeconds: number): number {
  if (!timerStartedAt) return durationSeconds * 1000;
  const currentServerTime = getServerTime();
  const elapsed = currentServerTime - timerStartedAt;
  return Math.max(0, durationSeconds * 1000 - elapsed);
}
