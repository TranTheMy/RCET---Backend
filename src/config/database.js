const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: env.db.encrypt,
      trustServerCertificate: true,
    },
  },
  logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;
