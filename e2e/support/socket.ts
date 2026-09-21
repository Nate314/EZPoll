import { io, Socket } from 'socket.io-client';
import { config } from './config';

export interface ConnectOptions {
  origin?: string;
  transport?: 'polling' | 'websocket';
}

/** A raw socket.io client, the way any non-browser script could talk to the server. */
export function connectSocket({ origin, transport = 'websocket' }: ConnectOptions = {}): Socket {
  return io(config.socketUrl, {
    transports: [transport],
    forceNew: true,
    reconnection: false,
    extraHeaders: origin ? { Origin: origin } : undefined,
  });
}

export function connected(socket: Socket, timeoutMs = 8_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket did not connect')), timeoutMs);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('connect_error', error => { clearTimeout(timer); reject(error); });
  });
}

export function connectionRefused(socket: Socket, timeoutMs = 8_000): Promise<Error> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket neither connected nor failed')), timeoutMs);
    socket.once('connect', () => { clearTimeout(timer); reject(new Error('socket connected but should have been refused')); });
    socket.once('connect_error', error => { clearTimeout(timer); resolve(error); });
  });
}

/** Emits an event and resolves with the acknowledgement payload. */
export function emitAck<T = any>(socket: Socket, event: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ack for ${event}`)), 8_000);
    socket.emit(event, ...args, (response: T) => { clearTimeout(timer); resolve(response); });
  });
}
