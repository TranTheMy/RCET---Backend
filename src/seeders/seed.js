const bcrypt = require('bcryptjs');
const {
  sequelize, User, Project, ProjectMember, Task, Milestone, WeeklyReport,
  VerilogProblem, VerilogTestCase,
} = require('../models');
const {
  USER_STATUS, SYSTEM_ROLES, PROJECT_STATUS, PROJECT_ROLES,
  TASK_STATUS, TASK_PRIORITY, REPORT_STATUS,
} = require('../config/constants');
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

    // ── 5. Weekly Reports ─────────────────────────────────────────────────────
    // Generate 8 weeks of reports for active projects
    const activeProjects = [
      { pKey: 'roboarm', memberKeys: ['leader1', 'member1', 'member2', 'member3'] },
      { pKey: 'aivision', memberKeys: ['leader2', 'member2', 'member4'] },
    ];

    const now = new Date();
    const currentWeek = isoWeek(now);
    const currentYear = now.getFullYear();

    for (const { pKey, memberKeys } of activeProjects) {
      const project = projects[pKey];
      if (!project) continue;

      for (let wOffset = 7; wOffset >= 1; wOffset--) {
        const reportDate = weeksAgo(wOffset);
        const wNum = isoWeek(reportDate);
        const wYear = reportDate.getFullYear();
        const due = weekSunday(reportDate);
        const isCurrentWeek = wNum === currentWeek && wYear === currentYear;

        for (const mKey of memberKeys) {
          const user = users[mKey];
          if (!user) continue;

          const existing = await WeeklyReport.findOne({
            where: {
              project_id: project.id,
              user_id: user.id,
              week_number: wNum,
              year: wYear,
            },
          });
          if (existing) continue;

          // Simulate some missing/late reports for realism
          // member3 misses every 4th week; member4 submits late every 3rd week
          const skip = (mKey === 'member3' && wOffset % 4 === 0);
          if (skip) continue; // missing

          const submitDate = new Date(due);
          let status;
          if (mKey === 'member4' && wOffset % 3 === 0) {
            // late: submit 2 days after due
            submitDate.setDate(due.getDate() + 2);
            status = REPORT_STATUS.LATE;
          } else {
            // on time: submit 1 day before due
            submitDate.setDate(due.getDate() - 1);
            status = isCurrentWeek ? REPORT_STATUS.SUBMITTED : REPORT_STATUS.SUBMITTED;
          }

          await WeeklyReport.create({
            project_id: project.id,
            user_id: user.id,
            week_number: wNum,
            year: wYear,
            content: `Báo cáo tuần ${wNum}/${wYear} của ${user.full_name}:\n- Hoàn thành các task được giao.\n- Gặp khó khăn về: cần hỗ trợ thêm.\n- Kế hoạch tuần tới: tiếp tục sprint hiện tại.`,
            status,
            submitted_at: submitDate,
            due_date: due.toISOString().slice(0, 10),
          });
        }
      }
    }
    logger.info('Seeded weekly reports');

    // ── 7. Verilog Problems & Test Cases ─────────────────────────────────
    const verilogProblemDefs = [
      {
        key: 'hello_verilog',
        name: 'Hello Verilog',
        description: 'Bài tập cơ bản nhất: gán đầu ra bằng đầu vào.\n\nViết một module Verilog nhận một tín hiệu đầu vào và gán trực tiếp cho đầu ra.',
        description_input: 'input wire in',
        description_output: 'output wire out',
        level: 'easy',
        tags: 'combinational,basic',
        template_code: 'module hello_verilog(\n    input wire in,\n    output wire out\n);\n    // Code here\nendmodule',
        testcases: [
          { name: 'Input 0', input: 'in=0', expected_output: 'out=0', grade: 5, order_index: 0 },
          { name: 'Input 1', input: 'in=1', expected_output: 'out=1', grade: 5, order_index: 1 },
        ],
      },
      {
        key: 'and_gate',
        name: 'AND Gate',
        description: 'Thiết kế cổng AND 2 đầu vào.\n\nModule nhận 2 tín hiệu đầu vào a, b và xuất kết quả phép AND ra đầu ra y.',
        description_input: 'input wire a, b',
        description_output: 'output wire y',
        level: 'easy',
        tags: 'combinational,gate',
        template_code: 'module and_gate(\n    input wire a,\n    input wire b,\n    output wire y\n);\n    // Code here\nendmodule',
        testcases: [
          { name: 'a=0,b=0', input: 'a=0,b=0', expected_output: 'y=0', grade: 5, order_index: 0 },
          { name: 'a=0,b=1', input: 'a=0,b=1', expected_output: 'y=0', grade: 5, order_index: 1 },
          { name: 'a=1,b=0', input: 'a=1,b=0', expected_output: 'y=0', grade: 5, order_index: 2 },
          { name: 'a=1,b=1', input: 'a=1,b=1', expected_output: 'y=1', grade: 5, order_index: 3 },
        ],
      },
      {
        key: 'adder_4bit',
        name: '4-bit Adder',
        description: 'Thiết kế bộ cộng 4-bit.\n\nModule nhận hai số 4-bit a và b, xuất tổng sum (4-bit) và carry out cout.',
        description_input: 'input wire [3:0] a, b',
        description_output: 'output wire [3:0] sum\noutput wire cout',
        level: 'medium',
        tags: 'combinational,arithmetic',
        template_code: 'module adder_4bit(\n    input wire [3:0] a,\n    input wire [3:0] b,\n    output wire [3:0] sum,\n    output wire cout\n);\n    // Code here\nendmodule',
        testcases: [
          { name: '0+0', input: 'a=0000,b=0000', expected_output: 'sum=0000,cout=0', grade: 5, order_index: 0 },
          { name: '3+4', input: 'a=0011,b=0100', expected_output: 'sum=0111,cout=0', grade: 5, order_index: 1 },
          { name: '15+1', input: 'a=1111,b=0001', expected_output: 'sum=0000,cout=1', grade: 10, order_index: 2 },
          { name: '7+8', input: 'a=0111,b=1000', expected_output: 'sum=1111,cout=0', grade: 10, order_index: 3 },
        ],
      },
      {
        key: 'dff',
        name: 'D Flip-Flop',
        description: 'Thiết kế D Flip-Flop cơ bản với clock và reset.\n\nModule lưu giá trị đầu vào D vào thanh ghi khi có cạnh lên clock. Reset đồng bộ đưa đầu ra Q về 0.',
        description_input: 'input wire clk, rst, d',
        description_output: 'output reg q',
        level: 'medium',
        tags: 'sequential,flip-flop',
        template_code: 'module dff(\n    input wire clk,\n    input wire rst,\n    input wire d,\n    output reg q\n);\n    // Code here\nendmodule',
        testcases: [
          { name: 'Reset', input: 'clk=1,rst=1,d=1', expected_output: 'q=0', grade: 10, order_index: 0 },
          { name: 'Load 1', input: 'clk=1,rst=0,d=1', expected_output: 'q=1', grade: 10, order_index: 1 },
          { name: 'Load 0', input: 'clk=1,rst=0,d=0', expected_output: 'q=0', grade: 10, order_index: 2 },
        ],
      },
      {
        key: 'fsm_traffic',
        name: 'FSM Traffic Light',
        description: 'Thiết kế bộ điều khiển đèn giao thông bằng máy trạng thái hữu hạn (FSM).\n\nModule có 3 trạng thái: GREEN (00), YELLOW (01), RED (10). Chuyển trạng thái theo chu kỳ clock.',
        description_input: 'input wire clk, rst',
        description_output: 'output reg [1:0] light',
        level: 'hard',
        tags: 'sequential,fsm',
        template_code: 'module fsm_traffic_light(\n    input wire clk,\n    input wire rst,\n    output reg [1:0] light\n);\n    // States: GREEN=00, YELLOW=01, RED=10\n    // Code here\nendmodule',
        testcases: [
          { name: 'Reset to GREEN', input: 'clk=1,rst=1', expected_output: 'light=00', grade: 10, order_index: 0 },
          { name: 'GREEN->YELLOW', input: 'clk=1,rst=0', expected_output: 'light=01', grade: 15, order_index: 1 },
          { name: 'YELLOW->RED', input: 'clk=1,rst=0', expected_output: 'light=10', grade: 15, order_index: 2 },
        ],
      },
    ];

    for (const def of verilogProblemDefs) {
      const exists = await VerilogProblem.findOne({ where: { name: def.name } });
      if (exists) {
        logger.info(`Verilog problem "${def.name}" already exists — skipping`);
        continue;
      }
      const problem = await VerilogProblem.create({
        name: def.name,
        description: def.description,
        description_input: def.description_input,
        description_output: def.description_output,
        level: def.level,
        tags: def.tags,
        template_code: def.template_code,
        testbench_type: 'auto_generated',
        owner_id: users.truong_lab.id,
        is_published: true,
      });
      for (const tc of def.testcases) {
        await VerilogTestCase.create({
          problem_id: problem.id,
          name: tc.name,
          type: 'SIM',
          grade: tc.grade,
          input: tc.input,
          expected_output: tc.expected_output,
          time_limit: 60,
          mem_limit: 128,
          order_index: tc.order_index,
        });
      }
      logger.info(`Created verilog problem: ${def.name} with ${def.testcases.length} test cases`);
    }
    logger.info('Seeded verilog problems');

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
