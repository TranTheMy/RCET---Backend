
const { sequelize } = require('./src/models');
const logger = require('./src/utils/logger');

const resetDatabase = async () => {
  logger.info('Starting FINAL ATTEMPT database reset for MSSQL...');
  const transaction = await sequelize.transaction();

  try {
    // Step 1: Drop all foreign key constraints
    logger.info('Step 1/4: Fetching all foreign key constraints...');
    const fkConstraints = await sequelize.query(
      `SELECT 'ALTER TABLE [' + OBJECT_SCHEMA_NAME(parent_object_id) + '].[' + OBJECT_NAME(parent_object_id) + '] DROP CONSTRAINT [' + name + ']' as 'drop_statement'
       FROM sys.foreign_keys`,
      { type: sequelize.QueryTypes.SELECT, transaction }
    );

    if (fkConstraints.length > 0) {
      logger.info(`Step 2/4: Dropping ${fkConstraints.length} foreign key constraints...`);
      for (const constraint of fkConstraints) {
        await sequelize.query(constraint.drop_statement, { transaction });
      }
      logger.info('All foreign key constraints dropped.');
    } else {
      logger.info('Step 2/4: No foreign key constraints found.');
    }

    // Step 2: Drop all user tables using INFORMATION_SCHEMA for maximum reliability
    logger.info('Step 3/4: Fetching all user tables via INFORMATION_SCHEMA...');
    const tables = await sequelize.query(
      `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA != 'sys'`,
      { type: sequelize.QueryTypes.SELECT, transaction }
    );

    if (tables.length > 0) {
      logger.info(`Step 3b/4: Dropping ${tables.length} tables manually...`);
      for (const table of tables) {
        logger.info(`-- Dropping table: [${table.TABLE_SCHEMA}].[${table.TABLE_NAME}]`);
        await sequelize.query(`DROP TABLE [${table.TABLE_SCHEMA}].[${table.TABLE_NAME}]`, { transaction });
      }
      logger.info('All tables dropped successfully.');
    } else {
      logger.info('Step 3/4: No tables found to drop.');
    }

    // Commit the transaction after all destructive operations
    await transaction.commit();

    // Step 4: Recreate the database schema
    logger.info('Step 4/4: Recreating database schema from models...');
    await sequelize.sync();
    logger.info('Database schema recreated successfully.');

    logger.info('DATABASE RESET COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    logger.error('AN ERROR OCCURRED DURING DATABASE RESET:', error);
    if (transaction) await transaction.rollback();
    process.exit(1);
  }
};

resetDatabase();