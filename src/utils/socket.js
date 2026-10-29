
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let socket = null;

export function connectSocket(token) {
  if (!token) {
    disconnectSocket();
    return null;
  }

  // Reuse the existing connection for the same login session.
  if (socket?.connected && socket.auth?.token === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
    reconnection: true,
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
  });

  socket.connect();

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
