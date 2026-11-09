# Sprint 1 Feature Engineering Contract — F-04: Organizer Event Registrant Roster, Ownership Enforcement, and Runtime Readiness

- **Feature ID:** `F-04`
- **Feature Name:** Organizer Event Registrant Roster, Ownership Enforcement, and Runtime Readiness Probes
- **Target Sprint:** Sprint 1 (Deliverable 1 Baseline)
- **Linked Requirements:** `FR-06`, `BR-06`, `BR-07`, `NFR-01`, `NFR-02`, `NFR-04`, `NFR-05`
- **Contract Version:** `v1.0` (Pre-implementation specification)

---

## 1. Feature-Level Software Design Specification (Feature SDS)

### 1.1 Overview and Workflow
`F-04` allows an `ORGANIZER` to inspect the participant registrant roster exclusively for events they own, enforces strict role and ownership boundaries on the backend, and exposes cloud-ready health/readiness probes:
1. **Retrieve Owned Event Registrant Roster (`GET /api/events/:id/registrations`):**
   - Requires an authenticated `ORGANIZER` (`BR-06`).
   - Looks up the target `Event` by `id`. If not found, returns `404 Not Found`.
   - Verifies strict ownership: `event.organizerId === currentUser.id` (`BR-07`). If the authenticated `ORGANIZER` does not own the event, rejects immediately with `403 Forbidden` without querying or returning any registration rows.
   - Queries `Registration` where `eventId = id` and `status = 'ACTIVE'`, joined with sanitized `User` fields (`id`, `name`, `email` — never `passwordHash` per `NFR-01`), ordered by `createdAt ASC`, and returns the event summary alongside the registrant list (`FR-06`).
2. **Runtime Liveness and Readiness Probes (`GET /api/health`, `GET /api/ready`):**
   - `GET /api/health`: Lightweight liveness probe returning `200 OK` (`{ "status": "ok" }`).
   - `GET /api/ready`: Executes ` prisma.$queryRaw\`SELECT 1\` ` against PostgreSQL; returns `200 OK` (`{ "status": "ready", "database": "connected" }`) when reachable, or `503 Service Unavailable` (`{ "status": "not_ready", "error": "Database unavailable" }`) when the database check fails (`NFR-05`).

### 1.2 Validation, Boundary Cases, and Permissions
- **Empty roster boundary:** If an owned event has `0` registrations, `GET /api/events/:id/registrations` returns `200 OK` with `"registrations": []` and `"activeRegistrationsCount": 0`.
- **Unauthenticated access (`NFR-02`):** Missing/expired session cookie on `GET /api/events/:id/registrations` returns `401 Unauthorized` with no private data.
- **Role restriction (`BR-06`):** A `PARTICIPANT` calling `GET /api/events/:id/registrations` receives `403 Forbidden` even if they are registered for that event.
- **Cross-organizer ownership restriction (`BR-07`):** `Organizer B` calling `GET /api/events/:id/registrations` on `Organizer A`'s event receives `403 Forbidden` with zero leaked registrant data.

---

## 2. UI, API, and Data Specifications

### 2.1 UI Behavior
- **Organizer Event Roster Modal / View (`/organizer/events/:id/registrations`):** Accessible from the Organizer Workspace for owned events; displays event title, capacity utilization (`activeRegistrationsCount / capacity`), and a table of registered participants (`#`, `Name`, `Email`, `Status`, `Registered At`), or an empty state (`"No participants registered yet"`).
- **Access Guard:** Frontend hides organizer roster links from `PARTICIPANT` users, and backend independently enforces `401`/`403` on the API endpoint.

### 2.2 API Endpoint Specifications

| Method & Path | Role / Access | Request Params | Success Response | Error Responses |
|---|---|---|---|---|
| `GET /api/events/:id/registrations` | `ORGANIZER` (Owner only) | `:id` (Event UUID) | `200 OK`<br>`{ "event": { "id": string, "title": string, "capacity": number, "status": string, "activeRegistrationsCount": number }, "registrations": [ { "id": string, "status": "ACTIVE", "createdAt": string, "participant": { "id": string, "name": string, "email": string } } ] }` | `401` unauthenticated<br>`403` `PARTICIPANT` or non-owner `ORGANIZER`<br>`404` event not found |
| `GET /api/health` | Public | None | `200 OK` `{ "status": "ok" }` | — |
| `GET /api/ready` | Public | None | `200 OK` `{ "status": "ready", "database": "connected" }` | `503 { "status": "not_ready", "error": "Database unavailable" }` |

### 2.3 Data Model and Constraints
- Uses existing `User`, `Event` (`organizerId` FK), and `Registration` (`eventId` FK, `userId` FK) tables defined in `F-01`–`F-03`. No additional schema migration is required for `F-04`.

---

## 3. Acceptance Criteria (`AC`)

| AC ID | Criterion (Observable Expected Outcome) | Linked Req |
|---|---|---|
| **AC-F04-01** | Given an authenticated `ORGANIZER` who owns `Event A` having registered participants, when `GET /api/events/:id/registrations` is called, then the server responds `200 OK` with the list of active registrations including each participant's `{ id, name, email }` (and omitting `passwordHash`). | `FR-06`, `NFR-01`, `NFR-04` |
| **AC-F04-02** | Given an authenticated `ORGANIZER` who owns `Event A` with `0` registrations, when `GET /api/events/:id/registrations` is called, then the server responds `200 OK` with `"registrations": []` and `"activeRegistrationsCount": 0`. | `FR-06` |
| **AC-F04-03** | Given `Organizer B` who does not own `Organizer A`'s `Event A`, when `Organizer B` calls `GET /api/events/:id/registrations` for `Event A`, then the server responds `403 Forbidden` without returning any registrant records. | `BR-07` |
| **AC-F04-04** | Given a logged-in `PARTICIPANT` (or unauthenticated user), when calling `GET /api/events/:id/registrations`, then the server responds `403 Forbidden` (or `401 Unauthorized`) without returning any registrant records. | `BR-06`, `BR-07`, `NFR-02` |
| **AC-F04-05** | Given a running backend with a reachable PostgreSQL database, when `GET /api/health` and `GET /api/ready` are called, then both respond `200 OK`. | `NFR-05` |
| **AC-F04-06** | Given a database connectivity failure during readiness check, when `GET /api/ready` is called, then the server responds `503 Service Unavailable`. | `NFR-05` |

---

## 4. Software Test Specification (`STS`)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
|---|---|---|---|---|---|
| **TEST-F04-01** | `AC-F04-01`, `AC-F04-02` | API/DB Integration | `Organizer A` owns `Event A`; initially 0 registrants, then `Participant 1` & `Participant 2` register | `Organizer A` calls `GET /api/events/:id/registrations` before and after registrations | First call returns `200` with `registrations: []`; second call returns `200` with 2 participants (`id, name, email`, no `passwordHash`) |
| **TEST-F04-02** | `AC-F04-03` | API/DB Integration | `Event A` (owned by `Organizer A`) has 2 registrants; logged in as `Organizer B` | `Organizer B` calls `GET /api/events/:id/registrations` for `Event A` | Returns `403 Forbidden`; response body contains no participant names or emails |
| **TEST-F04-03** | `AC-F04-04` | API/DB Integration | `Event A` has registrants; client is logged in as `Participant 1` (and unauthenticated) | Call `GET /api/events/:id/registrations` as `Participant 1` and without cookie | Returns `403 Forbidden` for `Participant 1` and `401 Unauthorized` without cookie |
| **TEST-F04-04** | `AC-F04-05` | API/DB Integration | Running server connected to PostgreSQL | Call `GET /api/health` and `GET /api/ready` | Both return `200 OK` with expected JSON status fields |
| **TEST-F04-05** | `AC-F04-06` | Unit / API Integration | Database probe dependency throws connection error | Call `GET /api/ready` when DB query fails | Returns `503 Service Unavailable` with `{ status: "not_ready" }` |
| **TEST-F04-06** | `AC-F04-01` | UI / E2E | `Organizer A` logged in via browser; `Participant 1` registered for `Event A` | Open Organizer Workspace and click **View Registrants** on `Event A` | Roster table renders `Participant 1`'s name, email, and `ACTIVE` status |

---

## 5. Product Definition of Done (Sprint 1 Overall & F-04)

### 5.1 Sprint 1 Product Definition of Done (DoD)
1. **Pre-Implementation Contracts:** All Sprint 1 feature contracts (`F-01` through `F-04`) are recorded in `docs/sprints/sprint-1/` and committed prior to feature implementation.
2. **TDD Evidence:** Meaningful domain rules and access restrictions have failing test commits (Red) recorded prior to implementation commits (Green).
3. **Complete Vertical Slice:** `ORGANIZER` and `PARTICIPANT` end-to-end journeys operate across the React/Vite UI, Express/TypeScript API, and PostgreSQL database via Prisma migrations and reproducible environment-driven seed data.
4. **Automated Verification:** All planned unit, API/DB integration, concurrency (`TEST-F03-04`), and selected UI/E2E tests execute and pass on the release commit; any failed/skipped tests or known limitations are disclosed honestly.
5. **Security & Cloud Readiness:** Zero secrets or `.env` files committed; passwords hashed with `bcryptjs`; sessions stored in PostgreSQL; `/api/health` and `/api/ready` (`503` on DB failure) verified.
6. **Reviewed Git Workflow:** Every Issue is implemented on a branch from `staging`, reviewed and approved by the teammate on a PR into `staging`, and released to `main` via a reviewed release PR.

### 5.2 Contract Revision History

| Version | Date | Author | Summary of Change |
|---|---|---|---|
| `v1.0` | 2026-11-09 | Pimchaya Suprateravarnit & Suphattra Kongsiriphat | Initial pre-implementation contract for `F-04: Organizer Event Registrant Roster, Ownership Enforcement, and Runtime Readiness`. |
