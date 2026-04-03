const router = require('express').Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const projectRoutes = require('./project.routes');
const commentRoutes = require('./comment.routes');
const forumRoutes = require('./forum.routes');
const memberDashboardRoutes = require('./memberDashboard.routes');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectRoutes);
router.use('/forum', forumRoutes);
router.use('/members', memberDashboardRoutes);
router.use('/', commentRoutes);

module.exports = router;
