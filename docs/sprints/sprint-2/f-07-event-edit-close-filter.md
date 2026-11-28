# Sprint 2 Feature Engineering Contract — F-07: Event Editing, Registration Closing, and Catalog Search/Filtering

- **Feature ID:** `F-07`
- **Feature Name:** Event Editing, Registration Closing, and Catalog Search/Filtering
- **Target Sprint:** Sprint 2 (Deliverable 2)
- **Linked Requirements:** `FR-09`, `FR-02`, `FR-03`, `BR-01`, `BR-02`, `BR-03`, `BR-06`, `BR-07`, `NFR-02`, `NFR-04`
- **Linked Issue:** `#42`
- **Contract Version:** `v1.0` (Pre-implementation specification)

---

## 1. Feature-Level Software Design Specification (Feature SDS)

### 1.1 Overview and Workflow
`F-07` adds three organizer/participant lifecycle capabilities (`FR-09`):

1. **Edit Event Details (`PATCH /api/events/:id`):**
   - Requires an authenticated `ORGANIZER` who owns the event (`event.organizerId === currentUser.id`, `BR-06`, `BR-07`).
   - Allowed when `event.status` is `DRAFT` or `PUBLISHED`; rejected with `409 Conflict` when `event.status === 'CLOSED'`.
   - Accepts partial updates to `title`, `description`, `category` (`WORKSHOP` | `SEMINAR`), `location`, `startAt`, `endAt`, `capacity`, and `registrationDeadline` (explicit `null` clears the deadline).
   - Merges supplied fields with existing event fields and validates all domain invariants before persisting:
     - Non-empty trimmed strings for `title`, `description`, `location` (`400` if blank).
     - `category` in `{ WORKSHOP, SEMINAR }` (`400` otherwise).
     - `endAt > startAt` (`BR-02`, `400` otherwise).
     - If `event.status === 'PUBLISHED'`, merged `startAt` must remain in the future (`startAt > now`, `400` otherwise).
     - If merged `registrationDeadline !== null`, must satisfy `registrationDeadline <= startAt` (`400` otherwise).
     - **Capacity validation (reuses exact Sprint 1 `BR-01` logic from `PATCH /api/events/:id/capacity`):** `1 <= capacity <= 500` integer (`400` otherwise) and `capacity >= activeRegistrationsCount` (`409 Conflict` otherwise).
2. **Close Event Registration (`POST /api/events/:id/close`):**
   - Requires an authenticated `ORGANIZER` who owns the event (`BR-06`, `BR-07`).
   - Transitions `PUBLISHED -> CLOSED` (`EventStatus.CLOSED`).
   - Rejects `DRAFT` or already-`CLOSED` events with `409 Conflict`. Closing is irreversible (cannot reopen to `PUBLISHED`).
   - Effects of `CLOSED`:
     - `POST /api/events/:id/registrations` rejects new registrations with `409 Conflict` (`"Event registration is closed"`).
     - `GET /api/events` and `GET /api/events/:id` continue to display `CLOSED` events with `status: "CLOSED"` (while `DRAFT` remains strictly hidden per `BR-03`).
     - Existing `ACTIVE` registrations, organizer roster (`GET /api/events/:id/registrations`), and Sprint 3 attendance check-in (`F-08`) remain intact.
3. **Catalog Search and Filtering (`GET /api/events`):**
   - Supports optional query parameters:
     - `category`: `WORKSHOP` or `SEMINAR` (invalid non-empty value returns `400 Bad Request`).
     - `q`: case-insensitive substring match against `title`, `description`, or `location`.
     - `availableOnly`: when `"true"`, returns only events where `status === 'PUBLISHED'` AND `remainingSeats > 0` (and `registrationDeadline === null || now <= registrationDeadline`).
   - When no query parameters are supplied, returns visible non-draft events (`PUBLISHED`, `CLOSED`) ordered by `startAt ASC` — preserving 100% of Sprint 1 behavior when only `DRAFT` and `PUBLISHED` events exist.

### 1.2 Validation, Boundary Cases, and Permissions
- **Role & Ownership (`BR-06`, `BR-07`, `NFR-02`):**
  - Unauthenticated calls → `401 Unauthorized`.
  - `PARTICIPANT` calling `PATCH /api/events/:id` or `POST /api/events/:id/close` → `403 Forbidden`.
  - `Organizer B` calling `PATCH /api/events/:id` or `POST /api/events/:id/close` on `Organizer A`'s event → `403 Forbidden`; event unmodified.
- **Boundary Cases:**
  - Unknown event ID → `404 Not Found`.
  - Empty update body `{}` on `PATCH /api/events/:id` → `400 Bad Request` (`"At least one updatable field is required"`).
  - `PATCH /api/events/:id` reducing `capacity` below `activeRegistrationsCount` → `409 Conflict` (identical to `PATCH /api/events/:id/capacity`).
  - `POST /api/events/:id/close` on `DRAFT` or `CLOSED` → `409 Conflict`.
  - `GET /api/events?category=INVALID` → `400 Bad Request`.

---

## 2. UI, API, and Data Specifications

### 2.1 UI Behavior
- **Event Catalog (`/events`):** Adds search bar (`q`), category filter dropdown (`All`, `WORKSHOP`, `SEMINAR`), and **"Available Seats Only"** toggle (`availableOnly=true`). Displays a **`CLOSED`** badge and disabled register action on closed events.
- **Organizer Workspace (`/organizer/events`):** Adds **Edit** modal/form (`PATCH /api/events/:id`) on `DRAFT` and `PUBLISHED` events and a **Close Registration** button (`POST /api/events/:id/close`) on `PUBLISHED` events (replacing the unused `cancelEvent` stub in `client/src/api.ts`).

### 2.2 API Endpoint Specifications

| Method & Path | Role / Access | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|
| `PATCH /api/events/:id` | `ORGANIZER` (Owner) | Partial `{ title, description, category, location, startAt, endAt, capacity, registrationDeadline }` | `200 OK`<br>`{ "event": { id, title, description, category, location, startAt, endAt, registrationDeadline, capacity, status, activeRegistrationsCount, remainingSeats } }` | `400` invalid fields/bounds/schedule<br>`401` / `403` auth/role/owner<br>`404` not found<br>`409` `CLOSED` event or `capacity < activeCount` |
| `POST /api/events/:id/close` | `ORGANIZER` (Owner) | None | `200 OK`<br>`{ "event": { id, title, status: "CLOSED" } }` | `401` / `403` auth/role/owner<br>`404` not found<br>`409` not `PUBLISHED` (e.g., `DRAFT` or already `CLOSED`) |
| `GET /api/events` *(extended)* | Authenticated (`ORGANIZER`, `PARTICIPANT`) | Optional `?category=WORKSHOP\|SEMINAR&q=...&availableOnly=true` | `200 OK`<br>`{ "events": [ ...matching PUBLISHED/CLOSED events ] }` | `400` invalid `category` filter<br>`401` unauthenticated |

### 2.3 Data Model and Migration (Additive)
- **Enum Extension (Additive):** `ALTER TYPE "EventStatus" ADD VALUE 'CLOSED';`
- **Unchanged Layers:** `User`, `Session`, `Registration` table schema, `auth.routes.ts`, `health.routes.ts`, `PATCH /api/events/:id/capacity`, and `seed.ts` require **no schema or contract changes**.

---

## 3. Acceptance Criteria (`AC`)

| AC ID | Criterion (Observable Expected Outcome) | Linked Req |
|---|---|---|
| **AC-F07-01** | Given a `DRAFT` or `PUBLISHED` event owned by `ORGANIZER`, when `PATCH /api/events/:id` is called with valid updated fields (e.g., `title`, `location`, `capacity`, `registrationDeadline`), then the updates persist in PostgreSQL and return `200 OK`. | `FR-09`, `NFR-04` |
| **AC-F07-02** | Given an owned event, when `PATCH /api/events/:id` violates `BR-01` (`capacity < 1` or `> 500` → `400`; `capacity < activeRegistrationsCount` → `409`), `BR-02` (`endAt <= startAt` → `400`; `PUBLISHED` `startAt <= now` → `400`), or `registrationDeadline > startAt` (`400`), then the server rejects the request and leaves the event unchanged. | `FR-09`, `BR-01`, `BR-02` |
| **AC-F07-03** | Given a `PUBLISHED` event owned by `ORGANIZER`, when `POST /api/events/:id/close` is called, then `status` updates to `'CLOSED'` (`200 OK`), subsequent `POST /api/events/:id/registrations` by a `PARTICIPANT` returns `409 Conflict`, and subsequent `PATCH /api/events/:id` or `POST /api/events/:id/close` returns `409 Conflict`. | `FR-09`, `BR-03` |
| **AC-F07-04** | Given a `DRAFT` event owned by `ORGANIZER`, when `POST /api/events/:id/close` is called, then the server responds `409 Conflict` and the event remains `DRAFT`. | `FR-09` |
| **AC-F07-05** | Given a `PARTICIPANT` or non-owner `Organizer B` (or unauthenticated client), when calling `PATCH /api/events/:id` or `POST /api/events/:id/close`, then the server responds `403 Forbidden` (or `401 Unauthorized`) and the event is unmodified. | `BR-06`, `BR-07`, `NFR-02` |
| **AC-F07-06** | Given multiple `PUBLISHED` events (different categories, keywords, full vs. available) and a `DRAFT` event, when calling `GET /api/events` with `category`, `q`, and/or `availableOnly=true`, then only matching non-draft events are returned (`200 OK`), and invalid `category` returns `400 Bad Request`. | `FR-09`, `BR-03` |

---

## 4. Software Test Specification (`STS`)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
|---|---|---|---|---|---|
| **TEST-F07-01** | `AC-F07-01` | API/DB Integration | `DRAFT` and `PUBLISHED` events owned by `Organizer A` | Call `PATCH /api/events/:id` updating `title`, `location`, `capacity` | Returns `200 OK`; subsequent `GET /api/events/:id` reflects persisted changes |
| **TEST-F07-02** | `AC-F07-02` | API/DB Integration | `PUBLISHED` event (`capacity: 5`) with `2` active registrations | Call `PATCH /api/events/:id` with (a) `capacity: 0`, (b) `capacity: 1`, (c) `endAt <= startAt`, (d) past `startAt` | (a), (c), (d) return `400 Bad Request`; (b) returns `409 Conflict`; DB row unchanged |
| **TEST-F07-03** | `AC-F07-03`, `AC-F07-04` | API/DB Integration | 1 `DRAFT` event and 1 `PUBLISHED` event owned by `Organizer A`; logged-in `PARTICIPANT` | Call `POST /api/events/:draftId/close`, `POST /api/events/:pubId/close`, then `PARTICIPANT` register on closed event, then `PATCH` and re-close | Draft close → `409`; published close → `200` (`CLOSED`); register on closed → `409`; edit/re-close on closed → `409` |
| **TEST-F07-04** | `AC-F07-05` | API/DB Integration | Event owned by `Organizer A`; `Organizer B`, `PARTICIPANT`, and unauthenticated client | Call `PATCH /api/events/:id` and `POST /api/events/:id/close` for each actor | `Organizer B` → `403`, `PARTICIPANT` → `403`, unauth → `401`; event unchanged |
| **TEST-F07-05** | `AC-F07-06` | API/DB Integration | `DRAFT` workshop, `PUBLISHED` workshop (available), `PUBLISHED` seminar (full), `PUBLISHED` seminar (available) | Call `GET /api/events?category=SEMINAR`, `?q=<keyword>`, `?availableOnly=true`, combined filters, and `?category=INVALID` | Each filter returns exact matching subset (never includes `DRAFT`); invalid category returns `400 Bad Request` |
| **TEST-F07-06** | `AC-F07-01`, `AC-F07-06` | UI / Integration | Logged-in users on Catalog and Organizer screens | Filter catalog by category/keyword; edit and close owned event | Filtered list updates via API; closed event displays `CLOSED` badge |

---

## 5. Impact on Sprint 1 Behavior & Regression Protection

- **Sprint 1 Behaviors That Must Remain Unchanged:**
  - `PATCH /api/events/:id/capacity` (`F-02`) remains untouched with identical validation, response shape, and status codes (`400`, `403`, `404`, `409`, `200`).
  - `GET /api/events` without query params continues to exclude `DRAFT` events (`BR-03`) and return identical fields.
  - `POST /api/events/:id/registrations` (`F-03`) continues to return `404` for `DRAFT` events and `409` for full/duplicate/closed events.
- **Protecting Sprint 1 Regression Suites:**
  - `server/tests/events.test.ts` (6 tests), `server/tests/registrations.test.ts` (6 tests), `server/tests/roster-and-health.test.ts` (5 tests), `server/tests/auth.test.ts` (7 tests), `server/tests/seed-config.test.ts` (9 tests).

---

## 6. Definition of Done (DoD) and Revision History

### 6.1 Definition of Done
1. Pre-implementation contract reviewed and merged into `staging` prior to implementation.
2. Failing tests (`TEST-F07-01`..`TEST-F07-06`) committed as a RED commit (`docs/evidence/f-07-red.txt`).
3. Additive migration (`EventStatus.CLOSED`) applied cleanly on PostgreSQL.
4. Implementation committed as a separate GREEN commit with full server + client regression suites passing (`docs/evidence/f-07-green.txt`).
5. Reviewed and approved by teammate on GitHub PR into `staging`.

### 6.2 Contract Revision History

| Version | Date | Author | Summary of Change |
|---|---|---|---|
| `v1.0` | 2026-11-28 | Pimchaya Suprateravarnit | Initial pre-implementation contract for `F-07: Event Editing, Registration Closing, and Catalog Search/Filtering` (aligned with `FR-09` and `BR-01`/`BR-02`). |
