import type { CouncilMember } from '../types';

export const UNIQUE_ROLES: CouncilMember['role'][] = ['chu_tich', 'phan_bien_1', 'phan_bien_2', 'thu_ky'];
export const REQUIRED_ROLES: CouncilMember['role'][] = ['chu_tich', 'phan_bien_1', 'phan_bien_2', 'thu_ky'];

export type CouncilRoleCounts = Record<CouncilMember['role'], number>;

export const buildRoleCounts = (members: CouncilMember[]): CouncilRoleCounts => {
  const counts: CouncilRoleCounts = {
    chu_tich: 0,
    phan_bien_1: 0,
    phan_bien_2: 0,
    thu_ky: 0,
    uy_vien: 0,
  };

  members.forEach((member) => {
    counts[member.role] += 1;
  });

  return counts;
};

export const findMissingRequiredRoles = (counts: CouncilRoleCounts): CouncilMember['role'][] =>
  REQUIRED_ROLES.filter((role) => counts[role] === 0);

export const hasDuplicateEmail = (members: CouncilMember[]): boolean => {
  const set = new Set<string>();
  for (const member of members) {
    const email = (member.email || '').trim().toLowerCase();
    if (!email) continue;
    if (set.has(email)) return true;
    set.add(email);
  }
  return false;
};

export const canAssignUniqueRole = (members: CouncilMember[], role: CouncilMember['role']): boolean => {
  if (!UNIQUE_ROLES.includes(role)) return true;
  return !members.some((member) => member.role === role);
};

export type CouncilValidationResult = {
  ok: boolean;
  errors: string[];
  roleCounts: CouncilRoleCounts;
  missingRoles: CouncilMember['role'][];
};

export const validateCouncilComposition = (members: CouncilMember[]): CouncilValidationResult => {
  const errors: string[] = [];
  const roleCounts = buildRoleCounts(members);
  const missingRoles = findMissingRequiredRoles(roleCounts);

  if (members.length < 5) {
    errors.push('Hội đồng cần tối thiểu 5 thành viên trước khi ban hành.');
  }

  if (missingRoles.length > 0) {
    errors.push(`Hội đồng còn thiếu vai trò: ${missingRoles.join(', ')}.`);
  }

  if (hasDuplicateEmail(members)) {
    errors.push('Danh sách hội đồng có email bị trùng lặp.');
  }

  for (const member of members) {
    const email = (member.email || '').trim().toLowerCase();
    if (!email) {
      errors.push(`Thành viên ${member.name} chưa có email hợp lệ.`);
      break;
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    roleCounts,
    missingRoles,
  };
};
