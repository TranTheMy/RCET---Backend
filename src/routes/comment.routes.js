const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { createCommentSchema, updateCommentSchema } = require('../validators/comment.validator');
const validate = require('../middlewares/validate.middleware');
const auth = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(auth);

// Routes for comments on a weekly report
router.get('/:weeklyReportId/comments', commentController.getComments);
router.post('/:weeklyReportId/comments', validate(createCommentSchema), commentController.createComment);

// Routes for individual comments
router.put('/comments/:commentId', validate(updateCommentSchema), commentController.updateComment);
router.delete('/comments/:commentId', commentController.deleteComment);

module.exports = router;