# Lab 6 Parts B & C — Execution Log, Defect Report & Triage Templates

> **Rules:**
> - **Actual Result** and **Status (`PASS` / `FAIL` / `BLOCKED`)** fields must remain blank until real execution by the testers. Never copy Expected Results into Actual Results.
> - Only the independent **UAT Team** may record the final Sprint 1 acceptance decision.

---

## 1. Part B — Independent UAT Execution Log (Template)

- **UAT Team (Testers):** `[รอข้อมูลจากผู้ใช้]`
- **Product Team Tested:** `[รอข้อมูลจากผู้ใช้]`
- **Tested URL / Release Tag / Commit / Revision:** `[รอค่าก่อนเริ่มทดสอบ]`

| Case ID | Tester Name(s) | Date & Time | Tested Version (Tag / Commit / Revision) | Synthetic Inputs Used | Actual Result *(leave blank until executed)* | Status (`PASS` / `FAIL` / `BLOCKED`) & Reason | Evidence ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-01` | | | | | | | |
| `UAT-02` | | | | | | | |
| `UAT-03` | | | | | | | |
| `UAT-04` | | | | | | | |
| `UAT-05` | | | | | | | |
| `UAT-06` | | | | | | | |

---

## 2. Part C — Defect Report Template (For Actual Failures Only)

```markdown
### Defect Report — <Issue ID>
- **Product Owner / Team:** <Product Team Name>
- **Reporter (UAT Team):** <Tester Name(s)>
- **Tested Version:** <Release Tag / Commit / Revision / URL>
- **Linked Case & Sprint 1 Requirement/AC:** <UAT-XX / AC-FXX-XX>
- **Classification Check:** Defect against Sprint 1 contract (NOT a new Sprint 2/3 feature request)
- **Preconditions & Synthetic Data:** <...>
- **Reproduction Steps:**
  1. ...
  2. ...
- **Expected Result (per Sprint 1 contract):** <...>
- **Actual Result (observed):** <...>
- **Severity & User Impact:** <Critical / Major / Minor — explain impact on users>
- **Supporting Evidence:** <Evidence ID / screenshot / HTTP status / response excerpt>
- **Partner Notification & Outcome:** <Date notified, response/triage outcome>
```

---

## 3. Part C — Incoming Findings Triage Table (Template)

*(Record every finding received on our Sprint 1 product. If none are received, record `ไม่มี (None)` and do not invent findings.)*

| Finding / Issue ID | Reporter | Summary | Classification (`Accepted Defect` / `Duplicate` / `Not-Defect` / `Enhancement`) | Sprint 1 Contract Reason & Evidence | Duplicate Of | Severity | Owner | Fix Status & Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *(ไม่มีจนกว่าจะได้รับผลทดสอบจริง)* | — | — | — | — | — | — | — | — |

---

## 4. Part D — Final Sprint 1 UAT Acceptance Decision (UAT Team Only)

> **To be completed ONLY by the independent UAT Team after all critical/major defects are resolved and independently re-tested.**

- **Product Team:** ยอดนักบิด (`sec131`)
- **UAT Team / Independent Tester Name(s):** `[รอทีมคู่กรอก]`
- **Exact Tested Release (Tag / Commit / GCP Revision / URL):** `[รอทีมคู่กรอก]`
- **Date & Time of Final Decision:** `[รอทีมคู่กรอก]`
- **Final Decision:** `[ ] Accepted` / `[ ] Accepted with minor limitations` / `[ ] Not Accepted`
- **Conditions / Documented Minor Limitations (if any):** `[รอทีมคู่กรอก]`
- **Supporting Retest Evidence IDs:** `[รอทีมคู่กรอก]`
