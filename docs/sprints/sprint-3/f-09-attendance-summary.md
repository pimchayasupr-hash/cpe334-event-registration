# Sprint 3 Feature Engineering Contract — F-09: Event Attendance Summary and Participation Rate Reporting

- **Feature ID:** `F-09`
- **Feature Name:** Event Attendance Summary and Participation Rate Reporting
- **Target Sprint:** Sprint 3 (Progress at Deliverable 2 / Final Delivery 13 Dec 2026)
- **Linked Requirements:** `FR-11`, `BR-06`, `BR-07`, `NFR-02`, `NFR-04`
- **Linked Issue:** `#42`
- **Contract Version:** `v1.0` (Pre-implementation specification)

---

## 1. Feature-Level Software Design Specification (Feature SDS)

### 1.1 Overview and Workflow
`F-09` provides an authenticated `ORGANIZER` with an accurate aggregate attendance summary for each event they own (`FR-11`):

1. **Retrieve Event Attendance Summary (`GET /api/events/:id/summary`):**
   - Requires an authenticated `ORGANIZER` (`BR-06`).
   - Looks up `Event` by `:id` (if not found → `404 Not Found`) and verifies strict ownership `event.organizerId === currentUser.id` (`BR-07`; non-owner → `403 Forbidden`).
   - Computes real-time aggregates directly from PostgreSQL `Registration` rows for `eventId = :id`:
     - `capacity`: `event.capacity`
     - `activeRegistrationsCount`: count of rows where `status = 'ACTIVE'`
     - `cancelledRegistrationsCount`: count of rows where `status = 'CANCELLED'`
     - `remainingSeats`: `Math.max(0, capacity - activeRegistrationsCount)`
     - `presentCount`: count of rows where `status = 'ACTIVE'` AND `attendanceStatus = 'PRESENT'`
     - `absentCount`: count of rows where `status = 'ACTIVE'` AND `attendanceStatus = 'ABSENT'`
     - `unmarkedCount`: count of rows where `status = 'ACTIVE'` AND `attendanceStatus = 'UNMARKED'`
     - `attendanceRate`: percentage (`0` to `100`, rounded to 2 decimal places) defined explicitly below.

### 1.2 Explicit Counting Rules for `UNMARKED`, `CANCELLED`, and Denominator
- **Denominator Definition:** The denominator for `attendanceRate` is strictly **`activeRegistrationsCount`** (never `capacity` and never including `CANCELLED` rows):
  - If `activeRegistrationsCount === 0`, then `attendanceRate = 0` (never `NaN` or `null`).
  - Otherwise, `attendanceRate = Math.round((presentCount / activeRegistrationsCount) * 10000) / 100`.
- **Treatment of `UNMARKED`:** `ACTIVE` registrations with `attendanceStatus = 'UNMARKED'` are:
  - Counted explicitly in `unmarkedCount`
  - **Included** in the denominator `activeRegistrationsCount`
  - **Excluded** from the numerator `presentCount` (an unmarked registrant is not counted as present).
- **Treatment of `CANCELLED`:** `CANCELLED` registrations are counted only in `cancelledRegistrationsCount` and are **excluded** from `activeRegistrationsCount`, `presentCount`, `absentCount`, `unmarkedCount`, and `attendanceRate`.
- **Counting Invariant:** `presentCount + absentCount + unmarkedCount === activeRegistrationsCount` always holds.

### 1.3 Validation, Boundary Cases, and Permissions
- **Zero-Registration Boundary:** Event with `0` active registrations returns `activeRegistrationsCount: 0`, `presentCount: 0`, `absentCount: 0`, `unmarkedCount: 0`, `attendanceRate: 0` (`200 OK`).
- **Mixed Attendance Boundary:** Example: `capacity = 10`, `3 ACTIVE` (`1 PRESENT`, `1 ABSENT`, `1 UNMARKED`), `2 CANCELLED` → `activeRegistrationsCount = 3`, `cancelledRegistrationsCount = 2`, `presentCount = 1`, `absentCount = 1`, `unmarkedCount = 1`, `attendanceRate = 33.33`.
- **Role & Ownership (`BR-06`, `BR-07`, `NFR-02`):**
  - Unauthenticated → `401 Unauthorized`.
  - `PARTICIPANT` → `403 Forbidden`.
  - Non-owner `Organizer B` → `403 Forbidden` without leaking counts.

---

## 2. UI, API, and Data Specifications

### 2.1 UI Behavior
- **Organizer Event Roster / Summary Header (`/organizer/events/:id/registrations`):**
  - Renders summary metric cards showing `Capacity`, `Active`, `Cancelled`, `Present`, `Absent`, `Unmarked`, and `Attendance Rate (%)`, automatically refreshed after any `F-08` check-in update.

### 2.2 API Endpoint Specifications

| Method & Path | Role / Access | Request Params | Success Response | Error Responses |
|---|---|---|---|---|
| `GET /api/events/:id/summary` | `ORGANIZER` (Owner) | `:id` (Event UUID) | `200 OK`<br>`{ "summary": { "eventId": string, "title": string, "status": string, "capacity": number, "remainingSeats": number, "activeRegistrationsCount": number, "cancelledRegistrationsCount": number, "presentCount": number, "absentCount": number, "unmarkedCount": number, "attendanceRate": number } }` | `401` unauthenticated<br>`403` `PARTICIPANT` or non-owner `ORGANIZER`<br>`404` event not found |

### 2.3 Data Model and Migration
- **No additional schema migration is required for `F-09`.** It queries the `Event` and `Registration` columns introduced in Sprint 1, `F-05` (`CANCELLED`), and `F-08` (`AttendanceStatus`).
- **Unchanged Layers:** `User`, `Session`, `schema.prisma` (after `F-08`), `auth.routes.ts`, `registrations.routes.ts`, `health.routes.ts`, and `seed.ts` require **no changes**.

---

## 3. Acceptance Criteria (`AC`)

| AC ID | Criterion (Observable Expected Outcome) | Linked Req |
|---|---|---|
| **AC-F09-01** | Given an `ORGANIZER` who owns an event with `0` registrations, when `GET /api/events/:id/summary` is called, then the server responds `200 OK` with `activeRegistrationsCount: 0`, `cancelledRegistrationsCount: 0`, `presentCount: 0`, `absentCount: 0`, `unmarkedCount: 0`, and `attendanceRate: 0`. | `FR-11` |
| **AC-F09-02** | Given an owned event with mixed `ACTIVE` (`PRESENT`, `ABSENT`, `UNMARKED`) and `CANCELLED` registrations, when `GET /api/events/:id/summary` is called, then all counts match PostgreSQL state, `presentCount + absentCount + unmarkedCount === activeRegistrationsCount`, `CANCELLED` rows are excluded from `attendanceRate`, and `attendanceRate === Math.round((presentCount / activeRegistrationsCount) * 10000) / 100`. | `FR-11`, `NFR-04` |
| **AC-F09-03** | Given a `PARTICIPANT`, non-owner `Organizer B`, or unauthenticated client, when calling `GET /api/events/:id/summary`, then the server responds `403 Forbidden` (or `401 Unauthorized`) without returning summary data. | `BR-06`, `BR-07`, `NFR-02` |
| **AC-F09-04** | Given a non-existent event UUID, when an authenticated `ORGANIZER` calls `GET /api/events/:id/summary`, then the server responds `404 Not Found`. | `FR-11` |

---

## 4. Software Test Specification (`STS`)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
|---|---|---|---|---|---|
| **TEST-F09-01** | `AC-F09-01` | API/DB Integration | `Organizer A` owns event with 0 registrations (`capacity: 20`) | Call `GET /api/events/:id/summary` | `200 OK`; `activeRegistrationsCount: 0`, `cancelledRegistrationsCount: 0`, `presentCount: 0`, `absentCount: 0`, `unmarkedCount: 0`, `attendanceRate: 0`, `remainingSeats: 20` |
| **TEST-F09-02** | `AC-F09-02` | API/DB Integration | Owned event (`capacity: 10`) with 3 `ACTIVE` (`1 PRESENT`, `1 ABSENT`, `1 UNMARKED`) and 2 `CANCELLED` registrations | Call `GET /api/events/:id/summary` | `200 OK`; `activeRegistrationsCount: 3`, `cancelledRegistrationsCount: 2`, `presentCount: 1`, `absentCount: 1`, `unmarkedCount: 1`, `attendanceRate: 33.33`, `remainingSeats: 7` |
| **TEST-F09-03** | `AC-F09-03`, `AC-F09-04` | API/DB Integration | `Event A` owned by `Organizer A`; `Organizer B`, `PARTICIPANT`, unauthenticated client, and random UUID | Call `GET /api/events/:id/summary` for each case | `Organizer B` → `403`, `PARTICIPANT` → `403`, unauth → `401`, unknown UUID → `404` |

---

## 5. Impact on Sprint 1 Behavior & Regression Protection

- **Sprint 1 Behaviors That Must Remain Unchanged:**
  - `GET /api/events/:id/registrations` (`F-04`) and `GET /api/events` (`F-02`) remain unchanged in route path, status codes, and access controls; `F-09` adds a read-only aggregate endpoint (`/api/events/:id/summary`) with zero mutation side effects.
- **Protecting Sprint 1 Regression Suites:**
  - `server/tests/roster-and-health.test.ts` (5 tests), `server/tests/events.test.ts` (6 tests), `server/tests/registrations.test.ts` (6 tests), `server/tests/auth.test.ts` (7 tests), `server/tests/seed-config.test.ts` (9 tests).

---

## 6. Definition of Done (DoD) and Revision History

### 6.1 Definition of Done
1. Pre-implementation contract reviewed and merged into `staging` prior to implementation.
2. Failing tests (`TEST-F09-01`..`TEST-F09-03`) committed as a RED commit (`docs/evidence/f-09-red.txt`).
3. Implementation committed as a separate GREEN commit with full regression suites passing (`docs/evidence/f-09-green.txt`).
4. Reviewed and approved by teammate on GitHub PR into `staging`.

### 6.2 Contract Revision History

| Version | Date | Author | Summary of Change |
|---|---|---|---|
| `v1.0` | 2026-11-28 | Pimchaya Suprateravarnit | Initial pre-implementation contract for `F-09: Event Attendance Summary and Participation Rate Reporting` (aligned with `FR-11`, explicit `UNMARKED` & denominator definition). |
