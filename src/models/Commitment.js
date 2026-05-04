const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Commitment = sequelize.define('Commitment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  party_a_name: { type: DataTypes.STRING, allowNull: false },
  party_a_title: { type: DataTypes.STRING, allowNull: true },
  party_a_office: { type: DataTypes.STRING, allowNull: true },
  party_a_email: { type: DataTypes.STRING, allowNull: true },
  party_b_name: { type: DataTypes.STRING, allowNull: false },
  party_b_mssv: { type: DataTypes.STRING, allowNull: false },
  party_b_class: { type: DataTypes.STRING, allowNull: true },
  party_b_email: { type: DataTypes.STRING, allowNull: true },
  model_type: { type: DataTypes.INTEGER, allowNull: false },
  commitment_location: { type: DataTypes.STRING, allowNull: true },
  pdf_path: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'Commitments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Commitment;