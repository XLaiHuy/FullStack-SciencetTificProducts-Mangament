import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import LoginPage from '../pages/auth/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import ResearchStaffLayout from '../layouts/ResearchStaffLayout';
import ProjectOwnerLayout from '../layouts/ProjectOwnerLayout';
import CouncilMemberLayout from '../layouts/CouncilMemberLayout';
import AccountingLayout from '../layouts/AccountingLayout';
import ArchiveLayout from '../layouts/ArchiveLayout';
import ReportLayout from '../layouts/ReportLayout';
import SuperAdminLayout from '../layouts/SuperAdminLayout';

// Research Staff Pages
import ResearchStaffDashboard from '../pages/research_staff/DashboardPage';
import ContractManagementPage from '../pages/research_staff/ContractManagementPage';
import CouncilCreationPage from '../pages/research_staff/CouncilCreationPage';
import TemplateManagementPage from '../pages/research_staff/TemplateManagementPage';
import SettlementTrackingPage from '../pages/research_staff/SettlementTrackingPage';
import SettlementDetailPage from '../pages/research_staff/SettlementDetailPage';
import ExtensionManagementPage from '../pages/research_staff/ExtensionManagementPage';

// Project Owner Pages
import ProjectOwnerDashboard from '../pages/project_owner/DashboardPage';
import ContractViewPage from '../pages/project_owner/ContractViewPage';
import MidtermReportPage from '../pages/project_owner/MidtermReportPage';
import ResearchSubmissionPage from '../pages/project_owner/ResearchSubmissionPage';
import AcceptanceMinutesPage from '../pages/project_owner/AcceptanceMinutesPage';
import SettlementPage from '../pages/project_owner/SettlementPage';

// Council Member Pages
import CouncilMemberDashboard from '../pages/council_member/DashboardPage';
import ChairmanPage from '../pages/council_member/ChairmanPage';
import ReviewerPage from '../pages/council_member/ReviewerPage';
import SecretaryPage from '../pages/council_member/SecretaryPage';
import MemberPage from '../pages/council_member/MemberPage';

// Accounting Pages
import AccountingDashboard from '../pages/accounting/DashboardPage';
import DocumentListPage from '../pages/accounting/DocumentListPage';
import DocumentManagementPage from '../pages/accounting/DocumentManagementPage';
import LiquidationConfirmationPage from '../pages/accounting/LiquidationConfirmationPage';

// Archive Pages
import ArchiveDashboard from '../pages/archive/DashboardPage';
import RepositoryPage from '../pages/archive/RepositoryPage';

// Reports Pages
import ReportsDashboard from '../pages/reports/DashboardPage';
import TopicStatisticsPage from '../pages/reports/TopicStatisticsPage';
import ContractStatisticsPage from '../pages/reports/ContractStatisticsPage';
import ProgressStatisticsPage from '../pages/reports/ProgressStatisticsPage';
import ExportReportsPage from '../pages/reports/ExportReportsPage';

// SuperAdmin Pages
import SuperAdminDashboard from '../pages/superadmin/DashboardPage';
import AccountManagementPage from '../pages/superadmin/AccountManagementPage';
import CategoryManagementPage from '../pages/superadmin/CategoryManagementPage';
import SystemConfigPage from '../pages/superadmin/SystemConfigPage';
import AuditLogPage from '../pages/superadmin/AuditLogPage';

const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

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
  </BrowserRouter>
);

export default AppRouter;
