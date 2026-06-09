import { io, type Socket } from "socket.io-client";
import { getAccessToken, getApiBaseUrl } from "@/lib/api-client";

let socket: Socket | null = null;

export function connectTrackingSocket() {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication required for live tracking.");
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(`${getApiBaseUrl()}/tracking`, {
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
