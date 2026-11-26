# Lab 6 Submission Report — Independent User Acceptance Testing & Defect Management

> **Status: Draft — ยังไม่พร้อมส่ง** (เหลือช่องรอข้อมูล **68** ช่อง; แถบนี้จะถูกลบอัตโนมัติเมื่อกรอกข้อมูลจริงครบและผ่านการตรวจสอบ)

## Team, Scope & Release Overview

- **Course / Lab:** CPE 334 Software Engineering — Lab 6 (Independent UAT & Defect Management)
- **Product Team:** ยอดนักบิด (`sec131`)
  - Pimchaya Suprateravarnit — Student ID: `[รอผู้ใช้กรอก]` — GitHub: `@pimchayasupr-hash`
  - Suphattra Kongsiriphat — Student ID: `[รอผู้ใช้กรอก]` — GitHub: `@supa-gif173`
- **Project Theme:** Event Registration and Attendance System (KMUTT Faculty Workshops & Seminars)
- **Sprint 1 Accepted-for-Test Scope:** `F-01` (Authentication & Session), `F-02` (Event Creation, Publication & Capacity), `F-03` (Participant Registration & Concurrency), `F-04` (Organizer Roster & Health/Ready). Sprint 2 (`F-05..F-07`) and Sprint 3 (`F-08..F-09`) are out of scope.
- **Repository:** [https://github.com/pimchayasupr-hash/cpe334-event-registration](https://github.com/pimchayasupr-hash/cpe334-event-registration)
- **Tested Release Commit (`main`):** `e6aad269e7b0f459126004e076f4fc432d1abdd0` (`e6aad26`, merged [PR #40](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/40)) — differs from tag `v1.0.0-sprint1` (`2d36196`) because Lab 5 CI/deploy/seed security fixes (#32, #37, #39) were merged before live deployment.
- **Deployed Public URL & Version:** `https://sdb3eb069-4d7hbszvwq-as.a.run.app` — Cloud Run Service `sdb3eb069`, Revision `sdb3eb069-00002-mct` (`Deploy demo` run [`45018492877`](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/45018492877))
- **Partner Team (UAT Team / Product Team We Test):** พวกพี่ชอบบิด (Team 2) — Inventory and Borrowing System — Members: [รอผู้ใช้กรอก: ชื่อสมาชิกทีมคู่]
  - **ข้อมูลจากเอกสารส่งมอบของทีมคู่ ณ วันที่ [รอผู้ใช้กรอก]:** URL `https://inventory-borrowing-4bhkmkbela-as.a.run.app`, Commit `d54664d`, Revision `inventory-borrowing-00006-t9c`
  - **เวอร์ชันที่ตรวจจริงตอนทดสอบ:** [รอผู้ใช้กรอก]
- **Final Sprint 1 UAT Decision (Our Product — by UAT Team Only):** [รอทีมคู่] (Independent Testers: [รอทีมคู่])

### Contents Table (Auto-Generated Page Numbers)

| Section | Title | Page | Evidence IDs |
| :--- | :--- | :--- | :--- |
| **Part A** | UAT Preparation & Safe Handoff (`F-01`–`F-04`, 6 cases) | p. 2 | `UAT-01` – `UAT-06` |
| **Part B** | Independent Execution (Testing Partner's App — Manual) | p. 2 | `EXEC-01` – `EXEC-06` |
| **Part C** | Defect Reporting (Outgoing) & Findings Triage (Incoming) | p. 5 | `DEF-OUT-*`, `DEF-IN-*` |
| **Part D** | Defect Resolution (RED/GREEN), Retest & Final Acceptance | p. 5 | `FIX-*`, `RETEST-*` |
| **Version** | Version Traceability Table | p. 5 | — |
| **Contrib** | Team Contribution Table (GitHub History) | p. 6 | — |
| **AI-Use** | AI-Use Declaration | p. 6 | — |
| **Limits** | Known Limitations | p. 6 | — |
| **Appendix A** | Sprint 1 Contract Acceptance Criteria (Verbatim) | p. 7 | `AC-F01-*` – `AC-F04-*` |
| **Appendix B** | Complete Sprint 1 UAT Plan (`uat-plan.md`) | p. 9 | `UAT-01` – `UAT-06` |
| **Appendix C** | Baseline Automated Test & Release Evidence (`45018492877`) | p. 13 | `RUN-45018492877` |

---

## Part A — UAT Preparation and Handoff

### A.1 Scope, Safe Account Labels & Setup/Reset Rules
- **Accepted-for-Test Scope:** Sprint 1 (`F-01`–`F-04`) only; Sprint 2 (`F-05`–`F-07`) and Sprint 3 (`F-08`–`F-09`) are out of scope.
- **Account Labels & Roles (No Secrets in Repo/PDF):** `ORG-A` (`ORGANIZER`, `organizer@kmutt.ac.th`), `PART-1` (`PARTICIPANT`, `participant@kmutt.ac.th`) — credentials delivered privately via course handoff.
- **Setup, Sequence & Seed Behavior:** Verify `GET /api/health` and `/api/ready` return `200 OK`. Run `UAT-06` → `UAT-01` → `UAT-02` → `UAT-03` → `UAT-04` → `UAT-05` using unique synthetic titles. `server/prisma/seed.ts` uses `prisma.user.upsert` (`update: { passwordHash }`), overwriting seeded passwords on every `sdb3eb069-migrate` execution; **do not rotate secrets during partner UAT without prior notice**.

### A.2 Executable UAT Case Summary (Full Steps in Appendix B)

| Case ID | Category | Contract / AC Reference | Objective |
| :--- | :--- | :--- | :--- |
| `UAT-01` | Normal Domain Journey | `AC-F02-01`, `AC-F02-03`, `AC-F03-01`, `AC-F03-06`, `AC-F04-01` | Organizer creates & publishes event → Participant registers → Roster shows participant |
| `UAT-02` | Business Rule / Boundary | `AC-F03-02`, `AC-F03-03`, `AC-F02-06` | Full capacity `409`, duplicate registration `409`, capacity floor `409` |
| `UAT-03` | Business Rule / Boundary | `AC-F02-04`, `AC-F02-05`, `AC-F03-05` | Past `startAt` publish rejected (`400`); `DRAFT` hidden from participants |
| `UAT-04` | Forbidden Role / Ownership | `AC-F01-01`, `AC-F02-07`, `AC-F02-08`, `AC-F03-07`, `AC-F04-03`, `AC-F04-04` | Role separation (`403`), cross-organizer blocked (`403`), `passwordHash` omitted |
| `UAT-05` | State / Session / Persistence | `AC-F01-03`, `AC-F01-05`, `AC-F03-01` | Logout invalidates session (`401`); data persists across Cloud Run restart/redeploy |
| `UAT-06` | Operational Readiness | `AC-F04-05` | `GET /api/health` and `GET /api/ready` return `200 OK` |

---

## Part B — Independent Execution (We Test Partner Team's System)

- **UAT Team:** ยอดนักบิด (`sec131`) — `@pimchayasupr-hash`, `@supa-gif173` (**ทดสอบด้วยมือ / manual**)
- **Partner System:** พวกพี่ชอบบิด (Team 2) — `https://inventory-borrowing-4bhkmkbela-as.a.run.app`
- **Partner Account Labels Used (No Passwords):** `ACC-B1` (Borrower 1), `ACC-C1` (Custodian), `ACC-B2` (Borrower 2)
- **ข้อมูลจากเอกสารส่งมอบของทีมคู่ ณ วันที่ [รอผู้ใช้กรอก]:** Commit `d54664d`, Revision `inventory-borrowing-00006-t9c`
- **เวอร์ชันที่ตรวจจริงตอนทดสอบ:** [รอผู้ใช้กรอก]

### UAT-01 — Normal borrowing journey *(ทดสอบด้วยมือ / manual)*

| Field | Value |
| :--- | :--- |
| **Case ID / Evidence ID** | `UAT-01` / `EXEC-01` — **ทดสอบด้วยมือ (manual)** |
| **ผู้ทดสอบ** | [รอผู้ใช้กรอก] |
| **วันเวลา (ICT)** | [รอผู้ใช้กรอก] |
| **เวอร์ชัน / URL / Revision ที่ทดสอบ** | [รอผู้ใช้กรอก] |
| **อินพุตที่ใช้จริง** | [รอผู้ใช้กรอก] |
| **ขั้นตอนที่ทำจริง** | [รอผู้ใช้กรอก] |
| **ผลจริง (ข้อสังเกตที่อ่านได้)** | [รอผู้ใช้กรอกจากผลทดสอบจริง] |
| **สถานะ (PASS / FAIL / BLOCKED) & เหตุผล** | [รอผู้ใช้กรอก] |

> **[รอภาพจริงจากผู้ใช้: EXEC-01]** — ใส่ไฟล์ภาพจริงใน `docs/labs/lab06/screenshots/` พร้อม caption (Evidence ID, action, ผลที่คาดหวัง/ผลจริง, เวลา, เวอร์ชัน)

### UAT-02 — Business rule: approval cannot exceed stock; rejection needs a reason *(ทดสอบด้วยมือ / manual)*

| Field | Value |
| :--- | :--- |
| **Case ID / Evidence ID** | `UAT-02` / `EXEC-02` — **ทดสอบด้วยมือ (manual)** |
| **ผู้ทดสอบ** | [รอผู้ใช้กรอก] |
| **วันเวลา (ICT)** | [รอผู้ใช้กรอก] |
| **เวอร์ชัน / URL / Revision ที่ทดสอบ** | [รอผู้ใช้กรอก] |
| **อินพุตที่ใช้จริง** | [รอผู้ใช้กรอก] |
| **ขั้นตอนที่ทำจริง** | [รอผู้ใช้กรอก] |
| **ผลจริง (ข้อสังเกตที่อ่านได้)** | [รอผู้ใช้กรอกจากผลทดสอบจริง] |
| **ผลตรวจว่าข้อมูลที่ป้องกันไม่ถูกเปลี่ยนหรือเปิดเผย** | [รอผู้ใช้กรอก] |
| **สถานะ (PASS / FAIL / BLOCKED) & เหตุผล** | [รอผู้ใช้กรอก] |

> **ข้อสังเกต/ภาพ (EXEC-02):** [รอภาพจริงหรือข้อสังเกตจากผู้ใช้: EXEC-02]

### UAT-03 — Forbidden role and unauthenticated access *(ทดสอบด้วยมือ / manual)*

| Field | Value |
| :--- | :--- |
| **Case ID / Evidence ID** | `UAT-03` / `EXEC-03` — **ทดสอบด้วยมือ (manual)** |
| **ผู้ทดสอบ** | [รอผู้ใช้กรอก] |
| **วันเวลา (ICT)** | [รอผู้ใช้กรอก] |
| **เวอร์ชัน / URL / Revision ที่ทดสอบ** | [รอผู้ใช้กรอก] |
| **อินพุตที่ใช้จริง** | [รอผู้ใช้กรอก] |
| **ขั้นตอนที่ทำจริง** | [รอผู้ใช้กรอก] |
| **ผลจริง (ข้อสังเกตที่อ่านได้)** | [รอผู้ใช้กรอกจากผลทดสอบจริง] |
| **ผลตรวจว่าข้อมูลที่ป้องกันไม่ถูกเปลี่ยนหรือเปิดเผย** | [รอผู้ใช้กรอก] |
| **สถานะ (PASS / FAIL / BLOCKED) & เหตุผล** | [รอผู้ใช้กรอก] |

> **[รอภาพจริงจากผู้ใช้: EXEC-03]** — ใส่ไฟล์ภาพจริงใน `docs/labs/lab06/screenshots/` พร้อม caption (Evidence ID, action, ผลที่คาดหวัง/ผลจริง, เวลา, เวอร์ชัน)

### UAT-04 — State, history and persistence *(ทดสอบด้วยมือ / manual)*

| Field | Value |
| :--- | :--- |
| **Case ID / Evidence ID** | `UAT-04` / `EXEC-04` — **ทดสอบด้วยมือ (manual)** |
| **ผู้ทดสอบ** | [รอผู้ใช้กรอก] |
| **วันเวลา (ICT)** | [รอผู้ใช้กรอก] |
| **เวอร์ชัน / URL / Revision ที่ทดสอบ** | [รอผู้ใช้กรอก] |
| **อินพุตที่ใช้จริง** | [รอผู้ใช้กรอก] |
| **ขั้นตอนที่ทำจริง** | [รอผู้ใช้กรอก] |
| **ผลจริง (ข้อสังเกตที่อ่านได้)** | [รอผู้ใช้กรอกจากผลทดสอบจริง] |
| **ผลตรวจว่าข้อมูลที่ป้องกันไม่ถูกเปลี่ยนหรือเปิดเผย** | [รอผู้ใช้กรอก] |
| **สถานะ (PASS / FAIL / BLOCKED) & เหตุผล** | [รอผู้ใช้กรอก] |

> **ข้อสังเกต/ภาพ (EXEC-04):** [รอภาพจริงหรือข้อสังเกตจากผู้ใช้: EXEC-04]

### UAT-05 — Custodian adds inventory; invalid quantities rejected *(ทดสอบด้วยมือ / manual)*

| Field | Value |
| :--- | :--- |
| **Case ID / Evidence ID** | `UAT-05` / `EXEC-05` — **ทดสอบด้วยมือ (manual)** |
| **ผู้ทดสอบ** | [รอผู้ใช้กรอก] |
| **วันเวลา (ICT)** | [รอผู้ใช้กรอก] |
| **เวอร์ชัน / URL / Revision ที่ทดสอบ** | [รอผู้ใช้กรอก] |
| **อินพุตที่ใช้จริง** | [รอผู้ใช้กรอก] |
| **ขั้นตอนที่ทำจริง** | [รอผู้ใช้กรอก] |
| **ผลจริง (ข้อสังเกตที่อ่านได้)** | [รอผู้ใช้กรอกจากผลทดสอบจริง] |
| **ผลตรวจว่าข้อมูลที่ป้องกันไม่ถูกเปลี่ยนหรือเปิดเผย** | [รอผู้ใช้กรอก] |
| **สถานะ (PASS / FAIL / BLOCKED) & เหตุผล** | [รอผู้ใช้กรอก] |

> **ข้อสังเกต/ภาพ (EXEC-05):** [รอภาพจริงหรือข้อสังเกตจากผู้ใช้: EXEC-05]

### UAT-06 — Borrower ownership (requires ACC-B2) *(ทดสอบด้วยมือ / manual)*

| Field | Value |
| :--- | :--- |
| **Case ID / Evidence ID** | `UAT-06` / `EXEC-06` — **ทดสอบด้วยมือ (manual)** |
| **ผู้ทดสอบ** | [รอผู้ใช้กรอก] |
| **วันเวลา (ICT)** | [รอผู้ใช้กรอก] |
| **เวอร์ชัน / URL / Revision ที่ทดสอบ** | [รอผู้ใช้กรอก] |
| **อินพุตที่ใช้จริง** | [รอผู้ใช้กรอก] |
| **ขั้นตอนที่ทำจริง** | [รอผู้ใช้กรอก] |
| **ผลจริง (ข้อสังเกตที่อ่านได้)** | [รอผู้ใช้กรอกจากผลทดสอบจริง] |
| **ผลตรวจว่าข้อมูลที่ป้องกันไม่ถูกเปลี่ยนหรือเปิดเผย** | [รอผู้ใช้กรอก] |
| **สถานะ (PASS / FAIL / BLOCKED) & เหตุผล** | [รอผู้ใช้กรอก] |

> **ข้อสังเกต/ภาพ (EXEC-06):** [รอภาพจริงหรือข้อสังเกตจากผู้ใช้: EXEC-06]


---

## Part C — Defect Reporting and Triage

### C.1 Outgoing Defect Reports (Sent by Our Team to Partner Team)
`[รอผู้ใช้กรอกจากผลทดสอบจริง — หากไม่พบ defect ให้ตั้ง part_c_outgoing_defects_none: true]`

### C.2 Incoming Findings Triage Table (Received from Partner Team on Our Product)

| Finding / Issue ID | Reporter | Summary | Classification | Sprint 1 Contract Reason | Duplicate Of | Severity | Owner | Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `[รอผลทดสอบจากทีมคู่]` | — | — | — | — | — | — | — | — |

---

## Part D — Resolution and Independent Retest

### D.1 Accepted Defect Resolution Chain (or Controlled Defect Exercise)
- `[รอผลจาก Part C — หากมี accepted defect ให้กรอก part_d_resolutions; หากไม่มีให้ขอ Controlled Defect Exercise จาก TA บน branch แยก]`

### D.2 Independent UAT Final Acceptance Decisions

**1. Partner UAT Team's Final Decision on Our Product (`ยอดนักบิด sec131`):**
- **Independent Tester Name(s):** [รอทีมคู่]
- **Exact Tested Release (Commit / GCP Revision / URL):** [รอทีมคู่]
- **Date & Time (ICT):** [รอทีมคู่]
- **Decision:** **[รอทีมคู่]** *(Accepted / Accepted with minor limitations / Not Accepted — recorded by UAT Team only)*
- **Conditions / Minor Limitations:** [รอทีมคู่]

**2. Our Team's Final Decision on Partner Team's Product (`พวกพี่ชอบบิด Team 2`):**
- **Testers:** [รอผู้ใช้กรอกตามหลักฐานจริง]
- **Exact Tested Release (Commit / Revision / URL):** [รอผู้ใช้กรอกตามหลักฐานจริง]
- **Date & Time (ICT):** [รอผู้ใช้กรอกตามหลักฐานจริง]
- **Decision:** **[รอผู้ใช้กรอกตามหลักฐานจริง]**
- **Reasons / Conditions:** [รอผู้ใช้กรอกตามหลักฐานจริง]

---

## Version Traceability

| Stage | Commit / Tag | GCP Revision | Explanation |
| :--- | :--- | :--- | :--- |
| Sprint 1 CI-tested `staging` | `e2846b8` | — | CI run `43210196284` (`pull_request`) |
| Release PR #18 merge (`main`) | `10834da` | — | Merged by `@pimchayasupr-hash` |
| Tag `v1.0.0-sprint1` | `2d36196` | — | Diff vs `10834da`: `docs/deliverable-1-report.md` only |
| Pre-activation `main` head | `12d04b9` | — | 7 direct-push doc/script commits (`2d36196..12d04b9`) |
| Release PR #38 merge (`main`) | `8f082c9` | — | `Deploy demo` run `44986537160` failed at `sdb3eb069-migrate` |
| Release PR #40 merge (`main`) | `e6aad26` | `sdb3eb069-00002-mct` | `Deploy demo` run [`45018492877`](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/45018492877) (attempt 2) succeeded; baseline for Lab 6 UAT |

## Team Contribution Table

| Member | Authored PRs / Issues | Reviewed / Approved | Merged |
| :--- | :--- | :--- | :--- |
| **Pimchaya Suprateravarnit** (`@pimchayasupr-hash`) | PRs #2–#14, #24–#26, #32–#34, #36, #37, #40; Issues #20–#23, #27–#31, #35 | Approved PRs #16, #17, #18, #38, #39 | Merged PRs #2–#14, #18, #25, #38, #39 |
| **Suphattra Kongsiriphat** (`@supa-gif173`) | PRs #16–#19, #38, #39; 7 direct commits (`2d36196..12d04b9`); co-named on Issues #20–#23, #27–#31 | Approved PRs #2–#14, #24 (sync), #25, #26, #32, #34, #36, #37, #40 | Merged PRs #16, #17, #24, #26, #32, #36, #37, #40 |

## AI-Use Declaration

- **Verifiable Repository Assistance:** Google Antigravity assisted with structuring `docs/labs/lab06/uat-plan.md`, `uat-templates.md`, `uat-results.yaml`, `report.md`, and `scripts/bundle_lab6.js`.
- **User Confirmation of All AI Tools & Tasks:** [ผู้ใช้ยืนยันเครื่องมือ AI ทั้งหมดที่ใช้จริงและงานที่แต่ละตัวทำ]
- **Reviewed & Verified By:** [รอผู้ใช้ระบุผู้ตรวจ]

## Known Limitations

1. **Single Seeded Account per Role (`ORG-A`, `PART-1`):** `server/prisma/seed.ts` creates only 1 Organizer (`ORG-A`) and 1 Participant (`PART-1`), and Sprint 1 has no self-registration endpoint. Therefore:
   - Cross-organizer ownership checks (`AC-F02-08`, `AC-F04-03` in `UAT-04` step 5) are **N/A** on the live deployment unless `ORG-B` is provisioned (covered by automated integration tests `TEST-F02-07` and `TEST-F04-02`).
   - Second-participant full-capacity check (`AC-F03-03` in `UAT-02` step 4) uses the **fallback** (`capacity=1` filled by `PART-1` + duplicate `409` + capacity-floor `409` by `ORG-A`) unless `PART-2` is provisioned (covered by automated tests `TEST-F03-03` and `TEST-F03-04`).
2. **Direct Pushes & Tag Alignment (Sprint 1):** 7 commits (`2d36196..12d04b9`) were pushed directly to `main` before ruleset `protect-main-staging` (`27641965`) existed, and `v1.0.0-sprint1` points to `2d36196` rather than PR #18 (`10834da`).
3. **Lab 5 Draft Screenshot Audit Finding:** Figures 11–17 in an earlier Lab 5 draft contained status banners absent from deployed `client/src` (`e6aad26`); they are excluded from Lab 6 ([สถานะการแก้/แจ้ง TA Lab 5: รอผู้ใช้กรอก]).
4. **Demo Credential Remediation:** Hardcoded demo credentials from Sprint 1 were removed in PR #32 and deployed in PR #40 (`e6aad26`).
