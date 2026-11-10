# Requirements-to-Feature-to-Sprint Traceability Matrix

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme:** Theme 3 — Event Registration and Attendance System (Faculty Workshops & Seminars)

---

## 1. Functional Requirements (`FR`) Traceability

| Requirement ID | Requirement Summary | Mapped Feature(s) | Planned Sprint | Acceptance Criteria (`AC`) | Planned Verification (`STS`) |
|---|---|---|---|---|---|
| **FR-01** | User authentication (`login`, `me`, `logout`) with DB-backed session | `F-01` | Sprint 1 | `AC-F01-01`–`AC-F01-05`, `AC-F01-07` | `TEST-F01-01`–`TEST-F01-05`, `TEST-F01-07`, `TEST-F01-08` |
| **FR-02** | Create event in `DRAFT`, publish separately to `PUBLISHED`, and update capacity | `F-02` | Sprint 1 | `AC-F02-01`–`AC-F02-04`, `AC-F02-06` | `TEST-F02-01`–`TEST-F02-03`, `TEST-F02-05`, `TEST-F02-08` |
| **FR-03** | Discover and view `PUBLISHED` events (`remainingSeats`) and organizer's own `DRAFT`/`PUBLISHED` events | `F-02` | Sprint 1 | `AC-F02-03`, `AC-F02-05` | `TEST-F02-02`, `TEST-F02-04`, `TEST-F02-08` |
| **FR-04** | Participant registers for a `PUBLISHED` event (`ACTIVE` registration) | `F-03` | Sprint 1 | `AC-F03-01` | `TEST-F03-01`, `TEST-F03-07` |
| **FR-05** | Participant views their own persisted registrations (`GET /api/registrations/me`) | `F-03` | Sprint 1 | `AC-F03-06` | `TEST-F03-01`, `TEST-F03-06`, `TEST-F03-07` |
| **FR-06** | Organizer views the registrant roster for an event they own (`GET /api/events/:id/registrations`) | `F-04` | Sprint 1 | `AC-F04-01`, `AC-F04-02` | `TEST-F04-01`, `TEST-F04-06` |
| **FR-07** | Participant cancels own `ACTIVE` registration and releases seat | `F-05` | Sprint 2 | Elaborated in Sprint 2 contract | Sprint 2 API/DB integration & UI tests |
| **FR-08** | Organizer sets registration deadline; reject registrations/cancellations past deadline | `F-06` | Sprint 2 | Elaborated in Sprint 2 contract | Sprint 2 unit & API integration tests |
| **FR-09** | Organizer edits/closes events; users search and filter events by category/availability | `F-07` | Sprint 2 | Elaborated in Sprint 2 contract | Sprint 2 API & UI tests |
| **FR-10** | Organizer checks in participants and records attendance (`PRESENT` / `ABSENT`) | `F-08` | Sprint 3 | Elaborated in Sprint 3 contract | Sprint 3 API/DB & UI tests |
| **FR-11** | Organizer views event attendance summary and participation rate report | `F-09` | Sprint 3 | Elaborated in Sprint 3 contract | Sprint 3 unit, API & E2E tests |

---

## 2. Business Rules (`BR`) Traceability

| Rule ID | Business Rule Summary | Mapped Feature(s) | Establishes & Verifies In | Acceptance Criteria (`AC`) | Planned Verification (`STS`) |
|---|---|---|---|---|---|
| **BR-01** | `1 <= capacity <= 500` integer; cannot reduce capacity below `activeRegistrationsCount` | `F-02` (extended in `F-07`) | **Sprint 1** | `AC-F02-01`, `AC-F02-02`, `AC-F02-06` | `TEST-F02-01`, `TEST-F02-03`, `TEST-F02-05` |
| **BR-02** | `endAt > startAt`; `DRAFT -> PUBLISHED` requires `startAt > now` | `F-02` (extended in `F-06`) | **Sprint 1** | `AC-F02-02`, `AC-F02-03`, `AC-F02-04` | `TEST-F02-01`, `TEST-F02-02`, `TEST-F02-03` |
| **BR-03** | Participants can only view and register for `PUBLISHED` events (`DRAFT` rejected) | `F-02`, `F-03` | **Sprint 1** | `AC-F02-05`, `AC-F03-05` | `TEST-F02-04`, `TEST-F03-05` |
| **BR-04** | Active registrations never exceed `capacity`; atomic seat allocation for competing last-seat requests | `F-03` (extended in `F-05`) | **Sprint 1** | `AC-F03-03`, `AC-F03-04` | `TEST-F03-03`, `TEST-F03-04` (API concurrency test) |
| **BR-05** | At most 1 `ACTIVE` registration per participant per event (`409 Conflict` on duplicate) | `F-03` (extended in `F-05`) | **Sprint 1** | `AC-F03-02` | `TEST-F03-02` |
| **BR-06** | Backend role enforcement (`ORGANIZER` vs. `PARTICIPANT` operations return `403 Forbidden`) | `F-02`, `F-03`, `F-04` (and `F-05`–`F-09`) | **Sprint 1** | `AC-F02-07`, `AC-F03-07`, `AC-F04-04` | `TEST-F02-06`, `TEST-F03-06`, `TEST-F04-03` |
| **BR-07** | Resource ownership (`event.organizerId == currentUser.id`) & participant registration privacy isolation | `F-02`, `F-03`, `F-04` (and `F-05`–`F-09`) | **Sprint 1** | `AC-F02-08`, `AC-F03-06`, `AC-F04-03`, `AC-F04-04` | `TEST-F02-07`, `TEST-F03-06`, `TEST-F04-02`, `TEST-F04-03` |

---

## 3. Non-Functional Requirements (`NFR`) Traceability

| NFR ID | NFR Summary & Target | Mapped Feature / System Responsibility | Establishes & Verifies In | Acceptance Criteria (`AC`) | Planned Verification (`STS`) |
|---|---|---|---|---|---|
| **NFR-01** | `bcryptjs` password hashing (cost >= 10); 0 secrets/hashes in Git or API responses | `F-01`, `F-04` (System Auth & Serialization) | **Sprint 1** | `AC-F01-01`, `AC-F04-01` | `TEST-F01-01`, `TEST-F01-02`, `TEST-F04-01` + pre-commit diff check |
| **NFR-02** | Stateful DB session (`httpOnly` cookie, 8h TTL, immediate logout revocation; `401` on invalid/expired) | `F-01`, `F-03`, `F-04` (Auth Middleware) | **Sprint 1** | `AC-F01-01`–`AC-F01-06`, `AC-F03-07`, `AC-F04-04` | `TEST-F01-02`–`TEST-F01-06`, `TEST-F04-03` |
| **NFR-03** | Zero overbooking under >= 5 concurrent requests competing for 1 remaining seat | `F-03` (Transactional Seat Lock) | **Sprint 1** | `AC-F03-04` | `TEST-F03-04` (Parallel API concurrency test) |
| **NFR-04** | 100% durable persistence in PostgreSQL across restarts | `F-01`–`F-04` (PostgreSQL + Prisma Migrations) | **Sprint 1 & Lab 5** | `AC-F01-05`, `AC-F02-01`, `AC-F03-01`, `AC-F04-01` | `TEST-F01-05`, `TEST-F02-02`, `TEST-F03-01`, `TEST-F04-01` + Lab 5 `C-05` |
| **NFR-05** | Environment-driven config (`PORT`, `DATABASE_URL`, `SESSION_SECRET`) & `/api/health`, `/api/ready` (`503` on DB down) | `F-04` (Runtime Readiness & Config) | **Sprint 1 & Lab 5** | `AC-F04-05`, `AC-F04-06` | `TEST-F04-04`, `TEST-F04-05` + Lab 5 `C-03`, `C-04` |

---

## 4. Coverage Gaps and Approved Changes Log

- **Uncovered Baseline Requirements (Coverage Gaps):** **None (0 gaps).** Every baseline requirement (`FR-01`–`FR-11`, `BR-01`–`BR-07`, `NFR-01`–`NFR-05`) is mapped to a feature and sprint. All Sprint 1 requirements (`FR-01`–`FR-06`, `BR-01`–`BR-07`, `NFR-01`–`NFR-05`) have complete pre-implementation contracts (`AC` + `STS`).
- **Planned / Approved Schema Evolution (`AD-05`):** In Sprint 1 (`F-03`), `BR-05` is enforced with a composite unique constraint `@@unique([eventId, userId])` because cancellation (`FR-07`) is not in Sprint 1. In Sprint 2 (`F-05`), when `CANCELLED` status is added, an additive migration will replace that constraint with a partial unique index `ON "Registration"("eventId", "userId") WHERE status = 'ACTIVE'` so a participant who cancelled can re-register if seats remain.
