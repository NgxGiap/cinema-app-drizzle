export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  USER = 'user',
}

export enum Permission {
  // Users
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_USERS = 'VIEW_USERS',

  // Movies
  MANAGE_MOVIES = 'MANAGE_MOVIES',
  VIEW_MOVIES = 'VIEW_MOVIES',

  // Cinemas / Rooms / Seats
  MANAGE_CINEMAS = 'MANAGE_CINEMAS',
  VIEW_CINEMAS = 'VIEW_CINEMAS',

  MANAGE_ROOMS = 'MANAGE_ROOMS',
  VIEW_ROOMS = 'VIEW_ROOMS',

  MANAGE_SEATS = 'MANAGE_SEATS',
  VIEW_SEATS = 'VIEW_SEATS',

  // Showtimes
  MANAGE_SHOWTIMES = 'MANAGE_SHOWTIMES',
  VIEW_SHOWTIMES = 'VIEW_SHOWTIMES',

  // Bookings
  MANAGE_BOOKINGS = 'MANAGE_BOOKINGS', // admin/ops có thể hủy, xoá, cập nhật
  VIEW_BOOKINGS = 'VIEW_BOOKINGS',
  CREATE_BOOKING = 'CREATE_BOOKING',

  // Payments
  MANAGE_PAYMENTS = 'MANAGE_PAYMENTS',
  VIEW_PAYMENTS = 'VIEW_PAYMENTS',

  // Tickets
  MANAGE_TICKETS = 'MANAGE_TICKETS', // issue/reissue/void/refund
  VIEW_TICKETS = 'VIEW_TICKETS',
  SCAN_TICKETS = 'SCAN_TICKETS', // check-in tại cổng
}

/** Quyền theo vai trò.
 * Gợi ý: USER nên được lọc ở tầng service/DAO để chỉ thấy "của mình".
 */
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // full access
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,

    Permission.MANAGE_MOVIES,
    Permission.VIEW_MOVIES,
    Permission.MANAGE_CINEMAS,
    Permission.VIEW_CINEMAS,
    Permission.MANAGE_ROOMS,
    Permission.VIEW_ROOMS,
    Permission.MANAGE_SEATS,
    Permission.VIEW_SEATS,

    Permission.MANAGE_SHOWTIMES,
    Permission.VIEW_SHOWTIMES,

    Permission.MANAGE_BOOKINGS,
    Permission.VIEW_BOOKINGS,
    Permission.CREATE_BOOKING,

    Permission.MANAGE_PAYMENTS,
    Permission.VIEW_PAYMENTS,

    Permission.MANAGE_TICKETS,
    Permission.VIEW_TICKETS,
    Permission.SCAN_TICKETS,
  ],

  [Role.MANAGER]: [
    // quản lý nội dung & vận hành
    Permission.VIEW_USERS, // không cho MANAGE_USERS
    Permission.MANAGE_MOVIES,
    Permission.VIEW_MOVIES,
    Permission.MANAGE_CINEMAS,
    Permission.VIEW_CINEMAS,
    Permission.MANAGE_ROOMS,
    Permission.VIEW_ROOMS,
    Permission.MANAGE_SEATS,
    Permission.VIEW_SEATS,

    Permission.MANAGE_SHOWTIMES,
    Permission.VIEW_SHOWTIMES,

    Permission.MANAGE_BOOKINGS,
    Permission.VIEW_BOOKINGS,
    Permission.CREATE_BOOKING,

    Permission.MANAGE_PAYMENTS,
    Permission.VIEW_PAYMENTS,

    Permission.MANAGE_TICKETS,
    Permission.VIEW_TICKETS,
    Permission.SCAN_TICKETS,
  ],

  [Role.STAFF]: [
    // nhân viên rạp: vận hành tại quầy/cổng
    Permission.VIEW_MOVIES,
    Permission.VIEW_CINEMAS,
    Permission.VIEW_ROOMS,
    Permission.VIEW_SEATS,
    Permission.VIEW_SHOWTIMES,

    Permission.MANAGE_BOOKINGS, // hủy booking chưa thanh toán, hỗ trợ KH
    Permission.VIEW_BOOKINGS,
    Permission.CREATE_BOOKING,

    Permission.VIEW_PAYMENTS,
    // (tuỳ quy trình, có thể cho MANAGE_PAYMENTS nếu cần ghi nhận thanh toán tại quầy)
    // Permission.MANAGE_PAYMENTS,

    Permission.MANAGE_TICKETS, // issue/reissue/void/refund tại quầy
    Permission.VIEW_TICKETS,
    Permission.SCAN_TICKETS, // check-in
  ],

  [Role.USER]: [
    // khách hàng
    Permission.VIEW_MOVIES,
    Permission.VIEW_CINEMAS,
    Permission.VIEW_SHOWTIMES,
    Permission.VIEW_SEATS,

    Permission.CREATE_BOOKING,
    Permission.VIEW_BOOKINGS, // Chỉ booking của chính họ (lọc ở service)
    // Không có quyền với payments/tickets ở phía admin; view trạng thái qua booking detail
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = RolePermissions[role] ?? [];
  return perms.includes(permission);
}
