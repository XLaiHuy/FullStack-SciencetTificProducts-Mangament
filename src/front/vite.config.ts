import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          // App chunks by role/module for better long-term caching
          if (normalizedId.includes('/src/pages/auth/') || normalizedId.includes('/src/hooks/useAuth') || normalizedId.includes('/src/router/')) {
            return 'app-auth';
          }

          if (normalizedId.includes('/src/pages/research_staff/') || normalizedId.includes('/src/layouts/ResearchStaffLayout')) {
            return 'app-research-staff';
          }

          if (normalizedId.includes('/src/pages/project_owner/') || normalizedId.includes('/src/layouts/ProjectOwnerLayout')) {
            return 'app-project-owner';
          }

          if (normalizedId.includes('/src/pages/council_member/') || normalizedId.includes('/src/layouts/CouncilMemberLayout')) {
            return 'app-council-member';
          }

          if (normalizedId.includes('/src/pages/accounting/') || normalizedId.includes('/src/layouts/AccountingLayout')) {
            return 'app-accounting';
          }

          if (normalizedId.includes('/src/pages/archive/') || normalizedId.includes('/src/layouts/ArchiveLayout')) {
            return 'app-archive';
          }

          if (normalizedId.includes('/src/pages/reports/') || normalizedId.includes('/src/layouts/ReportLayout')) {
            return 'app-reports';
          }

          if (normalizedId.includes('/src/pages/superadmin/') || normalizedId.includes('/src/layouts/SuperAdminLayout')) {
            return 'app-superadmin';
          }

          if (!normalizedId.includes('node_modules')) return;
          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('react-router-dom') || id.includes('@remix-run')) return 'vendor-router';
          if (id.includes('axios')) return 'vendor-axios';
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-charts';
          return 'vendor-misc';
        },
      },
    },
  },
})
