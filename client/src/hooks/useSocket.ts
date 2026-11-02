import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@mindloop/shared';
import { getToken } from '../api/client';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let sharedSocket: TypedSocket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    if (sharedSocket?.connected) {
      socketRef.current = sharedSocket;
      setIsConnected(true);
      return;
    }

    const s = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    }) as TypedSocket;

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));

    sharedSocket = s;
    socketRef.current = s;
  }, []);

  const disconnect = useCallback(() => {
    if (sharedSocket) {
      sharedSocket.disconnect();
      sharedSocket = null;
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (sharedSocket) {
        sharedSocket.off('connect');
        sharedSocket.off('disconnect');
      }
    };
  }, []);

  return { socket: socketRef.current, isConnected, connect, disconnect };
}
