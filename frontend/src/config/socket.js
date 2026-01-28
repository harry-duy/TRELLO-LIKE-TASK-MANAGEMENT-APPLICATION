import { io } from 'socket.io-client';
import { useAuthStore } from '@store/authStore';

let socket = null;

export const initializeSocket = () => {
  const token = useAuthStore.getState().accessToken;

  if (!token) {
    console.warn('No auth token found, skipping socket connection');
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    // If auth error, try to refresh token
    if (error.message === 'Authentication error') {
      useAuthStore.getState().refreshToken();
    }
  });

  return socket;
};

export const getSocket = () => {
  if (!socket || !socket.connected) {
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Board room methods
export const joinBoard = (boardId) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('join:board', boardId);
  }
};

export const leaveBoard = (boardId) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('leave:board', boardId);
  }
};

// Card events
export const emitCardMove = (data) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('card:move', data);
  }
};

export const emitCardUpdate = (data) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('card:update', data);
  }
};

// Comment events
export const emitCommentAdd = (data) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('comment:add', data);
  }
};

// List events
export const emitListCreate = (data) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('list:create', data);
  }
};

export const emitListUpdate = (data) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('list:update', data);
  }
};

export const emitListDelete = (data) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('list:delete', data);
  }
};

// Typing indicator
export const emitTypingStart = (data) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('typing:start', data);
  }
};

export const emitTypingStop = (data) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('typing:stop', data);
  }
};

// Event listeners
export const onCardMoved = (callback) => {
  const sock = getSocket();
  if (sock) {
    sock.on('card:moved', callback);
    return () => sock.off('card:moved', callback);
  }
};

export const onCardUpdated = (callback) => {
  const sock = getSocket();
  if (sock) {
    sock.on('card:updated', callback);
    return () => sock.off('card:updated', callback);
  }
};

export const onCommentAdded = (callback) => {
  const sock = getSocket();
  if (sock) {
    sock.on('comment:added', callback);
    return () => sock.off('comment:added', callback);
  }
};

export const onListCreated = (callback) => {
  const sock = getSocket();
  if (sock) {
    sock.on('list:created', callback);
    return () => sock.off('list:created', callback);
  }
};

export const onListUpdated = (callback) => {
  const sock = getSocket();
  if (sock) {
    sock.on('list:updated', callback);
    return () => sock.off('list:updated', callback);
  }
};

export const onListDeleted = (callback) => {
  const sock = getSocket();
  if (sock) {
    sock.on('list:deleted', callback);
    return () => sock.off('list:deleted', callback);
  }
};

export const onUserJoined = (callback) => {
  const sock = getSocket();
  if (sock) {
    sock.on('user:joined', callback);
    return () => sock.off('user:joined', callback);
  }
};

export const onUserLeft = (callback) => {
  const sock = getSocket();
  if (sock) {
    sock.on('user:left', callback);
    return () => sock.off('user:left', callback);
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  joinBoard,
  leaveBoard,
  emitCardMove,
  emitCardUpdate,
  emitCommentAdd,
  emitListCreate,
  emitListUpdate,
  emitListDelete,
  onCardMoved,
  onCardUpdated,
  onCommentAdded,
  onListCreated,
  onListUpdated,
  onListDeleted,
  onUserJoined,
  onUserLeft,
};