const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const VerilogJudge = require('./services/verilog.judge');

const start = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync models: create tables if they don't exist (use npm run db:reset to rebuild schema)
    await sequelize.sync();
    logger.info('Database models synchronized');

    // Initialize Verilog judge service
    try {
      const judge = VerilogJudge.getInstance();
      await judge.initialize();
      logger.info('Verilog judge service initialized');
    } catch (err) {
      logger.warn('Verilog judge service not available (Yosys/Iverilog may not be installed):', err.message);
    }

    // Start server
    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
