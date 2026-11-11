import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { prisma } from '../src/db.js';
import { EventCategory, EventStatus, RegistrationStatus, Role } from '@prisma/client';

describe('F-03: Participant Registration, Capacity Enforcement, and Concurrency Protection', () => {
  let organizerId: string;
  let organizerSid: string;
  let participantASid: string;
  let participantBSid: string;
  let participantAId: string;
  let participantBId: string;
  let publishedEventId: string;

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.registration.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('Password123!', 10);

    const org = await prisma.user.create({
      data: { email: 'organizer@kmutt.ac.th', name: 'Org User', passwordHash, role: Role.ORGANIZER },
    });
    organizerId = org.id;

    const pA = await prisma.user.create({
      data: { email: 'studentA@kmutt.ac.th', name: 'Student A', passwordHash, role: Role.PARTICIPANT },
    });
    participantAId = pA.id;

    const pB = await prisma.user.create({
      data: { email: 'studentB@kmutt.ac.th', name: 'Student B', passwordHash, role: Role.PARTICIPANT },
    });
    participantBId = pB.id;

    organizerSid = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
      data: { id: organizerSid, userId: organizerId, expiresAt: new Date(Date.now() + 8 * 3600 * 1000) },
    });

    participantASid = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
      data: { id: participantASid, userId: participantAId, expiresAt: new Date(Date.now() + 8 * 3600 * 1000) },
    });

    participantBSid = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
      data: { id: participantBSid, userId: participantBId, expiresAt: new Date(Date.now() + 8 * 3600 * 1000) },
    });

    const event = await prisma.event.create({
      data: {
        title: 'Microservices Design Workshop',
        description: 'Hands on',
        category: EventCategory.WORKSHOP,
        location: 'Lab 3',
        startAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        endAt: new Date(Date.now() + 7 * 24 * 3600 * 1000 + 3 * 3600 * 1000),
        capacity: 10,
        status: EventStatus.PUBLISHED,
        organizerId,
      },
    });
    publishedEventId = event.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST-F03-01: Happy path registration and own registrations retrieval
  it('TEST-F03-01: registers successfully, creates ACTIVE record, and retrieves via GET /api/registrations/me', async () => {
    const regRes = await request(app)
      .post(`/api/events/${publishedEventId}/registrations`)
      .set('Cookie', `sid=${participantASid}`);

    expect(regRes.status).toBe(201);
    expect(regRes.body.registration).toBeDefined();
    expect(regRes.body.registration.status).toBe(RegistrationStatus.ACTIVE);
    expect(regRes.body.registration.eventId).toBe(publishedEventId);
    expect(regRes.body.registration.userId).toBe(participantAId);

    // Retrieve via /api/registrations/me
    const meRes = await request(app)
      .get('/api/registrations/me')
      .set('Cookie', `sid=${participantASid}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.registrations.length).toBe(1);
    expect(meRes.body.registrations[0].event.id).toBe(publishedEventId);
  });

  // TEST-F03-02: Duplicate registration returns 409 Conflict
  it('TEST-F03-02: rejects duplicate registration attempt for the same event with 409 Conflict', async () => {
    // First registration
    const firstRes = await request(app)
      .post(`/api/events/${publishedEventId}/registrations`)
      .set('Cookie', `sid=${participantASid}`);
    expect(firstRes.status).toBe(201);

    // Second registration from same user
    const secondRes = await request(app)
      .post(`/api/events/${publishedEventId}/registrations`)
      .set('Cookie', `sid=${participantASid}`);
    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error).toContain('Already registered');

    // Confirm only 1 row exists
    const count = await prisma.registration.count({
      where: { eventId: publishedEventId, userId: participantAId },
    });
    expect(count).toBe(1);
  });

  // TEST-F03-03: Full capacity rejection
  it('TEST-F03-03: rejects registration when event capacity is reached with 409 Conflict', async () => {
    // Create an event with capacity = 1
    const oneSeatEvent = await prisma.event.create({
      data: {
        title: 'Single Seat Seminar',
        description: 'Exclusive',
        category: EventCategory.SEMINAR,
        location: 'Room 501',
        startAt: new Date(Date.now() + 24 * 3600 * 1000),
        endAt: new Date(Date.now() + 26 * 3600 * 1000),
        capacity: 1,
        status: EventStatus.PUBLISHED,
        organizerId,
      },
    });

    // Participant A takes the only seat
    const firstReg = await request(app)
      .post(`/api/events/${oneSeatEvent.id}/registrations`)
      .set('Cookie', `sid=${participantASid}`);
    expect(firstReg.status).toBe(201);

    // Participant B attempts to register
    const secondReg = await request(app)
      .post(`/api/events/${oneSeatEvent.id}/registrations`)
      .set('Cookie', `sid=${participantBSid}`);
    expect(secondReg.status).toBe(409);
    expect(secondReg.body.error).toContain('full capacity');
  });

  // TEST-F03-04: Concurrency & Atomic Seat Allocation (NFR-03)
  it('TEST-F03-04: serializes 5 concurrent requests on a 1-seat event (exactly 1 succeeds, 4 fail with 409)', async () => {
    // Create a 1-seat event
    const concurrencyEvent = await prisma.event.create({
      data: {
        title: 'Extreme Concurrency Test Workshop',
        description: 'Race condition simulation',
        category: EventCategory.WORKSHOP,
        location: 'Room 101',
        startAt: new Date(Date.now() + 48 * 3600 * 1000),
        endAt: new Date(Date.now() + 50 * 3600 * 1000),
        capacity: 1,
        status: EventStatus.PUBLISHED,
        organizerId,
      },
    });

    // Create 5 distinct participant accounts and sessions
    const participantSids: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const user = await prisma.user.create({
        data: {
          email: `race.student.${i}@kmutt.ac.th`,
          name: `Race Participant ${i}`,
          passwordHash: 'hash',
          role: Role.PARTICIPANT,
        },
      });
      const sid = crypto.randomBytes(32).toString('hex');
      await prisma.session.create({
        data: { id: sid, userId: user.id, expiresAt: new Date(Date.now() + 3600 * 1000) },
      });
      participantSids.push(sid);
    }

    // Fire 5 simultaneous requests via Promise.all
    const promises = participantSids.map((sid) =>
      request(app)
        .post(`/api/events/${concurrencyEvent.id}/registrations`)
        .set('Cookie', `sid=${sid}`)
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 201).length;
    const conflictCount = statuses.filter((s) => s === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(4);

    // Verify persisted rows in database is strictly 1
    const finalCount = await prisma.registration.count({
      where: { eventId: concurrencyEvent.id, status: RegistrationStatus.ACTIVE },
    });
    expect(finalCount).toBe(1);
  });

  // TEST-F03-05: Draft registration rejection
  it('TEST-F03-05: rejects registration on DRAFT events with 404 Not Found', async () => {
    const draftEvent = await prisma.event.create({
      data: {
        title: 'Draft Event',
        description: 'Desc',
        category: EventCategory.WORKSHOP,
        location: 'Lab',
        startAt: new Date(Date.now() + 24 * 3600 * 1000),
        endAt: new Date(Date.now() + 26 * 3600 * 1000),
        capacity: 10,
        status: EventStatus.DRAFT,
        organizerId,
      },
    });

    const res = await request(app)
      .post(`/api/events/${draftEvent.id}/registrations`)
      .set('Cookie', `sid=${participantASid}`);

    expect(res.status).toBe(404);
  });

  // TEST-F03-06: Privacy isolation for registrations
  it('TEST-F03-06: ensures Participant A never sees Participant B registrations, and blocks ORGANIZER role', async () => {
    // Participant B registers for event
    await request(app)
      .post(`/api/events/${publishedEventId}/registrations`)
      .set('Cookie', `sid=${participantBSid}`);

    // Participant A queries /api/registrations/me -> should be empty
    const resA = await request(app)
      .get('/api/registrations/me')
      .set('Cookie', `sid=${participantASid}`);

    expect(resA.status).toBe(200);
    expect(resA.body.registrations.length).toBe(0);

    // Organizer calls /api/registrations/me -> 403 Forbidden
    const resOrg = await request(app)
      .get('/api/registrations/me')
      .set('Cookie', `sid=${organizerSid}`);
    expect(resOrg.status).toBe(403);
  });
});
