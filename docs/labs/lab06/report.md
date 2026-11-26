# Lab 6 Submission Report — Independent User Acceptance Testing & Defect Management

> **Status:** Draft self-contained structure (Parts B, C, and D remain blank / `[รอผู้ใช้กรอก]` awaiting real UAT execution and independent partner sign-off).

## Team, Scope & Release Overview

- **Course / Lab:** CPE 334 Software Engineering — Lab 6 (Independent UAT & Defect Management)
- **Product Team:** ยอดนักบิด (`sec131`)
  - Pimchaya Suprateravarnit — Student ID: `[รอผู้ใช้กรอก]` — GitHub: `@pimchayasupr-hash`
  - Suphattra Kongsiriphat — Student ID: `[รอผู้ใช้กรอก]` — GitHub: `@supa-gif173`
- **Project Theme:** Event Registration and Attendance System (KMUTT Faculty Workshops & Seminars)
- **Sprint 1 Accepted-for-Test Scope:** `F-01` (Authentication & Session), `F-02` (Event Creation, Publication & Capacity), `F-03` (Participant Registration & Concurrency), `F-04` (Organizer Roster & Health/Ready). Sprint 2 (`F-05..F-07`) and Sprint 3 (`F-08..F-09`) are out of scope.
- **Repository:** [https://github.com/pimchayasupr-hash/cpe334-event-registration](https://github.com/pimchayasupr-hash/cpe334-event-registration)
- **Tested Release Commit (`main`):** `e6aad269e7b0f459126004e076f4fc432d1abdd0` (`e6aad26`, merged [PR #40](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/40)) — differs from tag `v1.0.0-sprint1` (`2d36196`) because Lab 5 CI/deploy/seed security fixes (#32, #37, #39) were merged before live Cloud Run deployment.
- **Deployed Public URL & Version:** `https://sdb3eb069-4d7hbszvwq-as.a.run.app` — Cloud Run Service `sdb3eb069`, Revision `sdb3eb069-00002-mct` (`Deploy demo` run [`45018492877`](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/45018492877))
- **Partner Team (UAT Team for Our Product / Product Team We Test):** พวกพี่ชอบบิด (Team 2) — Inventory and Borrowing System (`https://inventory-borrowing-4bhkmkbela-as.a.run.app`, commit `d54664d`, revision `inventory-borrowing-00006-t9c`) — Members: `[รอผู้ใช้กรอก: ชื่อสมาชิกทีมคู่]`
- **Final Sprint 1 UAT Decision (Our Product — by UAT Team Only):** `[รอทีมคู่]`

### Contents Table (Parts A–D & Appendices)

| Section | Title | Page | Evidence IDs | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Part A** | UAT Preparation & Safe Handoff (`F-01`–`F-04`, 6 cases) | p. 1 | `UAT-01` – `UAT-06` | Ready (`uat-plan.md` in Appendix B) |
| **Part B** | Independent Execution (Testing Partner's Inventory Borrowing App) | p. 2 | `EXEC-01` – `EXEC-06` | `[รอผู้ใช้กรอกจากผลทดสอบจริง]` |
| **Part C** | Defect Reporting (Outgoing) & Findings Triage (Incoming) | p. 2 | `DEF-OUT-*`, `DEF-IN-*` | `[รอผู้ใช้กรอกจากผลทดสอบจริง]` |
| **Part D** | Defect Resolution (RED/GREEN), Independent Retest & Acceptance | p. 2–3 | `FIX-*`, `RETEST-*` | `[รอผลหลัง Part C / ทีมคู่]` |
| **End** | Version Table, Contributions, AI-Use & Known Limitations | p. 3 | — | Up to date with `e6aad26` |
| **Appendices** | Appendix A (Sprint 1 Contract ACs), B (Full UAT Plan), C (Baseline Tests & Reviews) | p. 3–7 | `APP-A`, `APP-B`, `APP-C` | Embedded in this PDF |

---

## Part A — UAT Preparation and Handoff (Our Product: Sprint 1 `F-01`–`F-04`)

### A.1 Scope, Safe Account Labels & Setup/Reset Rules
- **Accepted-for-Test Scope:** Sprint 1 (`F-01`–`F-04`) only; Sprint 2 (`F-05`–`F-07`) and Sprint 3 (`F-08`–`F-09`) are out of scope.
- **Account Labels & Roles (No Secrets in Repo/PDF):**
  - `ORG-A` (`ORGANIZER`, `organizer@kmutt.ac.th`) — credentials shared privately via course handoff
  - `PART-1` (`PARTICIPANT`, `participant@kmutt.ac.th`) — credentials shared privately via course handoff
  - `ORG-B` / `PART-2` (`[รอผู้ใช้กรอก — optional]`) — fallback steps defined in Appendix B if not provisioned
- **Setup, Sequence & Seed Behavior:**
  - Verify `GET https://sdb3eb069-4d7hbszvwq-as.a.run.app/api/health` and `/api/ready` return `200 OK`.
  - Recommended order: `UAT-06` → `UAT-01` → `UAT-02` → `UAT-03` → `UAT-04` → `UAT-05` using unique synthetic titles (`UAT-Team2-...`).
  - **Seed Overwrite Warning:** `server/prisma/seed.ts` uses `prisma.user.upsert` (`update: { passwordHash }`), overwriting seeded account passwords every time `sdb3eb069-migrate` executes. **Do not rotate secrets during partner UAT without prior notice.**

### A.2 Executable UAT Case Summary (Full Steps Embedded in Appendix B)

| Case ID | Category | Contract / AC Reference | Objective |
| :--- | :--- | :--- | :--- |
| `UAT-01` | Normal Domain Journey | `AC-F02-01`, `AC-F02-03`, `AC-F03-01`, `AC-F03-06`, `AC-F04-01` | Organizer creates & publishes event → Participant registers → Roster shows participant |
| `UAT-02` | Business Rule / Boundary | `AC-F03-02`, `AC-F03-03`, `AC-F02-06` | Full capacity `409`, duplicate registration `409`, capacity floor `409` |
| `UAT-03` | Business Rule / Boundary | `AC-F02-04`, `AC-F02-05`, `AC-F03-05` | Past `startAt` publish rejected (`400`); `DRAFT` hidden from participants |
| `UAT-04` | Forbidden Role / Ownership | `AC-F01-01`, `AC-F02-07`, `AC-F02-08`, `AC-F03-07`, `AC-F04-03`, `AC-F04-04` | Role separation (`403`), cross-organizer blocked (`403`), `passwordHash` omitted |
| `UAT-05` | State / Session / Persistence | `AC-F01-03`, `AC-F01-05`, `AC-F03-01` | Logout invalidates session (`401`); data persists across Cloud Run restart/redeploy |
| `UAT-06` | Operational Readiness | `AC-F04-05` | `GET /api/health` and `GET /api/ready` return `200 OK` |

---

## Part B — Independent Execution (We Test Partner Team's Inventory Borrowing System)

- **UAT Team (Our Team):** Pimchaya Suprateravarnit (`@pimchayasupr-hash`), Suphattra Kongsiriphat (`@supa-gif173`)
- **Partner Product Team:** พวกพี่ชอบบิด (Team 2) — Inventory and Borrowing System
- **Tested URL / Commit / Revision:** `https://inventory-borrowing-4bhkmkbela-as.a.run.app` | `d54664d` | `inventory-borrowing-00006-t9c`
- **Partner Account Labels Used (No Passwords):** `ACC-B1` (Borrower 1), `ACC-C1` (Custodian), `ACC-B2` (Borrower 2)

| Case ID | Tester(s) | Date & Time (ICT) | Tested Version / Revision | Synthetic Inputs Used | Actual Result | Status (`PASS`/`FAIL`/`BLOCKED`) & Reason | Evidence ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-01` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอกจากผลทดสอบจริง]` | `[รอผู้ใช้กรอก]` | `EXEC-01` |
| `UAT-02` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอกจากผลทดสอบจริง]` | `[รอผู้ใช้กรอก]` | `EXEC-02` |
| `UAT-03` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอกจากผลทดสอบจริง]` | `[รอผู้ใช้กรอก]` | `EXEC-03` |
| `UAT-04` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอกจากผลทดสอบจริง]` | `[รอผู้ใช้กรอก]` | `EXEC-04` |
| `UAT-05` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอกจากผลทดสอบจริง]` | `[รอผู้ใช้กรอก]` | `EXEC-05` |
| `UAT-06` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอกจากผลทดสอบจริง]` | `[รอผู้ใช้กรอก]` | `EXEC-06` |

### Selected Execution Evidence (Real Browser Screenshots Only)

> **[รอภาพจริงจากผู้ใช้: EXEC-01]** — Normal Borrowing Journey (`UAT-01`: action, expected/actual result, timestamp, revision `inventory-borrowing-00006-t9c`, visible browser URL).

> **[รอภาพจริงจากผู้ใช้: EXEC-03]** — Forbidden Role / Unauthenticated Access (`UAT-03` or `UAT-06`: `403`/`401` console response + confirmation that protected state was not changed or disclosed, timestamp, revision).

---

## Part C — Defect Reporting and Triage

### C.1 Outgoing Defect Reports (Sent by Our Team to Partner Team)
- `[รอผู้ใช้กรอกจากผลทดสอบจริง — หากไม่พบ defect ให้ระบุว่าไม่มี]`

| Issue ID | Owner Team | Reporter | Tested Version | Linked Case / Req | Preconditions & Steps | Expected vs Actual | Severity & User Impact | Evidence ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `[รอผู้ใช้กรอก]` | พวกพี่ชอบบิด (Team 2) | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` | `[รอผู้ใช้กรอก]` |

### C.2 Incoming Findings Triage Table (Received from Partner Team on Our Product)

| Finding / Issue ID | Reporter | Summary | Classification (`Accepted Defect`/`Duplicate`/`Not-Defect`/`Enhancement`) | Sprint 1 Contract Reason & Evidence | Duplicate Of | Severity | Owner | Fix Status & Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `[รอผลทดสอบจากทีมคู่ — หากไม่มีให้ระบุ "ไม่มี"]` | — | — | — | — | — | — | — | — |

---

## Part D — Resolution and Independent Retest

### D.1 Accepted Defect Resolution Chain (or Controlled Defect Exercise from TA)
- **Accepted Defects Resolved:** `[รอผลจาก Part C]`
  - Required chain per accepted defect: Issue (`lab6`) → fix branch from `staging` → reproducing automated test (`RED`: command, test name, assertion, commit, raw failing output) → fix (`GREEN` + full regression suite) → code diff → teammate PR review text → CI → release PR (`main`) → GCP revision → smoke check → partner independent retest.
- **If No Natural Defect Is Found (Section 3.5 Controlled Exercise):**
  - TA Notification Date: `[รอผู้ใช้กรอกหากไม่พบ defect จริง]`
  - Message & TA Response / Isolated Exercise Branch: `[รอผู้ใช้กรอกหากไม่พบ defect จริง]`

### D.2 Independent UAT Final Acceptance Decisions

**1. Partner UAT Team's Final Decision on Our Product (`ยอดนักบิด sec131`):**
- **Independent Tester Name(s) / Team:** `[รอทีมคู่]`
- **Exact Tested Release (Commit / GCP Revision / URL):** `[รอทีมคู่]`
- **Date & Time (ICT):** `[รอทีมคู่]`
- **Decision:** `[ ] Accepted` / `[ ] Accepted with minor limitations` / `[ ] Not Accepted` *(to be checked by UAT Team only)*
- **Conditions / Accepted Minor Limitations:** `[รอทีมคู่]`

**2. Our Team's Final Decision on Partner Team's Product (`พวกพี่ชอบบิด Team 2`):**
- **Testers:** `[รอผู้ใช้กรอกตามหลักฐานจริง]`
- **Exact Tested Release (Commit / Revision / URL):** `[รอผู้ใช้กรอกตามหลักฐานจริง]`
- **Date & Time (ICT):** `[รอผู้ใช้กรอกตามหลักฐานจริง]`
- **Decision:** `[ ] Accepted` / `[ ] Accepted with minor limitations` / `[ ] Not Accepted` *(to be completed after real Part B/D execution)*
- **Reasons / Conditions:** `[รอผู้ใช้กรอกตามหลักฐานจริง]`

---

## Version Traceability, Contributions, AI-Use & Known Limitations

### Version Table

| Stage | Commit / Tag | GCP Revision | Explanation |
| :--- | :--- | :--- | :--- |
| Sprint 1 CI-tested `staging` | `e2846b8` | — | CI run `43210196284` (`pull_request`) |
| Release PR #18 merge (`main`) | `10834da` | — | Merged by `@pimchayasupr-hash` |
| Tag `v1.0.0-sprint1` | `2d36196` | — | Diff vs `10834da`: `docs/deliverable-1-report.md` only; app code identical |
| Pre-activation `main` head | `12d04b9` | — | 7 direct-push doc/script commits (`2d36196..12d04b9`) |
| Release PR #38 merge (`main`) | `8f082c9` | — | `Deploy demo` run `44986537160` failed at `sdb3eb069-migrate` (missing secret bindings) |
| Release PR #40 merge (`main`) | `e6aad26` | `sdb3eb069-00002-mct` | `Deploy demo` run [`45018492877`](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/45018492877) (attempt 2) succeeded; baseline handed off for Lab 6 UAT |
| Defect / Fix Release (if any) | `[รอค่าหลัง Part D]` | `[รอค่าหลัง Part D]` | `[รอผลหลัง Part D]` |

### Team Contribution Table (Verified GitHub History)

| Member | Authored PRs / Issues | Reviewed / Approved | Merged |
| :--- | :--- | :--- | :--- |
| **Pimchaya Suprateravarnit** (`@pimchayasupr-hash`) | PRs #2–#14, #24, #25, #26, #32, #33, #34, #36, #37, #40; Issues #20–#23, #27–#31, #35 | Approved PRs #16, #17, #18, #38, #39 | Merged PRs #2–#14, #18, #25, #38, #39 |
| **Suphattra Kongsiriphat** (`@supa-gif173`) | PRs #16, #17, #18, #19, #38, #39; 7 direct commits (`2d36196..12d04b9`); co-named on Issues #20–#23, #27–#31 | Approved PRs #2–#14, #24 (sync), #25, #26, #32, #34, #36, #37, #40 | Merged PRs #16, #17, #24, #26, #32, #36, #37, #40 |

### AI-Use Declaration
- **Tool:** Google Antigravity assisted with structuring `uat-plan.md`, `uat-templates.md`, `report.md`, and `scripts/bundle_lab6.js`.
- **Verification:** Both students (`@pimchayasupr-hash`, `@supa-gif173`) review all specifications and execute all UAT tests manually. No AI-fabricated screenshots, test outputs, or partner sign-offs are included.

### Known Limitations
1. **Direct Pushes & Tag Alignment (Sprint 1):** 7 commits (`2d36196..12d04b9`) were pushed directly to `main` before ruleset `protect-main-staging` (`27641965`) was created, and `v1.0.0-sprint1` points to `2d36196` rather than PR #18 (`10834da`).
2. **Lab 5 Draft Screenshot Audit Finding:** Figures 11–17 in an earlier Lab 5 draft contained status banners not present in the deployed `client/src` bundle (`e6aad26`); those images are excluded from Lab 6 and must be replaced with real browser screenshots showing the address bar (`[สถานะการแก้/แจ้ง TA Lab 5: รอผู้ใช้กรอก]`).
3. **Demo Credential Remediation:** Hardcoded demo credentials from Sprint 1 were removed in PR #32 (`seed-config.ts` fail-closed + Quick Demo gated to `import.meta.env.DEV`) and deployed in PR #40 (`e6aad26`).
4. **Seeded Account Count:** `seed.ts` provisions 1 Organizer (`ORG-A`) and 1 Participant (`PART-1`); cross-organizer (`ORG-B`) and second-participant (`PART-2`) UAT steps require optional extra accounts or use the fallback checks documented in Appendix B.
