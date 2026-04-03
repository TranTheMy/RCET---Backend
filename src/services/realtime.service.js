const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');

class RealtimeService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  /**
   * Initialize WebSocket server
   */
  init(io) {
    this.io = io;

    io.use(this.authenticateSocket.bind(this));

    io.on('connection', (socket) => {
      const userId = socket.userId;
      const userRole = socket.userRole;

      logger.info(`User ${userId} (${userRole}) connected via WebSocket`);

      // Store connection
      this.connectedUsers.set(userId, socket.id);

      // Join user-specific room
      socket.join(`user_${userId}`);

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`User ${userId} disconnected from WebSocket`);
        this.connectedUsers.delete(userId);
      });

      // Handle dashboard subscription
      socket.on('subscribe_dashboard', () => {
        socket.join(`dashboard_${userId}`);
        logger.debug(`User ${userId} subscribed to dashboard updates`);
      });

      // Handle project room subscription
      socket.on('subscribe_project', (projectId) => {
        socket.join(`project_${projectId}`);
        logger.debug(`User ${userId} subscribed to project ${projectId}`);
      });
    });
  }

  /**
   * Authenticate WebSocket connection using JWT
   */
  authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, env.jwt.accessSecret);

      // Attach user info to socket
      socket.userId = decoded.id;
      socket.userRole = decoded.role;

      next();
    } catch (error) {
      logger.warn('WebSocket authentication failed:', error.message);
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Broadcast dashboard update to specific user
   */
  broadcastDashboardUpdate(userId, updateType, data) {
    if (!this.io) return;

    const eventData = {
      type: updateType,
      data: data,
      timestamp: new Date().toISOString()
    };

    // Send to user's dashboard room
    this.io.to(`dashboard_${userId}`).emit('dashboard_update', eventData);

    logger.debug(`Broadcasted ${updateType} update to user ${userId}`);
  }

  /**
   * Broadcast project update to all project members
   */
  broadcastProjectUpdate(projectId, updateType, data, excludeUserId = null) {
    if (!this.io) return;

    const eventData = {
      type: updateType,
      data: data,
      timestamp: new Date().toISOString(),
      projectId: projectId
    };

    // Send to project room (all members)
    this.io.to(`project_${projectId}`).emit('project_update', eventData);

    logger.debug(`Broadcasted ${updateType} update to project ${projectId}`);
  }

  /**
   * Send notification to specific user
   */
  sendNotification(userId, notification) {
    if (!this.io) return;

    const notificationData = {
      id: Date.now(),
      ...notification,
      timestamp: new Date().toISOString()
    };

    this.io.to(`user_${userId}`).emit('notification', notificationData);

    logger.debug(`Sent notification to user ${userId}: ${notification.title}`);
  }

  /**
   * Check if user is currently connected
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Broadcast system-wide announcement
   */
  broadcastAnnouncement(message, level = 'info') {
    if (!this.io) return;

    const announcement = {
      message,
      level, // info, warning, error, success
      timestamp: new Date().toISOString()
    };

    this.io.emit('announcement', announcement);

    logger.info(`Broadcasted system announcement: ${message}`);
  }
}

module.exports = new RealtimeService();