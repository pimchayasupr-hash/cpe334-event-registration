# Sprint 1 Feature Engineering Contract — F-02: Event Creation, Publication, and Capacity Management

- **Feature ID:** `F-02`
- **Feature Name:** Event Creation, Separate Publication, Discovery, and Capacity Management
- **Target Sprint:** Sprint 1 (Deliverable 1 Baseline)
- **Linked Requirements:** `FR-02`, `FR-03`, `BR-01`, `BR-02`, `BR-03`, `BR-06`, `BR-07`, `NFR-04`, `AD-01`–`AD-04`
- **Contract Version:** `v1.0` (Pre-implementation specification)

---

## 1. Feature-Level Software Design Specification (Feature SDS)

### 1.1 Overview and Workflow
`F-02` enables `ORGANIZER` users to author and publish faculty workshops/seminars and enables authenticated users to discover published events:
1. **Create Draft Event (`POST /api/events`):** An authenticated `ORGANIZER` submits `title`, `description`, `category` (`WORKSHOP` | `SEMINAR`), `location`, `startAt`, `endAt`, and `capacity`. The backend validates `1 <= capacity <= 500` (`BR-01`) and `endAt > startAt` (`BR-02`), sets `organizerId = currentUser.id`, and persists the event exclusively in `DRAFT` status (`FR-02`, `AD-03`).
2. **Publish Event (`POST /api/events/:id/publish`):** The owning `ORGANIZER` transitions a `DRAFT` event to `PUBLISHED`. The backend enforces ownership (`event.organizerId == currentUser.id`, `BR-07`), verifies `event.status == 'DRAFT'`, and verifies `event.startAt > now` relative to the server clock (`BR-02`, `AD-03`).
3. **Update Event Capacity (`PATCH /api/events/:id/capacity`):** The owning `ORGANIZER` updates `capacity` (`1 <= newCapacity <= 500`) inside a database transaction that verifies `newCapacity >= activeRegistrationsCount` (`BR-01`, `AD-04`).
4. **Discover Events (`GET /api/events`, `GET /api/events/:id`, `GET /api/organizer/events`):**
   - `GET /api/events` lists only `PUBLISHED` events ordered by `startAt ASC`, including computed `activeRegistrationsCount` and `remainingSeats = capacity - activeRegistrationsCount` (`FR-03`, `BR-03`).
   - `GET /api/events/:id` returns details of a `PUBLISHED` event (or a `DRAFT` event only if requested by its owning `ORGANIZER`; otherwise `404 Not Found`).
   - `GET /api/organizer/events` returns all `DRAFT` and `PUBLISHED` events where `organizerId == currentUser.id`.

### 1.2 Validation, Boundary Cases, and Permissions
- **Capacity boundaries (`BR-01`):** `capacity` must be an integer with `1 <= capacity <= 500`. Values `<= 0` (e.g., `0`, `-5`), `> 500` (e.g., `501`), or non-integers return `400 Bad Request`. Reducing capacity below `activeRegistrationsCount` returns `409 Conflict`.
- **Schedule validation (`BR-02`):** `endAt <= startAt` returns `400 Bad Request`. Publishing an event whose `startAt <= now` returns `400 Bad Request`.
- **Role & Ownership (`BR-06`, `BR-07`):** Unauthenticated requests return `401 Unauthorized`. `PARTICIPANT` requests to `POST /api/events`, `POST /api/events/:id/publish`, `PATCH /api/events/:id/capacity`, or `GET /api/organizer/events` return `403 Forbidden`. An `ORGANIZER` targeting another organizer's event returns `403 Forbidden`.

---

## 2. UI, API, and Data Specifications

### 2.1 UI Behavior
- **Published Events Catalog (`/events`):** Visible to logged-in users; displays event cards with title, category badge, location, start/end timestamps, `activeRegistrationsCount / capacity`, and remaining seats.
- **Organizer Workspace (`/organizer/events`):** Visible to `ORGANIZER` users; includes a **Create Draft Event** form, list of owned events (`DRAFT` and `PUBLISHED`), a **Publish** button on `DRAFT` events, and an inline **Update Capacity** control.

### 2.2 API Endpoint Specifications

| Method & Path | Role / Access | Request Body | Success Response | Error Responses |
|---|---|---|---|---|
| `POST /api/events` | `ORGANIZER` | `{ title, description, category, location, startAt, endAt, capacity }` | `201 Created`<br>`{ "event": { id, title, ..., status: "DRAFT", capacity, organizerId } }` | `400` invalid fields/bounds<br>`401` unauthenticated<br>`403` `PARTICIPANT` role |
| `POST /api/events/:id/publish` | `ORGANIZER` (Owner only) | None | `200 OK`<br>`{ "event": { id, ..., status: "PUBLISHED" } }` | `400` `startAt <= now` or already published<br>`401` / `403` non-owner or wrong role<br>`404` not found |
| `PATCH /api/events/:id/capacity` | `ORGANIZER` (Owner only) | `{ "capacity": number }` | `200 OK`<br>`{ "event": { id, ..., capacity, activeRegistrationsCount, remainingSeats } }` | `400` out of `1..500`<br>`403` non-owner/role<br>`404` not found<br>`409` `capacity < activeCount` |
| `GET /api/events` | Authenticated (`ORGANIZER`, `PARTICIPANT`) | None | `200 OK`<br>`{ "events": [ { id, title, category, location, startAt, endAt, capacity, status: "PUBLISHED", activeRegistrationsCount, remainingSeats } ] }` | `401` unauthenticated |
| `GET /api/events/:id` | Authenticated | None | `200 OK`<br>`{ "event": { ... } }` | `401` unauthenticated<br>`404` not found or non-owner `DRAFT` |
| `GET /api/organizer/events` | `ORGANIZER` | None | `200 OK`<br>`{ "events": [ ...owned DRAFT & PUBLISHED events ] }` | `401` unauthenticated<br>`403` `PARTICIPANT` role |

### 2.3 Data Model and Constraints (Prisma / PostgreSQL)
- **`EventCategory` Enum:** `WORKSHOP`, `SEMINAR`
- **`EventStatus` Enum:** `DRAFT`, `PUBLISHED`
- **`Event` Table:**
  - `id` (`UUID`, Primary Key)
  - `title` (`String`, Not Null)
  - `description` (`String`, Not Null)
  - `category` (`EventCategory`, Not Null)
  - `location` (`String`, Not Null)
  - `startAt` (`DateTime`, Not Null)
  - `endAt` (`DateTime`, Not Null)
  - `capacity` (`Int`, Not Null, DB check `capacity >= 1 AND capacity <= 500`)
  - `status` (`EventStatus`, Not Null, default `'DRAFT'`)
  - `organizerId` (`UUID`, Foreign Key -> `User.id` `ON DELETE RESTRICT`, Indexed)
  - `createdAt` (`DateTime`, default `now()`), `updatedAt` (`DateTime`, `@updatedAt`)

---

## 3. Acceptance Criteria (`AC`)

| AC ID | Criterion (Observable Expected Outcome) | Linked Req |
|---|---|---|
| **AC-F02-01** | Given an authenticated `ORGANIZER`, when `POST /api/events` is called with valid fields and `1 <= capacity <= 500`, then the event is stored in PostgreSQL with `status = 'DRAFT'` and `organizerId = currentUser.id`, returning `201 Created`. | `FR-02`, `BR-01`, `AD-03` |
| **AC-F02-02** | Given an authenticated `ORGANIZER`, when `POST /api/events` is called with `capacity < 1` (e.g., `0`, `-1`), `capacity > 500` (e.g., `501`), or `endAt <= startAt`, then the request is rejected with `400 Bad Request` and no event is saved. | `BR-01`, `BR-02`, `AD-02` |
| **AC-F02-03** | Given a `DRAFT` event owned by the authenticated `ORGANIZER` with `startAt > now`, when `POST /api/events/:id/publish` is called, then `status` updates to `'PUBLISHED'` in PostgreSQL and the event appears in `GET /api/events`. | `FR-02`, `FR-03`, `BR-02` |
| **AC-F02-04** | Given a `DRAFT` event whose `startAt` is in the past (`startAt <= now`), when `POST /api/events/:id/publish` is called, then the server responds `400 Bad Request` and the event remains `'DRAFT'`. | `BR-02`, `AD-03` |
| **AC-F02-05** | Given a `DRAFT` event, when a `PARTICIPANT` calls `GET /api/events` or `GET /api/events/:id`, then the `DRAFT` event is excluded from the list and `GET /api/events/:id` returns `404 Not Found`. | `FR-03`, `BR-03` |
| **AC-F02-06** | Given an event with `k` active registrations, when the owning `ORGANIZER` calls `PATCH /api/events/:id/capacity` with `newCapacity < k`, then the server responds `409 Conflict` and `capacity` remains unchanged; when `k <= newCapacity <= 500`, `capacity` updates and returns `200 OK`. | `FR-02`, `BR-01`, `AD-04` |
| **AC-F02-07** | Given a logged-in `PARTICIPANT`, when they call `POST /api/events`, `POST /api/events/:id/publish`, `PATCH /api/events/:id/capacity`, or `GET /api/organizer/events`, then the server responds `403 Forbidden`. | `BR-06` |
| **AC-F02-08** | Given `Organizer B` who does not own `Organizer A`'s event, when `Organizer B` calls `POST /api/events/:id/publish` or `PATCH /api/events/:id/capacity` on `Organizer A`'s event, then the server responds `403 Forbidden` and the event is unmodified. | `BR-07` |

---

## 4. Software Test Specification (`STS`)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
|---|---|---|---|---|---|
| **TEST-F02-01** | `AC-F02-02` | Unit | Event validator function; inputs `capacity = 0`, `1`, `500`, `501` and `endAt <= startAt` | Run domain validation on boundary inputs | Accepts `1` and `500`; rejects `0`, `501`, non-integers, and `endAt <= startAt` |
| **TEST-F02-02** | `AC-F02-01`, `AC-F02-03` | API/DB Integration | Logged-in `ORGANIZER` | Call `POST /api/events` (capacity `30`, future `startAt`), then `POST /api/events/:id/publish`, then `GET /api/events` | Created with `status: "DRAFT"` (`201`), published to `"PUBLISHED"` (`200`), and returned in `GET /api/events` with `remainingSeats: 30` |
| **TEST-F02-03** | `AC-F02-02`, `AC-F02-04` | API/DB Integration | Logged-in `ORGANIZER`; a `DRAFT` event with past `startAt` | Call `POST /api/events` with `capacity: 0` & `501`; call `POST /api/events/:id/publish` on past-start draft | All return `400 Bad Request`; DB state unchanged |
| **TEST-F02-04** | `AC-F02-05` | API/DB Integration | 1 `DRAFT` event and 1 `PUBLISHED` event in PostgreSQL; logged-in `PARTICIPANT` | Call `GET /api/events` and `GET /api/events/:draftId` as `PARTICIPANT` | List contains only the `PUBLISHED` event; `GET /api/events/:draftId` returns `404 Not Found` |
| **TEST-F02-05** | `AC-F02-06` | API/DB Integration | `PUBLISHED` event with `capacity: 5` and `2` active registrations | Owner calls `PATCH /api/events/:id/capacity` with `{ capacity: 1 }` then `{ capacity: 3 }` | `{ capacity: 1 }` returns `409 Conflict`; `{ capacity: 3 }` returns `200 OK` with `remainingSeats: 1` |
| **TEST-F02-06** | `AC-F02-07` | API/DB Integration | Logged-in `PARTICIPANT` | Call `POST /api/events`, `POST /api/events/:id/publish`, `PATCH /api/events/:id/capacity`, and `GET /api/organizer/events` | All 4 endpoints return `403 Forbidden` |
| **TEST-F02-07** | `AC-F02-08` | API/DB Integration | `Event` owned by `Organizer A`; logged in as `Organizer B` | `Organizer B` calls `POST /api/events/:id/publish` and `PATCH /api/events/:id/capacity` | Both return `403 Forbidden`; event remains unchanged in DB |
| **TEST-F02-08** | `AC-F02-01`, `AC-F02-03` | UI / E2E | Logged-in `ORGANIZER` in browser | Fill Create Draft Event form, submit, click Publish on the created draft | Event status badge changes from `DRAFT` to `PUBLISHED` and becomes visible on `/events` |

---

## 5. Product Definition of Done (DoD) and Revision History

### 5.1 Definition of Done
1. Feature contract (`docs/sprints/sprint-1/f-02-event-management.md`) committed and reviewed prior to implementation.
2. Automated tests (`TEST-F02-01` through `TEST-F02-08`) implemented using TDD (Red failing test commit followed by Green implementation commit).
3. All unit, API/DB integration, and UI tests passing against PostgreSQL.
4. Pull Request reviewed and approved by the teammate on GitHub and merged into `staging`.

### 5.2 Contract Revision History

| Version | Date | Author | Summary of Change |
|---|---|---|---|
| `v1.0` | 2026-11-09 | Pimchaya Suprateravarnit & Suphattra Kongsiriphat | Initial pre-implementation contract for `F-02: Event Creation, Publication, and Capacity Management`. |
