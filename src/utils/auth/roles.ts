export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
  GUEST = 'GUEST',
}

export enum Permission {
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_MOVIES = 'MANAGE_MOVIES',
  MANAGE_SHOWTIMES = 'MANAGE_SHOWTIMES',
  MANAGE_THEATERS = 'MANAGE_THEATERS',
  MANAGE_BOOKINGS = 'MANAGE_BOOKINGS',
  ISSUE_TICKETS = 'ISSUE_TICKETS',
  REFUND_TICKETS = 'REFUND_TICKETS',
  VIEW_REPORTS = 'VIEW_REPORTS',
}

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.MANAGE_MOVIES,
    Permission.MANAGE_SHOWTIMES,
    Permission.MANAGE_THEATERS,
    Permission.MANAGE_BOOKINGS,
    Permission.VIEW_REPORTS,
  ],
  [Role.MANAGER]: [
    Permission.MANAGE_MOVIES,
    Permission.MANAGE_SHOWTIMES,
    Permission.MANAGE_BOOKINGS,
    Permission.ISSUE_TICKETS,
    Permission.REFUND_TICKETS,
    Permission.VIEW_REPORTS,
  ],
  [Role.STAFF]: [
    Permission.ISSUE_TICKETS,
    Permission.REFUND_TICKETS,
    Permission.MANAGE_BOOKINGS,
  ],
  [Role.CUSTOMER]: [Permission.MANAGE_BOOKINGS],
  [Role.GUEST]: [],
};
