const bcrypt = require('bcryptjs');
const {
  sequelize, User, Project, ProjectMember, Task, Milestone, WeeklyReport, Commitment,
} = require('../models');
const {
  USER_STATUS, SYSTEM_ROLES, PROJECT_STATUS, PROJECT_ROLES,
  TASK_STATUS, TASK_PRIORITY, REPORT_STATUS,
} = require('../config/constants');
const { generateRewardSheet } = require('../services/reward.service');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Lab@12345';

// ─── Users ───────────────────────────────────────────────────────────────────
const USER_DEFS = [
  {
    key: 'admin',
    full_name: 'System Admin',
    email: 'admin@lab.com',
    password: 'Admin123!',
    system_role: SYSTEM_ROLES.ADMIN,
    student_code: null,
    department: 'Management',
  },
  {
    key: 'vien_truong',
    full_name: 'Nguyễn Văn Viện',
    email: 'vientruong@lab.com',
    system_role: SYSTEM_ROLES.VIEN_TRUONG,
    student_code: null,
    department: 'Board',
  },
  {
    key: 'truong_lab',
    full_name: 'Trần Thị Lab',
    email: 'truonglab@lab.com',
    system_role: SYSTEM_ROLES.TRUONG_LAB,
    student_code: null,
    department: 'Research Lab',
  },
  {
    key: 'leader1',
    full_name: 'Lê Minh Khoa',
    email: 'leader1@lab.com',
    system_role: SYSTEM_ROLES.LEADER,
    student_code: 'SV2021001',
    department: 'Computer Science',
  },
  {
    key: 'leader2',
    full_name: 'Phạm Thu Hà',
    email: 'leader2@lab.com',
    system_role: SYSTEM_ROLES.LEADER,
    student_code: 'SV2021002',
    department: 'Electronics',
  },
  {
    key: 'member1',
    full_name: 'Hoàng Văn An',
    email: 'member1@lab.com',
    system_role: SYSTEM_ROLES.MEMBER,
    student_code: 'SV2022001',
    department: 'Computer Science',
  },
  {
    key: 'member2',
    full_name: 'Nguyễn Hải Yến',
    email: 'member2@lab.com',
    system_role: SYSTEM_ROLES.MEMBER,
    student_code: 'SV2022002',
    department: 'Computer Science',
  },
  {
    key: 'member3',
    full_name: 'Võ Thành Đạt',
    email: 'member3@lab.com',
    system_role: SYSTEM_ROLES.MEMBER,
    student_code: 'SV2022003',
    department: 'Electronics',
  },
  {
    key: 'member4',
    full_name: 'Đặng Quỳnh Nga',
    email: 'member4@lab.com',
    system_role: SYSTEM_ROLES.MEMBER,
    student_code: 'SV2023001',
    department: 'Robotics',
  },
  {
    key: 'guest',
    full_name: 'Guest User',
    email: 'guest@lab.com',
    password: 'Guest123!',
    system_role: SYSTEM_ROLES.GUEST,
    student_code: null,
    department: null,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function weeksAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Return ISO week number for a Date */
function isoWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/** Sunday of the week that contains `date` */
function weekSunday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (7 - day) % 7);
  d.setHours(23, 59, 59, 0);
  return d;
}

// ─── Seed ────────────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected for seeding');
    await sequelize.sync();

    // Ensure commitment_location exists for backward compatibility
    await sequelize.query("IF COL_LENGTH('Commitments','commitment_location') IS NULL BEGIN ALTER TABLE Commitments ADD commitment_location NVARCHAR(255) NULL END");

    // ── 1. Users ──────────────────────────────────────────────────────────────
    const users = {};
    for (const def of USER_DEFS) {
      let user = await User.findOne({ where: { email: def.email } });
      if (user) {
        logger.info(`User ${def.email} already exists — skipping`);
        users[def.key] = user;
        continue;
      }
      const hash = await bcrypt.hash(def.password || DEFAULT_PASSWORD, SALT_ROUNDS);
      user = await User.create({
        full_name: def.full_name,
        email: def.email,
        password_hash: hash,
        system_role: def.system_role,
        status: USER_STATUS.ACTIVE,
        email_verified: true,
        student_code: def.student_code || null,
        department: def.department || null,
      });
      logger.info(`Created user: ${def.email}`);
      users[def.key] = user;
    }

    // ── 2. Projects ───────────────────────────────────────────────────────────
    const projectDefs = [
      {
        key: 'roboarm',
        code: 'ROBOARM-24',
        name: 'Cánh tay robot tự động (RoboArm)',
        description: 'Nghiên cứu và phát triển cánh tay robot 6 bậc tự do ứng dụng trong dây chuyền sản xuất.',
        tag: 'Robotics',
        status: PROJECT_STATUS.ACTIVE,
        leader: users.leader1,
        start_date: '2024-01-15',
        end_date: '2024-12-31',
        budget: 150000000,
        git_repo_url: 'https://github.com/rcet-lab/roboarm-24',
        git_provider: 'github',
        git_default_branch: 'main',
        git_visibility: 'private',
        git_last_commit_sha: 'a3f8c21d',
        git_last_commit_author: 'leminhkhoa@lab.com',
        git_last_commit_message: 'feat: add inverse kinematics module',
        git_last_commit_date: weeksAgo(1),
        members: ['member1', 'member2', 'member3'],
      },
      {
        key: 'aivision',
        code: 'AIVISION-25',
        name: 'Hệ thống nhận dạng hình ảnh AI',
        description: 'Xây dựng pipeline nhận dạng khuôn mặt và vật thể thời gian thực sử dụng YOLOv8.',
        tag: 'AI/ML',
        status: PROJECT_STATUS.ACTIVE,
        leader: users.leader2,
        start_date: '2025-03-01',
        end_date: '2025-11-30',
        budget: 80000000,
        members: ['member2', 'member4'],
      },
      {
        key: 'fpgadsp',
        code: 'FPGA-DSP-24',
        name: 'Xử lý tín hiệu số trên FPGA',
        description: 'Triển khai các thuật toán DSP (FFT, FIR filter) lên FPGA Xilinx Artix-7.',
        tag: 'FPGA',
        status: PROJECT_STATUS.DONE,
        leader: users.leader1,
        start_date: '2023-09-01',
        end_date: '2024-06-30',
        budget: 60000000,
        members: ['member3'],
      },
      {
        key: 'iotmonitor',
        code: 'IOT-MON-25',
        name: 'Hệ thống giám sát môi trường IoT',
        description: 'Thu thập dữ liệu nhiệt độ, độ ẩm, chất lượng không khí từ các sensor ESP32 và hiển thị trên dashboard.',
        tag: 'IoT',
        status: PROJECT_STATUS.PLANNING,
        leader: users.leader2,
        start_date: '2025-06-01',
        end_date: '2025-12-31',
        budget: 45000000,
        members: ['member1', 'member4'],
      },
    ];

    const projects = {};
    for (const def of projectDefs) {
      let project = await Project.findOne({ where: { code: def.code } });
      if (project) {
        logger.info(`Project ${def.code} already exists — skipping`);
        projects[def.key] = project;
        continue;
      }

      project = await Project.create({
        code: def.code,
        name: def.name,
        description: def.description,
        tag: def.tag,
        status: def.status,
        leader_id: def.leader.id,
        start_date: def.start_date,
        end_date: def.end_date,
        budget: def.budget || null,
        git_repo_url: def.git_repo_url || null,
        git_provider: def.git_provider || null,
        git_default_branch: def.git_default_branch || null,
        git_visibility: def.git_visibility || null,
        git_last_commit_sha: def.git_last_commit_sha || null,
        git_last_commit_author: def.git_last_commit_author || null,
        git_last_commit_message: def.git_last_commit_message || null,
        git_last_commit_date: def.git_last_commit_date || null,
      });
      logger.info(`Created project: ${def.code}`);
      projects[def.key] = project;

      // Auto-add leader as member
      await ProjectMember.findOrCreate({
        where: { project_id: project.id, user_id: def.leader.id },
        defaults: { role: PROJECT_ROLES.LEADER, joined_at: new Date() },
      });

      // Add other members
      for (const memberKey of (def.members || [])) {
        await ProjectMember.findOrCreate({
          where: { project_id: project.id, user_id: users[memberKey].id },
          defaults: { role: PROJECT_ROLES.MEMBER, joined_at: new Date() },
        });
      }
    }

    // ── 2.5. Commitments (sample data) ─────────────────────────────────────────
    const commitmentDefs = [
      {
        userKey: 'member1',
        partyA_email: users.truong_lab.email, // Corrected email
        modelType: 1,
        partyA_name: 'Trần Thị Lab',
        partyB_name: 'Hoàng Văn An',
        partyB_mssv: users.member1.student_code,
      },
      {
        userKey: 'member2',
        partyA_email: users.truong_lab.email, // Corrected email
        modelType: 2,
        partyA_name: 'Trần Thị Lab',
        partyB_name: 'Nguyễn Hải Yến',
        partyB_mssv: users.member2.student_code,
      },
      {
        userKey: 'leader1',
        partyA_email: users.vien_truong.email, // Corrected email
        modelType: 3,
        partyA_name: 'Nguyễn Văn Viện',
        partyB_name: 'Lê Minh Khoa',
        partyB_mssv: users.leader1.student_code,
      },
    ];

    for (const def of commitmentDefs) {
      const user = users[def.userKey];
      if (!user) continue;

      const [commitment, created] = await Commitment.findOrCreate({
        where: { user_id: user.id, model_type: def.modelType },
        defaults: {
          user_id: user.id,
          party_a_email: def.partyA_email,
          model_type: def.modelType,
          party_a_name: def.partyA_name,
          party_b_name: def.partyB_name,
          party_b_mssv: def.partyB_mssv,
          created_at: new Date(),
        },
      });

      if (created) {
        logger.info(`Created commitment for ${def.partyB_name}`);
      } else {
        // Ensure existing records have the correct email
        if (commitment.party_a_email !== def.partyA_email) {
          commitment.party_a_email = def.partyA_email;
          await commitment.save();
          logger.info(`Updated commitment for ${def.partyB_name}`);
        }
      }
    }
    logger.info('Seeded and corrected commitments.');

    // ── 3. Tasks ──────────────────────────────────────────────────────────────
    const taskDefs = [
      // ROBOARM-24 tasks
      {
        project: 'roboarm',
        title: 'Thiết kế mô hình 3D cánh tay robot',
        description: 'Dùng SolidWorks thiết kế 6 khớp và xuất file STL để in 3D.',
        status: TASK_STATUS.DONE,
        priority: TASK_PRIORITY.HIGH,
        assignee: 'member1',
        created_by: 'leader1',
        due_date: daysAgoStr(60),
      },
      {
        project: 'roboarm',
        title: 'Lập trình bộ điều khiển PID',
        description: 'Cài đặt PID cho từng khớp, chỉnh tham số Kp/Ki/Kd.',
        status: TASK_STATUS.IN_PROGRESS,
        priority: TASK_PRIORITY.URGENT,
        assignee: 'member2',
        created_by: 'leader1',
        due_date: daysFromNow(14),
      },
      {
        project: 'roboarm',
        title: 'Xây dựng module Inverse Kinematics',
        description: 'Tính toán góc khớp từ vị trí tọa độ đích.',
        status: TASK_STATUS.IN_PROGRESS,
        priority: TASK_PRIORITY.HIGH,
        assignee: 'member1',
        created_by: 'leader1',
        due_date: daysFromNow(21),
      },
      {
        project: 'roboarm',
        title: 'Tích hợp cảm biến lực',
        description: 'Gắn load cell vào khớp cổ tay, đọc dữ liệu qua SPI.',
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        assignee: 'member3',
        created_by: 'leader1',
        due_date: daysFromNow(30),
      },
      {
        project: 'roboarm',
        title: 'Viết báo cáo tổng kết giai đoạn 1',
        description: 'Tổng hợp kết quả thiết kế và lập trình giai đoạn 1.',
        status: TASK_STATUS.REVIEW,
        priority: TASK_PRIORITY.MEDIUM,
        assignee: 'leader1',
        created_by: 'leader1',
        due_date: daysFromNow(7),
      },
      // AIVISION-25 tasks
      {
        project: 'aivision',
        title: 'Thu thập và gán nhãn dataset khuôn mặt',
        description: 'Thu thập 5000 ảnh, gán nhãn bounding box.',
        status: TASK_STATUS.DONE,
        priority: TASK_PRIORITY.HIGH,
        assignee: 'member4',
        created_by: 'leader2',
        due_date: daysAgoStr(30),
      },
      {
        project: 'aivision',
        title: 'Fine-tune YOLOv8 trên dataset nội bộ',
        description: 'Train model 50 epochs, đánh giá mAP@50.',
        status: TASK_STATUS.IN_PROGRESS,
        priority: TASK_PRIORITY.URGENT,
        assignee: 'member2',
        created_by: 'leader2',
        due_date: daysFromNow(10),
      },
      {
        project: 'aivision',
        title: 'Xây dựng REST API inference',
        description: 'FastAPI endpoint nhận ảnh, trả kết quả detect JSON.',
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.HIGH,
        assignee: 'leader2',
        created_by: 'leader2',
        due_date: daysFromNow(20),
      },
      // IOT-MON-25 tasks
      {
        project: 'iotmonitor',
        title: 'Chọn linh kiện và lên bill of materials',
        description: 'ESP32, DHT22, MQ-135, OLED display.',
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        assignee: 'member1',
        created_by: 'leader2',
        due_date: daysFromNow(14),
      },
      {
        project: 'iotmonitor',
        title: 'Thiết kế sơ đồ mạch PCB',
        description: 'KiCad schematic và layout PCB 2 lớp.',
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        assignee: 'member4',
        created_by: 'leader2',
        due_date: daysFromNow(30),
      },
    ];

    const tasks = {};
    for (const def of taskDefs) {
      const project = projects[def.project];
      if (!project) continue;
      // skip if a task with same title exists in this project
      const existing = await Task.findOne({
        where: { project_id: project.id, title: def.title },
      });
      if (existing) {
        tasks[`${def.project}_${def.title}`] = existing;
        continue;
      }
      const task = await Task.create({
        project_id: project.id,
        title: def.title,
        description: def.description,
        status: def.status,
        priority: def.priority,
        assignee_id: users[def.assignee]?.id || null,
        created_by: users[def.created_by].id,
        due_date: def.due_date,
      });
      tasks[`${def.project}_${def.title}`] = task;
    }
    logger.info(`Seeded ${Object.keys(tasks).length} tasks`);

    // ── 4. Milestones ─────────────────────────────────────────────────────────
    const milestoneDefs = [
      {
        project: 'roboarm',
        title: 'Hoàn thiện thiết kế cơ khí',
        description: 'Toàn bộ bản vẽ 3D và mô hình in thử đã hoàn chỉnh.',
        due_date: daysAgoStr(45),
        done: true,
        done_at: weeksAgo(6),
      },
      {
        project: 'roboarm',
        title: 'Tích hợp phần cứng + firmware',
        description: 'Bo mạch điều khiển + driver servo đã chạy được.',
        due_date: daysFromNow(14),
        done: false,
      },
      {
        project: 'roboarm',
        title: 'Demo cuối kỳ',
        description: 'Trình diễn cánh tay phân loại sản phẩm tự động.',
        due_date: daysFromNow(90),
        done: false,
      },
      {
        project: 'aivision',
        title: 'Dataset chuẩn bị xong',
        description: '5000 ảnh đã gán nhãn và chia train/val/test.',
        due_date: daysAgoStr(20),
        done: true,
        done_at: weeksAgo(3),
      },
      {
        project: 'aivision',
        title: 'Model đạt mAP ≥ 85%',
        description: 'Mô hình fine-tune đạt chỉ số hiệu suất yêu cầu.',
        due_date: daysFromNow(12),
        done: false,
      },
      {
        project: 'iotmonitor',
        title: 'Phê duyệt thiết kế phần cứng',
        description: 'BOM và sơ đồ mạch được truong_lab duyệt.',
        due_date: daysFromNow(21),
        done: false,
      },
    ];

    for (const def of milestoneDefs) {
      const project = projects[def.project];
      if (!project) continue;
      const existing = await Milestone.findOne({
        where: { project_id: project.id, title: def.title },
      });
      if (existing) continue;
      await Milestone.create({
        project_id: project.id,
        title: def.title,
        description: def.description,
        due_date: def.due_date,
        done: def.done || false,
        done_at: def.done_at || null,
      });
    }
    logger.info('Seeded milestones');

    // ── 5. Weekly Reports & Reward Module Test Data (March 2024) ──────────────
    logger.info('Seeding data for Reward Module test cases...');

    /**
     * Calculates a 4-week (28-day) cycle for a given month and year.
     * It starts from the first Monday of the month.
     * @param {number} month - The month (1-12).
     * @param {number} year - The year.
     * @returns {{startDate: Date, endDate: Date}}
     */
    function getFourWeekCycle(month, year) {
      const firstDayOfMonth = new Date(year, month - 1, 1);
      const dayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ...
      // Find the first Monday. If the 1st is a Sunday (0), add 1 day. If it's a Tuesday (2), add 6 days.
      const daysToAdd = (8 - dayOfWeek) % 7;
      const startDate = new Date(year, month - 1, 1 + daysToAdd);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 27); // 4 weeks = 28 days, so end date is 27 days after start
      return { startDate, endDate };
    }

    const testYear = 2024;
    const testMonth = 3; // March
    const cycle = getFourWeekCycle(testMonth, testYear);

    // --- User 1 (member1): 1 late report, 1 late task ---
    const user1 = users.member1;
    // Create 4 weekly reports for March, one of them is LATE
    for (let i = 0; i < 4; i++) {
      const reportDate = new Date(cycle.startDate);
      reportDate.setDate(reportDate.getDate() + i * 7);
      const reportWeek = isoWeek(reportDate);
      const reportYear = reportDate.getFullYear();
      const reportDueDate = weekSunday(reportDate);

      await WeeklyReport.findOrCreate({
        where: { user_id: user1.id, year: reportYear, week_number: reportWeek },
        defaults: {
          project_id: projects.roboarm.id,
          user_id: user1.id,
          week_number: reportWeek,
          year: reportYear,
          status: i === 1 ? REPORT_STATUS.LATE : REPORT_STATUS.SUBMITTED, // The second report is late
          due_date: reportDueDate.toISOString().slice(0, 10),
          submitted_at: i === 1 ? new Date(reportDueDate.getTime() + 24 * 60 * 60 * 1000) : new Date(reportDueDate.getTime() - 24 * 60 * 60 * 1000),
          content: `Báo cáo tuần ${reportWeek} cho dự án RoboArm.`,
        },
      });
    }
    // Create one late task in March
    await Task.findOrCreate({
      where: { assignee_id: user1.id, title: 'Test Task - Late' },
      defaults: {
        project_id: projects.roboarm.id,
        title: 'Test Task - Late',
        assignee_id: user1.id,
        created_by: users.leader1.id,
        due_date: new Date(cycle.startDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Due in the cycle
        status: TASK_STATUS.DONE, // It's done...
        updated_at: new Date(cycle.startDate.getTime() + 12 * 24 * 60 * 60 * 1000), // ...but updated 2 days after due date
      },
    });

    // --- User 2 (member2): 2 late reports, 3 late tasks (3 strikes) ---
    const user2 = users.member2;
    // Create 4 weekly reports, two are LATE
    for (let i = 0; i < 4; i++) {
      const reportDate = new Date(cycle.startDate);
      reportDate.setDate(reportDate.getDate() + i * 7);
      const reportWeek = isoWeek(reportDate);
      const reportYear = reportDate.getFullYear();
      const reportDueDate = weekSunday(reportDate);

      await WeeklyReport.findOrCreate({
        where: { user_id: user2.id, year: reportYear, week_number: reportWeek },
        defaults: {
          project_id: projects.aivision.id,
          user_id: user2.id,
          week_number: reportWeek,
          year: reportYear,
          status: (i === 1 || i === 3) ? REPORT_STATUS.LATE : REPORT_STATUS.SUBMITTED,
          due_date: reportDueDate.toISOString().slice(0, 10),
          submitted_at: (i === 1 || i === 3) ? new Date(reportDueDate.getTime() + 24 * 60 * 60 * 1000) : new Date(reportDueDate.getTime() - 24 * 60 * 60 * 1000),
          content: `Báo cáo tuần ${reportWeek} cho dự án AIVision.`,
        },
      });
    }
    // Create 3 late tasks to trigger the 3-strikes rule
    for (let i = 0; i < 3; i++) {
      await Task.findOrCreate({
        where: { assignee_id: user2.id, title: `Strike Task ${i + 1}` },
        defaults: {
          project_id: projects.aivision.id,
          title: `Strike Task ${i + 1}`,
          assignee_id: user2.id,
          created_by: users.leader2.id,
          due_date: new Date(cycle.startDate.getTime() + (5 + i * 2) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          status: TASK_STATUS.TODO, // Still not done, so it's late
        },
      });
    }

    // --- User 3 (leader1): Perfect record ---
    const user3 = users.leader1;
    for (let i = 0; i < 4; i++) {
      const reportDate = new Date(cycle.startDate);
      reportDate.setDate(reportDate.getDate() + i * 7);
      const reportWeek = isoWeek(reportDate);
      const reportYear = reportDate.getFullYear();
      const reportDueDate = weekSunday(reportDate);

      await WeeklyReport.findOrCreate({
        where: { user_id: user3.id, year: reportYear, week_number: reportWeek },
        defaults: {
          project_id: projects.roboarm.id,
          user_id: user3.id,
          week_number: reportWeek,
          year: reportYear,
          status: REPORT_STATUS.SUBMITTED,
          due_date: reportDueDate.toISOString().slice(0, 10),
          submitted_at: new Date(reportDueDate.getTime() - 24 * 60 * 60 * 1000),
          content: `Báo cáo tuần ${reportWeek} của Leader.`,
        },
      });
    }

    logger.info('Finished seeding reward module test data.');

    logger.info('✅  Seeding complete');
    logger.info('');
    logger.info('── Login credentials ──────────────────────────────');
    logger.info('  admin@lab.com        Admin123!   (admin)');
    logger.info('  vientruong@lab.com   Lab@12345   (vien_truong)');
    logger.info('  truonglab@lab.com    Lab@12345   (truong_lab)');
    logger.info('  leader1@lab.com      Lab@12345   (leader)');
    logger.info('  leader2@lab.com      Lab@12345   (leader)');
    logger.info('  member1@lab.com      Lab@12345   (member)');
    logger.info('  member2@lab.com      Lab@12345   (member)');
    logger.info('  member3@lab.com      Lab@12345   (member)');
    logger.info('  member4@lab.com      Lab@12345   (member)');
    logger.info('  guest@lab.com        Guest123!   (guest)');
    logger.info('───────────────────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();