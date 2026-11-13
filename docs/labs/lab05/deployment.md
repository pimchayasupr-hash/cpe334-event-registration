# Deployment Specification and Operations Guide (Lab 5)

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme:** Theme 3 — Event Registration and Attendance System
- **Repository:** `https://github.com/pimchayasupr-hash/cpe334-event-registration`
- **Team Members:**
  1. Pimchaya Suprateravarnit (`67070505223`, GitHub: `pimchayasupr-hash`)
  2. Suphattra Kongsiriphat (`67070505228`, GitHub: `supa-gif173`)
- **Document Version:** `v1.0`

---

## 1. System Architecture and Technology Stack

The application is deployed as a unified, cloud-native container running on **Google Cloud Run** connected to a managed **Google Cloud SQL for PostgreSQL** instance.

| Layer | Component | Technology | Role & Configuration |
|---|---|---|---|
| **Frontend UI** | Static SPA | React 18 + Vite + TypeScript | Built via multi-stage Dockerfile into static assets served directly by Express |
| **Backend API** | REST API | Node.js 24 LTS + Express 4 + TypeScript | Serves `/api/*` endpoints and SPA fallback on port `3000` |
| **ORM / Data Access** | Database Layer | Prisma ORM v5 | Schema migrations (`prisma migrate deploy`) and database seed script |
| **Persistence** | Database Engine | PostgreSQL 16 (Cloud SQL) | Managed PostgreSQL instance (`toktickit-pg`, `db-f1-micro`) with persistent storage |
| **Secrets Management** | Secret Manager | GCP Secret Manager | Externalized database credentials and passwords; 0 secrets in Git |
| **CI/CD Automation** | Pipeline | GitHub Actions + Workload Identity Federation | Automated build, test, Docker image push, and Cloud Run deployment without service account JSON keys |

---

## 2. Environment Variables & Secret Handling (`R-02`)

All configuration is externalized into the environment. No plaintext passwords or connection strings are committed to Git.

| Variable Name | Purpose | Secret? | Source (Local Dev) | Source (GCP Production) |
|---|---|:---:|---|---|
| `PORT` | Listening port for application server | No | `.env` (`3000`) | Injected by Cloud Run runtime (`3000`) |
| `NODE_ENV` | Runtime environment mode | No | `.env` (`development`) | Set in Cloud Run (`production`) |
| `TZ` | Container timezone | No | `.env` (`Asia/Bangkok`) | Set in Cloud Run (`Asia/Bangkok`) |
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | `.env` (`postgresql://...`) | Injected via Secret Manager (`toktickit-database-url:latest`) |
| `SEED_ORGANIZER_EMAIL` | Demo organizer email | No | `.env` (`organizer@kmutt.ac.th`) | Seed script default |
| `SEED_ORGANIZER_PASSWORD` | Demo organizer password | **Yes** | `.env` (gitignored) | Injected via Secret Manager (`toktickit-admin-password:latest`) |
| `SEED_PARTICIPANT_EMAIL` | Demo participant email | No | `.env` (`participant@kmutt.ac.th`) | Seed script default |
| `SEED_PARTICIPANT_PASSWORD`| Demo participant password | **Yes** | `.env` (gitignored) | Injected via Secret Manager (`toktickit-demo-password:latest`) |

---

## 3. Local Build, Run, and Test Commands (`R-01`, `R-05`)

### 3.1 Fresh Clone Setup from Clean State
```bash
# Clone the repository
git clone https://github.com/pimchayasupr-hash/cpe334-event-registration.git
cd cpe334-event-registration

# Start local PostgreSQL database
docker compose up -d db

# Install dependencies and migrate database
cd server
npm ci
npx prisma migrate deploy
npm run prisma:seed

# Run automated test suite (26 passing tests)
npm test

# Build backend and frontend
npm run build
cd ../client
npm ci
npm test
npm run build
```

### 3.2 Unified Docker Container Build
```bash
# Build unified production container from repo root
docker build -t eventreg:latest .

# Run container locally with database
docker run -p 3000:3000 --env-file server/.env eventreg:latest
```

---

## 4. Google Cloud Platform Resource Names & Topology

> **Note:** The `toktickit*` resource identifiers below are Starter Kit template defaults and have not been provisioned on GCP yet (no GCP Free Trial / billing account).

| Resource | Resource Name / Identifier | Region / Spec |
|---|---|---|
| **Artifact Registry** | `toktickit` | `asia-southeast1` (Docker format) |
| **Cloud SQL Instance** | `toktickit-pg` | PostgreSQL 16, `db-f1-micro`, `--edition=enterprise`, `--no-storage-auto-increase` |
| **Database & User** | `toktickit` / `toktickit` | PostgreSQL database user with random password stored in Secret Manager |
| **Cloud Run Migration Job**| `toktickit-migrate` | Runs `npx prisma migrate deploy && npm run prisma:seed` |
| **Cloud Run Service** | `toktickit` | Unified runtime, `--port 3000`, `--min-instances 0`, `--max-instances 2`, `--memory 512Mi` |
| **Service Account** | `toktickit-runner` | Runtime identity with minimal secrets accessor role |
| **Workload Identity Provider**| `github-wif-pool` / `github-wif-provider` | Keyless OIDC authentication for GitHub Actions |

---

## 5. Release Procedure and Commit Identification (`R-07`, `R-08`)

### 5.1 Repeatable Release Pipeline Workflow
1. **Feature/Fix Implementation:** Developer creates branch from `staging` and links GitHub Issue.
2. **Pull Request to `staging`:** Triggers `.github/workflows/ci-docker.yml` running deploy script tests, Prisma migration, 26 Vitest tests, frontend build, and Docker build.
3. **Teammate Code Review:** Teammate reviews code and approves PR (authors never approve own PRs).
4. **Release PR to `main`:** When ready for release, a Release PR from `staging` into `main` is reviewed and merged.
5. **Automated Continuous Deployment:** Push to `main` automatically triggers `.github/workflows/deploy.yml`:
   - Runs `ci-docker.yml` test suite first.
   - Logs into GCP via Workload Identity Federation (no long-lived JSON keys).
   - Builds container image tagged with immutable 40-character commit SHA:
     `${REGION}-docker.pkg.dev/${PROJECT_ID}/toktickit/toktickit:${GITHUB_SHA}`
   - Executes Cloud Run migration job (`toktickit-migrate`).
   - Updates Cloud Run service (`toktickit`) to the new image digest.
   - Executes automated smoke test (`deploy/smoke_test.py`) against the live URL.

### 5.2 How to Identify the Currently Running Commit
1. **From Public URL:** Probe health and readiness endpoints:
   - `GET /api/health` -> `{"status":"ok"}`
   - `GET /api/ready` -> `{"status":"ready","database":"connected","db":"connected"}`
2. **From GitHub Actions:** Navigate to **Actions** -> **Deploy demo** workflow run. The deployment summary displays:
   - **Commit image tag:** 40-character commit SHA
   - **Digest:** `@sha256:...`
   - **Live Service URL:** `https://toktickit-xxxx.a.run.app`
3. **From GCP Console / gcloud:**
   ```bash
   gcloud run services describe toktickit --region asia-southeast1 --format='value(spec.template.spec.containers[0].image)'
   ```

---

## 6. Known Limitations (Documentation Disclosure)

1. **Client-Embedded Demo Credentials:** `client/src/App.tsx` (`handleQuickLogin`, lines 96–113) calls `/api/auth/login`, but embeds demo passwords in the client bundle.
2. **Seed Environment Variable Mismatch:** `deploy/deploy.sh` passes `ADMIN_PASSWORD` / `DEMO_USER_PASSWORD`, whereas `server/prisma/seed.ts` reads `SEED_ORGANIZER_PASSWORD` / `SEED_PARTICIPANT_PASSWORD`; a real deploy would fall back to the default passwords committed in the repository.
3. **Self-Merged Approved PRs:** PR #16 and PR #17 were merged by their author (`@supa-gif173`) after receiving approval from `@pimchayasupr-hash`.
