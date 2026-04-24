const { sequelize } = require('./src/models');
(async () => {
  try {
    const [cols] = await sequelize.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Commitments';");
    console.log(cols);
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
})();