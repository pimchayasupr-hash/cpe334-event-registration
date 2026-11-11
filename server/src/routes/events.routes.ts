import { Router, Response } from 'express';
import { EventCategory, EventStatus, RegistrationStatus, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../types/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const eventsRouter = Router();

// GET /api/events - List PUBLISHED events
eventsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const events = await prisma.event.findMany({
    where: { status: EventStatus.PUBLISHED },
    orderBy: { startAt: 'asc' },
    include: {
      _count: {
        select: {
          registrations: { where: { status: RegistrationStatus.ACTIVE } },
        },
      },
    },
  });

  const formattedEvents = events.map((e) => {
    const activeCount = e._count.registrations;
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      location: e.location,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      capacity: e.capacity,
      status: e.status,
      activeRegistrationsCount: activeCount,
      remainingSeats: Math.max(0, e.capacity - activeCount),
    };
  });

  return res.status(200).json({ events: formattedEvents });
});

// GET /api/organizer/events - List events owned by current ORGANIZER
eventsRouter.get('/organizer/events', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  const events = await prisma.event.findMany({
    where: { organizerId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          registrations: { where: { status: RegistrationStatus.ACTIVE } },
        },
      },
    },
  });

  const formattedEvents = events.map((e) => {
    const activeCount = e._count.registrations;
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      location: e.location,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      capacity: e.capacity,
      status: e.status,
      activeRegistrationsCount: activeCount,
      remainingSeats: Math.max(0, e.capacity - activeCount),
    };
  });

  return res.status(200).json({ events: formattedEvents });
});

// POST /api/events - Create new DRAFT event (ORGANIZER only)
eventsRouter.post('/', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, category, location, startAt, endAt, capacity } = req.body || {};

  if (!title || !description || !category || !location || !startAt || !endAt || capacity === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Capacity validation: 1 <= capacity <= 500
  const parsedCapacity = Number(capacity);
  if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 500) {
    return res.status(400).json({ error: 'Capacity must be an integer between 1 and 500' });
  }

  // Category validation
  if (category !== EventCategory.WORKSHOP && category !== EventCategory.SEMINAR) {
    return res.status(400).json({ error: 'Invalid category: must be WORKSHOP or SEMINAR' });
  }

  // Schedule validation: endAt > startAt
  const parsedStart = new Date(startAt);
  const parsedEnd = new Date(endAt);
  if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime()) || parsedEnd.getTime() <= parsedStart.getTime()) {
    return res.status(400).json({ error: 'Invalid dates: endAt must be later than startAt' });
  }

  const newEvent = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      category,
      location: location.trim(),
      startAt: parsedStart,
      endAt: parsedEnd,
      capacity: parsedCapacity,
      status: EventStatus.DRAFT,
      organizerId: req.user!.id,
    },
  });

  return res.status(201).json({
    event: {
      id: newEvent.id,
      title: newEvent.title,
      description: newEvent.description,
      category: newEvent.category,
      location: newEvent.location,
      startAt: newEvent.startAt.toISOString(),
      endAt: newEvent.endAt.toISOString(),
      capacity: newEvent.capacity,
      status: newEvent.status,
      organizerId: newEvent.organizerId,
    },
  });
});

// GET /api/events/:id - Get event details
eventsRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          registrations: { where: { status: RegistrationStatus.ACTIVE } },
        },
      },
    },
  });

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // DRAFT events can only be viewed by the owning ORGANIZER
  if (event.status === EventStatus.DRAFT) {
    if (req.user!.role !== Role.ORGANIZER || event.organizerId !== req.user!.id) {
      return res.status(404).json({ error: 'Event not found' });
    }
  }

  const activeCount = event._count.registrations;
  return res.status(200).json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      location: event.location,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      capacity: event.capacity,
      status: event.status,
      activeRegistrationsCount: activeCount,
      remainingSeats: Math.max(0, event.capacity - activeCount),
    },
  });
});

// POST /api/events/:id/publish - Transition DRAFT to PUBLISHED
eventsRouter.post('/:id/publish', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (event.organizerId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden: you do not own this event' });
  }

  if (event.status !== EventStatus.DRAFT) {
    return res.status(400).json({ error: 'Only DRAFT events can be published' });
  }

  // startAt must be in the future relative to server clock
  if (event.startAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Cannot publish event: startAt must be in the future' });
  }

  const updated = await prisma.event.update({
    where: { id },
    data: { status: EventStatus.PUBLISHED },
  });

  return res.status(200).json({
    event: {
      id: updated.id,
      status: updated.status,
      title: updated.title,
    },
  });
});

// PATCH /api/events/:id/capacity - Update capacity
eventsRouter.patch('/:id/capacity', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { capacity } = req.body || {};

  const parsedCapacity = Number(capacity);
  if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 500) {
    return res.status(400).json({ error: 'Capacity must be an integer between 1 and 500' });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          registrations: { where: { status: RegistrationStatus.ACTIVE } },
        },
      },
    },
  });

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (event.organizerId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden: you do not own this event' });
  }

  const activeCount = event._count.registrations;
  if (parsedCapacity < activeCount) {
    return res.status(409).json({
      error: `Capacity cannot be reduced below current active registrations (${activeCount})`,
    });
  }

  const updated = await prisma.event.update({
    where: { id },
    data: { capacity: parsedCapacity },
  });

  return res.status(200).json({
    event: {
      id: updated.id,
      capacity: updated.capacity,
      activeRegistrationsCount: activeCount,
      remainingSeats: Math.max(0, updated.capacity - activeCount),
    },
  });
});

// GET /api/events/:id/registrations - Organizer Registrant Roster
eventsRouter.get('/:id/registrations', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (event.organizerId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden: you do not own this event' });
  }

  const registrations = await prisma.registration.findMany({
    where: {
      eventId: id,
      status: RegistrationStatus.ACTIVE,
    },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return res.status(200).json({
    event: {
      id: event.id,
      title: event.title,
      capacity: event.capacity,
      status: event.status,
      activeRegistrationsCount: registrations.length,
    },
    registrations: registrations.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      participant: r.user,
    })),
  });
});
