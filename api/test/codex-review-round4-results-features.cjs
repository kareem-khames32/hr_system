module.exports = {
  "selected": [
    "user-branch-scopes",
    "hr-final-authority",
    "request-category-chains",
    "attendance-employment-window"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 30,
      "failed": 0,
      "passed": 30,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 30,
      "suites": 0
    },
    "duration_ms": 37588.2979
  },
  "results": [
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
      "ms": 7662.7608,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
      "ms": 272.6303,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
      "ms": 226.5969,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
      "ms": 322.1323,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
      "ms": 398.9352,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
      "ms": 297.4992,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
      "ms": 298.2606,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
      "ms": 168.5099,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
      "ms": 105.5038,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: promotion, title change, contract renewal and secondment HR files on behalf are approved at once and execute exactly as after the last approver",
      "ms": 5250.2152,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: a resignation HR files on behalf is approved at once, puts the employee in notice period and opens the offboarding case",
      "ms": 137.7714,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: money requests HR files on behalf are approved at once and post their ledger entries — expense, per diem and adjustment",
      "ms": 195.9004,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: a creator without HR authority keeps the whole chain for the same types and never approves his own; HR own resignation keeps its chain too",
      "ms": 167.3264,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-01: من غير أي ربط — كل فئة من غير سلسلة، وكل نوع على سلسلته، والباب المالي «ثابت» بسببه",
      "ms": 5279.542,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-02: ربط الإجازات بسلسلة موجودة ينقل المختارين بس — والتالت بيفضل على سلسلته",
      "ms": 39.2399,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-03: الحضور على نفس سلسلة الإجازات — «مشتركة مع» في الخريطة",
      "ms": 34.7725,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ",
      "ms": 277.6001,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين",
      "ms": 273.7713,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة",
      "ms": 74.3399,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)",
      "ms": 90.8977,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك",
      "ms": 140.9787,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-09: الرفض — سلسلة فرع أو معطّلة أو فاضية، نوع من فئة تانية، الباب المالي، الإضافي على سلسلة بلا معتمدين، وطلب ناقص",
      "ms": 220.362,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه",
      "ms": 135.9973,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس",
      "ms": 19.0495,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-12: ربط الفئة مايتكتبش من إعدادات النظام العامة، وسلسلة الفئة ماتتنقلش لفرع حتى لو مفيش نوع عليها",
      "ms": 36.6702,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-01: the schedule stores its exceptions with the company payroll cycle pinned, and rejects meaningless ones",
      "ms": 5060.1684,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-02: last Saturday of the payroll month is a working day for schedule A only; schedule B works every Saturday",
      "ms": 255.0896,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-03: no absence after the last working day while the offboarding case is still open; stale rows are cleared and not reported",
      "ms": 449.0452,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-04: bulk assignments stop at each employee's service window without blocking the others",
      "ms": 987.2561,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-employment-window.integration.cjs",
      "name": "EW-05: the employment-windows endpoint feeds the weekly schedule (who serves the shown week)",
      "ms": 14.236,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_user_branch_scopes_test_e2dcaaf9825e7bfb removed.",
    "Cleanup verified: hr_category_chains_test_eaa450205c54a144 is absent from sys.databases.",
    "tests 30",
    "suites 0",
    "pass 30",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 37588.2979"
  ],
  "stdout": []
}
