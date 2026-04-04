const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');
const logger = require('./utils/logger');

const start = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync models: create tables if they don't exist (use npm run db:reset to rebuild schema)
    await sequelize.sync();
    logger.info('Database models synchronized');

    // Seed database with a test user if it doesn't exist
    const { User } = require('./models');
    const { SYSTEM_ROLES } = require('./config/constants');
    const bcrypt = require('bcryptjs');

    const testUserEmail = 'vien_truong@rcet.dev';
    const userExists = await User.findOne({ where: { email: testUserEmail } });

    if (!userExists) {
      logger.info('Test user not found. Seeding database with a test user...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        full_name: 'Vien Truong',
        email: testUserEmail,
        password_hash: hashedPassword,
        system_role: SYSTEM_ROLES.VIEN_TRUONG,
        status: 'active',
        email_verified: true,
      });
      logger.info(`Test user '${testUserEmail}' created with password 'password123'.`);
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