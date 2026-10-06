module.exports = {
  "selected": [
    "codex-review-p2u-draft-controls",
    "request-execution",
    "request-category-chains",
    "payroll-salary-request",
    "request-decision-race",
    "payroll-typed-deductions",
    "payroll-bonuses"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 110,
      "failed": 9,
      "passed": 101,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 110,
      "suites": 0
    },
    "duration_ms": 56964.7409
  },
  "results": [
    {
      "file": "codex-review-p2u-draft-controls.integration.cjs",
      "name": "P2U edited draft cannot use resubmission or caller-supplied bypass flags to evade first-submission audience",
      "ms": 5399.7404,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2u-draft-controls.integration.cjs:9:98)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2u-draft-controls.integration.cjs",
      "name": "P2U real returned request continues after loss of audience while another never-submitted draft is denied",
      "ms": 253.2834,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 7461.3732,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 246.2139,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 321.7223,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 127.6068,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 1133.7921,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 210.8492,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 89.8476,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 264.3225,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 217.4433,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 229.3241,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.5013,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 274.9234,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 74.895,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 241.0752,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 128.8059,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 60.6142,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 215.656,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 60.8096,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 270.0617,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 106.5323,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 169.448,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1817.2643,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 314.7299,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 352.5345,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 769.5463,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 88.8106,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 120.4643,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 82.5332,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 206.9592,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 391.4341,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 399.0068,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 77.9602,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 89.4346,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 237.2227,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 91.3103,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 196.4497,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 97.8367,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 254.2006,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 168.062,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 148.642,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-01: من غير أي ربط — كل فئة من غير سلسلة، وكل نوع على سلسلته، والباب المالي «ثابت» بسببه",
      "ms": 7614.9814,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-02: ربط الإجازات بسلسلة موجودة ينقل المختارين بس — والتالت بيفضل على سلسلته",
      "ms": 54.713,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-03: الحضور على نفس سلسلة الإجازات — «مشتركة مع» في الخريطة",
      "ms": 30.4358,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ",
      "ms": 439.5511,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين",
      "ms": 361.1059,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة",
      "ms": 105.6589,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)",
      "ms": 118.3807,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك",
      "ms": 160.8283,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-09: الرفض — سلسلة فرع أو معطّلة أو فاضية، نوع من فئة تانية، الباب المالي، الإضافي على سلسلة بلا معتمدين، وطلب ناقص",
      "ms": 232.7805,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه",
      "ms": 211.7968,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس",
      "ms": 22.9698,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-12: ربط الفئة مايتكتبش من إعدادات النظام العامة، وسلسلة الفئة ماتتنقلش لفرع حتى لو مفيش نوع عليها",
      "ms": 102.897,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "HTTP catalog upgrades salary fields without changing the stored request catalog",
      "ms": 6960.4255,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "HTTP salary payload rejects missing or daily-dated payroll months, numeric money and forged server metadata before creating a draft",
      "ms": 110.461,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "HTTP final approval writes one payroll-month salary revision with six exact amounts and actual HR actor",
      "ms": 257.4643,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "server-derived ten percent retains executive approval despite forged caller percentage; scope cannot bypass it and only HR authority may push the executive step",
      "ms": 314.8239,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "next-month approved request leaves salary and history unchanged until its payroll cycle starts, then runs once",
      "ms": 221.0353,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "salary source drift rolls back final approval and returning/resubmitting rebuilds the source basis",
      "ms": 271.9361,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "employee branch drift and cross-branch submission cannot change financial data",
      "ms": 101.9362,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "legacy request without a payroll month cannot be approved implicitly and can be returned for explicit monthly resubmission",
      "ms": 169.3259,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "resubmission with owner-configured auto approval records the current actor rather than an older approval",
      "ms": 289.8039,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "concurrent final approval and retry leave one salary revision and one financial audit",
      "ms": 169.6634,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "request execution preserves cents above safe integer range in current salary, history and audit",
      "ms": 138.1811,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "authorized rejection recovers a stale future salary request without reversing money or allowing scheduled execution",
      "ms": 327.5691,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "rejection guard refuses a scheduled-status salary request with any existing financial reference",
      "ms": 146.051,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "rejection guard also refuses legacy APPROVED salary status when its financial change already exists",
      "ms": 139.1495,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "administrative rejection cannot use request ownership or wildcard permissions to cross the request branch",
      "ms": 175.7332,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "Owner 26-Sep: an increase HR files on behalf is approved and applied at once for the current payroll month, with HR as actor in history, audit and approval evidence",
      "ms": 108.2471,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "Owner 26-Sep: an HR increase above the executive threshold passes every conditional step at once; a next-month one is scheduled with the HR decision and applied when its cycle starts",
      "ms": 239.0057,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "Owner 26-Sep: a salary basis problem refuses the HR instant approval as a whole — no draft, no decision, no money",
      "ms": 54.5295,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "salary requests do not create payroll, attendance, overtime, loans or offboarding effects",
      "ms": 16.7764,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 24.8039,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.4037,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.048,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0287,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0391,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0244,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0233,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0249,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 9905.246,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2759.0864,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 566.6986,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 249.9866,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 470.5921,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 56.3633,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1502.5243,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 252.3216,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 415.5621,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 434.0516,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 452.6418,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 1716.9612,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 42.5442,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 281.9939,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 281.6992,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 9401.4596,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2470.791,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 427.1459,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 199.7513,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 68.3291,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1316.9452,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 472.8656,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 147.2768,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 474.6858,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1002.4794,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
      "ms": 371.3455,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
      "ms": 1675.1698,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
      "ms": 883.1415,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
      "ms": 1599.1609,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2u-draft-controls.integration.cjs",
      "name": "P2U edited draft cannot use resubmission or caller-supplied bypass flags to evade first-submission audience",
      "ms": 5399.7404,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2u-draft-controls.integration.cjs:9:98)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 24.8039,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.4037,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.048,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0287,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0391,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0244,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0233,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0249,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_de45e21950a86479'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_category_chains_test_d289f174b34ed310 is absent from sys.databases.",
    "تم التحقق من حذف قاعدة الاختبار: hr_payroll_salary_request_test_20e53d454fea7b3b",
    "تم التحقق من حذف مجلد مرفقات الاختبار المؤقت.",
    "Cleanup verified: hr_payroll_typed_deductions_test_5823df005bfc3e89 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_bonuses_test_6d809d8bbc8de9e1 is absent from sys.databases.",
    "tests 110",
    "suites 0",
    "pass 101",
    "fail 9",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 56964.7409"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_draft_controls_test_dd80c4a800d3f70c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_draft_controls_test_dd80c4a800d3f70c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2u_draft_controls_test_dd80c4a800d3f70c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_a4a1fa932bd561c4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_a4a1fa932bd561c4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_category_chains_test_d289f174b34ed310\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_category_chains_test_d289f174b34ed310\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_salary_request_test_20e53d454fea7b3b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_salary_request_test_20e53d454fea7b3b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_typed_deductions_test_5823df005bfc3e89\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_typed_deductions_test_5823df005bfc3e89\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_bonuses_test_6d809d8bbc8de9e1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_bonuses_test_6d809d8bbc8de9e1\"}\n"
  ]
}
