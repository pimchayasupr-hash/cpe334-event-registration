import { Role } from '@prisma/client';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

export function requireRole(allowedRole: Role) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== allowedRole) {
      return res.status(403).json({
        error: `Forbidden: requires ${allowedRole} role`,
      });
    }
    return next();
  };
}
