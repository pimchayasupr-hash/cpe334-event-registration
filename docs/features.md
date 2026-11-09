# Feature Inventory (`F-01` to `F-09`)

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme:** Theme 3 — Event Registration and Attendance System (Faculty Workshops & Seminars)
- **Team Members:**
  1. Pimchaya Suprateravarnit (`67070505223`, GitHub: `pimchayasupr-hash`)
  2. Suphattra Kongsiriphat (`67070505228`, GitHub: `supa-gif173`)

---

## 1. Complete Product Feature Inventory (Sprints 1–3)

| Feature ID | Feature Name & Short Description | Related Requirements (`FR` / `BR` / `NFR`) | Dependencies | Planned Sprint | Contract / Status |
|---|---|---|---|---|---|
| **F-01** | **User Authentication and Session Management:** Backend login (`POST /api/auth/login`), current-user retrieval (`GET /api/auth/me`), and logout (`POST /api/auth/logout`) using `bcryptjs` password hashes and a PostgreSQL `Session` table (`httpOnly` cookie, 8-hour expiry, `crypto.randomBytes(32).toString('hex')`). | `FR-01`, `NFR-01`, `NFR-02`, `NFR-04`, `AD-06` | PostgreSQL, Prisma (`User`, `Session`), Seed script | **Sprint 1** | `docs/sprints/sprint-1/f-01-auth-session.md` |
| **F-02** | **Event Creation, Separate Publication, Discovery, and Capacity Management:** `ORGANIZER` creates events exclusively in `DRAFT` status (`1 <= capacity <= 500`, `endAt > startAt`), publishes owned events to `PUBLISHED` (`startAt > now`), updates capacity (`newCapacity >= activeCount`), and users browse `PUBLISHED` events. | `FR-02`, `FR-03`, `BR-01`, `BR-02`, `BR-03`, `BR-06`, `BR-07`, `NFR-04`, `AD-01`–`AD-04` | `F-01` (Auth & `ORGANIZER` role guard) | **Sprint 1** | `docs/sprints/sprint-1/f-02-event-management.md` |
| **F-03** | **Participant Event Registration, Own Registrations View, Capacity Enforcement, and Concurrency Protection:** `PARTICIPANT` registers for `PUBLISHED` events inside an atomic PostgreSQL transaction (`SELECT ... FOR UPDATE` on `Event`) enforcing `activeCount < capacity` and 1 active registration per user per event (`@@unique([eventId, userId])`), and views own registrations (`GET /api/registrations/me`). | `FR-04`, `FR-05`, `BR-03`, `BR-04`, `BR-05`, `BR-06`, `BR-07`, `NFR-03`, `NFR-04`, `AD-05` | `F-01` (`PARTICIPANT` auth), `F-02` (`PUBLISHED` events) | **Sprint 1** | `docs/sprints/sprint-1/f-03-registration-concurrency.md` |
| **F-04** | **Organizer Event Registrant Roster, Ownership Enforcement, and Runtime Readiness Probes:** `ORGANIZER` retrieves the registrant roster (`GET /api/events/:id/registrations`) strictly for events where `organizerId == currentUser.id`; exposes `GET /api/health` and `GET /api/ready` (`503` when DB unreachable). | `FR-06`, `BR-06`, `BR-07`, `NFR-01`, `NFR-02`, `NFR-04`, `NFR-05` | `F-01`, `F-02`, `F-03` | **Sprint 1** | `docs/sprints/sprint-1/f-04-organizer-roster.md` |
| **F-05** | **Participant Registration Cancellation and Seat Release:** `PARTICIPANT` cancels their own `ACTIVE` registration (`status -> CANCELLED`) before the event starts or deadline passes, releasing the seat back to `remainingSeats` and migrating uniqueness to a partial index on `status = 'ACTIVE'`. | `FR-07`, `BR-04`, `BR-05`, `BR-06`, `BR-07`, `AD-05` | `F-03` | **Sprint 2** | Planned for Sprint 2 |
| **F-06** | **Event Registration Deadline Enforcement:** `ORGANIZER` configures an optional or required `registrationDeadline` (`registrationDeadline <= startAt`); backend rejects new registrations and cancellations after `now > registrationDeadline`. | `FR-08`, `BR-02`, `BR-06`, `BR-07` | `F-02`, `F-03`, `F-05` | **Sprint 2** | Planned for Sprint 2 |
| **F-07** | **Event Editing, Registration Closing, and Catalog Search/Filtering:** `ORGANIZER` edits event metadata (`title`, `description`, `location`, schedule) or manually closes registration (`CLOSED`), and users filter/search `PUBLISHED` events by category (`WORKSHOP`, `SEMINAR`), keyword, and seat availability. | `FR-09`, `BR-01`, `BR-02`, `BR-03`, `BR-06`, `BR-07` | `F-02` | **Sprint 2** | Planned for Sprint 2 |
| **F-08** | **Participant On-Site Check-In and Attendance Recording:** `ORGANIZER` marks `ACTIVE` registrants of their own event as `PRESENT` or `ABSENT` (`PATCH /api/events/:id/registrations/:regId/attendance`) with timestamped audit fields. | `FR-10`, `BR-06`, `BR-07`, `NFR-04` | `F-03`, `F-04` | **Sprint 3** | Planned for Sprint 3 |
| **F-09** | **Event Attendance Summary and Participation Rate Reporting:** `ORGANIZER` views an aggregate summary for each owned event showing total capacity, active registrations, cancellations, checked-in (`PRESENT`) count, no-show (`ABSENT`) count, and attendance percentage. | `FR-11`, `BR-06`, `BR-07` | `F-04`, `F-05`, `F-08` | **Sprint 3** | Planned for Sprint 3 |

---

## 2. Feature Dependency Summary

1. **Foundation (`F-01`):** Provides authenticated identity (`req.user`) and role-based access control (`ORGANIZER` vs. `PARTICIPANT`) required by all domain features (`F-02`–`F-09`).
2. **Core Event Lifecycle (`F-02`):** Creates and publishes `Event` records consumed by registration (`F-03`), roster inspection (`F-04`), deadlines (`F-06`), and search/editing (`F-07`).
3. **Seat Allocation & Roster (`F-03`, `F-04`):** Establishes transactional registration records consumed by cancellation (`F-05`), check-in (`F-08`), and attendance reporting (`F-09`).
