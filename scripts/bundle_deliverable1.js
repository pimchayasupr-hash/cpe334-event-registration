import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());

function readDoc(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8');
}

// Convert markdown to clean HTML
function mdToHtml(md) {
  let html = md
    // Escape HTML special characters inside code blocks first
    .replace(/```([a-z]*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre class="code-block"><code class="language-${lang}">${escaped}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Headers
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold / Italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Horizontal Rule
    .replace(/^\-\-\-$/gim, '<hr/>');

  // Tables
  html = html.replace(/\n(\|.+?\|\n\|[-:| ]+?\|\n(?:\|.+?\|\n?)+)/g, (match) => {
    const lines = match.trim().split('\n');
    const headerLine = lines[0];
    const rowLines = lines.slice(2);

    const headers = headerLine
      .split('|')
      .slice(1, -1)
      .map((h) => `<th>${h.trim()}</th>`)
      .join('');

    const rows = rowLines
      .map((row) => {
        const cells = row
          .split('|')
          .slice(1, -1)
          .map((c) => `<td>${c.trim()}</td>`)
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `\n<div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
  });

  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  // Clean duplicate <ul> tags
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, caption, relPath) => {
    const fullPath = path.isAbsolute(relPath) ? relPath : path.join(repoRoot, relPath);
    if (!fs.existsSync(fullPath)) return `<p><em>[Image not found: ${caption}]</em></p>`;
    const ext = path.extname(fullPath).slice(1) || 'png';
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    const base64 = fs.readFileSync(fullPath).toString('base64');
    return `\n<div class="figure-container"><img src="data:image/${mime};base64,${base64}" alt="${caption}" style="max-width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" /><p class="caption"><strong>${caption}</strong></p></div>\n`;
  });

  // Paragraphs
  html = html
    .split('\n\n')
    .map((chunk) => {
      const trimmed = chunk.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<blockquote')
      ) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join('\n\n');

  return html;
}

const srsMd = readDoc('docs/srs.md');
const featuresMd = readDoc('docs/features.md');
const traceabilityMd = readDoc('docs/traceability.md');
const systemSdsMd = readDoc('docs/system-sds.md');
const planMd = readDoc('docs/sprints/plan.md');
const f01Md = readDoc('docs/sprints/sprint-1/f-01-auth-session.md');
const f02Md = readDoc('docs/sprints/sprint-1/f-02-event-management.md');
const f03Md = readDoc('docs/sprints/sprint-1/f-03-registration-concurrency.md');
const f04Md = readDoc('docs/sprints/sprint-1/f-04-organizer-roster.md');
const partFMd = readDoc('docs/deliverable-1-report.md');

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CPE334 Deliverable 1 — Event Registration & Attendance System</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      background: #f8fafc;
      margin: 0;
      padding: 20px;
    }
    .page-wrapper {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px 50px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .cover-header {
      border-bottom: 3px solid #f97316;
      padding-bottom: 25px;
      margin-bottom: 30px;
    }
    .badge-course {
      display: inline-block;
      background: #fff7ed;
      color: #ea580c;
      border: 1px solid #fdba74;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 15px;
    }
    h1 {
      font-size: 2rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 10px;
      line-height: 1.25;
    }
    h2 {
      font-size: 1.45rem;
      font-weight: 700;
      color: #1e293b;
      margin-top: 35px;
      margin-bottom: 15px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #334155;
      margin-top: 25px;
      margin-bottom: 10px;
    }
    p, li {
      font-size: 0.95rem;
      color: #334155;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 30px;
      font-size: 0.9rem;
    }
    .meta-row {
      display: flex;
      margin-bottom: 6px;
    }
    .meta-label {
      width: 170px;
      font-weight: 700;
      color: #475569;
    }
    .meta-val {
      color: #0f172a;
    }
    .table-container {
      width: 100%;
      overflow-x: auto;
      margin: 15px 0 25px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      background: #ffffff;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .code-block {
      background: #0f172a;
      color: #f8fafc;
      padding: 14px 18px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.85rem;
      line-height: 1.45;
      margin: 15px 0;
    }
    .inline-code {
      background: #f1f5f9;
      color: #c2410c;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.88em;
    }
    blockquote {
      border-left: 4px solid #f97316;
      background: #fff7ed;
      padding: 10px 16px;
      margin: 15px 0;
      font-style: italic;
    }
    .section-divider {
      page-break-before: always;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #cbd5e1;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .page-wrapper {
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .section-divider {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <div class="cover-header">
      <div class="badge-course">CPE 334 Introduction to Software Engineering in the Age of AI Agents</div>
      <h1>Project Deliverable 1: Engineering Baseline and Working Sprint 1</h1>
      <p style="color: #64748b; font-size: 1.1rem; margin-top: 5px;">
        Theme 3: Event Registration and Attendance System (Faculty Workshops & Seminars)
      </p>
    </div>

    <div class="meta-box">
      <div class="meta-row"><span class="meta-label">Team Members:</span><span class="meta-val">1. <strong>Suphattra Kongsiriphat</strong> (ID: 67070505228, GitHub: @supa-gif173)<br/>2. <strong>Pimchaya Suprateravarnit</strong> (ID: 67070505223, GitHub: @pimchayasupr-hash)</span></div>
      <div class="meta-row"><span class="meta-label">Repository URL:</span><span class="meta-val"><a href="https://github.com/pimchayasupr-hash/cpe334-event-registration">https://github.com/pimchayasupr-hash/cpe334-event-registration</a></span></div>
      <div class="meta-row"><span class="meta-label">Submitted Release Tag:</span><span class="meta-val"><strong>v1.0.0-sprint1</strong> (Commit: <code>10834da</code>)</span></div>
      <div class="meta-row"><span class="meta-label">Submission Date:</span><span class="meta-val">November 2026</span></div>
    </div>

    <h2>Short Navigation Table (Parts A to F)</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Part</th>
            <th>Section Heading</th>
            <th>Direct Repo Artifact</th>
            <th>Summary of Contents</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Part A</strong></td>
            <td><strong>SRS and Product Scope</strong></td>
            <td><code>docs/srs.md</code></td>
            <td>Problem context, Actors, FR-01 to FR-11, BR-01 to BR-07, NFR-01 to NFR-05, Decisions AD-01 to AD-06</td>
          </tr>
          <tr>
            <td><strong>Part B</strong></td>
            <td><strong>Feature Inventory & Traceability</strong></td>
            <td><code>docs/features.md</code><br/><code>docs/traceability.md</code></td>
            <td>Complete 3-sprint feature list (F-01 to F-09) and 100% requirements-to-tests traceability matrix</td>
          </tr>
          <tr>
            <td><strong>Part C</strong></td>
            <td><strong>System-Level Software Design (SDS)</strong></td>
            <td><code>docs/system-sds.md</code></td>
            <td>Modular monolith 3-tier architecture, Prisma schema, PostgreSQL row-level pessimistic locking, session lifecycle</td>
          </tr>
          <tr>
            <td><strong>Part D</strong></td>
            <td><strong>Three-Sprint Plan</strong></td>
            <td><code>docs/sprints/plan.md</code></td>
            <td>Three-sprint roadmap, Sprint 1 vertical slice feasibility explanation, and deferred sprint roadmap</td>
          </tr>
          <tr>
            <td><strong>Part E</strong></td>
            <td><strong>Sprint 1 Engineering Contracts</strong></td>
            <td><code>docs/sprints/sprint-1/</code></td>
            <td>Pre-implementation feature contracts for F-01, F-02, F-03, and F-04 with AC, STS, and DoD</td>
          </tr>
          <tr>
            <td><strong>Part F</strong></td>
            <td><strong>Working Sprint 1 and Verification</strong></td>
            <td><code>server/</code>, <code>client/</code></td>
            <td>26 passing automated tests execution output, test mapping, code excerpts, contributions, and AI declaration</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PART A -->
    <div class="section-divider"></div>
    <h1>Part A: Software Requirements Specification (SRS)</h1>
    ${mdToHtml(srsMd)}

    <!-- PART B -->
    <div class="section-divider"></div>
    <h1>Part B: Feature Inventory and Traceability Matrix</h1>
    ${mdToHtml(featuresMd)}
    ${mdToHtml(traceabilityMd)}

    <!-- PART C -->
    <div class="section-divider"></div>
    <h1>Part C: System-Level Software Design Specification (System SDS)</h1>
    ${mdToHtml(systemSdsMd)}

    <!-- PART D -->
    <div class="section-divider"></div>
    <h1>Part D: Three-Sprint Development Plan</h1>
    ${mdToHtml(planMd)}

    <!-- PART E -->
    <div class="section-divider"></div>
    <h1>Part E: Sprint 1 Feature Engineering Contracts</h1>
    <h2>Contract F-01: User Authentication & Session Lifecycle</h2>
    ${mdToHtml(f01Md)}
    <h2>Contract F-02: Event Creation, Publication, and Capacity Management</h2>
    ${mdToHtml(f02Md)}
    <h2>Contract F-03: Participant Registration & Concurrency Protection</h2>
    ${mdToHtml(f03Md)}
    <h2>Contract F-04: Organizer Roster & Health Probes</h2>
    ${mdToHtml(f04Md)}

    <!-- PART F -->
    <div class="section-divider"></div>
    <h1>Part F: Working Sprint 1 Verification and Execution Evidence</h1>
    ${mdToHtml(partFMd)}

  </div>
</body>
</html>
`;

const outputPath = path.join(repoRoot, 'docs/deliverable_1_full_submission.html');
fs.writeFileSync(outputPath, fullHtml, 'utf8');
console.log('Successfully generated:', outputPath);
