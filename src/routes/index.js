const router = require('express').Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const projectRoutes = require('./project.routes');
const verilogRoutes = require('./verilog.routes');
const aiRoutes = require('./aiAssistant.routes');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectRoutes);
router.use('/verilog', verilogRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
