import { Response, NextFunction } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../types/index.js';

export async function authenticateSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const sid = req.cookies?.sid;
    if (!sid || typeof sid !== 'string') {
      return next();
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { user: true },
    });

    if (!session) {
      res.clearCookie('sid', { path: '/' });
      return next();
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.delete({ where: { id: sid } }).catch(() => {});
      res.clearCookie('sid', { path: '/' });
      return next();
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };
    req.sessionId = session.id;
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
}
