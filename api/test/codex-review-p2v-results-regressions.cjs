module.exports = {
  "selected": [
    "leave-contract",
    "leave-year-end",
    "payroll-coverage",
    "payroll-settlement-boundary",
    "attendance-employment-window",
    "settlement-payment",
    "request-execution"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 101,
      "failed": 0,
      "passed": 101,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 101,
      "suites": 0
    },
    "duration_ms": 110713.8446
  },
  "results": [
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 13757.8375,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 1086.7589,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 95.8853,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 483.9239,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 599.4973,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 317.5519,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 368.3689,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 374.5996,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 369.5904,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 69.8803,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 843.4164,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 379.6617,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 420.4894,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 58.8278,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 234.155,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 14227.3717,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 170.5633,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 248.5939,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 473.1495,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 241.6815,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03: an inactive employee whose CLOSED last working day is the period end keeps the full salary",
      "ms": 14262.0383,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-103: 18 covered days earn 7200; the 1000 installment stays whole and leaves 6200",
      "ms": 1398.3704,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: joining July 1 earns 5133.33 from a 7000 monthly gross without absence",
      "ms": 809.6125,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: one real absent workday deducts 233.33 from prorated pay and leaves 4900",
      "ms": 781.5815,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: an employee who left before the period and one joining after it have no payable line",
      "ms": 1117.8237,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: a cancelled offboarding case does not terminate coverage or reduce salary",
      "ms": 1124.7675,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: existing lateness/absence before hiring or after the last working day cannot deduct or generate more days",
      "ms": 730.9711,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: the first and last days of the cycle each count as one covered day",
      "ms": 588.6943,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "الشهر 30 يومًا: 18 يومًا مغطى في دورة 31 يومًا تستحق 3600 — التناسب على 30 مثل سعر يوم الخصم",
      "ms": 840.4848,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 31-day cycle pays exactly 6000, with factor one and no extra day",
      "ms": 1172.5508,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 28-day cycle pays exactly 6000 without deducting two calendar days",
      "ms": 918.4121,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / الخطوة 14: cycle start 1 uses its calendar month; 29/30/31 start the day after the previous period ends (no shared day)",
      "ms": 12738.3977,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: a SQL save failure preserves the previous run/items/members and leaves no partial new run",
      "ms": 5451.9809,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-01 / PR-02: branch payroll permissions cannot calculate, read, approve, recalculate or pay another branch",
      "ms": 3675.6305,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08: recalculation keeps the stored period dates after the company cycle setting changes",
      "ms": 1091.9847,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / PR-11: recalculation cannot change the stored period or scope type and preserves the old snapshot",
      "ms": 1313.5431,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: an employee cannot read their calculated draft payslip but can read the same item after approval",
      "ms": 1539.8097,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: half-cent proration is cut down (قرار المالك: خانتين بلا تقريب) and the adjusted components equal the earned gross",
      "ms": 383.5895,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: each of the four active payroll states excludes exact overtime/installment claims",
      "ms": 13666.7377,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: DRAFT/CANCELLED payroll items do not reserve financial entries",
      "ms": 676.0059,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: malformed historical payroll references reject regeneration and preserve every reviewed line",
      "ms": 647.5184,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a payroll claim created after generation blocks approval without changing reviewed money",
      "ms": 858.2362,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: concurrent approvals settle once, preserve exact references and do not invent payment state",
      "ms": 558.1155,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: changed or deleted linked financial lines require regeneration; manual adjustments remain independent",
      "ms": 976.8232,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: legacy financial settlement without snapshot requires explicit regeneration and keeps permissions",
      "ms": 526.1548,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: payroll after settlement excludes frozen claims and legacy ambiguity is refused",
      "ms": 2158.1833,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: renaming a historical automatic settlement line cannot hide pending financial sources",
      "ms": 199.1215,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: cancelling SETTLED legacy with a renamed automatic line cannot release untracked sources",
      "ms": 221.1135,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: all sources claimed by payroll cannot hide ambiguous automatic money behind an empty settlement snapshot",
      "ms": 507.4929,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: historical automatic EOS with no pending financial sources still permits settlement approval",
      "ms": 336.0756,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: simultaneous payroll calculation and settlement approval cannot claim the same sources",
      "ms": 1786.7219,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a later offboarding case cannot reclaim sources in an earlier settled snapshot",
      "ms": 671.2915,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-01: the schedule stores its exceptions with the company payroll cycle pinned, and rejects meaningless ones",
      "ms": 12665.3615,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-02: last Saturday of the payroll month is a working day for schedule A only; schedule B works every Saturday",
      "ms": 586.4582,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-03: no absence after the last working day while the offboarding case is still open; stale rows are cleared and not reported",
      "ms": 1185.4999,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-04: bulk assignments stop at each employee's service window without blocking the others",
      "ms": 2559.8416,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-05: the employment-windows endpoint feeds the weekly schedule (who serves the shown week)",
      "ms": 43.5016,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-06: the attendance report applies the same service window as the screens — archive date without an offboarding case, and before joining",
      "ms": 931.7647,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-payment.integration.cjs",
      "name": "SP-01: قبل الاعتماد مرفوض، ومن غير «اعتماد التصفية» 403، وبرّه الفرع 404 — ومفيش أي كتابة",
      "ms": 13939.9024,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-payment.integration.cjs",
      "name": "SP-02: التاريخ (مش بكره ولا قبل الاعتماد) والطريقة والمرجع، والتسجيل مرة واحدة، والتفاصيل بتعرضه للي بيشوف المبالغ بس — والصافي والحالة زي ما هم",
      "ms": 612.9712,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-payment.integration.cjs",
      "name": "SP-03: الملف المقفول بعد الاعتماد (آخر يوم عمل عدّى) بيتسجل صرفه نقدي من غير مرجع",
      "ms": 430.7467,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 13584.4079,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 315.5423,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 538.9855,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 317.5644,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 2870.2968,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 572.6655,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 239.8549,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 761.1276,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 457.5412,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 591.3299,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.8975,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 502.9725,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 157.4655,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 365.2723,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 280.5621,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 151.8937,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 521.5882,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 133.9281,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 513.3477,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 164.4736,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 305.2747,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 4185.236,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 739.2872,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 637.539,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 1181.4856,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 146.9113,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 247.4157,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 209.506,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 459.2768,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 696.1586,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 725.961,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 176.3928,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 177.9082,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 581.6011,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 258.3952,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 518.0029,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 250.0299,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 578.7201,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 275.3949,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 239.9175,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup: hr_leave_year_end_test_73d758909106799c dropped.",
    "Manual: 12000 × 18 / 30 = 7200; 7200 − 1000 = 6200.",
    "Manual: (6000 + 800 + 200) × 22 / 30 = 5133.33; daily deduction basis remains 7000 / 30.",
    "Manual: 5133.33 − ROUND(7000 / 30, 2) = 4900.00; do not derive day rate from the prorated gross.",
    "قرار المالك (16 سبتمبر): الشهر 30 يومًا في كل شيء — 6000 × 18 / 30 = 3600.",
    "12 explicit cycle-boundary cases checked through POST calculation and persisted GET detail.",
    "Manual half-cent cases (قص بلا تقريب): 30.15 × 3/30 = 3.015 → 3.01؛ (10.15 × 3) × 3/30 = 3.045 → 3.04؛ القروش والإجمالي متطابقين.",
    "Cleanup verified: hr_payroll_coverage_test_91a046576eeaf2c2 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Temporary settlement database removed and absence verified.",
    "Cleanup verified: hr_settlement_payment_test_f6a7ea5db5b6bea9 is absent from sys.databases.",
    "tests 101",
    "suites 0",
    "pass 101",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 110713.8446"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_742dddd7e3498bde\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_742dddd7e3498bde\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_year_end_test_73d758909106799c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_year_end_test_73d758909106799c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_coverage_test_91a046576eeaf2c2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_coverage_test_91a046576eeaf2c2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_settlement_test_fbb0627a88ffe98b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_settlement_test_fbb0627a88ffe98b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_window_test_e0bca0d1e6862766\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_window_test_e0bca0d1e6862766\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_settlement_payment_test_f6a7ea5db5b6bea9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_settlement_payment_test_f6a7ea5db5b6bea9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_fab5ac95e046deb5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_fab5ac95e046deb5\"}\n"
  ]
}
