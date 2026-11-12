# Software Requirements Specification (SRS) — Sprint 1 Baseline

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme:** Theme 3 — Event Registration and Attendance System
- **Chosen Context:** Faculty and University Academic Workshops & Seminars
- **Repository:** `https://github.com/pimchayasupr-hash/cpe334-event-registration`
- **Team Members:**
  1. Pimchaya Suprateravarnit (`67070505223`, GitHub: `pimchayasupr-hash`)
  2. Suphattra Kongsiriphat (`67070505228`, GitHub: `supa-gif173`)

---

## 1. Stakeholder Problem, Chosen Context, Scope, and Explicit Exclusions

### 1.1 Stakeholder Problem and Chosen Context
In a university faculty setting, academic departments, research labs, and student academic committees frequently organize hands-on technical workshops and guest seminars with strict room capacity limits (ranging from small 20-seat computer labs to 500-seat auditoriums). Currently, organizers rely on shared spreadsheets or generic web forms that lack real-time seat enforcement and role-based access control. As a result, popular workshops suffer from overbooking when multiple students submit forms for the last remaining seats at the same time, duplicate entries by the same student, premature sign-ups before event details are finalized, and privacy breaches when participant rosters are exposed to unauthorized students or other organizers.

### 1.2 Product Scope
The **Faculty Event Registration and Attendance System** provides an end-to-end web platform across three sprints:
- **Sprint 1 (Deliverable 1 Baseline):** Authenticated `ORGANIZER` and `PARTICIPANT` workflows; creating events in `DRAFT` state and explicitly publishing them (`PUBLISHED`) with validated positive capacity (`1..500`) and future start time; safe capacity adjustments; discovering published events; participant seat registration with strict capacity and duplicate-registration prevention (including concurrent requests for the final seat); viewing own registrations; and organizer inspection of their own event's registrant roster.
- **Sprint 2 (Core Expansion):** Participant registration cancellation with seat release, registration deadline enforcement, organizer event editing/closing workflows, and event search/filtering.
- **Sprint 3 (Completion and Hardening):** On-site participant check-in, attendance status recording (`PRESENT` / `ABSENT`), and event attendance summary/reporting.

### 1.3 Explicit Exclusions
- **No Paid Ticketing or Payment Processing:** All faculty workshops and seminars are free university activities; payment gateways and billing are excluded.
- **No External Messaging Gateways:** Email, SMS, or push notification services are excluded; confirmation and status updates are displayed directly in the web UI.
- **No Self-Registration or Password Recovery in Sprint 1:** User accounts are provisioned via reproducible database seed scripts reading passwords from environment variables; self-service sign-up, email verification, password reset, and multi-role assignment per user are excluded from Sprint 1.
- **No Waiting List / Auto-Promotion:** When an event reaches full capacity, new registration attempts are rejected immediately rather than queued on a waitlist.

---

## 2. Actors and Responsibilities

| Actor | Role Code | Responsibilities in Sprint 1 | Access & Ownership Restrictions |
|---|---|---|---|
| **Organizer** (Faculty Staff / Workshop Instructor) | `ORGANIZER` | Log in/out; create faculty workshop/seminar events in `DRAFT` status; publish own `DRAFT` events to `PUBLISHED`; update capacity of own events within allowed bounds; view own events (`DRAFT` and `PUBLISHED`) and inspect the registrant roster for events they own. | Cannot register as a participant; cannot view, edit, publish, or inspect the registrant roster of any event owned by another Organizer. |
| **Participant** (University Student) | `PARTICIPANT` | Log in/out; browse and view details of `PUBLISHED` events; register for available seats in `PUBLISHED` events; view their own active registrations. | Cannot create, edit, or publish events; cannot view `DRAFT` events; cannot view another participant's registration records or any event's registrant roster. |

---

## 3. Sprint 1 Functional Requirements (`FR-01` to `FR-06`)

| ID | Requirement Statement (Observable Behavior) | Actor(s) | Target Sprint |
|---|---|---|---|
| **FR-01** | **User Authentication and Session Lifecycle:** The system shall allow a user with a valid email and password to log in (`POST /api/auth/login`), retrieve their authenticated profile and role (`GET /api/auth/me`), and log out (`POST /api/auth/logout`) by invalidating the active session on the backend. | `ORGANIZER`, `PARTICIPANT` | Sprint 1 |
| **FR-02** | **Draft Event Creation, Separate Publication, and Capacity Update:** The system shall allow an authenticated `ORGANIZER` to create a new workshop/seminar event (`title`, `description`, `category`, `location`, `startAt`, `endAt`, `capacity`) exclusively in `DRAFT` status (`POST /api/events`), subsequently publish a `DRAFT` event they own to `PUBLISHED` status as a separate action (`POST /api/events/:id/publish`), and update the capacity of an event they own (`PATCH /api/events/:id/capacity`). | `ORGANIZER` | Sprint 1 |
| **FR-03** | **Event Discovery and Detail Retrieval:** The system shall allow authenticated users to list and inspect `PUBLISHED` events (`GET /api/events`, `GET /api/events/:id`) showing schedule, location, capacity, active registration count, and remaining seats, and shall allow an `ORGANIZER` to list all events they own including `DRAFT` events (`GET /api/organizer/events`). | `ORGANIZER`, `PARTICIPANT` | Sprint 1 |
| **FR-04** | **Participant Event Registration:** The system shall allow an authenticated `PARTICIPANT` to submit a registration for a `PUBLISHED` event (`POST /api/events/:id/registrations`) and persist an `ACTIVE` registration record in the database. | `PARTICIPANT` | Sprint 1 |
| **FR-05** | **Participant Own Registrations View:** The system shall allow an authenticated `PARTICIPANT` to retrieve the list of their own persisted registrations along with the associated event details (`GET /api/registrations/me`). | `PARTICIPANT` | Sprint 1 |
| **FR-06** | **Organizer Event Registrant Roster:** The system shall allow an authenticated `ORGANIZER` to retrieve the list of `ACTIVE` registrations (participant name, email, registration timestamp, status) for a specific event that the organizer owns (`GET /api/events/:id/registrations`). | `ORGANIZER` | Sprint 1 |

---

## 4. Planned Later-Sprint Functional Requirements (`FR-07` to `FR-11`)

| ID | One-Line Requirement Summary | Actor(s) | Allocated Sprint |
|---|---|---|---|
| **FR-07** | **Registration Cancellation:** Allow a `PARTICIPANT` to cancel their own `ACTIVE` registration (`CANCELLED`) before the event starts, releasing the seat back to available capacity. | `PARTICIPANT` | Sprint 2 |
| **FR-08** | **Registration Deadline Enforcement:** Allow an `ORGANIZER` to set a `registrationDeadline` on an event and reject new registrations or cancellations submitted after that deadline. | `ORGANIZER`, `PARTICIPANT` | Sprint 2 |
| **FR-09** | **Event Details Editing, Closing, and Filtering:** Allow an `ORGANIZER` to edit event details or close registration, and allow users to search/filter published events by category (`WORKSHOP`, `SEMINAR`) and availability. | `ORGANIZER`, `PARTICIPANT` | Sprint 2 |
| **FR-10** | **Participant Check-In and Attendance Recording:** Allow an `ORGANIZER` to record attendance (`PRESENT` / `ABSENT`) for `ACTIVE` registrants of their own event during or after the session. | `ORGANIZER` | Sprint 3 |
| **FR-11** | **Event Attendance Summary Report:** Provide an `ORGANIZER` with an aggregate summary for each owned event showing total capacity, active registrations, cancellations, checked-in count, and attendance rate. | `ORGANIZER` | Sprint 3 |

---

## 5. Sprint 1 Business Rules (`BR-01` to `BR-07`)

| ID | Business Rule Definition (Testable Domain Rule) | Target Sprint |
|---|---|---|
| **BR-01** | **Valid Capacity Bounds and Non-Reduction Below Active Count:** An event's `capacity` must be an integer between `1` and `500` inclusive (`1 <= capacity <= 500`). An organizer cannot reduce an event's capacity below the current number of `ACTIVE` registrations for that event (`newCapacity >= activeRegistrationsCount`). | Sprint 1 |
| **BR-02** | **Valid Event Schedule and Future Start on Publish:** An event's `endAt` must be strictly later than `startAt` (`endAt > startAt`). A `DRAFT` event can be transitioned to `PUBLISHED` only if its `startAt` timestamp is in the future relative to the server clock at the moment of publication (`startAt > now`). | Sprint 1 |
| **BR-03** | **Published-Only Visibility and Registration for Participants:** Events in `DRAFT` status are hidden from participant listings and cannot accept registrations. Any attempt by a `PARTICIPANT` to view or register for a `DRAFT` event is rejected (`404 Not Found` / `409 Conflict`). | Sprint 1 |
| **BR-04** | **Strict Capacity Enforcement and Last-Seat Concurrency Safety:** The number of `ACTIVE` registrations for an event must never exceed `event.capacity`. When `activeRegistrationsCount >= event.capacity`, any new registration request is rejected with `409 Conflict`. When multiple requests compete simultaneously for the final available seat, the system must process seat allocation atomically so that at most one request succeeds and total `ACTIVE` registrations never exceed `capacity` (technical locking mechanism specified in the System-Level SDS). | Sprint 1 |
| **BR-05** | **Single Active Registration per Participant per Event:** A `PARTICIPANT` may hold at most one `ACTIVE` registration for a given event. Attempting to register again for the same event is rejected with `409 Conflict`. *(See Assumption `AD-05` regarding Sprint 1 constraint vs. Sprint 2 cancellation.)* | Sprint 1 |
| **BR-06** | **Role-Based Operation Restrictions:** Only users with role `ORGANIZER` may create draft events, publish events, update capacity, or view event registrant rosters. Only users with role `PARTICIPANT` may register for an event. Unauthorized role requests are rejected on the backend with `403 Forbidden`. | Sprint 1 |
| **BR-07** | **Event Ownership and Registration Privacy Isolation:** An `ORGANIZER` may publish, update, or view the registrant roster only for events where `event.organizerId == currentUser.id`; requests targeting another organizer's event are rejected with `403 Forbidden`. A `PARTICIPANT` can retrieve only registrations where `registration.userId == currentUser.id`. | Sprint 1 |

---

## 6. Sprint 1 Non-Functional Requirements (`NFR-01` to `NFR-05`)

| ID | Category | Measurable Target | Verification Method | Verified In |
|---|---|---|---|---|
| **NFR-01** | **Credential & Secret Security** | 100% of stored user passwords use salted `bcrypt` hashes (cost factor >= 10); 0 plaintext passwords or real secrets (`.env`, `DATABASE_URL`, `SESSION_SECRET`, seed passwords) appear in Git commits, logs, or API responses. | Automated API/DB integration test verifying hashed password storage and omission of `passwordHash` from API responses; `git status` and `git diff` inspection before every commit. | Sprint 1 |
| **NFR-02** | **Stateful Session & Expiry Enforcement** | Server-side sessions stored in PostgreSQL expire automatically after **8 hours** (`expiresAt`) and are deleted immediately upon logout; 100% of unauthenticated, expired, or logged-out requests to protected endpoints return `401 Unauthorized` without returning private data. | Automated API integration tests covering valid login, invalid login, unauthenticated access, expired session record, and post-logout request rejection. | Sprint 1 |
| **NFR-03** | **Concurrency & Atomic Seat Allocation** | When 5 or more concurrent registration requests target a `PUBLISHED` event with `1` remaining seat, exactly `1` request succeeds (`201 Created`), all others fail (`409 Conflict`), and persisted `ACTIVE` registrations equal `event.capacity` with zero overbooking. | **API concurrency test** (automated integration test firing parallel `POST /api/events/:id/registrations` requests against a 1-seat event and asserting response codes and final DB row count). | **Sprint 1** |
| **NFR-04** | **Durable Database Persistence** | 100% of committed users, active sessions, events, and registrations persist in PostgreSQL and remain retrievable after an application server restart. | Automated API/DB persistence integration test in Sprint 1; container restart and redeploy verification (`C-05`) in Lab 5. | Sprint 1 & Lab 5 |
| **NFR-05** | **Cloud-Ready Runtime & Health Probes** | The backend reads `PORT`, `DATABASE_URL`, and `SESSION_SECRET` from environment variables, returns `200 OK` on `GET /api/health`, returns `200 OK` on `GET /api/ready` when PostgreSQL is reachable, and returns `503 Service Unavailable` when the database connection fails. | Automated API integration tests for `/api/health` and `/api/ready` (healthy and simulated DB failure) in Sprint 1; Cloud Run smoke check in Lab 5. | Sprint 1 & Lab 5 |

---

## 7. Assumptions, Questions, and Resolved Design Decisions (`AD-01` to `AD-06`)

| ID | Ambiguity / Question | Resolved Decision & Assumption | Impacted IDs |
|---|---|---|---|
| **AD-01** | What types of events are supported in the university context? | The system targets **Faculty Workshops and Academic Seminars** (`WORKSHOP`, `SEMINAR`). Every event includes `title`, `description`, `category`, `location`, `startAt`, `endAt`, and `capacity`. | `FR-02`, `FR-03` |
| **AD-02** | What are the minimum and maximum allowed capacities for an event? | Event `capacity` must be an integer from **`1` to `500`** (`1 <= capacity <= 500`), matching faculty lab and seminar room sizes and providing clear boundary test values (`0`, `1`, `500`, `501`). | `FR-02`, `BR-01` |
| **AD-03** | Does an event require dates, and when can it be published? | Every event requires `startAt`, `endAt` (`endAt > startAt`), and `location`. Events are always created as `DRAFT` first (`POST /api/events`) and published via a separate action (`POST /api/events/:id/publish`). At publication time, `startAt` must be in the future (`startAt > now`). | `FR-02`, `BR-02`, `BR-03` |
| **AD-04** | Can an organizer change an event's capacity after creation or publication? | Yes, an organizer may update the capacity of their own event (`1 <= newCapacity <= 500`), provided `newCapacity` is never less than the current number of `ACTIVE` registrations (`newCapacity >= activeRegistrationsCount`). | `FR-02`, `BR-01`, `BR-07` |
| **AD-05** | How is duplicate registration prevented now vs. when cancellation is added in Sprint 2? | **Assumption:** Sprint 1 does not include registration cancellation (`FR-07` is in Sprint 2), so every registration created in Sprint 1 remains `ACTIVE` and a composite unique constraint on `(eventId, userId)` suffices in Sprint 1. In Sprint 2, when `CANCELLED` status is introduced, the schema will be migrated to a partial unique index enforcing uniqueness only where `status = 'ACTIVE'` (allowing re-registration after cancellation), and this evolution will be recorded as an approved contract change. | `FR-04`, `FR-07`, `BR-05` |
| **AD-06** | How are user sessions and test credentials managed safely in a public repository? | Sessions use an `httpOnly` cookie storing a random session ID persisted in PostgreSQL with an **8-hour expiry**, deleted on logout. Seed accounts read passwords exclusively from environment variables (`SEED_ORGANIZER_PASSWORD`, `SEED_PARTICIPANT_PASSWORD`) in `.env` (gitignored). | `FR-01`, `NFR-01`, `NFR-02` |
