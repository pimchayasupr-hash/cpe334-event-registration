# System-Level Software Design Specification (System SDS)

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme:** Theme 3 — Event Registration and Attendance System
- **Chosen Context:** Faculty and University Academic Workshops & Seminars
- **Repository:** `https://github.com/pimchayasupr-hash/cpe334-event-registration`
- **Team Members:**
  1. Suphattra Kongsiriphat (`67070505228`, GitHub: `supa-gif173`) — Primary Author (Part C)
  2. Pimchaya Suprateravarnit (`67070505223`, GitHub: `pimchayasupr-hash`) — Contributor & Reviewer
- **Target Release:** Sprint 1 Baseline (`Deliverable 1`) & Cloud Deployment (`Lab 5`)
- **Document Version:** `v1.0`

---

## 1. System Architecture and Component Responsibilities

### 1.1 Architectural Overview & Technology Stack
The **Faculty Event Registration and Attendance System** is architected as a modular, three-tier cloud-native web application designed to run seamlessly in both local Docker environments and on Google Cloud Platform (GCP Cloud Run and Cloud SQL).

```mermaid
flowchart TD
    subgraph ClientLayer["Client Layer (Browser)"]
        SPA["React 18 + TypeScript + Vite SPA<br/>(Tailwind CSS, React Router v6)"]
    end

    subgraph ContainerBoundary["Application Container (Cloud Run / Docker)"]
        NginxStatic["Static Asset Server / Express Static Handler"]
        
        subgraph ServerApp["Backend API Server (Node.js 24 + Express)"]
            AuthMW["Auth & Session Middleware<br/>(Cookie parser, Session verification)"]
            RoleMW["Role & Ownership Guards<br/>(ORGANIZER vs. PARTICIPANT)"]
            DomainLayer["Domain Business Logic Services<br/>(Capacity checks, Temporal validations, Mutex)"]
            HealthRoutes["Operational Probes<br/>(/api/health, /api/ready)"]
        end
    end

    subgraph DataLayer["Persistence Layer (GCP Cloud SQL / Local Docker)"]
        Postgres[("PostgreSQL 16 Database")]
        Tables[("User | Session | Event | Registration")]
        Postgres --- Tables
    end

    SPA -- "HTTPS / REST API (JSON) + httpOnly Cookie" --> AuthMW
    AuthMW --> RoleMW
    RoleMW --> DomainLayer
    DomainLayer -- "Prisma ORM (Transactions & Row Locks)" --> Postgres
    HealthRoutes -- "SELECT 1" --> Postgres
```

### 1.2 Technology Stack Selection & Rationale

| Tier / Component | Technology Selected | Technical Rationale & Role |
|---|---|---|
| **Frontend UI** | **React 18, TypeScript, Vite** | High-performance Single Page Application (SPA), type-safe client component trees, deterministic client state management, and rapid bundle generation. |
| **Backend API** | **Node.js 24 LTS, Express 4, TypeScript** | Asynchronous event-driven I/O model ideal for concurrent seat reservation workflows, native ES modules support, and seamless shared typing between layers. |
| **ORM / Data Access** | **Prisma ORM (v5+)** | Declarative schema definition, automated type-safe client generation, migrations tracking, and robust interactive transaction support (`prisma.$transaction`). |
| **Database Engine** | **PostgreSQL 16** | ACID compliance, pessimistic row-level locking (`SELECT ... FOR UPDATE`), composite unique constraints, and direct parity with GCP Cloud SQL for PostgreSQL. |
| **Security & Auth** | **bcryptjs, node:crypto, httpOnly Cookies** | Salted password hashing (cost factor 10), 256-bit CSPRNG session IDs, stateful DB session tracking, and XSS-immune credential transmission. |
| **Containerization** | **Docker (Multi-stage build)** | Packages production frontend bundle, Node API runtime, and Prisma migration engine into a single immutable, non-root container image for Cloud Run. |

### 1.3 Component Responsibilities and Business Rule Enforcement
1. **Presentation / UI Layer (Client):** Responsible for routing, view rendering, accessible empty/loading states, responsive layout, and client-side form validation. *Client-side guards provide user guidance but never replace backend authorization.*
2. **API & Middleware Layer (Server Controller):** Responsible for HTTP protocol handling, cookie parsing, session token extraction, schema validation (Zod/Joi-style validation), and mapping domain errors to standard HTTP status codes (`400`, `401`, `403`, `404`, `409`, `500`, `503`).
3. **Domain Service Layer:** **Strictly where all Business Rules (`BR-01` to `BR-07`) are enforced.** Validates capacity bounds, schedule chronology (`endAt > startAt`), publication future-start guard (`startAt > now`), registration state transitions, and resource ownership checks (`event.organizerId === currentUser.id`).
4. **Persistence Layer (PostgreSQL):** Enforces data integrity via primary keys, foreign keys with referential actions (`CASCADE` / `RESTRICT`), check constraints, composite unique constraints (`@@unique([eventId, userId])`), and row-level locks during concurrent transactions.

---

## 2. Data Model, Relational Schema, and Persistence Design

### 2.1 Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ SESSION : "owns (1:N)"
    USER ||--o{ EVENT : "organizes (1:N)"
    USER ||--o{ REGISTRATION : "participates (1:N)"
    EVENT ||--o{ REGISTRATION : "contains (1:N)"

    USER {
        uuid id PK
        string email UK "unique, not null"
        string name "not null"
        string passwordHash "bcrypt hash, not null"
        enum role "ORGANIZER | PARTICIPANT"
        datetime createdAt "default now"
    }

    SESSION {
        string id PK "64-hex CSPRNG token"
        uuid userId FK "references USER(id) ON DELETE CASCADE"
        datetime expiresAt "not null, 8-hour TTL"
        datetime createdAt "default now"
    }

    EVENT {
        uuid id PK
        string title "not null"
        string description "not null"
        enum category "WORKSHOP | SEMINAR"
        string location "not null"
        datetime startAt "not null"
        datetime endAt "not null, endAt > startAt"
        int capacity "not null, 1 <= capacity <= 500"
        enum status "DRAFT | PUBLISHED, default DRAFT"
        uuid organizerId FK "references USER(id) ON DELETE RESTRICT"
        datetime createdAt "default now"
        datetime updatedAt "auto-updated"
    }

    REGISTRATION {
        uuid id PK
        uuid eventId FK "references EVENT(id) ON DELETE CASCADE"
        uuid userId FK "references USER(id) ON DELETE CASCADE"
        enum status "ACTIVE (Sprint 1), default ACTIVE"
        datetime createdAt "default now"
    }
```

### 2.2 Relational Entity Definitions & Constraints

#### Table 1: `User`
Stores authenticated actors in the system.
- `id` (`UUID`, Primary Key, default `uuid()`): Immutable unique identifier.
- `email` (`VarChar(255)`, Unique, Not Null): Case-insensitive unique student/faculty email address.
- `name` (`VarChar(255)`, Not Null): Full name of the user.
- `passwordHash` (`VarChar(255)`, Not Null): Salted bcrypt hash ($2b$10$...). Never serialized in API responses (`NFR-01`).
- `role` (`Role` Enum, Not Null): Allowed values: `'ORGANIZER'`, `'PARTICIPANT'`.
- `createdAt` (`Timestamp(3)`, Default `now()`).

#### Table 2: `Session`
Stores active server-side sessions, decoupling state from server memory (`NFR-02`, Lab 5 Ep 2).
- `id` (`VarChar(64)`, Primary Key): Cryptographically secure 256-bit random hex string.
- `userId` (`UUID`, Foreign Key -> `User.id` `ON DELETE CASCADE`, Indexed, Not Null): Links session to actor.
- `expiresAt` (`Timestamp(3)`, Not Null, Indexed): Absolute expiration timestamp (set to `now() + 8 hours`).
- `createdAt` (`Timestamp(3)`, Default `now()`).

#### Table 3: `Event`
Stores faculty workshops and seminars managed by organizers.
- `id` (`UUID`, Primary Key, default `uuid()`).
- `title` (`VarChar(255)`, Not Null).
- `description` (`Text`, Not Null).
- `category` (`EventCategory` Enum, Not Null): `'WORKSHOP'`, `'SEMINAR'`.
- `location` (`VarChar(255)`, Not Null).
- `startAt` (`Timestamp(3)`, Not Null).
- `endAt` (`Timestamp(3)`, Not Null): Must satisfy `endAt > startAt` (`BR-02`).
- `capacity` (`Int`, Not Null): Database check constraint `1 <= capacity <= 500` (`BR-01`).
- `status` (`EventStatus` Enum, Not Null, Default `'DRAFT'`): `'DRAFT'`, `'PUBLISHED'`.
- `organizerId` (`UUID`, Foreign Key -> `User.id` `ON DELETE RESTRICT`, Indexed, Not Null): Enforces event ownership (`BR-07`).
- `createdAt` (`Timestamp(3)`, Default `now()`), `updatedAt` (`Timestamp(3)`, `@updatedAt`).

#### Table 4: `Registration`
Stores participant bookings for published events.
- `id` (`UUID`, Primary Key, default `uuid()`).
- `eventId` (`UUID`, Foreign Key -> `Event.id` `ON DELETE CASCADE`, Indexed, Not Null).
- `userId` (`UUID`, Foreign Key -> `User.id` `ON DELETE CASCADE`, Indexed, Not Null).
- `status` (`RegistrationStatus` Enum, Not Null, Default `'ACTIVE'`): `'ACTIVE'` in Sprint 1 (`FR-04`).
- `createdAt` (`Timestamp(3)`, Default `now()`).
- **Composite Unique Constraint (`BR-05`, `AD-05`):** `@@unique([eventId, userId])`. Guarantees exactly one active registration per participant per event in Sprint 1.

### 2.3 Database Migrations and Reproducible Seed Strategy
1. **Prisma Migrations (`prisma migrate`):**
   - Migration scripts are versioned under `prisma/migrations/`.
   - In CI/CD and deployment, migrations are applied non-destructively via `npx prisma migrate deploy`.
2. **Reproducible Environment-Driven Seed (`prisma/seed.ts`):**
   - Implements idempotent upsert operations (`upsert`) for default seed accounts.
   - **Zero hardcoded credentials:** Passwords are read strictly from environment variables:
     - `SEED_ORGANIZER_EMAIL` (default: `organizer@kmutt.ac.th`)
     - `SEED_ORGANIZER_PASSWORD` (placeholder: `change-me-organizer`)
     - `SEED_PARTICIPANT_EMAIL` (default: `participant@kmutt.ac.th`)
     - `SEED_PARTICIPANT_PASSWORD` (placeholder: `change-me-participant`)
   - Pre-seeds at least 1 `DRAFT` event and 2 `PUBLISHED` events (including 1 almost-full event for concurrency testing).

---

## 3. UI Architecture, Navigation, and Shared UX Conventions

### 3.1 Screen Catalog and Navigation Map

```mermaid
graph TD
    Login["/login<br/>(Authentication Form)"]
    Catalog["/events<br/>(Public/Participant Event Catalog)"]
    Detail["/events/:id<br/>(Event Details & Register Action)"]
    MyReg["/my-registrations<br/>(Participant Own Bookings)"]
    OrgDash["/organizer/events<br/>(Organizer Workspace & Event Management)"]
    OrgRoster["/organizer/events/:id/registrations<br/>(Organizer Registrant Roster)"]

    Login -- "Participant Login" --> Catalog
    Login -- "Organizer Login" --> OrgDash
    Catalog --> Detail
    Detail -- "Register" --> MyReg
    OrgDash -- "View Registrants" --> OrgRoster
```

### 3.2 Shared UI Behaviors and State Standards
- **Loading State:** Async actions (button clicks, data fetching) trigger accessible skeleton placeholders or button spinners with `disabled` attributes to prevent accidental double-submits.
- **Empty States:** When no records exist (e.g., zero published events or empty registrations), screens display meaningful illustrations and actions (e.g., `"No workshops available right now — check back later"`).
- **Form Validation & Inline Errors:** Inputs validate format upon blur/submit (`1..500` bounds, valid future dates); API rejection messages (`400`, `409`) render directly in alert banners with actionable text.
- **Client-Side Session Guard:** On initial application mount, the client calls `GET /api/auth/me`. If unauthenticated, attempts to access protected routes redirect to `/login` with a redirect query param.

---

## 4. API Design Conventions, Contracts, and Error Handling

### 4.1 RESTful Endpoint Standard
- All API routes are namespaced under `/api`.
- Nouns are pluralized (`/api/events`, `/api/registrations`).
- Standard HTTP verbs define semantic operations:
  - `GET`: Safe, idempotent data retrieval.
  - `POST`: Non-idempotent resource creation or state transition actions (`/publish`).
  - `PATCH`: Partial resource updates (e.g., updating capacity).

### 4.2 Standard HTTP Status Codes

| Status Code | Semantic Meaning | Usage in System |
|---|---|---|
| `200 OK` | Request succeeded | `GET` lists/details, `POST /api/events/:id/publish`, `PATCH /capacity`, `POST /logout`. |
| `201 Created` | Resource created | `POST /api/events` (Draft), `POST /api/events/:id/registrations`. |
| `400 Bad Request` | Input validation failed | Non-integer capacity, capacity outside `1..500`, `endAt <= startAt`, past start time on publish. |
| `401 Unauthorized` | Missing / invalid / expired session | Unauthenticated access to protected endpoints; invalid login credentials. |
| `403 Forbidden` | Access denied by role or ownership | Participant attempting organizer operations; Organizer accessing another's event. |
| `404 Not Found` | Resource nonexistent or invisible | Unknown event ID; Participant querying a `DRAFT` event (`BR-03`). |
| `409 Conflict` | Domain invariant / state collision | Event full; duplicate registration; reducing capacity below active registrants. |
| `500 Server Error` | Unexpected internal exception | Sanitized internal error (stack trace withheld). |
| `503 Unavailable`| Dependency failure | `/api/ready` when PostgreSQL connection fails (`NFR-05`). |

### 4.3 Standard JSON Error Envelope
All error responses adhere to a consistent JSON format:
```json
{
  "error": "Short human-readable error title",
  "message": "Specific explanation of the failure without leaking sensitive system details",
  "code": "MACHINE_READABLE_CODE"
}
```

---

## 5. Access Control and Role/Permission Matrix

### 5.1 Role Definitions
- **`GUEST` (Unauthenticated):** Can access login endpoint and operational health probes.
- **`PARTICIPANT` (Student):** Can view published workshops, register for available seats, and view their own booking history.
- **`ORGANIZER` (Faculty Staff / Instructor):** Can create, publish, and manage their own events, adjust capacity, and inspect participant rosters for their owned events.

### 5.2 Comprehensive Role and Permission Matrix

| Endpoint / Operation | HTTP Verb | `GUEST` | `PARTICIPANT` | `ORGANIZER` | Scoping & Ownership Rule |
|---|---|:---:|:---:|:---:|---|
| **Login** (`/api/auth/login`) | `POST` | ALLOW | ALLOW | ALLOW | Public authentication gateway. |
| **Current User** (`/api/auth/me`) | `GET` | 401 | ALLOW | ALLOW | Returns profile of active `sid` session. |
| **Logout** (`/api/auth/logout`) | `POST` | 401 | ALLOW | ALLOW | Invalidates caller's session in DB. |
| **List Published Events** (`/api/events`) | `GET` | 401 | ALLOW | ALLOW | Filtered strictly to `status = 'PUBLISHED'`. |
| **Get Event Details** (`/api/events/:id`) | `GET` | 401 | ALLOW* | ALLOW* | *404 if `DRAFT` unless caller is owning `ORGANIZER`. |
| **Create Event** (`/api/events`) | `POST` | 401 | 403 | ALLOW | Always created as `DRAFT` with `organizerId = currentUser.id`. |
| **Publish Event** (`/api/events/:id/publish`) | `POST` | 401 | 403 | ALLOW* | *403 unless `event.organizerId === currentUser.id`. |
| **Update Capacity** (`/api/events/:id/capacity`) | `PATCH` | 401 | 403 | ALLOW* | *403 unless `event.organizerId === currentUser.id`. |
| **Organizer Events** (`/api/organizer/events`) | `GET` | 401 | 403 | ALLOW | Scoped strictly to `organizerId === currentUser.id`. |
| **Register for Event** (`/api/events/:id/registrations`) | `POST` | 401 | ALLOW | 403 | Enforces `status = 'PUBLISHED'`, active < cap, no duplicate. |
| **My Registrations** (`/api/registrations/me`) | `GET` | 401 | ALLOW | 403 | Scoped strictly to `userId === currentUser.id`. |
| **Event Registrant Roster** (`/api/events/:id/registrations`) | `GET` | 401 | 403 | ALLOW* | *403 unless `event.organizerId === currentUser.id`. |
| **Liveness Check** (`/api/health`) | `GET` | ALLOW | ALLOW | ALLOW | Unauthenticated probe returning `200 OK`. |
| **Readiness Check** (`/api/ready`) | `GET` | ALLOW | ALLOW | ALLOW | Unauthenticated probe verifying PostgreSQL connection (`200`/`503`). |

---

## 6. Security, Authentication, and Session Lifecycle

### 6.1 Credential Protection & Password Hashing (`NFR-01`)
- Stored passwords use salted `bcrypt` hashes generated via `bcryptjs` with a cost factor of `10`.
- Application queries explicitly omit `passwordHash` from `SELECT` projections (`select: { id: true, email: true, name: true, role: true }`).
- Pre-commit checklists ensure zero passwords, connection strings, or `.env` files enter Git commits (`R-12`).

### 6.2 Stateful Session Token Lifecycle (`NFR-02`)
1. **Creation:** Upon successful credential validation, the server generates 32 cryptographically secure random bytes formatted as a 64-character hexadecimal string (`crypto.randomBytes(32).toString('hex')`).
2. **Storage:** The token is inserted into PostgreSQL with `expiresAt = now() + 8 hours`.
3. **Transmission:** Set via HTTP cookie named `sid` with flags: `HttpOnly`, `Path=/`, `SameSite=Lax`, and `Secure` (in production/HTTPS environments).
4. **Verification Middleware:** For every incoming protected request, the server reads `req.cookies.sid`, queries the `Session` table, and verifies `expiresAt > now()`. If expired, the session row is deleted and `401 Unauthorized` is returned.
5. **Revocation (Logout):** Deletes the `Session` record from PostgreSQL and clears the `sid` cookie. Subsequent requests with that token fail immediately.

---

## 7. Concurrency Architecture and Last-Seat Allocation (`BR-04`, `NFR-03`)

### 7.1 The Last-Seat Race Condition Problem
When multiple participants submit registration requests simultaneously for an event that has only 1 seat remaining, naive application logic (reading active count, then executing an insert) creates a classic Read-Modify-Write race condition, leading to catastrophic room overbooking.

### 7.2 Pessimistic Row-Locking Mechanism
To prevent overbooking, registration requests run inside an atomic PostgreSQL transaction using **Pessimistic Row-Level Locking**:

```typescript
// Architectural Implementation Pattern for Concurrency Protection
await prisma.$transaction(async (tx) => {
  // 1. Acquire exclusive row-level lock on the target Event row
  const [event] = await tx.$queryRaw<Array<{ id: string; status: string; capacity: number }>>`
    SELECT id, status, capacity FROM "Event" WHERE id = ${eventId}::uuid FOR UPDATE
  `;

  if (!event || event.status !== 'PUBLISHED') {
    throw new NotFoundOrConflictError('Event not open for registration');
  }

  // 2. Check for duplicate registration by the same participant
  const existing = await tx.registration.findUnique({
    where: { eventId_userId: { eventId, userId: currentUser.id } }
  });
  if (existing) {
    throw new DuplicateRegistrationError('Already registered for this event');
  }

  // 3. Count current ACTIVE registrations inside the lock boundary
  const activeCount = await tx.registration.count({
    where: { eventId, status: 'ACTIVE' }
  });

  // 4. Invariant check: activeCount must be strictly less than capacity
  if (activeCount >= event.capacity) {
    throw new CapacityExceededError('Event is at full capacity');
  }

  // 5. Persist the registration row atomically
  return await tx.registration.create({
    data: {
      eventId,
      userId: currentUser.id,
      status: 'ACTIVE'
    }
  });
});
```

**Guarantees:**
- Only one transaction acquires the lock on the `Event` row at any instant; concurrent transactions block until the holding transaction finishes.
- The next transaction in queue reads the updated `activeCount`, immediately detects `activeCount >= capacity`, and aborts with `409 Conflict`.
- Overbooking is mathematically impossible under any level of concurrency.

---

## 8. Configuration, Secret Management, and Cloud Deployment Design

### 8.1 Environment Variables Architecture

| Variable Name | Purpose & Usage | Secret? | Source in Local Dev | Source in GCP Production |
|---|---|:---:|---|---|
| `PORT` | Listening port for the Express HTTP server | No | `.env` (`3000`) | Set automatically by Cloud Run (`8080` / `3000`) |
| `NODE_ENV` | Runtime environment mode | No | `.env` (`development`) | Set in Cloud Run (`production`) |
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | `.env` (`postgresql://postgres:postgres@localhost:5432/eventreg`) | Injected via Secret Manager (Unix socket connection) |
| `SESSION_SECRET` | Salt / secret for session signing | **Yes** | `.env` (development secret) | Injected via Secret Manager |
| `SEED_ORGANIZER_PASSWORD` | Initial password for demo organizer | **Yes** | `.env` (`change-me`) | Injected via Secret Manager (Episode 5) |
| `SEED_PARTICIPANT_PASSWORD` | Initial password for demo participant | **Yes** | `.env` (`change-me`) | Injected via Secret Manager (Episode 5) |

### 8.2 Container & Deployment Topology (Lab 5 Parity)
1. **Container Image Build:** Multi-stage `Dockerfile` compiles the React frontend into static assets, builds TypeScript backend code into `dist/`, and prepares Prisma binaries. Runs as unprivileged `node` user on `0.0.0.0:$PORT`.
2. **Google Cloud Run:** Hosts the stateless container service with auto-scaling down to `0` instances when idle (cost-saving) up to `3` max instances.
3. **Google Cloud SQL:** Managed PostgreSQL 16 instance (`db-f1-micro`) configured with automated storage increase disabled (`--no-storage-auto-increase`) to ensure fixed, predictable costs.
4. **Google Secret Manager:** Securely injects `DATABASE_URL` and admin passwords into Cloud Run runtime environment without committing keys to Git.
5. **Workload Identity Federation (WIF):** Authenticates GitHub Actions workflows (`deploy.yml`) directly with GCP without storing any long-lived JSON service account keys in GitHub repository secrets.

---

## 9. Traceability to Requirements and Definition of Done

This System-Level SDS directly implements and verifies the following specifications:
- **`FR-01` to `FR-06`:** Specified across Sections 1, 4, 5, and 6.
- **`BR-01` to `BR-07`:** Enforced across Sections 1.3, 2.2, 5.2, and 7.2.
- **`NFR-01` to `NFR-05`:** Verified across Sections 2.3, 6.1, 6.2, 7.2, and 8.1.
- **`AD-01` to `AD-06`:** Fully captured in data model definitions and transactional lock design.
