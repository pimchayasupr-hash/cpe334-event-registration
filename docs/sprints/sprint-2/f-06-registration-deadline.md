# Sprint 2 Feature Engineering Contract — F-06: Event Registration Deadline Enforcement

- **Feature ID:** `F-06`
- **Feature Name:** Event Registration Deadline Enforcement
- **Target Sprint:** Sprint 2 (Deliverable 2)
- **Linked Requirements:** `FR-08`, `FR-07`, `BR-02`, `BR-06`, `BR-07`, `NFR-02`, `NFR-04`
- **Linked Issue:** `#42`
- **Contract Version:** `v1.0` (Pre-implementation specification)

---

## 1. Feature-Level Software Design Specification (Feature SDS)

### 1.1 Overview and Workflow
`F-06` allows an `ORGANIZER` to configure an optional `registrationDeadline` timestamp on an event and enforces that cutoff on the backend for both new registrations and registration cancellations (`FR-08`):

1. **Create Draft Event with Optional Deadline (`POST /api/events`):**
   - `registrationDeadline` is **optional** (`undefined` or `null` means no separate deadline; registration/cancellation remains governed by `startAt` and `status`).
   - When provided, `registrationDeadline` must be a valid ISO-8601 timestamp satisfying `registrationDeadline <= startAt`; otherwise the backend rejects with `400 Bad Request`.
2. **Publish Event Deadline Guard (`POST /api/events/:id/publish`):**
   - Preserves Sprint 1 `BR-02` (`startAt > now`).
   - Additionally, if `event.registrationDeadline !== null`, verifies `event.registrationDeadline > now` relative to the server clock; if the deadline is already in the past (`registrationDeadline <= now`), rejects with `400 Bad Request` and keeps the event in `DRAFT`.
3. **Cutoff Enforcement on Registration (`POST /api/events/:id/registrations`):**
   - Inside the `FOR UPDATE` registration transaction, after confirming `event.status === 'PUBLISHED'`:
     - If `event.registrationDeadline !== null && now > event.registrationDeadline`, rejects with `409 Conflict` (`"Registration deadline has passed"`).
     - If `event.registrationDeadline === null && now >= event.startAt`, rejects with `409 Conflict` (`"Event has already started"`).
4. **Cutoff Enforcement on Cancellation (`POST /api/registrations/:id/cancel`):**
   - Per `FR-08` (`docs/srs.md:59`), if `event.registrationDeadline !== null && now > event.registrationDeadline`, rejects cancellation with `409 Conflict` (`"Cannot cancel registration after registration deadline"`), leaving the registration `ACTIVE`.
5. **Visibility of Deadline:**
   - `GET /api/events`, `GET /api/events/:id`, `GET /api/organizer/events`, `POST /api/events`, and `GET /api/registrations/me` (event summary) include `registrationDeadline: string | null`.

### 1.2 Validation, Boundary Cases, and Permissions
- **Optionality & Backward Compatibility:** Omitting `registrationDeadline` on `POST /api/events` persists `null` and succeeds (`201 Created`), keeping all Sprint 1 clients and tests 100% compatible.
- **Temporal Boundary Cases:**
  - `registrationDeadline === startAt` → **valid** (`<=`).
  - `registrationDeadline > startAt` → **`400 Bad Request`**.
  - Unparseable date string for `registrationDeadline` → **`400 Bad Request`**.
  - Publishing a `DRAFT` event with `startAt > now` but `registrationDeadline <= now` → **`400 Bad Request`** (stays `DRAFT`).
  - Registering or cancelling when `now <= registrationDeadline` → **allowed** (subject to capacity/status).
  - Registering or cancelling when `now > registrationDeadline` → **`409 Conflict`**; DB state unchanged.
- **Role & Ownership (`BR-06`, `BR-07`, `NFR-02`):**
  - Unauthenticated requests → `401 Unauthorized`.
  - Only `ORGANIZER` can set `registrationDeadline` on event creation/edit; `PARTICIPANT` receives `403 Forbidden`.

---

## 2. UI, API, and Data Specifications

### 2.1 UI Behavior
- **Organizer Create Event Form (`/organizer/events`):** Adds an optional **Registration Deadline** datetime input (`registrationDeadline`); leaving it empty submits `null`.
- **Event Catalog & Detail (`/events`, `/events/:id`):** Displays the registration deadline when present; if `now > registrationDeadline`, displays a **"Deadline Passed"** badge and disables the **Register** button (backend independently enforces `409 Conflict`).
- **My Registrations (`/my-registrations`):** Shows the deadline and disables **Cancel Registration** when `now > registrationDeadline` (backend independently enforces `409 Conflict`).

### 2.2 API Endpoint Specifications

| Method & Path | Role / Access | Request Body / Addition | Success Response | Error Responses |
|---|---|---|---|---|
| `POST /api/events` *(extended)* | `ORGANIZER` | Optional `registrationDeadline?: string \| null` | `201 Created`<br>`{ "event": { ..., "registrationDeadline": string \| null } }` | `400` invalid date or `registrationDeadline > startAt`<br>`401` / `403` auth/role |
| `POST /api/events/:id/publish` *(extended)* | `ORGANIZER` (Owner) | None | `200 OK`<br>`{ "event": { id, status: "PUBLISHED", title, registrationDeadline } }` | `400` `startAt <= now` or `registrationDeadline <= now` |
| `POST /api/events/:id/registrations` *(extended)* | `PARTICIPANT` | None | `201 Created` (when before deadline) | `409` `now > registrationDeadline` or `now >= startAt` |
| `POST /api/registrations/:id/cancel` *(extended)* | `PARTICIPANT` (Owner) | None | `200 OK` (when before deadline) | `409` `now > registrationDeadline` or `now >= startAt` |

### 2.3 Data Model and Migration (Additive)
- **Column Addition (Additive, Nullable):**
  - `Event.registrationDeadline DateTime?` (`ALTER TABLE "Event" ADD COLUMN "registrationDeadline" TIMESTAMP(3);`).
  - Existing Sprint 1 `Event` rows default to `NULL` with zero data loss or rewrite.
- **Unchanged Layers:** `User`, `Session`, `auth.routes.ts`, `health.routes.ts`, and `seed.ts` require **no changes**.

---

## 3. Acceptance Criteria (`AC`)

| AC ID | Criterion (Observable Expected Outcome) | Linked Req |
|---|---|---|
| **AC-F06-01** | Given an authenticated `ORGANIZER`, when `POST /api/events` is called with a valid `registrationDeadline <= startAt`, then the event is stored in PostgreSQL with `registrationDeadline` persisted and returned (`201 Created`); when `registrationDeadline` is omitted or `null`, it is stored as `null` (`201 Created`). | `FR-08`, `NFR-04` |
| **AC-F06-02** | Given an authenticated `ORGANIZER`, when `POST /api/events` is called with `registrationDeadline > startAt` or an invalid date string, then the server responds `400 Bad Request` and no event is saved. | `FR-08`, `BR-02` |
| **AC-F06-03** | Given a `DRAFT` event with `startAt > now` and `registrationDeadline <= now`, when the owning `ORGANIZER` calls `POST /api/events/:id/publish`, then the server responds `400 Bad Request` and the event remains `DRAFT`. | `FR-08`, `BR-02` |
| **AC-F06-04** | Given a `PUBLISHED` event whose `registrationDeadline` is in the past (`now > registrationDeadline`) and has remaining seats, when an authenticated `PARTICIPANT` calls `POST /api/events/:id/registrations`, then the server responds `409 Conflict` and no registration row is created. | `FR-08` |
| **AC-F06-05** | Given a `PUBLISHED` event whose `registrationDeadline` is in the past (`now > registrationDeadline`), when a `PARTICIPANT` holding an `ACTIVE` registration calls `POST /api/registrations/:id/cancel`, then the server responds `409 Conflict` and the registration remains `ACTIVE`. | `FR-08`, `FR-07` |
| **AC-F06-06** | Given a `PUBLISHED` event with `registrationDeadline > now`, when an authenticated `PARTICIPANT` registers and subsequently cancels before `registrationDeadline`, then both operations succeed (`201 Created` and `200 OK`). | `FR-08`, `FR-07` |

---

## 4. Software Test Specification (`STS`)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
|---|---|---|---|---|---|
| **TEST-F06-01** | `AC-F06-01`, `AC-F06-02` | API/DB Integration | Logged-in `ORGANIZER`; payloads with (a) `registrationDeadline = startAt - 1h`, (b) `registrationDeadline = startAt`, (c) omitted, (d) `registrationDeadline = startAt + 1h`, (e) `"not-a-date"` | Call `POST /api/events` for each payload | (a), (b), (c) return `201 Created` with expected `registrationDeadline`; (d) and (e) return `400 Bad Request` with no row inserted |
| **TEST-F06-02** | `AC-F06-03` | API/DB Integration | `DRAFT` event owned by `ORGANIZER` with `startAt = now + 2d` and `registrationDeadline = now - 1h` | Call `POST /api/events/:id/publish` | Returns `400 Bad Request`; event remains `DRAFT` in DB |
| **TEST-F06-03** | `AC-F06-04` | API/DB Integration | `PUBLISHED` event (`capacity: 10`, `startAt = now + 2d`, `registrationDeadline = now - 5m` seeded in DB); logged-in `PARTICIPANT` | Call `POST /api/events/:id/registrations` | Returns `409 Conflict`; 0 registrations created in DB |
| **TEST-F06-04** | `AC-F06-05` | API/DB Integration | `PUBLISHED` event (`startAt = now + 2d`) where `Participant A` has an `ACTIVE` registration, then `registrationDeadline` is set to `now - 5m` in DB | `Participant A` calls `POST /api/registrations/:id/cancel` | Returns `409 Conflict`; registration stays `ACTIVE` in DB |
| **TEST-F06-05** | `AC-F06-06` | API/DB Integration | `PUBLISHED` event with `registrationDeadline = now + 1d` and `startAt = now + 2d`; logged-in `PARTICIPANT` | Call `POST /api/events/:id/registrations` then `POST /api/registrations/:id/cancel` | Register returns `201 Created`; cancel returns `200 OK` (`status: "CANCELLED"`) |

---

## 5. Impact on Sprint 1 Behavior & Regression Protection

- **Sprint 1 Behaviors That Must Remain Unchanged:**
  - Creating an event without `registrationDeadline` (`POST /api/events`) continues to return `201 Created` with `status: "DRAFT"`.
  - Publishing an event with `registrationDeadline = null` continues to check `startAt > now` (`BR-02`) identically to Sprint 1.
  - Registering for an event with `registrationDeadline = null` and future `startAt` continues to follow all Sprint 1 `F-03` rules.
- **Protecting Sprint 1 Regression Suites:**
  - `server/tests/events.test.ts` (6 tests), `server/tests/registrations.test.ts` (6 tests), `server/tests/roster-and-health.test.ts` (5 tests), `server/tests/auth.test.ts` (7 tests), `server/tests/seed-config.test.ts` (9 tests).

---

## 6. Definition of Done (DoD) and Revision History

### 6.1 Definition of Done
1. Pre-implementation contract reviewed and merged into `staging` prior to implementation.
2. Failing tests (`TEST-F06-01`..`TEST-F06-05`) committed as a RED commit (`docs/evidence/f-06-red.txt`).
3. Additive migration (`Event.registrationDeadline`) applied cleanly on PostgreSQL with existing Sprint 1 data.
4. Implementation committed as a separate GREEN commit with full server + client regression suites passing (`docs/evidence/f-06-green.txt`).
5. Reviewed and approved by teammate on GitHub PR into `staging`.

### 6.2 Contract Revision History

| Version | Date | Author | Summary of Change |
|---|---|---|---|
| `v1.0` | 2026-11-28 | Pimchaya Suprateravarnit | Initial pre-implementation contract for `F-06: Event Registration Deadline Enforcement` (aligned with `FR-08`). |
