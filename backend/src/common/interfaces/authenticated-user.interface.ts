import { Role } from '../enums/role.enum';

export interface AuthenticatedUser {
  sub: string;
  sessionVersion?: number;
  email: string;
  role: Role;
}
