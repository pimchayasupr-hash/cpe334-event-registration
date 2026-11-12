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

// Helper to parse inline markdown (bold, code, italic, links)
function parseInlineRuns(text, baseStyle = {}) {
  const runs = [];
  // Tokenize regex for **bold**, `code`, *italic*, [link](url)
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          font: baseStyle.font || 'Calibri',
          size: baseStyle.size || 22, // 11pt = 22 half-pts
          color: baseStyle.color || '1E293B',
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
          font: baseStyle.font || 'Calibri',
          size: baseStyle.size || 22,
          color: baseStyle.color || '0F172A',
        })
      );
    } else if (match[3]) {
      // `code`
      runs.push(
        new TextRun({
          text: match[3],
          font: 'Consolas',
          size: 20, // 10pt
          color: '0F172A',
          shading: {
            type: ShadingType.CLEAR,
            fill: 'F1F5F9',
          },
        })
      );
    } else if (match[4]) {
      // *italic*
      runs.push(
        new TextRun({
          text: match[4],
          italics: true,
          font: baseStyle.font || 'Calibri',
          size: baseStyle.size || 22,
          color: baseStyle.color || '334155',
        })
      );
    } else if (match[5]) {
      // [text](url)
      runs.push(
        new TextRun({
          text: match[5],
          font: baseStyle.font || 'Calibri',
          size: baseStyle.size || 22,
          color: '2563EB',
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
        font: baseStyle.font || 'Calibri',
        size: baseStyle.size || 22,
        color: baseStyle.color || '1E293B',
        ...baseStyle,
      })
    );
  }

  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text: '',
        font: baseStyle.font || 'Calibri',
        size: baseStyle.size || 22,
      })
    );
  }

  return runs;
}

// Convert a markdown table block into a docx.Table
function buildDocxTable(tableLines) {
  const headerLine = tableLines[0];
  const rowLines = tableLines.slice(2);

  const headerCells = headerLine
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());

  const numCols = headerCells.length;
  const colWidthPercent = Math.floor(100 / (numCols || 1));

  const borderDef = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'CBD5E1',
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
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            borders: tableBorders,
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: parseInlineRuns(cellText, { bold: true, color: '1E293B' }),
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

    // Pad cells if mismatched
    while (cells.length < numCols) cells.push('');

    rows.push(
      new TableRow({
        children: cells.slice(0, numCols).map(
          (cellText) =>
            new TableCell({
              borders: tableBorders,
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  spacing: { before: 30, after: 30 },
                  children: parseInlineRuns(cellText, { size: 20 }), // 10pt
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

// Convert code block into a styled box table in docx
function buildDocxCodeBlock(codeLines, lang) {
  const borderDef = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'E2E8F0',
  };

  const paragraphs = codeLines.map(
    (line) =>
      new Paragraph({
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Consolas',
            size: 18, // 9pt
            color: '0F172A',
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
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            margins: { top: 140, bottom: 140, left: 160, right: 160 },
            children: paragraphs,
          }),
        ],
      }),
    ],
  });
}

// Convert markdown text to array of Docx elements
function markdownToDocxElements(md) {
  const elements = [];
  const lines = md.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(buildDocxCodeBlock(codeLines, lang));
      elements.push(new Paragraph({ spacing: { after: 120 } }));
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
        elements.push(new Paragraph({ spacing: { after: 140 } }));
      }
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(
        new Paragraph({
          spacing: { before: 180, after: 180 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: 'E2E8F0',
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
      const fullImgPath = path.isAbsolute(relImgPath) ? relImgPath : path.join(repoRoot, relImgPath);
      if (fs.existsSync(fullImgPath)) {
        const imgBuffer = fs.readFileSync(fullImgPath);
        const isWide = relImgPath.includes('github_pr') || relImgPath.includes('c02_failing');
        const imgWidth = 540;
        const imgHeight = isWide ? 260 : 330;

        elements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 60 },
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: {
                  width: imgWidth,
                  height: imgHeight,
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
                size: 18, // 9pt
                color: '475569',
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
          spacing: { before: 280, after: 120 },
          children: parseInlineRuns(trimmed.slice(2), { bold: true, size: 28, color: '0F172A' }), // 14pt
        })
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 220, after: 100 },
          children: parseInlineRuns(trimmed.slice(3), { bold: true, size: 24, color: '1E293B' }), // 12pt
        })
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 180, after: 80 },
          children: parseInlineRuns(trimmed.slice(4), { bold: true, size: 22, color: '334155' }), // 11pt
        })
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 140, after: 60 },
          children: parseInlineRuns(trimmed.slice(5), { bold: true, size: 20, color: '475569' }), // 10pt
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
          children: parseInlineRuns(trimmed.slice(2)),
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
          indent: { left: 360 },
          children: parseInlineRuns(trimmed.slice(2), { italics: true, color: '475569' }),
        })
      );
      i++;
      continue;
    }

    // Normal Paragraph
    elements.push(
      new Paragraph({
        spacing: { before: 40, after: 80, line: 276 }, // 1.15 line spacing
        children: parseInlineRuns(trimmed),
      })
    );
    i++;
  }

  return elements;
}

function readDoc(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8');
}

async function generateDeliverable1Docx() {
  console.log('Generating Deliverable 1 DOCX...');

  const srsMd = readDoc('docs/srs.md');
  const featuresMd = readDoc('docs/features.md');
  const traceabilityMd = readDoc('docs/traceability.md');
  const systemSdsMd = readDoc('docs/system-sds.md');
  const planMd = readDoc('docs/sprints/plan.md');
  const f01Md = readDoc('docs/sprints/sprint-1/f-01-auth.md');
  const f02Md = readDoc('docs/sprints/sprint-1/f-02-events.md');
  const f03Md = readDoc('docs/sprints/sprint-1/f-03-registrations.md');
  const f04Md = readDoc('docs/sprints/sprint-1/f-04-roster.md');
  const partFMd = readDoc('docs/deliverable-1-report.md');

  const children = [];

  // Title Banner
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({
          text: 'KMUTT — Department of Computer Engineering',
          bold: true,
          size: 26, // 13pt
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'CPE 334 Introduction to Software Engineering in the Age of AI Agents',
          size: 22,
          color: '475569',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Project Deliverable 1: Engineering Baseline and Working Sprint 1',
          bold: true,
          size: 32, // 16pt
          color: '0F172A',
        }),
      ],
    })
  );

  // Metadata Table
  const metaBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
  };

  const metaRows = [
    ['Project Theme', 'Theme 3: Event Registration and Attendance System (Academic Workshops & Seminars)'],
    ['Team Members', '1. Suphattra Kongsiriphat (ID: 67070505228, @supa-gif173)\n2. Pimchaya Suprateravarnit (ID: 67070505223, @pimchayasupr-hash)'],
    ['Repository URL', 'https://github.com/pimchayasupr-hash/cpe334-event-registration'],
    ['Submitted Release Tag', 'v1.0.0-sprint1 (Release Commit: 10834da / 2d36196)'],
    ['Submission Date', 'Semester 1/2026 (November 2026)'],
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: metaBorders,
      rows: metaRows.map(
        ([label, val]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: val.split('\n').map((v) => new Paragraph({ children: [new TextRun({ text: v, size: 20 })] })),
              }),
            ],
          })
      ),
    }),
    new Paragraph({ spacing: { after: 240 } })
  );

  // Short Navigation Table
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 100 },
      children: [new TextRun({ text: 'Table of Contents / Navigation Table (Parts A to F)', bold: true, size: 24 })],
    })
  );

  const navRows = [
    ['Part A', 'SRS and Product Scope', 'Author: Pimchaya Suprateravarnit\nReviewer: Suphattra Kongsiriphat (PR #4)', 'Problem context, Actors, FR-01 to FR-11, BR-01 to BR-07, NFR-01 to NFR-05, AD-01 to AD-06'],
    ['Part B', 'Feature Inventory & Traceability', 'Author: Pimchaya Suprateravarnit\nReviewer: Suphattra Kongsiriphat (PR #14)', 'Feature breakdown F-01 to F-09 and 100% requirements-to-tests traceability matrix'],
    ['Part C', 'System-Level Software Design (SDS)', 'Author: Suphattra Kongsiriphat\nReviewer: Pimchaya Suprateravarnit (PR #16)', 'Modular monolith 3-tier architecture, Prisma schema, PostgreSQL row-level pessimistic locking, session lifecycle'],
    ['Part D', 'Three-Sprint Plan', 'Author: Pimchaya Suprateravarnit\nReviewer: Suphattra Kongsiriphat (PR #14)', 'Three-sprint roadmap, Sprint 1 vertical slice feasibility explanation, and deferred sprint roadmap'],
    ['Part E', 'Sprint 1 Engineering Contracts', 'Author: Pimchaya Suprateravarnit\nReviewer: Suphattra Kongsiriphat (PRs #6, #8, #10, #12)', 'Pre-implementation feature contracts for F-01, F-02, F-03, and F-04 with AC, STS, and DoD'],
    ['Part F', 'Working Sprint 1 and Verification', 'Author: Suphattra Kongsiriphat\nReviewer: Pimchaya Suprateravarnit (PRs #17, #18)', 'Local setup, 26 automated tests, 4 UI demonstration figures, 2 GitHub PR figures, and team contributions'],
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: metaBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['Part', 'Section Heading', 'Lead Author & Reviewer', 'Summary of Contents'].map(
            (h) =>
              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                margins: { top: 100, bottom: 100, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
              })
          ),
        }),
        ...navRows.map(
          ([p, title, auth, desc]) =>
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 10, type: WidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: p, bold: true, size: 20 })] })],
                }),
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 20 })] })],
                }),
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: auth.split('\n').map((a) => new Paragraph({ children: [new TextRun({ text: a, size: 18 })] })),
                }),
                new TableCell({
                  width: { size: 35, type: WidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: desc, size: 18 })] })],
                }),
              ],
            })
        ),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Append Parts A to F with page breaks
  const parts = [
    { title: 'Part A: Software Requirements Specification (SRS)', author: 'Lead Author: Pimchaya Suprateravarnit | Peer Reviewer: Suphattra Kongsiriphat (PR #4)', content: srsMd },
    { title: 'Part B: Feature Inventory and Traceability Matrix', author: 'Lead Author: Pimchaya Suprateravarnit | Peer Reviewer: Suphattra Kongsiriphat (PR #14)', content: `${featuresMd}\n\n${traceabilityMd}` },
    { title: 'Part C: System-Level Software Design Specification (System SDS)', author: 'Lead Author: Suphattra Kongsiriphat | Peer Reviewer: Pimchaya Suprateravarnit (PR #16)', content: systemSdsMd },
    { title: 'Part D: Three-Sprint Development Plan', author: 'Lead Author: Pimchaya Suprateravarnit | Peer Reviewer: Suphattra Kongsiriphat (PR #14)', content: planMd },
    { title: 'Part E: Sprint 1 Feature Engineering Contracts', author: 'Lead Author: Pimchaya Suprateravarnit | Peer Reviewer: Suphattra Kongsiriphat (PRs #6, #8, #10, #12)', content: `## Contract F-01: User Authentication & Session Lifecycle\n\n${f01Md}\n\n## Contract F-02: Event Creation, Publication, and Capacity Management\n\n${f02Md}\n\n## Contract F-03: Participant Registration & Concurrency Protection\n\n${f03Md}\n\n## Contract F-04: Organizer Roster & Health Probes\n\n${f04Md}` },
    { title: 'Part F: Working Sprint 1 Verification and Execution Evidence', author: 'Lead Author: Suphattra Kongsiriphat | Peer Reviewer: Pimchaya Suprateravarnit (PRs #17, #18)', content: partFMd },
  ];

  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx];
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 60 },
        children: [new TextRun({ text: part.title, bold: true, size: 30, color: '0F172A' })],
      }),
      new Paragraph({
        spacing: { after: 140 },
        children: [new TextRun({ text: part.author, italics: true, size: 20, color: '64748B' })],
      })
    );

    const partElements = markdownToDocxElements(part.content);
    children.push(...partElements);

    if (idx < parts.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
            color: '1E293B',
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
        children: children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(repoRoot, 'docs/deliverable_1_submission.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Successfully written Deliverable 1 DOCX:', outPath, `(${buffer.length} bytes)`);
}

async function generateLab5Docx() {
  console.log('Generating Lab 5 DOCX...');
  const reportMd = readDoc('docs/labs/lab-05/report.md');
  const c02ImagePath = path.join(repoRoot, 'docs/labs/lab-05/screenshots/c02_failing_check.png');

  const children = [];

  // Title Banner
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({
          text: 'KMUTT — Department of Computer Engineering',
          bold: true,
          size: 26,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'CPE 334 Introduction to Software Engineering in the Age of AI Agents',
          size: 22,
          color: '475569',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Lab 5: Cloud Deployment and CI/CD Pipeline on Google Cloud Platform',
          bold: true,
          size: 30,
          color: '0F172A',
        }),
      ],
    })
  );

  // Convert report markdown
  const elements = markdownToDocxElements(reportMd);

  // If C-02 screenshot exists, embed it as ImageRun
  let imageInserted = false;
  if (fs.existsSync(c02ImagePath)) {
    const imgBuffer = fs.readFileSync(c02ImagePath);
    const imgParagraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 60 },
      children: [
        new ImageRun({
          data: imgBuffer,
          transformation: {
            width: 580,
            height: 250,
          },
        }),
      ],
    });
    const captionParagraph = new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: 'Figure 1. Check C-02 (R-06): Pull Request #19 from temporary branch test/c02-failing-check into main. The required status check test-and-docker failed on commit 5c18228, showing a red quality gate status (Checks 1 failing) and blocking the merge to protect the release baseline.',
          italics: true,
          size: 18,
          color: '475569',
        }),
      ],
    });

    // Insert image where Figure 1 caption appears or under Check C-02
    for (let j = 0; j < elements.length; j++) {
      const el = elements[j];
      // Insert right after Check C-02 section
      if (el.root && JSON.stringify(el.root).includes('Controlled Failing Check Demonstration')) {
        elements.splice(j + 3, 0, imgParagraph, captionParagraph);
        imageInserted = true;
        break;
      }
    }
    if (!imageInserted) {
      elements.push(imgParagraph, captionParagraph);
    }
  }

  children.push(...elements);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
            color: '1E293B',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
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
                    text: 'CPE 334 Lab 5 Submission Report | Theme 3: Event Registration',
                    size: 16,
                    color: '94A3B8',
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
                  new TextRun({ text: 'Page ', size: 18, color: '64748B' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '64748B' }),
                  new TextRun({ text: ' of ', size: 18, color: '64748B' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '64748B' }),
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
  const outPath = path.join(repoRoot, 'docs/labs/lab-05/lab5_submission.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Successfully written Lab 5 DOCX:', outPath, `(${buffer.length} bytes)`);
}

async function main() {
  await generateDeliverable1Docx();
  await generateLab5Docx();
}

main().catch(console.error);
