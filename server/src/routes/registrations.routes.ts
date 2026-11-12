import { Router, Response } from 'express';
import { EventStatus, RegistrationStatus, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../types/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const registrationsRouter = Router();

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// POST /api/events/:id/registrations (and alias /events/:id/register) - Register for an event (PARTICIPANT only)
const registerHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const registration = await prisma.$transaction(async (tx) => {
      // 1. Acquire exclusive row-level lock on the target Event row
      const events = await tx.$queryRaw<Array<{ id: string; status: string; capacity: number }>>`
        SELECT id, status, capacity FROM "Event" WHERE id = ${id}::uuid FOR UPDATE
      `;

      const event = events[0];
      if (!event) {
        throw new NotFoundError('Event not found');
      }

      // BR-03: Must be in PUBLISHED status
      if (event.status !== EventStatus.PUBLISHED) {
        throw new NotFoundError('Event not available for registration');
      }

      // BR-05: Check for duplicate registration
      const existing = await tx.registration.findUnique({
        where: {
          eventId_userId: { eventId: id, userId },
        },
      });

      if (existing) {
        throw new ConflictError('Already registered for this event');
      }

      // BR-04: Count active registrations inside the lock boundary
      const activeCount = await tx.registration.count({
        where: { eventId: id, status: RegistrationStatus.ACTIVE },
      });

      // BR-04: Invariant check against room capacity
      if (activeCount >= event.capacity) {
        throw new ConflictError('Event is at full capacity');
      }

      // 5. Insert new ACTIVE registration
      return await tx.registration.create({
        data: {
          eventId: id,
          userId,
          status: RegistrationStatus.ACTIVE,
        },
      });
    });

    return res.status(201).json({
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        userId: registration.userId,
        status: registration.status,
        createdAt: registration.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof ConflictError) {
      return res.status(409).json({ error: err.message });
    }
    // PostgreSQL unique constraint violation fallback (P2002)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Already registered for this event' });
    }
    console.error('Registration transaction error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
};

registrationsRouter.post('/events/:id/registrations', requireAuth, requireRole(Role.PARTICIPANT), registerHandler);
registrationsRouter.post('/events/:id/register', requireAuth, requireRole(Role.PARTICIPANT), registerHandler);

// GET /api/registrations/me (and alias /my-registrations) - List current participant's registrations
const myRegistrationsHandler = async (req: AuthenticatedRequest, res: Response) => {
  const registrations = await prisma.registration.findMany({
    where: {
      userId: req.user!.id,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          category: true,
          location: true,
          startAt: true,
          endAt: true,
          capacity: true,
        },
      },
    },
  });

  return res.status(200).json({
    registrations: registrations.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      event: {
        id: r.event.id,
        title: r.event.title,
        category: r.event.category,
        location: r.event.location,
        startAt: r.event.startAt.toISOString(),
        endAt: r.event.endAt.toISOString(),
        capacity: r.event.capacity,
      },
    })),
  });
};

registrationsRouter.get('/registrations/me', requireAuth, requireRole(Role.PARTICIPANT), myRegistrationsHandler);
registrationsRouter.get('/my-registrations', requireAuth, requireRole(Role.PARTICIPANT), myRegistrationsHandler);
