// src/utils/roleUtils.js
export const ADMIN_ROLES = [
  'admin',
  'boardadmin',
  'ceoadmin',
  'cooadmin',
  'ccoadmin',
  'IRadmin',
  'ITadmin',
  'operatonadmin',
  'marketadmin',
  'branchadmin',
  'financeadmin',
  'planandstrategyadmin',
  'shareadmin',
  'lawadmin',
  'riskadmin',
  'auditadmin',
];

export const isAdminRole = (role) => {
  return ADMIN_ROLES.includes(role);
};
