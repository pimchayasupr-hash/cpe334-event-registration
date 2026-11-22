const fs = require('fs');
const path = require('path');
const docx = require('docx');

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  ImageRun,
} = docx;

const repoRoot = path.resolve(__dirname, '..');
const lab05Dir = path.join(repoRoot, 'docs/labs/lab05');
const reportMdPath = path.join(lab05Dir, 'report.md');

// Updated report content reflecting full completion of Lab 5
const updatedReportMd = `# Lab 5 Submission Report — CPE 334 Event Registration & Attendance System

## Answer Part 0 — Team, Release Metadata & Evidence Index

### 0.1 Project & Team Identification
- **Course / Lab:** CPE 334 Software Engineering — Lab 5 (CI/CD, Containerization & Deployment Verification)
- **Team / Section:** ยอดนักบิด (\`sec131\`)
- **Members:**
  - Pimchaya Suprateravarnit — Student ID: \`67070505223\` — GitHub: \`@pimchayasupr-hash\`
  - Suphattra Kongsiriphat — Student ID: \`67070505228\` — GitHub: \`@supa-gif173\`
- **Submission Document:** \`lab5_sec131_ยอดนักบิด.docx\` / \`lab5_sec131_ยอดนักบิด.pdf\`
- **Repository:** https://github.com/pimchayasupr-hash/cpe334-event-registration (Visibility: \`PUBLIC\`, Secret Scanning: \`enabled\`, Push Protection: \`enabled\`)
- **Production Live URL:** https://sdb3eb069-4d7hbszvwq-as.a.run.app (Activated via CPE334 Student Cloud Portal on 19 พ.ย. 2569)
- **Running Commit on GCP:** \`8f082c9\` (Merged Release PR #38)

**Version Table (Sprint 1 Baseline & Lab 5 Staging):**

| Role | Commit | Evidence |
| :--- | :--- | :--- |
| Release PR #18 head tested by CI | \`e2846b8\` (\`staging\`) | CI run [43210196284](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/43210196284) (\`pull_request\`, success) |
| Release PR #18 merge commit on \`main\` | \`10834da\` | [PR #18](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/18) merged by \`@pimchayasupr-hash\` |
| Tag \`v1.0.0-sprint1\` | \`2d36196\` | \`git diff --stat 10834da 2d36196\` → only \`docs/deliverable-1-report.md\` (270 insertions); app code identical to \`10834da\` |
| \`main\` head at verification time | \`8f082c9\` | Release PR #38 merge commit on \`main\` deployed to Cloud Run |
| \`staging\` head (Lab 5 doc merges) | \`75498e9\` | [PR #37](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/37) merged after PR #36 and PR #32 |

### 0.2 Team Contribution Table (Verified GitHub Issues & PRs)

| Member | Authored PRs / Issues | Reviewed / Approved | Merged |
| :--- | :--- | :--- | :--- |
| **Pimchaya Suprateravarnit** (\`@pimchayasupr-hash\`) | PRs [#2–#14](https://github.com/pimchayasupr-hash/cpe334-event-registration/pulls?q=is%3Apr+author%3Apimchayasupr-hash), [#24](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/24), [#25](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/25), [#26](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/26), [#32](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/32), [#33](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/33), [#34](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/34), [#36](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/36), [#37](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/37), [#38](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/38); Issues [#20](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/20), [#21](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/21), [#22](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/22), [#23](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/23), [#27](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/27), [#28](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/28), [#29](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/29), [#30](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/30), [#31](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/31) (pair \`R-11\`), [#35](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/35) | Approved [PR #16](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/16), [PR #17](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/17), [PR #18](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/18) | PRs #2–#14, [#18](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/18), [#25](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/25), [#38](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/38) |
| **Suphattra Kongsiriphat** (\`@supa-gif173\`) | PRs [#16](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/16), [#17](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/17), [#18](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/18), [#19](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/19); 7 direct commits (\`2d36196..12d04b9\`) on \`main\`; co-named on Issues [#20](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/20)–[#23](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/23), [#27](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/27)–[#31](https://github.com/pimchayasupr-hash/cpe334-event-registration/issues/31) (\`R-11\`) | Approved PRs #2–#14, [#24](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/24)*, [#25](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/25), [#26](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/26), [#32](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/32), [#34](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/34), [#36](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/36), [#37](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/37) | PRs [#16](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/16), [#17](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/17), [#24](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/24), [#26](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/26), [#32](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/32), [#36](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/36), [#37](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/37) |

*(Note: PR #24 approval by \`@supa-gif173\` is a sync of their own 7 direct-push commits, not an independent review — disclosed in Table 0.3 & Known Limitations.)*

### 0.3 Pull Request, Review & Merge Audit

| PR / Ref | Flow | Author | Reviewer / Approver | Merger & Status |
| :--- | :--- | :--- | :--- | :--- |
| PR #2 – #14 | feature -> \`staging\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` | \`@pimchayasupr-hash\` (\`MERGED\`) |
| [PR #16](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/16) – [PR #17](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/17) | feature -> \`staging\` | \`@supa-gif173\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` (\`MERGED\`, self-merged after approval) |
| [PR #18](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/18) | \`staging\` -> \`main\` | \`@supa-gif173\` | \`@pimchayasupr-hash\` | \`@pimchayasupr-hash\` (\`MERGED\`, \`10834da\`) |
| [PR #19](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/19) | \`test/c02-failing-check\` -> \`main\` | \`@supa-gif173\` | None (0 reviews) | \`CLOSED\` unmerged (pre-ruleset, kept per R-10) |
| Direct (\`2d36196..12d04b9\`) | direct to \`main\` | \`@supa-gif173\` | None (bypassed PR) | 7 direct pushes before ruleset |
| [PR #24](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/24) | \`main\` -> \`staging\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` (\`12d04b9\`, sync only) | \`@supa-gif173\` (\`MERGED\`, \`2026-11-20T03:45:56Z\`) |
| [PR #26](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/26) | \`lab5/21\` -> \`lab5/20\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` (\`08186ae\`) | \`@supa-gif173\` (\`MERGED\`, \`2026-11-20T03:43:26Z\`) |
| [PR #25](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/25) | \`lab5/20\` -> \`staging\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` (\`32e546e\`) | \`@pimchayasupr-hash\` (\`MERGED\`, \`2026-11-20T05:11:41Z\`) |
| [PR #34](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/34) | \`test/22-c02\` -> \`staging\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` (\`4d68bfb\`, edited \`04:10:48Z\`) | \`CLOSED\` unmerged (C-02 blocked-merge proof) |
| [PR #36](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/36) | \`lab5/35\` -> \`staging\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` (\`7f3d8a2\`) | \`@supa-gif173\` (\`MERGED\`, \`2e4cb11\`) |
| [PR #32](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/32) | \`lab5/27\` -> \`staging\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` (\`bb94d99\`) | \`@supa-gif173\` (\`MERGED\`, \`47bde54\`) |
| [PR #37](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/37) | \`lab5/shared-cloud\` -> \`staging\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` (\`1dd1a43\`) | \`@supa-gif173\` (\`MERGED\`, \`75498e9\`) |
| [PR #38](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/38) | \`staging\` -> \`main\` | \`@pimchayasupr-hash\` | \`@supa-gif173\` (\`75498e9\`) | \`@pimchayasupr-hash\` (\`MERGED\`, \`8f082c9\`) |
| [PR #33](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/33) | \`lab6/28\` -> \`staging\` | \`@pimchayasupr-hash\` | None yet | \`OPEN (DRAFT)\` (Lab 6 UAT plan/templates) |

### 0.4 Evidence Index (Check C-01 – C-06)

| Check | Scope | Status | Verified Evidence |
| :--- | :--- | :--- | :--- |
| **C-01** | PR CI (\`test-and-docker\`) | **Done** | [PR #17](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/17) (\`aa0fd04\`), GitHub Actions run [42981092219](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/42981092219) (1m6s): 26/26 tests passed (Server 24, Client 2) + Docker build passed |
| **C-02** | Ruleset blocks failing PR | **Done** | Ruleset [protect-main-staging](https://github.com/pimchayasupr-hash/cpe334-event-registration/rules/27641965) (ID \`27641965\`, \`active\`) + [PR #34](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/34) (\`4d68bfb\`, run [44535404522](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/44535404522) failed 44s): merge blocked even after approval, closed unmerged |
| **C-03** | Clean-clone Docker build & probes | **Done** | Verified on \`main\` at \`8f082c9\` with \`seed-config.ts\` fallback: Docker build passed, migrate+seed applied, \`/api/health\` 200, \`/api/ready\` 200, \`/api/events\` 401 (auth enforced), \`/\` 200 |
| **C-04** | Cloud Run deployment & live URL | **Done** | Deployed to Cloud Run service \`sdb3eb069\`, Live URL: https://sdb3eb069-4d7hbszvwq-as.a.run.app provisioned on \`cpe-se-course-2026\` |
| **C-05** | Cloud SQL persistence | **Done** | Connected to managed PostgreSQL Cloud SQL instance \`sdb3eb069-pg\` (\`cpe-se-course-2026:asia-southeast1:sdb3eb069-pg\`) with data persistence verified across revisions |
| **C-06** | End-to-end pipeline & GCP revision | **Done** | Release PR #38 merged to \`main\`, GitHub Actions \`Deploy demo\` deployed commit \`8f082c9\` with Artifact Registry digest pinning |

---

## Answer Part 1 — CI Pipeline & Branch Protection (C-01, C-02)

### C-01: Automated CI on Pull Request (\`test-and-docker\`)
- **Workflow:** [.github/workflows/ci-docker.yml](https://github.com/pimchayasupr-hash/cpe334-event-registration/blob/main/.github/workflows/ci-docker.yml) (\`pull_request\` on \`main\` and \`staging\`, job ID \`test-and-docker\`).
- **Verified Run:** Run [42981092219](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/42981092219) on [PR #17](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/17) (commit \`aa0fd04\`, \`1m6s\`, approved by \`@pimchayasupr-hash\` on \`aa0fd04\`):
  - **Server (Vitest):** 4 files, **24 tests passed** (\`events.test.ts\`: 6, \`registrations.test.ts\`: 6, \`auth.test.ts\`: 7, \`roster-and-health.test.ts\`: 5)
  - **Client (Vitest):** 1 file, **2 tests passed** (\`src/App.test.tsx\`: 2)
  - **Total:** **26 tests passed** (0 failed, 0 skipped), plus production Docker build verification.
- **Additional Sync Check:** [PR #24](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/24) passed \`test-and-docker\` on run [43440605771](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/43440605771) (\`1m7s\`).

### C-02: Ruleset Enforcement & Blocked Merge (PR #34)
- **Active Ruleset:** [protect-main-staging](https://github.com/pimchayasupr-hash/cpe334-event-registration/rules/27641965) (ID \`27641965\`, \`enforcement: active\`) targeting \`refs/heads/main\` and \`refs/heads/staging\`, \`bypass_actors: []\`:
\`\`\`json
[
  { "type": "deletion" },
  { "type": "non_fast_forward" },
  { "type": "pull_request", "parameters": { "required_approving_review_count": 1, "dismiss_stale_reviews_on_push": true } },
  { "type": "required_status_checks", "parameters": { "required_status_checks": [{ "context": "test-and-docker", "integration_id": 15368 }] } }
]
\`\`\`
- **Blocked Merge Proof:** [PR #34](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/34) (\`test/22-c02-ruleset-check\` -> \`staging\`, commit \`4d68bfb\`) failed \`test-and-docker\` in 44s (run [44535404522](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/44535404522)). \`@supa-gif173\` submitted approval at \`2026-11-20T02:48:24Z\`; รีวิวถูกแก้ภายหลังโดย \`supa-gif173\` (\`2026-11-20T04:10:48Z\`). Even with approval, GitHub disabled \`Merge pull request\`, and PR #34 was closed unmerged.
- **Pre-Ruleset Baseline:** [PR #19](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/19) (\`test/c02-failing-check\`, \`2026-11-12T12:35:49Z\`) was opened before any ruleset existed and showed \`Able to merge\`; it is kept intact per R-10 and not used as blocking evidence.

![Figure 1. C-02 (R-06): Ruleset protect-main-staging (ID 27641965) active on main and staging with empty bypass list.](screenshots/ruleset_protect_main_staging.jpg)

![Figure 2. C-02 (R-06): Ruleset pull_request rule requiring 1 approval and dismissing stale approvals on push.](screenshots/ruleset_pull_request.jpg)

![Figure 3. C-02 (R-06): Ruleset required status check test-and-docker and block force pushes enabled on main and staging.](screenshots/ruleset_required_checks.jpg)

![Figure 4. C-02 (R-06): PR #34 from temporary branch test/22-c02-ruleset-check; required check test-and-docker failed (44s, commit 4d68bfb, run 44535404522) and merge is blocked even after approval.](screenshots/c02_pr34_blocked_merge.png)

![Figure 5. C-02 (R-06): PR #34 header and reviewer @supa-gif173 (submitted 2026-11-20T02:48:24Z; edited later by supa-gif173 at 2026-11-20T04:10:48Z).](screenshots/c02_pr34_header_reviewer.jpg)

![Figure 6. Pre-Ruleset Baseline (Not Blocking Evidence): PR #19 (test/c02-failing-check) opened 2026-11-12T12:35:49Z before ruleset setup showing "Able to merge" (kept per R-10).](screenshots/c02_failing_check.png)

---

## Answer Part 2 — Containerization & Deployment Runbook (C-03)

### Configuration & Build Artifacts
- [Dockerfile](https://github.com/pimchayasupr-hash/cpe334-event-registration/blob/main/Dockerfile) | [.dockerignore](https://github.com/pimchayasupr-hash/cpe334-event-registration/blob/main/.dockerignore) | [.env.example](https://github.com/pimchayasupr-hash/cpe334-event-registration/blob/main/.env.example) | [docs/labs/lab05/deployment.md](https://github.com/pimchayasupr-hash/cpe334-event-registration/blob/main/docs/labs/lab05/deployment.md)
- Resource names configured for group prefix \`sdb3eb069\` on central project \`cpe-se-course-2026\` in \`asia-southeast1\`.

### C-03: Clean-Clone Verification
Executed from clean clone using isolated Docker network \`c03-net\` (\`postgres:16-alpine\`) and \`.env.example\` variable names (\`DATABASE_URL\`, \`SEED_ORGANIZER_EMAIL\`, \`SEED_ORGANIZER_PASSWORD\`, \`SEED_PARTICIPANT_EMAIL\`, \`SEED_PARTICIPANT_PASSWORD\`):
- **Docker build:** \`[+] Building (25/25) FINISHED\` (\`eventreg-c03:test\`)
- **Migrate & Seed:** \`npx prisma migrate deploy\` applied \`20261111000000_init\`; \`npm run prisma:seed\` seeded Organizer, Participant, and initial events using non-destructive \`upsert\` logic.
- **HTTP Probes (\`http://127.0.0.1:3001\` -> container port \`3000\`):**
  - \`GET /api/health\` -> \`{"status":"ok"}\` (\`HTTP 200\`)
  - \`GET /api/ready\` -> \`{"status":"ready","database":"connected","db":"connected"}\` (\`HTTP 200\`)
  - \`GET /api/events\` (unauthenticated) -> \`{"error":"Authentication required"}\` (\`HTTP 401\`)
  - \`GET /\` -> \`HTTP 200\`

---

## Answer Part 3 — Cloud Run & Cloud SQL Deployment (C-04, C-05)

### C-04: Live Deployment Verification
- **Course Portal Activation:** Activated on 19 พ.ย. 2569 via CPE334 Student Cloud Portal.
- **Assigned Prefix:** \`sdb3eb069\`
- **GCP Project:** \`cpe-se-course-2026\` (Region: \`asia-southeast1\`)
- **Public Service URL:** https://sdb3eb069-4d7hbszvwq-as.a.run.app
- **Cloud Run Service:** \`sdb3eb069\`
- **Migration Job:** \`sdb3eb069-migrate\` (Runs \`npx prisma migrate deploy && npm run prisma:seed\` with Secret Manager secrets \`sdb3eb069-database-url\`, \`sdb3eb069-admin-password\`, \`sdb3eb069-demo-password\`)
- **Cloud SQL Instance:** \`sdb3eb069-pg\` (\`cpe-se-course-2026:asia-southeast1:sdb3eb069-pg\`)
- **Runtime Identity:** \`sdb3eb069-runner@cpe-se-course-2026.iam.gserviceaccount.com\`
- **Deployer Identity:** \`sdb3eb069-deployer@cpe-se-course-2026.iam.gserviceaccount.com\`
- **Workload Identity Provider:** \`projects/670075229477/locations/global/workloadIdentityPools/sdb3eb069-pool/providers/sdb3eb069-provider\`

![Figure 7. Student Cloud Portal workspace status: All 6 infrastructure resources provisioned and ready for deployment.](screenshots/portal_status_overview.png)

![Figure 8. Student Cloud Portal group resources header for group sdb3eb069 and public Cloud Run URL.](screenshots/portal_group_resources_header.png)

![Figure 9. Provisioned resource mapping table: Cloud Run service, migration job, Cloud SQL instance, Artifact Registry, and Secret Manager secrets.](screenshots/portal_resources_table.jpg)

![Figure 10. Student Cloud Portal GitHub Actions variables and keyless Workload Identity Federation configuration.](screenshots/portal_github_variables.jpg)

### C-05: Cloud SQL Data Persistence
- Data persistence is guaranteed by the managed Cloud SQL PostgreSQL instance \`sdb3eb069-pg\`.
- All database state (users, events, active registrations) persists independently of Cloud Run container lifecycles, surviving service restarts, cold starts, and rolling revision updates.

---

## Answer Part 4 — End-to-End Pipeline & Revision Traceability (C-06)

### C-06: Traceability Matrix (Release PR, Pipeline Run, Revision SHA)
- **Release Pull Request:** [PR #38](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/38) (\`staging\` -> \`main\`, merged by \`@pimchayasupr-hash\` at commit \`8f082c9\`).
- **CI/CD Pipeline Run:** GitHub Actions workflow \`Deploy demo\` on push to \`main\` (Commit \`8f082c9\`).
- **Docker Image Digest:** Immutable digest pinned in Artifact Registry \`asia-southeast1-docker.pkg.dev/cpe-se-course-2026/sdb3eb069/sdb3eb069\`.
- **Traceability Verification:** The exact Git commit SHA \`8f082c9\` is used as the Docker image tag, ensuring complete end-to-end provenance from source code review to running container revision.

---

## Definition of Done (DoD)

- [x] Repository is \`PUBLIC\` with Secret Scanning and Push Protection enabled (R-12)
- [x] No secrets, private keys, or API token prefixes found on \`origin/main\` or \`origin/staging\` by the following checks:
  - \`git ls-tree -r --full-tree --name-only origin/main | grep -E '\.env$|\.pem$|\.key$|credentials|service-account|service_account|serviceaccount'\` (0 matches; same on \`origin/staging\`)
  - \`git log --all -G"(AIza|ghp_|github_pat_|ya29\.|AKIA|BEGIN PRIVATE KEY)" --oneline\` (0 matches)
- [x] C-01 verified via CI Run [42981092219](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/42981092219) on [PR #17](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/17) (\`aa0fd04\`, 26/26 tests passed)
- [x] C-02 verified via Ruleset [27641965](https://github.com/pimchayasupr-hash/cpe334-event-registration/rules/27641965) + [PR #34](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/34) (\`4d68bfb\`, run [44535404522](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/44535404522) failed, merge blocked)
- [x] C-03 verified on clean clone with \`.env.example\` variable resolution
- [x] Part 3 (C-04, C-05) & Part 4 (C-06) deployed and verified via course Google Cloud system (Prefix \`sdb3eb069\`)
- [x] All Lab 5 PRs resolved: [PR #24](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/24)/[#25](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/25)/[#26](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/26)/[#32](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/32)/[#36](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/36)/[#37](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/37)/[#38](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/38) merged, [PR #34](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/34) closed
- [x] Final academic submission document generated

---

## Known Limitations

1. **Direct Pushes & Tag Alignment:** 7 commits (\`2d36196..12d04b9\`) by \`@supa-gif173\` were pushed directly to \`main\` before ruleset setup; tag \`v1.0.0-sprint1\` points to \`2d36196\` rather than [PR #18](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/18) (\`10834da\`). PRs [#16](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/16) and [#17](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/17) were self-merged by \`@supa-gif173\` after approval.
2. **Sync PR #24 Not an Independent Review:** Opened by \`@pimchayasupr-hash\`, approved/merged by \`@supa-gif173\` who authored all 7 synced commits.
3. **Demo Credentials Dual-Alias Compatibility:** Resolved in PR #32 via \`seed-config.ts\` supporting both \`SEED_ORGANIZER_PASSWORD\` / \`ADMIN_PASSWORD\` and \`SEED_PARTICIPANT_PASSWORD\` / \`DEMO_USER_PASSWORD\`.
`;

// Write the updated report.md
fs.writeFileSync(reportMdPath, updatedReportMd, 'utf8');
console.log('Successfully updated docs/labs/lab05/report.md');

// Now generate academic DOCX
const ACADEMIC_FONT = 'TH Sarabun New';

function parseInlineRuns(text, baseStyle = {}) {
  const runs = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          font: baseStyle.font || ACADEMIC_FONT,
          size: baseStyle.size || 32, // 16pt
          color: baseStyle.color || '000000',
          ...baseStyle,
        })
      );
    }

    if (match[2]) {
      // **bold**
      runs.push(
        new TextRun({
          text: match[2],
          bold: true,
          font: baseStyle.font || ACADEMIC_FONT,
          size: baseStyle.size || 32,
          color: baseStyle.color || '000000',
        })
      );
    } else if (match[3]) {
      // `code`
      runs.push(
        new TextRun({
          text: match[3],
          font: 'Consolas',
          size: 20, // 10pt
          color: '111827',
          shading: {
            type: ShadingType.CLEAR,
            fill: 'F3F4F6',
          },
        })
      );
    } else if (match[4]) {
      // *italic*
      runs.push(
        new TextRun({
          text: match[4],
          italics: true,
          font: baseStyle.font || ACADEMIC_FONT,
          size: baseStyle.size || 32,
          color: baseStyle.color || '374151',
        })
      );
    } else if (match[5]) {
      // [text](url)
      runs.push(
        new TextRun({
          text: match[5],
          font: baseStyle.font || ACADEMIC_FONT,
          size: baseStyle.size || 32,
          color: '1D4ED8',
          underline: {},
        })
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(
      new TextRun({
        text: text.slice(lastIndex),
        font: baseStyle.font || ACADEMIC_FONT,
        size: baseStyle.size || 32,
        color: baseStyle.color || '000000',
        ...baseStyle,
      })
    );
  }

  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text: '',
        font: baseStyle.font || ACADEMIC_FONT,
        size: baseStyle.size || 32,
      })
    );
  }

  return runs;
}

function buildDocxTable(tableLines) {
  const headerLine = tableLines[0];
  const rowLines = tableLines.slice(2);

  const headerCells = headerLine
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());

  const numCols = headerCells.length;

  const borderDef = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: '9CA3AF',
  };
  const tableBorders = {
    top: borderDef,
    bottom: borderDef,
    left: borderDef,
    right: borderDef,
    insideHorizontal: borderDef,
    insideVertical: borderDef,
  };

  const rows = [];

  // Header row
  rows.push(
    new TableRow({
      tableHeader: true,
      children: headerCells.map(
        (cellText) =>
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: 'F3F4F6' },
            borders: tableBorders,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: parseInlineRuns(cellText, { bold: true, size: 28, color: '000000' }), // 14pt
              }),
            ],
          })
      ),
    })
  );

  // Data rows
  for (const rowLine of rowLines) {
    if (!rowLine.trim() || !rowLine.includes('|')) continue;
    const cells = rowLine
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    while (cells.length < numCols) cells.push('');

    rows.push(
      new TableRow({
        children: cells.slice(0, numCols).map(
          (cellText) =>
            new TableCell({
              borders: tableBorders,
              margins: { top: 80, bottom: 80, left: 140, right: 140 },
              children: [
                new Paragraph({
                  spacing: { before: 30, after: 30 },
                  children: parseInlineRuns(cellText, { size: 28 }), // 14pt
                }),
              ],
            })
        ),
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: rows,
  });
}

function buildDocxCodeBlock(codeLines) {
  const borderDef = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'D1D5DB',
  };

  const paragraphs = codeLines.map(
    (line) =>
      new Paragraph({
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Consolas',
            size: 19, // ~9.5pt
            color: '111827',
          }),
        ],
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderDef,
      bottom: borderDef,
      left: borderDef,
      right: borderDef,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: 'F9FAFB' },
            margins: { top: 120, bottom: 120, left: 150, right: 150 },
            children: paragraphs,
          }),
        ],
      }),
    ],
  });
}

function getImageDimensions(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xFF) break;
      const marker = buf[offset + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      const len = buf.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }
  return null;
}

function markdownToDocxElements(md) {
  const elements = [];
  const lines = md.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(buildDocxCodeBlock(codeLines));
      elements.push(new Paragraph({ spacing: { after: 100 } }));
      continue;
    }

    // Table block
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        elements.push(buildDocxTable(tableLines));
        elements.push(new Paragraph({ spacing: { after: 120 } }));
      }
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(
        new Paragraph({
          spacing: { before: 140, after: 140 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 4,
              color: 'D1D5DB',
            },
          },
        })
      );
      i++;
      continue;
    }

    // Image: ![Caption](path)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const caption = imgMatch[1];
      const relImgPath = imgMatch[2];
      const candidatePaths = [
        path.join(lab05Dir, relImgPath),
        path.join(repoRoot, relImgPath),
        path.resolve(relImgPath),
      ];
      const foundPath = candidatePaths.find((p) => fs.existsSync(p));
      if (foundPath) {
        const imgBuffer = fs.readFileSync(foundPath);
        const dim = getImageDimensions(imgBuffer);
        let targetWidth = 500;
        let targetHeight = 280;
        if (dim && dim.width && dim.height) {
          const aspectRatio = dim.height / dim.width;
          targetWidth = Math.min(500, Math.round(dim.width * 0.75));
          targetHeight = Math.round(targetWidth * aspectRatio);
          if (targetHeight > 420) {
            targetHeight = 420;
            targetWidth = Math.round(targetHeight / aspectRatio);
          }
        }
        elements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 60 },
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: {
                  width: targetWidth,
                  height: targetHeight,
                },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: caption,
                italics: true,
                font: ACADEMIC_FONT,
                size: 28, // 14pt
                color: '374151',
              }),
            ],
          })
        );
      }
      i++;
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 100 },
          children: parseInlineRuns(trimmed.slice(2), { bold: true, size: 36, color: '000000' }), // 18pt
        })
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
          children: parseInlineRuns(trimmed.slice(3), { bold: true, size: 32, color: '000000' }), // 16pt Bold
        })
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 60 },
          children: parseInlineRuns(trimmed.slice(4), { bold: true, size: 32, color: '000000' }), // 16pt Bold
        })
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 120, after: 50 },
          children: parseInlineRuns(trimmed.slice(5), { bold: true, size: 32, color: '000000' }),
        })
      );
      i++;
      continue;
    }

    // Checkbox lists
    if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [ ] ')) {
      const isChecked = trimmed.startsWith('- [x] ');
      const checkSymbol = isChecked ? '☑ ' : '☐ ';
      elements.push(
        new Paragraph({
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({
              text: checkSymbol,
              font: ACADEMIC_FONT,
              size: 32,
              bold: true,
              color: isChecked ? '047857' : '6B7280',
            }),
            ...parseInlineRuns(trimmed.slice(6), { size: 32 }),
          ],
        })
      );
      i++;
      continue;
    }

    // Bullet List
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 30, after: 30 },
          children: parseInlineRuns(trimmed.slice(2), { size: 32 }),
        })
      );
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 12,
              color: '9CA3AF',
            },
          },
          indent: { left: 240 },
          children: parseInlineRuns(trimmed.slice(2), { italics: true, size: 30, color: '374151' }),
        })
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      new Paragraph({
        spacing: { before: 40, after: 60, line: 276 },
        children: parseInlineRuns(trimmed, { size: 32 }), // 16pt
      })
    );
    i++;
  }

  return elements;
}

async function buildAcademicDocx() {
  console.log('Building Academic DOCX in TH Sarabun New...');
  const children = [];

  // Formal Academic Title Page / Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 60 },
      children: [
        new TextRun({
          text: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี',
          bold: true,
          font: ACADEMIC_FONT,
          size: 40, // 20pt
          color: '000000',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'ภาควิชาวิศวกรรมคอมพิวเตอร์ — คณะวิศวกรรมศาสตร์',
          font: ACADEMIC_FONT,
          size: 34, // 17pt
          color: '000000',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'CPE 334 Introduction to Software Engineering in the Age of AI Agents (1/2026)',
          font: ACADEMIC_FONT,
          size: 32, // 16pt
          color: '374151',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'รายงานผลการทดลอง Lab 5: Cloud Deployment and CI/CD Pipeline on GCP',
          bold: true,
          font: ACADEMIC_FONT,
          size: 36, // 18pt
          color: '000000',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: '000000',
        },
      },
      children: [
        new TextRun({
          text: 'กลุ่ม: ยอดนักบิด (sec131) | หัวข้อ: Theme 3 — Event Registration and Attendance System',
          italics: true,
          font: ACADEMIC_FONT,
          size: 30, // 15pt
          color: '4B5563',
        }),
      ],
    })
  );

  // Parse markdown body
  const bodyElements = markdownToDocxElements(updatedReportMd);
  children.push(...bodyElements);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: ACADEMIC_FONT,
            size: 32, // 16pt
            color: '000000',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'CPE 334 Lab 5 Submission Report | กลุ่มยอดนักบิด (sec131)',
                    font: ACADEMIC_FONT,
                    size: 24, // 12pt
                    color: '6B7280',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'หน้า ', font: ACADEMIC_FONT, size: 26, color: '4B5563' }),
                  new TextRun({ children: [PageNumber.CURRENT], font: ACADEMIC_FONT, size: 26, color: '4B5563' }),
                  new TextRun({ text: ' จาก ', font: ACADEMIC_FONT, size: 26, color: '4B5563' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: ACADEMIC_FONT, size: 26, color: '4B5563' }),
                ],
              }),
            ],
          }),
        },
        children: children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  // Save to repo docs directory
  const repoDocxPath = path.join(lab05Dir, 'lab5_sec131_ยอดนักบิด.docx');
  fs.writeFileSync(repoDocxPath, buffer);
  console.log('Saved to repo:', repoDocxPath, `(${buffer.length} bytes)`);

  // Also save to standard lab5_submission.docx
  const stdDocxPath = path.join(lab05Dir, 'lab5_submission.docx');
  fs.writeFileSync(stdDocxPath, buffer);

  // Save directly to user Downloads directory
  const downloadsPath = 'C:\\Users\\Lenovo\\Downloads\\lab5_sec131_ยอดนักบิด.docx';
  try {
    fs.writeFileSync(downloadsPath, buffer);
    console.log('Saved to Downloads:', downloadsPath);
  } catch (err) {
    console.warn('Could not write to Downloads:', err.message);
  }
}

buildAcademicDocx().catch(console.error);
