const sequelize = require('../config/database');
const User = require('./User');
const ApprovalRequest = require('./ApprovalRequest');
const AuditLog = require('./AuditLog');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Task = require('./Task');
const Milestone = require('./Milestone');
const MilestoneTask = require('./MilestoneTask');
const WeeklyReport = require('./WeeklyReport');
const Commitment = require('./Commitment');
const RewardSheet = require('./RewardSheet');
const RewardSheetDetail = require('./RewardSheetDetail');

// ======== User & Approval Associations ========
User.hasMany(ApprovalRequest, { foreignKey: 'user_id', as: 'approvalRequests' });
ApprovalRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ApprovalRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

User.hasMany(AuditLog, { foreignKey: 'performed_by', as: 'performedAudits' });
User.hasMany(AuditLog, { foreignKey: 'target_user_id', as: 'targetAudits' });
AuditLog.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });
AuditLog.belongsTo(User, { foreignKey: 'target_user_id', as: 'target' });

// ======== Project Associations ========
Project.belongsTo(User, { foreignKey: 'leader_id', as: 'leader' });
User.hasMany(Project, { foreignKey: 'leader_id', as: 'ledProjects' });

// Project <-> Members (through ProjectMember)
Project.hasMany(ProjectMember, { foreignKey: 'project_id', as: 'members' });
ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(ProjectMember, { foreignKey: 'user_id', as: 'projectMemberships' });

// Project <-> Tasks
Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Task <-> User (Assignee & Creator)
Task.belongsTo(User, { foreignKey: 'assignee_id', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Task, { foreignKey: 'assignee_id', as: 'assignedTasks' });
User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });

// Project <-> Milestones
Project.hasMany(Milestone, { foreignKey: 'project_id', as: 'milestones' });
Milestone.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Milestone <-> Tasks (through MilestoneTask)
Milestone.belongsToMany(Task, { 
  through: MilestoneTask, 
  foreignKey: 'milestone_id', 
  as: 'tasks',
  onDelete: 'CASCADE' // Nhánh này giữ nguyên CASCADE để khi xóa Milestone thì tự xóa liên kết
});

Task.belongsToMany(Milestone, { 
  through: MilestoneTask, 
  foreignKey: 'task_id', 
  as: 'milestones',
  onDelete: 'NO ACTION' // <--- THÊM DÒNG NÀY ĐỂ NGĂN SQL SERVER BÁO LỖI
});

// Project <-> WeeklyReports
Project.hasMany(WeeklyReport, { foreignKey: 'project_id', as: 'weeklyReports' });
WeeklyReport.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
WeeklyReport.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
User.hasMany(WeeklyReport, { foreignKey: 'user_id', as: 'authoredWeeklyReports' });

// ======== Commitment Associations ========
Commitment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Commitment, { foreignKey: 'user_id', as: 'commitments' });

// ======== Reward Associations ========
// Thêm liên kết 1-1 giữa Project và RewardSheet
Project.hasOne(RewardSheet, { foreignKey: 'project_id', as: 'rewardSheet' });
RewardSheet.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Liên kết giữa Sheet và Detail
RewardSheet.hasMany(RewardSheetDetail, { foreignKey: 'sheet_id', as: 'details' });
RewardSheetDetail.belongsTo(RewardSheet, { foreignKey: 'sheet_id', as: 'sheet' });

RewardSheetDetail.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(RewardSheetDetail, { foreignKey: 'user_id', as: 'rewardDetails' });

RewardSheet.belongsTo(User, { foreignKey: 'generated_by', as: 'generator' });
RewardSheet.belongsTo(User, { foreignKey: 'finalized_by', as: 'finalizer' });

const db = {
  sequelize,
  User,
  ApprovalRequest,
  AuditLog,
  Project,
  ProjectMember,
  Task,
  Milestone,
  MilestoneTask,
  WeeklyReport,
  Commitment,
  RewardSheet,
  RewardSheetDetail,
};

module.exports = db;