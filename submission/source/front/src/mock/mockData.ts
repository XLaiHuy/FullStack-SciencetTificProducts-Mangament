import type {
  User, Project, Contract, Council, Template, Settlement, Extension, Notification, AuditLog
} from '../types';


// ============================================================
// USERS
// ============================================================
export const mockUsers: User[] = [
  { id: '1', name: 'Nguyễn Thị A', email: 'staff@nckh.edu.vn', role: 'research_staff', title: 'ThS.', department: 'Phòng NCKH' },
  { id: '2', name: 'PGS.TS. Trần Văn B', email: 'owner@nckh.edu.vn', role: 'project_owner', title: 'PGS.TS.', department: 'Khoa Công nghệ Thông tin' },
  { id: '3', name: 'GS.TS. Nguyễn Văn C', email: 'council@nckh.edu.vn', role: 'council_member', councilRole: 'chairman', title: 'GS.TS.', department: 'Đại học Bách Khoa' },
  { id: '4', name: 'Lê Minh Tuấn', email: 'accounting@nckh.edu.vn', role: 'accounting', title: '', department: 'Phòng Kế toán' },
  { id: '5', name: 'Nguyễn Thị Lan', email: 'archive@nckh.edu.vn', role: 'archive_staff', title: '', department: 'Trung tâm Lưu trữ' },
  { id: '6', name: 'Nguyễn Văn Quản Trị', email: 'reports@nckh.edu.vn', role: 'report_viewer', title: '', department: 'Ban Giám hiệu' },
  { id: '7', name: 'Superadmin', email: 'admin@nckh.edu.vn', role: 'superadmin', title: '', department: 'Quản trị Hệ thống' },
  // Council sub-role accounts
  { id: '8', name: 'GS.TS. Hoàng Văn E', email: 'chairman@demo.com', role: 'council_member', councilRole: 'chairman', title: 'GS.TS.', department: 'ĐH Quốc gia HN' },
  { id: '9', name: 'PGS.TS. Lê Quang C', email: 'reviewer@demo.com', role: 'council_member', councilRole: 'reviewer', title: 'PGS.TS.', department: 'ĐH Bách Khoa TP.HCM' },
  { id: '10', name: 'TS. Phạm Thị D', email: 'secretary@demo.com', role: 'council_member', councilRole: 'secretary', title: 'TS.', department: 'Viện CNTT' },
  { id: '11', name: 'ThS. Nguyễn Minh E', email: 'member@demo.com', role: 'council_member', councilRole: 'member', title: 'ThS.', department: 'Khoa Khoa học Tự nhiên' },
];

// ============================================================
// PROJECTS
// ============================================================
export const mockProjects: Project[] = [
  {
    id: '1', code: 'DT-2024-001',
    title: 'Ứng dụng AI trong chẩn đoán hình ảnh y khoa tại các bệnh viện tuyến tỉnh',
    owner: 'GS.TS. Nguyễn Văn A', ownerTitle: 'GS.TS.', department: 'Khoa Y',
    startDate: '2024-01-12', endDate: '2025-12-15', status: 'dang_thuc_hien',
    budget: 500000000, advancedAmount: 200000000, field: 'Công nghệ Thông tin', durationMonths: 24
  },
  {
    id: '2', code: 'DT-2024-002',
    title: 'Nghiên cứu vật liệu mới cho pin năng lượng mặt trời hiệu suất cao',
    owner: 'PGS.TS. Trần Thị B', ownerTitle: 'PGS.TS.', department: 'Khoa Vật lý',
    startDate: '2024-03-01', endDate: '2025-08-31', status: 'dang_thuc_hien',
    budget: 350000000, advancedAmount: 140000000, field: 'Kỹ thuật & Công nghệ', durationMonths: 18
  },
  {
    id: '3', code: 'NT-102',
    title: 'Hệ sinh thái biển Việt Nam và biến đổi khí hậu',
    owner: 'TS. Lê Văn C', ownerTitle: 'TS.', department: 'Khoa Môi trường',
    startDate: '2023-06-01', endDate: '2024-05-31', status: 'cho_nghiem_thu',
    budget: 280000000, advancedAmount: 112000000, field: 'Nông nghiệp & Sinh học', durationMonths: 12
  },
  {
    id: '4', code: 'NT-105',
    title: 'Tự động hóa hệ thống sản xuất chip bán dẫn',
    owner: 'PGS.TS. Nguyễn Minh D', ownerTitle: 'PGS.TS.', department: 'Khoa Điện tử',
    startDate: '2023-08-01', endDate: '2024-07-31', status: 'cho_nghiem_thu',
    budget: 420000000, advancedAmount: 168000000, field: 'Kỹ thuật & Công nghệ', durationMonths: 12
  },
  {
    id: '5', code: 'AI-2023-V1',
    title: 'Nghiên cứu AI trong Y tế dự phòng',
    owner: 'TS. Phạm Văn E', ownerTitle: 'TS.', department: 'Khoa Y Tế Công Cộng',
    startDate: '2023-01-01', endDate: '2023-12-31', status: 'tre_han',
    budget: 200000000, advancedAmount: 80000000, field: 'Y Dược', durationMonths: 12
  },
  {
    id: '6', code: 'VL-2023-B2',
    title: 'Quyết toán Vật liệu Nano trong xử lý nước',
    owner: 'GS. Hoàng Văn F', ownerTitle: 'GS.', department: 'Khoa Hóa học',
    startDate: '2023-02-01', endDate: '2023-11-30', status: 'da_nghiem_thu',
    budget: 320000000, advancedAmount: 320000000, field: 'Khoa học Tự nhiên', durationMonths: 10
  },
  {
    id: '7', code: 'DT-2023-556',
    title: 'Phát triển vật liệu nano bền vững từ phế thải nông nghiệp',
    owner: 'Trần Thị B', ownerTitle: 'PGS.TS.', department: 'Khoa Nông nghiệp',
    startDate: '2023-01-01', endDate: '2023-12-31', status: 'da_nghiem_thu',
    budget: 180000000, advancedAmount: 180000000, field: 'Nông nghiệp & Sinh học', durationMonths: 12
  },
  {
    id: '8', code: 'NCKH-2023-0142',
    title: 'Phân tích ứng dụng AI trong quản lý đô thị thông minh',
    owner: 'PGS.TS. Trần Văn B', ownerTitle: 'PGS.TS.', department: 'Khoa CNTT',
    startDate: '2023-01-12', endDate: '2024-12-15', status: 'dang_thuc_hien',
    budget: 450000000, advancedAmount: 180000000, field: 'Công nghệ Thông tin', durationMonths: 24
  },
];

// ============================================================
// CONTRACTS
// ============================================================
export const mockContracts: Contract[] = [
  { id: '1', code: 'HĐ/2024/001', projectCode: 'DT-2024-001', projectTitle: 'Ứng dụng AI trong chẩn đoán hình ảnh y khoa', owner: 'GS.TS. Nguyễn Văn A', signedDate: '2024-01-20', status: 'da_ky', budget: 500000000 },
  { id: '2', code: 'HĐ/2024/005', projectCode: 'DT-2024-002', projectTitle: 'Nghiên cứu vật liệu mới cho pin năng lượng mặt trời', owner: 'PGS.TS. Trần Thị B', status: 'cho_duyet', budget: 350000000 },
  { id: '3', code: 'HĐ/2023/089', projectCode: 'NT-102', projectTitle: 'Hệ sinh thái biển Việt Nam', owner: 'TS. Lê Văn C', signedDate: '2023-06-15', status: 'da_ky', budget: 280000000 },
  { id: '4', code: 'HĐ/2023/112', projectCode: 'VL-2023-B2', projectTitle: 'Quyết toán Vật liệu Nano', owner: 'GS. Hoàng Văn F', signedDate: '2023-02-10', status: 'hoan_thanh', budget: 320000000 },
  { id: '5', code: 'HĐ/2024/018', projectCode: 'NT-105', projectTitle: 'Tự động hóa sản xuất chip', owner: 'PGS.TS. Nguyễn Minh D', status: 'cho_duyet', budget: 420000000 },
];

// ============================================================
// COUNCILS
// ============================================================
export const mockCouncils: Council[] = [
  {
    id: '1', decisionCode: 'QĐ/2023/156', projectCode: 'NT-102',
    projectTitle: 'Nghiên cứu văn hóa dân gian vùng đồng bằng sông Hồng',
    createdDate: '10/11/2023', status: 'cho_danh_gia',
    members: [
      { id: '1', name: 'GS.TS. Hoàng Văn E', title: 'GS.TS.', institution: 'ĐH Quốc gia HN', email: 'hve@university.edu.vn', role: 'chu_tich' },
      { id: '2', name: 'PGS.TS. Lê Quang C', title: 'PGS.TS.', institution: 'ĐH Bách Khoa', email: 'lqc@bk.edu.vn', role: 'phan_bien_1', hasConflict: true },
      { id: '3', name: 'TS. Phạm Minh D', title: 'TS.', institution: 'Viện CNTT', email: 'pmd@cntt.edu.vn', role: 'uy_vien' },
    ]
  },
  {
    id: '2', decisionCode: 'QĐ/2023/142', projectCode: 'NT-105',
    projectTitle: 'Phát triển hệ thống quản lý logistics thông minh',
    createdDate: '05/11/2023', status: 'da_hoan_thanh',
    members: [
      { id: '4', name: 'GS.TS. Nguyễn Văn G', title: 'GS.TS.', institution: 'ĐH KHTN', email: 'nvg@khtn.edu.vn', role: 'chu_tich' },
    ]
  },
  {
    id: '3', decisionCode: 'QĐ/2023/138', projectCode: 'DT-2024-001',
    projectTitle: 'Đánh giá tác động của biến đổi khí hậu đến nông nghiệp miền Trung',
    createdDate: '28/10/2023', status: 'cho_danh_gia',
    members: []
  },
];

// ============================================================
// TEMPLATES
// ============================================================
export const mockTemplates: Template[] = [
  { id: '1', name: 'BM01-CT: Biên bản họp Hội đồng', version: 'v2024.1.2', role: 'Chủ tịch Hội đồng', updatedDate: '12/03/2024', effectiveDate: '01/01/2024', size: '156 KB', category: 'chu_tich' },
  { id: '2', name: 'BM02-CT: Quyết định phê duyệt', version: 'v2023.1.0', role: 'Chủ tịch Hội đồng', updatedDate: '05/01/2024', effectiveDate: '01/01/2024', size: '210 KB', category: 'chu_tich' },
  { id: '3', name: 'BM03-PB: Phiếu nhận xét phản biện', version: 'v2024.1.0', role: 'Người phản biện', updatedDate: '10/03/2024', effectiveDate: '01/01/2024', size: '98 KB', category: 'phan_bien' },
  { id: '4', name: 'BM04-TK: Biên bản nghiệm thu', version: 'v2023.2.1', role: 'Thư ký', updatedDate: '20/02/2024', effectiveDate: '15/02/2024', size: '320 KB', category: 'thu_ky' },
  { id: '5', name: 'BM05-UV: Phiếu chấm điểm', version: 'v2024.1.0', role: 'Ủy viên', updatedDate: '01/03/2024', effectiveDate: '01/01/2024', size: '75 KB', category: 'uy_vien' },
];

// ============================================================
// SETTLEMENTS
// ============================================================
export const mockSettlements: Settlement[] = [
  { id: '1', code: 'DA-2023-001', content: 'Dự án Phát triển Robot AI', amount: 450000000, status: 'cho_bo_sung', projectTitle: 'Dự án Phát triển Robot AI' },
  { id: '2', code: 'QT-2024-0012', content: 'Quyết toán mua vật tư đợt 1', amount: 200000000, status: 'hop_le', projectTitle: 'Nghiên cứu vật liệu Nano' },
  { id: '3', code: 'QT-2024-0008', content: 'Chi phí hội thảo quốc tế', amount: 85000000, status: 'da_xac_nhan', projectTitle: 'Hệ thống AI y tế' },
  { id: '4', code: 'QT-2024-0015', content: 'Mua thiết bị phòng thí nghiệm', amount: 320000000, status: 'hoa_don_vat', projectTitle: 'Vật liệu bán dẫn mới' },
];

// ============================================================
// EXTENSIONS
// ============================================================
export const mockExtensions: Extension[] = [
  { id: '1', projectCode: 'DT-2023-001', projectOwner: 'PGS.TS Nguyễn Văn A', reason: 'Thiếu mẫu khảo sát từ các đơn vị thực địa do điều kiện thời tiết.', proposedDate: '30/11/2023', extensionDays: 15, extensionCount: 1, boardStatus: 'da_phe_duyet' },
  { id: '2', projectCode: 'DT-2023-045', projectOwner: 'PGS.TS Trần Thị B', reason: 'Chậm trễ trong quá trình thu thập dữ liệu thứ cấp từ cơ quan đối tác.', proposedDate: '15/12/2023', extensionDays: 30, extensionCount: 2, boardStatus: 'da_phe_duyet' },
  { id: '3', projectCode: 'DT-2023-089', projectOwner: 'TS. Lê Văn C', reason: 'Cần thêm thời gian chạy mô hình AI và kiểm thử bộ dữ liệu lớn.', proposedDate: '05/01/2024', extensionDays: 10, extensionCount: 1, boardStatus: 'dang_cho' },
];

// ============================================================
// NOTIFICATIONS
// ============================================================
export const mockNotifications: Notification[] = [
  { id: '1', type: 'warning', message: 'Cảnh báo: Đề tài [AI-2023-V1] đã trễ hạn nộp báo cáo.', time: '2 phút trước', read: false },
  { id: '2', type: 'request', message: 'Yêu cầu xử lý: Chủ nhiệm Trần Thị B đã nộp đề nghị tạm ứng.', time: '45 phút trước', read: false },
  { id: '3', type: 'info', message: 'Thành viên Lê Quang C đã từ chối tham gia Hội đồng nghiệm thu.', time: '2 giờ trước', read: true },
];

// ============================================================
// AUDIT LOGS
// ============================================================
export const mockAuditLogs: AuditLog[] = [
  { id: '1', timestamp: '2023-11-20 14:30:15', user: 'Superadmin', action: 'Cấu hình hệ thống', module: 'System Config' },
  { id: '2', timestamp: '2023-11-20 11:20:05', user: 'Superadmin', action: 'Khóa tài khoản', module: 'Account Management' },
  { id: '3', timestamp: '2023-11-19 09:45:30', user: 'Admin NCKH', action: 'Đăng nhập', module: 'Auth' },
  { id: '4', timestamp: '2023-11-19 08:30:00', user: 'Nguyễn Thị A', action: 'Tạo hợp đồng', module: 'Contract Management' },
  { id: '5', timestamp: '2023-11-18 16:00:00', user: 'Lê Minh Tuấn', action: 'Xác nhận thanh lý', module: 'Accounting' },
];

// ============================================================
// DEMO CREDENTIALS
// ============================================================
export const demoCredentials = [
  { email: 'staff@nckh.edu.vn', password: '123456', label: 'Nhân viên Phòng NCKH', role: 'research_staff' },
  { email: 'owner@nckh.edu.vn', password: '123456', label: 'Chủ nhiệm đề tài', role: 'project_owner' },
  { email: 'accounting@nckh.edu.vn', password: '123456', label: 'Kế toán', role: 'accounting' },
  { email: 'archive@nckh.edu.vn', password: '123456', label: 'Lưu trữ', role: 'archive_staff' },
  { email: 'reports@nckh.edu.vn', password: '123456', label: 'Xem báo cáo', role: 'report_viewer' },
  { email: 'admin@nckh.edu.vn', password: '123456', label: 'Superadmin', role: 'superadmin' },
  // Council sub-roles
  { email: 'chairman@demo.com', password: '123456', label: 'Chủ tịch Hội đồng', role: 'council_member', councilRole: 'chairman' },
  { email: 'reviewer@demo.com', password: '123456', label: 'Phản biện', role: 'council_member', councilRole: 'reviewer' },
  { email: 'secretary@demo.com', password: '123456', label: 'Thư ký Hội đồng', role: 'council_member', councilRole: 'secretary' },
  { email: 'member@demo.com', password: '123456', label: 'Ủy viên Hội đồng', role: 'council_member', councilRole: 'member' },
];
