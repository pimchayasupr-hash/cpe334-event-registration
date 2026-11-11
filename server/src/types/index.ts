import { Role } from '@prisma/client';
import { Request } from 'express';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
  sessionId?: string;
}
