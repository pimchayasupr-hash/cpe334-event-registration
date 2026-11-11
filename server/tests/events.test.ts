import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { prisma } from '../src/db.js';
import { EventCategory, EventStatus, RegistrationStatus, Role } from '@prisma/client';

describe('F-02: Event Creation, Publication, and Capacity Management', () => {
  let organizerASid: string;
  let organizerBSid: string;
  let participantSid: string;
  let organizerAId: string;
  let organizerBId: string;
  let participantId: string;

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.registration.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('Password123!', 10);

    const orgA = await prisma.user.create({
      data: { email: 'orga@kmutt.ac.th', name: 'Organizer A', passwordHash, role: Role.ORGANIZER },
    });
    organizerAId = orgA.id;

    const orgB = await prisma.user.create({
      data: { email: 'orgb@kmutt.ac.th', name: 'Organizer B', passwordHash, role: Role.ORGANIZER },
    });
    organizerBId = orgB.id;

    const part = await prisma.user.create({
      data: { email: 'part@kmutt.ac.th', name: 'Participant Student', passwordHash, role: Role.PARTICIPANT },
    });
    participantId = part.id;

    // Create sessions
    organizerASid = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
      data: { id: organizerASid, userId: organizerAId, expiresAt: new Date(Date.now() + 8 * 3600 * 1000) },
    });

    organizerBSid = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
      data: { id: organizerBSid, userId: organizerBId, expiresAt: new Date(Date.now() + 8 * 3600 * 1000) },
    });

    participantSid = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
      data: { id: participantSid, userId: participantId, expiresAt: new Date(Date.now() + 8 * 3600 * 1000) },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST-F02-02: Happy path creation and separate publication
  it('TEST-F02-02: creates DRAFT event, publishes it, and exposes it in GET /api/events', async () => {
    const startAt = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
    const endAt = new Date(Date.now() + 5 * 24 * 3600 * 1000 + 3 * 3600 * 1000).toISOString();

    // 1. Create DRAFT
    const createRes = await request(app)
      .post('/api/events')
      .set('Cookie', `sid=${organizerASid}`)
      .send({
        title: 'Cloud Architecture Hands-on Workshop',
        description: 'Deep dive into GCP and Docker',
        category: EventCategory.WORKSHOP,
        location: 'CB4 Lab 1',
        startAt,
        endAt,
        capacity: 30,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.event.status).toBe(EventStatus.DRAFT);
    expect(createRes.body.event.capacity).toBe(30);
    const eventId = createRes.body.event.id;

    // 2. Publish DRAFT
    const publishRes = await request(app)
      .post(`/api/events/${eventId}/publish`)
      .set('Cookie', `sid=${organizerASid}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.event.status).toBe(EventStatus.PUBLISHED);

    // 3. Verify in GET /api/events
    const listRes = await request(app)
      .get('/api/events')
      .set('Cookie', `sid=${participantSid}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.events.length).toBe(1);
    expect(listRes.body.events[0].id).toBe(eventId);
    expect(listRes.body.events[0].remainingSeats).toBe(30);
  });

  // TEST-F02-03: Boundary violations for capacity and past startAt on publish
  it('TEST-F02-03: rejects boundary violations (capacity 0, 501, inverted dates) and past startAt publish', async () => {
    const futureStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 4 * 3600 * 1000).toISOString();

    // Zero capacity
    const res0 = await request(app)
      .post('/api/events')
      .set('Cookie', `sid=${organizerASid}`)
      .send({
        title: 'Zero Cap',
        description: 'Desc',
        category: EventCategory.SEMINAR,
        location: 'Hall',
        startAt: futureStart,
        endAt: futureEnd,
        capacity: 0,
      });
    expect(res0.status).toBe(400);

    // 501 capacity
    const res501 = await request(app)
      .post('/api/events')
      .set('Cookie', `sid=${organizerASid}`)
      .send({
        title: 'Too Big',
        description: 'Desc',
        category: EventCategory.SEMINAR,
        location: 'Hall',
        startAt: futureStart,
        endAt: futureEnd,
        capacity: 501,
      });
    expect(res501.status).toBe(400);

    // Inverted dates
    const resInverted = await request(app)
      .post('/api/events')
      .set('Cookie', `sid=${organizerASid}`)
      .send({
        title: 'Inverted',
        description: 'Desc',
        category: EventCategory.SEMINAR,
        location: 'Hall',
        startAt: futureEnd,
        endAt: futureStart,
        capacity: 20,
      });
    expect(resInverted.status).toBe(400);

    // Publish event with past startAt
    const pastEvent = await prisma.event.create({
      data: {
        title: 'Past Event',
        description: 'Desc',
        category: EventCategory.WORKSHOP,
        location: 'Lab',
        startAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        endAt: new Date(Date.now() + 3600 * 1000),
        capacity: 20,
        status: EventStatus.DRAFT,
        organizerId: organizerAId,
      },
    });

    const pastPublishRes = await request(app)
      .post(`/api/events/${pastEvent.id}/publish`)
      .set('Cookie', `sid=${organizerASid}`);
    expect(pastPublishRes.status).toBe(400);
    expect(pastPublishRes.body.error).toContain('future');
  });

  // TEST-F02-04: Draft visibility filter
  it('TEST-F02-04: hides DRAFT events from participant queries and returns 404', async () => {
    const draftEvent = await prisma.event.create({
      data: {
        title: 'Hidden Draft Event',
        description: 'Secret',
        category: EventCategory.WORKSHOP,
        location: 'Secret Lab',
        startAt: new Date(Date.now() + 24 * 3600 * 1000),
        endAt: new Date(Date.now() + 26 * 3600 * 1000),
        capacity: 10,
        status: EventStatus.DRAFT,
        organizerId: organizerAId,
      },
    });

    // Participant lists events -> draft must be excluded
    const listRes = await request(app)
      .get('/api/events')
      .set('Cookie', `sid=${participantSid}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.events.find((e: any) => e.id === draftEvent.id)).toBeUndefined();

    // Participant accesses draft details directly -> 404 Not Found
    const detailRes = await request(app)
      .get(`/api/events/${draftEvent.id}`)
      .set('Cookie', `sid=${participantSid}`);
    expect(detailRes.status).toBe(404);
  });

  // TEST-F02-05: Capacity monotonicity check (cannot reduce below active registrations)
  it('TEST-F02-05: rejects capacity reduction below active registrations with 409 Conflict', async () => {
    const event = await prisma.event.create({
      data: {
        title: 'Event with Registrations',
        description: 'Desc',
        category: EventCategory.WORKSHOP,
        location: 'Room 101',
        startAt: new Date(Date.now() + 24 * 3600 * 1000),
        endAt: new Date(Date.now() + 26 * 3600 * 1000),
        capacity: 5,
        status: EventStatus.PUBLISHED,
        organizerId: organizerAId,
      },
    });

    // Add 2 active registrations
    await prisma.registration.create({
      data: { eventId: event.id, userId: participantId, status: RegistrationStatus.ACTIVE },
    });

    // Attempt to reduce capacity to 1 (< activeCount of 1 or 2)
    const conflictRes = await request(app)
      .patch(`/api/events/${event.id}/capacity`)
      .set('Cookie', `sid=${organizerASid}`)
      .send({ capacity: 0 }); // invalid bound
    expect(conflictRes.status).toBe(400);

    // Attempt to reduce below 1
    // Let's create a second participant
    const secondPart = await prisma.user.create({
      data: { email: 'part2@kmutt.ac.th', name: 'Student 2', passwordHash: 'hash', role: Role.PARTICIPANT },
    });
    await prisma.registration.create({
      data: { eventId: event.id, userId: secondPart.id, status: RegistrationStatus.ACTIVE },
    });

    // Active count is now 2. Attempt to set capacity to 1:
    const reduceConflict = await request(app)
      .patch(`/api/events/${event.id}/capacity`)
      .set('Cookie', `sid=${organizerASid}`)
      .send({ capacity: 1 });
    expect(reduceConflict.status).toBe(409);
    expect(reduceConflict.body.error).toContain('Capacity cannot be reduced below current active registrations');

    // Valid update to 3 (>= active count 2):
    const validPatch = await request(app)
      .patch(`/api/events/${event.id}/capacity`)
      .set('Cookie', `sid=${organizerASid}`)
      .send({ capacity: 3 });
    expect(validPatch.status).toBe(200);
    expect(validPatch.body.event.capacity).toBe(3);
    expect(validPatch.body.event.remainingSeats).toBe(1);
  });

  // TEST-F02-06: Role boundary enforcement
  it('TEST-F02-06: rejects PARTICIPANT access to organizer endpoints with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', `sid=${participantSid}`)
      .send({
        title: 'Hacked Event',
        description: 'Desc',
        category: EventCategory.SEMINAR,
        location: 'Hall',
        startAt: new Date(Date.now() + 3600000).toISOString(),
        endAt: new Date(Date.now() + 7200000).toISOString(),
        capacity: 10,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  // TEST-F02-07: Cross-organizer ownership enforcement
  it('TEST-F02-07: prevents Organizer B from publishing or modifying Organizer A event with 403', async () => {
    const eventA = await prisma.event.create({
      data: {
        title: 'Organizer A Event',
        description: 'Desc',
        category: EventCategory.WORKSHOP,
        location: 'Room A',
        startAt: new Date(Date.now() + 24 * 3600 * 1000),
        endAt: new Date(Date.now() + 26 * 3600 * 1000),
        capacity: 10,
        status: EventStatus.DRAFT,
        organizerId: organizerAId,
      },
    });

    const publishByB = await request(app)
      .post(`/api/events/${eventA.id}/publish`)
      .set('Cookie', `sid=${organizerBSid}`);
    expect(publishByB.status).toBe(403);

    const patchByB = await request(app)
      .patch(`/api/events/${eventA.id}/capacity`)
      .set('Cookie', `sid=${organizerBSid}`)
      .send({ capacity: 15 });
    expect(patchByB.status).toBe(403);
  });
});
