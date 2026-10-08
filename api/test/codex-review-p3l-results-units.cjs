module.exports = {
  "selected": [
    "codex-review-p3l-unit-preboarding",
    "codex-review-p3l-unit-surveys",
    "codex-review-p3l-unit-cases",
    "codex-review-p3l-unit-performance-goals",
    "codex-review-p3l-unit-performance-reviews",
    "codex-review-p3l-unit-helpdesk",
    "codex-review-p3l-unit-training",
    "codex-review-p3l-unit-modules-registry",
    "codex-review-p3l-unit-modules-ui",
    "codex-review-p3l-unit-policies-ui",
    "codex-review-p3l-unit-routes-guards",
    "codex-review-p3l-unit-candidate-applications",
    "codex-review-p3l-unit-dependents",
    "codex-review-p3l-unit-session-cookie"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 65,
      "failed": 0,
      "passed": 65,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 65,
      "suites": 0
    },
    "duration_ms": 36456.6533
  },
  "results": [
    {
      "file": "preboarding.test.cjs",
      "name": "PG-01: the mark closes the session until the start day only; a system admin and an unlinked account stay outside",
      "ms": 1.0921,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-02: the feature is closed by default; the guard, the permission-less session, and the allowed routes",
      "ms": 45.5373,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-03: the web app sends a pre-boarding account to its documents, lists the pre-boarding screens only, and greets it with the start date",
      "ms": 2.4493,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-01: title, kind, minimum group, questions keyed by the server, and answers of each question type only",
      "ms": 2.0576,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-02: eNPS and the summary, groups shown without one that lets a hidden group be subtracted, and the comment threshold from its setting",
      "ms": 0.5387,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-03: a new closed module, a two-stage answer with no link from the response to the invitation, no audit line, the routes and the screens",
      "ms": 18.3557,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-11: case values, the objection window from its setting, and the conflict of interest",
      "ms": 1.4711,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-12: a new closed module with its permission and request destination, access by case membership under the row lock, the conflict judged inside the transaction, the decision conditions, the objection, and the routes",
      "ms": 17.2943,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-13: case attachments by membership (upload, one-time conditional attach under the case lock, download by the case rule) and the real screens",
      "ms": 2.7403,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-14: the penalties catalog steps, the step for a repetition, the counting window, and applying under the employee row lock with the deduction created through the typed-deductions service outside the transaction",
      "ms": 203.2185,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.test.cjs",
      "name": "PU-01: title, kind, weight, values, period, reason and the employee stamp",
      "ms": 2.5881,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.test.cjs",
      "name": "PU-02: a new closed module with its permission, the judgment before the transaction and the locks inside it, and the routes",
      "ms": 11.7637,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-01: sections with weights, items and server keys; cycle kind, dates and audience",
      "ms": 1.8141,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-02: answers against the frozen template and the period goals, and the weighted score",
      "ms": 0.7056,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-03: launching and submitting under the row lock with the judgment after it, no other service inside the transaction, and the routes",
      "ms": 1.2281,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-04: calibration bands, guide distribution and cleaners; the adjustment judged again under the locks in the objection order; the objection staged by the request under the assignment lock",
      "ms": 14.5645,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-05: reward suggestions — the rule values, no bonus written by the suggestion, the manager submits through the bonuses service outside any transaction after claiming the row, and the improvement plan kind",
      "ms": 363.9808,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-01: rating and comment, the first-response limit from its setting, the report range and the average",
      "ms": 1.9618,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-02: a new closed module owning the inquiry types, the category and the seed, the rating under the request row lock, the scoped report, and the routes",
      "ms": 103.8865,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-03: knowledge base — article values, search matching, the reader limited to published articles in the viewer audience, and management within the branch scope under the row lock",
      "ms": 93.8035,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.test.cjs",
      "name": "TU-01: course and session values, the enrollment marks, the rating and the certificate expiry",
      "ms": 1.8824,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.test.cjs",
      "name": "TU-02: a new closed module with its permission, enrolling under the session row lock, marking under the enrollment row lock, the certificate as an employee document, and the routes",
      "ms": 12.6842,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.test.cjs",
      "name": "TU-03: the training request destination — a selectable handler owned by the module, the session staged by the server, enrollment at final approval under the session row lock, and the real screens",
      "ms": 6.3078,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.test.cjs",
      "name": "TU-04: the department budget written once per department and year under a range lock, the report within the branch scope, and mandatory training judged by scope",
      "ms": 31.8326,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
      "ms": 0.8838,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
      "ms": 0.5119,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
      "ms": 6.9472,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
      "ms": 0.2737,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
      "ms": 0.1499,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
      "ms": 0.1754,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
      "ms": 0.1508,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
      "ms": 11.6356,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
      "ms": 0.2994,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
      "ms": 91.791,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-01: كل شاشة لها صاحب (موديول أو ميزة شاشات العرض)، وكل مسار في السجل له صفحة",
      "ms": 381.9551,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-02: القايمة الجانبية من السجل — الوهمي ورا ميزته، وبنود الموديول المقفول مختفية",
      "ms": 63.3552,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-03: modules.ts — قراءة واحدة للجلسة بكاش مربوط بيها، وفشل الخادم افتراضي السجل، والمسح بيقرا من جديد",
      "ms": 2.8394,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-04: حارس المسارات — «الصفحة دي مش متاحة» قبل فحص الصلاحية، والإطار مابيتعرضش قبل ما الحالة تتقري",
      "ms": 2.1073,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-05: <ModuleGate> — الجزء بيختفي لو الموديول أو الميزة مقفولين",
      "ms": 0.5184,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-06: شاشة «الإعدادات ← الموديولات» — في القايمة بصلاحيتها، وبتأكد القفل بأثره، وبتعرض فرق الباقة",
      "ms": 7.6904,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-07: الحالة بتتجدد من غير دخول جديد — القديم بيتعرض والجديد في الخلفية، ومسار «مش موجود» بيجدّد",
      "ms": 5.2622,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-08: شاشات الأساس مع موديول مقفول — اللينك مابيتعرضش، والجزء مابيتطلبش ولا بيوقّع الشاشة",
      "ms": 24.6156,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-01: القواعد الصافية — النسخة السارية والجاية، وأساس الإقرار، وموعد القفل، وحالة الموظف",
      "ms": 9.2267,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-02: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، والمسارات الثابتة قبل ‎:id، والمسارات المسموحة والحساب مقفول",
      "ms": 128.8287,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-03: ربط البوابة في الواجهة — التحويل بكود الخادم، والفحص مرة مع كل دخول، وشاشة الإقرار والقارئ",
      "ms": 4.7085,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-04: الشاشات والقايمة الجانبية وصلاحيات المسارات والتقرير",
      "ms": 3.587,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-05: ملف السياسة بالتدفق — البصمة والحجم من غير تحميل الملف كله، وتيار الإرسال بيقطع قبل ما يكمل لو الملف مش هو",
      "ms": 12.1981,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 2.1858,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 2.2031,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.9698,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 1.8815,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 1491.3218,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-01: phone, e-mail and id normalisation, and the typed id and source",
      "ms": 2.6287,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-02: adding and applying run under the job row lock with the judgment after it, and the routes are guarded",
      "ms": 3.8973,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-03: public applications — applicant values and consent, the attempt limiter, a closed feature without a session guard on purpose",
      "ms": 13.0695,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-04: stage moves — values, rows locked in id order, the stage column only, and the standing edit goes through the same place",
      "ms": 34.7682,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-05: interviews — values, the invite file, the judgment order in scheduling and submitting, and the routes",
      "ms": 4.0013,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-06: offers — values, the token hash, who may do what, transitions under the offer row lock, and the public answer link",
      "ms": 78.0851,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-07: hiring from an offer — the job closes under its row lock when its openings are filled, after the hire is recorded",
      "ms": 11.4112,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-08: recruitment numbers — day differences and averages, behind the recruitment permission and the branch scope",
      "ms": 27.1871,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.test.cjs",
      "name": "DU-01: values for adding and for editing, the removal reason, and the request form fields",
      "ms": 3.1543,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.test.cjs",
      "name": "DU-02: a new closed module in the basic preset with its request handler, writes under the employee row lock then the dependent row, the request destination wiring, the seed untouched, and the card",
      "ms": 124.1071,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-01: cookie attributes from the environment, its name, the Set-Cookie value, reading it, and the CSRF verdict",
      "ms": 2.3354,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-02: the server reads Bearer first with one reader for both the token and the verdict, checks CSRF after the account, and hands the cookie over",
      "ms": 26.2243,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-03: the web app keeps no token — nothing in storage, no Authorization header, every call through the session with the CSRF token on writes",
      "ms": 799.4723,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 65",
    "suites 0",
    "pass 65",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 36456.6533"
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
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
