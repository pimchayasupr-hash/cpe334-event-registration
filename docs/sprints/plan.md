# Three-Sprint Development Plan

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme:** Theme 3 — Event Registration and Attendance System (Faculty Workshops & Seminars)
- **Team Members:**
  1. Pimchaya Suprateravarnit (`67070505223`, GitHub: `pimchayasupr-hash`)
  2. Suphattra Kongsiriphat (`67070505228`, GitHub: `supa-gif173`)

---

## 1. Three-Sprint Overview Table

| Sprint | Checkpoint / Due Date | Sprint Goal | Included Feature IDs | Key Dependencies | Completion Outcome |
|---|---|---|---|---|---|
| **Sprint 1** | **Deliverable 1**<br>(15 Nov 2026)<br>*Used by Lab 5 (15 Nov) & Lab 6 (22 Nov)* | Establish the full-stack engineering baseline, real backend authentication/session lifecycle, role/ownership authorization, and the core end-to-end event publication, registration, last-seat concurrency protection, and roster inspection slice. | `F-01`, `F-02`, `F-03`, `F-04` | PostgreSQL, Prisma schema & seed, pre-implementation contracts (`F-01`–`F-04`) | Working release on `main` (`v1.0.0-sprint1`) with unit, API/DB integration, concurrency (`TEST-F03-04`), and selected UI/E2E tests passing; ready for Docker/CI/CD/GCP deployment in Lab 5. |
| **Sprint 2** | **Deliverable 2**<br>(29 Nov 2026)<br>*Used by Lab 7 (29 Nov)* | Expand core domain lifecycle rules under pre-implementation contracts: participant registration cancellation with seat release, registration deadline enforcement, organizer event editing/closing, and catalog search/category filtering. | `F-05`, `F-06`, `F-07` | Sprint 1 release (`F-01`–`F-04`), Lab 5 CI/CD pipeline, Lab 6 cross-team UAT feedback | Deployed integrated increment on `main` with all Sprint 2 contracts, migrations (partial unique index for active registrations per `AD-05`), and regression tests passing. |
| **Sprint 3** | **Progress at D2 (29 Nov)**<br>**Final Delivery (13 Dec 2026)** | Complete on-site attendance workflows, aggregate reporting, UAT defect resolution, and product hardening across all three sprints. | `F-08`, `F-09` | Sprint 1 (`F-01`–`F-04`) & Sprint 2 (`F-05`–`F-07`) increments | Verified final release deployed on GCP with complete attendance check-in (`PRESENT`/`ABSENT`), attendance summary reports, full regression suite, final PDF report, and demonstration video. |

---

## 2. Detailed Sprint 1 Scope and Feasibility Explanation

### 2.1 Why Sprint 1 (`F-01` to `F-04`) Forms a Complete, Feasible Vertical Slice
Sprint 1 delivers the complete primary domain loop required for Theme 3:
1. **`F-01` (Authentication & Stateful DB Sessions):** Provides real login, current-user retrieval, and logout for `ORGANIZER` and `PARTICIPANT` roles using `bcryptjs` password hashes and a PostgreSQL `Session` table (`httpOnly` cookie, 8-hour expiry). Storing sessions in PostgreSQL ensures immediate readiness for stateless container deployment on Cloud Run in Lab 5 (`R-04`).
2. **`F-02` (Draft Creation, Separate Publication & Capacity Management):** Allows an `ORGANIZER` to create faculty workshop/seminar events in `DRAFT` state (`1 <= capacity <= 500`, `endAt > startAt`), transition owned events to `PUBLISHED` (`startAt > now`), and adjust capacity safely (`newCapacity >= activeRegistrationsCount`), while exposing `PUBLISHED` events to participants.
3. **`F-03` (Participant Registration & Last-Seat Concurrency Safety):** Allows a `PARTICIPANT` to register for a `PUBLISHED` event and view their own registrations (`GET /api/registrations/me`), while enforcing single active registration per user per event (`BR-05`) and serializing competing requests for the last seat via row-level locking (`SELECT ... FOR UPDATE`) inside a PostgreSQL transaction (`BR-04`, `NFR-03`).
4. **`F-04` (Organizer Registrant Roster, Ownership & Readiness Probes):** Allows an `ORGANIZER` to inspect the registrant list exclusively for events they own (`event.organizerId == currentUser.id`, `BR-07`), blocks cross-organizer and participant access (`403 Forbidden`), and provides `/api/health` and `/api/ready` (`503` on DB failure) for operational verification.

### 2.2 Work Explicitly Deferred to Sprints 2 and 3
To keep Sprint 1 focused on high-confidence TDD verification and Lab 5 deployment readiness, secondary lifecycle extensions are scheduled for Sprints 2 and 3:
- **Deferred to Sprint 2 (`F-05`, `F-06`, `F-07`):** Registration cancellation (`CANCELLED` state and seat restoration), registration deadline cutoff enforcement, full event metadata editing/manual closing, and search/category filtering.
- **Deferred to Sprint 3 (`F-08`, `F-09`):** Organizer check-in/attendance status marking (`PRESENT` / `ABSENT`) and event-level attendance summary analytics.

---

## 3. Team Task Allocation Principle Across Sprints

Both team members (**Pimchaya Suprateravarnit** and **Suphattra Kongsiriphat**) participate across specification, test design, implementation, code review, and deployment in every sprint:
- Neither member is restricted to a permanent spec-only or code-only role.
- Every Issue is implemented on a feature branch from `staging` and requires a substantive PR review and approval from the other teammate before merging into `staging`.
- Releases enter `main` exclusively through a reviewed Release PR from `staging`.
