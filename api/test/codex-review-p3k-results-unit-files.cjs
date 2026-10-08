module.exports = {
  "selected": [
    "codex-review-p3k-unit-announcements",
    "codex-review-p3k-unit-branch-separation",
    "codex-review-p3k-unit-candidate-applications",
    "codex-review-p3k-unit-candidate-hire-required",
    "codex-review-p3k-unit-cases",
    "codex-review-p3k-unit-dependents",
    "codex-review-p3k-unit-helpdesk",
    "codex-review-p3k-unit-modules-registry",
    "codex-review-p3k-unit-modules-ui",
    "codex-review-p3k-unit-onboarding-templates",
    "codex-review-p3k-unit-performance-goals",
    "codex-review-p3k-unit-performance-reviews",
    "codex-review-p3k-unit-policies-ui",
    "codex-review-p3k-unit-preboarding",
    "codex-review-p3k-unit-probation",
    "codex-review-p3k-unit-recruitment-jobs",
    "codex-review-p3k-unit-report-day-range-ui",
    "codex-review-p3k-unit-routes-guards",
    "codex-review-p3k-unit-scheduled-jobs",
    "codex-review-p3k-unit-session-cookie",
    "codex-review-p3k-unit-surveys",
    "codex-review-p3k-unit-tasks-ui",
    "codex-review-p3k-unit-training"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 114,
      "failed": 0,
      "passed": 114,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 114,
      "suites": 0
    },
    "duration_ms": 36086.6091
  },
  "results": [
    {
      "file": "announcements.test.cjs",
      "name": "AU-01: title, body, dates, the audience text and its branch scope, and when an announcement is live",
      "ms": 2.3449,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-02: the module, its permission, guarded routes, writes under the row lock, and the «new announcement» event judged at dispatch, at send and in the list",
      "ms": 25.854,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-03: the announcements screen — the board for everyone, management for the permission holder, the sidebar item and the page title",
      "ms": 2.4707,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-04: the attachment is bound once under the row lock and read by the announcement's rule; occasions give the next day without the birth year",
      "ms": 5.2183,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "candidates: a branch user lists only his branch (and unassigned), creates into his branch, and cannot edit another branch",
      "ms": 3.4172,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions run screen: a run with no member in the user branch is out of scope (snapshot or legacy branch)",
      "ms": 0.6747,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions service wires the run scope gate into runView and candidates, and filters recalc ids by branch",
      "ms": 1.6302,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a branch-scoped call touches only that branch employees; null keeps the company-wide job",
      "ms": 2.3702,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a multi-branch scope touches exactly those branches",
      "ms": 0.4344,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "payroll draft calculate / recalculate check the run branch scope before revealing its status",
      "ms": 1.4819,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-01: phone, e-mail and id normalisation, and the typed id and source",
      "ms": 1.7405,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-02: adding and applying run under the job row lock with the judgment after it, and the routes are guarded",
      "ms": 2.0408,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-03: public applications — applicant values and consent, the attempt limiter, a closed feature without a session guard on purpose",
      "ms": 8.399,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-04: stage moves — values, rows locked in id order, the stage column only, and the standing edit goes through the same place",
      "ms": 16.6783,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-05: interviews — values, the invite file, the judgment order in scheduling and submitting, and the routes",
      "ms": 2.3702,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-06: offers — values, the token hash, who may do what, transitions under the offer row lock, and the public answer link",
      "ms": 43.9835,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-07: hiring from an offer — the job closes under its row lock when its openings are filled, after the hire is recorded",
      "ms": 1.5009,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-08: recruitment numbers — day differences and averages, behind the recruitment permission and the branch scope",
      "ms": 10.8531,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-hire-required.test.cjs",
      "name": "POST /candidates/:id/hire بيتحقق من نفس الحقول الإجبارية بتاعة إضافة الموظف",
      "ms": 4.1369,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-hire-required.test.cjs",
      "name": "الخدمة نفسها بتفرض الحقول الإجبارية وشكلها على أي مسار إنشاء، قبل أي قراءة أو كتابة",
      "ms": 1.7079,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-hire-required.test.cjs",
      "name": "التعيين بيبعت بيانات النموذج كاملة للخدمة بنطاق فرع المستخدم، وبيقفل المرشح؛ والفرع التاني ممنوع",
      "ms": 0.6215,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-hire-required.test.cjs",
      "name": "شاشة التعيين: نموذج الإضافة متعبّي من المرشح (الاسم غير العربي في خانات الإنجليزي)، وشاشتا التوظيف بتفتحه",
      "ms": 4.7468,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-11: case values, the objection window from its setting, and the conflict of interest",
      "ms": 1.5747,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-12: a new closed module with its permission and request destination, access by case membership under the row lock, the conflict judged inside the transaction, the decision conditions, the objection, and the routes",
      "ms": 16.4826,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-13: case attachments by membership (upload, one-time conditional attach under the case lock, download by the case rule) and the real screens",
      "ms": 2.377,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-14: the penalties catalog steps, the step for a repetition, the counting window, and applying under the employee row lock with the deduction created through the typed-deductions service outside the transaction",
      "ms": 202.3989,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.test.cjs",
      "name": "DU-01: values for adding and for editing, the removal reason, and the request form fields",
      "ms": 1.8802,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.test.cjs",
      "name": "DU-02: a new closed module in the basic preset with its request handler, writes under the employee row lock then the dependent row, the request destination wiring, the seed untouched, and the card",
      "ms": 19.4152,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-01: rating and comment, the first-response limit from its setting, the report range and the average",
      "ms": 1.6206,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-02: a new closed module owning the inquiry types, the category and the seed, the rating under the request row lock, the scoped report, and the routes",
      "ms": 110.1133,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-03: knowledge base — article values, search matching, the reader limited to published articles in the viewer audience, and management within the branch scope under the row lock",
      "ms": 38.8716,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
      "ms": 0.9949,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
      "ms": 0.5448,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
      "ms": 7.0856,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
      "ms": 0.3543,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
      "ms": 0.4563,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
      "ms": 0.352,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
      "ms": 0.2726,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
      "ms": 15.0717,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
      "ms": 0.5277,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
      "ms": 91.2426,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-01: كل شاشة لها صاحب (موديول أو ميزة شاشات العرض)، وكل مسار في السجل له صفحة",
      "ms": 388.9635,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-02: القايمة الجانبية من السجل — الوهمي ورا ميزته، وبنود الموديول المقفول مختفية",
      "ms": 64.1405,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-03: modules.ts — قراءة واحدة للجلسة بكاش مربوط بيها، وفشل الخادم افتراضي السجل، والمسح بيقرا من جديد",
      "ms": 2.0363,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-04: حارس المسارات — «الصفحة دي مش متاحة» قبل فحص الصلاحية، والإطار مابيتعرضش قبل ما الحالة تتقري",
      "ms": 1.9713,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-05: <ModuleGate> — الجزء بيختفي لو الموديول أو الميزة مقفولين",
      "ms": 0.5553,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-06: شاشة «الإعدادات ← الموديولات» — في القايمة بصلاحيتها، وبتأكد القفل بأثره، وبتعرض فرق الباقة",
      "ms": 8.3957,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-07: الحالة بتتجدد من غير دخول جديد — القديم بيتعرض والجديد في الخلفية، ومسار «مش موجود» بيجدّد",
      "ms": 6.9435,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-08: شاشات الأساس مع موديول مقفول — اللينك مابيتعرضش، والجزء مابيتطلبش ولا بيوقّع الشاشة",
      "ms": 24.7611,
      "pass": true,
      "skip": false
    },
    {
      "file": "onboarding-templates.test.cjs",
      "name": "OU-01: a template matches when every written scope field equals the employee file; most specific first, then the oldest",
      "ms": 1.3053,
      "pass": true,
      "skip": false
    },
    {
      "file": "onboarding-templates.test.cjs",
      "name": "OU-02: the link column stays outside entity reads and writes, the copy falls back to the general template, and management is scoped",
      "ms": 3.0957,
      "pass": true,
      "skip": false
    },
    {
      "file": "onboarding-templates.test.cjs",
      "name": "OU-03: the template window offers the scoped templates only after the migration, with the same item table",
      "ms": 1.6213,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.test.cjs",
      "name": "PU-01: title, kind, weight, values, period, reason and the employee stamp",
      "ms": 1.8269,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.test.cjs",
      "name": "PU-02: a new closed module with its permission, the judgment before the transaction and the locks inside it, and the routes",
      "ms": 11.2032,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-01: sections with weights, items and server keys; cycle kind, dates and audience",
      "ms": 1.8819,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-02: answers against the frozen template and the period goals, and the weighted score",
      "ms": 0.6911,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-03: launching and submitting under the row lock with the judgment after it, no other service inside the transaction, and the routes",
      "ms": 0.8666,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-04: calibration bands, guide distribution and cleaners; the adjustment judged again under the locks in the objection order; the objection staged by the request under the assignment lock",
      "ms": 14.762,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-05: reward suggestions — the rule values, no bonus written by the suggestion, the manager submits through the bonuses service outside any transaction after claiming the row, and the improvement plan kind",
      "ms": 351.8248,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-01: القواعد الصافية — النسخة السارية والجاية، وأساس الإقرار، وموعد القفل، وحالة الموظف",
      "ms": 9.4803,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-02: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، والمسارات الثابتة قبل ‎:id، والمسارات المسموحة والحساب مقفول",
      "ms": 122.468,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-03: ربط البوابة في الواجهة — التحويل بكود الخادم، والفحص مرة مع كل دخول، وشاشة الإقرار والقارئ",
      "ms": 4.768,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-04: الشاشات والقايمة الجانبية وصلاحيات المسارات والتقرير",
      "ms": 3.4787,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-05: ملف السياسة بالتدفق — البصمة والحجم من غير تحميل الملف كله، وتيار الإرسال بيقطع قبل ما يكمل لو الملف مش هو",
      "ms": 11.6182,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-01: the mark closes the session until the start day only; a system admin and an unlinked account stay outside",
      "ms": 1.0708,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-02: the feature is closed by default; the guard, the permission-less session, and the allowed routes",
      "ms": 44.8804,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-03: the web app sends a pre-boarding account to its documents, lists the pre-boarding screens only, and greets it with the start date",
      "ms": 2.3196,
      "pass": true,
      "skip": false
    },
    {
      "file": "probation.test.cjs",
      "name": "PT-01: the effective end date, the reason, the extension date, the task titles and the row stamp",
      "ms": 1.749,
      "pass": true,
      "skip": false
    },
    {
      "file": "probation.test.cjs",
      "name": "PT-02: the judgment before the transaction and the comparison under the employee row lock; the change log; the daily job and its settings",
      "ms": 3.3909,
      "pass": true,
      "skip": false
    },
    {
      "file": "probation.test.cjs",
      "name": "PT-03: the probation screen, its menu entry and title",
      "ms": 2.0657,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.test.cjs",
      "name": "RU-01: openings, the salary range, the start date, texts, status transitions and what publishing needs",
      "ms": 1.932,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.test.cjs",
      "name": "RU-02: the destination is wired at its seven points, runs with the transaction manager only, and the service is scoped and writes fields",
      "ms": 5.165,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "payroll month: cycle 23 → «راتب سبتمبر» = 23 أغسطس → 22 سبتمبر، ويوم 23 يبدأ شهر أكتوبر",
      "ms": 1.8602,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "the web payroll-month math matches the payroll engine for every cycle day and month (2024–2027)",
      "ms": 4.4705,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "day range editing, validation, overlap and labels",
      "ms": 1.2049,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "month quick-pick helpers: options around the current payroll month, labels, optional max length",
      "ms": 0.8487,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "DayRangeFilter renders the month quick-pick + «من تاريخ / إلى تاريخ» and the payroll-month navigation",
      "ms": 15.0638,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "DayRangeFilter keeps a partially typed date (year typed digit by digit) instead of resetting the input",
      "ms": 0.8168,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "PayrollPeriodSelect: a payroll run stays chosen by period but shows its exact days",
      "ms": 3.9884,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API range helper: from/to wins, month stays backward compatible, bad ranges are 400",
      "ms": 0.8197,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API «تاريخ الطلب» filter: local days → UTC bounds [start, end) for a SYSUTCDATETIME column, both-or-none",
      "ms": 0.4878,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API: deductions and bonuses lists filter «من تاريخ / إلى تاريخ» on the server inside every page (before the 500 cap)",
      "ms": 2.5751,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API: /attendance/payroll-month, and the attendance reports/sheet/overtime/punches accept from/to (parameterised, month still works)",
      "ms": 2.8327,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "attendance screens open on the payroll month with «من تاريخ / إلى تاريخ» (no month picker left)",
      "ms": 8.3285,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "payroll screens: day range on deductions/bonuses/runs report; run period stays a month but shows its exact dates",
      "ms": 5.0246,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "loans screen: filter by request date or by instalment month, with the month quick-pick and exact days",
      "ms": 1.2543,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "reports dashboard: attendance and overtime summaries follow the range filter, not the calendar month",
      "ms": 1.6612,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "attendance fixes: permissions has no unused Calendar import, exemption counters follow the chosen range",
      "ms": 1.2527,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "payroll-period pickers (GOSI, cost centers, financial reports, leave settlement) open on the payroll month and show its days",
      "ms": 3.0825,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "no month-only date filter is left in src/: every remaining month input is a form field or a payroll-run period that shows its days",
      "ms": 296.9054,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "employee-code search, a readable payroll-month placeholder, and every closable leave year",
      "ms": 9.7023,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 1.736,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 1.3363,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.5232,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 1.0228,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 212.2567,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "TZ: الفاضي = توقيت الجهاز، والاسم المعروف مقبول، والغلط بيوقف الإقلاع برسالة واضحة",
      "ms": 3.2797,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "قايمة المهام: كل مهمة بموعد صالح، وكل موعد في الكود من القايمة ومتسجل مرة واحدة، ومفيش @Cron خارجها",
      "ms": 198.5713,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "الشاشة: «المهام المجدولة» في الإعدادات بصلاحية إدارة الإعدادات، والخادم بيشترط حساب على كل الفروع",
      "ms": 2.4895,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-01: cookie attributes from the environment, its name, the Set-Cookie value, reading it, and the CSRF verdict",
      "ms": 1.4718,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-02: the server reads Bearer first with one reader for both the token and the verdict, checks CSRF after the account, and hands the cookie over",
      "ms": 2.8463,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-03: the web app keeps no token — nothing in storage, no Authorization header, every call through the session with the CSRF token on writes",
      "ms": 142.71,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-01: title, kind, minimum group, questions keyed by the server, and answers of each question type only",
      "ms": 1.8849,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-02: eNPS and the summary, groups shown without one that lets a hidden group be subtracted, and the comment threshold from its setting",
      "ms": 0.4099,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-03: a new closed module, a two-stage answer with no link from the response to the invitation, no audit line, the routes and the screens",
      "ms": 14.8294,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 81.8498,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 1.2365,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 1.4113,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 28.1706,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-05: قواعد المالك في الشاشات — الأزرار من حكم الخادم (تمديد، رد، «مش بتاعتي»، رجوع، تقييم)، والمهمة الشخصية وعلامة التقييم في النموذج، وتقرير الالتزام وسجل المهمة",
      "ms": 2.7853,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.test.cjs",
      "name": "TU-01: course and session values, the enrollment marks, the rating and the certificate expiry",
      "ms": 2.6222,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.test.cjs",
      "name": "TU-02: a new closed module with its permission, enrolling under the session row lock, marking under the enrollment row lock, the certificate as an employee document, and the routes",
      "ms": 13.7988,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.test.cjs",
      "name": "TU-03: the training request destination — a selectable handler owned by the module, the session staged by the server, enrollment at final approval under the session row lock, and the real screens",
      "ms": 6.8192,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.test.cjs",
      "name": "TU-04: the department budget written once per department and year under a range lock, the report within the branch scope, and mandatory training judged by scope",
      "ms": 30.0131,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 114",
    "suites 0",
    "pass 114",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 36086.6091"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
