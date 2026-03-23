const router = require('express').Router();
const projectController = require('../controllers/project.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const checkStatus = require('../middlewares/status.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  addMemberSchema,
  createReportSchema,
  updateGitRepoSchema,
  gitWebhookSchema,
} = require('../validators/project.validator');
const { SYSTEM_ROLES } = require('../config/constants');

// Git webhook has no auth (called by GitHub/GitLab/Bitbucket)
router.post('/:id/git/webhook', validate(gitWebhookSchema), projectController.handleGitWebhook);

// All other project routes require authentication
router.use(authMiddleware);

// ======== Projects ========

// List projects (all authenticated + active users)
router.get('/', projectController.listProjects);

// Check project code availability
router.get('/check-code', projectController.checkCode);

// Search active users (for leader picker when creating project)
router.get('/active-users', projectController.searchActiveUsers);

// Create project (truong_lab, vien_truong only)
router.post(
  '/',
  checkRole(SYSTEM_ROLES.TRUONG_LAB, SYSTEM_ROLES.VIEN_TRUONG),
  validate(createProjectSchema),
  projectController.createProject,
);

// Get project detail
router.get('/:id', projectController.getProjectDetail);

// Update project
router.put('/:id', validate(updateProjectSchema), projectController.updateProject);

// Get project overview (Tab 1)
router.get('/:id/overview', projectController.getProjectOverview);

// ======== Tasks (Tab 2) ========

router.get('/:id/tasks', projectController.listTasks);
router.post('/:id/tasks', validate(createTaskSchema), projectController.createTask);
router.get('/:id/tasks/:taskId', projectController.getTaskDetail);
router.put('/:id/tasks/:taskId', validate(updateTaskSchema), projectController.updateTask);

// ======== Reports (Tab 3) ========

router.get('/:id/reports', projectController.listReports);
router.get('/:id/reports/compliance', projectController.getComplianceMatrix);
router.post('/:id/reports', validate(createReportSchema), projectController.createReport);

// ======== Members (Tab 4) ========

router.get('/:id/members', projectController.listMembers);
router.post('/:id/members', validate(addMemberSchema), projectController.addMember);
router.delete('/:id/members/:memberId', projectController.removeMember);

// ======== Milestones (Tab 5 - Master Plan) ========

router.get('/:id/milestones', projectController.listMilestones);
router.post('/:id/milestones', validate(createMilestoneSchema), projectController.createMilestone);
router.put('/:id/milestones/:milestoneId', validate(updateMilestoneSchema), projectController.updateMilestone);

// ======== Git Repo (Tab 5 - truong_lab only) ========

router.get('/:id/git', projectController.getGitRepo);
router.put(
  '/:id/git',
  checkRole(SYSTEM_ROLES.TRUONG_LAB),
  validate(updateGitRepoSchema),
  projectController.updateGitRepo,
);

module.exports = router;
