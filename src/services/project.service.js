const { Op } = require('sequelize');
const {
  Project, ProjectMember, Task, Milestone, MilestoneTask,
  WeeklyReport, User, sequelize,
} = require('../models');
const {
  PROJECT_STATUS, PROJECT_STATUS_TRANSITIONS, PROJECT_ROLES,
  SYSTEM_ROLES, TASK_STATUS, AUDIT_ACTIONS,
} = require('../config/constants');
const auditService = require('./audit.service');
const rewardService = require('./reward.service');

// =====================================================
// Helpers
// =====================================================

/**
 * Check if user is a member (any role) of the project
 */
const isProjectMember = async (projectId, userId) => {
  const member = await ProjectMember.findOne({
    where: { project_id: projectId, user_id: userId },
  });
  return member;
};

/**
 * Check if user is project leader
 */
const isProjectLeader = async (projectId, userId) => {
  const project = await Project.findByPk(projectId);
  return project && project.leader_id === userId;
};

/**
 * Check if user has write access to the project
 * truong_lab/vien_truong: full access
 * leader: partial access
 */
const checkProjectAccess = (userRole, projectLeaderId, userId) => {
  if ([SYSTEM_ROLES.TRUONG_LAB, SYSTEM_ROLES.VIEN_TRUONG].includes(userRole)) {
    return 'admin';
  }
  if (projectLeaderId === userId) {
    return 'leader';
  }
  return 'member';
};

// =====================================================
// Projects CRUD
// =====================================================

const listProjects = async ({ status, tag, page = 1, limit = 20 }, user) => {
  const where = {};
  if (status) where.status = status;
  if (tag) where.tag = tag;

  const offset = (page - 1) * limit;
  const isAdmin = [SYSTEM_ROLES.TRUONG_LAB, SYSTEM_ROLES.VIEN_TRUONG].includes(user.system_role);

  let projectIds;
  if (!isAdmin) {
    // leader/member only see projects they belong to
    const memberships = await ProjectMember.findAll({
      where: { user_id: user.id },
      attributes: ['project_id'],
    });
    const leaderProjects = await Project.findAll({
      where: { leader_id: user.id },
      attributes: ['id'],
    });
    projectIds = [
      ...new Set([
        ...memberships.map((m) => m.project_id),
        ...leaderProjects.map((p) => p.id),
      ]),
    ];
    where.id = { [Op.in]: projectIds };
  }

  const { rows, count } = await Project.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'leader',
        attributes: ['id', 'full_name', 'email'],
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  // Enrich with member_count, task_progress, report_rate, at_risk
  const projectsWithStats = await Promise.all(rows.map(async (project) => {
    const p = project.toJSON();

    const memberCount = await ProjectMember.count({ where: { project_id: p.id } });

    const taskTotal = await Task.count({ where: { project_id: p.id } });
    const taskDone = await Task.count({ where: { project_id: p.id, status: TASK_STATUS.DONE } });

    // Report rate: % of on-time reports over last 8 weeks
    const totalReports = await WeeklyReport.count({ where: { project_id: p.id } });
    const onTimeReports = await WeeklyReport.count({
      where: { project_id: p.id, status: 'submitted' },
    });
    const reportRate = totalReports > 0 ? Math.round((onTimeReports / totalReports) * 100) : 100;

    // at_risk: overdue tasks or report_rate < 70%
    const overdueTasks = await Task.count({
      where: {
        project_id: p.id,
        status: { [Op.ne]: TASK_STATUS.DONE },
        due_date: { [Op.lt]: new Date() },
      },
    });
    const atRisk = reportRate < 70 || overdueTasks > 0;

    return {
      ...p,
      member_count: memberCount + 1, // +1 for leader
      task_progress: { done: taskDone, total: taskTotal },
      report_rate: reportRate,
      at_risk: atRisk,
    };
  }));

  return {
    projects: projectsWithStats,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

const checkCodeExists = async (code) => {
  const existing = await Project.findOne({ where: { code: code.toUpperCase() } });
  return { exists: !!existing };
};

const createProject = async (data, userId) => {
  const existingCode = await Project.findOne({ where: { code: data.code.toUpperCase() } });
  if (existingCode) {
    throw { status: 409, message: 'Project code already exists' };
  }

  // Verify leader exists and is active
  const leader = await User.findByPk(data.leader_id);
  if (!leader || leader.status !== 'active') {
    throw { status: 400, message: 'Leader user not found or not active' };
  }

  const project = await Project.create({
    code: data.code.toUpperCase(),
    name: data.name,
    description: data.description || null,
    tag: data.tag || null,
    status: data.status || PROJECT_STATUS.PLANNING,
    leader_id: data.leader_id,
    start_date: data.start_date,
    end_date: data.end_date,
    budget: data.budget || null,
    git_repo_url: data.git_repo_url || null,
  });

  // Add leader as a project member automatically
  await ProjectMember.create({
    project_id: project.id,
    user_id: data.leader_id,
    role: PROJECT_ROLES.LEADER,
    joined_at: new Date(),
  });

  // Add initial members if provided
  if (data.members && data.members.length > 0) {
    const memberRecords = data.members
      .filter((uid) => uid !== data.leader_id)
      .map((uid) => ({
        project_id: project.id,
        user_id: uid,
        role: PROJECT_ROLES.MEMBER,
        joined_at: new Date(),
      }));
    if (memberRecords.length > 0) {
      await ProjectMember.bulkCreate(memberRecords);
    }
  }

  await auditService.log(AUDIT_ACTIONS.PROJECT_CREATED, userId, null, {
    project_id: project.id,
    code: project.code,
  });

  return project;
};

const getProjectDetail = async (projectId, user) => {
  const project = await Project.findByPk(projectId, {
    include: [
      { model: User, as: 'leader', attributes: ['id', 'full_name', 'email'] },
    ],
  });

  if (!project) {
    throw { status: 404, message: 'Project not found' };
  }

  const isAdmin = [SYSTEM_ROLES.TRUONG_LAB, SYSTEM_ROLES.VIEN_TRUONG].includes(user.system_role);
  if (!isAdmin) {
    const membership = await isProjectMember(projectId, user.id);
    const isLeader = project.leader_id === user.id;
    if (!membership && !isLeader) {
      throw { status: 403, message: 'You do not have access to this project' };
    }
  }

  return project;
};

const updateProject = async (projectId, data, user) => {
  const project = await Project.findByPk(projectId);
  if (!project) {
    throw { status: 404, message: 'Project not found' };
  }

  const accessLevel = checkProjectAccess(user.system_role, project.leader_id, user.id);

  if (accessLevel === 'member') {
    throw { status: 403, message: 'You do not have permission to update this project' };
  }

  // Leader can only update name, description, status
  if (accessLevel === 'leader') {
    const allowed = ['name', 'description', 'status'];
    const keys = Object.keys(data);
    const invalid = keys.filter((k) => !allowed.includes(k));
    if (invalid.length > 0) {
      throw { status: 403, message: `Leader cannot update: ${invalid.join(', ')}` };
    }
  }

  // Status transition validation
  if (data.status && data.status !== project.status) {
    const allowedTransitions = PROJECT_STATUS_TRANSITIONS[project.status] || [];
    if (!allowedTransitions.includes(data.status)) {
      throw { status: 400, message: `Cannot transition from ${project.status} to ${data.status}` };
    }
    // Only truong_lab can archive
    if (data.status === PROJECT_STATUS.ARCHIVED && user.system_role !== SYSTEM_ROLES.TRUONG_LAB) {
      throw { status: 403, message: 'Only truong_lab can archive a project' };
    }
  }

  // 🛡️ CHỐT CHẶN: Khóa ngân sách nếu dự án đã done
  if (project.status === 'done' && data.budget && Number(data.budget) !== Number(project.budget)) {
    throw { status: 400, message: 'Dữ liệu đã khóa! Không thể thay đổi Ngân sách khi dự án đã Hoàn thành.' };
  }

  // =========================================================
  // 🛡️ CHỐT CHẶN: KHÔNG CHO RỜI KHỎI TRẠNG THÁI 'DONE' NẾU LƯƠNG ĐÃ CHỐT
  // =========================================================
  if (project.status === 'done' && data.status && data.status !== 'done') {
    // Import RewardSheet từ models (nếu chưa có ở đầu file)
    const { RewardSheet } = require('../models');
    
    const existingSheet = await RewardSheet.findOne({ where: { project_id: projectId } });
    if (existingSheet && existingSheet.status === 'FINALIZED') {
      throw { 
        status: 400, 
        message: 'Không thể mở lại dự án này! Bảng tính thưởng của dự án đã được Viện trưởng CHỐT SỔ (Finalized). Bất kỳ thay đổi nào cũng sẽ gây sai lệch tài chính.' 
      };
    }
  }
  // =========================================================

  // 🛡️ LƯU LẠI TRẠNG THÁI CŨ TRƯỚC KHI UPDATE ĐỂ TRÁNH SPAM TRIGGER
  const oldStatus = project.status;

  // Gọi update và log duy nhất 1 lần
  await project.update(data);

  await auditService.log(AUDIT_ACTIONS.PROJECT_UPDATED, user.id, null, {
    project_id: projectId,
    changes: data,
  });

  // =========================================================
  // 🎯 CÒ SÚNG: CHỈ KÍCH HOẠT KHI THỰC SỰ CHUYỂN TỪ TRẠNG THÁI KHÁC SANG 'DONE'
  // =========================================================
  if (data.status === 'done' && oldStatus !== 'done') { 
    try {
      console.log(`[AUTO-REWARD] Phát hiện dự án ${projectId} vừa chuyển sang Hoàn thành. Đang kích hoạt tính thưởng...`);
      // Gọi service tính thưởng. Nó tự quản lý transaction độc lập của nó.
      await rewardService.autoGenerateProjectReward(projectId, user.id);
      console.log(`[AUTO-REWARD] Đã tạo bảng tính thưởng nháp cho dự án ${projectId} thành công.`);
    } catch (err) {
      // Bọc try-catch và KHÔNG throw error ở đây. 
      // Đảm bảo việc tính thưởng lỗi cũng không làm fail việc cập nhật trạng thái Project ở trên.
      console.error(`[AUTO-REWARD ERROR] Lỗi khi tự động tính thưởng:`, err.message);
    }
  }
  // =========================================================

  return project;
};

// =====================================================
// Overview Tab
// =====================================================

const getProjectOverview = async (projectId, user) => {
  const project = await getProjectDetail(projectId, user);
  const p = project.toJSON();

  // Task counts by status
  const taskCounts = {};
  for (const status of Object.values(TASK_STATUS)) {
    taskCounts[status] = await Task.count({ where: { project_id: projectId, status } });
  }

  // Report data for last 8 weeks
  const now = new Date();
  const weeklyReportData = await WeeklyReport.findAll({
    where: {
      project_id: projectId,
      created_at: { [Op.gte]: new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000) },
    },
    attributes: ['week_number', 'year', 'status'],
    order: [['year', 'ASC'], ['week_number', 'ASC']],
  });

  // 3 nearest milestones
  const nearestMilestones = await Milestone.findAll({
    where: { project_id: projectId },
    order: [['due_date', 'ASC']],
    limit: 3,
  });

  // First 5 members + count
  const memberCount = await ProjectMember.count({ where: { project_id: projectId } });
  const topMembers = await ProjectMember.findAll({
    where: { project_id: projectId },
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
    limit: 5,
    order: [['joined_at', 'ASC']],
  });

  return {
    ...p,
    task_counts: taskCounts,
    report_chart: weeklyReportData,
    nearest_milestones: nearestMilestones,
    members_preview: {
      total: memberCount,
      members: topMembers.map((m) => m.user),
    },
  };
};

// =====================================================
// Tasks
// =====================================================

const listTasks = async (projectId, { assignee_id, priority, status, page = 1, limit = 50 }, user) => {
  // Check access
  await getProjectDetail(projectId, user);

  const where = { project_id: projectId };
  if (assignee_id) where.assignee_id = assignee_id;
  if (priority) where.priority = priority;
  if (status) where.status = status;

  const offset = (page - 1) * limit;

  const { rows, count } = await Task.findAndCountAll({
    where,
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'full_name', 'email'] },
      { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    tasks: rows,
    pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
  };
};

const createTask = async (projectId, data, user) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };

  const accessLevel = checkProjectAccess(user.system_role, project.leader_id, user.id);
  if (accessLevel === 'member') {
    throw { status: 403, message: 'Members cannot create tasks' };
  }

  // If assignee provided, check they are a member
  if (data.assignee_id) {
    const membership = await isProjectMember(projectId, data.assignee_id);
    if (!membership && data.assignee_id !== project.leader_id) {
      throw { status: 400, message: 'Assignee is not a member of this project' };
    }
  }

  const task = await Task.create({
    project_id: projectId,
    title: data.title,
    description: data.description || null,
    status: data.status || TASK_STATUS.TODO,
    priority: data.priority || 'medium',
    assignee_id: data.assignee_id || null,
    created_by: user.id,
    due_date: data.due_date || null,
  });

  await auditService.log(AUDIT_ACTIONS.TASK_CREATED, user.id, null, {
    project_id: projectId,
    task_id: task.id,
  });

  return task;
};

const updateTask = async (projectId, taskId, data, user) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };

  if (project.status === 'done') {
    throw { 
      status: 400, 
      message: 'Không thể thay đổi Task/Report! Dự án đã hoàn thành, mọi dữ liệu hiệu suất đã được ĐÓNG BĂNG để phục vụ tính lương.' 
    };
  }

  const task = await Task.findOne({ where: { id: taskId, project_id: projectId } });
  if (!task) throw { status: 404, message: 'Task not found' };

  const accessLevel = checkProjectAccess(user.system_role, project.leader_id, user.id);
  // Members can only update status of their own tasks
  if (accessLevel === 'member') {
    if (task.assignee_id !== user.id) {
      throw { status: 403, message: 'You can only update your own tasks' };
    }
    const allowed = ['status'];
    const keys = Object.keys(data);
    const invalid = keys.filter((k) => !allowed.includes(k));
    if (invalid.length > 0) {
      throw { status: 403, message: 'Members can only update task status' };
    }
  }

  if (data.assignee_id) {
    const membership = await isProjectMember(projectId, data.assignee_id);
    if (!membership && data.assignee_id !== project.leader_id) {
      throw { status: 400, message: 'Assignee is not a member of this project' };
    }
  }

  await task.update(data);

  await auditService.log(AUDIT_ACTIONS.TASK_UPDATED, user.id, null, {
    project_id: projectId,
    task_id: taskId,
    changes: data,
  });

  return task;
};

const getTaskDetail = async (projectId, taskId, user) => {
  await getProjectDetail(projectId, user);

  const task = await Task.findOne({
    where: { id: taskId, project_id: projectId },
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'full_name', 'email'] },
      { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
      { model: Milestone, as: 'milestones', attributes: ['id', 'title', 'due_date', 'done'] },
    ],
  });

  if (!task) throw { status: 404, message: 'Task not found' };
  return task;
};

// =====================================================
// Members
// =====================================================

const listMembers = async (projectId, user) => {
  await getProjectDetail(projectId, user);

  const members = await ProjectMember.findAll({
    where: { project_id: projectId },
    include: [
      { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] },
    ],
    order: [['joined_at', 'ASC']],
  });

  // Enrich with task count and report rate per member
  const enriched = await Promise.all(members.map(async (m) => {
    const memberData = m.toJSON();
    const taskCount = await Task.count({
      where: { project_id: projectId, assignee_id: m.user_id },
    });
    const totalReports = await WeeklyReport.count({
      where: { project_id: projectId, user_id: m.user_id },
    });
    const onTimeReports = await WeeklyReport.count({
      where: { project_id: projectId, user_id: m.user_id, status: 'submitted' },
    });
    const reportRate = totalReports > 0 ? Math.round((onTimeReports / totalReports) * 100) : 100;

    return {
      ...memberData,
      task_count: taskCount,
      report_rate: reportRate,
    };
  }));

  return enriched;
};

const addMember = async (projectId, data, user) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };

  if (project.status === 'done') {
    throw { status: 400, message: 'Dữ liệu đã khóa! Không thể thêm/xóa thành viên khi dự án đã Hoàn thành.' };
  }

  const accessLevel = checkProjectAccess(user.system_role, project.leader_id, user.id);
  if (accessLevel === 'member') {
    throw { status: 403, message: 'You do not have permission to add members' };
  }

  // Check user exists
  const targetUser = await User.findByPk(data.user_id);
  if (!targetUser || targetUser.status !== 'active') {
    throw { status: 400, message: 'User not found or not active' };
  }

  // Check not already a member
  const existing = await ProjectMember.findOne({
    where: { project_id: projectId, user_id: data.user_id },
  });
  if (existing) {
    throw { status: 409, message: 'User is already a member of this project' };
  }

  const member = await ProjectMember.create({
    project_id: projectId,
    user_id: data.user_id,
    role: data.role || PROJECT_ROLES.MEMBER,
    joined_at: new Date(),
  });

  await auditService.log(AUDIT_ACTIONS.PROJECT_MEMBER_ADDED, user.id, data.user_id, {
    project_id: projectId,
  });

  return member;
};

const removeMember = async (projectId, memberId, user) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };

  if (project.status === 'done') {
    throw { status: 400, message: 'Dữ liệu đã khóa! Không thể thêm/xóa thành viên khi dự án đã Hoàn thành.' };
  }

  const accessLevel = checkProjectAccess(user.system_role, project.leader_id, user.id);
  if (accessLevel === 'member') {
    throw { status: 403, message: 'You do not have permission to remove members' };
  }

  const member = await ProjectMember.findOne({
    where: { id: memberId, project_id: projectId },
  });
  if (!member) throw { status: 404, message: 'Member not found' };

  // Cannot remove the leader
  if (member.user_id === project.leader_id && member.role === PROJECT_ROLES.LEADER) {
    throw { status: 400, message: 'Cannot remove the project leader' };
  }

  await member.destroy();

  await auditService.log(AUDIT_ACTIONS.PROJECT_MEMBER_REMOVED, user.id, member.user_id, {
    project_id: projectId,
  });

  return { message: 'Member removed successfully' };
};

// =====================================================
// Milestones
// =====================================================

const listMilestones = async (projectId, user) => {
  await getProjectDetail(projectId, user);

  const milestones = await Milestone.findAll({
    where: { project_id: projectId },
    include: [
      {
        model: Task,
        as: 'linkedTasks',
        attributes: ['id', 'title', 'status'],
        through: { attributes: [] },
      },
    ],
    order: [['due_date', 'ASC']],
  });

  const total = milestones.length;
  const done = milestones.filter((m) => m.done).length;

  return {
    progress: { done, total },
    milestones: milestones.map((m) => {
      const ms = m.toJSON();
      const now = new Date();
      const dueDate = new Date(ms.due_date);
      let color = 'gray'; // far away
      if (ms.done) {
        color = dueDate >= (ms.done_at || now) ? 'green' : 'red'; // done on time vs late
      } else {
        const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
        if (daysUntilDue <= 7) color = 'yellow'; // near deadline
      }
      return { ...ms, color };
    }),
  };
};

const createMilestone = async (projectId, data, user) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };

  const accessLevel = checkProjectAccess(user.system_role, project.leader_id, user.id);
  if (accessLevel === 'member') {
    throw { status: 403, message: 'You do not have permission to create milestones' };
  }

  const milestone = await Milestone.create({
    project_id: projectId,
    title: data.title,
    description: data.description || null,
    due_date: data.due_date,
  });

  // Link tasks if provided
  if (data.linked_tasks && data.linked_tasks.length > 0) {
    const links = data.linked_tasks.map((taskId) => ({
      milestone_id: milestone.id,
      task_id: taskId,
    }));
    await MilestoneTask.bulkCreate(links);
  }

  await auditService.log(AUDIT_ACTIONS.MILESTONE_CREATED, user.id, null, {
    project_id: projectId,
    milestone_id: milestone.id,
  });

  return milestone;
};

const updateMilestone = async (projectId, milestoneId, data, user) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };

  const accessLevel = checkProjectAccess(user.system_role, project.leader_id, user.id);
  if (accessLevel === 'member') {
    throw { status: 403, message: 'You do not have permission to update milestones' };
  }

  const milestone = await Milestone.findOne({
    where: { id: milestoneId, project_id: projectId },
  });
  if (!milestone) throw { status: 404, message: 'Milestone not found' };

  // If marking as done
  const updateData = { ...data };
  if (data.done === true && !milestone.done) {
    updateData.done_at = new Date();

    // Check for incomplete linked tasks — return warning but still allow
    const incompleteTasks = await Task.count({
      include: [{
        model: Milestone,
        as: 'milestones',
        where: { id: milestoneId },
        through: { attributes: [] },
      }],
      where: { status: { [Op.ne]: TASK_STATUS.DONE } },
    });

    if (incompleteTasks > 0) {
      updateData._warning = `${incompleteTasks} linked task(s) are not yet done`;
    }
  }

  // Update linked tasks if provided
  if (data.linked_tasks) {
    await MilestoneTask.destroy({ where: { milestone_id: milestoneId } });
    if (data.linked_tasks.length > 0) {
      const links = data.linked_tasks.map((taskId) => ({
        milestone_id: milestoneId,
        task_id: taskId,
      }));
      await MilestoneTask.bulkCreate(links);
    }
    delete updateData.linked_tasks;
  }

  const warning = updateData._warning;
  delete updateData._warning;

  await milestone.update(updateData);

  await auditService.log(AUDIT_ACTIONS.MILESTONE_UPDATED, user.id, null, {
    project_id: projectId,
    milestone_id: milestoneId,
    changes: data,
  });

  const result = milestone.toJSON();
  if (warning) result.warning = warning;
  return result;
};

// =====================================================
// Weekly Reports
// =====================================================

const listReports = async (projectId, { week_number, year, user_id, page = 1, limit = 50 }, user) => {
  await getProjectDetail(projectId, user);

  const where = { project_id: projectId };
  if (week_number) where.week_number = week_number;
  if (year) where.year = year;
  if (user_id) where.user_id = user_id;

  const offset = (page - 1) * limit;

  const { rows, count } = await WeeklyReport.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] },
    ],
    order: [['year', 'DESC'], ['week_number', 'DESC']],
    limit,
    offset,
  });

  return {
    reports: rows,
    pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
  };
};

const getComplianceMatrix = async (projectId, { weeks = 8 }, user) => {
  await getProjectDetail(projectId, user);

  // Get all project members
  const members = await ProjectMember.findAll({
    where: { project_id: projectId },
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
  });

  // Get reports for the last N weeks
  const now = new Date();
  const reports = await WeeklyReport.findAll({
    where: {
      project_id: projectId,
      created_at: { [Op.gte]: new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000) },
    },
  });

  // Build matrix: member × week
  const matrix = members.map((m) => {
    const memberReports = reports.filter((r) => r.user_id === m.user_id);
    return {
      user: m.user,
      weeks: memberReports.map((r) => ({
        week_number: r.week_number,
        year: r.year,
        status: r.status,
      })),
    };
  });

  return matrix;
};

const createReport = async (projectId, data, user) => {
  const membership = await isProjectMember(projectId, user.id);
  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };

  if (project.status === 'done') {
    throw { 
      status: 400, 
      message: 'Không thể thay đổi Task/Report! Dự án đã hoàn thành, mọi dữ liệu hiệu suất đã được ĐÓNG BĂNG để phục vụ tính lương.' 
    };
  }

  if (!membership && project.leader_id !== user.id) {
    throw { status: 403, message: 'You are not a member of this project' };
  }

  // Check duplicate
  const existing = await WeeklyReport.findOne({
    where: {
      project_id: projectId,
      user_id: user.id,
      week_number: data.week_number,
      year: data.year,
    },
  });
  if (existing) {
    throw { status: 409, message: 'Report for this week already submitted' };
  }

  // Determine due date (Sunday of that week) and status
  const dueDate = getWeekEndDate(data.year, data.week_number);
  const isLate = new Date() > dueDate;

  const report = await WeeklyReport.create({
    project_id: projectId,
    user_id: user.id,
    week_number: data.week_number,
    year: data.year,
    content: data.content,
    status: isLate ? 'late' : 'submitted',
    submitted_at: new Date(),
    due_date: dueDate,
  });

  return report;
};

/**
 * Get the Sunday date for a given ISO week number
 */
function getWeekEndDate(year, weekNumber) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

// =====================================================
// Git Repository (truong_lab only)
// =====================================================

const getGitRepo = async (projectId, user) => {
  if (user.system_role !== SYSTEM_ROLES.TRUONG_LAB) {
    throw { status: 403, message: 'Forbidden' };
  }

  const project = await Project.findByPk(projectId, {
    attributes: [
      'id', 'code', 'git_repo_url', 'git_provider', 'git_default_branch',
      'git_visibility', 'git_last_commit_sha', 'git_last_commit_author',
      'git_last_commit_message', 'git_last_commit_date',
    ],
  });

  if (!project) throw { status: 404, message: 'Project not found' };

  return {
    repo_url: project.git_repo_url,
    provider: project.git_provider,
    default_branch: project.git_default_branch,
    visibility: project.git_visibility,
    last_commit: project.git_last_commit_sha ? {
      sha: project.git_last_commit_sha.substring(0, 7),
      author: project.git_last_commit_author,
      message: project.git_last_commit_message,
      date: project.git_last_commit_date,
    } : null,
  };
};

const updateGitRepo = async (projectId, data, user) => {
  if (user.system_role !== SYSTEM_ROLES.TRUONG_LAB) {
    throw { status: 403, message: 'Forbidden' };
  }

  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };

  await project.update({
    git_repo_url: data.git_repo_url,
    git_provider: data.git_provider,
    git_default_branch: data.git_default_branch || 'main',
    git_visibility: data.git_visibility || 'private',
  });

  return { message: 'Git repository updated', repo_url: project.git_repo_url };
};

const handleGitWebhook = async (projectId, data) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };

  await project.update({
    git_last_commit_sha: data.sha,
    git_last_commit_author: data.author,
    git_last_commit_message: data.message,
    git_last_commit_date: data.timestamp,
  });

  return { message: 'Webhook processed' };
};

const searchActiveUsers = async (query) => {
  const where = { status: 'active' };
  if (query) {
    where[Op.or] = [
      { full_name: { [Op.like]: `%${query}%` } },
      { email: { [Op.like]: `%${query}%` } },
    ];
  }
  const users = await User.findAll({
    where,
    attributes: ['id', 'full_name', 'email', 'system_role', 'department'],
    limit: 20,
    order: [['full_name', 'ASC']],
  });
  return users;
};

module.exports = {
  listProjects,
  checkCodeExists,
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
