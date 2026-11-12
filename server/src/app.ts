import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { authenticateSession } from './middleware/auth.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { eventsRouter } from './routes/events.routes.js';
import { registrationsRouter } from './routes/registrations.routes.js';
import { healthRouter } from './routes/health.routes.js';

export const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(authenticateSession);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api', registrationsRouter);
app.use('/api', healthRouter);

// Serve Static Frontend if built (Unified Container for Cloud Run)
const clientDistPath = path.resolve(process.cwd(), 'client/dist');
const altClientDistPath = path.resolve(process.cwd(), '../client/dist');

const activeDistPath = fs.existsSync(clientDistPath)
  ? clientDistPath
  : fs.existsSync(altClientDistPath)
    ? altClientDistPath
    : null;

if (activeDistPath) {
  app.use(express.static(activeDistPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(activeDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});
