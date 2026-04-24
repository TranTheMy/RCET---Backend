const router = require('express').Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const projectRoutes = require('./project.routes');
const userRoutes = require('./user.routes');
const commitmentRoutes = require('./commitment.routes');
const rewardRoutes = require('./reward.routes');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectRoutes);
router.use('/users', userRoutes);
router.use('/commitments', commitmentRoutes);
router.use('/rewards', rewardRoutes);


module.exports = router;
