import { Role, Permission } from './roles';

export type JwtUser = {
  id: string | number;
  email: string;
  role: Role;
  permissions?: Permission[];
};
