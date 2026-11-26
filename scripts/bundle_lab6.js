import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());

function readDoc(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8');
}

function embedImage(relPath) {
  const fullPath = path.join(repoRoot, 'docs/labs/lab06', relPath);
  if (!fs.existsSync(fullPath)) return null;
  const ext = path.extname(fullPath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const b64 = fs.readFileSync(fullPath).toString('base64');
  return `data:${mime};base64,${b64}`;
}

function mdToHtml(md) {
  const normalized = md.replace(/\r\n/g, '\n');

  const codeBlocks = [];
  let html = normalized.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="code-block"><code class="language-${lang}">${escaped}</code></pre>`);
    return `@@CODEBLOCK_${idx}@@`;
  });

  const inlineCodes = [];
  html = html.replace(/`([^`\n]+)`/g, (_m, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const idx = inlineCodes.length;
    inlineCodes.push(`<code class="inline-code">${escaped}</code>`);
    return `@@INLINECODE_${idx}@@`;
  });

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    const dataUri = embedImage(src.trim());
    if (!dataUri) {
      return `<div class="figure-container"><div class="caption">${alt} (missing file: ${src})</div></div>`;
    }
    return `<div class="figure-container"><img src="${dataUri}" alt="${alt}"/><div class="caption">${alt}</div></div>`;
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr/>');

  html = html.replace(/(?:^|\n)(\|.+\|\n\|[-:| ]+\|\n(?:\|.+\|(?:\n|$))+)/g, (_match, tableBlock) => {
    const lines = tableBlock.trim().split('\n');
    const headers = lines[0].split('|').slice(1, -1).map((h) => `<th>${h.trim()}</th>`).join('');
    const rows = lines.slice(2).map((row) => {
      const cells = row.split('|').slice(1, -1).map((c) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `\n<div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
  });

  html = html.replace(/^\s*- \[x\] (.*$)/gim, '<li class="checklist-item checked"><span class="check-box">☑</span> $1</li>');
  html = html.replace(/^\s*- \[ \] (.*$)/gim, '<li class="checklist-item unchecked"><span class="check-box">☐</span> $1</li>');
  html = html.replace(/^\s*- (.*$)/gim, '<li>$1</li>');

  html = html
    .split('\n\n')
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (
        block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<div') ||
        block.startsWith('<blockquote') || block.startsWith('<hr') || block.startsWith('<ul>') ||
        block.startsWith('<li>') || block.startsWith('<table') || block.startsWith('@@CODEBLOCK_')
      ) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n\n');

  html = html.replace(/@@INLINECODE_(\d+)@@/g, (_m, i) => inlineCodes[Number(i)]);
  html = html.replace(/@@CODEBLOCK_(\d+)@@/g, (_m, i) => codeBlocks[Number(i)]);

  return html;
}

function extractAcSection(relPath, heading) {
  const text = readDoc(relPath).replace(/\r\n/g, '\n');
  const m = text.match(/## 3\. Acceptance Criteria[\s\S]*?(?=\n## 4\.)/);
  if (!m) return `### ${heading}\n*(Contract section not found)*`;
  return `### ${heading}\n\n${m[0].trim()}`;
}

const reportMd = readDoc('docs/labs/lab06/report.md');
const uatPlanMd = readDoc('docs/labs/lab06/uat-plan.md');
const appendixA = [
  extractAcSection('docs/sprints/sprint-1/f-01-auth-session.md', 'F-01: Authentication & Session Contract (`f-01-auth-session.md`)'),
  extractAcSection('docs/sprints/sprint-1/f-02-event-management.md', 'F-02: Event Management Contract (`f-02-event-management.md`)'),
  extractAcSection('docs/sprints/sprint-1/f-03-registration-concurrency.md', 'F-03: Registration & Concurrency Contract (`f-03-registration-concurrency.md`)'),
  extractAcSection('docs/sprints/sprint-1/f-04-organizer-roster.md', 'F-04: Organizer Roster & Readiness Contract (`f-04-organizer-roster.md`)'),
].join('\n\n');

const appendixC = `### Baseline Automated Test & Release Evidence (\`e6aad26\` / Run \`45018492877\`)

- **Workflow:** \`.github/workflows/deploy.yml\` (\`Deploy demo\`, run [\`45018492877\`](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/45018492877), commit \`e6aad269e7b0f459126004e076f4fc432d1abdd0\`, merged [PR #40](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/40))
- **Backend Tests (\`cd server && npm test\`):** 5 files, **33 passed**, 0 failed, 0 skipped (\`events.test.ts\` 6, \`registrations.test.ts\` 6, \`auth.test.ts\` 7, \`roster-and-health.test.ts\` 5, \`seed-config.test.ts\` 9)
- **Frontend Tests (\`cd client && npm test\`):** 2 files, **5 passed**, 0 failed, 0 skipped (\`App.test.tsx\` 2, \`demoLogin.test.ts\` 3)
- **Cloud Run Deployment:** Service \`sdb3eb069\`, Revision \`sdb3eb069-00002-mct\` (100% traffic), Public URL \`https://sdb3eb069-4d7hbszvwq-as.a.run.app\`, smoke test passed (\`/api/health\`, \`/api/ready\`, \`/\`, \`/api/events\`).
- **PR Review Evidence (Lab 6 Defect/Fix PRs):** \`[รอข้อความรีวิวจริงจาก Part D หากมีการแก้ defect]\``;

const combinedMd = `${reportMd}\n\n---\n\n## Appendix A — Sprint 1 Contract Acceptance Criteria (Verbatim Excerpts)\n\n${appendixA}\n\n---\n\n## Appendix B — Complete Sprint 1 UAT Plan (\`uat-plan.md\`)\n\n${uatPlanMd}\n\n---\n\n## Appendix C — Baseline Test & Release Evidence\n\n${appendixC}`;
const reportHtml = mdToHtml(combinedMd);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CPE 334 - Lab 6 Submission Report</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm 20mm 15mm;
      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-family: 'Inter', 'Sarabun', sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Sarabun', 'Noto Sans Thai', 'Thonburi', -apple-system, sans-serif;
      font-size: 9pt;
      line-height: 1.5;
      color: #1e293b;
      margin: 0;
      padding: 20px;
    }
    .header-banner {
      border-left: 6px solid #FA4616;
      padding-left: 16px;
      margin-bottom: 20px;
    }
    .header-banner h1 { font-size: 16pt; margin: 0 0 4px 0; color: #0f172a; }
    .header-banner p { font-size: 9.5pt; color: #64748b; margin: 0; }
    h1 { font-size: 14pt; color: #0f172a; }
    h2 { font-size: 12pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 18px; }
    h3 { font-size: 10.5pt; color: #1e293b; margin-top: 14px; }
    a { color: #2563eb; text-decoration: none; }
    code.inline-code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 8.5pt; }
    pre.code-block { background: #0f172a; color: #f8fafc; padding: 10px 12px; border-radius: 6px; font-size: 8pt; overflow-x: auto; white-space: pre-wrap; }
    blockquote { border-left: 3px solid #94a3b8; margin: 8px 0; padding: 4px 12px; color: #475569; background: #f8fafc; }
    .table-container { margin: 10px 0 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; overflow-wrap: break-word; }
    th { background: #f1f5f9; font-weight: 600; white-space: nowrap; }
    tr { page-break-inside: avoid; }
    table .inline-code { white-space: nowrap; }
    .figure-container { margin: 12px 0; text-align: center; page-break-inside: avoid; }
    .figure-container img { max-width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; }
    .caption { font-size: 8pt; color: #475569; margin-top: 4px; font-style: italic; text-align: left; }
  </style>
</head>
<body>
  <div class="header-banner">
    <h1>CPE 334 Introduction to Software Engineering in the Age of AI Agents</h1>
    <p>Lab 6: Independent User Acceptance Testing and Defect Management</p>
  </div>
  ${reportHtml}
</body>
</html>
`;

const outputPath = path.join(repoRoot, 'docs/labs/lab06/lab6_full_submission.html');
fs.writeFileSync(outputPath, fullHtml, 'utf8');
console.log('Successfully generated Lab 6 HTML report:', outputPath);

