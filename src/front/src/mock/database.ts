/**
 * Fake in-memory database for NCKH Research Management System.
 * Simulates back-end persistence across mock API calls within a session.
 * Each table is a mutable array so services can push/update/filter entries.
 */
import {
  mockUsers, mockProjects, mockContracts,
  mockCouncils, mockTemplates, mockSettlements,
  mockExtensions, mockAuditLogs, mockNotifications
} from './mockData';
import type {
  User, Project, Contract, Council, Template,
  Settlement, Extension, AuditLog, Notification
} from '../types';

// Deep-clone arrays so runtime mutations don't corrupt the original constants
const cloneArr = <T>(arr: T[]): T[] => arr.map(x => ({ ...x }));

export const db = {
  users:         cloneArr<User>(mockUsers),
  projects:      cloneArr<Project>(mockProjects),
  contracts:     cloneArr<Contract>(mockContracts),
  councils:      cloneArr<Council>(mockCouncils),
  templates:     cloneArr<Template>(mockTemplates),
  settlements:   cloneArr<Settlement>(mockSettlements),
  extensions:    cloneArr<Extension>(mockExtensions),
  auditLogs:     cloneArr<AuditLog>(mockAuditLogs),
  notifications: cloneArr<Notification>(mockNotifications),
};

// ---------- Convenience helpers ----------

/** Append to audit log */
export const logAction = (user: string, action: string, module: string) => {
  db.auditLogs.unshift({
    id: String(Date.now()),
    timestamp: new Date().toLocaleString('vi-VN'),
    user,
    action,
    module,
  });
};

/** Generate next sequential code using table length as the counter */
export const nextCode = (prefix: string, count: number): string =>
  `${prefix}${String(count + 1).padStart(3, '0')}`;
