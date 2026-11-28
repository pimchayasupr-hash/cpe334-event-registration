# Sprint 3 Feature Engineering Contract — F-08: Participant On-Site Check-In and Attendance Recording

- **Feature ID:** `F-08`
- **Feature Name:** Participant On-Site Check-In and Attendance Recording
- **Target Sprint:** Sprint 3 (Progress at Deliverable 2 / Final Delivery 13 Dec 2026)
- **Linked Requirements:** `FR-10`, `BR-06`, `BR-07`, `NFR-02`, `NFR-04`
- **Linked Issue:** `#42`
- **Contract Version:** `v1.0` (Pre-implementation specification)

---

## 1. Feature-Level Software Design Specification (Feature SDS)

### 1.1 Overview and Workflow
`F-08` allows an authenticated `ORGANIZER` to record and update attendance (`PRESENT` / `ABSENT`) for `ACTIVE` registrants of events they own (`FR-10`):

1. **Record / Update Attendance (`PATCH /api/events/:id/registrations/:regId/attendance`):**
   - Requires an authenticated `ORGANIZER` (`BR-06`).
   - Validates request body `{ attendanceStatus }`: must be strictly `'PRESENT'` or `'ABSENT'` (invalid value or missing field returns `400 Bad Request`).
   - Looks up `Event` by `:id` (if not found → `404 Not Found`) and verifies strict ownership `event.organizerId === currentUser.id` (`BR-07`; non-owner → `403 Forbidden`).
   - Verifies event status is `PUBLISHED` or `CLOSED` (if `DRAFT` → `409 Conflict`).
     - *Operational Flexibility Note (Approved Decision `4.1 A` / `2ก`):* Recording attendance is permitted on any owned `PUBLISHED` or `CLOSED` event without enforcing `now >= startAt`, enabling pre-session check-in desks and deterministic UAT/demo verification while preserving all role, ownership, and registration-status invariants of `FR-10`.
   - Looks up `Registration` by `:regId` scoped to `eventId = :id` (if not found or belongs to another event → `404 Not Found`).
   - Verifies `registration.status === 'ACTIVE'` (if `CANCELLED` → `409 Conflict`, `"Cannot record attendance for a cancelled registration"`).
   - Updates `attendanceStatus` (`PRESENT` | `ABSENT`), sets `checkedInAt = now()` and `checkedInBy = currentUser.id` (supporting toggling `PRESENT <-> ABSENT` to correct check-in mistakes), persists to PostgreSQL (`NFR-04`), and returns `200 OK`.
2. **Roster Visibility (`GET /api/events/:id/registrations`):**
   - Extends each registrant entry in the existing organizer roster response with `attendanceStatus` (`'UNMARKED' | 'PRESENT' | 'ABSENT'`), `checkedInAt` (`string | null`), and `checkedInBy` (`string | null`) while preserving all Sprint 1 fields (`id`, `status`, `createdAt`, `participant: { id, name, email }`).

### 1.2 Validation, Boundary Cases, and Permissions
- **Default State:** Every new `ACTIVE` registration starts with `attendanceStatus = 'UNMARKED'`, `checkedInAt = null`, `checkedInBy = null`.
- **Invalid Input:** `{ attendanceStatus: "LATE" }`, `{ attendanceStatus: "UNMARKED" }`, or `{}` → `400 Bad Request`.
- **Cross-Event ID Mismatch:** `:regId` exists in DB but belongs to a different event than `:id` → `404 Not Found` (prevents cross-event tampering).
- **Cancelled Registration:** Attempting to mark attendance on a `CANCELLED` registration → `409 Conflict`.
- **Role & Ownership (`BR-06`, `BR-07`, `NFR-02`):**
  - Unauthenticated → `401 Unauthorized`.
  - `PARTICIPANT` (even for their own registration) → `403 Forbidden`.
  - Non-owner `Organizer B` → `403 Forbidden`; registration unmodified.

---

## 2. UI, API, and Data Specifications

### 2.1 UI Behavior
- **Organizer Event Roster (`/organizer/events/:id/registrations`):**
  - Displays each `ACTIVE` registrant's current `attendanceStatus` badge (`UNMARKED`, `PRESENT`, `ABSENT`) and `checkedInAt` timestamp when marked.
  - Provides **Mark Present** and **Mark Absent** action buttons per registrant row calling `PATCH /api/events/:id/registrations/:regId/attendance`.

### 2.2 API Endpoint Specifications

| Method & Path | Role / Access | Request Body | Success Response | Error Responses |
|---|---|---|---|---|
| `PATCH /api/events/:id/registrations/:regId/attendance` | `ORGANIZER` (Owner) | `{ "attendanceStatus": "PRESENT" \| "ABSENT" }` | `200 OK`<br>`{ "registration": { "id": string, "eventId": string, "status": "ACTIVE", "attendanceStatus": "PRESENT" \| "ABSENT", "checkedInAt": string, "checkedInBy": string } }` | `400` invalid `attendanceStatus`<br>`401` unauthenticated<br>`403` `PARTICIPANT` or non-owner `ORGANIZER`<br>`404` event or registration not found for event<br>`409` event is `DRAFT` or registration is `CANCELLED` |
| `GET /api/events/:id/registrations` *(extended)* | `ORGANIZER` (Owner) | None | `200 OK`<br>Existing fields + `attendanceStatus`, `checkedInAt`, `checkedInBy` per registrant | Unchanged (`401`, `403`, `404`) |

### 2.3 Data Model and Migration (Additive)
- **New Enum (Additive):** `enum AttendanceStatus { UNMARKED PRESENT ABSENT }`
- **New Columns on `Registration` (Additive, Safe Defaults/Nullable):**
  - `attendanceStatus AttendanceStatus @default(UNMARKED)`
  - `checkedInAt DateTime?`
  - `checkedInBy String? @db.Uuid`
- **Unchanged Layers:** `User`, `Session`, `Event`, `auth.routes.ts`, `health.routes.ts`, and `seed.ts` require **no changes**.

---

## 3. Acceptance Criteria (`AC`)

| AC ID | Criterion (Observable Expected Outcome) | Linked Req |
|---|---|---|
| **AC-F08-01** | Given an `ORGANIZER` who owns a `PUBLISHED` or `CLOSED` event with an `ACTIVE` registration (default `UNMARKED`), when `PATCH /api/events/:id/registrations/:regId/attendance` is called with `{ "attendanceStatus": "PRESENT" }` (or `"ABSENT"`), then PostgreSQL persists `attendanceStatus`, non-null `checkedInAt`, and `checkedInBy = currentUser.id`, returning `200 OK`. | `FR-10`, `NFR-04` |
| **AC-F08-02** | Given an `ACTIVE` registration already marked `PRESENT`, when the owning `ORGANIZER` calls `PATCH .../attendance` with `{ "attendanceStatus": "ABSENT" }`, then `attendanceStatus` updates to `'ABSENT'` (`200 OK`) and persists across subsequent `GET /api/events/:id/registrations`. | `FR-10`, `NFR-04` |
| **AC-F08-03** | Given an invalid `attendanceStatus` (e.g., `"LATE"`, `"UNMARKED"`, empty), when `PATCH .../attendance` is called, then the server responds `400 Bad Request` and leaves the registration unchanged. | `FR-10` |
| **AC-F08-04** | Given a `CANCELLED` registration or a `DRAFT` event, when the owning `ORGANIZER` calls `PATCH .../attendance`, then the server responds `409 Conflict` and leaves `attendanceStatus` unchanged. | `FR-10` |
| **AC-F08-05** | Given a `PARTICIPANT`, a non-owner `Organizer B`, or an unauthenticated client, when calling `PATCH /api/events/:id/registrations/:regId/attendance`, then the server responds `403 Forbidden` (or `401 Unauthorized`) and the registration is unmodified. | `BR-06`, `BR-07`, `NFR-02` |
| **AC-F08-06** | Given a `regId` belonging to `Event B` submitted against `Event A`'s URL (`PATCH /api/events/:eventAId/registrations/:regBId/attendance`), then the server responds `404 Not Found` and `regBId` is unmodified. | `BR-07` |

---

## 4. Software Test Specification (`STS`)

| Test ID | Linked AC | Test Level | Preconditions / Input | Action | Expected Result |
|---|---|---|---|---|---|
| **TEST-F08-01** | `AC-F08-01`, `AC-F08-02` | API/DB Integration | `Organizer A` owns `PUBLISHED` event with `ACTIVE` registration `R1` | Mark `R1` `PRESENT`, verify via `GET /api/events/:id/registrations`, then toggle to `ABSENT` | Both `PATCH` calls return `200 OK` with non-null `checkedInAt` and `checkedInBy = Organizer A`; roster reflects persisted status |
| **TEST-F08-02** | `AC-F08-03` | API/DB Integration | `Organizer A` owns `PUBLISHED` event with `R1` | Call `PATCH .../attendance` with `{ attendanceStatus: "LATE" }` and `{}` | Both return `400 Bad Request`; `R1` stays `UNMARKED` |
| **TEST-F08-03** | `AC-F08-04` | API/DB Integration | `R_cancelled` has `status = CANCELLED` on owned `PUBLISHED` event | Call `PATCH .../attendance` with `{ attendanceStatus: "PRESENT" }` | Returns `409 Conflict`; `R_cancelled` stays `UNMARKED` |
| **TEST-F08-04** | `AC-F08-05` | API/DB Integration | `Event A` owned by `Organizer A` with `R1`; `Organizer B`, `PARTICIPANT`, and unauthenticated client | Call `PATCH .../attendance` for each unauthorized actor | `Organizer B` → `403`, `PARTICIPANT` → `403`, unauth → `401`; `R1` unchanged |
| **TEST-F08-05** | `AC-F08-06` | API/DB Integration | `Event A` and `Event B` owned by `Organizer A`; `R_B` belongs to `Event B` | Call `PATCH /api/events/:eventAId/registrations/:R_B/attendance` | Returns `404 Not Found`; `R_B` unchanged |

---

## 5. Impact on Sprint 1 Behavior & Regression Protection

- **Sprint 1 Behaviors That Must Remain Unchanged:**
  - `GET /api/events/:id/registrations` (`F-04`) continues to return only `ACTIVE` registrations, enforce `403` for `PARTICIPANT` and non-owner `ORGANIZER`, and omit `passwordHash` (`NFR-01`).
  - Existing Sprint 1 registrations automatically receive `attendanceStatus = 'UNMARKED'` via DB default without breaking any `F-03` or `F-04` assertions.
- **Protecting Sprint 1 Regression Suites:**
  - `server/tests/roster-and-health.test.ts` (5 tests), `server/tests/registrations.test.ts` (6 tests), `server/tests/events.test.ts` (6 tests), `server/tests/auth.test.ts` (7 tests), `server/tests/seed-config.test.ts` (9 tests).

---

## 6. Definition of Done (DoD) and Revision History

### 6.1 Definition of Done
1. Pre-implementation contract reviewed and merged into `staging` prior to implementation.
2. Failing tests (`TEST-F08-01`..`TEST-F08-05`) committed as a RED commit (`docs/evidence/f-08-red.txt`).
3. Additive migration (`AttendanceStatus`, `checkedInAt`, `checkedInBy`) verified on PostgreSQL.
4. Implementation committed as a separate GREEN commit with full regression suites passing (`docs/evidence/f-08-green.txt`).
5. Reviewed and approved by teammate on GitHub PR into `staging`.

### 6.2 Contract Revision History

| Version | Date | Author | Summary of Change |
|---|---|---|---|
| `v1.0` | 2026-11-28 | Pimchaya Suprateravarnit | Initial pre-implementation contract for `F-08: Participant On-Site Check-In and Attendance Recording` (aligned with `FR-10`, decision `4.1 A`). |
