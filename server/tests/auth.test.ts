import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { prisma } from '../src/db.js';
import { Role } from '@prisma/client';

describe('F-01: Authentication and Session Lifecycle', () => {
  const testOrganizerEmail = 'organizer.auth.test@kmutt.ac.th';
  const testParticipantEmail = 'participant.auth.test@kmutt.ac.th';
  const rawPassword = 'SecurePassword123!';

  beforeEach(async () => {
    // Clean test data
    await prisma.session.deleteMany();
    await prisma.registration.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    // Seed test users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    await prisma.user.create({
      data: {
        email: testOrganizerEmail,
        name: 'Test Organizer',
        passwordHash,
        role: Role.ORGANIZER,
      },
    });

    await prisma.user.create({
      data: {
        email: testParticipantEmail,
        name: 'Test Participant',
        passwordHash,
        role: Role.PARTICIPANT,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST-F01-01: Bcrypt password hashing check
  it('TEST-F01-01: stores passwords as salted bcrypt hashes and never matches plaintext', async () => {
    const user = await prisma.user.findUnique({ where: { email: testOrganizerEmail } });
    expect(user).toBeDefined();
    expect(user!.passwordHash).toMatch(/^\$2[ab]\$10\$/);
    expect(user!.passwordHash).not.toEqual(rawPassword);

    const isMatch = await bcrypt.compare(rawPassword, user!.passwordHash);
    expect(isMatch).toBe(true);

    const isFalseMatch = await bcrypt.compare('WrongPassword', user!.passwordHash);
    expect(isFalseMatch).toBe(false);
  });

  // TEST-F01-02: Valid login sets 64-hex cookie, creates DB session with 8h expiry, and GET /api/auth/me works
  it('TEST-F01-02: logs in with valid credentials, sets sid cookie, creates session row, and accesses /api/auth/me', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testOrganizerEmail, password: rawPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user).toBeDefined();
    expect(loginRes.body.user.email).toBe(testOrganizerEmail);
    expect(loginRes.body.user.role).toBe(Role.ORGANIZER);
    expect(loginRes.body.user.passwordHash).toBeUndefined();

    // Check Set-Cookie
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    const sidCookie = cookies.find((c: string) => c.startsWith('sid='));
    expect(sidCookie).toBeDefined();
    const sidMatch = sidCookie!.match(/sid=([a-f0-9]{64})/);
    expect(sidMatch).toBeTruthy();
    const sidToken = sidMatch![1];

    // Check Session table in DB
    const sessionInDb = await prisma.session.findUnique({ where: { id: sidToken } });
    expect(sessionInDb).toBeDefined();
    expect(sessionInDb!.userId).toBe(loginRes.body.user.id);
    const ttlHours = (sessionInDb!.expiresAt.getTime() - sessionInDb!.createdAt.getTime()) / (1000 * 60 * 60);
    expect(ttlHours).toBeCloseTo(8, 0.1);

    // Call GET /api/auth/me with cookie
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `sid=${sidToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testOrganizerEmail);
    expect(meRes.body.user.passwordHash).toBeUndefined();
  });

  // TEST-F01-03: Invalid credentials reject with 401 and generic message
  it('TEST-F01-03: rejects invalid password or unknown email with 401 without creating session', async () => {
    const badPasswordRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testOrganizerEmail, password: 'WrongPassword' });

    expect(badPasswordRes.status).toBe(401);
    expect(badPasswordRes.body.error).toBe('Invalid email or password');

    const badEmailRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@kmutt.ac.th', password: rawPassword });

    expect(badEmailRes.status).toBe(401);
    expect(badEmailRes.body.error).toBe('Invalid email or password');

    const sessionsCount = await prisma.session.count();
    expect(sessionsCount).toBe(0);
  });

  // TEST-F01-04: Unauthenticated access to protected endpoint returns 401
  it('TEST-F01-04: rejects GET /api/auth/me with 401 when unauthenticated or using invalid token', async () => {
    const noCookieRes = await request(app).get('/api/auth/me');
    expect(noCookieRes.status).toBe(401);
    expect(noCookieRes.body.error).toBe('Authentication required');

    const bogusCookieRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'sid=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    expect(bogusCookieRes.status).toBe(401);
    expect(bogusCookieRes.body.error).toBe('Authentication required');
  });

  // TEST-F01-05: Logout invalidates session and prevents replay
  it('TEST-F01-05: logs out active session and prevents token replay', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testParticipantEmail, password: rawPassword });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const sidCookie = cookies.find((c: string) => c.startsWith('sid='))!;
    const sidToken = sidCookie.match(/sid=([a-f0-9]{64})/)![1];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', `sid=${sidToken}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logged out');

    // Confirm session row deleted from PostgreSQL
    const sessionInDb = await prisma.session.findUnique({ where: { id: sidToken } });
    expect(sessionInDb).toBeNull();

    // Replay old cookie
    const replayRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `sid=${sidToken}`);
    expect(replayRes.status).toBe(401);
  });

  // TEST-F01-06: Expired session returns 401
  it('TEST-F01-06: rejects expired session with 401', async () => {
    const user = await prisma.user.findUnique({ where: { email: testParticipantEmail } });
    const expiredSid = crypto.randomBytes(32).toString('hex');

    await prisma.session.create({
      data: {
        id: expiredSid,
        userId: user!.id,
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 min ago
      },
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `sid=${expiredSid}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  // TEST-F01-08: Empty or missing fields return 400 Bad Request
  it('TEST-F01-08: rejects missing or empty email/password with 400 Bad Request', async () => {
    const emptyEmailRes = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: rawPassword });
    expect(emptyEmailRes.status).toBe(400);

    const emptyPasswordRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testOrganizerEmail, password: '' });
    expect(emptyPasswordRes.status).toBe(400);
  });
});
