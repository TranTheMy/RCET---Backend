const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid'); // Bổ sung thư viện tạo UUID
const {
  sequelize,
  Project,
  ProjectMember,
  Task,
  WeeklyReport,
  Commitment,
  RewardSheet,
  RewardSheetDetail,
  User,
} = require('../models');
const { SYSTEM_ROLES } = require('../config/constants');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const fs = require('fs');

// --- CẤU HÌNH TỶ LỆ CHIA THƯỞNG ---
const MODEL_CONFIG = {
  1: { student_pct: 0.30, teacher_pct: 0.70 },
  2: { student_pct: 0.40, teacher_pct: 0.60 },
  3: { student_pct: 0.50, teacher_pct: 0.50 },
};

const GRADE_MULTIPLIER = {
  'A': 1.0,
  'B': 0.8,
  'C': 0.5,
};

const TASK_PENALTY_RATE = 0.05;

/**
 * 1. HÀM CORE: TỰ ĐỘNG TÍNH TOÁN
 */
/**
 * 1. HÀM CORE: TỰ ĐỘNG TÍNH TOÁN (ĐÃ VÁ LỖI BACKUP OVERRIDE)
 */
const autoGenerateProjectReward = async (projectId, generatedBy) => {
  const transaction = await sequelize.transaction();

  try {
    const project = await Project.findByPk(projectId, {
      include: [{ model: ProjectMember, as: 'members' }],
      transaction
    });

    if (!project) throw { status: 404, message: 'Không tìm thấy dự án.' };
    if (project.status !== 'done') throw { status: 400, message: 'Chỉ tính thưởng khi dự án đã hoàn thành (done).' };

    const members = project.members || [];
    if (members.length === 0) throw { status: 400, message: 'Dự án không có thành viên nào để chia thưởng.' };

    // FIX 1: Ép kiểu an toàn, tránh lỗi NOT NULL khi chèn vào MSSQL
    const safeBudget = Number(project.budget) || 0;
    const baseShare = safeBudget / members.length;

    // 🛡️ CHUẨN BỊ BỘ NHỚ ĐỆM ĐỂ BACKUP DỮ LIỆU SỬA TAY
    const overrideCache = {};

    let sheet = await RewardSheet.findOne({ where: { project_id: projectId }, transaction });
    if (sheet) {
      if (sheet.status === 'FINALIZED') throw { status: 400, message: 'Bảng tính này đã chốt, không thể tính lại.' };

      // 🛡️ SAO LƯU DỮ LIỆU SỬA TAY CỦA VIỆN TRƯỞNG TRƯỚC KHI XÓA
      const oldDetails = await RewardSheetDetail.findAll({ where: { sheet_id: sheet.id }, transaction });
      oldDetails.forEach(d => {
        if (d.is_overridden) {
          overrideCache[d.user_id] = d.final_override_amount;
        }
      });

      await RewardSheetDetail.destroy({ where: { sheet_id: sheet.id }, transaction });
    } else {
      // FIX 2: Tự sinh ID để MSSQL không bị lỗi khi mapping kết quả trả về
      sheet = await RewardSheet.create({
        id: uuidv4(),
        project_id: projectId,
        total_budget: safeBudget,
        generated_by: generatedBy,
        status: 'DRAFT'
      }, { transaction });
    }

    const rewardDetails = [];
    const partyAAggregator = {};

    for (const member of members) {
      const userId = member.user_id;

      const commitment = await Commitment.findOne({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        transaction
      });

      let modelType = null;
      let studentCutPct = 1.0;

      if (commitment && MODEL_CONFIG[commitment.model_type]) {
        modelType = commitment.model_type;
        studentCutPct = MODEL_CONFIG[modelType].student_pct;

        const teacherEmail = commitment.party_a_email;
        if (teacherEmail) {
          if (!partyAAggregator[teacherEmail]) {
            partyAAggregator[teacherEmail] = { total_cut: 0, from_students: [] };
          }
          const teacherCut = baseShare * MODEL_CONFIG[modelType].teacher_pct;
          partyAAggregator[teacherEmail].total_cut += teacherCut;
          partyAAggregator[teacherEmail].from_students.push({
            name: commitment.party_b_name || 'Thành viên',
            amount: teacherCut
          });
        }
      }

      const modelCutAmount = baseShare * studentCutPct;

      const reports = await WeeklyReport.findAll({
        where: { project_id: projectId, user_id: userId },
        transaction
      });
      const lateReports = reports.filter(r => r.status === 'LATE' || new Date(r.submitted_at) > new Date(r.due_date));

      let reportGrade = 'A';
      if (lateReports.length === 1) reportGrade = 'B';
      else if (lateReports.length >= 2) reportGrade = 'C';

      const gradeMultiplier = GRADE_MULTIPLIER[reportGrade];
      const amountAfterGrade = modelCutAmount * gradeMultiplier;

      const tasks = await Task.findAll({
        where: { project_id: projectId, assignee_id: userId },
        transaction
      });
      const lateTasks = tasks.filter(t =>
        (t.status !== 'done' && new Date() > new Date(t.due_date)) ||
        (t.status === 'done' && new Date(t.updated_at) > new Date(t.due_date))
      );

      // ==========================================
      // 🌟 LOGIC PHẠT TASK BẬC THANG (CHỈ SỬA TOÁN, GIỮ NGUYÊN DB)
      // ==========================================
      let penaltyMultiplier = 0;
      const lateCount = lateTasks.length;
      
      if (lateCount >= 1) penaltyMultiplier += 0.03; // Lần 1: 3%
      if (lateCount >= 2) penaltyMultiplier += 0.03; // Lần 2: +3% (Tổng 6%)
      if (lateCount >= 3) penaltyMultiplier += 0.20; // Lần 3: +20% (Tổng 26%)
      if (lateCount >= 4) penaltyMultiplier += 0.20; // Lần 4: +20% (Tổng 46%)
      if (lateCount >= 5) penaltyMultiplier += 0.50; // Lần 5: +50% (Tổng 96%)
      if (lateCount >= 6) penaltyMultiplier = 1.0;   // Lần 6: 100% (Bị đuổi)

      if (penaltyMultiplier > 1.0) penaltyMultiplier = 1.0;

      // ==========================================
      // 🌟 KẾT TOÁN: GỐC - PHẠT - THUẾ
      // ==========================================
      const grossAmount = amountAfterGrade; // Tiền gốc sau khi nhân hệ số báo cáo
      const taxAmount = grossAmount * 0.10; // Thuế TNCN (10% tính trên Gốc)
      const penaltyAmount = grossAmount * penaltyMultiplier; // Phạt (tính trên Gốc)

      let calculatedAmount = grossAmount - penaltyAmount - taxAmount; // Thực nhận
      if (calculatedAmount < 0) calculatedAmount = 0;

      // Lưu lại thông tin để hiển thị ra UI
      const penaltyMetadata = JSON.stringify({
        late_reports: lateReports.map(r => ({ week: r.week_number, due: r.due_date })),
        late_tasks: lateTasks.map(task => ({ id: task.id, title: task.title, due: task.due_date })),
        pre_tax: Math.round(grossAmount),
        tax_amount: Math.round(taxAmount),
        is_kicked: lateCount >= 6
      });

      // 🛡️ LẤY LẠI DỮ LIỆU ĐÃ SAO LƯU TỪ CACHE
      const cachedOverride = overrideCache[userId];

      rewardDetails.push({
        id: uuidv4(), // Cấp sẵn ID
        sheet_id: sheet.id,
        user_id: userId,
        role: member.role,
        model_type: modelType,
        base_share: Math.round(baseShare),
        model_cut_amount: Math.round(modelCutAmount),
        report_grade: reportGrade,
        grade_multiplier: gradeMultiplier,
        late_task_count: lateTasks.length,
        penalty_amount: Math.round(penaltyAmount),
        calculated_amount: Math.round(calculatedAmount),
        final_override_amount: cachedOverride !== undefined ? cachedOverride : null, // 🛡️ Phục hồi dữ liệu
        is_overridden: cachedOverride !== undefined, // 🛡️ Phục hồi dữ liệu
        penalty_metadata: penaltyMetadata

      });
    }

    // 🛡️ XỬ LÝ LƯƠNG CHO TRƯỞNG LAB
    for (const [email, data] of Object.entries(partyAAggregator)) {
      const teacher = await User.findOne({ where: { email }, transaction });
      if (teacher) {

        // ==========================================
        // 🌟 TÍNH THUẾ TNCN (10%) CHO TRƯỞNG LAB
        // ==========================================
        const grossTeacher = data.total_cut;         // Gốc
        const taxTeacher = grossTeacher * 0.10;      // Thuế 10%
        let calcTeacher = grossTeacher - taxTeacher; // Thực nhận (Trưởng Lab không bị phạt Task)

        // 🛡️ LẤY LẠI DỮ LIỆU ĐÃ SAO LƯU TỪ CACHE (Cho Trưởng Lab)
        const cachedOverrideTeacher = overrideCache[teacher.id];

        rewardDetails.push({
          id: uuidv4(), // Cấp sẵn ID
          sheet_id: sheet.id,
          user_id: teacher.id,
          role: 'Truong Lab',
          model_type: null,
          base_share: 0,
          model_cut_amount: Math.round(data.total_cut),
          report_grade: 'A',
          grade_multiplier: 1.0,
          late_task_count: 0,
          penalty_amount: 0,
          calculated_amount: Math.round(calcTeacher), // 👈 Tiền thực nhận ĐÃ TRỪ THUẾ
          final_override_amount: cachedOverrideTeacher !== undefined ? cachedOverrideTeacher : null, // 🛡️ Phục hồi
          is_overridden: cachedOverrideTeacher !== undefined, // 🛡️ Phục hồi
          penalty_metadata: JSON.stringify({
            info: 'Thu nhập trích từ % cam kết của các sinh viên trong dự án',
            sources: data.from_students,
            pre_tax: Math.round(grossTeacher), // 🌟 Lưu tiền gốc để Web in ra
            tax_amount: Math.round(taxTeacher) // 🌟 Lưu tiền thuế để Web in ra
          })
        });
      }
    }

    await RewardSheetDetail.bulkCreate(rewardDetails, { transaction });
    await transaction.commit();
    logger.info(`Đã tự động tính thưởng cho dự án ${projectId}.`);

    return sheet;
  } catch (error) {
    // FIX 3: Bọc try-catch riêng để bắt rollback error, giữ lại lỗi gốc
    try {
      if (transaction) await transaction.rollback();
    } catch (rollbackError) {
      logger.warn('Transaction aborted by SQL Server.');
    }
    logger.error('Lỗi khi tính thưởng dự án:', error);
    throw error;
  }
};

/**
 * 2. LẤY CHI TIẾT BẢNG THƯỞNG THEO PHÂN QUYỀN
 */
const getRewardSheetByProject = async (projectId, requestingUser) => {
  const sheet = await RewardSheet.findOne({
    where: { project_id: projectId },
    include: [{
      model: RewardSheetDetail,
      as: 'details',
      include: [{ model: User, as: 'user', attributes: ['full_name', 'email', 'system_role'] }]
    }]
  });

  if (!sheet) throw { status: 404, message: 'Bảng tính thưởng dự án này chưa được tạo.' };

  // 🛡️ BƯỚC 1: Chuyển object của DB thành JSON thuần (bóc tách khỏi Sequelize)
  const sheetData = sheet.toJSON();

  // 🛡️ BƯỚC 2: Cắt tỉa dữ liệu theo phân quyền
  if (requestingUser.system_role !== 'vien_truong') {
    // Chỉ giữ lại mảng details có user_id trùng với ID người đang đăng nhập
    sheetData.details = sheetData.details.filter(detail => detail.user_id === requestingUser.id);
  }

  // Trả về sheetData (đã bị cắt gọt) thay vì sheet gốc
  return sheetData;
};

/**
 * 3. VIỆN TRƯỞNG CHỈNH SỬA TIỀN THỦ CÔNG
 */
const updateRewardOverride = async (detailId, overrideAmount, requestingUser) => {
  if (requestingUser.system_role !== 'vien_truong') {
    throw { status: 403, message: 'Chỉ Viện Trưởng mới có quyền chỉnh sửa số tiền.' };
  }

  const detail = await RewardSheetDetail.findByPk(detailId, {
    include: [{ model: RewardSheet, as: 'sheet' }]
  });

  if (!detail) throw { status: 404, message: 'Không tìm thấy chi tiết thưởng.' };
  if (detail.sheet.status === 'FINALIZED') throw { status: 400, message: 'Bảng tính đã chốt, không thể chỉnh sửa.' };

  detail.final_override_amount = overrideAmount;
  detail.is_overridden = overrideAmount !== null && overrideAmount !== undefined;
  await detail.save();

  return detail;
};

/**
 * 4. VIỆN TRƯỞNG CHỐT SỔ BẢNG THƯỞNG (FINAL VERSION)
 */
const finalizeRewardSheet = async (projectId, requestingUser) => {
  if (requestingUser.system_role !== 'vien_truong') {
    throw { status: 403, message: 'Chỉ Viện Trưởng mới có quyền chốt sổ (Finalize).' };
  }

  // Phải include cả bảng details để lấy dữ liệu tính tổng tiền và check khiếu nại
  const sheet = await RewardSheet.findOne({
    where: { project_id: projectId },
    include: [{ model: RewardSheetDetail, as: 'details' }]
  });

  if (!sheet) throw { status: 404, message: 'Không tìm thấy bảng tính thưởng.' };
  if (sheet.status === 'FINALIZED') throw { status: 400, message: 'Bảng này đã được chốt từ trước.' };

  // ==========================================
  // 🛡️ CHỐT CHẶN 1: KIỂM TRA KHIẾU NẠI TỒN ĐỌNG
  // ==========================================
  const pendingAppeals = sheet.details.filter(d => d.appeal_status === 'PENDING');
  if (pendingAppeals.length > 0) {
    throw {
      status: 400,
      message: `Không thể chốt sổ! Đang có ${pendingAppeals.length} khiếu nại chưa được giải quyết. Vui lòng xử lý khiếu nại trước khi Finalize.`
    };
  }
  // ==========================================

  // ==========================================
  // 🛡️ CHỐT CHẶN 2: KIỂM TRA NGÂN SÁCH (ĐÃ LÀM TRÒN SỐ CHỐNG LỖI)
  // ==========================================
  let totalActualPayout = 0;

  for (const detail of sheet.details) {
    // Nếu có sửa tay, lấy tiền sửa tay. Nếu không, lấy tiền tính tự động.
    const payoutForUser = detail.is_overridden
      ? Number(detail.final_override_amount)
      : Number(detail.calculated_amount);

    totalActualPayout += payoutForUser;
  }

  const projectBudget = Number(sheet.total_budget);

  // Làm tròn tới số nguyên để tránh lỗi thập phân của JS (VD: 0.00001)
  const safeTotalPayout = Math.round(totalActualPayout);
  const safeProjectBudget = Math.round(projectBudget);

  // Nếu tổng chi thực tế LỚN HƠN ngân sách dự án -> CHẶN
  if (safeTotalPayout > safeProjectBudget) {
    const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
    throw {
      status: 400,
      message: `Không thể chốt sổ! Tổng tiền chi trả (${formatter.format(safeTotalPayout)}) đang VƯỢT QUÁ ngân sách dự án (${formatter.format(safeProjectBudget)}). Vui lòng điều chỉnh lại.`
    };
  }
  // ==========================================

  sheet.status = 'FINALIZED';
  sheet.finalized_by = requestingUser.id;
  sheet.finalized_at = new Date();
  await sheet.save();

  // Trả về thêm object summary để Frontend hiển thị báo cáo tổng quan
  return {
    ...sheet.toJSON(),
    summary: {
      total_budget: safeProjectBudget,
      total_payout: safeTotalPayout,
      budget_saved: safeProjectBudget - safeTotalPayout // Tiền giữ lại cho quỹ Viện
    }
  };
};
/**
 * 5. THÀNH VIÊN GỬI KHIẾU NẠI (APPEAL)
 */
const submitAppeal = async (detailId, reason, requestingUser) => {
  const detail = await RewardSheetDetail.findOne({
    where: { id: detailId, user_id: requestingUser.id },
    include: [{ model: RewardSheet, as: 'sheet' }]
  });

  if (!detail) throw { status: 404, message: 'Không tìm thấy dữ liệu thưởng của bạn.' };
  if (detail.sheet.status === 'FINALIZED') throw { status: 400, message: 'Bảng tính đã chốt, không thể khiếu nại nữa.' };

  detail.appeal_status = 'PENDING';
  detail.appeal_reason = reason;
  await detail.save();

  return detail;
};
/**
 * 6. VIỆN TRƯỞNG GIẢI QUYẾT KHIẾU NẠI (RESOLVE/REJECT)
 */
const resolveAppeal = async (detailId, resolutionStatus, requestingUser) => {
  if (requestingUser.system_role !== 'vien_truong') {
    throw { status: 403, message: 'Chỉ Viện Trưởng mới có quyền giải quyết khiếu nại.' };
  }

  // resolutionStatus chỉ được nhận 'RESOLVED' hoặc 'REJECTED'
  if (!['RESOLVED', 'REJECTED'].includes(resolutionStatus)) {
    throw { status: 400, message: 'Trạng thái giải quyết không hợp lệ.' };
  }

  const detail = await RewardSheetDetail.findByPk(detailId, {
    include: [{ model: RewardSheet, as: 'sheet' }]
  });

  if (!detail) throw { status: 404, message: 'Không tìm thấy chi tiết thưởng.' };
  if (detail.appeal_status !== 'PENDING') throw { status: 400, message: 'Mục này không có khiếu nại nào đang chờ xử lý.' };
  if (detail.sheet.status === 'FINALIZED') throw { status: 400, message: 'Bảng tính đã chốt.' };

  detail.appeal_status = resolutionStatus;
  await detail.save();

  // (Mẹo: Thường Viện trưởng sẽ gọi API UpdateOverrideAmount trước để sửa tiền, sau đó gọi API ResolveAppeal này để đóng khiếu nại).
  return detail;
};

/**
 * 7. XUẤT EXCEL BẢNG LƯƠNG (Có tên Dự án chuẩn & Có cột Thuế)
 */
const exportRewardExcel = async (projectId, requestingUser) => {
  const sheetData = await getRewardSheetByProject(projectId, requestingUser);

  // 🌟 Lấy thông tin dự án từ DB
  const project = await Project.findByPk(projectId);
  let fileName = `BangTinhThuong_${projectId}.xlsx`; // Tên mặc định phòng hờ lỗi

  if (project) {
    // Hàm hỗ trợ làm sạch chuỗi (xóa dấu tiếng Việt, thay khoảng trắng thành _)
    const sanitizeString = (str) => {
      if (!str) return '';
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_");
    };

    const safeName = sanitizeString(project.name);
    const safeCode = sanitizeString(project.code);
    const namePart = [safeName, safeCode].filter(Boolean).join('_');

    if (namePart) {
      fileName = `BangTinhThuong_${namePart}.xlsx`;
    }
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bảng Tính Thưởng');

  // 🌟 BỔ SUNG 2 CỘT THUẾ VÀO HEADER EXCEL
  worksheet.columns = [
    { header: 'ID Chi Tiết (KHÔNG SỬA)', key: 'id', width: 40 },
    { header: 'Họ và Tên', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Vai trò', key: 'role', width: 15 },
    { header: 'Trước Thuế (VNĐ)', key: 'pre_tax', width: 20 },     // 👈 Cột mới
    { header: 'Thuế 10% (VNĐ)', key: 'tax_amount', width: 20 },    // 👈 Cột mới
    { header: 'Thực nhận tự động (VNĐ)', key: 'auto_amount', width: 25 },
    { header: 'Điều chỉnh tay (VNĐ)', key: 'override_amount', width: 25 },
    { header: 'Trạng thái Khiếu nại', key: 'appeal', width: 20 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

  sheetData.details.forEach(row => {
    // 🌟 Giải mã JSON để lấy số tiền Thuế lưu trong meta
    let meta = {};
    try { 
        meta = JSON.parse(row.penalty_metadata || '{}'); 
    } catch(e) {}

    worksheet.addRow({
      id: row.id,
      name: row.user ? row.user.full_name : 'N/A', // Bọc thêm check an toàn lỡ user bị xóa
      email: row.user ? row.user.email : 'N/A',
      role: row.role,
      pre_tax: meta.pre_tax || 0,        // 👈 Đổ data Gốc
      tax_amount: meta.tax_amount || 0,  // 👈 Đổ data Thuế
      auto_amount: Number(row.calculated_amount),
      override_amount: row.final_override_amount !== null ? Number(row.final_override_amount) : '',
      appeal: row.appeal_status
    });
  });

  worksheet.getColumn('id').hidden = true;

  // Trả về cả file và tên file mong muốn
  return { workbook, fileName };
};

/**
 * 8. IMPORT EXCEL TỪ RAM (Xử lý an toàn Công thức & Dấu phẩy)
 */
const importOverrideExcel = async (projectId, fileBuffer, requestingUser) => {
  if (requestingUser.system_role !== 'vien_truong') {
    throw { status: 403, message: 'Chỉ Viện Trưởng mới có quyền Import file.' };
  }

  const sheet = await RewardSheet.findOne({ where: { project_id: projectId } });
  if (!sheet) throw { status: 404, message: 'Bảng tính chưa tồn tại.' };
  if (sheet.status === 'FINALIZED') throw { status: 400, message: 'Bảng này đã chốt, không thể Import ghi đè.' };

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);
  const worksheet = workbook.getWorksheet(1);

  const updates = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      // 1. Lấy ID an toàn (Cột 1 bị ẩn)
      const rawId = row.getCell(1).value;
      let detailId = typeof rawId === 'object' ? (rawId?.text || rawId?.result) : rawId;

      // 2. Lấy dữ liệu từ cột "Điều chỉnh tay" (Cột 6 / Cột F)
      let rawVal = row.getCell(8).value;
      let overrideVal = rawVal;

      if (rawVal !== null && rawVal !== undefined) {
          // 🛡️ BÓC TÁCH NẾU LÀ CÔNG THỨC EXCEL
          if (typeof rawVal === 'object') {
              if (rawVal.result !== undefined) {
                  overrideVal = rawVal.result; // Lấy kết quả đã tính của công thức
              } else if (rawVal.formula) {
                  // Bắn lỗi thẳng ra Web nếu Excel không chịu lưu kết quả
                  throw { status: 400, message: `Lỗi dòng ${rowNumber}: Cột "Điều chỉnh tay" đang chứa công thức (${rawVal.formula}) nhưng không có kết quả. Hãy bôi đen cột đó trong Excel -> Copy -> Paste as Values (Dán giá trị) rồi Import lại!` };
              }
          }

          // 🛡️ XÓA DẤU PHẨY NẾU LÀ TEXT (VD: "5,000,000")
          if (typeof overrideVal === 'string') {
              overrideVal = overrideVal.replace(/[,.\s]/g, '');
          }
          
          // Đảm bảo chắc chắn nó là số
          overrideVal = Number(overrideVal);
          if (isNaN(overrideVal)) overrideVal = null;
      } else {
          overrideVal = null; // Viện trưởng xóa trống ô thì đưa về tính tự động
      }

      if (detailId) {
        updates.push({
          detailId: detailId.toString().trim(),
          overrideVal: overrideVal
        });
      }
    }
  });

  let successCount = 0;
  for (const item of updates) {
    const detail = await RewardSheetDetail.findOne({
      where: { id: item.detailId, sheet_id: sheet.id }
    });

    if (detail) {
      // Ép kiểu DB ra số để so sánh chuẩn xác (tránh lỗi String !== Number)
      const currentVal = detail.final_override_amount !== null ? Number(detail.final_override_amount) : null;
      
      if (currentVal !== item.overrideVal) {
        detail.final_override_amount = item.overrideVal;
        detail.is_overridden = item.overrideVal !== null;
        await detail.save();
        successCount++;
      }
    }
  }

  return { successCount };
};

module.exports = {
  autoGenerateProjectReward,
  getRewardSheetByProject,
  updateRewardOverride,
  finalizeRewardSheet,
  submitAppeal,
  resolveAppeal,
  exportRewardExcel,
  importOverrideExcel,
};