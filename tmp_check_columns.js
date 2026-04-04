const { sequelize } = require('./src/models');
(async () => {
  try {
    const [result] = await sequelize.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='commitments' ORDER BY ORDINAL_POSITION;");
    console.log(result);
    await sequelize.close();
  } catch (err) {
    console.error(err);
  }
})();