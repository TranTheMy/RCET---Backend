const { Comment, WeeklyReport, User, ProjectMember } = require('../models');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const { USER_ROLES } = require('../config/constants');

// Get all comments for a weekly report
const getComments = async (req, res) => {
  try {
    const { weeklyReportId } = req.params;
    const userId = req.user.id;

    // Check if weekly report exists
    const weeklyReport = await WeeklyReport.findByPk(weeklyReportId);

    if (!weeklyReport) {
      return ApiResponse.error(res, 'Weekly report not found', 404);
    }

    // Check if user is member of the project
    const isMember = await ProjectMember.findOne({
      where: { project_id: weeklyReport.project_id, user_id: userId }
    });

    if (!isMember) {
      return ApiResponse.error(res, 'Access denied', 403);
    }

    const comments = await Comment.findAll({
      where: { weekly_report_id: weeklyReportId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email']
      }],
      order: [['created_at', 'ASC']]
    });

    ApiResponse.success(res, comments, 'Comments retrieved successfully');
  } catch (error) {
    logger.error('Error getting comments:', error);
    ApiResponse.error(res, 'Internal server error', 500);
  }
};

// Create a new comment
const createComment = async (req, res) => {
  try {
    const { weeklyReportId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return ApiResponse.error(res, 'Comment content is required', 400);
    }

    // Check if weekly report exists and user has access
    const weeklyReport = await WeeklyReport.findByPk(weeklyReportId);
    if (!weeklyReport) {
      return ApiResponse.error(res, 'Weekly report not found', 404);
    }

    // Check if user is member of the project
    const isMember = await ProjectMember.findOne({
      where: { project_id: weeklyReport.project_id, user_id: userId }
    });

    if (!isMember) {
      return ApiResponse.error(res, 'Access denied', 403);
    }

    const comment = await Comment.create({
      weekly_report_id: weeklyReportId,
      user_id: userId,
      content: content.trim()
    });

    // Fetch the created comment with user info
    const commentWithUser = await Comment.findByPk(comment.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email']
      }]
    });

    ApiResponse.created(res, commentWithUser, 'Comment created successfully');
  } catch (error) {
    logger.error('Error creating comment:', error);
    ApiResponse.error(res, 'Internal server error', 500);
  }
};

// Update a comment
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return ApiResponse.error(res, 'Comment content is required', 400);
    }

    const comment = await Comment.findByPk(commentId, {
      include: [{ model: WeeklyReport, as: 'weeklyReport' }]
    });

    if (!comment) {
      return ApiResponse.error(res, 'Comment not found', 404);
    }

    // Only comment author can update
    if (comment.user_id !== userId) {
      return ApiResponse.error(res, 'Access denied', 403);
    }

    await comment.update({ content: content.trim() });

    // Fetch updated comment with user info
    const updatedComment = await Comment.findByPk(commentId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email']
      }]
    });

    ApiResponse.success(res, updatedComment, 'Comment updated successfully');
  } catch (error) {
    logger.error('Error updating comment:', error);
    ApiResponse.error(res, 'Internal server error', 500);
  }
};

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findByPk(commentId, {
      include: [{ model: WeeklyReport, as: 'weeklyReport' }]
    });

    if (!comment) {
      return ApiResponse.error(res, 'Comment not found', 404);
    }

    // Only comment author can delete
    if (comment.user_id !== userId) {
      return ApiResponse.error(res, 'Access denied', 403);
    }

    await comment.destroy();

    ApiResponse.success(res, null, 'Comment deleted successfully');
  } catch (error) {
    logger.error('Error deleting comment:', error);
    ApiResponse.error(res, 'Internal server error', 500);
  }
};

module.exports = {
  getComments,
  createComment,
  updateComment,
  deleteComment,
};