# Sprint 1 Feature Engineering Contract — F-03: Participant Event Registration, Capacity Enforcement, and Concurrency Protection

- **Feature ID:** `F-03`
- **Feature Name:** Participant Event Registration, Own Registrations View, Capacity Enforcement, and Last-Seat Concurrency Protection
- **Target Sprint:** Sprint 1 (Deliverable 1 Baseline)
- **Linked Requirements:** `FR-04`, `FR-05`, `BR-03`, `BR-04`, `BR-05`, `BR-06`, `BR-07`, `NFR-03`, `NFR-04`, `AD-05`
- **Contract Version:** `v1.0` (Pre-implementation specification)

---

## 1. Feature-Level Software Design Specification (Feature SDS)

### 1.1 Overview and Workflow
`F-03` allows authenticated `PARTICIPANT` users to register for `PUBLISHED` workshops/seminars and inspect their own persisted registrations while guaranteeing zero overbooking and zero duplicate active registrations:
1. **Submit Registration (`POST /api/events/:id/registrations`):**
   - Requires an authenticated `PARTICIPANT` (`BR-06`).
   - Runs inside an interactive PostgreSQL transaction (`prisma.$transaction`) that acquires a row-level exclusive lock on the target `Event` record (`SELECT id, status, capacity FROM "Event" WHERE id = $1 FOR UPDATE`) to serialize concurrent requests targeting the same event (`BR-04`, `NFR-03`).
   - Verifies that the event exists and has `status == 'PUBLISHED'` (if `DRAFT` or non-existent, rejects with `404 Not Found` / `409 Conflict` per `BR-03`).
   - Checks whether a registration already exists for `(eventId, userId)` (additionally enforced by the PostgreSQL composite unique constraint `@@unique([eventId, userId])` per `BR-05` and `AD-05`); if present, aborts with `409 Conflict` (`"Already registered for this event"`).
   - Counts `ACTIVE` registrations for `eventId`. If `activeCount >= event.capacity`, aborts with `409 Conflict` (`"Event is at full capacity"`).
   - Inserts a new `Registration` row with `status = 'ACTIVE'` and commits, returning `201 Created`.
2. **View Own Registrations (`GET /api/registrations/me`):**
   - Requires an authenticated `PARTICIPANT` (`BR-06`).
   - Queries `Registration` strictly filtered by `userId = currentUser.id` (`BR-07`), joined with the associated `Event` summary (`id`, `title`, `category`, `location`, `startAt`, `endAt`, `capacity`), ordered by `createdAt DESC`.

### 1.2 Validation, Boundary Cases, and Permissions
- **Full capacity boundary (`BR-04`):** When `activeCount == capacity - 1`, one registration succeeds (`activeCount` becomes `capacity`); the next registration attempt returns `409 Conflict`.
- **Last-seat concurrency (`BR-04`, `NFR-03`):** When 5 or more distinct `PARTICIPANT` sessions concurrently send `POST /api/events/:id/registrations` for an event with `1` remaining seat, row locking serializes the checks so exactly `1` request returns `201 Created` and all remaining requests return `409 Conflict`.
- **Duplicate registration (`BR-05`, `AD-05`):** A second request from the same `PARTICIPANT` for the same event returns `409 Conflict` without creating a second row. (Per `AD-05`, Sprint 1 has no cancellation; Sprint 2 will migrate the unique constraint to a partial index on `status = 'ACTIVE'`.)
- **Role & Privacy (`BR-06`, `BR-07`):** Unauthenticated calls return `401 Unauthorized`. `ORGANIZER` calls to `POST /api/events/:id/registrations` or `GET /api/registrations/me` return `403 Forbidden`. No endpoint allows a participant to query another user's `userId`.

---

## 2. UI, API, and Data Specifications

### 2.1 UI Behavior
- **Event Catalog & Detail (`/events`, `/events/:id`):** For `PARTICIPANT` users, shows a **Register** button when `remainingSeats > 0` and the user is not yet registered; shows an **"Already Registered"** badge if registered, or **"Full"** disabled state if `remainingSeats == 0`. Displays inline error alert if a `409 Conflict` occurs.
- **My Registrations Screen (`/my-registrations`):** Lists all events the logged-in `PARTICIPANT` has registered for, showing registration status (`ACTIVE`), timestamp, and event schedule/location (or an empty-state message when none exist).

### 2.2 API Endpoint Specifications

| Method & Path | Role / Access | Request Body | Success Response | Error Responses |
|---|---|---|---|---|
| `POST /api/events/:id/registrations` | `PARTICIPANT` | None (identity derived from server session) | `201 Created`<br>`{ "registration": { "id": string, "eventId": string, "userId": string, "status": "ACTIVE", "createdAt": string } }` | `401` unauthenticated<br>`403` `ORGANIZER` role<br>`404` event not found or `DRAFT`<br>`409` duplicate registration or full capacity |
| `GET /api/registrations/me` | `PARTICIPANT` | None | `200 OK`<br>`{ "registrations": [ { "id": string, "eventId": string, "status": "ACTIVE", "createdAt": string, "event": { "id": string, "title": string, "category": string, "location": string, "startAt": string, "endAt": string, "capacity": number } } ] }` | `401` unauthenticated<br>`403` `ORGANIZER` role |

### 2.3 Data Model and Constraints (Prisma / PostgreSQL)
- **`RegistrationStatus` Enum:** `ACTIVE` (Sprint 2 adds `CANCELLED`)
- **`Registration` Table:**
  - `id` (`UUID`, Primary Key)
  - `eventId` (`UUID`, Foreign Key -> `Event.id` `ON DELETE CASCADE`, Indexed)
  - `userId` (`UUID`, Foreign Key -> `User.id` `ON DELETE CASCADE`, Indexed)
  - `status` (`RegistrationStatus`, Not Null, default `'ACTIVE'`)
  - `createdAt` (`DateTime`, default `now()`)
  - **Composite Unique Constraint:** `@@unique([eventId, userId])` (`BR-05`, `AD-05`)

---

## 3. Acceptance Criteria (`AC`)

| AC ID | Criterion (Observable Expected Outcome) | Linked Req |
|---|---|---|
| **AC-F03-01** | Given an authenticated `PARTICIPANT` and a `PUBLISHED` event with `remainingSeats >= 1`, when `POST /api/events/:id/registrations` is called, then an `ACTIVE` registration row is persisted in PostgreSQL, `remainingSeats` decreases by 1, and the server responds `201 Created`. | `FR-04`, `NFR-04` |
| **AC-F03-02** | Given an authenticated `PARTICIPANT` who already has an `ACTIVE` registration for an event, when `POST /api/events/:id/registrations` is called again for the same event, then the server responds `409 Conflict` and only 1 registration row exists in PostgreSQL for `(eventId, userId)`. | `BR-05`, `AD-05` |
| **AC-F03-03** | Given a `PUBLISHED` event where `activeRegistrationsCount == capacity`, when another `PARTICIPANT` calls `POST /api/events/:id/registrations`, then the server responds `409 Conflict` and no new registration is stored. | `BR-04` |
| **AC-F03-04** | Given a `PUBLISHED` event with `capacity = 1` (or 1 seat remaining) and 5 distinct authenticated `PARTICIPANT` users submitting `POST /api/events/:id/registrations` concurrently, then exactly 1 request returns `201 Created`, 4 requests return `409 Conflict`, and PostgreSQL contains exactly 1 `ACTIVE` registration for that seat. | `BR-04`, `NFR-03` |
| **AC-F03-05** | Given a `DRAFT` event, when a `PARTICIPANT` calls `POST /api/events/:id/registrations`, then the request is rejected (`404 Not Found` or `409 Conflict`) and no registration is stored. | `BR-03` |
| **AC-F03-06** | Given `Participant A` and `Participant B` each having their own registrations, when `Participant A` calls `GET /api/registrations/me`, then the response returns `200 OK` containing only `Participant A`'s registrations and never includes `Participant B`'s records. | `FR-05`, `BR-07` |
| **AC-F03-07** | Given an authenticated `ORGANIZER` (or unauthenticated client), when calling `POST /api/events/:id/registrations` or `GET /api/registrations/me`, then the server responds `403 Forbidden` (or `401 Unauthorized`). | `BR-06`, `NFR-02` |

---

## 4. Software Test Specification (`STS`)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
|---|---|---|---|---|---|
| **TEST-F03-01** | `AC-F03-01`, `AC-F03-06` | API/DB Integration | `PUBLISHED` event (`capacity: 10`); logged-in `Participant A` | Call `POST /api/events/:id/registrations` then `GET /api/registrations/me` | `201 Created` on register; `GET /api/registrations/me` returns 1 item matching `eventId` and `userId = Participant A` |
| **TEST-F03-02** | `AC-F03-02` | API/DB Integration | `Participant A` already registered for `Event 1` | `Participant A` calls `POST /api/events/:id/registrations` a second time (and concurrent duplicate attempt) | Returns `409 Conflict`; DB query confirms count for `(eventId, Participant A)` is `1` |
| **TEST-F03-03** | `AC-F03-03` | API/DB Integration | `PUBLISHED` event with `capacity: 1` already filled by `Participant A` | `Participant B` calls `POST /api/events/:id/registrations` | Returns `409 Conflict`; DB active registration count remains `1` |
| **TEST-F03-04** | `AC-F03-04`, `NFR-03` | API Concurrency Integration | `PUBLISHED` event with `capacity: 1` (0 current registrations); 5 logged-in `PARTICIPANT` sessions (`P1`..`P5`) | Fire 5 simultaneous `POST /api/events/:id/registrations` requests via `Promise.all` | Exactly one status is `201`, four statuses are `409`, and `prisma.registration.count({ where: { eventId } }) === 1` |
| **TEST-F03-05** | `AC-F03-05` | API/DB Integration | `DRAFT` event in DB; logged-in `Participant A` | Call `POST /api/events/:draftId/registrations` | Rejected with `404 Not Found`; 0 registrations in DB |
| **TEST-F03-06** | `AC-F03-06`, `AC-F03-07` | API/DB Integration | `Participant A` registered for `Event 1`; `Participant B` registered for `Event 2`; logged-in `ORGANIZER` | `Participant A` calls `GET /api/registrations/me`; `ORGANIZER` calls `POST /api/events/:id/registrations` and `GET /api/registrations/me` | `Participant A` receives only `Event 1` registration; `ORGANIZER` receives `403 Forbidden` on both calls |
| **TEST-F03-07** | `AC-F03-01`, `AC-F03-06` | UI / E2E | Logged-in `PARTICIPANT` in browser; `PUBLISHED` event available | Click **Register** on event card, then navigate to **My Registrations** | Remaining seats decrement by 1, badge changes to **Registered**, and event appears in **My Registrations** |

---

## 5. Product Definition of Done (DoD) and Revision History

### 5.1 Definition of Done
1. Feature contract (`docs/sprints/sprint-1/f-03-registration-concurrency.md`) committed and reviewed prior to implementation.
2. Automated tests (`TEST-F03-01` through `TEST-F03-07`, including the parallel concurrency test `TEST-F03-04`) implemented using TDD (Red failing test commit followed by Green implementation commit).
3. All integration, concurrency, and UI tests passing against PostgreSQL.
4. Pull Request reviewed and approved by the teammate on GitHub and merged into `staging`.

### 5.2 Contract Revision History

| Version | Date | Author | Summary of Change |
|---|---|---|---|
| `v1.0` | 2026-11-09 | Pimchaya Suprateravarnit | Initial pre-implementation contract for `F-03: Participant Event Registration, Capacity Enforcement, and Concurrency Protection`. |
