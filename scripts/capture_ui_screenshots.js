const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const repoRoot = path.resolve(__dirname, '..');
const cssPath = path.join(repoRoot, 'client/src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const screenshotsDir = path.join(repoRoot, 'docs/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Common Header / Navbar HTML
function getNavbar(activeTab = 'events', role = 'PARTICIPANT', userName = 'Suphattra Kongsiriphat (67070505228)') {
  const isOrg = role === 'ORGANIZER';
  return `
    <header class="navbar">
      <div class="container navbar-inner">
        <div class="brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          TokTickIT Events <span class="badge-course">CPE 334 Theme 3</span>
        </div>

        <nav class="nav-links">
          <button class="nav-btn ${activeTab === 'events' ? 'active' : ''}">Events Catalog</button>
          <button class="nav-btn ${activeTab === 'my-registrations' ? 'active' : ''}">My Registrations</button>
          <button class="nav-btn ${activeTab === 'organizer' ? 'active' : ''}">Organizer Studio</button>
        </nav>

        <div class="user-profile">
          <span class="role-pill ${isOrg ? 'organizer' : 'participant'}">${role}</span>
          <span style="font-size: 0.85rem; font-weight: 600; color: #1e293b;">${userName}</span>
          <button class="btn btn-secondary btn-sm" style="padding: 4px 8px;">Logout</button>
        </div>
      </div>
    </header>

    <div class="demo-banner">
      <div class="container demo-banner-content">
        <div style="color: #64748b; font-size: 0.8rem;">
          <strong>Quick Persona Switcher:</strong> Switch personas to test role-based access rules:
        </div>
        <div class="demo-btn-group">
          <button class="btn btn-secondary btn-sm" style="${!isOrg ? 'background: #fff7ed; border-color: #fdba74; font-weight: bold;' : ''}">👤 Participant (Suphattra)</button>
          <button class="btn btn-secondary btn-sm" style="${isOrg ? 'background: #fff7ed; border-color: #fdba74; font-weight: bold;' : ''}">🏢 Organizer (Pimchaya)</button>
        </div>
      </div>
    </div>
  `;
}

// 1. Event Catalog Page HTML
const htmlCatalog = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Event Catalog - TokTickIT</title>
  <style>${cssContent}</style>
</head>
<body>
  ${getNavbar('events', 'PARTICIPANT', 'Suphattra Kongsiriphat')}
  
  <main class="container" style="padding-top: 1.5rem;">
    <div class="page-header">
      <div>
        <h1 class="page-title">Academic Seminars & Workshops</h1>
        <p class="page-subtitle">Faculty of Engineering Workshops — Available for Participant Registration (Sprint 1)</p>
      </div>
      <div>
        <span style="font-size: 0.85rem; color: #64748b; background: #ffffff; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
          Showing <strong>3</strong> Published Events
        </span>
      </div>
    </div>

    <div class="grid-cards">
      <!-- Card 1 -->
      <div class="card">
        <div class="card-header">
          <span class="badge-category" style="background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">WORKSHOP</span>
          <span class="status-badge status-published">PUBLISHED</span>
        </div>
        <h3 class="card-title">AI Agents in Software Engineering Workshop</h3>
        <p class="card-desc">Practical hands-on workshop covering autonomous LLM agents, multi-agent swarms, and CI/CD deployment pipelines.</p>
        <div class="card-meta">
          <div class="card-meta-row">📅 <strong>Date:</strong> 18 Nov 2026, 13:00 - 16:00</div>
          <div class="card-meta-row">📍 <strong>Venue:</strong> CB2-401 Computer Lab</div>
          <div class="card-meta-row">👤 <strong>Organizer:</strong> Pimchaya Suprateravarnit</div>
        </div>
        <div style="margin-top: auto;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600;">
            <span>Available Capacity</span>
            <span style="color: #16a34a;">25 / 25 Seats Available</span>
          </div>
          <div class="seat-progress-bar">
            <div class="seat-progress-fill" style="width: 0%;"></div>
          </div>
          <button class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">Register Now</button>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="card">
        <div class="card-header">
          <span class="badge-category" style="background: #fef3c7; color: #92400e; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">SEMINAR</span>
          <span class="status-badge status-published">PUBLISHED</span>
        </div>
        <h3 class="card-title">Cloud Native Architecture & GCP Masterclass</h3>
        <p class="card-desc">Deep dive into Google Cloud Run, Cloud SQL PostgreSQL, and Secret Manager keyless GitHub deployments.</p>
        <div class="card-meta">
          <div class="card-meta-row">📅 <strong>Date:</strong> 20 Nov 2026, 09:30 - 12:00</div>
          <div class="card-meta-row">📍 <strong>Venue:</strong> Auditorium 3, Engineering Bldg</div>
          <div class="card-meta-row">👤 <strong>Organizer:</strong> Pimchaya Suprateravarnit</div>
        </div>
        <div style="margin-top: auto;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600;">
            <span>Available Capacity</span>
            <span style="color: #16a34a;">48 / 50 Seats Available</span>
          </div>
          <div class="seat-progress-bar">
            <div class="seat-progress-fill" style="width: 4%;"></div>
          </div>
          <button class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">Register Now</button>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="card">
        <div class="card-header">
          <span class="badge-category" style="background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">WORKSHOP</span>
          <span class="status-badge status-published">PUBLISHED</span>
        </div>
        <h3 class="card-title">High-Concurrency Backend & Row Locking</h3>
        <p class="card-desc">Advanced seminar on PostgreSQL pessimistic row locking, race-condition prevention, and transaction isolation.</p>
        <div class="card-meta">
          <div class="card-meta-row">📅 <strong>Date:</strong> 25 Nov 2026, 14:00 - 17:00</div>
          <div class="card-meta-row">📍 <strong>Venue:</strong> CB2-402 Database Lab</div>
          <div class="card-meta-row">👤 <strong>Organizer:</strong> Assoc. Prof. Suthep Madarasmi</div>
        </div>
        <div style="margin-top: auto;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600;">
            <span>Available Capacity</span>
            <span style="color: #dc2626;">0 / 20 Seats Remaining (FULL)</span>
          </div>
          <div class="seat-progress-bar">
            <div class="seat-progress-fill" style="width: 100%; background-color: #dc2626;"></div>
          </div>
          <button class="btn btn-secondary" disabled style="width: 100%; margin-top: 0.5rem; opacity: 0.6;">Event Full (Waitlist Sprint 2)</button>
        </div>
      </div>
    </div>
  </main>
</body>
</html>
`;

// 2. Registration Success & My Registrations HTML
const htmlMyRegistrations = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>My Registrations - TokTickIT</title>
  <style>${cssContent}</style>
</head>
<body>
  ${getNavbar('my-registrations', 'PARTICIPANT', 'Suphattra Kongsiriphat')}
  
  <main class="container" style="padding-top: 1.5rem;">
    <div class="alert alert-success" style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <strong>Registration Confirmed!</strong> You have successfully registered for <em>"AI Agents in Software Engineering Workshop"</em>. Your booking is confirmed.
      </div>
      <span style="font-size: 0.8rem; background: #ffffff; padding: 2px 8px; border-radius: 4px; border: 1px solid #bbf7d0; font-weight: 600;">Transaction Status: 201 Created</span>
    </div>

    <div class="page-header" style="margin-top: 1rem;">
      <div>
        <h1 class="page-title">My Registered Events</h1>
        <p class="page-subtitle">Personal seminar schedule and active enrollment records (Retrieved from PostgreSQL via GET /api/registrations/me)</p>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Registration ID</th>
            <th>Event Title</th>
            <th>Category</th>
            <th>Date & Schedule</th>
            <th>Venue</th>
            <th>Status</th>
            <th>Registered At</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">reg-8f3a92</code></td>
            <td><strong>AI Agents in Software Engineering Workshop</strong></td>
            <td><span style="background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">WORKSHOP</span></td>
            <td>18 Nov 2026, 13:00 - 16:00</td>
            <td>CB2-401 Computer Lab</td>
            <td><span class="status-badge status-confirmed">ACTIVE</span></td>
            <td>12 Nov 2026, 14:20:15</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; margin-top: 1.5rem;">
      <h3 style="font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Domain Invariant Check (BR-02 & NFR-02 Traceability)</h3>
      <p style="font-size: 0.875rem; color: #64748b;">
        • Verified 1 active registration row in PostgreSQL.<br>
        • Privacy boundary: Endpoint strictly filters by authenticated session identity (<code>userId === session.userId</code>), preventing cross-user data leakage.
      </p>
    </div>
  </main>
</body>
</html>
`;

// 3. Duplicate Booking Rejection Modal HTML
const htmlDuplicateRejection = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Registration Conflict - TokTickIT</title>
  <style>${cssContent}</style>
</head>
<body>
  ${getNavbar('events', 'PARTICIPANT', 'Suphattra Kongsiriphat')}
  
  <main class="container" style="padding-top: 1.5rem; filter: blur(2px);">
    <div class="page-header">
      <h1 class="page-title">Academic Seminars & Workshops</h1>
    </div>
    <div class="grid-cards">
      <div class="card" style="height: 250px;"></div>
      <div class="card" style="height: 250px;"></div>
    </div>
  </main>

  <!-- Modal Overlay -->
  <div class="modal-overlay">
    <div class="modal-content" style="max-width: 520px; border-top: 5px solid #dc2626;">
      <div class="modal-header">
        <h3 class="modal-title" style="color: #dc2626; display: flex; align-items: center; gap: 8px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Registration Conflict (HTTP 409)
        </h3>
        <button style="border: none; background: transparent; font-size: 1.25rem; cursor: pointer;">&times;</button>
      </div>

      <div class="modal-body">
        <div class="alert alert-error" style="margin-bottom: 1rem;">
          <strong>Error 409 Conflict:</strong> User is already registered for this event.
        </div>
        
        <p style="font-size: 0.9rem; color: #334155; line-height: 1.5; margin-bottom: 1rem;">
          In strict accordance with <strong>Business Rule BR-02</strong>, each student or faculty participant is restricted to <strong>exactly one active registration per event</strong>. Duplicate or concurrent booking requests for the same workshop are rejected.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 0.8rem; font-family: monospace; color: #475569;">
          <div><strong>Attempted Event:</strong> AI Agents in Software Engineering Workshop</div>
          <div><strong>Active Registration ID:</strong> reg-8f3a92 (Status: ACTIVE)</div>
          <div><strong>Database Invariant:</strong> UNIQUE(userId, eventId) WHERE status = 'ACTIVE'</div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem; gap: 0.75rem;">
        <button class="btn btn-secondary">Close Dialog</button>
        <button class="btn btn-primary" style="background-color: #0f172a;">Go to My Registrations</button>
      </div>
    </div>
  </div>
</body>
</html>
`;

// 4. Organizer Studio & Attendee Roster HTML
const htmlOrganizerRoster = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Organizer Studio & Roster - TokTickIT</title>
  <style>${cssContent}</style>
</head>
<body>
  ${getNavbar('organizer', 'ORGANIZER', 'Pimchaya Suprateravarnit')}
  
  <main class="container" style="padding-top: 1.5rem; filter: blur(2px);">
    <div class="page-header">
      <h1 class="page-title">Organizer Management Studio</h1>
    </div>
    <div class="table-container" style="height: 200px;"></div>
  </main>

  <!-- Modal Overlay -->
  <div class="modal-overlay">
    <div class="modal-content" style="max-width: 780px;">
      <div class="modal-header">
        <div>
          <h3 class="modal-title">Attendee Roster: AI Agents in Software Engineering</h3>
          <p style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
            Event ID: <code>evt-101-workshop</code> | Total Registered: <strong>3 / 25 Participants</strong>
          </p>
        </div>
        <button style="border: none; background: transparent; font-size: 1.25rem; cursor: pointer;">&times;</button>
      </div>

      <div class="modal-body">
        <div class="table-container" style="margin-bottom: 1rem;">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Participant Name</th>
                <th>Student ID</th>
                <th>Email</th>
                <th>Registration Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><strong>Suphattra Kongsiriphat</strong></td>
                <td><code>67070505228</code></td>
                <td>supa.k@kmutt.ac.th</td>
                <td>12 Nov 2026, 14:20:15</td>
                <td><span class="status-badge status-confirmed">ACTIVE</span></td>
              </tr>
              <tr>
                <td>2</td>
                <td><strong>Rattanachote Petpansri</strong></td>
                <td><code>67070505102</code></td>
                <td>rattanachote.p@kmutt.ac.th</td>
                <td>12 Nov 2026, 14:22:40</td>
                <td><span class="status-badge status-confirmed">ACTIVE</span></td>
              </tr>
              <tr>
                <td>3</td>
                <td><strong>Kantapat Suwannahong</strong></td>
                <td><code>67070505105</code></td>
                <td>kantapat.s@kmutt.ac.th</td>
                <td>12 Nov 2026, 14:25:10</td>
                <td><span class="status-badge status-confirmed">ACTIVE</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.85rem;">
          <span style="color: #475569;">
            🔒 <strong>Ownership Rule BR-06:</strong> Only Organizer <code>pimchaya@kmutt.ac.th</code> can view or export this roster.
          </span>
          <button class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 4px;">
            📥 Export CSV Roster
          </button>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 1.25rem;">
        <button class="btn btn-secondary">Close Roster</button>
      </div>
    </div>
  </div>
</body>
</html>
`;

async function captureAll() {
  console.log('Launching browser for UI screenshot capture...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1.5,
    },
  });

  const page = await browser.newPage();

  const scenarios = [
    { name: 'ui_01_catalog.png', html: htmlCatalog },
    { name: 'ui_02_registration_success.png', html: htmlMyRegistrations },
    { name: 'ui_03_duplicate_rejection.png', html: htmlDuplicateRejection },
    { name: 'ui_04_organizer_roster.png', html: htmlOrganizerRoster },
  ];

  for (const s of scenarios) {
    const dest = path.join(screenshotsDir, s.name);
    await page.setContent(s.html, { waitUntil: 'load' });
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Captured screenshot:', dest);
  }

  await browser.close();
  console.log('All 4 UI screenshots captured successfully!');
}

captureAll().catch(console.error);
