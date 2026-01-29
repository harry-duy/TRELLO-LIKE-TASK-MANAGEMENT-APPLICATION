const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');  

// Store active connections
const activeUsers = new Map();

const initializeSocket = (io) => {
  // Authentication middleware for socket
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userId}`);
    
    // Store user connection
    activeUsers.set(socket.userId, socket.id);

    // Join board room
    socket.on('join:board', (boardId) => {
      socket.join(`board:${boardId}`);
      logger.info(`User ${socket.userId} joined board ${boardId}`);
      
      // Notify others in the board
      socket.to(`board:${boardId}`).emit('user:joined', {
        userId: socket.userId,
        boardId,
      });
    });

    // Leave board room
    socket.on('leave:board', (boardId) => {
      socket.leave(`board:${boardId}`);
      logger.info(`User ${socket.userId} left board ${boardId}`);
      
      // Notify others in the board
      socket.to(`board:${boardId}`).emit('user:left', {
        userId: socket.userId,
        boardId,
      });
    });

    // Card moved event
    socket.on('card:move', (data) => {
      const { boardId, cardId, fromListId, toListId, position } = data;
      
      // Broadcast to all users in the board except sender
      socket.to(`board:${boardId}`).emit('card:moved', {
        cardId,
        fromListId,
        toListId,
        position,
        movedBy: socket.userId,
      });
    });

    // Card updated event
    socket.on('card:update', (data) => {
      const { boardId, cardId, updates } = data;
      
      socket.to(`board:${boardId}`).emit('card:updated', {
        cardId,
        updates,
        updatedBy: socket.userId,
      });
    });

    // Comment added event
    socket.on('comment:add', (data) => {
      const { boardId, cardId, comment } = data;
      
      socket.to(`board:${boardId}`).emit('comment:added', {
        cardId,
        comment,
        addedBy: socket.userId,
      });
    });

    // List created event
    socket.on('list:create', (data) => {
      const { boardId, list } = data;
      
      socket.to(`board:${boardId}`).emit('list:created', {
        list,
        createdBy: socket.userId,
      });
    });

    // List updated event
    socket.on('list:update', (data) => {
      const { boardId, listId, updates } = data;
      
      socket.to(`board:${boardId}`).emit('list:updated', {
        listId,
        updates,
        updatedBy: socket.userId,
      });
    });

    // List deleted event
    socket.on('list:delete', (data) => {
      const { boardId, listId } = data;
      
      socket.to(`board:${boardId}`).emit('list:deleted', {
        listId,
        deletedBy: socket.userId,
      });
    });

    // User typing indicator
    socket.on('typing:start', (data) => {
      const { boardId, cardId } = data;
      
      socket.to(`board:${boardId}`).emit('typing:started', {
        cardId,
        userId: socket.userId,
      });
    });

    socket.on('typing:stop', (data) => {
      const { boardId, cardId } = data;
      
      socket.to(`board:${boardId}`).emit('typing:stopped', {
        cardId,
        userId: socket.userId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}`);
      activeUsers.delete(socket.userId);
      
      // Notify all rooms the user was in
      const rooms = Array.from(socket.rooms);
      rooms.forEach((room) => {
        if (room.startsWith('board:')) {
          socket.to(room).emit('user:disconnected', {
            userId: socket.userId,
          });
        }
      });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Helper function to emit to specific board
  io.emitToBoard = (boardId, event, data) => {
    io.to(`board:${boardId}`).emit(event, data);
  };

  // Helper function to check if user is online
  io.isUserOnline = (userId) => {
    return activeUsers.has(userId);
  };

  // Helper function to get online users count
  io.getOnlineUsersCount = () => {
    return activeUsers.size;
  };

  logger.info('✅ Socket.io initialized successfully');
};

module.exports = initializeSocket;