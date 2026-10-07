module.exports = {
  "selected": [
    "leave-year-end",
    "leave-contract",
    "employee-suspension",
    "payroll-coverage",
    "payroll-settlement-boundary",
    "recovery"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 93,
      "failed": 3,
      "passed": 90,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 93,
      "suites": 0
    },
    "duration_ms": 51063.7277
  },
  "results": [
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 7721.5253,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 85.3059,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 160.2485,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 263.3135,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 82.5577,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 7181.807,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 593.1404,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 48.4437,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 167.0402,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 258.28,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 116.8058,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 218.0609,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 200.7801,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 203.8777,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 45.259,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 492.4473,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 201.181,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 223.7378,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 22.7956,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 110.716,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية أو الجواز بأي صيغة وفريدة، ورقم البصمة فريد",
      "ms": 7208.0469,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو «موقوف» بلا تواريخ مرفوض، وتغيير الجنسية مابيعيدش فحص الهوية",
      "ms": 128.4494,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 401.2659,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 350.5486,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 830.0791,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03: an inactive employee whose CLOSED last working day is the period end keeps the full salary",
      "ms": 7387.7773,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-103: 18 covered days earn 7200; the 1000 installment stays whole and leaves 6200",
      "ms": 741.6405,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: joining July 1 earns 5133.33 from a 7000 monthly gross without absence",
      "ms": 507.0719,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: one real absent workday deducts 233.33 from prorated pay and leaves 4900",
      "ms": 535.7976,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: an employee who left before the period and one joining after it have no payable line",
      "ms": 545.5584,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: a cancelled offboarding case does not terminate coverage or reduce salary",
      "ms": 532.7049,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: existing lateness/absence before hiring or after the last working day cannot deduct or generate more days",
      "ms": 300.4813,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: the first and last days of the cycle each count as one covered day",
      "ms": 262.04,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "الشهر 30 يومًا: 18 يومًا مغطى في دورة 31 يومًا تستحق 3600 — التناسب على 30 مثل سعر يوم الخصم",
      "ms": 422.0715,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 31-day cycle pays exactly 6000, with factor one and no extra day",
      "ms": 535.1628,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 28-day cycle pays exactly 6000 without deducting two calendar days",
      "ms": 523.7865,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / الخطوة 14: cycle start 1 uses its calendar month; 29/30/31 start the day after the previous period ends (no shared day)",
      "ms": 6933.4209,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: a SQL save failure preserves the previous run/items/members and leaves no partial new run",
      "ms": 2354.6024,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-01 / PR-02: branch payroll permissions cannot calculate, read, approve, recalculate or pay another branch",
      "ms": 1620.8269,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08: recalculation keeps the stored period dates after the company cycle setting changes",
      "ms": 674.3317,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / PR-11: recalculation cannot change the stored period or scope type and preserves the old snapshot",
      "ms": 648.2357,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: an employee cannot read their calculated draft payslip but can read the same item after approval",
      "ms": 805.972,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: half-cent proration is cut down (قرار المالك: خانتين بلا تقريب) and the adjusted components equal the earned gross",
      "ms": 264.7794,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: each of the four active payroll states excludes exact overtime/installment claims",
      "ms": 7679.1569,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: DRAFT/CANCELLED payroll items do not reserve financial entries",
      "ms": 263.162,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: malformed historical payroll references reject regeneration and preserve every reviewed line",
      "ms": 217.5149,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a payroll claim created after generation blocks approval without changing reviewed money",
      "ms": 324.1746,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: concurrent approvals settle once, preserve exact references and do not invent payment state",
      "ms": 174.344,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: changed or deleted linked financial lines require regeneration; manual adjustments remain independent",
      "ms": 346.9552,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: legacy financial settlement without snapshot requires explicit regeneration and keeps permissions",
      "ms": 181.8821,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: payroll after settlement excludes frozen claims and legacy ambiguity is refused",
      "ms": 1186.4762,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: renaming a historical automatic settlement line cannot hide pending financial sources",
      "ms": 117.8748,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: cancelling SETTLED legacy with a renamed automatic line cannot release untracked sources",
      "ms": 91.9548,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: all sources claimed by payroll cannot hide ambiguous automatic money behind an empty settlement snapshot",
      "ms": 228.1013,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: historical automatic EOS with no pending financial sources still permits settlement approval",
      "ms": 140.1273,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: simultaneous payroll calculation and settlement approval cannot claim the same sources",
      "ms": 729.4579,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a later offboarding case cannot reclaim sources in an earlier settled snapshot",
      "ms": 190.5551,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "unauthenticated requests are rejected",
      "ms": 5902.2696,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "my-today reads schedule and leave without materializing attendance",
      "ms": 83.0588,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "work schedules persist; assignment and branch isolation are enforced",
      "ms": 162.3211,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "document types support persisted creation and renaming with permission checks",
      "ms": 33.731,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "offboarding preview has no writes and uses the same EOS as persisted settlement",
      "ms": 199.477,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "a structural approval with no manager fails before entering the workflow",
      "ms": 102.9413,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "disabled approval chains stop new submissions",
      "ms": 37.7994,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "personal updates cannot change email or bank outside their controlled routes",
      "ms": 21.4762,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "early loan settlement pays existing installments instead of creating another loan",
      "ms": 92.3539,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "invalid loan amounts and fractional installment counts roll back",
      "ms": 13.1228,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "future punches and weak device keys cannot write attendance",
      "ms": 2.2189,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "overnight punches are attributed to the starting workday",
      "ms": 246.8331,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "morning punch arriving in a later batch completes the previous overnight shift",
      "ms": 275.4501,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "leave deduction consumes opening balance first and restores exactly",
      "ms": 45.1024,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "notification reads and dismissals persist and stay private",
      "ms": 215.7869,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "old JWTs stop working when tokenVersion changes",
      "ms": 75.5378,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "failed direct submission leaves no orphan draft",
      "ms": 28.434,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "required fields are enforced when submitting a previously saved draft",
      "ms": 33.0111,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "failed resubmission preserves returned status and original payload",
      "ms": 24.4532,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "unsupported destinations cannot create completed requests",
      "ms": 13.1881,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "on-behalf submission does not escape the actor branch",
      "ms": 8.0048,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "request details cannot be read by unrelated employees",
      "ms": 23.2572,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "future attendance recalculation does not store absence",
      "ms": 88.5663,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "negative shift grace and invalid holiday ranges are rejected",
      "ms": 16.6075,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "manual finalization respects branch scope, last working day and idempotency",
      "ms": 77.1099,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "retirement opens clearance and notice period without prematurely disabling the employee",
      "ms": 46.4037,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "letters generate real Arabic PDFs, persist once and restrict downloads to owner/scoped HR",
      "ms": 1825.4403,
      "pass": false,
      "error": "The browser is already running for D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2x-tmp\\puppeteer_dev_chrome_profile-rOGwWC. Use a different `userDataDir` or stop the running browser first.",
      "cause": "The browser is already running for D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2x-tmp\\puppeteer_dev_chrome_profile-rOGwWC. Use a different `userDataDir` or stop the running browser first.",
      "stack": "Error: The browser is already running for D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2x-tmp\\puppeteer_dev_chrome_profile-rOGwWC. Use a different `userDataDir` or stop the running browser first.\n    at ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/BrowserLauncher.ts:318:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/ChromeLauncher.ts:59:12)\n    at async PuppeteerNode.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/PuppeteerNode.ts:147:12)\n    at async LetterRenderer.pdf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\src\\letters\\letter-renderer.service.ts:24:23)\n    at async LettersService.generate (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\src\\letters\\letters.service.ts:65:19)\n    at async EntityManager.transaction (D:\\projects\\hr_system\\api\\node_modules\\src\\entity-manager\\EntityManager.ts:157:28)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\recovery.integration.cjs:375:18)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "letter generation without required company identity leaves no destination or file record",
      "ms": 29.1934,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "file metadata cannot spoof another employee or public company logo",
      "ms": 68.1514,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "an unchanged aggregated notification stays dismissed but a new item brings it back",
      "ms": 95.6603,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "expiry reminders derive from current scoped data and disappear after renewal",
      "ms": 151.3303,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "canonical leave handlers keep balance behavior and old saved keys remain executable",
      "ms": 213.2597,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "work type accepts legacy aliases but stores canonical values and rejects unknown codes",
      "ms": 143.8118,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "letter template catalog, draft validation, preview and optimistic editing enforce access and publication",
      "ms": 426.3079,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\recovery.integration.cjs:522:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "approved custom letter uses the bound published revision and preserves its issued snapshot",
      "ms": 595.8267,
      "pass": false,
      "error": "{\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\recovery.integration.cjs:554:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "my decisions are private, canonical, paginated and retain audit access after a branch change",
      "ms": 224.7754,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "recovery.integration.cjs",
      "name": "letters generate real Arabic PDFs, persist once and restrict downloads to owner/scoped HR",
      "ms": 1825.4403,
      "pass": false,
      "error": "The browser is already running for D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2x-tmp\\puppeteer_dev_chrome_profile-rOGwWC. Use a different `userDataDir` or stop the running browser first.",
      "cause": "The browser is already running for D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2x-tmp\\puppeteer_dev_chrome_profile-rOGwWC. Use a different `userDataDir` or stop the running browser first.",
      "stack": "Error: The browser is already running for D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2x-tmp\\puppeteer_dev_chrome_profile-rOGwWC. Use a different `userDataDir` or stop the running browser first.\n    at ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/BrowserLauncher.ts:318:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/ChromeLauncher.ts:59:12)\n    at async PuppeteerNode.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/PuppeteerNode.ts:147:12)\n    at async LetterRenderer.pdf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\src\\letters\\letter-renderer.service.ts:24:23)\n    at async LettersService.generate (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\src\\letters\\letters.service.ts:65:19)\n    at async EntityManager.transaction (D:\\projects\\hr_system\\api\\node_modules\\src\\entity-manager\\EntityManager.ts:157:28)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\recovery.integration.cjs:375:18)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "letter template catalog, draft validation, preview and optimistic editing enforce access and publication",
      "ms": 426.3079,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\recovery.integration.cjs:522:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "approved custom letter uses the bound published revision and preserves its issued snapshot",
      "ms": 595.8267,
      "pass": false,
      "error": "{\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\recovery.integration.cjs:554:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup: hr_leave_year_end_test_33d090ec24abf135 dropped.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_ad96ea8116807020 is absent from sys.databases.",
    "Manual: 12000 × 18 / 30 = 7200; 7200 − 1000 = 6200.",
    "Manual: (6000 + 800 + 200) × 22 / 30 = 5133.33; daily deduction basis remains 7000 / 30.",
    "Manual: 5133.33 − ROUND(7000 / 30, 2) = 4900.00; do not derive day rate from the prorated gross.",
    "قرار المالك (16 سبتمبر): الشهر 30 يومًا في كل شيء — 6000 × 18 / 30 = 3600.",
    "12 explicit cycle-boundary cases checked through POST calculation and persisted GET detail.",
    "Manual half-cent cases (قص بلا تقريب): 30.15 × 3/30 = 3.015 → 3.01؛ (10.15 × 3) × 3/30 = 3.045 → 3.04؛ القروش والإجمالي متطابقين.",
    "Cleanup verified: hr_payroll_coverage_test_7f1bd827884af3ab no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Temporary settlement database removed and absence verified.",
    "tests 93",
    "suites 0",
    "pass 90",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 51063.7277"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_year_end_test_33d090ec24abf135\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_year_end_test_33d090ec24abf135\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_86555cc6d9247b1b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_86555cc6d9247b1b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_suspension_test_ad96ea8116807020\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_suspension_test_ad96ea8116807020\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_coverage_test_7f1bd827884af3ab\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_coverage_test_7f1bd827884af3ab\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_settlement_test_35e39c4b9761c96d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_settlement_test_35e39c4b9761c96d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_ab05169754b27f04\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_ab05169754b27f04\"}\n"
  ]
}
