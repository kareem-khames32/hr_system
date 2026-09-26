module.exports = {
  "selected": [
    "attendance-employment-window",
    "attendance-exemption-workflow",
    "leave-contract",
    "recovery",
    "request-category-chains",
    "user-branch-scopes",
    "codex-review-round5-settings"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 141,
      "failed": 3,
      "passed": 138,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 141,
      "suites": 0
    },
    "duration_ms": 113959.6364
  },
  "results": [
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-01: the schedule stores its exceptions with the company payroll cycle pinned, and rejects meaningless ones",
      "ms": 11080.9728,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-02: last Saturday of the payroll month is a working day for schedule A only; schedule B works every Saturday",
      "ms": 409.7926,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-03: no absence after the last working day while the offboarding case is still open; stale rows are cleared and not reported",
      "ms": 1055.9099,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-04: bulk assignments stop at each employee's service window without blocking the others",
      "ms": 2020.1172,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-05: the employment-windows endpoint feeds the weekly schedule (who serves the shown week)",
      "ms": 30.4614,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-06: the attendance report applies the same service window as the screens — archive date without an offboarding case, and before joining",
      "ms": 877.761,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09: creation requires authentication, explicit permission and the employee branch",
      "ms": 10260.2733,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09: the HTTP whitelist blocks mass assignment of approval, actor and termination fields; drafts stay inactive",
      "ms": 116.2483,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09: an ordinary window activates only after HR approval and mine exposes only that employee approved windows",
      "ms": 366.7407,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-16: executive exemption needs HR then a separately authorized executive step, with immutable intermediate history",
      "ms": 335.6314,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09: two overlapping pending approvals race to one approved window and one atomic 409",
      "ms": 334.567,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: termination preserves approved history through today and restores ordinary attendance from tomorrow",
      "ms": 606.9587,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09/16: cancelling a pending decision retains its records and events and never activates the window",
      "ms": 279.594,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: approved or paid payroll blocks a new overlapping exemption without any partial window or audit record",
      "ms": 213.8543,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: a payroll approved after draft creation blocks exemption approval and termination atomically",
      "ms": 386.9345,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13/16: invalid dates, earlier cycles, reversed ranges and reasons leave no records",
      "ms": 470.2828,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: a new exemption approved after calculation blocks stale payroll approval without claims/events until explicit recalculation",
      "ms": 2443.0109,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: termination after coverage and later organization defaults preserve a calculated payroll decision",
      "ms": 1312.7094,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 SoD: a creator without HR-manager authority never approves or rejects its own request, even with approval rights",
      "ms": 198.8569,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 SoD: the HR approver of an executive exemption cannot take or reject the executive step; another user completes it",
      "ms": 377.3435,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 reject: another approver rejects with a reason; the window never activates, stays auditable and cannot be decided again",
      "ms": 498.6184,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 overlap: a second overlapping pending request is refused atomically; adjacent, other-employee and post-cancel requests are allowed",
      "ms": 273.1489,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 dates: a pending request created in the previous cycle stays approvable after a new cycle starts; the previous cycle (paid next month) is accepted, anything older stays refused",
      "ms": 292.8479,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 screen API: the scoped list returns names, state and per-user actions and honours the branch scope",
      "ms": 334.0529,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 acceptance: an employee without punches has no attendance deduction on a real payroll run after request and approval by two different users",
      "ms": 1358.5903,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "Owner 26-Sep: an HR manager holding the approve permission creates the exemption already approved by himself — creation reason, instant event, window effective at once",
      "ms": 87.2406,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "Owner 26-Sep: an executive-reason exemption by an HR manager without the executive permission gets the HR step at once and waits for the executive step only; super_admin approves both at once",
      "ms": 180.1326,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "Owner 26-Sep: the old separation still binds non-HR creators and the HR manager in his own exemption; the HR manager now decides the legacy pending request he created",
      "ms": 262.4993,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "SoD self: an approver never decides an exemption on himself even when another user created it",
      "ms": 106.3307,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 5983.181,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 525.2528,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 40.1667,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 164.1149,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 245.0495,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 95.2889,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 176.9367,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 134.2615,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 135.7668,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 27.1225,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 340.548,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 150.085,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 186.4637,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 20.9765,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 83.5624,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "unauthenticated requests are rejected",
      "ms": 6471.9244,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "my-today reads schedule and leave without materializing attendance",
      "ms": 83.2762,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "work schedules persist; assignment and branch isolation are enforced",
      "ms": 167.6049,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "document types support persisted creation and renaming with permission checks",
      "ms": 45.7536,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "offboarding preview has no writes and uses the same EOS as persisted settlement",
      "ms": 201.1308,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "a structural approval with no manager fails before entering the workflow",
      "ms": 85.1487,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "disabled approval chains stop new submissions",
      "ms": 34.865,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "personal updates cannot change email or bank outside their controlled routes",
      "ms": 20.4441,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "early loan settlement pays existing installments instead of creating another loan",
      "ms": 97.419,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "invalid loan amounts and fractional installment counts roll back",
      "ms": 10.8987,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "future punches and weak device keys cannot write attendance",
      "ms": 3.2087,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "overnight punches are attributed to the starting workday",
      "ms": 295.5643,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "morning punch arriving in a later batch completes the previous overnight shift",
      "ms": 312.8672,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "leave deduction consumes opening balance first and restores exactly",
      "ms": 51.0241,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "notification reads and dismissals persist and stay private",
      "ms": 192.4763,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "old JWTs stop working when tokenVersion changes",
      "ms": 96.8973,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "failed direct submission leaves no orphan draft",
      "ms": 33.7377,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "required fields are enforced when submitting a previously saved draft",
      "ms": 33.1707,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "failed resubmission preserves returned status and original payload",
      "ms": 27.0825,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "unsupported destinations cannot create completed requests",
      "ms": 15.0151,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "on-behalf submission does not escape the actor branch",
      "ms": 11.6765,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "request details cannot be read by unrelated employees",
      "ms": 15.886,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "future attendance recalculation does not store absence",
      "ms": 108.2248,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "negative shift grace and invalid holiday ranges are rejected",
      "ms": 16.7944,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "manual finalization respects branch scope, last working day and idempotency",
      "ms": 85.0934,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "retirement opens clearance and notice period without prematurely disabling the employee",
      "ms": 53.7318,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "letters generate real Arabic PDFs, persist once and restrict downloads to owner/scoped HR",
      "ms": 2036.5397,
      "pass": false,
      "error": "The browser is already running for C:\\Users\\Kareem\\AppData\\Local\\Temp\\puppeteer_dev_chrome_profile-16jywf. Use a different `userDataDir` or stop the running browser first.",
      "cause": "The browser is already running for C:\\Users\\Kareem\\AppData\\Local\\Temp\\puppeteer_dev_chrome_profile-16jywf. Use a different `userDataDir` or stop the running browser first.",
      "stack": "Error: The browser is already running for C:\\Users\\Kareem\\AppData\\Local\\Temp\\puppeteer_dev_chrome_profile-16jywf. Use a different `userDataDir` or stop the running browser first.\n    at ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/BrowserLauncher.ts:318:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/ChromeLauncher.ts:59:12)\n    at async PuppeteerNode.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/PuppeteerNode.ts:147:12)\n    at async LetterRenderer.pdf (D:\\projects\\hr_system\\api\\src\\letters\\letter-renderer.service.ts:24:23)\n    at async LettersService.generate (D:\\projects\\hr_system\\api\\src\\letters\\letters.service.ts:60:19)\n    at async EntityManager.transaction (D:\\projects\\hr_system\\api\\node_modules\\src\\entity-manager\\EntityManager.ts:157:28)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\recovery.integration.cjs:375:18)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "letter generation without required company identity leaves no destination or file record",
      "ms": 37.8147,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "file metadata cannot spoof another employee or public company logo",
      "ms": 88.131,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "an unchanged aggregated notification stays dismissed but a new item brings it back",
      "ms": 135.4773,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "expiry reminders derive from current scoped data and disappear after renewal",
      "ms": 170.7666,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "canonical leave handlers keep balance behavior and old saved keys remain executable",
      "ms": 286.9162,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "work type accepts legacy aliases but stores canonical values and rejects unknown codes",
      "ms": 183.1228,
      "pass": true,
      "skip": false
    },
    {
      "file": "recovery.integration.cjs",
      "name": "letter template catalog, draft validation, preview and optimistic editing enforce access and publication",
      "ms": 480.1436,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\recovery.integration.cjs:522:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "approved custom letter uses the bound published revision and preserves its issued snapshot",
      "ms": 659.9926,
      "pass": false,
      "error": "{\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\recovery.integration.cjs:554:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "my decisions are private, canonical, paginated and retain audit access after a branch change",
      "ms": 220.6917,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-01: من غير أي ربط — كل فئة من غير سلسلة، وكل نوع على سلسلته، والباب المالي «ثابت» بسببه",
      "ms": 5889.8468,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-02: ربط الإجازات بسلسلة موجودة ينقل المختارين بس — والتالت بيفضل على سلسلته",
      "ms": 49.5353,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-03: الحضور على نفس سلسلة الإجازات — «مشتركة مع» في الخريطة",
      "ms": 27.4002,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ",
      "ms": 421.4823,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين",
      "ms": 329.0288,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة",
      "ms": 117.976,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)",
      "ms": 132.1753,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك",
      "ms": 158.4639,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-09: الرفض — سلسلة فرع أو معطّلة أو فاضية، نوع من فئة تانية، الباب المالي، الإضافي على سلسلة بلا معتمدين، وطلب ناقص",
      "ms": 179.1516,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه",
      "ms": 182.8178,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس",
      "ms": 19.0027,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-12: ربط الفئة مايتكتبش من إعدادات النظام العامة، وسلسلة الفئة ماتتنقلش لفرع حتى لو مفيش نوع عليها",
      "ms": 83.1283,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
      "ms": 9691.1254,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
      "ms": 296.5721,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
      "ms": 279.1287,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
      "ms": 381.5723,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
      "ms": 476.7905,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
      "ms": 347.2371,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
      "ms": 241.7988,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
      "ms": 207.3238,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
      "ms": 113.0054,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
      "ms": 187.784,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "A1 — كتالوج مفاتيح الإعدادات كامل ومقروء (GET /settings/config)",
      "ms": 7301.7394,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "A2 — مفتاح غير مُعلن مرفوض ولا يُخزَّن (لا إنشاء مفاتيح من العميل)",
      "ms": 13.0717,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "A3 — سلطة الكتابة: نطاق الشركة فقط، والموظف العادي ممنوع",
      "ms": 51.6016,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "A4 — مفاتيح يقرؤها الخادم ولا تُضبط من الإعدادات (مفاتيح يتيمة)",
      "ms": 70.8598,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "B1 — attendance.grace_minutes: السماحية تغيّر التأخير المحسوب",
      "ms": 1203.0631,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "B2 — attendance.weekend_days: أيام الراحة تغيّر أيام العمل المحسوبة",
      "ms": 187.6604,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "B3 — attendance.device_key: المفتاح يفتح/يقفل استقبال البصمات",
      "ms": 151.4824,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "B4 — attendance.holiday_work_multiplier: مضاعف بدل دوام العطلة الافتراضي",
      "ms": 130.8931,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "B5 — attendance.flex.*: إعدادات المرونة تُثبَّت في نسخة تعريف الدوام الجديدة",
      "ms": 219.8708,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "B6 — attendance.absence_penalty_days / sync_interval_minutes / absence_catchup_max_days",
      "ms": 60.5812,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "C1 — overtime.detection_threshold_hours / rounding_minutes: البصمة تُنتج دقائق مختلفة",
      "ms": 493.7507,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "C2 — overtime.multiplier_* : مضاعف نوع اليوم يغيّر قيمة الإضافي",
      "ms": 386.3957,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "C3 — overtime.enabled / allow_early_overtime / request_backdate_days / max_hours_*",
      "ms": 511.4873,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "C3b — مفاتيح «إعداد» مقفولة على قيمة واحدة منفّذة (توثيق لا إعداد)",
      "ms": 6.9856,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "C4 — overtime.wage_components: مفتاح توافق — أي قيمة تُعاد لقائمة المكونات الكاملة",
      "ms": 24.7683,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "D1 — leave.annual_entitled: استحقاق الموظف الجديد يتبع الإعداد",
      "ms": 335.0533,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "D2 — leave.sick_entitled: هل المفتاح مقروء فعلاً؟ (مفتاح ميت مشتبه فيه)",
      "ms": 162.4573,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "D3 — leave.max_backdate_days: حد الأثر الرجعي لطلب الإجازة",
      "ms": 216.4523,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "D4 — leave.accrual_mode / probation_months / carryover_*",
      "ms": 115.2979,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "D5 — أنواع الإجازات: إنشاء وتعديل، والقاعدة تتحكم في الطلب",
      "ms": 120.7375,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "E1 — payroll.cycle_start_day: يوم بداية الدورة يغيّر مدى فترة المسير",
      "ms": 61.4439,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "E2 — payroll.monthly_days / daily_hours / late_deduction_enabled / salary_evidence_mode",
      "ms": 93.0781,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "E3 — payroll.shortfall_* و attendance_overlap_policy و attendance_daily_cap_days",
      "ms": 121.64,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "E4 — payroll.policy.*: افتراضات النسخة الجديدة متحقَّق منها ومتصلة",
      "ms": 195.8933,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "E5 — system.currency و onboarding.window_days و eos.*",
      "ms": 283.539,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "F1 — loan.request_open / request_from_day / request_to_day: فتح وقفل طلب السلفة",
      "ms": 276.7649,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "F2 — loan.exceptional_reason_min_length / first_installment_max_months_ahead / insufficient_net_behavior",
      "ms": 89.411,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "G1 — deductions.*: أقل طول للسبب وحد الدفعة وإنشاء المدير",
      "ms": 215.8947,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "G2 — bonuses.* و financial_exemptions.*",
      "ms": 206.0867,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "H1 — company.*: صيغ ملف الشركة وأثرها على المستندات",
      "ms": 212.4182,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "I1 — الفروع: إنشاء وتعديل، وأيام الراحة على مستوى الفرع تغيّر أيام العمل",
      "ms": 180.0491,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "I2 — الأقسام والفرق: الهيكل وعزل الفروع",
      "ms": 75.8544,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "I3 — الكتالوجات (مسميات/درجات/مراكز تكلفة/أنواع أصول/أنواع إذن): إنشاء وتعديل وسلطة",
      "ms": 361.5155,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "I4 — الورديات وجداول العمل: القاعدة تغيّر التأخير وأيام العمل",
      "ms": 448.1371,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "I5 — قواعد استثناء أيام العمل: القاعدة تغيّر يوم الراحة إلى دوام",
      "ms": 202.4154,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "I6 — العطلات الرسمية: العطلة تغيّر أيام العمل، وحساب الفرع ممنوع",
      "ms": 214.8761,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "I7 — المستخدمون والأدوار: الصلاحية الممنوحة تفتح السلوك فعلاً",
      "ms": 270.1482,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "I8 — سلاسل الاعتماد وأنواع الطلبات: التعريف يتحكم في مسار الطلب",
      "ms": 215.2196,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-settings.integration.cjs",
      "name": "I9 — أنواع الخصم والمكافأة (كتالوج): إنشاء وتعديل وسلطة",
      "ms": 53.5556,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "recovery.integration.cjs",
      "name": "letters generate real Arabic PDFs, persist once and restrict downloads to owner/scoped HR",
      "ms": 2036.5397,
      "pass": false,
      "error": "The browser is already running for C:\\Users\\Kareem\\AppData\\Local\\Temp\\puppeteer_dev_chrome_profile-16jywf. Use a different `userDataDir` or stop the running browser first.",
      "cause": "The browser is already running for C:\\Users\\Kareem\\AppData\\Local\\Temp\\puppeteer_dev_chrome_profile-16jywf. Use a different `userDataDir` or stop the running browser first.",
      "stack": "Error: The browser is already running for C:\\Users\\Kareem\\AppData\\Local\\Temp\\puppeteer_dev_chrome_profile-16jywf. Use a different `userDataDir` or stop the running browser first.\n    at ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/BrowserLauncher.ts:318:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/ChromeLauncher.ts:59:12)\n    at async PuppeteerNode.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/PuppeteerNode.ts:147:12)\n    at async LetterRenderer.pdf (D:\\projects\\hr_system\\api\\src\\letters\\letter-renderer.service.ts:24:23)\n    at async LettersService.generate (D:\\projects\\hr_system\\api\\src\\letters\\letters.service.ts:60:19)\n    at async EntityManager.transaction (D:\\projects\\hr_system\\api\\node_modules\\src\\entity-manager\\EntityManager.ts:157:28)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\recovery.integration.cjs:375:18)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "letter template catalog, draft validation, preview and optimistic editing enforce access and publication",
      "ms": 480.1436,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\recovery.integration.cjs:522:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "recovery.integration.cjs",
      "name": "approved custom letter uses the bound published revision and preserves its issued snapshot",
      "ms": 659.9926,
      "pass": false,
      "error": "{\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"لم يُعتمد الطلب — تعذّر تنفيذ الطلب في وجهته (خطأ داخلي — راجع سجل الخادم). الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\recovery.integration.cjs:554:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_exemption_workflow_test_a6e5dd6db0fc6dc0 was removed and DB_ID is NULL.",
    "Cleanup verified: temporary uploads were removed.",
    "Cleanup verified: hr_category_chains_test_017c1213d9f00406 is absent from sys.databases.",
    "Cleanup verified: hr_user_branch_scopes_test_259a24976b7f8636 removed.",
    "scenarios=39 checks=360 passed=359 failed=1",
    "Cleanup verified: hr_settings_test_76d4a3d991649638 is absent from sys.databases.",
    "tests 141",
    "suites 0",
    "pass 138",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 113959.6364"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_window_test_b06aa0ea3024b21c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_window_test_b06aa0ea3024b21c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_exemption_workflow_test_a6e5dd6db0fc6dc0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_exemption_workflow_test_a6e5dd6db0fc6dc0\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_d39465010e2c8f64\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_d39465010e2c8f64\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_81bb858af4c3e02a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_81bb858af4c3e02a\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_category_chains_test_017c1213d9f00406\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_category_chains_test_017c1213d9f00406\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_branch_scopes_test_259a24976b7f8636\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_branch_scopes_test_259a24976b7f8636\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_settings_test_76d4a3d991649638\"}\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "\n===== FINDINGS =====\n1. [A3 سلطة الكتابة على الإعدادات] حساب بصلاحية settings.manage على كل الفروع (بلا فرع) يقدر يكتب إعداد الشركة — وإلا فالصلاحية بلا أثر ومدير النظام وحده يضبط الإعدادات :: Expected values to be strictly equal: | 403 !== 200\n===== COVERAGE =====\nCOVERED   overtime.enabled [behaviour,read,write]\nCOVERED   overtime.biometric_requires_confirmation [dead,read,validate,write]\nCOVERED   overtime.detection_threshold_hours [behaviour,read,validate,write]\nCOVERED   overtime.rounding_minutes [behaviour,read,validate,write]\nCOVERED   overtime.rounding_direction [dead,read,validate,write]\nCOVERED   overtime.request_backdate_days [read,validate,write]\nCOVERED   overtime.max_closed_periods [read,write]\nCOVERED   overtime.max_hours_per_day [behaviour,read,validate,write]\nCOVERED   overtime.max_hours_per_week [read,write]\nCOVERED   overtime.max_hours_per_month [read,write]\nCOVERED   overtime.allow_early_overtime [read,write]\nCOVERED   overtime.missing_punch_policy [dead,read,validate,write]\nCOVERED   overtime.leave_conflict_policy [dead,read,validate,write]\nCOVERED   overtime.wage_components [behaviour,read,write]\nCOVERED   overtime.multiplier_weekday [behaviour,read,validate,write]\nCOVERED   overtime.multiplier_weekend [behaviour,read,write]\nCOVERED   overtime.multiplier_holiday [behaviour,read,write]\nCOVERED   attendance.holiday_work_multiplier [behaviour,read,write]\nCOVERED   attendance.grace_minutes [behaviour,read,validate,write]\nCOVERED   attendance.flex.count_early_work_toward_required [behaviour,read,write]\nCOVERED   attendance.flex.prorate_window_on_partial_leave [read,snapshot]\nCOVERED   attendance.flex.shortfall_grace_minutes [behaviour,read,write]\nCOVERED   attendance.flex.unpaid_break_minutes [behaviour,read,validate,write]\nCOVERED   attendance.flex.max_session_minutes [read,snapshot,write]\nCOVERED   attendance.flex.window_supersedes_grace [read,snapshot]\nCOVERED   attendance.flex.missing_checkout_policy [dead,read,snapshot,write]\nCOVERED   payroll.shortfall_enabled [read,write]\nCOVERED   payroll.daily_accrual_enabled [dead,read,write]\nCOVERED   payroll.daily_accrual_hour [dead,read,write]\nCOVERED   payroll.shortfall_mode [read,validate,write]\nCOVERED   payroll.shortfall_value [read,validate,write]\nCOVERED   payroll.attendance_overlap_policy [read,validate,write]\nCOVERED   payroll.attendance_daily_cap_days [read,validate,write]\nCOVERED   attendance.absence_penalty_days [read,validate,write]\nCOVERED   attendance.weekend_days [behaviour,read,validate,write]\nCOVERED   attendance.sync_interval_minutes [read,write]\nCOVERED   attendance.absence_catchup_max_days [read,validate,write]\nCOVERED   attendance.device_key [behaviour,read,validate,write]\nCOVERED   leave.annual_entitled [authority,behaviour,read,validate,write]\nCOVERED   leave.sick_entitled [behaviour,read,write]\nCOVERED   leave.max_backdate_days [behaviour,read,write]\nCOVERED   leave.accrual_mode [read,validate,write]\nCOVERED   leave.probation_months [behaviour,read,write]\nCOVERED   leave.carryover_max_days [read,write]\nCOVERED   leave.carryover_expiry_months [read,write]\nCOVERED   onboarding.window_days [behaviour,read,write]\nCOVERED   system.currency [read,validate,write]\nCOVERED   system.country [dead,read,write]\nCOVERED   company.name [read,validate,write]\nCOVERED   company.name_en [read,write]\nCOVERED   company.commercial_register [read,write]\nCOVERED   company.address [read,write]\nCOVERED   company.phone [read,write]\nCOVERED   company.logo_file_id [read,write]\nCOVERED   company.commercial_register_expiry [read,validate,write]\nCOVERED   company.vat_number [read,validate,write]\nCOVERED   company.unified_number [read,validate,write]\nCOVERED   company.gosi_establishment_number [read,write]\nCOVERED   company.eg_insurance_establishment_number [read,write]\nCOVERED   company.qiwa_establishment_number [read,write]\nCOVERED   company.national_address_building_no [read,write]\nCOVERED   company.national_address_street [read,write]\nCOVERED   company.national_address_district [read,write]\nCOVERED   company.national_address_city [read,write]\nCOVERED   company.national_address_postal_code [read,validate,write]\nCOVERED   company.national_address_additional_no [read,write]\nCOVERED   company.email [read,validate,write]\nCOVERED   company.website [read,validate,write]\nCOVERED   company.payroll_bank_name [read,write]\nCOVERED   company.payroll_iban [read,validate,write]\nCOVERED   company.wps_establishment_id [read,write]\nCOVERED   eos.months_per_year [read,validate,write]\nCOVERED   eos.tier1_years [read,write]\nCOVERED   eos.months_per_year_after [read,write]\nCOVERED   eos.resignation_factors [read,validate,write]\nCOVERED   eos.reason_factors [read,validate,write]\nCOVERED   payroll.cycle_start_day [behaviour,read,validate,write]\nCOVERED   payroll.monthly_days [dead,read,validate,write]\nCOVERED   payroll.daily_hours [read,validate,write]\nCOVERED   payroll.late_deduction_enabled [read,validate,write]\nCOVERED   payroll.salary_evidence_mode [read,validate,write]\nCOVERED   loan.insufficient_net_behavior [read,validate,write]\nCOVERED   loan.exceptional_reason_min_length [behaviour,read,validate,write]\nCOVERED   loan.first_installment_max_months_ahead [read,validate,write]\nCOVERED   loan.request_from_day [behaviour,read,validate,write]\nCOVERED   loan.request_to_day [behaviour,read,write]\nCOVERED   loan.request_open [behaviour,read,validate,write]\nCOVERED   payroll.policy.default_period_type [read,write]\nCOVERED   payroll.policy.cycle_end_mode [read,write]\nCOVERED   payroll.policy.cycle_end_day [read,validate,write]\nCOVERED   payroll.policy.base_days_basis [read,write]\nCOVERED   payroll.policy.rate_base [read,write]\nCOVERED   payroll.policy.rounding_mode [read,validate,write]\nCOVERED   payroll.policy.rounding_scale [read,validate,write]\nCOVERED   payroll.policy.division_by_zero_mode [read,write]\nCOVERED   payroll.policy.max_deduction_pct_of_gross [read,write]\nCOVERED   payroll.policy.min_net_guarantee [read,validate,write]\nCOVERED   payroll.policy.net_floor_pct [behaviour,read,write]\nCOVERED   payroll.policy.carry_over_excess [read,write]\nCOVERED   payroll.policy.skip_attendance [read,write]\nCOVERED   payroll.early_leave_deduction_enabled [read,write]\nCOVERED   payroll.hourly_rate_basis [dead,read,validate,write]\nCOVERED   payroll.day_rate_basis [dead,read,validate,write]\nCOVERED   payroll.loan_catchup_max_overdue [read,validate,write]\nCOVERED   overtime.default_window [dead,read,validate,write]\nCOVERED   overtime.outside_window_policy [dead,read,validate,write]\nCOVERED   payroll.approval_self_approval_allowed [authority,read,write]\nCOVERED   payroll.exempt_overtime_eligible [read,validate,write]\nCOVERED   payroll.exempt_unpaid_leave_deductible [read,write]\nCOVERED   payroll.exemption_reason_min_length [read,validate,write]\nCOVERED   deductions.reason_min_length [behaviour,read,validate,write]\nCOVERED   deductions.duplicate_window_hours [read,write]\nCOVERED   deductions.bulk_max_employees [read,validate,write]\nCOVERED   deductions.step_sla_hours [read,write]\nCOVERED   deductions.objection_window_days [read,validate,write]\nCOVERED   deductions.max_carry_forward_count [read,write]\nCOVERED   deductions.repeat_deduction_threshold [read,write]\nCOVERED   deductions.manager_creation_enabled [read,validate,write]\nCOVERED   deductions.missing_approver_fallback [read,validate,write]\nCOVERED   deductions.sla_breach_action [read,validate,write]\nCOVERED   deductions.objection_blocks_approval [read,write]\nCOVERED   bonuses.reason_min_length [behaviour,read,validate,write]\nCOVERED   bonuses.duplicate_window_hours [read,write]\nCOVERED   bonuses.bulk_max_employees [read,write]\nCOVERED   bonuses.manager_creation_enabled [read,write]\nCOVERED   bonuses.missing_approver_fallback [read,validate,write]\nCOVERED   financial_exemptions.reason_min_length [read,write]\nCOVERED   financial_exemptions.attachment_threshold_days [read,write]\nCOVERED   financial_exemptions.max_per_employee_year [read,write]\nCOVERED   financial_exemptions.max_pct_per_grantor [read,validate,write]\nCOVERED   financial_exemptions.cooldown_hours [read,validate,write]\nCOVERED   financial_exemptions.repeat_alert_count [read,write]\nCOVERED   financial_exemptions.type_drain_alert_pct [read,write]\nCOVERED   financial_exemptions.department_manager_enabled [read,validate,write]\nCOVERED   auth.two_factor_enabled [read]\nCOVERED   auth.domain_autoprovision_enabled [read]\nEXTRA     evil.injected_key [write]\nEXTRA     settings/leave-types [behaviour]\nEXTRA     branches [behaviour]\nEXTRA     departments [behaviour]\nEXTRA     teams [behaviour]\nEXTRA     catalogs/job-titles [behaviour]\nEXTRA     catalogs/grades [behaviour]\nEXTRA     catalogs/cost-centers [behaviour]\nEXTRA     catalogs/asset-types [behaviour]\nEXTRA     catalogs/permission-types [behaviour]\nEXTRA     catalogs/doc-types [behaviour]\nEXTRA     catalogs/shifts [behaviour]\nEXTRA     catalogs/work-schedules [behaviour]\nEXTRA     attendance/schedule-rules [behaviour]\nEXTRA     catalogs/holidays [behaviour]\nEXTRA     roles [behaviour]\nEXTRA     users [behaviour]\nEXTRA     settings/approval-chains [behaviour]\nEXTRA     settings/request-types [behaviour]\nEXTRA     deductions/types [behaviour]\nEXTRA     bonuses/types [behaviour]\n===== TOTALS: keys=136 covered=136 checks=360 passed=359 failed=1 =====\n\nreport: D:\\projects\\hr_system\\api\\test\\codex-review-round5-settings-findings.cjs\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_settings_test_76d4a3d991649638\"}\n"
  ]
}
