require('dotenv').config();
const passport = require('./config/passport');

// --- Debugging Logs ---
console.log('--- Starting Server ---');
console.log(`[DEBUG] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[DEBUG] MONGODB_URI is set: ${!!process.env.MONGODB_URI}`);
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const http = require('http');
const { Server } = require('socket.io');

const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const connectDB = require('./config/database');
const initializeSocket = require('./socket');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const boardRoutes = require('./routes/board.routes');
const listRoutes = require('./routes/list.routes');
const cardRoutes = require('./routes/card.routes');
const activityRoutes = require('./routes/activity.routes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);
initializeSocket(io);
console.log('[DEBUG] Socket initialized; continuing server setup...');

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(compression());

// CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/activities', activityRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error Handler Middleware
app.use(errorHandler);

// Start the server - thử lần lượt port 5001..5010 nếu bị EADDRINUSE
const PORT_MIN = 5001;
const PORT_MAX = 5010;

const startServer = async () => {
  try {
    console.log('[DEBUG] Attempting MongoDB connection...');
    await connectDB();
    console.log('[DEBUG] MongoDB connection successful.');
    let port = parseInt(process.env.PORT, 10) || PORT_MIN;
    if (port === 5000 && process.env.NODE_ENV !== 'production') port = PORT_MIN;
    if (port < PORT_MIN || port > PORT_MAX) port = PORT_MIN;

    function tryListen(p) {
      if (p > PORT_MAX) {
        console.error(`❌ Không có port trống trong khoảng ${PORT_MIN}-${PORT_MAX}. Tắt process đang dùng port hoặc đổi PORT trong backend/.env`);
        process.exit(1);
        return;
      }
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`[DEBUG] Port ${p} đang dùng, thử port ${p + 1}...`);
          tryListen(p + 1);
        } else {
          console.error('Server error:', err);
          process.exit(1);
        }
      });
      server.listen(p, () => {
        logger.info(`🚀 Server is running on port ${p}`);
        logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
        if (p !== PORT_MIN) {
          console.log(`💡 Nếu frontend không gọi được API: trong frontend/.env đặt VITE_API_URL=http://localhost:${p}/api và VITE_SOCKET_URL=http://localhost:${p}`);
        }
      });
    }
    tryListen(port);
  } catch (err) {
    console.error('Failed to start server due to startup error:', err);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  process.exit(1);
});

module.exports = { app, server, io };