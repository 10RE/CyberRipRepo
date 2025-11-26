import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

// Connect to current host
const URL = (import.meta as any).env.PROD ? '/' : 'http://localhost:3000';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(URL, {
    autoConnect: true,
    transports: ['websocket']
});