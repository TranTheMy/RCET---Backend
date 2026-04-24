const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { PROJECT_STATUS_VALUES, PROJECT_STATUS } = require('../config/constants');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tag: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: PROJECT_STATUS.PLANNING,
    validate: {
      isIn: [PROJECT_STATUS_VALUES],
    },
  },
  leader_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  budget: {
    type: DataTypes.DECIMAL(18, 0),
    allowNull: true,
  },
  git_repo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  git_provider: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  git_default_branch: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  git_visibility: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  git_last_commit_sha: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  git_last_commit_author: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  git_last_commit_message: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  git_last_commit_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'Projects',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['code'],
      name: 'UQ_Project_Code',
    },
  ],
});

module.exports = Project;
