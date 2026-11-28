# Sprint 2 Feature Engineering Contract — F-05: Participant Registration Cancellation and Seat Release

- **Feature ID:** `F-05`
- **Feature Name:** Participant Registration Cancellation and Seat Release
- **Target Sprint:** Sprint 2 (Deliverable 2)
- **Linked Requirements:** `FR-07`, `FR-08`, `BR-04`, `BR-05`, `BR-06`, `BR-07`, `NFR-02`, `NFR-03`, `NFR-04`, `AD-05`
- **Linked Issue:** `#42`
- **Contract Version:** `v1.0` (Pre-implementation specification)

---

## 1. Feature-Level Software Design Specification (Feature SDS)

### 1.1 Overview and Workflow
`F-05` enables an authenticated `PARTICIPANT` to cancel their own `ACTIVE` registration before the event starts (and before `registrationDeadline` if configured under `F-06`), releasing the reserved seat back to `remainingSeats` and allowing re-registration if seats remain (`AD-05`):

1. **Cancel Registration (`POST /api/registrations/:id/cancel`):**
   - Requires an authenticated `PARTICIPANT` (`BR-06`).
   - Runs inside an interactive PostgreSQL transaction (`prisma.$transaction`) that locks the target `Event` row (`SELECT id, status, "startAt", "registrationDeadline" FROM "Event" WHERE id = $1::uuid FOR UPDATE`) after locating the `Registration` row so cancellation and concurrent registration requests are serialized (`BR-04`, `NFR-03`).
   - Verifies the registration exists (otherwise `404 Not Found`).
   - Verifies strict ownership: `registration.userId === currentUser.id` (`BR-07`); if owned by another participant, rejects with `403 Forbidden` without mutating state.
   - Verifies current status is `ACTIVE`; if already `CANCELLED`, rejects with `409 Conflict` (`"Registration is already cancelled"`).
   - Verifies cancellation cutoff (`FR-07`, `FR-08`):
     - If `now >= event.startAt`, rejects with `409 Conflict` (`"Cannot cancel registration after event has started"`).
     - If `event.registrationDeadline !== null && now > event.registrationDeadline`, rejects with `409 Conflict` (`"Cannot cancel registration after registration deadline"`).
   - Updates `Registration.status = 'CANCELLED'` and sets `Registration.cancelledAt = now()`, committing atomically and returning `200 OK`.
2. **Seat Release & Re-Registration (`AD-05`):**
   - Because `activeRegistrationsCount` counts only rows with `status = 'ACTIVE'`, cancelling immediately increases `remainingSeats` by `1` across `GET /api/events`, `GET /api/events/:id`, and `GET /api/events/:id/registrations` (organizer roster excludes `CANCELLED` rows).
   - Replacing the Sprint 1 composite unique constraint `@@unique([eventId, userId])` with a PostgreSQL partial unique index `ON "Registration"("eventId", "userId") WHERE status = 'ACTIVE'` (`AD-05`) allows a participant who cancelled to register again (`POST /api/events/:id/registrations`) as a new `ACTIVE` row if seats remain, while still blocking duplicate `ACTIVE` registrations (`BR-05`).
3. **Own Registrations History (`GET /api/registrations/me`):**
   - Returns **both `ACTIVE` and `CANCELLED`** registrations belonging to `currentUser.id` ordered by `createdAt DESC`, including `status` and `cancelledAt` (`string | null`), so the participant retains visible cancellation history.

### 1.2 Validation, Boundary Cases, and Permissions
- **Ownership & Role (`BR-06`, `BR-07`, `NFR-02`):**
  - Unauthenticated call → `401 Unauthorized`.
  - `ORGANIZER` calling `POST /api/registrations/:id/cancel` → `403 Forbidden`.
  - `Participant B` calling `POST /api/registrations/:id/cancel` on `Participant A`'s registration → `403 Forbidden`; `Participant A`'s registration remains `ACTIVE`.
- **State & Time Boundaries:**
  - Non-existent registration UUID → `404 Not Found`.
  - Double-cancel (`status === 'CANCELLED'`) → `409 Conflict`; `remainingSeats` does not increment twice.
  - Cancel at or after `event.startAt` (`now >= startAt`) → `409 Conflict`; registration stays `ACTIVE`.
  - Cancel after `event.registrationDeadline` (`now > registrationDeadline`) → `409 Conflict`; registration stays `ACTIVE`.
- **Re-Registration & Concurrency (`BR-04`, `BR-05`, `AD-05`):**
  - After cancelling on a full event (`capacity = 1`), `remainingSeats` becomes `1`; either the same participant or another participant can claim the released seat.
  - Competing concurrent registrations for the released final seat remain serialized by `SELECT ... FOR UPDATE` (`NFR-03`).

---

## 2. UI, API, and Data Specifications

### 2.1 UI Behavior
- **My Registrations View (`/my-registrations`):**
  - Displays both `ACTIVE` and `CANCELLED` registrations with distinct status badges.
  - Shows a **Cancel Registration** button on `ACTIVE` registrations whose event has not started (and is before `registrationDeadline` if set).
  - Clicking **Cancel Registration** calls `POST /api/registrations/:id/cancel`, disables the button while in flight, refreshes registrations and event catalog counts, and renders inline error banners on `409` failures.
  - Updates `client/src/api.ts` (`cancelRegistration`) from the unused Sprint 1 `DELETE` stub to `POST /api/registrations/:id/cancel`.

### 2.2 API Endpoint Specifications

| Method & Path | Role / Access | Request Body | Success Response | Error Responses |
|---|---|---|---|---|
| `POST /api/registrations/:id/cancel` | `PARTICIPANT` (Owner only) | None | `200 OK`<br>`{ "registration": { "id": string, "eventId": string, "userId": string, "status": "CANCELLED", "createdAt": string, "cancelledAt": string } }` | `401` unauthenticated<br>`403` `ORGANIZER` role or non-owner `PARTICIPANT`<br>`404` registration not found<br>`409` already `CANCELLED`, `now >= startAt`, or `now > registrationDeadline` |
| `GET /api/registrations/me` *(extended)* | `PARTICIPANT` | None | `200 OK`<br>`{ "registrations": [ { "id": string, "eventId": string, "status": "ACTIVE" \| "CANCELLED", "createdAt": string, "cancelledAt": string \| null, "event": { ... } } ] }` | `401` unauthenticated<br>`403` `ORGANIZER` role |

### 2.3 Data Model and Migration (Additive + `AD-05` Partial Unique Index)
- **Enum Extension (Additive):** `ALTER TYPE "RegistrationStatus" ADD VALUE 'CANCELLED';`
- **Column Addition (Additive, Nullable):** `Registration.cancelledAt DateTime?` (`"cancelledAt" TIMESTAMP(3)`).
- **Partial Unique Index (`AD-05`, Same Migration Step):**
  - Drop Sprint 1 unique index `"Registration_eventId_userId_key"` and create `"Registration_eventId_userId_active_key"` in the same SQL migration:
    ```sql
    DROP INDEX IF EXISTS "Registration_eventId_userId_key";
    CREATE UNIQUE INDEX "Registration_eventId_userId_active_key"
      ON "Registration" ("eventId", "userId")
      WHERE "status" = 'ACTIVE';
    ```
  - Remove `@@unique([eventId, userId])` from `server/prisma/schema.prisma` (documented with inline comment referencing the partial unique index in SQL migration).
  - Update `server/src/routes/registrations.routes.ts` (`registerHandler`) from `findUnique({ where: { eventId_userId } })` to `findFirst({ where: { eventId: id, userId, status: RegistrationStatus.ACTIVE } })`.
- **Unchanged Layers:** `User`, `Session`, `auth.routes.ts`, `health.routes.ts`, and `seed.ts` require **no changes**.

---

## 3. Acceptance Criteria (`AC`)

| AC ID | Criterion (Observable Expected Outcome) | Linked Req |
|---|---|---|
| **AC-F05-01** | Given an authenticated `PARTICIPANT` holding an `ACTIVE` registration for a future event (before `startAt` and before `registrationDeadline` if set), when `POST /api/registrations/:id/cancel` is called, then the server responds `200 OK`, updates `status = 'CANCELLED'` and non-null `cancelledAt` in PostgreSQL, increases `remainingSeats` by `1`, and removes the participant from the organizer's active roster (`GET /api/events/:id/registrations`). | `FR-07`, `BR-04`, `NFR-04` |
| **AC-F05-02** | Given a registration that is already `CANCELLED`, when the owning `PARTICIPANT` calls `POST /api/registrations/:id/cancel` again, then the server responds `409 Conflict` and `remainingSeats` remains unchanged. | `FR-07`, `BR-04` |
| **AC-F05-03** | Given an `ACTIVE` registration for an event whose `startAt <= now`, when the owning `PARTICIPANT` calls `POST /api/registrations/:id/cancel`, then the server responds `409 Conflict` and the registration remains `ACTIVE`. | `FR-07` |
| **AC-F05-04** | Given a `PARTICIPANT` who cancelled their registration for a `PUBLISHED` event with `remainingSeats >= 1`, when the same `PARTICIPANT` calls `POST /api/events/:id/registrations`, then a new `ACTIVE` registration is created (`201 Created`), while a subsequent duplicate registration still returns `409 Conflict` (`BR-05`). | `FR-07`, `BR-05`, `AD-05` |
| **AC-F05-05** | Given a full `PUBLISHED` event (`capacity = 1`) where `Participant A` cancels their `ACTIVE` registration, when `Participant B` (or competing participants concurrently) calls `POST /api/events/:id/registrations`, then exactly one registration succeeds (`201 Created`) and `activeRegistrationsCount` never exceeds `capacity`. | `FR-07`, `BR-04`, `NFR-03` |
| **AC-F05-06** | Given `Participant A` and `Participant B`, when `Participant B` calls `POST /api/registrations/:id/cancel` on `Participant A`'s registration, or an `ORGANIZER` calls it, or an unauthenticated client calls it, then the server responds `403 Forbidden` (or `401 Unauthorized`) and `Participant A`'s registration remains `ACTIVE`. | `BR-06`, `BR-07`, `NFR-02` |
| **AC-F05-07** | Given a `PARTICIPANT` with both `ACTIVE` and `CANCELLED` registrations, when calling `GET /api/registrations/me`, then the response returns `200 OK` including both statuses and `cancelledAt` (and never exposes another participant's registrations). | `FR-05`, `FR-07`, `BR-07` |

---

## 4. Software Test Specification (`STS`)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
|---|---|---|---|---|---|
| **TEST-F05-01** | `AC-F05-01`, `AC-F05-07` | API/DB Integration | `PUBLISHED` future event (`capacity: 2`); `Participant A` registered (`ACTIVE`) | Call `POST /api/registrations/:id/cancel`, then `GET /api/events/:eventId`, `GET /api/events/:eventId/registrations` (as Owner), and `GET /api/registrations/me` | Cancel returns `200` (`status: "CANCELLED"`, non-null `cancelledAt`); `remainingSeats` restores from `1` to `2`; active roster count becomes `0`; `/registrations/me` includes the `CANCELLED` record |
| **TEST-F05-02** | `AC-F05-02` | API/DB Integration | Registration already `CANCELLED` | Call `POST /api/registrations/:id/cancel` a second time | Returns `409 Conflict`; `remainingSeats` unchanged |
| **TEST-F05-03** | `AC-F05-03` | API/DB Integration | `PUBLISHED` event whose `startAt` is in the past; `Participant A` holds `ACTIVE` registration | Call `POST /api/registrations/:id/cancel` | Returns `409 Conflict`; DB row stays `ACTIVE` with `cancelledAt = null` |
| **TEST-F05-04** | `AC-F05-04` | API/DB Integration | `Participant A` registered then cancelled on `Event 1` (`capacity: 2`) | `Participant A` calls `POST /api/events/:id/registrations` once, then a second time | First re-registration returns `201 Created` (`ACTIVE`); second attempt returns `409 Conflict`; DB has 1 `CANCELLED` row and 1 `ACTIVE` row |
| **TEST-F05-05** | `AC-F05-05` | API Concurrency Integration | `PUBLISHED` event (`capacity: 1`) filled by `Participant A` | `Participant A` cancels; then 5 participants (`P1..P5`) fire `POST /api/events/:id/registrations` concurrently via `Promise.all` | Exactly 1 returns `201 Created`, 4 return `409 Conflict`; DB has exactly 1 `ACTIVE` registration |
| **TEST-F05-06** | `AC-F05-06` | API/DB Integration | `Participant A` owns `ACTIVE` registration `R1`; `Participant B` and `ORGANIZER` logged in; unauthenticated client | Call `POST /api/registrations/R1/cancel` as `Participant B`, as `ORGANIZER`, and without cookie | `403`, `403`, and `401` respectively; `R1` remains `ACTIVE` in PostgreSQL |
| **TEST-F05-07** | `AC-F05-01`, `AC-F05-07` | UI / Integration | Logged-in `PARTICIPANT` on My Registrations screen | Click **Cancel Registration** on an `ACTIVE` registration | Calls `POST /api/registrations/:id/cancel`, updates badge to `CANCELLED`, and refreshes available seats |

---

## 5. Impact on Sprint 1 Behavior & Regression Protection

- **Sprint 1 Behaviors That Must Remain Unchanged:**
  - `POST /api/events/:id/registrations` continues to enforce `BR-03` (`DRAFT` → `404`), `BR-04` (full capacity → `409`, last-seat lock), `BR-05` (duplicate `ACTIVE` → `409`), and `BR-06` (`ORGANIZER` → `403`).
  - `PATCH /api/events/:id/capacity` (`BR-01`) continues to compare `newCapacity` against `ACTIVE` registrations only (cancelled registrations do not block capacity reduction).
  - `GET /api/events/:id/registrations` (`F-04`) continues to list only `ACTIVE` registrants and never exposes `passwordHash`.
- **Protecting Sprint 1 Regression Suites:**
  - `server/tests/registrations.test.ts` (6 tests including `TEST-F03-04` concurrency), `server/tests/events.test.ts` (6 tests), `server/tests/roster-and-health.test.ts` (5 tests), `server/tests/auth.test.ts` (7 tests), `server/tests/seed-config.test.ts` (9 tests), `client/src/App.test.tsx` (2 tests), `client/src/demoLogin.test.ts` (3 tests).

---

## 6. Definition of Done (DoD) and Revision History

### 6.1 Definition of Done
1. Pre-implementation contract reviewed and merged into `staging` prior to implementation.
2. Failing tests (`TEST-F05-01`..`TEST-F05-07`) committed as a RED commit with raw log saved in `docs/evidence/f-05-red.txt`.
3. Additive SQL migration (with partial unique index replacing `Registration_eventId_userId_key`) verified on local PostgreSQL containing existing Sprint 1 rows.
4. Implementation committed as a separate GREEN commit with full server + client regression suites passing (`docs/evidence/f-05-green.txt`).
5. Reviewed and approved by teammate on GitHub PR into `staging`.

### 6.2 Contract Revision History

| Version | Date | Author | Summary of Change |
|---|---|---|---|
| `v1.0` | 2026-11-28 | Pimchaya Suprateravarnit | Initial pre-implementation contract for `F-05: Participant Registration Cancellation and Seat Release` (aligned with `FR-07`, `FR-08`, and `AD-05`). |
