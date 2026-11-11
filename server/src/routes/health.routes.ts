import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

export const healthRouter = Router();

// GET /api/health - Liveness probe
healthRouter.get('/health', (_req: Request, res: Response) => {
  return res.status(200).json({ status: 'ok' });
});

// GET /api/ready - Readiness probe (PostgreSQL connectivity check)
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'ready', database: 'connected', db: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'not_ready', error: 'Database unavailable', db: 'disconnected' });
  }
});
