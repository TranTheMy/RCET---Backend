const rewardService = require('../services/reward.service');
const ApiResponse = require('../utils/response');
const catchAsync = require('../utils/catchAsync'); // Hàm bọc try/catch chuẩn của Express

/**
 * 1. LẤY BẢNG TÍNH THƯỞNG CỦA MỘT DỰ ÁN
 * GET /api/rewards/project/:projectId
 */
const getProjectRewardSheet = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const requestingUser = req.user; // Lấy từ Middleware Auth

  const sheet = await rewardService.getRewardSheetByProject(projectId, requestingUser);
  return ApiResponse.success(res, sheet, 'Lấy dữ liệu bảng tính thưởng thành công.');
});

/**
 * 2. TÍNH LẠI THƯỞNG THỦ CÔNG (Dành cho Viện trưởng muốn Force Update)
 * POST /api/rewards/project/:projectId/recalculate
 */
const recalculateProjectReward = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const generatedBy = req.user.id;

  // Phân quyền nhẹ ở đây hoặc ở Middleware Route
  if (req.user.system_role !== 'vien_truong') {
      return ApiResponse.forbidden(res, 'Chỉ Viện Trưởng mới có quyền chạy lại tính toán.');
  }

  const sheet = await rewardService.autoGenerateProjectReward(projectId, generatedBy);
  return ApiResponse.success(res, sheet, 'Đã chạy lại luồng tính thưởng dự án.');
});

/**
 * 3. ĐIỀU CHỈNH TIỀN THỦ CÔNG (Override)
 * PUT /api/rewards/detail/:detailId/override
 */
const updateOverrideAmount = catchAsync(async (req, res) => {
  const { detailId } = req.params;
  const { final_override_amount } = req.body;
  const requestingUser = req.user;

  const updatedDetail = await rewardService.updateRewardOverride(detailId, final_override_amount, requestingUser);
  return ApiResponse.success(res, updatedDetail, 'Cập nhật tiền thưởng thủ công thành công.');
});

/**
 * 4. CHỐT SỔ BẢNG THƯỞNG (Finalize)
 * POST /api/rewards/project/:projectId/finalize
 */
const finalizeSheet = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const requestingUser = req.user;

  const sheet = await rewardService.finalizeRewardSheet(projectId, requestingUser);
  return ApiResponse.success(res, sheet, 'Đã chốt sổ bảng tính thưởng dự án.');
});

/**
 * 5. KHIẾU NẠI TIỀN THƯỞNG
 * POST /api/rewards/detail/:detailId/appeal
 */
const appealRewardDetail = catchAsync(async (req, res) => {
  const { detailId } = req.params;
  const { reason } = req.body;
  const requestingUser = req.user;

  const detail = await rewardService.submitAppeal(detailId, reason, requestingUser);
  return ApiResponse.success(res, detail, 'Đã gửi khiếu nại thành công. Vui lòng chờ Viện trưởng xem xét.');
});
  
/**
 * 6. GIẢI QUYẾT KHIẾU NẠI
 * PUT /api/rewards/detail/:detailId/resolve
 */
const resolveRewardAppeal = catchAsync(async (req, res) => {
  const { detailId } = req.params;
  const { resolutionStatus } = req.body;
  const requestingUser = req.user;

  const detail = await rewardService.resolveAppeal(detailId, resolutionStatus, requestingUser);
  return ApiResponse.success(res, detail, 'Đã giải quyết khiếu nại thành công.');
});

const exportExcel = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  
  // 🌟 Đón cục { workbook, fileName } từ Service
  const { workbook, fileName } = await rewardService.exportRewardExcel(projectId, req.user);
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`); // 🌟 Truyền tên file mới vào đây
  
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  await workbook.xlsx.write(res);
  res.end();
});

const importExcel = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  if (!req.file) throw { status: 400, message: 'Vui lòng upload file Excel' }; 

  const result = await rewardService.importOverrideExcel(projectId, req.file.buffer, req.user);
  return ApiResponse.success(res, result, `Đã import thành công ${result.successCount} dòng.`);
});

// Nhớ export 2 hàm này ra

module.exports = {
  getProjectRewardSheet,
  recalculateProjectReward,
  updateOverrideAmount,
  finalizeSheet,
  appealRewardDetail,
  resolveRewardAppeal,
  exportExcel,
  importExcel
};