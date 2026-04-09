// Type definitions for NCKH Research Management System

export type UserRole =
  | 'research_staff'
  | 'project_owner'
  | 'council_member'
  | 'accounting'
  | 'archive_staff'
  | 'report_viewer'
  | 'superadmin';

export type CouncilRole = 'chairman' | 'reviewer' | 'secretary' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  councilRole?: CouncilRole;
  mustChangePassword?: boolean;
  title?: string;
  department?: string;
  avatar?: string;
}

export interface Project {
  id: string;
  code: string;
  title: string;
  owner: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerTitle?: string;
  department: string;
  startDate: string;
  endDate: string;
  status: 'dang_thuc_hien' | 'tre_han' | 'cho_nghiem_thu' | 'da_nghiem_thu' | 'da_thanh_ly' | 'huy_bo';
  budget: number;
  advancedAmount: number;
  field: string;
  durationMonths: number;
}

export interface Contract {
  id: string;
  code: string;
  projectId?: string;
  projectCode: string;
  projectTitle: string;
  owner: string;
  ownerTitle?: string;
  ownerEmail?: string;
  signedDate?: string;
  status: 'cho_duyet' | 'da_ky' | 'hoan_thanh' | 'huy';
  budget: number;
  agencyName?: string;
  representative?: string;
  pdfUrl?: string;
  notes?: string;
}

export interface CouncilMember {
  id?: string;
  name: string;
  title?: string;
  hocHamHocVi?: string;
  institution?: string;
  email: string;
  role: 'chu_tich' | 'phan_bien_1' | 'phan_bien_2' | 'thu_ky' | 'uy_vien';
  hasConflict?: boolean;
  phone?: string;
  affiliation?: string;
}

export interface CouncilProjectReport {
  id: string;
  type: 'midterm' | 'final';
  fileUrl?: string;
  submittedAt?: string;
}

export interface Council {
  id: string;
  projectId?: string;
  decisionCode: string;
  projectCode: string;
  projectTitle: string;
  createdDate: string;
  status: 'cho_danh_gia' | 'dang_danh_gia' | 'da_hoan_thanh';
  members: CouncilMember[];
  decisionPdfUrl?: string;
  minutesFileUrl?: string;
  projectReports?: CouncilProjectReport[];
}

export interface Template {
  id: string;
  name: string;
  version: string;
  role: string;
  updatedDate: string;
  effectiveDate: string;
  size: string;
  category: string;
  is_default?: boolean;
}

export interface Settlement {
  id: string;
  code: string;
  content: string;
  amount: number;
  status: 'cho_bo_sung' | 'hop_le' | 'da_xac_nhan' | 'hoa_don_vat';
  projectTitle: string;
}

export interface Extension {
  id: string;
  projectCode: string;
  projectOwner: string;
  reason: string;
  proposedDate: string;
  extensionDays: number;
  extensionCount: number;
  boardStatus: 'da_phe_duyet' | 'dang_cho' | 'tu_choi';
}

export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'request';
  message: string;
  time: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  councilRole?: CouncilRole;
}
