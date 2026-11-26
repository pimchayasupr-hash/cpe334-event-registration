import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(process.cwd());
const lab6Dir = path.join(repoRoot, 'docs/labs/lab06');
const screenshotsDir = path.join(lab6Dir, 'screenshots');

// --- Minimal zero-dependency YAML parser for uat-results.yaml ---
function parseScalar(raw) {
  const s = raw.trim();
  if (s === '' || s === '""' || s === "''") return '';
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === '[]') return [];
  if (s === '{}') return {};
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function parseYaml(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const root = {};
  const stack = [{ indent: -1, container: root }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].container;

    if (trimmed.startsWith('- ')) {
      const rest = trimmed.slice(2).trim();
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        const obj = {};
        const key = rest.slice(0, colonIdx).trim();
        const val = rest.slice(colonIdx + 1).trim();
        obj[key] = parseScalar(val);
        parent.push(obj);
        stack.push({ indent: indent + 1, container: obj });
      } else {
        parent.push(parseScalar(rest));
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();

    if (val === '') {
      // Peek next non-empty line to decide array vs object
      let nextTrimmed = '';
      for (let j = i + 1; j < lines.length; j++) {
        const t = lines[j].trim();
        if (t && !t.startsWith('#')) { nextTrimmed = t; break; }
      }
      const nextContainer = nextTrimmed.startsWith('- ') ? [] : {};
      parent[key] = nextContainer;
      stack.push({ indent, container: nextContainer });
    } else {
      parent[key] = parseScalar(val);
    }
  }
  return root;
}

// --- Image helpers (reads ONLY from docs/labs/lab06/screenshots/) ---
function getImageWidth(buf, ext) {
  if (ext === '.png' && buf.length >= 24) {
    return buf.readUInt32BE(16);
  }
  if ((ext === '.jpg' || ext === '.jpeg') && buf.length >= 4) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] === 0xff && (buf[i + 1] === 0xc0 || buf[i + 1] === 0xc2)) {
        return buf.readUInt16BE(i + 7);
      }
      if (buf[i] === 0xff && buf[i + 1] !== 0xff) {
        const len = buf.readUInt16BE(i + 2);
        i += 2 + len;
      } else {
        i++;
      }
    }
  }
  return null;
}

function loadScreenshot(filename, warnings) {
  if (!filename) return null;
  const safeName = path.basename(filename);
  const fullPath = path.join(screenshotsDir, safeName);
  if (!fs.existsSync(fullPath)) {
    warnings.push(`Screenshot not found in docs/labs/lab06/screenshots/: ${safeName}`);
    return null;
  }
  const ext = path.extname(safeName).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const buf = fs.readFileSync(fullPath);
  const width = getImageWidth(buf, ext);
  if (width && width > 1400) {
    warnings.push(`Screenshot ${safeName} is ${width}px wide (>1400px); crop to the relevant area so text is readable at 100% zoom.`);
  }
  return { dataUri: `data:${mime};base64,${buf.toString('base64')}`, width, safeName };
}

function readDoc(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

function valOrWait(v, label = '[รอผู้ใช้กรอก]') {
  if (v === undefined || v === null || String(v).trim() === '') return label;
  return String(v).trim();
}

function extractAcSection(relPath, heading) {
  const text = readDoc(relPath).replace(/\r\n/g, '\n');
  const m = text.match(/## 3\. Acceptance Criteria[\s\S]*?(?=\n## 4\.)/);
  if (!m) return `### ${heading}\n*(Contract section not found)*`;
  return `### ${heading}\n\n${m[0].trim()}`;
}

// --- Build Markdown report from uat-results.yaml ---
function buildReportMarkdown(data, pageMap, warnings, missingList) {
  const reqField = (val, who, desc, fallback = '[รอผู้ใช้กรอก]') => {
    const s = val !== undefined && val !== null ? String(val).trim() : '';
    if (!s) {
      missingList.push({ who, desc });
      return fallback;
    }
    return s;
  };

  const pimId = reqField(data.team?.pimchaya_student_id, 'ผู้ใช้', 'รหัสนักศึกษา Pimchaya');
  const supId = reqField(data.team?.suphattra_student_id, 'ผู้ใช้', 'รหัสนักศึกษา Suphattra');
  const partnerMembers = reqField(data.partner?.members, 'ผู้ใช้', 'ชื่อสมาชิกทีมคู่ (พวกพี่ชอบบิด Team 2)', '[รอผู้ใช้กรอก: ชื่อสมาชิกทีมคู่]');
  const handoffDate = reqField(data.partner?.handoff_date, 'ผู้ใช้', 'วันที่เอกสารส่งมอบของทีมคู่');
  const actualPartnerVer = reqField(data.partner?.actual_tested_version, 'ผู้ใช้', 'เวอร์ชันของแอปทีมคู่ที่ตรวจจริงตอนทดสอบ');

  const partnerDecision = reqField(data.decisions?.partner_on_ours?.decision, 'ทีมคู่', 'ผลตัดสิน UAT สุดท้ายต่อระบบของเรา', '[รอทีมคู่]');
  const partnerTesters = reqField(data.decisions?.partner_on_ours?.tester_names, 'ทีมคู่', 'ชื่อผู้ทดสอบอิสระของทีมคู่', '[รอทีมคู่]');
  const partnerRelease = reqField(data.decisions?.partner_on_ours?.tested_release, 'ทีมคู่', 'เวอร์ชันที่ทีมคู่ทดสอบจริง', '[รอทีมคู่]');
  const partnerDate = reqField(data.decisions?.partner_on_ours?.date_ict, 'ทีมคู่', 'วันเวลาที่ทีมคู่ตัดสินผล', '[รอทีมคู่]');
  const partnerConds = valOrWait(data.decisions?.partner_on_ours?.conditions, '[รอทีมคู่]');

  const ourDecision = reqField(data.decisions?.ours_on_partner?.decision, 'ผู้ใช้', 'ผลตัดสิน UAT ของเราต่อระบบทีมคู่', '[รอผู้ใช้กรอกตามหลักฐานจริง]');
  const ourTesters = reqField(data.decisions?.ours_on_partner?.tester_names, 'ผู้ใช้', 'ชื่อผู้ทดสอบในทีมเรา (Part B/D)', '[รอผู้ใช้กรอกตามหลักฐานจริง]');
  const ourRelease = reqField(data.decisions?.ours_on_partner?.tested_release, 'ผู้ใช้', 'เวอร์ชันแอปทีมคู่ที่เราทดสอบจริง', '[รอผู้ใช้กรอกตามหลักฐานจริง]');
  const ourDate = reqField(data.decisions?.ours_on_partner?.date_ict, 'ผู้ใช้', 'วันเวลาที่เราตัดสินผล', '[รอผู้ใช้กรอกตามหลักฐานจริง]');
  const ourReasons = valOrWait(data.decisions?.ours_on_partner?.reasons, '[รอผู้ใช้กรอกตามหลักฐานจริง]');

  // Validation rule: refuse Accepted without tester name + date
  if (/^accepted/i.test(String(data.decisions?.partner_on_ours?.decision || '').trim())) {
    if (!String(data.decisions?.partner_on_ours?.tester_names || '').trim() || !String(data.decisions?.partner_on_ours?.date_ict || '').trim()) {
      warnings.push('BLOCKED: Partner decision is Accepted but tester_names or date_ict is missing.');
    }
  }
  if (/^accepted/i.test(String(data.decisions?.ours_on_partner?.decision || '').trim())) {
    if (!String(data.decisions?.ours_on_partner?.tester_names || '').trim() || !String(data.decisions?.ours_on_partner?.date_ict || '').trim()) {
      warnings.push('BLOCKED: Our decision on partner app is Accepted but tester_names or date_ict is missing.');
    }
  }

  const aiTools = reqField(data.ai_use?.tools_and_tasks, 'ผู้ใช้', 'รายการเครื่องมือ AI ที่ใช้จริงและงานที่แต่ละตัวทำ', '[ผู้ใช้ยืนยันเครื่องมือ AI ทั้งหมดที่ใช้จริงและงานที่แต่ละตัวทำ]');
  const aiVerifiedBy = reqField(data.ai_use?.verified_by, 'ผู้ใช้', 'ผู้ตรวจสอบผลจาก AI', '[รอผู้ใช้ระบุผู้ตรวจ]');
  const lab5ImgStatus = reqField(data.lab5_screenshot_status, 'ผู้ใช้', 'สถานะการแก้/แจ้ง TA เรื่องภาพ Lab 5 Figure 11–17', '[สถานะการแก้/แจ้ง TA Lab 5: รอผู้ใช้กรอก]');

  // Part B per-case blocks (1b & 1c)
  const cases = Array.isArray(data.part_b_cases) ? data.part_b_cases : [];
  const partBBlocks = cases.map((c) => {
    const cid = c.id || 'UAT-XX';
    const evId = c.evidence_id || `EXEC-${cid}`;
    const tester = reqField(c.tester, 'ผู้ใช้', `Part B ${cid} ผู้ทดสอบ`);
    const dt = reqField(c.datetime_ict, 'ผู้ใช้', `Part B ${cid} วันเวลา (ICT)`);
    const ver = reqField(c.tested_version, 'ผู้ใช้', `Part B ${cid} เวอร์ชัน/URL/revision`);
    const inputs = reqField(c.inputs_used, 'ผู้ใช้', `Part B ${cid} อินพุตที่ใช้`);
    const steps = reqField(c.steps_executed, 'ผู้ใช้', `Part B ${cid} ขั้นตอนที่ทำจริง`);
    const actual = reqField(c.actual_result, 'ผู้ใช้', `Part B ${cid} ผลจริง`, '[รอผู้ใช้กรอกจากผลทดสอบจริง]');
    const status = reqField(c.status, 'ผู้ใช้', `Part B ${cid} สถานะ PASS/FAIL/BLOCKED`);
    const reason = c.status_reason ? ` — ${c.status_reason}` : (status.toUpperCase() === 'BLOCKED' ? ' — [รอผู้ใช้กรอกเหตุผลของ BLOCKED]' : '');

    let protectedRow = '';
    if (c.is_rejected_case) {
      const pCheck = reqField(c.protected_state_check, 'ผู้ใช้', `Part B ${cid} ผลตรวจข้อมูลที่ป้องกันไม่ถูกเปลี่ยนหรือเปิดเผย`);
      protectedRow = `| **ผลตรวจว่าข้อมูลที่ป้องกันไม่ถูกเปลี่ยนหรือเปิดเผย** | ${pCheck} |\n`;
    }

    let imgSection = '';
    if (c.screenshot_file) {
      const loaded = loadScreenshot(c.screenshot_file, warnings);
      const capFields = [c.caption_action, c.caption_expected_actual, c.caption_time, c.caption_version];
      if (capFields.some((f) => !String(f || '').trim())) {
        warnings.push(`Caption for ${evId} (${c.screenshot_file}) is missing one of: action, expected/actual, time, version.`);
      }
      const caption = `${evId} (${cid}): Action: ${valOrWait(c.caption_action)} | Expected/Actual: ${valOrWait(c.caption_expected_actual)} | Time: ${valOrWait(c.caption_time)} | Version: ${valOrWait(c.caption_version)}`;
      if (loaded) {
        imgSection = `\n<div class="figure-container"><img src="${loaded.dataUri}" alt="${evId}"/><div class="caption">${caption}</div></div>\n`;
      } else {
        imgSection = `\n> **[รอภาพจริงจากผู้ใช้: ${evId}]** *(file missing: ${c.screenshot_file})*\n`;
      }
    } else if (c.requires_screenshot) {
      missingList.push({ who: 'ผู้ใช้', desc: `Part B ${cid} ภาพหน้าจอจริง (${evId})` });
      imgSection = `\n> **[รอภาพจริงจากผู้ใช้: ${evId}]** — ใส่ไฟล์ภาพจริงใน \`docs/labs/lab06/screenshots/\` พร้อม caption (Evidence ID, action, ผลที่คาดหวัง/ผลจริง, เวลา, เวอร์ชัน)\n`;
    } else {
      imgSection = `\n> **ข้อสังเกต/ภาพ (${evId}):** ${c.actual_result ? 'บันทึกในช่องผลจริงด้านบน (เพิ่มไฟล์ภาพใน `docs/labs/lab06/screenshots/` ได้หากมี)' : `[รอภาพจริงหรือข้อสังเกตจากผู้ใช้: ${evId}]`}\n`;
    }

    return `### ${cid} — ${c.title || ''} *(ทดสอบด้วยมือ / manual)*

| Field | Value |
| :--- | :--- |
| **Case ID / Evidence ID** | \`${cid}\` / \`${evId}\` — **ทดสอบด้วยมือ (manual)** |
| **ผู้ทดสอบ** | ${tester} |
| **วันเวลา (ICT)** | ${dt} |
| **เวอร์ชัน / URL / Revision ที่ทดสอบ** | ${ver} |
| **อินพุตที่ใช้จริง** | ${inputs} |
| **ขั้นตอนที่ทำจริง** | ${steps} |
| **ผลจริง (ข้อสังเกตที่อ่านได้)** | ${actual} |
${protectedRow}| **สถานะ (PASS / FAIL / BLOCKED) & เหตุผล** | ${status}${reason} |
${imgSection}`;
  }).join('\n');

  // Part C outgoing & incoming
  let outgoingSection = '';
  if (data.part_c_outgoing_defects_none === true) {
    outgoingSection = 'ไม่มี (None — ไม่พบ defect ในระบบของทีมคู่จากการทดสอบ Part B)';
  } else if (Array.isArray(data.part_c_outgoing_defects) && data.part_c_outgoing_defects.length > 0) {
    outgoingSection = data.part_c_outgoing_defects.map((d) =>
      `- **${valOrWait(d.issue_id)}** (${valOrWait(d.severity)}): Case \`${valOrWait(d.linked_case)}\`, Version \`${valOrWait(d.tested_version)}\` — Expected: ${valOrWait(d.expected)} | Actual: ${valOrWait(d.actual)} | Impact: ${valOrWait(d.user_impact)} | Evidence: \`${valOrWait(d.evidence_id)}\``
    ).join('\n');
  } else {
    missingList.push({ who: 'ผู้ใช้', desc: 'Part C.1 รายงาน defect ที่ส่งให้ทีมคู่ (หรือตั้ง part_c_outgoing_defects_none: true)' });
    outgoingSection = '`[รอผู้ใช้กรอกจากผลทดสอบจริง — หากไม่พบ defect ให้ตั้ง part_c_outgoing_defects_none: true]`';
  }

  let incomingSection = '';
  if (data.part_c_incoming_findings_none === true) {
    incomingSection = '| ไม่มี (None) | — | — | — | — | — | — | — | — |';
  } else if (Array.isArray(data.part_c_incoming_findings) && data.part_c_incoming_findings.length > 0) {
    incomingSection = data.part_c_incoming_findings.map((f) =>
      `| ${valOrWait(f.issue_id)} | ${valOrWait(f.reporter)} | ${valOrWait(f.summary)} | ${valOrWait(f.classification)} | ${valOrWait(f.contract_reason)} | ${valOrWait(f.duplicate_of, '—')} | ${valOrWait(f.severity)} | ${valOrWait(f.owner)} | ${valOrWait(f.disposition)} |`
    ).join('\n');
  } else {
    missingList.push({ who: 'ทีมคู่ / ผู้ใช้', desc: 'Part C.2 ตาราง finding ที่ทีมคู่ส่งเกี่ยวกับระบบเรา' });
    incomingSection = '| `[รอผลทดสอบจากทีมคู่]` | — | — | — | — | — | — | — | — |';
  }

  // Part D resolutions / controlled exercise
  let partDChain = '';
  if (Array.isArray(data.part_d_resolutions) && data.part_d_resolutions.length > 0) {
    partDChain = data.part_d_resolutions.map((r) =>
      `- **${valOrWait(r.issue_id)}** (branch \`${valOrWait(r.fix_branch)}\`): RED \`${valOrWait(r.red_commit)}\` (${valOrWait(r.red_test)}) → GREEN \`${valOrWait(r.green_commit)}\` → PR ${valOrWait(r.pr_link)} → Release \`${valOrWait(r.release_commit)}\` / Revision \`${valOrWait(r.deployed_revision)}\` → Retest: ${valOrWait(r.retest_result)}`
    ).join('\n');
  } else if (data.part_c_incoming_findings_none === true) {
    const ce = data.part_d_controlled_exercise || {};
    const taDate = reqField(ce.ta_notification_date, 'ผู้ใช้', 'Part D วันที่ขอ Controlled Defect Exercise จาก TA', '[รอผู้ใช้กรอก]');
    const taMsg = reqField(ce.message_summary, 'ผู้ใช้', 'Part D ข้อความขอ Controlled Exercise จาก TA', '[รอผู้ใช้กรอก]');
    const taResp = reqField(ce.ta_response, 'TA / ผู้ใช้', 'Part D คำตอบจาก TA', '[รอคำตอบ TA]');
    partDChain = `- ไม่พบ accepted defect จริงใน release \`e6aad26\` — ดำเนินการขอ Controlled Defect Exercise บน branch แยกตาม Section 3.5:\n  - วันที่แจ้ง TA: ${taDate}\n  - ข้อความ: ${taMsg}\n  - คำตอบ TA / Branch แยก: ${taResp} / \`${valOrWait(ce.isolated_branch)}\``;
  } else {
    missingList.push({ who: 'ผู้ใช้ / ทีมคู่', desc: 'Part D สายโซ่การแก้ defect (RED/GREEN) หรือ Controlled Exercise จาก TA' });
    partDChain = '- `[รอผลจาก Part C — หากมี accepted defect ให้กรอก part_d_resolutions; หากไม่มีให้ขอ Controlled Defect Exercise จาก TA บน branch แยก]`';
  }

  // Automatic status banner (1h)
  const isReady = missingList.length === 0 && warnings.filter((w) => w.startsWith('BLOCKED:')).length === 0;
  const statusBanner = isReady
    ? ''
    : `> **Status: Draft — ยังไม่พร้อมส่ง** (เหลือช่องรอข้อมูล **${missingList.length}** ช่อง${warnings.length ? ` และคำเตือน ${warnings.length} รายการ` : ''}; แถบนี้จะถูกลบอัตโนมัติเมื่อกรอกข้อมูลจริงครบและผ่านการตรวจสอบ)\n\n`;

  const p = (key) => (pageMap[key] ? `p. ${pageMap[key]}` : 'p. ?');

  return `# Lab 6 Submission Report — Independent User Acceptance Testing & Defect Management

${statusBanner}## Team, Scope & Release Overview

- **Course / Lab:** CPE 334 Software Engineering — Lab 6 (Independent UAT & Defect Management)
- **Product Team:** ยอดนักบิด (\`sec131\`)
  - Pimchaya Suprateravarnit — Student ID: \`${pimId}\` — GitHub: \`@pimchayasupr-hash\`
  - Suphattra Kongsiriphat — Student ID: \`${supId}\` — GitHub: \`@supa-gif173\`
- **Project Theme:** Event Registration and Attendance System (KMUTT Faculty Workshops & Seminars)
- **Sprint 1 Accepted-for-Test Scope:** \`F-01\` (Authentication & Session), \`F-02\` (Event Creation, Publication & Capacity), \`F-03\` (Participant Registration & Concurrency), \`F-04\` (Organizer Roster & Health/Ready). Sprint 2 (\`F-05..F-07\`) and Sprint 3 (\`F-08..F-09\`) are out of scope.
- **Repository:** [https://github.com/pimchayasupr-hash/cpe334-event-registration](https://github.com/pimchayasupr-hash/cpe334-event-registration)
- **Tested Release Commit (\`main\`):** \`e6aad269e7b0f459126004e076f4fc432d1abdd0\` (\`e6aad26\`, merged [PR #40](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/40)) — differs from tag \`v1.0.0-sprint1\` (\`2d36196\`) because Lab 5 CI/deploy/seed security fixes (#32, #37, #39) were merged before live deployment.
- **Deployed Public URL & Version:** \`https://sdb3eb069-4d7hbszvwq-as.a.run.app\` — Cloud Run Service \`sdb3eb069\`, Revision \`sdb3eb069-00002-mct\` (\`Deploy demo\` run [\`45018492877\`](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/45018492877))
- **Partner Team (UAT Team / Product Team We Test):** ${data.partner?.team_name || 'พวกพี่ชอบบิด (Team 2)'} — Inventory and Borrowing System — Members: ${partnerMembers}
  - **ข้อมูลจากเอกสารส่งมอบของทีมคู่ ณ วันที่ ${handoffDate}:** URL \`${data.partner?.handoff_url || ''}\`, Commit \`${data.partner?.handoff_commit || ''}\`, Revision \`${data.partner?.handoff_revision || ''}\`
  - **เวอร์ชันที่ตรวจจริงตอนทดสอบ:** ${actualPartnerVer}
- **Final Sprint 1 UAT Decision (Our Product — by UAT Team Only):** ${partnerDecision} (Independent Testers: ${partnerTesters})

### Contents Table (Auto-Generated Page Numbers)

| Section | Title | Page | Evidence IDs |
| :--- | :--- | :--- | :--- |
| **Part A** | UAT Preparation & Safe Handoff (\`F-01\`–\`F-04\`, 6 cases) | ${p('Part A')} | \`UAT-01\` – \`UAT-06\` |
| **Part B** | Independent Execution (Testing Partner's App — Manual) | ${p('Part B')} | \`EXEC-01\` – \`EXEC-06\` |
| **Part C** | Defect Reporting (Outgoing) & Findings Triage (Incoming) | ${p('Part C')} | \`DEF-OUT-*\`, \`DEF-IN-*\` |
| **Part D** | Defect Resolution (RED/GREEN), Retest & Final Acceptance | ${p('Part D')} | \`FIX-*\`, \`RETEST-*\` |
| **Version** | Version Traceability Table | ${p('Version')} | — |
| **Contrib** | Team Contribution Table (GitHub History) | ${p('Contrib')} | — |
| **AI-Use** | AI-Use Declaration | ${p('AI-Use')} | — |
| **Limits** | Known Limitations | ${p('Limits')} | — |
| **Appendix A** | Sprint 1 Contract Acceptance Criteria (Verbatim) | ${p('Appendix A')} | \`AC-F01-*\` – \`AC-F04-*\` |
| **Appendix B** | Complete Sprint 1 UAT Plan (\`uat-plan.md\`) | ${p('Appendix B')} | \`UAT-01\` – \`UAT-06\` |
| **Appendix C** | Baseline Automated Test & Release Evidence (\`45018492877\`) | ${p('Appendix C')} | \`RUN-45018492877\` |

---

## Part A — UAT Preparation and Handoff

### A.1 Scope, Safe Account Labels & Setup/Reset Rules
- **Accepted-for-Test Scope:** Sprint 1 (\`F-01\`–\`F-04\`) only; Sprint 2 (\`F-05\`–\`F-07\`) and Sprint 3 (\`F-08\`–\`F-09\`) are out of scope.
- **Account Labels & Roles (No Secrets in Repo/PDF):** \`ORG-A\` (\`ORGANIZER\`, \`organizer@kmutt.ac.th\`), \`PART-1\` (\`PARTICIPANT\`, \`participant@kmutt.ac.th\`) — credentials delivered privately via course handoff.
- **Setup, Sequence & Seed Behavior:** Verify \`GET /api/health\` and \`/api/ready\` return \`200 OK\`. Run \`UAT-06\` → \`UAT-01\` → \`UAT-02\` → \`UAT-03\` → \`UAT-04\` → \`UAT-05\` using unique synthetic titles. \`server/prisma/seed.ts\` uses \`prisma.user.upsert\` (\`update: { passwordHash }\`), overwriting seeded passwords on every \`sdb3eb069-migrate\` execution; **do not rotate secrets during partner UAT without prior notice**.

### A.2 Executable UAT Case Summary (Full Steps in Appendix B)

| Case ID | Category | Contract / AC Reference | Objective |
| :--- | :--- | :--- | :--- |
| \`UAT-01\` | Normal Domain Journey | \`AC-F02-01\`, \`AC-F02-03\`, \`AC-F03-01\`, \`AC-F03-06\`, \`AC-F04-01\` | Organizer creates & publishes event → Participant registers → Roster shows participant |
| \`UAT-02\` | Business Rule / Boundary | \`AC-F03-02\`, \`AC-F03-03\`, \`AC-F02-06\` | Full capacity \`409\`, duplicate registration \`409\`, capacity floor \`409\` |
| \`UAT-03\` | Business Rule / Boundary | \`AC-F02-04\`, \`AC-F02-05\`, \`AC-F03-05\` | Past \`startAt\` publish rejected (\`400\`); \`DRAFT\` hidden from participants |
| \`UAT-04\` | Forbidden Role / Ownership | \`AC-F01-01\`, \`AC-F02-07\`, \`AC-F02-08\`, \`AC-F03-07\`, \`AC-F04-03\`, \`AC-F04-04\` | Role separation (\`403\`), cross-organizer blocked (\`403\`), \`passwordHash\` omitted |
| \`UAT-05\` | State / Session / Persistence | \`AC-F01-03\`, \`AC-F01-05\`, \`AC-F03-01\` | Logout invalidates session (\`401\`); data persists across Cloud Run restart/redeploy |
| \`UAT-06\` | Operational Readiness | \`AC-F04-05\` | \`GET /api/health\` and \`GET /api/ready\` return \`200 OK\` |

---

## Part B — Independent Execution (We Test Partner Team's System)

- **UAT Team:** ยอดนักบิด (\`sec131\`) — \`@pimchayasupr-hash\`, \`@supa-gif173\` (**ทดสอบด้วยมือ / manual**)
- **Partner System:** ${data.partner?.team_name || 'พวกพี่ชอบบิด (Team 2)'} — \`${data.partner?.handoff_url || ''}\`
- **Partner Account Labels Used (No Passwords):** \`ACC-B1\` (Borrower 1), \`ACC-C1\` (Custodian), \`ACC-B2\` (Borrower 2)
- **ข้อมูลจากเอกสารส่งมอบของทีมคู่ ณ วันที่ ${handoffDate}:** Commit \`${data.partner?.handoff_commit || ''}\`, Revision \`${data.partner?.handoff_revision || ''}\`
- **เวอร์ชันที่ตรวจจริงตอนทดสอบ:** ${actualPartnerVer}

${partBBlocks}

---

## Part C — Defect Reporting and Triage

### C.1 Outgoing Defect Reports (Sent by Our Team to Partner Team)
${outgoingSection}

### C.2 Incoming Findings Triage Table (Received from Partner Team on Our Product)

| Finding / Issue ID | Reporter | Summary | Classification | Sprint 1 Contract Reason | Duplicate Of | Severity | Owner | Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${incomingSection}

---

## Part D — Resolution and Independent Retest

### D.1 Accepted Defect Resolution Chain (or Controlled Defect Exercise)
${partDChain}

### D.2 Independent UAT Final Acceptance Decisions

**1. Partner UAT Team's Final Decision on Our Product (\`ยอดนักบิด sec131\`):**
- **Independent Tester Name(s):** ${partnerTesters}
- **Exact Tested Release (Commit / GCP Revision / URL):** ${partnerRelease}
- **Date & Time (ICT):** ${partnerDate}
- **Decision:** **${partnerDecision}** *(Accepted / Accepted with minor limitations / Not Accepted — recorded by UAT Team only)*
- **Conditions / Minor Limitations:** ${partnerConds}

**2. Our Team's Final Decision on Partner Team's Product (\`พวกพี่ชอบบิด Team 2\`):**
- **Testers:** ${ourTesters}
- **Exact Tested Release (Commit / Revision / URL):** ${ourRelease}
- **Date & Time (ICT):** ${ourDate}
- **Decision:** **${ourDecision}**
- **Reasons / Conditions:** ${ourReasons}

---

## Version Traceability

| Stage | Commit / Tag | GCP Revision | Explanation |
| :--- | :--- | :--- | :--- |
| Sprint 1 CI-tested \`staging\` | \`e2846b8\` | — | CI run \`43210196284\` (\`pull_request\`) |
| Release PR #18 merge (\`main\`) | \`10834da\` | — | Merged by \`@pimchayasupr-hash\` |
| Tag \`v1.0.0-sprint1\` | \`2d36196\` | — | Diff vs \`10834da\`: \`docs/deliverable-1-report.md\` only |
| Pre-activation \`main\` head | \`12d04b9\` | — | 7 direct-push doc/script commits (\`2d36196..12d04b9\`) |
| Release PR #38 merge (\`main\`) | \`8f082c9\` | — | \`Deploy demo\` run \`44986537160\` failed at \`sdb3eb069-migrate\` |
| Release PR #40 merge (\`main\`) | \`e6aad26\` | \`sdb3eb069-00002-mct\` | \`Deploy demo\` run [\`45018492877\`](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/45018492877) (attempt 2) succeeded; baseline for Lab 6 UAT |

## Team Contribution Table

| Member | Authored PRs / Issues | Reviewed / Approved | Merged |
| :--- | :--- | :--- | :--- |
| **Pimchaya Suprateravarnit** (\`@pimchayasupr-hash\`) | PRs #2–#14, #24–#26, #32–#34, #36, #37, #40; Issues #20–#23, #27–#31, #35 | Approved PRs #16, #17, #18, #38, #39 | Merged PRs #2–#14, #18, #25, #38, #39 |
| **Suphattra Kongsiriphat** (\`@supa-gif173\`) | PRs #16–#19, #38, #39; 7 direct commits (\`2d36196..12d04b9\`); co-named on Issues #20–#23, #27–#31 | Approved PRs #2–#14, #24 (sync), #25, #26, #32, #34, #36, #37, #40 | Merged PRs #16, #17, #24, #26, #32, #36, #37, #40 |

## AI-Use Declaration

- **Verifiable Repository Assistance:** Google Antigravity assisted with structuring \`docs/labs/lab06/uat-plan.md\`, \`uat-templates.md\`, \`uat-results.yaml\`, \`report.md\`, and \`scripts/bundle_lab6.js\`.
- **User Confirmation of All AI Tools & Tasks:** ${aiTools}
- **Reviewed & Verified By:** ${aiVerifiedBy}

## Known Limitations

1. **Single Seeded Account per Role (\`ORG-A\`, \`PART-1\`):** \`server/prisma/seed.ts\` creates only 1 Organizer (\`ORG-A\`) and 1 Participant (\`PART-1\`), and Sprint 1 has no self-registration endpoint. Therefore:
   - Cross-organizer ownership checks (\`AC-F02-08\`, \`AC-F04-03\` in \`UAT-04\` step 5) are **N/A** on the live deployment unless \`ORG-B\` is provisioned (covered by automated integration tests \`TEST-F02-07\` and \`TEST-F04-02\`).
   - Second-participant full-capacity check (\`AC-F03-03\` in \`UAT-02\` step 4) uses the **fallback** (\`capacity=1\` filled by \`PART-1\` + duplicate \`409\` + capacity-floor \`409\` by \`ORG-A\`) unless \`PART-2\` is provisioned (covered by automated tests \`TEST-F03-03\` and \`TEST-F03-04\`).
2. **Direct Pushes & Tag Alignment (Sprint 1):** 7 commits (\`2d36196..12d04b9\`) were pushed directly to \`main\` before ruleset \`protect-main-staging\` (\`27641965\`) existed, and \`v1.0.0-sprint1\` points to \`2d36196\` rather than PR #18 (\`10834da\`).
3. **Lab 5 Draft Screenshot Audit Finding:** Figures 11–17 in an earlier Lab 5 draft contained status banners absent from deployed \`client/src\` (\`e6aad26\`); they are excluded from Lab 6 (${lab5ImgStatus}).
4. **Demo Credential Remediation:** Hardcoded demo credentials from Sprint 1 were removed in PR #32 and deployed in PR #40 (\`e6aad26\`).
`;
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

function wrapHtml(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CPE 334 - Lab 6 Submission Report</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 18mm 14mm;
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
      font-size: 8.8pt;
      line-height: 1.48;
      color: #1e293b;
      margin: 0;
      padding: 16px;
    }
    .header-banner { border-left: 6px solid #FA4616; padding-left: 14px; margin-bottom: 16px; }
    .header-banner h1 { font-size: 15pt; margin: 0 0 4px 0; color: #0f172a; }
    .header-banner p { font-size: 9pt; color: #64748b; margin: 0; }
    h1 { font-size: 13.5pt; color: #0f172a; }
    h2 { font-size: 11.5pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-top: 16px; page-break-after: avoid; }
    h3 { font-size: 10pt; color: #1e293b; margin-top: 12px; page-break-after: avoid; }
    a { color: #2563eb; text-decoration: none; }
    code.inline-code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 8.2pt; }
    pre.code-block { background: #0f172a; color: #f8fafc; padding: 8px 10px; border-radius: 6px; font-size: 7.8pt; white-space: pre-wrap; }
    blockquote { border-left: 3px solid #94a3b8; margin: 8px 0; padding: 6px 12px; color: #334155; background: #f8fafc; }
    .table-container { margin: 8px 0 14px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 7px; text-align: left; vertical-align: top; overflow-wrap: break-word; }
    th { background: #f1f5f9; font-weight: 600; }
    tr { page-break-inside: avoid; }
    .figure-container { margin: 10px 0; text-align: center; page-break-inside: avoid; }
    .figure-container img { max-width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; }
    .caption { font-size: 8pt; color: #475569; margin-top: 4px; font-style: italic; text-align: left; }
  </style>
</head>
<body>
  <div class="header-banner">
    <h1>CPE 334 Introduction to Software Engineering in the Age of AI Agents</h1>
    <p>Lab 6: Independent User Acceptance Testing and Defect Management</p>
  </div>
  ${bodyHtml}
</body>
</html>`;
}

function findChrome() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'google-chrome',
    'chromium',
  ];
  for (const c of candidates) {
    if (c.startsWith('/') && fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function renderPdf(htmlPath, pdfPath) {
  const chrome = findChrome();
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`,
  ], { stdio: 'ignore' });
}

function detectPageNumbers(pdfPath) {
  const txt = execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' });
  const pages = txt.split('\f');
  const markers = {
    'Part A': /Part A — UAT Preparation and Handoff/,
    'Part B': /Part B — Independent Execution/,
    'Part C': /Part C — Defect Reporting and Triage/,
    'Part D': /Part D — Resolution and Independent Retest/,
    'Version': /^\s*Version Traceability\s*$/m,
    'Contrib': /^\s*Team Contribution Table\s*$/m,
    'AI-Use': /^\s*AI-Use Declaration\s*$/m,
    'Limits': /^\s*Known Limitations\s*$/m,
    'Appendix A': /Appendix A — Sprint 1 Contract Acceptance Criteria/,
    'Appendix B': /Appendix B — Complete Sprint 1 UAT Plan/,
    'Appendix C': /Appendix C — Baseline Test & Release Evidence/,
  };
  const found = {};
  for (let i = 1; i < pages.length; i++) {
    for (const [k, rx] of Object.entries(markers)) {
      if (!found[k] && rx.test(pages[i])) {
        found[k] = i + 1;
      }
    }
  }
  return { found, totalPages: pages.filter((x) => x.trim()).length };
}

// --- Main CLI ---
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};
const dataPath = getArg('--data') || path.join(lab6Dir, 'uat-results.yaml');
const outPdfOverride = getArg('--out-pdf');
const noWriteReport = args.includes('--no-write-report');
const checkOnly = args.includes('--check-only');

const data = parseYaml(fs.readFileSync(dataPath, 'utf8'));
const uatPlanMd = readDoc('docs/labs/lab06/uat-plan.md');
const appendixA = [
  extractAcSection('docs/sprints/sprint-1/f-01-auth-session.md', 'F-01: Authentication & Session Contract (`f-01-auth-session.md`)'),
  extractAcSection('docs/sprints/sprint-1/f-02-event-management.md', 'F-02: Event Management Contract (`f-02-event-management.md`)'),
  extractAcSection('docs/sprints/sprint-1/f-03-registration-concurrency.md', 'F-03: Registration & Concurrency Contract (`f-03-registration-concurrency.md`)'),
  extractAcSection('docs/sprints/sprint-1/f-04-organizer-roster.md', 'F-04: Organizer Roster & Readiness Contract (`f-04-organizer-roster.md`)'),
].join('\n\n');

// Verified verbatim from `gh run view 45018492877 --log` on commit e6aad269e7b0f459126004e076f4fc432d1abdd0
const appendixC = `### Baseline Automated Test & Release Evidence (\`e6aad26\` / Run \`45018492877\`)

- **Workflow & Commit:** \`.github/workflows/deploy.yml\` (\`Deploy demo\`, run [\`45018492877\`](https://github.com/pimchayasupr-hash/cpe334-event-registration/actions/runs/45018492877), commit \`e6aad269e7b0f459126004e076f4fc432d1abdd0\`, merged [PR #40](https://github.com/pimchayasupr-hash/cpe334-event-registration/pull/40))
- **Server Suite (\`cd server && npm test\`, \`2026-11-22T11:41:07Z\`, Duration \`3.38s\`):** 5 files, **33 passed**, 0 failed, 0 skipped:
  - \`tests/events.test.ts\`: 6 tests (657ms)
  - \`tests/registrations.test.ts\`: 6 tests (666ms)
  - \`tests/auth.test.ts\`: 7 tests (1058ms)
  - \`tests/roster-and-health.test.ts\`: 5 tests (483ms)
  - \`tests/seed-config.test.ts\`: 9 tests (3ms)
- **Client Suite (\`cd client && npm test\`, \`2026-11-22T11:41:12Z\`, Duration \`330ms\`):** 2 files, **5 passed**, 0 failed, 0 skipped:
  - \`src/demoLogin.test.ts\`: 3 tests (3ms)
  - \`src/App.test.tsx\`: 2 tests (4ms)
- **Cloud Run Deployment (\`2026-11-22T12:15:52Z\`):** Service \`sdb3eb069\`, Revision \`sdb3eb069-00002-mct\` (100% traffic), Public URL \`https://sdb3eb069-4d7hbszvwq-as.a.run.app\`, smoke test passed (\`/api/health\`, \`/api/ready\`, \`/\`, \`/api/events\`).`;

function assembleFullMd(pageMap) {
  const warnings = [];
  const missingList = [];
  const reportMd = buildReportMarkdown(data, pageMap, warnings, missingList);
  const fullMd = `${reportMd}\n\n---\n\n## Appendix A — Sprint 1 Contract Acceptance Criteria (Verbatim Excerpts)\n\n${appendixA}\n\n---\n\n## Appendix B — Complete Sprint 1 UAT Plan (\`uat-plan.md\`)\n\n${uatPlanMd}\n\n---\n\n## Appendix C — Baseline Test & Release Evidence\n\n${appendixC}`;
  return { reportMd, fullMd, warnings, missingList };
}

const pdfName = data.pdf_filename || 'lab6_sec131_ยอดนักบิด.pdf';
const outPdf = outPdfOverride || path.join(lab6Dir, pdfName);
const outHtml = noWriteReport ? outPdf.replace(/\.pdf$/i, '.html') : path.join(lab6Dir, 'lab6_full_submission.html');

// Pass 1: build HTML + PDF to measure real rendered page numbers
const pass1 = assembleFullMd({});
if (!checkOnly) {
  fs.writeFileSync(outHtml, wrapHtml(mdToHtml(pass1.fullMd)), 'utf8');
  renderPdf(outHtml, outPdf);
  const { found: pageMap, totalPages } = detectPageNumbers(outPdf);

  // Pass 2: inject real rendered page numbers into Contents Table and re-render
  const pass2 = assembleFullMd(pageMap);
  if (!noWriteReport) {
    fs.writeFileSync(path.join(lab6Dir, 'report.md'), pass2.reportMd, 'utf8');
  }
  fs.writeFileSync(outHtml, wrapHtml(mdToHtml(pass2.fullMd)), 'utf8');
  renderPdf(outHtml, outPdf);

  console.log(`Generated HTML: ${outHtml}`);
  console.log(`Generated PDF : ${outPdf} (${totalPages} pages)`);
  console.log('Detected TOC pages:', JSON.stringify(pageMap));
}

const ready = pass1.missingList.length === 0 && !pass1.warnings.some((w) => w.startsWith('BLOCKED:'));
console.log(`\nReadiness Check: ${ready ? 'READY (พร้อมส่ง)' : 'NOT READY (ยังไม่พร้อมส่ง)'}`);
console.log(`Missing [รอ...] fields: ${pass1.missingList.length}`);
if (pass1.warnings.length > 0) {
  console.log('Warnings:');
  for (const w of pass1.warnings) console.log(`  - ${w}`);
}
if (checkOnly && !ready) {
  process.exitCode = 1;
}
