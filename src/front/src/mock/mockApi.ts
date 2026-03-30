import { mockUsers } from './mockData';
import type { AuthResponse, Project, Contract, Council, Template, Settlement, Extension } from '../types';
import {
  mockProjects, mockContracts, mockCouncils, mockTemplates, mockSettlements, mockExtensions
} from './mockData';

const delay = (ms = 300) => new Promise(res => setTimeout(res, ms));

// ============================================================
// AUTH
// ============================================================
export const login = async (email: string, _password: string): Promise<AuthResponse> => {
  await delay(400);
  const user = mockUsers.find(u => u.email === email);
  if (!user) throw new Error('Email hoặc mật khẩu không đúng');
  return { user, token: `mock_token_${user.id}_${Date.now()}` };
};

// ============================================================
// PROJECTS
// ============================================================
export const getProjects = async (): Promise<Project[]> => {
  await delay();
  return mockProjects;
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
  await delay(150);
  return mockProjects.find(p => p.id === id || p.code === id);
};

// ============================================================
// CONTRACTS
// ============================================================
export const getContracts = async (): Promise<Contract[]> => {
  await delay();
  return mockContracts;
};

export const createContract = async (data: Partial<Contract>): Promise<Contract> => {
  await delay(500);
  const newContract: Contract = {
    id: String(Date.now()),
    code: `HĐ/2024/${String(mockContracts.length + 1).padStart(3, '0')}`,
    projectCode: data.projectCode || '',
    projectTitle: data.projectTitle || '',
    owner: data.owner || '',
    status: 'cho_duyet',
    budget: data.budget || 0,
  };
  return newContract;
};

// ============================================================
// COUNCILS
// ============================================================
export const getCouncils = async (): Promise<Council[]> => {
  await delay();
  return mockCouncils;
};

export const createCouncil = async (data: Partial<Council>): Promise<Council> => {
  await delay(500);
  const newCouncil: Council = {
    id: String(Date.now()),
    decisionCode: `QĐ/2024/${String(mockCouncils.length + 1).padStart(3, '0')}`,
    projectCode: data.projectCode || '',
    projectTitle: data.projectTitle || '',
    createdDate: new Date().toLocaleDateString('vi-VN'),
    status: 'cho_danh_gia',
    members: data.members || [],
  };
  return newCouncil;
};

// ============================================================
// TEMPLATES
// ============================================================
export const getTemplates = async (): Promise<Template[]> => {
  await delay();
  return mockTemplates;
};

// ============================================================
// SETTLEMENTS
// ============================================================
export const getSettlements = async (): Promise<Settlement[]> => {
  await delay();
  return mockSettlements;
};

export const confirmSettlement = async (id: string): Promise<void> => {
  await delay(400);
  console.log('Confirmed settlement:', id);
};

// ============================================================
// EXTENSIONS
// ============================================================
export const getExtensions = async (): Promise<Extension[]> => {
  await delay();
  return mockExtensions;
};

export const approveExtension = async (id: string): Promise<void> => {
  await delay(400);
  console.log('Approved extension:', id);
};

export const rejectExtension = async (id: string): Promise<void> => {
  await delay(400);
  console.log('Rejected extension:', id);
};

// ============================================================
// REPORTS/STATS
// ============================================================
export const getStats = async () => {
  await delay();
  return {
    totalProjects: 1248,
    activeProjects: 412,
    completedProjects: 786,
    pendingCouncil: 3,
    contractsTotal: 42,
    contractsActive: 28,
    contractsPending: 10,
    contractsCompleted: 4,
    totalBudget: 5420000000,
    disbursedBudget: 2150000000,
    overdueRecords: 3,
    documentErrors: 8,
  };
};

export const submitReport = async (projectId: string, file: File): Promise<void> => {
  await delay(600);
  console.log('Report submitted for project:', projectId, file.name);
};

export const submitResearch = async (projectId: string): Promise<void> => {
  await delay(600);
  console.log('Research submitted for project:', projectId);
};
