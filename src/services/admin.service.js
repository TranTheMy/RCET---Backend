const { v4: uuidv4 } = require('uuid');
const { User, ApprovalRequest, sequelize } = require('../models');
const { APPROVAL_STATUS, USER_STATUS, AUDIT_ACTIONS } = require('../config/constants');
const { sendMail, emailTemplates } = require('../utils/email');
const auditService = require('./audit.service');

const getApprovalRequests = async ({ status, page = 1, limit = 20 }) => {
  const where = {};
  if (status) where.status = status;

  const offset = (page - 1) * limit;

  const { rows, count } = await ApprovalRequest.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'student_code', 'department', 'status', 'email_verified', 'created_at'],
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    requests: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

const approveUser = async (requestId, adminId, { system_role, review_note }) => {
  const request = await ApprovalRequest.findByPk(requestId, {
    include: [{ model: User, as: 'user' }],
  });

  if (!request) {
    throw { status: 404, message: 'Approval request not found' };
  }

  if (request.status !== APPROVAL_STATUS.PENDING) {
    throw { status: 400, message: 'This request has already been processed' };
  }

  const user = request.user;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Update approval request using raw SQL
  await sequelize.query(
    `UPDATE [ApprovalRequests] SET [status] = ?, [reviewed_by] = ?, [review_note] = ?, [updated_at] = CONVERT(DATETIME, ?) WHERE [id] = ?`,
    { replacements: [APPROVAL_STATUS.APPROVED, adminId, review_note || null, now, requestId] },
  );

  // Update user status and role using raw SQL
  await sequelize.query(
    `UPDATE [Users] SET [status] = ?, [system_role] = ?, [updated_at] = CONVERT(DATETIME, ?) WHERE [id] = ?`,
    { replacements: [USER_STATUS.ACTIVE, system_role, now, user.id] },
  );

  // Send approval email
  const template = emailTemplates.approvalSuccess(user.full_name, system_role);
  sendMail(user.email, template.subject, template.html);

  await auditService.log(AUDIT_ACTIONS.APPROVAL_APPROVED, adminId, user.id, {
    system_role,
    review_note,
  });

  return { message: `User ${user.full_name} approved with role: ${system_role}` };
};

const rejectUser = async (requestId, adminId, { review_note }) => {
  const request = await ApprovalRequest.findByPk(requestId, {
    include: [{ model: User, as: 'user' }],
  });

  if (!request) {
    throw { status: 404, message: 'Approval request not found' };
  }

  if (request.status !== APPROVAL_STATUS.PENDING) {
    throw { status: 400, message: 'This request has already been processed' };
  }

  const user = request.user;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Update approval request using raw SQL
  await sequelize.query(
    `UPDATE [ApprovalRequests] SET [status] = ?, [reviewed_by] = ?, [review_note] = ?, [updated_at] = CONVERT(DATETIME, ?) WHERE [id] = ?`,
    { replacements: [APPROVAL_STATUS.REJECTED, adminId, review_note || null, now, requestId] },
  );

  // Update user status using raw SQL
  await sequelize.query(
    `UPDATE [Users] SET [status] = ?, [updated_at] = CONVERT(DATETIME, ?) WHERE [id] = ?`,
    { replacements: [USER_STATUS.REJECTED, now, user.id] },
  );

  // Send rejection email
  const template = emailTemplates.approvalRejected(user.full_name, review_note);
  sendMail(user.email, template.subject, template.html);

  await auditService.log(AUDIT_ACTIONS.APPROVAL_REJECTED, adminId, user.id, {
    review_note,
  });

  return { message: `User ${user.full_name} has been rejected` };
};

module.exports = {
  getApprovalRequests,
  approveUser,
  rejectUser,
};
