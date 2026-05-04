const router = require('express').Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All user endpoints require authentication
router.use(authMiddleware);


// 1. API lấy danh sách Bên A (Tất cả tài khoản không có student_code)
router.get('/party-a', userController.getPartyAList);

// 2. API lấy thông tin người đang đăng nhập (Bên B)
router.get('/me', userController.getCurrentUser);

// List users
router.get('/', userController.listUsers);

// Get user by ID (Route chứa :id luôn luôn phải nằm ở cuối cùng)
router.get('/:id', userController.getUserById);

module.exports = router;