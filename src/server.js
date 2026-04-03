const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const http = require('http');
const socketIo = require('socket.io');
const realtimeService = require('./services/realtime.service');

const start = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync models: create tables if they don't exist (use npm run db:reset to rebuild schema)
    await sequelize.sync();
    logger.info('Database models synchronized');

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = socketIo(server, {
      cors: {
        origin: [
          env.clientUrl || "http://localhost:3000",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:3000",
          "null"
        ],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Initialize realtime service
    realtimeService.init(io);

    // Start server
    server.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
      logger.info('WebSocket realtime updates enabled');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
