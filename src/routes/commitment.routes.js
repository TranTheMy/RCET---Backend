const router = require('express').Router();
const authMiddleware = require('../middlewares/auth.middleware');
const commitmentController = require('../controllers/commitment.controller');

// Lấy danh sách tất cả commitment đã lưu của người dùng
router.get('/', authMiddleware, commitmentController.listCommitments);

// Xuất PDF một commitment đã được lưu trong DB
router.post('/export-pdf', authMiddleware, commitmentController.exportPdf);

// --- Luồng tạo bản nháp ---

// 1. Tạo một bản nháp mới trong bộ nhớ
router.post('/draft', authMiddleware, commitmentController.createDraftCommitment);

// 2. Xem trước bản nháp từ bộ nhớ
router.get('/preview/:draftId', authMiddleware, commitmentController.previewDraftPdf);

// 3. Hoàn tất và lưu bản nháp từ bộ nhớ vào DB
router.post('/finalize/:draftId', authMiddleware, commitmentController.finalizeCommitment);

module.exports = router;