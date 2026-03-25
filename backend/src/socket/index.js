// backend/src/socket/index.js
const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');

const activeUsers = new Map();

const initializeSocket = (io) => {
  // Auth middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication error'));

      const decoded  = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId  = decoded.id;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userId}`);
    activeUsers.set(socket.userId, socket.id);

    // ✅ MỖI USER TỰ JOIN ROOM RIÊNG — để nhận notification cá nhân
    socket.join(`user:${socket.userId}`);
    logger.info(`User ${socket.userId} joined personal room user:${socket.userId}`);

    // ── Board rooms ─────────────────────────────────────────────────────────
    socket.on('join:board', (boardId) => {
      socket.join(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user:joined', {
        userId: socket.userId,
        boardId,
      });
    });

    socket.on('leave:board', (boardId) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user:left', {
        userId: socket.userId,
        boardId,
      });
    });

    // ── Card events ──────────────────────────────────────────────────────────
    socket.on('card:move', ({ boardId, cardId, fromListId, toListId, position }) => {
      socket.to(`board:${boardId}`).emit('card:moved', {
        cardId, fromListId, toListId, position,
        movedBy: socket.userId,
      });
    });

    socket.on('card:update', ({ boardId, cardId, updates }) => {
      socket.to(`board:${boardId}`).emit('card:updated', {
        cardId, updates, updatedBy: socket.userId,
      });
    });

    // ── Comment events ───────────────────────────────────────────────────────
    socket.on('comment:add', ({ boardId, cardId, comment }) => {
      socket.to(`board:${boardId}`).emit('comment:added', {
        cardId, comment, addedBy: socket.userId,
      });
    });

    // ── List events ──────────────────────────────────────────────────────────
    socket.on('list:create', ({ boardId, list }) => {
      socket.to(`board:${boardId}`).emit('list:created', {
        list, createdBy: socket.userId,
      });
    });

    socket.on('list:update', ({ boardId, listId, updates }) => {
      socket.to(`board:${boardId}`).emit('list:updated', {
        listId, updates, updatedBy: socket.userId,
      });
    });

    socket.on('list:delete', ({ boardId, listId }) => {
      socket.to(`board:${boardId}`).emit('list:deleted', {
        listId, deletedBy: socket.userId,
      });
    });

    // ── Typing ───────────────────────────────────────────────────────────────
    socket.on('typing:start', ({ boardId, cardId }) => {
      socket.to(`board:${boardId}`).emit('typing:started', {
        cardId, userId: socket.userId,
      });
    });

    socket.on('typing:stop', ({ boardId, cardId }) => {
      socket.to(`board:${boardId}`).emit('typing:stopped', {
        cardId, userId: socket.userId,
      });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}`);
      activeUsers.delete(socket.userId);

      Array.from(socket.rooms).forEach((room) => {
        if (room.startsWith('board:')) {
          socket.to(room).emit('user:disconnected', { userId: socket.userId });
        }
      });
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for user ${socket.userId}:`, err);
    });
  });

  // Helpers
  io.emitToBoard    = (boardId, event, data) => io.to(`board:${boardId}`).emit(event, data);
  io.emitToUser     = (userId,  event, data) => io.to(`user:${userId}`).emit(event, data);
  io.isUserOnline   = (userId)  => activeUsers.has(userId);
  io.getOnlineCount = ()        => activeUsers.size;

  logger.info('✅ Socket.io initialized successfully');
};

module.exports = initializeSocket;