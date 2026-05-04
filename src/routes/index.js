const router = require('express').Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const projectRoutes = require('./project.routes');
const commentRoutes = require('./comment.routes');
const forumRoutes = require('./forum.routes');
const memberDashboardRoutes = require('./memberDashboard.routes');

// ===== CẢ 2 NHÁNH =====
const verilogRoutes = require('./verilog.routes');
const aiRoutes = require('./aiAssistant.routes');
const userRoutes = require('./user.routes');
const commitmentRoutes = require('./commitment.routes');
const rewardRoutes = require('./reward.routes');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectRoutes);
router.use('/forum', forumRoutes);
router.use('/members', memberDashboardRoutes);
router.use('/', commentRoutes);

// ===== CẢ 2 NHÁNH =====
router.use('/verilog', verilogRoutes);
router.use('/ai', aiRoutes);
router.use('/users', userRoutes);
router.use('/commitments', commitmentRoutes);
router.use('/rewards', rewardRoutes);

module.exports = router;