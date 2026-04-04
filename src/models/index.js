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
const VerilogProblem = require('./VerilogProblem');
const VerilogTestCase = require('./VerilogTestCase');
const VerilogSubmission = require('./VerilogSubmission');
const VerilogSubmissionResult = require('./VerilogSubmissionResult');
const Notification = require('./Notification');

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
Task.belongsTo(User, { foreignKey: 'assignee_id', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Project <-> Milestones
Project.hasMany(Milestone, { foreignKey: 'project_id', as: 'milestones' });
Milestone.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Milestone <-> Tasks (many-to-many through MilestoneTask)
// onDelete: 'NO ACTION' required for MSSQL — cannot have two FK with CASCADE on the same table
Milestone.belongsToMany(Task, { through: MilestoneTask, foreignKey: 'milestone_id', otherKey: 'task_id', as: 'linkedTasks', onDelete: 'NO ACTION' });
Task.belongsToMany(Milestone, { through: MilestoneTask, foreignKey: 'task_id', otherKey: 'milestone_id', as: 'milestones', onDelete: 'NO ACTION' });

// Project <-> WeeklyReports
Project.hasMany(WeeklyReport, { foreignKey: 'project_id', as: 'weeklyReports' });
WeeklyReport.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
WeeklyReport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(WeeklyReport, { foreignKey: 'user_id', as: 'weeklyReports' });

// ======== Verilog OJ Associations ========
VerilogProblem.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasMany(VerilogProblem, { foreignKey: 'owner_id', as: 'verilogProblems' });

VerilogProblem.hasMany(VerilogTestCase, { foreignKey: 'problem_id', as: 'testcases', onDelete: 'CASCADE', hooks: true });
VerilogTestCase.belongsTo(VerilogProblem, { foreignKey: 'problem_id', as: 'problem' });

VerilogProblem.hasMany(VerilogSubmission, { foreignKey: 'problem_id', as: 'submissions', onDelete: 'CASCADE', hooks: true });
VerilogSubmission.belongsTo(VerilogProblem, { foreignKey: 'problem_id', as: 'problem' });

VerilogSubmission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(VerilogSubmission, { foreignKey: 'user_id', as: 'verilogSubmissions' });

VerilogSubmission.hasMany(VerilogSubmissionResult, { foreignKey: 'submission_id', as: 'results', onDelete: 'CASCADE', hooks: true });
VerilogSubmissionResult.belongsTo(VerilogSubmission, { foreignKey: 'submission_id', as: 'submission' });

VerilogSubmissionResult.belongsTo(VerilogTestCase, { foreignKey: 'testcase_id', as: 'testcase' });
VerilogTestCase.hasMany(VerilogSubmissionResult, { foreignKey: 'testcase_id', as: 'results', onDelete: 'SET NULL' });

// ======== Notification Associations ========
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
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
  VerilogProblem,
  VerilogTestCase,
  VerilogSubmission,
  VerilogSubmissionResult,
  Notification,
};
