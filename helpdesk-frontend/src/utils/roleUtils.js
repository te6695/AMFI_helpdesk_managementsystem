// src/utils/roleUtils.js
export const ADMIN_ROLES = [
  "admin", "sub_admin", "boardadmin", "ceoadmin", "cooadmin", "ccoadmin", 
  "IRadmin", "ITadmin", "operatonadmin", "marketadmin", "branchadmin", 
  "financeadmin", "planandstrategyadmin", "shareadmin", "lawadmin", 
  "riskadmin", "auditadmin"
];

export const isAdminRole = (role) => {
  return ADMIN_ROLES.includes(role);
};

export const isValidRole = (role) => {
  const allRoles = ['user', 'resolver', ...ADMIN_ROLES];
  return allRoles.includes(role);
};

export const getRoleDisplayName = (role) => {
  const roleMap = {
    'admin': 'Administrator',
    'sub_admin': 'Sub Administrator',
    'user': 'User',
    'resolver': 'Resolver',
    'boardadmin': 'Board Admin',
    'ceoadmin': 'CEO Admin',
    'cooadmin': 'COO Admin',
    'ccoadmin': 'CCO Admin',
    'IRadmin': 'IR Admin',
    'ITadmin': 'IT Admin',
    'operatonadmin': 'Operation Admin',
    'marketadmin': 'Marketing Admin',
    'branchadmin': 'Branch Admin',
    'financeadmin': 'Finance Admin',
    'planandstrategyadmin': 'Planning & Strategy Admin',
    'shareadmin': 'Share Admin',
    'lawadmin': 'Legal Admin',
    'riskadmin': 'Risk Admin',
    'auditadmin': 'Audit Admin'
  };
  
  return roleMap[role] || role;
};