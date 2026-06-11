import { io, type Socket } from "socket.io-client";
import { getAccessToken, getSocketBaseUrl } from "@/lib/api-client";

let socket: Socket | null = null;

export function connectTrackingSocket() {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication required for live tracking.");
  }

  if (socket?.connected) {
    return socket;
  }

  const socketBaseUrl = getSocketBaseUrl();
  socket = io(`${socketBaseUrl}/tracking`, {
    auth: { token },
    transports: ["websocket"]
  });

  return socket;
}

export function disconnectTrackingSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getTrackingSocket() {
  return socket;
}
