/**
 * prisma/seed.ts
 * Seed database with initial data mirrored from frontend mockData.ts
 * Run: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.councilReview.deleteMany();
  await prisma.councilMinutes.deleteMany();
  await prisma.councilMembership.deleteMany();
  await prisma.council.deleteMany();
  await prisma.settlementAudit.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.extension.deleteMany();
  await prisma.projectReport.deleteMany();
  await prisma.archiveRecord.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.template.deleteMany();
  await prisma.category.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('123456', 12);

  // ─── Users (mapping from mockData) ─────────────────────────────────────────
  console.log('  Creating users...');
  const [staff, owner, councilUser, accounting, archive, reports, admin,
         chairman, reviewer, secretary, member] = await Promise.all([
    prisma.user.create({ data: { name: 'Nguyễn Thị A',       email: 'staff@nckh.edu.vn',    passwordHash: hash, role: 'research_staff',  title: 'ThS.',    department: 'Phòng NCKH' } }),
    prisma.user.create({ data: { name: 'PGS.TS. Trần Văn B',  email: 'owner@nckh.edu.vn',    passwordHash: hash, role: 'project_owner',   title: 'PGS.TS.', department: 'Khoa Công nghệ Thông tin' } }),
    prisma.user.create({ data: { name: 'GS.TS. Nguyễn Văn C', email: 'council@nckh.edu.vn',  passwordHash: hash, role: 'council_member',  councilRole: 'chairman', title: 'GS.TS.', department: 'Đại học Bách Khoa' } }),
    prisma.user.create({ data: { name: 'Lê Minh Tuấn',         email: 'accounting@nckh.edu.vn', passwordHash: hash, role: 'accounting',   title: '',        department: 'Phòng Kế toán' } }),
    prisma.user.create({ data: { name: 'Nguyễn Thị Lan',       email: 'archive@nckh.edu.vn',  passwordHash: hash, role: 'archive_staff',  title: '',        department: 'Trung tâm Lưu trữ' } }),
    prisma.user.create({ data: { name: 'Nguyễn Văn Quản Trị', email: 'reports@nckh.edu.vn',  passwordHash: hash, role: 'report_viewer',  title: '',        department: 'Ban Giám hiệu' } }),
    prisma.user.create({ data: { name: 'Superadmin',            email: 'admin@nckh.edu.vn',    passwordHash: hash, role: 'superadmin',     title: '',        department: 'Quản trị Hệ thống' } }),
    prisma.user.create({ data: { name: 'GS.TS. Hoàng Văn E',   email: 'chairman@demo.com',    passwordHash: hash, role: 'council_member', councilRole: 'chairman',  title: 'GS.TS.', department: 'ĐH Quốc gia HN' } }),
    prisma.user.create({ data: { name: 'PGS.TS. Lê Quang C',   email: 'reviewer@demo.com',    passwordHash: hash, role: 'council_member', councilRole: 'reviewer',  title: 'PGS.TS.', department: 'ĐH Bách Khoa TP.HCM' } }),
    prisma.user.create({ data: { name: 'TS. Phạm Thị D',       email: 'secretary@demo.com',   passwordHash: hash, role: 'council_member', councilRole: 'secretary', title: 'TS.',     department: 'Viện CNTT' } }),
    prisma.user.create({ data: { name: 'ThS. Nguyễn Minh E',   email: 'member@demo.com',      passwordHash: hash, role: 'council_member', councilRole: 'member',    title: 'ThS.',    department: 'Khoa Khoa học Tự nhiên' } }),
  ]);

  // ─── Projects ───────────────────────────────────────────────────────────────
  console.log('  Creating projects...');
  const projects = await Promise.all([
    prisma.project.create({ data: {
      code: 'DT-2024-001', title: 'Ứng dụng AI trong chẩn đoán hình ảnh y khoa tại các bệnh viện tuyến tỉnh',
      ownerId: owner.id, ownerTitle: 'GS.TS.', department: 'Khoa Y', field: 'Công nghệ Thông tin',
      startDate: new Date('2024-01-12'), endDate: new Date('2025-12-15'),
      durationMonths: 24, budget: 500000000, advancedAmount: 200000000, status: 'dang_thuc_hien',
    }}),
    prisma.project.create({ data: {
      code: 'DT-2024-002', title: 'Nghiên cứu vật liệu mới cho pin năng lượng mặt trời hiệu suất cao',
      ownerId: owner.id, ownerTitle: 'PGS.TS.', department: 'Khoa Vật lý', field: 'Kỹ thuật & Công nghệ',
      startDate: new Date('2024-03-01'), endDate: new Date('2025-08-31'),
      durationMonths: 18, budget: 350000000, advancedAmount: 140000000, status: 'dang_thuc_hien',
    }}),
    prisma.project.create({ data: {
      code: 'NT-102', title: 'Hệ sinh thái biển Việt Nam và biến đổi khí hậu',
      ownerId: owner.id, ownerTitle: 'TS.', department: 'Khoa Môi trường', field: 'Nông nghiệp & Sinh học',
      startDate: new Date('2023-06-01'), endDate: new Date('2024-05-31'),
      durationMonths: 12, budget: 280000000, advancedAmount: 112000000, status: 'cho_nghiem_thu',
    }}),
    prisma.project.create({ data: {
      code: 'NT-105', title: 'Tự động hóa hệ thống sản xuất chip bán dẫn',
      ownerId: owner.id, ownerTitle: 'PGS.TS.', department: 'Khoa Điện tử', field: 'Kỹ thuật & Công nghệ',
      startDate: new Date('2023-08-01'), endDate: new Date('2024-07-31'),
      durationMonths: 12, budget: 420000000, advancedAmount: 168000000, status: 'cho_nghiem_thu',
    }}),
    prisma.project.create({ data: {
      code: 'AI-2023-V1', title: 'Nghiên cứu AI trong Y tế dự phòng',
      ownerId: owner.id, ownerTitle: 'TS.', department: 'Khoa Y Tế Công Cộng', field: 'Y Dược',
      startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31'),
      durationMonths: 12, budget: 200000000, advancedAmount: 80000000, status: 'tre_han',
    }}),
    prisma.project.create({ data: {
      code: 'VL-2023-B2', title: 'Quyết toán Vật liệu Nano trong xử lý nước',
      ownerId: owner.id, ownerTitle: 'GS.', department: 'Khoa Hóa học', field: 'Khoa học Tự nhiên',
      startDate: new Date('2023-02-01'), endDate: new Date('2023-11-30'),
      durationMonths: 10, budget: 320000000, advancedAmount: 320000000, status: 'da_nghiem_thu',
    }}),
  ]);

  const [p1, p2, p3, p4, p5, p6] = projects;

  // ─── Project Members ────────────────────────────────────────────────────────
  console.log('  Creating project members...');
  await Promise.all([
    prisma.projectMember.create({ data: { projectId: p3.id, userId: member.id, role: 'thanh_vien_chinh' } }),
    prisma.projectMember.create({ data: { projectId: p4.id, userId: secretary.id, role: 'thu_ky_de_tai' } }),
  ]);

  // ─── Contracts ──────────────────────────────────────────────────────────────
  console.log('  Creating contracts...');
  await Promise.all([
    prisma.contract.create({ data: { code: 'HĐ/2024/001', projectId: p1.id, budget: 500000000, signedDate: new Date('2024-01-20'), status: 'da_ky' } }),
    prisma.contract.create({ data: { code: 'HĐ/2024/005', projectId: p2.id, budget: 350000000, status: 'cho_duyet' } }),
    prisma.contract.create({ data: { code: 'HĐ/2023/089', projectId: p3.id, budget: 280000000, signedDate: new Date('2023-06-15'), status: 'da_ky' } }),
    prisma.contract.create({ data: { code: 'HĐ/2023/112', projectId: p6.id, budget: 320000000, signedDate: new Date('2023-02-10'), status: 'hoan_thanh' } }),
    prisma.contract.create({ data: { code: 'HĐ/2024/018', projectId: p4.id, budget: 420000000, status: 'cho_duyet' } }),
  ]);

  // ─── Councils ───────────────────────────────────────────────────────────────
  console.log('  Creating councils...');
  const council1 = await prisma.council.create({
    data: {
      decisionCode: 'QĐ/2023/156',
      projectId:    p3.id,
      createdDate:  new Date('2023-11-10'),
      status:       'cho_danh_gia',
      members: {
        create: [
          { userId: chairman.id, name: chairman.name, title: 'GS.TS.', institution: 'ĐH Quốc gia HN', email: chairman.email, role: 'chu_tich' },
          { userId: reviewer.id, name: reviewer.name, title: 'PGS.TS.', institution: 'ĐH Bách Khoa', email: reviewer.email, role: 'phan_bien_1', hasConflict: true },
          { userId: member.id,   name: member.name,   title: 'ThS.',    institution: 'Viện CNTT',     email: member.email,   role: 'uy_vien' },
        ],
      },
    },
  });

  await prisma.council.create({
    data: {
      decisionCode: 'QĐ/2023/142',
      projectId:    p4.id,
      createdDate:  new Date('2023-11-05'),
      status:       'da_hoan_thanh',
      members: { create: [
        { userId: chairman.id, name: chairman.name, title: 'GS.TS.', institution: 'ĐH KHTN', email: chairman.email, role: 'chu_tich' },
      ]},
    },
  });

  // ─── Settlements ────────────────────────────────────────────────────────────
  console.log('  Creating settlements...');
  await prisma.settlement.create({
    data: {
      code: 'QT-2024-0001', projectId: p1.id,
      content: 'Quyết toán mua vật tư đợt 1', totalAmount: 200000000,
      submittedBy: owner.name, status: 'cho_bo_sung',
      budgetItems: {
        create: [
          { category: 'Thuê khoán chuyên gia', planned: 50000000, spent: 20000000, evidenceFile: 'HĐ_chuyengia.pdf', status: 'khop' },
          { category: 'Vật tư, văn phòng phẩm', planned: 10000000, spent: 12000000, evidenceFile: 'HD_vattu.pdf', status: 'vuot_muc' },
          { category: 'Hội nghị, hội thảo', planned: 15000000, spent: 0, status: 'chua_nop' },
          { category: 'In ấn, tài liệu', planned: 5000000, spent: 4500000, evidenceFile: 'HD_inan.pdf', status: 'khop' },
        ],
      },
      auditLog: {
        create: [
          { content: 'Hồ sơ tiếp nhận lần đầu, chờ thẩm định chứng từ.', author: archive.name },
          { content: 'Phát hiện hạng mục "Vật tư" vượt dự toán 2.000.000 VNĐ. Yêu cầu bổ sung giải trình.', author: staff.name },
        ],
      },
    },
  });

  // ─── Extensions ─────────────────────────────────────────────────────────────
  console.log('  Creating extensions...');
  await Promise.all([
    prisma.extension.create({ data: { projectId: p5.id, reason: 'Cần thêm thời gian chạy mô hình AI và kiểm thử bộ dữ liệu lớn.', proposedDate: new Date('2024-01-05'), extensionDays: 10, extensionCount: 1, boardStatus: 'dang_cho' } }),
    prisma.extension.create({ data: { projectId: p1.id, reason: 'Thiếu mẫu khảo sát từ các đơn vị thực địa do điều kiện thời tiết.', proposedDate: new Date('2023-11-30'), extensionDays: 15, extensionCount: 1, boardStatus: 'da_phe_duyet', decidedBy: staff.name, decidedAt: new Date('2023-12-05') } }),
  ]);

  // ─── Templates ──────────────────────────────────────────────────────────────
  console.log('  Creating templates...');
  await Promise.all([
    prisma.template.create({ data: { name: 'BM01-CT: Biên bản họp Hội đồng', version: 'v2024.1.2', role: 'Chủ tịch Hội đồng', category: 'chu_tich',  fileUrl: '/uploads/templates/BM01-CT.docx', size: '156 KB', effectiveDate: new Date('2024-01-01') } }),
    prisma.template.create({ data: { name: 'BM02-CT: Quyết định phê duyệt',  version: 'v2023.1.0', role: 'Chủ tịch Hội đồng', category: 'chu_tich',  fileUrl: '/uploads/templates/BM02-CT.docx', size: '210 KB', effectiveDate: new Date('2024-01-01') } }),
    prisma.template.create({ data: { name: 'BM03-PB: Phiếu nhận xét phản biện', version: 'v2024.1.0', role: 'Người phản biện', category: 'phan_bien', fileUrl: '/uploads/templates/BM03-PB.docx', size: '98 KB',  effectiveDate: new Date('2024-01-01') } }),
    prisma.template.create({ data: { name: 'BM04-TK: Biên bản nghiệm thu',   version: 'v2023.2.1', role: 'Thư ký',           category: 'thu_ky',    fileUrl: '/uploads/templates/BM04-TK.docx', size: '320 KB', effectiveDate: new Date('2024-02-15') } }),
    prisma.template.create({ data: { name: 'BM05-UV: Phiếu chấm điểm',       version: 'v2024.1.0', role: 'Ủy viên',          category: 'uy_vien',   fileUrl: '/uploads/templates/BM05-UV.docx', size: '75 KB',  effectiveDate: new Date('2024-01-01') } }),
  ]);

  // ─── Categories ─────────────────────────────────────────────────────────────
  console.log('  Creating categories...');
  const fields = ['Công nghệ Thông tin', 'Kỹ thuật & Công nghệ', 'Y Dược', 'Khoa học Tự nhiên', 'Nông nghiệp & Sinh học', 'Kinh tế', 'Khoa học Xã hội & Nhân văn'];
  await Promise.all(
    fields.map((f, i) => prisma.category.create({ data: { type: 'field', value: f, label: f, sortOrder: i } }))
  );

  // ─── System Config ───────────────────────────────────────────────────────────
  console.log('  Creating system config...');
  await Promise.all([
    prisma.systemConfig.create({ data: { key: 'MAX_EXTENSION_DAYS', value: '90', label: 'Số ngày gia hạn tối đa' } }),
    prisma.systemConfig.create({ data: { key: 'MAX_EXTENSION_COUNT', value: '2', label: 'Số lần gia hạn tối đa' } }),
    prisma.systemConfig.create({ data: { key: 'COUNCIL_MIN_MEMBERS', value: '3', label: 'Số thành viên Hội đồng tối thiểu' } }),
    prisma.systemConfig.create({ data: { key: 'UNIVERSITY_NAME', value: 'Đại học XYZ', label: 'Tên trường' } }),
    prisma.systemConfig.create({ data: { key: 'ACADEMIC_YEAR', value: '2024-2025', label: 'Năm học hiện tại' } }),
  ]);

  // ─── Notifications ────────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: staff.id, type: 'warning', message: 'Cảnh báo: Đề tài [AI-2023-V1] đã trễ hạn nộp báo cáo.' },
      { userId: staff.id, type: 'request', message: 'Yêu cầu xử lý: Chủ nhiệm Trần Thị B đã nộp đề nghị tạm ứng.' },
      { userId: staff.id, type: 'info',    message: 'Thành viên Lê Quang C đã từ chối tham gia Hội đồng nghiệm thu.', isRead: true },
    ],
  });

  // ─── Audit Logs ───────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id,   userName: admin.name,   action: 'Cấu hình hệ thống',   module: 'System Config' },
      { userId: admin.id,   userName: admin.name,   action: 'Khóa tài khoản',        module: 'Account Management' },
      { userId: staff.id,   userName: staff.name,   action: 'Đăng nhập',             module: 'Auth' },
      { userId: staff.id,   userName: staff.name,   action: 'Tạo hợp đồng HĐ/2024/001', module: 'Contracts' },
      { userId: accounting.id, userName: accounting.name, action: 'Xác nhận thanh lý', module: 'Accounting' },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('\nDemo accounts (password: 123456):');
  console.log('  staff@nckh.edu.vn      → research_staff');
  console.log('  owner@nckh.edu.vn      → project_owner');
  console.log('  accounting@nckh.edu.vn → accounting');
  console.log('  archive@nckh.edu.vn    → archive_staff');
  console.log('  reports@nckh.edu.vn    → report_viewer');
  console.log('  admin@nckh.edu.vn      → superadmin');
  console.log('  chairman@demo.com      → council_member (chairman)');
  console.log('  reviewer@demo.com      → council_member (reviewer)');
  console.log('  secretary@demo.com     → council_member (secretary)');
  console.log('  member@demo.com        → council_member (member)');

  void [councilUser, council1, p5, reports]; // suppress unused warning
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
