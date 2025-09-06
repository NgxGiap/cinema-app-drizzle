export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  USER = 'user',
}

export enum Permission {
  // User management
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_USERS = 'VIEW_USERS',

  // Movie management
  MANAGE_MOVIES = 'MANAGE_MOVIES',
  VIEW_MOVIES = 'VIEW_MOVIES',

  // Theater/Cinema management
  MANAGE_CINEMAS = 'MANAGE_CINEMAS',
  VIEW_CINEMAS = 'VIEW_CINEMAS',

  // Seat management
  MANAGE_SEATS = 'MANAGE_SEATS',
  VIEW_SEATS = 'VIEW_SEATS',

  // Booking management
  MANAGE_BOOKINGS = 'MANAGE_BOOKINGS',
  VIEW_BOOKINGS = 'VIEW_BOOKINGS',
  CREATE_BOOKING = 'CREATE_BOOKING',

  // Paymant management
  MANAGE_PAYMENTS = 'MANAGE_PAYMENTS',

  // Seat management
  MANAGE_ROOMS = 'MANAGE_ROOMS',

  // Reports
  VIEW_REPORTS = 'VIEW_REPORTS',
}

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Full access to everything
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.MANAGE_MOVIES,
    Permission.VIEW_MOVIES,
    Permission.MANAGE_CINEMAS,
    Permission.VIEW_CINEMAS,
    Permission.MANAGE_SEATS,
    Permission.VIEW_SEATS,
    Permission.MANAGE_BOOKINGS,
    Permission.VIEW_BOOKINGS,
    Permission.CREATE_BOOKING,
    Permission.MANAGE_PAYMENTS,
    Permission.MANAGE_ROOMS,
    Permission.VIEW_REPORTS,
  ],
  [Role.MANAGER]: [
    // Can manage content and bookings, view users
    Permission.VIEW_USERS,
    Permission.MANAGE_MOVIES,
    Permission.VIEW_MOVIES,
    Permission.MANAGE_CINEMAS,
    Permission.VIEW_CINEMAS,
    Permission.MANAGE_SEATS,
    Permission.VIEW_SEATS,
    Permission.MANAGE_BOOKINGS,
    Permission.VIEW_BOOKINGS,
    Permission.CREATE_BOOKING,
    Permission.VIEW_REPORTS,
  ],
  [Role.STAFF]: [
    // Can handle bookings and view content
    Permission.VIEW_MOVIES,
    Permission.VIEW_CINEMAS,
    Permission.VIEW_SEATS,
    Permission.MANAGE_BOOKINGS,
    Permission.VIEW_BOOKINGS,
    Permission.CREATE_BOOKING,
  ],
  [Role.USER]: [
    // Basic user permissions
    Permission.VIEW_MOVIES,
    Permission.VIEW_CINEMAS,
    Permission.VIEW_SEATS,
    Permission.CREATE_BOOKING,
    Permission.VIEW_BOOKINGS, // Own bookings only
  ],
};
