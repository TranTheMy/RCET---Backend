const router = require('express').Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const projectRoutes = require('./project.routes');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectRoutes);

module.exports = router;
