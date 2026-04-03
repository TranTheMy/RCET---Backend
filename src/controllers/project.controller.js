const projectService = require('../services/project.service');
const ApiResponse = require('../utils/response');
const realtimeService = require('../services/realtime.service');

// ======== Projects ========

const listProjects = async (req, res, next) => {
  try {
    const { status, tag, page, limit } = req.query;
    const result = await projectService.listProjects(
      { status, tag, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 20 },
      req.user,
    );
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const checkCode = async (req, res, next) => {
  try {
    const result = await projectService.checkCodeExists(req.query.code);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const createProject = async (req, res, next) => {
  try {
    const result = await projectService.createProject(req.body, req.user.id);
    return ApiResponse.created(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const getProjectDetail = async (req, res, next) => {
  try {
    const result = await projectService.getProjectDetail(req.params.id, req.user);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const result = await projectService.updateProject(req.params.id, req.body, req.user);

    // Broadcast realtime update to all project members
    realtimeService.broadcastProjectUpdate(req.params.id, 'project_updated', {
      project: result
    });

    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const getProjectOverview = async (req, res, next) => {
  try {
    const result = await projectService.getProjectOverview(req.params.id, req.user);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

// ======== Tasks ========

const listTasks = async (req, res, next) => {
  try {
    const { assignee_id, priority, status, page, limit } = req.query;
    const result = await projectService.listTasks(
      req.params.id,
      { assignee_id, priority, status, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 50 },
      req.user,
    );
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const result = await projectService.createTask(req.params.id, req.body, req.user);

    // Broadcast realtime update to project members
    realtimeService.broadcastProjectUpdate(req.params.id, 'task_created', {
      task: result,
      createdBy: req.user.id
    });

    // Notify assignee if different from creator
    if (result.assignee_id && result.assignee_id !== req.user.id) {
      realtimeService.sendNotification(result.assignee_id, {
        title: 'New Task Assigned',
        message: `You have been assigned to task: ${result.title}`,
        type: 'task_assigned',
        data: { taskId: result.id, projectId: req.params.id }
      });
    }

    return ApiResponse.created(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const result = await projectService.updateTask(req.params.id, req.params.taskId, req.body, req.user);

    // Broadcast realtime update to project members
    realtimeService.broadcastProjectUpdate(req.params.id, 'task_updated', {
      task: result,
      updatedBy: req.user.id
    });

    // Notify assignee if status changed or reassigned
    if (result.assignee_id && result.assignee_id !== req.user.id) {
      const notificationType = req.body.status ? 'task_status_changed' : 'task_updated';
      const message = req.body.status
        ? `Task "${result.title}" status changed to ${result.status}`
        : `Task "${result.title}" has been updated`;

      realtimeService.sendNotification(result.assignee_id, {
        title: 'Task Updated',
        message: message,
        type: notificationType,
        data: { taskId: result.id, projectId: req.params.id }
      });
    }

    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const getTaskDetail = async (req, res, next) => {
  try {
    const result = await projectService.getTaskDetail(req.params.id, req.params.taskId, req.user);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

// ======== Members ========

const listMembers = async (req, res, next) => {
  try {
    const result = await projectService.listMembers(req.params.id, req.user);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const result = await projectService.addMember(req.params.id, req.body, req.user);

    // Broadcast realtime update to all project members
    realtimeService.broadcastProjectUpdate(req.params.id, 'member_added', {
      member: result
    });

    return ApiResponse.created(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const result = await projectService.removeMember(req.params.id, req.params.memberId, req.user);

    // Broadcast realtime update to all project members
    realtimeService.broadcastProjectUpdate(req.params.id, 'member_removed', {
      removedMemberId: req.params.memberId,
      removedBy: req.user.id
    });

    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

// ======== Milestones ========

const listMilestones = async (req, res, next) => {
  try {
    const result = await projectService.listMilestones(req.params.id, req.user);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const createMilestone = async (req, res, next) => {
  try {
    const result = await projectService.createMilestone(req.params.id, req.body, req.user);

    // Broadcast realtime update to all project members
    realtimeService.broadcastProjectUpdate(req.params.id, 'milestone_created', {
      milestone: result
    });

    return ApiResponse.created(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const updateMilestone = async (req, res, next) => {
  try {
    const result = await projectService.updateMilestone(req.params.id, req.params.milestoneId, req.body, req.user);

    // Broadcast realtime update to all project members
    realtimeService.broadcastProjectUpdate(req.params.id, 'milestone_updated', {
      milestone: result
    });

    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

// ======== Reports ========

const listReports = async (req, res, next) => {
  try {
    const { week_number, year, user_id, page, limit } = req.query;
    const result = await projectService.listReports(
      req.params.id,
      { week_number, year, user_id, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 50 },
      req.user,
    );
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const getComplianceMatrix = async (req, res, next) => {
  try {
    const weeks = req.query.weeks ? parseInt(req.query.weeks, 10) : 8;
    const result = await projectService.getComplianceMatrix(req.params.id, { weeks }, req.user);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const createReport = async (req, res, next) => {
  try {
    const result = await projectService.createReport(req.params.id, req.body, req.user);

    // Broadcast realtime update to all project members
    realtimeService.broadcastProjectUpdate(req.params.id, 'report_created', {
      report: result.report,
      submittedBy: result.submittedBy
    });

    return ApiResponse.created(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

// ======== Git Repo ========

const getGitRepo = async (req, res, next) => {
  try {
    const result = await projectService.getGitRepo(req.params.id, req.user);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const updateGitRepo = async (req, res, next) => {
  try {
    const result = await projectService.updateGitRepo(req.params.id, req.body, req.user);

    // Broadcast realtime update to all project members
    realtimeService.broadcastProjectUpdate(req.params.id, 'git_repo_updated', {
      gitRepo: result
    });

    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const handleGitWebhook = async (req, res, next) => {
  try {
    const result = await projectService.handleGitWebhook(req.params.id, req.body);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const searchActiveUsers = async (req, res, next) => {
  try {
    const result = await projectService.searchActiveUsers(req.query.q || '');
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

module.exports = {
  listProjects,
  checkCode,
  createProject,
  getProjectDetail,
  updateProject,
  getProjectOverview,
  listTasks,
  createTask,
  updateTask,
  getTaskDetail,
  listMembers,
  addMember,
  removeMember,
  listMilestones,
  createMilestone,
  updateMilestone,
  listReports,
  getComplianceMatrix,
  createReport,
  getGitRepo,
  updateGitRepo,
  handleGitWebhook,
  searchActiveUsers,
};
