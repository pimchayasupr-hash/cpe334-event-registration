import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { prisma } from '../src/db.js';
import { EventCategory, EventStatus, RegistrationStatus, Role } from '@prisma/client';

describe('F-04: Organizer Registrant Roster, Ownership Enforcement, and Runtime Readiness', () => {
  let organizerAId: string;
  let organizerBId: string;
  let participantId: string;
  let organizerASid: string;
  let organizerBSid: string;
  let participantSid: string;
  let eventAId: string;

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.registration.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('Password123!', 10);

    const orgA = await prisma.user.create({
      data: { email: 'org.a@kmutt.ac.th', name: 'Organizer Alpha', passwordHash, role: Role.ORGANIZER },
    });
    organizerAId = orgA.id;

    const orgB = await prisma.user.create({
      data: { email: 'org.b@kmutt.ac.th', name: 'Organizer Beta', passwordHash, role: Role.ORGANIZER },
    });
    organizerBId = orgB.id;

    const part = await prisma.user.create({
      data: { email: 'student.roster@kmutt.ac.th', name: 'Somying Roster', passwordHash, role: Role.PARTICIPANT },
    });
    participantId = part.id;

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

    const eventA = await prisma.event.create({
      data: {
        title: 'Full Stack Workshop',
        description: 'Testing roster',
        category: EventCategory.WORKSHOP,
        location: 'Room 201',
        startAt: new Date(Date.now() + 24 * 3600 * 1000),
        endAt: new Date(Date.now() + 27 * 3600 * 1000),
        capacity: 20,
        status: EventStatus.PUBLISHED,
        organizerId: organizerAId,
      },
    });
    eventAId = eventA.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST-F04-01: Organizer retrieves owned event roster
  it('TEST-F04-01: retrieves registrant roster for owned event and sanitizes passwordHash', async () => {
    // Check empty roster first
    const emptyRes = await request(app)
      .get(`/api/events/${eventAId}/registrations`)
      .set('Cookie', `sid=${organizerASid}`);

    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.registrations.length).toBe(0);
    expect(emptyRes.body.event.activeRegistrationsCount).toBe(0);

    // Register a participant
    await prisma.registration.create({
      data: { eventId: eventAId, userId: participantId, status: RegistrationStatus.ACTIVE },
    });

    // Check roster with 1 registrant
    const rosterRes = await request(app)
      .get(`/api/events/${eventAId}/registrations`)
      .set('Cookie', `sid=${organizerASid}`);

    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.registrations.length).toBe(1);
    expect(rosterRes.body.event.activeRegistrationsCount).toBe(1);

    const firstReg = rosterRes.body.registrations[0];
    expect(firstReg.participant.email).toBe('student.roster@kmutt.ac.th');
    expect(firstReg.participant.name).toBe('Somying Roster');
    expect(firstReg.participant.passwordHash).toBeUndefined();
  });

  // TEST-F04-02: Cross-organizer roster inspection rejected
  it('TEST-F04-02: prevents Organizer B from inspecting Organizer A event roster with 403 Forbidden', async () => {
    await prisma.registration.create({
      data: { eventId: eventAId, userId: participantId, status: RegistrationStatus.ACTIVE },
    });

    const res = await request(app)
      .get(`/api/events/${eventAId}/registrations`)
      .set('Cookie', `sid=${organizerBSid}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
    expect(res.body.registrations).toBeUndefined();
  });

  // TEST-F04-03: Participant role rejected from roster
  it('TEST-F04-03: rejects PARTICIPANT role from accessing roster with 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/events/${eventAId}/registrations`)
      .set('Cookie', `sid=${participantSid}`);

    expect(res.status).toBe(403);
  });

  // TEST-F04-04: Liveness health check
  it('TEST-F04-04: GET /api/health responds with 200 OK and { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // TEST-F04-05: Readiness check (PostgreSQL connectivity)
  it('TEST-F04-05: GET /api/ready responds with 200 OK when database is reachable', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.database).toBe('connected');
  });
});
