# Lab 6 Part A — Sprint 1 UAT Plan & Handoff

> **Status:** Updated with verified GCP deployment metadata (`e6aad26` / `sdb3eb069-00002-mct`); awaiting partner UAT team assignment (`H3`) and private credential handoff.

## 1. Release & Handoff Metadata

| Item | Value |
| :--- | :--- |
| **Product Team** | ยอดนักบิด (`sec131`) — Pimchaya Suprateravarnit (`@pimchayasupr-hash`), Suphattra Kongsiriphat (`@supa-gif173`) |
| **UAT Team (Partner)** | พวกพี่ชอบบิด (Team 2) — `[รอผู้ใช้กรอก: ชื่อสมาชิกทีมคู่]` |
| **Repository** | `https://github.com/pimchayasupr-hash/cpe334-event-registration` |
| **Tested Release Tag / Commit** | `e6aad269e7b0f459126004e076f4fc432d1abdd0` (`e6aad26`, merged [PR #40](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/40), `Deploy demo` run [`45018492877`](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/45018492877)) |
| **GCP Cloud Run Revision** | `sdb3eb069-00002-mct` (Service `sdb3eb069`, `cpe-se-course-2026`, `asia-southeast1`) |
| **Public Application URL** | `https://sdb3eb069-4d7hbszvwq-as.a.run.app` |
| **Accepted-for-Test Scope** | **Sprint 1 (`F-01` to `F-04`) ONLY:** Authentication & Session (`F-01`), Event Creation/Publish/Capacity (`F-02`), Registration & Concurrency (`F-03`), Organizer Roster & Health/Ready (`F-04`). |
| **Out of Scope (Deferred)** | Sprint 2 (`F-05` cancellation, `F-06` deadline cutoff, `F-07` edit/filter) and Sprint 3 (`F-08` check-in, `F-09` analytics). |

## 2. Test Accounts & Roles (No Secrets in Repo/PDF)

Credentials are **never** stored in this document or Git; they are delivered privately to the UAT Team via the course-approved private channel.

| Account Label | Role | Email / Identifier | Notes |
| :--- | :--- | :--- | :--- |
| `ORG-A` | `ORGANIZER` | `organizer@kmutt.ac.th` | Seeded by `prisma/seed.ts`; creates/publishes events & views own roster |
| `PART-1` | `PARTICIPANT` | `participant@kmutt.ac.th` | Seeded by `prisma/seed.ts`; browses & registers for events |
| `ORG-B` | `ORGANIZER` | `[รอผู้ใช้กรอก — optional]` | Only if a second organizer is provisioned; otherwise cross-organizer step in `UAT-04` is marked N/A |
| `PART-2` | `PARTICIPANT` | `[รอผู้ใช้กรอก — optional]` | Only if a second participant is provisioned; otherwise full-capacity test in `UAT-02` uses `capacity=1` filled by `PART-1` + capacity floor check by `ORG-A` |

## 3. Setup, Execution Order & Reset Instructions

1. **Seed Behavior & Secret Stability (Important):** `server/prisma/seed.ts` uses `prisma.user.upsert` with `update: { passwordHash }`, which **overwrites seeded account passwords every time `sdb3eb069-migrate` runs**. Do **not** rotate Secret Manager secrets (`sdb3eb069-admin-password`, `sdb3eb069-demo-password`) while the UAT Team is testing without notifying them beforehand.
2. **Independence & Sequence:** Cases `UAT-01` through `UAT-06` are self-contained when using unique synthetic event titles (e.g., append timestamp or tester initials). Recommended order: `UAT-06` → `UAT-01` → `UAT-02` → `UAT-03` → `UAT-04` → `UAT-05`.
3. **Pre-Test Check:** Verify `GET https://sdb3eb069-4d7hbszvwq-as.a.run.app/api/health` and `GET https://sdb3eb069-4d7hbszvwq-as.a.run.app/api/ready` return `200 OK` before starting.
4. **Synthetic Data Only:** Use synthetic event titles/locations (e.g., `UAT-Workshop-01`) and never enter real personal data or real passwords.
5. **Reset / Cleanup:** Because Sprint 1 does not include `F-05` (registration cancellation) or event deletion, use fresh synthetic events (`capacity` sized per case) for each run rather than reusing a full event.

---

## 4. Executable UAT Cases (Sprint 1: F-01 – F-04)

### `UAT-01` — Normal Domain Journey: Organizer Publishes Event & Participant Registers
- **Category:** Normal Domain Journey
- **Contract / AC References:** `AC-F02-01`, `AC-F02-03`, `AC-F03-01`, `AC-F03-06`, `AC-F04-01` (`FR-02`, `FR-03`, `FR-04`, `FR-05`, `FR-06`)
- **Objective:** Verify end-to-end Sprint 1 flow from event creation and publication by an organizer to registration and roster verification.
- **Roles:** `ORG-A` (`ORGANIZER`), `PART-1` (`PARTICIPANT`)
- **Preconditions:** Application is reachable; `ORG-A` and `PART-1` accounts exist.
- **Synthetic Inputs:**
  - Title: `UAT-01 Cloud Seminar <timestamp>`
  - Category: `SEMINAR`, Location: `Room CB4-101`, Capacity: `5`
  - `startAt`: 7 days in the future; `endAt`: `startAt` + 2 hours
- **Steps:**
  1. Sign in as `ORG-A` via the UI login form.
  2. Open **Organizer Studio** and create a new event with the synthetic inputs above.
  3. Verify the event appears with status `DRAFT`, then click **Publish**.
  4. Sign out (`Logout`).
  5. Sign in as `PART-1` and open **Event Catalog**.
  6. Locate `UAT-01 Cloud Seminar <timestamp>` and click **Register**.
  7. Open **My Registrations**.
  8. Sign out, sign in as `ORG-A`, and open **View Registrants** on `UAT-01 Cloud Seminar <timestamp>`.
- **Expected Results:**
  - Step 2–3: Event is created as `DRAFT` (`201`), then transitions to `PUBLISHED` (`200`) with `remainingSeats = 5`.
  - Step 6: Registration succeeds (`201`), `remainingSeats` decrements to `4`, and card shows **Registered**.
  - Step 7: `UAT-01 Cloud Seminar <timestamp>` appears in **My Registrations** with status `ACTIVE`.
  - Step 8: Roster lists `PART-1` (`name`, `email`, `ACTIVE`) and never exposes `passwordHash`.

---

### `UAT-02` — Business Rule & Boundary: Full Capacity, Duplicate Registration & Capacity Floor
- **Category:** Business Rule / Boundary
- **Contract / AC References:** `AC-F03-02`, `AC-F03-03`, `AC-F02-06` (`BR-04`, `BR-05`)
- **Objective:** Verify capacity limits and duplicate-registration prevention.
- **Roles:** `ORG-A`, `PART-1`, `PART-2`
- **Preconditions:** `UAT-01` passed or accounts active.
- **Synthetic Inputs:** Event `UAT-02 Cap-1 Workshop <timestamp>`, Capacity: `1`, future `startAt` / `endAt`.
- **Steps:**
  1. As `ORG-A`, create and publish `UAT-02 Cap-1 Workshop <timestamp>` with `capacity = 1`.
  2. As `PART-1`, register for `UAT-02 Cap-1 Workshop <timestamp>`.
  3. As `PART-1`, attempt to register for the same event a second time (via UI or `POST /api/events/:id/registrations`).
  4. Sign out, sign in as `PART-2`, and attempt to register for `UAT-02 Cap-1 Workshop <timestamp>`.
  5. Sign out, sign in as `ORG-A`, and attempt to update capacity of `UAT-02 Cap-1 Workshop <timestamp>` from `1` to `0` (or create a capacity-2 event with 2 active registrations and attempt `capacity = 1`).
- **Expected Results:**
  - Step 2: `201 Created`, `remainingSeats` becomes `0`.
  - Step 3: Rejected with `409 Conflict` (duplicate registration); active count remains `1`.
  - Step 4: Rejected with `409 Conflict` (event full); active count remains `1`.
  - Step 5: Rejected with `409 Conflict` / `400 Bad Request` (`capacity` cannot be below active registrations or `< 1`); event capacity remains unchanged.

---

### `UAT-03` — Business Rule & Boundary: Past-Start Publish Rejection & Draft Visibility
- **Category:** Business Rule / Boundary
- **Contract / AC References:** `AC-F02-04`, `AC-F02-05`, `AC-F03-05` (`BR-02`, `BR-03`)
- **Objective:** Verify that events with a past `startAt` cannot be published and `DRAFT` events are hidden from participants.
- **Roles:** `ORG-A`, `PART-1`
- **Preconditions:** `ORG-A` and `PART-1` logged in sequentially.
- **Synthetic Inputs:**
  - Event A: `UAT-03 Past Draft <timestamp>`, `startAt` = yesterday, `endAt` = yesterday + 2h, `capacity = 10`
  - Event B: `UAT-03 Future Draft <timestamp>`, `startAt` = +10 days, `endAt` = +10 days + 2h, `capacity = 10` (kept in `DRAFT`)
- **Steps:**
  1. As `ORG-A`, create Event A with past `startAt` and attempt to click **Publish**.
  2. As `ORG-A`, create Event B (future `startAt`) and leave it in `DRAFT`.
  3. Sign out, sign in as `PART-1`, and inspect **Event Catalog**.
  4. As `PART-1`, attempt `GET /api/events/<Event-B-ID>` and `POST /api/events/<Event-B-ID>/registrations`.
- **Expected Results:**
  - Step 1: Publish is rejected (`400 Bad Request`); Event A stays `DRAFT`.
  - Step 3: Neither Event A nor Event B appears in `PART-1`'s Event Catalog.
  - Step 4: Both requests are rejected (`404 Not Found` / `409 Conflict`); zero registrations are created.

---

### `UAT-04` — Forbidden Role, Ownership & Sensitive Data Protection
- **Category:** Forbidden Role / Ownership
- **Contract / AC References:** `AC-F01-01`, `AC-F02-07`, `AC-F02-08`, `AC-F03-07`, `AC-F04-03`, `AC-F04-04` (`BR-06`, `BR-07`, `NFR-01`, `NFR-02`)
- **Objective:** Verify role separation, cross-organizer ownership enforcement, and omission of `passwordHash` from responses.
- **Roles:** Unauthenticated client, `PART-1`, `ORG-A` (and `ORG-B` if provisioned)
- **Preconditions:** An existing `PUBLISHED` event owned by `ORG-A` (e.g., from `UAT-01`).
- **Synthetic Inputs:** None (read/attempt forbidden actions).
- **Steps:**
  1. Without logging in, call `GET /api/events` and `GET /api/events/<ORG-A-Event-ID>/registrations`.
  2. Sign in as `PART-1` and inspect the `POST /api/auth/login` response / browser network tab.
  3. As `PART-1`, confirm **Organizer Studio** actions are not permitted and attempt `POST /api/events` and `GET /api/events/<ORG-A-Event-ID>/registrations`.
  4. Sign in as `ORG-A` and attempt `POST /api/events/<ORG-A-Event-ID>/registrations` and `GET /api/registrations/me`.
  5. *(If `ORG-B` is provisioned)* As `ORG-B`, attempt `GET /api/events/<ORG-A-Event-ID>/registrations` and `PATCH /api/events/<ORG-A-Event-ID>/capacity`.
- **Expected Results:**
  - Step 1: Both return `401 Unauthorized`; no event or registrant data is returned.
  - Step 2: Response contains `{ user: { id, email, name, role } }` and **never** includes `passwordHash`.
  - Step 3: Both endpoints return `403 Forbidden`; no event is created and no roster data is disclosed.
  - Step 4: Both endpoints return `403 Forbidden` (organizers cannot register as participants).
  - Step 5: Both return `403 Forbidden`; `ORG-A`'s event and roster remain unchanged and undisclosed.

---

### `UAT-05` — State, Session Lifecycle & Persistence Across Restart/Redeploy
- **Category:** State / History / Persistence
- **Contract / AC References:** `AC-F01-03`, `AC-F01-05`, `AC-F03-01` (`NFR-02`, `NFR-04`, `R-04`)
- **Objective:** Verify session invalidation on logout and database persistence across Cloud Run container restart/redeploy.
- **Roles:** `PART-1` (plus Product Team triggers restart/redeploy between Step 3 and Step 4)
- **Preconditions:** `UAT-01` registration exists for `PART-1`.
- **Synthetic Inputs:** Existing `UAT-01` registration.
- **Steps:**
  1. Sign in as `PART-1` and verify `GET /api/auth/me` returns `200 OK` (page reload keeps session).
  2. Click **Logout** and verify `GET /api/auth/me` returns `401 Unauthorized`.
  3. Sign back in as `PART-1`, record the visible registration in **My Registrations** (screenshot).
  4. Wait for Product Team to restart/redeploy the Cloud Run service revision (announcing beforehand).
  5. Reload the application URL, sign in as `PART-1`, and open **My Registrations**.
- **Expected Results:**
  - Step 1–2: Reload preserves active session; logout clears session so `/api/auth/me` returns `401`.
  - Step 5: `UAT-01` event and `PART-1`'s `ACTIVE` registration remain intact in Cloud SQL after restart/redeploy.

---

### `UAT-06` — Service Health & Database Readiness Probes
- **Category:** Operational Readiness
- **Contract / AC References:** `AC-F04-05` (`NFR-05`)
- **Objective:** Confirm live service and Cloud SQL connectivity.
- **Roles:** Public / Unauthenticated
- **Steps:**
  1. Call `GET <URL>/api/health`.
  2. Call `GET <URL>/api/ready`.
- **Expected Results:**
  - `GET /api/health` returns `200 OK` with `{"status":"ok"}`.
  - `GET /api/ready` returns `200 OK` with `{"status":"ready","database":"connected",...}`.
