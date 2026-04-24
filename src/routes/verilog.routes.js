const router = require('express').Router();
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const verilogController = require('../controllers/verilog.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const checkRole = require('../middlewares/role.middleware');
const checkActiveStatus = require('../middlewares/status.middleware');
const validate = require('../middlewares/validate.middleware');
const verilogValidator = require('../validators/verilog.validator');

// Optional auth helper (attaches user if token present, no error if missing)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    const user = await User.findByPk(decoded.user_id, {
      attributes: ['id', 'full_name', 'email', 'system_role', 'status'],
    });
    if (user) req.user = user;
  } catch {
    // token invalid – proceed as unauthenticated
  }
  next();
};

const adminRoles = ['admin', 'truong_lab'];

// ==================== PROBLEMS ====================
router.get('/problems', optionalAuth, verilogController.listProblems);
router.get('/problems/:id', optionalAuth, verilogController.getProblem);
router.post(
  '/problems',
  authMiddleware,
  checkRole(...adminRoles),
  validate(verilogValidator.createProblem),
  verilogController.createProblem,
);
router.put(
  '/problems/:id',
  authMiddleware,
  checkRole(...adminRoles),
  validate(verilogValidator.updateProblem),
  verilogController.updateProblem,
);
router.delete(
  '/problems/:id',
  authMiddleware,
  checkRole(...adminRoles),
  verilogController.deleteProblem,
);

// ==================== TEST CASES ====================
router.get(
  '/problems/:problemId/testcases',
  authMiddleware,
  checkRole(...adminRoles),
  verilogController.listTestCases,
);
router.post(
  '/problems/:problemId/testcases',
  authMiddleware,
  checkRole(...adminRoles),
  validate(verilogValidator.createTestCase),
  verilogController.createTestCase,
);
router.put(
  '/problems/:problemId/testcases/:tcId',
  authMiddleware,
  checkRole(...adminRoles),
  validate(verilogValidator.updateTestCase),
  verilogController.updateTestCase,
);
router.delete(
  '/problems/:problemId/testcases/:tcId',
  authMiddleware,
  checkRole(...adminRoles),
  verilogController.deleteTestCase,
);

// ==================== SUBMISSIONS ====================
router.get('/submissions', authMiddleware, verilogController.listSubmissions);
router.get('/submissions/:id', authMiddleware, verilogController.getSubmission);
router.post(
  '/submit',
  authMiddleware,
  checkActiveStatus,
  validate(verilogValidator.submitCode),
  verilogController.submit,
);

// ==================== USER STATS ====================
router.get('/stats', authMiddleware, verilogController.getUserStats);
router.get('/stats/:userId', authMiddleware, verilogController.getUserStats);

module.exports = router;
