module.exports = {
  "selected": [
    "codex-review-round17-overtime"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 19,
      "failed": 0,
      "passed": 19,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 19,
      "suites": 0
    },
    "duration_ms": 34273.7693
  },
  "results": [
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 10216.3137,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 855.3365,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1867.1676,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 1033.918,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 1072.6761,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 2081.1126,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 728.5444,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 674.5704,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 984.9208,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 490.824,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.5074,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 2.2406,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1313.5053,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: exact overnight settlement boundary and fresh conflicting periods",
      "ms": 1000.173,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: concurrent dispatch creates exactly one financial approval",
      "ms": 633.2949,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: monthly cap rollback leaves no system decision and ordinary chain can approve later",
      "ms": 932.1607,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: missing punch after detection blocks automatic approval",
      "ms": 484.4381,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 SQL engine and compatibility recorded without company database access",
      "ms": 11.5723,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 5308.9834,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "{\"case\":\"night-boundary\",\"endsAt\":\"2026-09-24T13:00:00.000Z\",\"settledAt\":\"2026-09-24T14:10:00.000Z\",\"before\":false,\"at\":true}",
    "{\"case\":\"concurrent-auto-approval\",\"responses\":[{\"routed\":0,\"autoApproved\":1},{\"routed\":0,\"autoApproved\":0},{\"routed\":0,\"autoApproved\":0},{\"routed\":0,\"autoApproved\":0}],\"requests\":1,\"decisions\":1,\"amount\":140.62}",
    "{\"case\":\"monthly-fallback\",\"systemDecisions\":0,\"manualDecisions\":3,\"amount\":140.62}",
    "{\"case\":\"sql-version\",\"version\":\"16.0.4255.1\",\"compatibility\":150}",
    "Cleanup verified: hr_ot_auto_approve_test_268ba2b0c363162e is absent from sys.databases.",
    "tests 19",
    "suites 0",
    "pass 19",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 34273.7693"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_268ba2b0c363162e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_268ba2b0c363162e\"}\n"
  ]
}
