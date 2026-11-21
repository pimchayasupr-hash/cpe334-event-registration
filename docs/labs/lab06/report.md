# Lab 6 Submission Report — Independent User Acceptance Testing & Defect Management

> **Status:** Draft preparation (awaiting Lab 5 GCP deployment URL/revision, partner UAT team assignment [H3], and real UAT execution). All unconfirmed fields are marked `[รอค่าหลัง deploy]` or `[รอข้อมูลจากผู้ใช้]`.

## Team, Scope & Version Overview

- **Course / Lab:** CPE 334 Software Engineering — Lab 6 (Independent UAT & Defect Management)
- **Product Team:** ยอดนักบิด (`sec131`)
  - Pimchaya Suprateravarnit — Student ID: `[รอผู้ใช้กรอก]` — GitHub: `@pimchayasupr-hash`
  - Suphattra Kongsiriphat — Student ID: `[รอผู้ใช้กรอก]` — GitHub: `@supa-gif173`
- **Project Theme:** Event Registration & Attendance System (KMUTT Academic Seminars & Workshops)
- **Sprint 1 Accepted-for-Test Scope:** `F-01` (Authentication & Session), `F-02` (Event Creation, Publication & Capacity), `F-03` (Participant Registration & Row-Locking Concurrency), `F-04` (Organizer Roster & Health/Ready). Sprint 2 (`F-05..F-07`) and Sprint 3 (`F-08..F-09`) are out of scope.
- **Repository:** [https://github.com/pimchayasupr-hash/cpe334-event-registration](https://github.com/pimchayasupr-hash/cpe334-event-registration)
- **Tested Release Tag / Commit (Our Product):** `[รอค่าหลัง deploy]`
- **Deployed Public URL & Cloud Run Revision:** `[รอค่าหลัง deploy]` (Service `sdb3eb069`, `asia-southeast1`)
- **Partner UAT Team (Independent Testers):** `[รอข้อมูลจากผู้ใช้ — H3]`
- **Final Sprint 1 UAT Decision (Recorded by UAT Team Only):** `[รอทีมคู่ตัดสินหลังทดสอบ]`

### Contents & Evidence Index (Parts A–D)

| Part | Section | Evidence IDs | Status |
| :--- | :--- | :--- | :--- |
| **Part A** | UAT Preparation & Safe Handoff (`F-01..F-04`, 6 cases) | `UAT-01` – `UAT-06` | Draft ready (`uat-plan.md`); awaiting URL/revision & partner team |
| **Part B** | Independent Execution on Partner Team's Release | `EXEC-01` – `EXEC-0N` | `[รอทดสอบจริงกับทีมคู่]` (Actual Result left blank) |
| **Part C** | Defect Reporting & Triage Table | `DEF-01` – `DEF-0N` | `[รอผลทดสอบจากทีมคู่]` |
| **Part D** | Defect Resolution (RED/GREEN), Retest & Acceptance | `FIX-01`, `RETEST-01` | `[รอผลหลัง Part B/C หรือ Controlled Exercise จาก TA]` |

### Version Traceability Table

| Stage | Commit / Tag | GCP Revision | Notes |
| :--- | :--- | :--- | :--- |
| Sprint 1 CI-tested `staging` | `e2846b8` | — | Run `43210196284` |
| PR #18 merge commit (`main`) | `10834da` | — | Release PR #18 |
| Tag `v1.0.0-sprint1` | `2d36196` | — | Diff vs `10834da`: `docs/deliverable-1-report.md` only |
| Pre-UAT `main` release (after PR #32, #37) | `[รอค่าหลัง deploy]` | `[รอค่าหลัง deploy]` | Baseline tested by Partner UAT Team |
| Fix commit / release (if accepted defect) | `[รอค่าหลัง Part D]` | `[รอค่าหลัง Part D]` | RED → GREEN → PR review → CI → `main` |

---

## Part A — UAT Preparation & Handoff

> Full executable UAT plan is maintained in `docs/labs/lab06/uat-plan.md` and embedded below so this PDF is self-contained.

### A.1 Handoff Summary & Safe Accounts
- **Roles & Account Labels (No Secrets in Repo/PDF):** `ORG-A` (`ORGANIZER`), `ORG-B` (`ORGANIZER`, optional), `PART-1` (`PARTICIPANT`), `PART-2` (`PARTICIPANT`). Passwords are shared privately via the course-approved channel.
- **Seed Re-run Warning:** `server/prisma/seed.ts` uses `upsert` (`update: { passwordHash }`), so re-running `sdb3eb069-migrate` overwrites seeded passwords with current Secret Manager values. **Do not rotate secrets while the UAT Team is testing without prior notice.**
- **Setup & Reset:** Verify `GET <URL>/api/health` and `GET <URL>/api/ready` return `200 OK`. Use unique synthetic titles per run (e.g., `UAT-01 Cloud Seminar <timestamp>`), since Sprint 1 does not include registration cancellation (`F-05`).

### A.2 Summary of Sprint 1 UAT Cases (`UAT-01` – `UAT-06`)

| Case ID | Category | Contract / AC Reference | Summary |
| :--- | :--- | :--- | :--- |
| `UAT-01` | Normal Domain Journey | `AC-F02-01`, `AC-F02-03`, `AC-F03-01`, `AC-F03-06`, `AC-F04-01` | Organizer creates & publishes event → Participant registers → Roster shows participant |
| `UAT-02` | Business Rule / Boundary | `AC-F03-02`, `AC-F03-03`, `AC-F02-06` | Full capacity `409`, duplicate registration `409`, capacity floor `409` |
| `UAT-03` | Business Rule / Boundary | `AC-F02-04`, `AC-F02-05`, `AC-F03-05` | Past `startAt` publish rejected (`400`); `DRAFT` hidden from participants |
| `UAT-04` | Forbidden Role / Ownership | `AC-F01-01`, `AC-F02-07`, `AC-F02-08`, `AC-F03-07`, `AC-F04-03`, `AC-F04-04` | Role separation (`403`), cross-organizer blocked (`403`), `passwordHash` omitted |
| `UAT-05` | State / Session / Persistence | `AC-F01-03`, `AC-F01-05`, `AC-F03-01` | Logout invalidates session (`401`); records persist across Cloud Run restart/redeploy |
| `UAT-06` | Operational Readiness | `AC-F04-05` | `GET /api/health` and `GET /api/ready` return `200 OK` |

*(Detailed numbered steps, preconditions, synthetic inputs, and expected results are in `docs/labs/lab06/uat-plan.md`.)*

---

## Part B — Independent Execution (Testing Partner Team's Sprint 1 Release)

- **UAT Testers (Our Team):** Pimchaya Suprateravarnit (`@pimchayasupr-hash`), Suphattra Kongsiriphat (`@supa-gif173`)
- **Partner Product Team Tested:** `[รอข้อมูลจากผู้ใช้ — H3]`
- **Partner Tested URL / Tag / Commit:** `[รอข้อมูลจากทีมคู่]`

| Case ID | Tester(s) | Date & Time | Tested Version | Synthetic Inputs | Actual Result *(blank until executed)* | Status (`PASS`/`FAIL`/`BLOCKED`) | Evidence ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PARTNER-01` | | | | | | | |
| `PARTNER-02` | | | | | | | |
| `PARTNER-03` | | | | | | | |
| `PARTNER-04` | | | | | | | |

---

## Part C — Defect Reporting & Triage

### C.1 Outgoing Defect Reports (Sent to Partner Team)
- `[รอผลทดสอบจริงจาก Part B — หากไม่พบ defect ให้ระบุว่าไม่มี]`

### C.2 Incoming Findings Triage Table (Received on Our Product)

| Finding / Issue ID | Reporter | Summary | Classification | Sprint 1 Contract Reason & Evidence | Duplicate Of | Severity | Owner | Fix Status & Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *(รอผลทดสอบจากทีมคู่)* | — | — | — | — | — | — | — | — |

---

## Part D — Defect Resolution (RED/GREEN), Independent Retest & Acceptance

### D.1 Accepted Defect Resolution Chain (or Controlled Defect Exercise from TA)
- `[รอผลจาก Part C — หากไม่มี accepted defect จริง จะขอ Controlled Defect Exercise จาก TA บน branch แยกตามกติกาข้อ 3.5]`
- Required evidence per fix: Issue link (`lab6`) → failing regression test (`RED` command + raw output + commit) → code fix (`GREEN` command + raw output + full regression suite) → PR review & CI → `main` release & GCP revision → Partner retest.

### D.2 Final Sprint 1 UAT Acceptance Decision (UAT Team Only)
- **UAT Team / Independent Tester Name(s):** `[รอทีมคู่กรอก]`
- **Exact Tested Release (Tag / Commit / GCP Revision / URL):** `[รอทีมคู่กรอก]`
- **Date & Time:** `[รอทีมคู่กรอก]`
- **Decision:** `[ ] Accepted` / `[ ] Accepted with minor limitations` / `[ ] Not Accepted`
- **Conditions / Minor Limitations:** `[รอทีมคู่กรอก]`

---

## Team Contribution, AI-Use Declaration & Known Limitations

- **Contributions:** Both `@pimchayasupr-hash` and `@supa-gif173` collaborate on UAT preparation, independent testing of the partner team's release, PR reviews, and defect verification (`R-11`). *(Detailed Issue/PR links added after completion.)*
- **AI-Use Declaration:** Google Antigravity assisted with structuring `uat-plan.md`, `uat-templates.md`, `report.md`, and `scripts/bundle_lab6.js`. All UAT cases, contract mappings, and verification commands are reviewed by the team; no AI-generated test results or sign-offs are permitted.
- **Known Limitations:**
  - Currently in Draft awaiting Lab 5 GCP deployment (`sdb3eb069`) and partner UAT team assignment (`H3`).
