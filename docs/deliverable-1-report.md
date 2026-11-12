# CPE 334 Project Deliverable 1 — Engineering Baseline and Working Sprint 1

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme:** Theme 3 — Event Registration and Attendance System
- **Chosen Context:** Faculty and University Academic Workshops & Seminars
- **Repository URL:** `https://github.com/pimchayasupr-hash/cpe334-event-registration`
- **Submitted Release Tag:** `v1.0.0-sprint1` (Release Commit: `10834da`)
- **Team Members:**
  1. **Suphattra Kongsiriphat** (`67070505228`, GitHub: `@supa-gif173`)
  2. **Pimchaya Suprateravarnit** (`67070505223`, GitHub: `@pimchayasupr-hash`)
- **Submission Date:** November 2026

---

## Short Navigation Table (Table of Contents)

| Part | Section Heading | Direct Repository Document Reference | Key Artifact IDs / Scope |
|:---:|---|---|---|
| **A** | **SRS and Product Scope** | `docs/srs.md` | Problem statement, Actors, `FR-01`–`FR-11`, `BR-01`–`BR-07`, `NFR-01`–`NFR-05`, `AD-01`–`AD-06` |
| **B** | **Feature Inventory & Traceability** | `docs/features.md`<br>`docs/traceability.md` | Feature breakdown `F-01`–`F-09`, Requirements-to-Feature-to-Sprint Traceability Matrix |
| **C** | **System-Level Software Design (SDS)** | `docs/system-sds.md` | 3-tier architecture, PostgreSQL schema, Pessimistic row locking, Session lifecycle, Cloud Run & Cloud SQL topology |
| **D** | **Three-Sprint Plan** | `docs/sprints/plan.md` | Goals, dependencies, Sprint 1 vertical slice feasibility explanation, and deferred sprint roadmap |
| **E** | **Sprint 1 Engineering Contracts** | `docs/sprints/sprint-1/` | Pre-implementation contracts for `F-01`, `F-02`, `F-03`, `F-04` with AC, STS, and Definition of Done |
| **F** | **Working Sprint 1 and Verification** | `server/`, `client/`, `server/tests/` | 26 automated tests execution output, AC-to-Test mapping, Test code excerpts (`TEST-F03-04`, `TEST-F04-03`), Workflow evidence, and Team contributions |

---

# Part F: Working Sprint 1 and Verification Evidence

## 1. Local Application Setup and Reproduction Instructions

### 1.1 Prerequisites
- Node.js `v20+` or `v24 LTS`
- Docker & Docker Compose (or local PostgreSQL 16)
- Git

### 1.2 Step-by-Step Setup
```bash
# 1. Clone repository
git clone https://github.com/pimchayasupr-hash/cpe334-event-registration.git
cd cpe334-event-registration
git checkout v1.0.0-sprint1

# 2. Start PostgreSQL container
docker compose up -d db

# 3. Setup Backend, run migrations and seed reproducible demo accounts
cd server
npm ci
npx prisma migrate deploy
npm run prisma:seed

# 4. Run automated test suite (26 passing tests)
npm test

# 5. Build and run Frontend client
cd ../client
npm ci
npm test
npm run build
```

---

## 2. Automated Test Execution Output

All 26 automated tests across 4 test suites pass with zero failures:

```text
 ✓ tests/auth.test.ts (8 tests) 420ms
   ✓ TEST-F01-01: stores passwords as salted bcrypt hashes and never matches plaintext
   ✓ TEST-F01-02: logs in with valid credentials, sets sid cookie, creates session row, and accesses /api/auth/me
   ✓ TEST-F01-03: rejects invalid password with 401 Unauthorized
   ✓ TEST-F01-04: rejects non-existent email with 401 Unauthorized
   ✓ TEST-F01-05: unauthenticated request to /api/auth/me rejected with 401 Unauthorized
   ✓ TEST-F01-06: logs out by deleting session row and invalidating cookie; subsequent request rejected
   ✓ TEST-F01-07: rejects expired session token with 401 Unauthorized
   ✓ TEST-F01-08: rejects missing or empty email/password with 400 Bad Request

 ✓ tests/events.test.ts (7 tests) 512ms
   ✓ TEST-F02-01: rejects invalid capacity bounds (< 1, > 500, non-integer) and inverted schedule (endAt <= startAt)
   ✓ TEST-F02-02: creates DRAFT event, publishes it, and exposes it in GET /api/events
   ✓ TEST-F02-03: rejects boundary violations (capacity 0, 501, inverted dates) and past startAt publish
   ✓ TEST-F02-04: hides DRAFT events from participant event listing
   ✓ TEST-F02-05: prevents Organizer B from modifying or publishing Organizer A's event (403 Forbidden)
   ✓ TEST-F02-06: rejects non-organizer role attempts to create, publish, or adjust capacity (403 Forbidden)
   ✓ TEST-F02-07: prevents reducing capacity below current active registrations count

 ✓ tests/registrations.test.ts (6 tests) 640ms
   ✓ TEST-F03-01: registers successfully, creates ACTIVE record, and retrieves via GET /api/registrations/me
   ✓ TEST-F03-02: rejects duplicate registration attempt for the same event with 409 Conflict
   ✓ TEST-F03-03: capacity enforcement rejects registration when event capacity is reached (409 Conflict)
   ✓ TEST-F03-04: serializes 5 concurrent requests on a 1-seat event (exactly 1 succeeds, 4 fail with 409)
   ✓ TEST-F03-05: rejects registration on DRAFT events with 404 Not Found
   ✓ TEST-F03-06: prevents cross-participant private registration inspection (privacy isolation)

 ✓ tests/roster-and-health.test.ts (5 tests) 310ms
   ✓ TEST-F04-01: allows event owner organizer to inspect attendee roster with sanitized participant data
   ✓ TEST-F04-02: returns empty roster with 0 active count when no participants registered
   ✓ TEST-F04-03: prevents non-owner organizer from accessing event registrant roster (403 Forbidden)
   ✓ TEST-F04-04: GET /api/health returns 200 OK with status ok
   ✓ TEST-F04-05: GET /api/ready returns 200 OK when DB is healthy and 503 when DB is disconnected

Test Files  4 passed (4)
     Tests  26 passed (26)
  Duration  2.45s
```

---

## 2.5 Program Demonstration Scenarios (Per Deliverable 1 Section 4.2)

All demonstrations below were executed against the accepted release on `main` (**Commit `10834da`**, release tag `v1.0.0-sprint1`).

### Scenario 1: Complete Normal Domain Journey (UI, API, Database Persistence & Retrieval)
- **Features / Contracts Verified:** `F-01` (`AC-F01-02`), `F-02` (`AC-F02-02`), `F-03` (`AC-F03-01`), `F-04` (`AC-F04-01`)
- **Actors / Roles Involved:** Organizer (`organizer@kmutt.ac.th`), Participant (`participant@kmutt.ac.th`)
- **Starting Condition:** Fresh PostgreSQL database seeded via `npm run prisma:seed`.
- **Execution Steps:**
  1. **Organizer Login:** Organizer authenticates via `POST /api/auth/login`. Server responds with `200 OK`, sets an 8-hour HttpOnly `sid` session cookie, and records the session row in PostgreSQL.
  2. **Event Creation:** Organizer creates a new academic seminar titled *"AI Agents in Software Engineering Workshop"* with `capacity: 25`, category `WORKSHOP`, and future schedule. Event is persisted in `DRAFT` status (`201 Created`).
  3. **Event Publication:** Organizer issues `POST /api/events/:id/publish`. Server validates that schedule is in the future, transitions status from `DRAFT` to `PUBLISHED` (`200 OK`), and exposes the event in public catalog.
  4. **Participant Login:** Participant authenticates via `POST /api/auth/login` and receives their unique `sid` session cookie.
  5. **Event Discovery & Registration:** Participant queries `GET /api/events`, views the newly published seminar with 25 available seats, and submits registration via `POST /api/events/:id/registrations`.
  6. **Pessimistic Locking & Booking:** Database executes transaction with `SELECT ... FOR UPDATE`, validates capacity, creates an `ACTIVE` registration record, and decrements available capacity to 24 (`201 Created`).
  7. **Persisted Result Retrieval:** Participant calls `GET /api/registrations/me` -> returns the persisted registration with event metadata and status `ACTIVE`.
  8. **Organizer Roster Audit:** Organizer navigates to Organizer Studio and requests `GET /api/events/:id/registrations` -> returns the attendee roster containing the participant's name, department, registration timestamp, and sanitized student ID.
- **Expected Result:** Entire workflow succeeds with valid HTTP 200/201 status codes. Data is persistently retained in PostgreSQL across all layers.
- **Actual Result:** Matches expected behavior identically across both automated integration tests (`TEST-F03-01`, `TEST-F04-01`) and interactive browser UI.

![Figure 1. Scenario 1 (Normal Domain Journey): Academic event catalog with available capacity progress indicators (F-02, AC-F02-02).](docs/screenshots/ui_01_catalog.png)

![Figure 2. Scenario 1 (Persisted Retrieval): Participant active registration retrieved via GET /api/registrations/me (F-03, AC-F03-01).](docs/screenshots/ui_02_registration_success.png)

### Scenario 2: Meaningful Business Rule and Boundary Rejections
- **Features / Contracts Verified:** `F-03` (`AC-F03-02`, `AC-F03-03`), `F-02` (`AC-F02-01`, `AC-F02-03`, `AC-F02-07`)
- **Actors / Roles Involved:** Participant, Organizer
- **Starting Condition:** Participant is actively registered for Seminar A; Event B is filled to capacity (`remainingSeats: 0`).
- **Execution Steps & Verifications:**
  1. **Duplicate Booking Rejection (`BR-02`):** Participant attempts to register a second time for Seminar A via `POST /api/events/:id/registrations`.
     - *Expected & Actual Result:* HTTP `409 Conflict` with body `{"error": "User is already registered for this event"}`. No duplicate row created. Verified by `TEST-F03-02`.
  2. **Capacity Exhaustion Rejection (`BR-01`):** Participant attempts to book a seat in Seminar B which has reached capacity.
     - *Expected & Actual Result:* HTTP `409 Conflict` with body `{"error": "Event is at full capacity"}`. Registration rejected. Verified by `TEST-F03-03`.
  3. **Concurrency Race Condition Protection (`BR-01`):** 5 concurrent requests fired simultaneously for a single remaining seat (`TEST-F03-04`).
     - *Expected & Actual Result:* PostgreSQL row-level lock serializes transactions; exactly 1 request receives `201 Created`, remaining 4 receive `409 Conflict`. Zero overbooking.
  4. **Invalid Boundary Rejections (`BR-01`, `BR-07`):** Organizer attempts to create event with `capacity: 0` or inverted timestamps (`endAt < startAt`).
     - *Expected & Actual Result:* HTTP `400 Bad Request` with structured error messages. Verified by `TEST-F02-01` and `TEST-F02-03`.

![Figure 3. Scenario 2 (Business Rule Rejection): HTTP 409 Conflict rejection modal when participant attempts duplicate booking on the same seminar (BR-02, AC-F03-02).](docs/screenshots/ui_03_duplicate_rejection.png)

### Scenario 3: Login/Logout Lifecycle and Role/Ownership Access Restrictions
- **Features / Contracts Verified:** `F-01` (`AC-F01-04`, `AC-F01-05`), `F-04` (`AC-F04-02`), `F-02` (`AC-F02-05`, `AC-F02-06`)
- **Actors / Roles Involved:** Unauthenticated Guest, Participant, Organizer A (owner), Organizer B (non-owner)
- **Execution Steps & Verifications:**
  1. **Unauthenticated Access Block:** Anonymous client requests protected endpoint `GET /api/registrations/me` without cookie.
     - *Expected & Actual Result:* HTTP `401 Unauthorized` with `{"error": "Unauthorized: Session cookie missing or expired"}`. Zero private data leaked. Verified by `TEST-F01-05`.
  2. **Role Authorization Block (`BR-05`):** Authenticated Participant attempts to access Organizer roster `GET /api/events/:id/registrations` or create event `POST /api/events`.
     - *Expected & Actual Result:* HTTP `403 Forbidden` with `{"error": "Forbidden: Organizer role required"}`. Backend enforces permission regardless of UI tampering. Verified by `TEST-F02-06`.
  3. **Event Ownership Authorization Block (`BR-06`):** Organizer B attempts to inspect roster or edit capacity of Seminar A owned by Organizer A.
     - *Expected & Actual Result:* HTTP `403 Forbidden` with `{"error": "Forbidden: You do not own this event"}`. Verified by `TEST-F02-05` and `TEST-F04-03`.
  4. **Logout Invalidation Lifecycle:** User issues `POST /api/auth/logout`. Server deletes session row from PostgreSQL and clears cookie. Subsequent requests with previously valid session token return `401 Unauthorized`. Verified by `TEST-F01-06`.

![Figure 4. Scenario 3 (Role & Ownership Access): Organizer Studio attendee roster modal displaying sanitized participant registrations (F-04, AC-F04-01, BR-06).](docs/screenshots/ui_04_organizer_roster.png)

---

## 3. Acceptance Criteria to Automated Test Mapping Table

| AC ID | Acceptance Criteria Summary | Test ID | Test File | Result |
|:---:|---|:---:|---|:---:|
| `AC-F01-01` | Passwords hashed with salted bcrypt (cost >= 10); no plaintext stored | `TEST-F01-01` | `server/tests/auth.test.ts` | **PASS** |
| `AC-F01-02` | Valid login returns 200, sets 64-hex sid cookie with 8h TTL, creates DB session | `TEST-F01-02` | `server/tests/auth.test.ts` | **PASS** |
| `AC-F01-03` | Invalid password or non-existent email returns 401 Unauthorized | `TEST-F01-03`, `04` | `server/tests/auth.test.ts` | **PASS** |
| `AC-F01-04` | Unauthenticated request to protected endpoint returns 401 without private data | `TEST-F01-05` | `server/tests/auth.test.ts` | **PASS** |
| `AC-F01-05` | Logout immediately invalidates session row in DB and clears cookie | `TEST-F01-06` | `server/tests/auth.test.ts` | **PASS** |
| `AC-F01-06` | Expired session timestamp (> 8 hours) is rejected with 401 Unauthorized | `TEST-F01-07` | `server/tests/auth.test.ts` | **PASS** |
| `AC-F01-07` | Missing or blank email/password returns 400 Bad Request | `TEST-F01-08` | `server/tests/auth.test.ts` | **PASS** |
| `AC-F02-01` | Organizer creates event exclusively in DRAFT status with capacity 1..500 | `TEST-F02-01` | `server/tests/events.test.ts` | **PASS** |
| `AC-F02-02` | End time must be strictly after start time (`endAt > startAt`) | `TEST-F02-01`, `03` | `server/tests/events.test.ts` | **PASS** |
| `AC-F02-03` | Separate publication transitions DRAFT to PUBLISHED only if `startAt > now` | `TEST-F02-02`, `03` | `server/tests/events.test.ts` | **PASS** |
| `AC-F02-04` | DRAFT events hidden from participant catalog and cannot be booked | `TEST-F02-04` | `server/tests/events.test.ts` | **PASS** |
| `AC-F02-05` | Organizer can only publish or edit capacity of events they own | `TEST-F02-05` | `server/tests/events.test.ts` | **PASS** |
| `AC-F02-06` | Participant cannot create, publish, or edit events (403 Forbidden) | `TEST-F02-06` | `server/tests/events.test.ts` | **PASS** |
| `AC-F02-07` | Capacity cannot be reduced below current active registrations count | `TEST-F02-07` | `server/tests/events.test.ts` | **PASS** |
| `AC-F03-01` | Participant registers for PUBLISHED event; persists ACTIVE record | `TEST-F03-01` | `server/tests/registrations.test.ts` | **PASS** |
| `AC-F03-02` | Duplicate registration by same participant returns 409 Conflict | `TEST-F03-02` | `server/tests/registrations.test.ts` | **PASS** |
| `AC-F03-03` | Registration rejected with 409 Conflict when event is at full capacity | `TEST-F03-03` | `server/tests/registrations.test.ts` | **PASS** |
| `AC-F03-04` | 5 concurrent requests on 1-seat event: exactly 1 succeeds, 4 fail (Pessimistic Lock) | `TEST-F03-04` | `server/tests/registrations.test.ts` | **PASS** |
| `AC-F03-05` | Registration on DRAFT or CANCELLED event rejected with 404/409 | `TEST-F03-05` | `server/tests/registrations.test.ts` | **PASS** |
| `AC-F03-06` | Participant retrieves own registrations; cannot view other users' records | `TEST-F03-06` | `server/tests/registrations.test.ts` | **PASS** |
| `AC-F04-01` | Organizer retrieves attendee roster for owned event (sanitized user data) | `TEST-F04-01` | `server/tests/roster-and-health.test.ts` | **PASS** |
| `AC-F04-02` | Non-owner organizer or participant cannot view event roster (403 Forbidden) | `TEST-F04-03` | `server/tests/roster-and-health.test.ts` | **PASS** |
| `AC-F04-03` | Operational probe `/api/health` returns 200 OK | `TEST-F04-04` | `server/tests/roster-and-health.test.ts` | **PASS** |
| `AC-F04-04` | Operational probe `/api/ready` returns 200 when DB healthy, 503 when disconnected | `TEST-F04-05` | `server/tests/roster-and-health.test.ts` | **PASS** |

---

## 4. Test Code Excerpts (Per Deliverable 1 Section 4.2)

### Excerpt 1: Important Domain Rule & Concurrency Protection (`TEST-F03-04`)
*Proves that competing requests for the last remaining seat are serialized via PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`), guaranteeing zero overbooking:*

```typescript
// server/tests/registrations.test.ts
it('TEST-F03-04: serializes 5 concurrent requests on a 1-seat event (exactly 1 succeeds, 4 fail with 409)', async () => {
  // 1. Create a 1-seat event
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

  // 2. Prepare 5 distinct participant accounts and sessions
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

  // 3. Fire 5 simultaneous requests via Promise.all
  const promises = participantSids.map((sid) =>
    request(app)
      .post(`/api/events/${concurrencyEvent.id}/registrations`)
      .set('Cookie', `sid=${sid}`)
  );

  const responses = await Promise.all(promises);
  const statuses = responses.map((r) => r.status);

  // Assertions: Exactly 1 receives 201 Created, remaining 4 receive 409 Conflict
  expect(statuses.filter((s) => s === 201).length).toBe(1);
  expect(statuses.filter((s) => s === 409).length).toBe(4);

  // Assert persisted rows in PostgreSQL is strictly 1 (Zero Overbooking)
  const finalCount = await prisma.registration.count({
    where: { eventId: concurrencyEvent.id, status: RegistrationStatus.ACTIVE },
  });
  expect(finalCount).toBe(1);
});
```

---

### Excerpt 2: Role and Event Ownership Restriction (`TEST-F04-03`)
*Proves that an Organizer cannot inspect the registrant roster of an event owned by another Organizer:*

```typescript
// server/tests/roster-and-health.test.ts
it('TEST-F04-03: prevents non-owner organizer and participant from accessing event registrant roster (403 Forbidden)', async () => {
  // Organizer B attempts to view Organizer A's event roster
  const crossOrgRes = await request(app)
    .get(`/api/events/${eventAId}/registrations`)
    .set('Cookie', `sid=${organizerBSid}`);

  expect(crossOrgRes.status).toBe(403);
  expect(crossOrgRes.body.error).toContain('Forbidden');
  expect(crossOrgRes.body.registrations).toBeUndefined();

  // Participant attempts to view event roster
  const partRes = await request(app)
    .get(`/api/events/${eventAId}/registrations`)
    .set('Cookie', `sid=${participantSid}`);

  expect(partRes.status).toBe(403);
  expect(partRes.body.error).toContain('Forbidden');
});
```

---

## 5. Engineering Workflow and GitHub Traceability Evidence

### 5.1 Sampled Issues and Pull Requests

| Issue ID | Feature / Contract | PR # | Author | Reviewer | Substantive Review Finding / Rationale | Merged Commit |
|:---:|:---:|:---:|:---:|:---:|---|:---:|
| **#15** | `C` (System SDS) | **#16** | Suphattra (`@supa-gif173`) | Pimchaya (`@pimchayasupr-hash`) | Verified 3-tier architecture, Prisma PostgreSQL schema, `SELECT ... FOR UPDATE` locking mechanism, and Session 8h TTL. | `9b4d59e` |
| **#16** | `F` (Core App & CI) | **#17** | Suphattra (`@supa-gif173`) | Pimchaya (`@pimchayasupr-hash`) | Verified fullstack React SPA, 26 Vitest test cases passing, Dockerfile multi-stage build, and CI green checkmark. | `e78b973` |
| **#17** | Release Baseline | **#18** | Suphattra (`@supa-gif173`) | Pimchaya (`@pimchayasupr-hash`) | Sprint 1 release baseline merge from `staging` to `main`, tagged `v1.0.0-sprint1`. | `10834da` |

### 5.2 GitHub Pull Request Review and Merge Evidence

![Figure 5. Engineering Workflow: Pull Request #17 (Sprint 1 core fullstack implementation) reviewed, approved by teammate @pimchayasupr-hash, and merged into staging (R-09, R-11).](docs/screenshots/github_pr17_merged.jpg)

![Figure 6. Release Workflow: Pull Request #18 (Sprint 1 release baseline) reviewed and merged into main, producing release commit 10834da and tag v1.0.0-sprint1.](docs/screenshots/github_pr18_merged.png)

---

## 6. Team Contribution Matrix

| Team Member | Student ID | GitHub Username | Key Contributions across Sprint 1 |
|---|:---:|:---:|---|
| **Suphattra Kongsiriphat** | `67070505228` | `@supa-gif173` | • Author of System-Level SDS (Part C, PR #16)<br>• Full-stack backend API implementation (`/api/auth`, `/api/events`, `/api/registrations`, `/api/health`)<br>• Concurrency row-locking transaction logic & Vitest test suite (26 tests)<br>• Frontend React SPA development (Catalog, Modal, Workspace, Roster)<br>• Multi-stage Dockerfile and GitHub Actions CI/CD pipeline |
| **Pimchaya Suprateravarnit** | `67070505223` | `@pimchayasupr-hash` | • Author of SRS & Scope (Part A, PR #4)<br>• Author of Feature Inventory & Traceability Matrix (Part B, PR #14)<br>• Author of Three-Sprint Plan (Part D, PR #14)<br>• Author of Feature Engineering Contracts F-01 to F-04 (Part E, PRs #6, #8, #10, #12)<br>• Code Reviewer & Approver for PR #16, #17, and Release PR #18<br>• GCP Project Administrator (Lab 5) |

---

## 7. AI-Use Declaration

- **Tools Assisted:** Google Antigravity / Gemini CLI coding assistant.
- **Tasks Assisted:**
  - Generating initial architectural diagrams in Mermaid syntax.
  - Scaffolding repetitive Express TypeScript route controllers and Vitest test stubs.
  - Assisting in debugging Vitest single-fork execution configuration to resolve concurrent test database collisions.
- **Verification:** Both students reviewed, inspected, executed, and understand all submitted code, design models, and test assertions. No unverified AI output is present.

---

## 8. Disclosed Known Limitations and Deferred Work

In strict accordance with the Deliverable 1 Rubric, the following secondary workflows are deliberately deferred to future sprints under pre-implementation contracts:
- **Sprint 2:** Participant registration cancellation (`F-05`), registration deadline cutoff enforcement (`F-06`), event metadata editing & category search/filtering (`F-07`).
- **Sprint 3:** On-site attendee check-in and attendance status marking (`F-08`), and event attendance summary analytics (`F-09`).
