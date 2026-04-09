import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));

const ResearchStaffLayout = lazy(() => import('../layouts/ResearchStaffLayout'));
const ProjectOwnerLayout = lazy(() => import('../layouts/ProjectOwnerLayout'));
const CouncilMemberLayout = lazy(() => import('../layouts/CouncilMemberLayout'));
const AccountingLayout = lazy(() => import('../layouts/AccountingLayout'));
const ArchiveLayout = lazy(() => import('../layouts/ArchiveLayout'));
const ReportLayout = lazy(() => import('../layouts/ReportLayout'));
const SuperAdminLayout = lazy(() => import('../layouts/SuperAdminLayout'));

const ResearchStaffDashboard = lazy(() => import('../pages/research_staff/DashboardPage'));
const ContractManagementPage = lazy(() => import('../pages/research_staff/ContractManagementPage'));
const CouncilCreationPage = lazy(() => import('../pages/research_staff/CouncilCreationPage'));
const TemplateManagementPage = lazy(() => import('../pages/research_staff/TemplateManagementPage'));
const SettlementTrackingPage = lazy(() => import('../pages/research_staff/SettlementTrackingPage'));
const SettlementDetailPage = lazy(() => import('../pages/research_staff/SettlementDetailPage'));
const ExtensionManagementPage = lazy(() => import('../pages/research_staff/ExtensionManagementPage'));

const ProjectOwnerDashboard = lazy(() => import('../pages/project_owner/DashboardPage'));
const ContractViewPage = lazy(() => import('../pages/project_owner/ContractViewPage'));
const MidtermReportPage = lazy(() => import('../pages/project_owner/MidtermReportPage'));
const ResearchSubmissionPage = lazy(() => import('../pages/project_owner/ResearchSubmissionPage'));
const AcceptanceMinutesPage = lazy(() => import('../pages/project_owner/AcceptanceMinutesPage'));
const SettlementPage = lazy(() => import('../pages/project_owner/SettlementPage'));

const CouncilMemberDashboard = lazy(() => import('../pages/council_member/DashboardPage'));
const ChairmanPage = lazy(() => import('../pages/council_member/ChairmanPage'));
const ReviewerPage = lazy(() => import('../pages/council_member/ReviewerPage'));
const SecretaryPage = lazy(() => import('../pages/council_member/SecretaryPage'));
const MemberPage = lazy(() => import('../pages/council_member/MemberPage'));

const AccountingDashboard = lazy(() => import('../pages/accounting/DashboardPage'));
const DocumentListPage = lazy(() => import('../pages/accounting/DocumentListPage'));
const DocumentManagementPage = lazy(() => import('../pages/accounting/DocumentManagementPage'));
const LiquidationConfirmationPage = lazy(() => import('../pages/accounting/LiquidationConfirmationPage'));

const ArchiveDashboard = lazy(() => import('../pages/archive/DashboardPage'));
const RepositoryPage = lazy(() => import('../pages/archive/RepositoryPage'));

const ReportsDashboard = lazy(() => import('../pages/reports/DashboardPage'));
const TopicStatisticsPage = lazy(() => import('../pages/reports/TopicStatisticsPage'));
const ContractStatisticsPage = lazy(() => import('../pages/reports/ContractStatisticsPage'));
const ProgressStatisticsPage = lazy(() => import('../pages/reports/ProgressStatisticsPage'));
const ExportReportsPage = lazy(() => import('../pages/reports/ExportReportsPage'));

const SuperAdminDashboard = lazy(() => import('../pages/superadmin/DashboardPage'));
const AccountManagementPage = lazy(() => import('../pages/superadmin/AccountManagementPage'));
const CategoryManagementPage = lazy(() => import('../pages/superadmin/CategoryManagementPage'));
const SystemConfigPage = lazy(() => import('../pages/superadmin/SystemConfigPage'));
const AuditLogPage = lazy(() => import('../pages/superadmin/AuditLogPage'));

const AnimatedRouteContainer: React.FC = () => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="animate-fade-up">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-primary-100 border-t-primary animate-spin mx-auto" />
              <p className="mt-4 text-sm font-semibold text-primary-700">Đang tải trang...</p>
            </div>
          </div>
        }
      >
      <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ──── Research Staff ──── */}
      <Route
        path="/research-staff"
        element={
          <ProtectedRoute allowedRole="research_staff">
            <ResearchStaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ResearchStaffDashboard />} />
        <Route path="contract-management" element={<ContractManagementPage />} />
        <Route path="council-creation" element={<CouncilCreationPage />} />
        <Route path="template-management" element={<TemplateManagementPage />} />
        <Route path="settlement-tracking" element={<SettlementTrackingPage />} />
        <Route path="settlement/:id" element={<SettlementDetailPage />} />
        <Route path="extension-management" element={<ExtensionManagementPage />} />
      </Route>

      {/* ──── Project Owner ──── */}
      <Route
        path="/project-owner"
        element={
          <ProtectedRoute allowedRole="project_owner">
            <ProjectOwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ProjectOwnerDashboard />} />
        <Route path="contract-view" element={<ContractViewPage />} />
        <Route path="midterm-report" element={<MidtermReportPage />} />
        <Route path="research-submission" element={<ResearchSubmissionPage />} />
        <Route path="acceptance-minutes" element={<AcceptanceMinutesPage />} />
        <Route path="settlement" element={<SettlementPage />} />
      </Route>

      {/* ──── Council Member ──── */}
      <Route
        path="/council-member"
        element={
          <ProtectedRoute allowedRole="council_member">
            <CouncilMemberLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CouncilMemberDashboard />} />
        <Route path="chairman" element={<ChairmanPage />} />
        <Route path="reviewer" element={<ReviewerPage />} />
        <Route path="secretary" element={<SecretaryPage />} />
        <Route path="member" element={<MemberPage />} />
      </Route>

      {/* ──── Accounting ──── */}
      <Route
        path="/accounting"
        element={
          <ProtectedRoute allowedRole="accounting">
            <AccountingLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AccountingDashboard />} />
        <Route path="document-list" element={<DocumentListPage />} />
        <Route path="document-management" element={<DocumentManagementPage />} />
        <Route path="liquidation-confirmation" element={<LiquidationConfirmationPage />} />
      </Route>

      {/* ──── Archive ──── */}
      <Route
        path="/archive"
        element={
          <ProtectedRoute allowedRole="archive_staff">
            <ArchiveLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ArchiveDashboard />} />
        <Route path="repository" element={<RepositoryPage />} />
      </Route>

      {/* ──── Reports ──── */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRole="report_viewer">
            <ReportLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ReportsDashboard />} />
        <Route path="topic-statistics" element={<TopicStatisticsPage />} />
        <Route path="contract-statistics" element={<ContractStatisticsPage />} />
        <Route path="progress-statistics" element={<ProgressStatisticsPage />} />
        <Route path="export" element={<ExportReportsPage />} />
      </Route>

      {/* ──── SuperAdmin ──── */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute allowedRole="superadmin">
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="account-management" element={<AccountManagementPage />} />
        <Route path="category-management" element={<CategoryManagementPage />} />
        <Route path="system-config" element={<SystemConfigPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </div>
  );
};

const AppRouter: React.FC = () => (
  <BrowserRouter>
    <AnimatedRouteContainer />
  </BrowserRouter>
);

export default AppRouter;
