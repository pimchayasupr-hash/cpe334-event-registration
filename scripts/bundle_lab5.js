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
    .replace(/^\\-\\-\\-$/gim, '<hr/>');

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

  // Checkboxes
  html = html.replace(/- \[x\] (.*$)/gim, '<li class="checklist-item checked"><span class="check-box">☑</span> $1</li>');
  html = html.replace(/- \[ \] (.*$)/gim, '<li class="checklist-item unchecked"><span class="check-box">☐</span> $1</li>');

  // Lists
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

  // Paragraphs
  html = html
    .split('\n\n')
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (
        block.startsWith('<h') ||
        block.startsWith('<pre') ||
        block.startsWith('<div') ||
        block.startsWith('<blockquote') ||
        block.startsWith('<hr') ||
        block.startsWith('<ul>') ||
        block.startsWith('<li>') ||
        block.startsWith('<table')
      ) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n\n');

  return html;
}

// Read C-02 screenshot and encode base64
const c02ImagePath = path.join(repoRoot, 'docs/labs/lab-05/screenshots/c02_failing_check.png');
let c02Base64 = '';
if (fs.existsSync(c02ImagePath)) {
  const imgBuffer = fs.readFileSync(c02ImagePath);
  c02Base64 = `data:image/png;base64,${imgBuffer.toString('base64')}`;
}

const reportMd = readDoc('docs/labs/lab-05/report.md');
let reportHtml = mdToHtml(reportMd);

// Replace the relative screenshot path with embedded base64
if (c02Base64) {
  reportHtml = reportHtml.replace('src="screenshots/c02_failing_check.png"', `src="${c02Base64}"`);
}

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CPE 334 - Lab 5 Submission Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    @page {
      size: A4;
      margin: 18mm 15mm 20mm 15mm;
      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }

    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9.5pt;
      line-height: 1.5;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
    }

    .report-card {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px 48px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border-radius: 8px;
    }

    .header-banner {
      border-left: 6px solid #FA4616;
      padding-left: 20px;
      margin-bottom: 24px;
    }

    .header-banner h1 {
      font-size: 18pt;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }

    .header-banner p {
      font-size: 10pt;
      color: #64748b;
      margin: 0;
    }

    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 9pt;
    }

    .meta-row {
      display: flex;
      margin-bottom: 6px;
    }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label {
      width: 170px;
      font-weight: 600;
      color: #475569;
    }
    .meta-val {
      flex: 1;
      color: #0f172a;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 14px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 600;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }

    p {
      margin: 0 0 10px 0;
    }

    a {
      color: #2563eb;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }

    .table-container {
      margin: 12px 0 18px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    code.inline-code {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 4px;
      color: #0f172a;
      border: 1px solid #e2e8f0;
    }

    pre.code-block {
      background: #0f172a;
      color: #f8fafc;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 8pt;
      padding: 12px 14px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 10px 0 16px 0;
      line-height: 1.4;
      page-break-inside: avoid;
    }

    .figure-container {
      margin: 16px 0;
      text-align: center;
      page-break-inside: avoid;
    }

    .figure-container img {
      max-width: 100%;
      height: auto;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .caption {
      font-size: 8pt;
      color: #475569;
      margin-top: 6px;
      font-style: italic;
      text-align: left;
    }

    .checklist-item {
      list-style-type: none;
      margin-bottom: 4px;
      font-size: 9pt;
    }

    .check-box {
      font-weight: bold;
      color: #16a34a;
      margin-right: 6px;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
        font-size: 9pt;
      }
      .report-card {
        padding: 0;
        box-shadow: none;
        max-width: 100%;
      }
      h2 {
        page-break-before: auto;
      }
      pre.code-block, .table-container, .figure-container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="header-banner">
      <h1>CPE 334 Introduction to Software Engineering in the Age of AI Agents</h1>
      <p>Lab 5: Cloud Deployment and CI/CD Pipeline on Google Cloud Platform (GCP)</p>
    </div>

    ${reportHtml}
  </div>
</body>
</html>
`;

const outputPath = path.join(repoRoot, 'docs/labs/lab-05/lab5_full_submission.html');
fs.writeFileSync(outputPath, fullHtml, 'utf8');
console.log('Successfully generated Lab 5 HTML report:', outputPath);
