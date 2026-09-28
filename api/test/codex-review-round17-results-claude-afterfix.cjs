module.exports = {
  "selected": [
    "codex-review-round17-identity",
    "codex-review-round17-overtime"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 26,
      "failed": 0,
      "passed": 26,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 26,
      "suites": 0
    },
    "duration_ms": 43582.3157
  },
  "results": [
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized passport",
      "ms": 5186.9073,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized national ID",
      "ms": 67.0692,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: legacy passport accepted by old DTO remains editable when form resends it unchanged",
      "ms": 75.4596,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: SQL and JS normalization agree across every stripped character and both Arabic digit sets",
      "ms": 38.1962,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: controlled concurrent interleaving after two real preflight checks cannot persist duplicates",
      "ms": 140.5022,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 8184.5626,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 923.3866,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 2027.7902,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 1244.472,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 1129.7671,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 1972.626,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 660.3966,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 602.1121,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 1034.4654,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 556.0099,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 1.183,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 2.617,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1614.2689,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: exact overnight settlement boundary and fresh conflicting periods",
      "ms": 1084.8649,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: concurrent dispatch creates exactly one financial approval",
      "ms": 620.5007,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: monthly cap rollback leaves no system decision and ordinary chain can approve later",
      "ms": 1058.8736,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: missing punch after detection blocks automatic approval",
      "ms": 644.2481,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 SQL engine and compatibility recorded without company database access",
      "ms": 13.5932,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: automatic and manual amounts survive real payroll approval and payment exactly once",
      "ms": 2749.0724,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 branch: transferred employee automatic overtime does not expose the former branch period name to new branch reader",
      "ms": 1454.1006,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 4997.7054,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"passport-race\",\"statuses\":[200,409],\"persisted\":[{\"id\":1,\"passportNo\":\"RACEP123\"}]}",
    "{\"case\":\"national-id-race\",\"statuses\":[409,200],\"persisted\":[{\"id\":4,\"nationalId\":\"RACEI123\"}]}",
    "{\"case\":\"legacy-form\",\"sharedValidationIssues\":0,\"partialPatch\":200,\"formPatch\":200,\"phone\":\"0550002222\"}",
    "{\"case\":\"controlled-identity-race\",\"field\":\"passportNo\",\"preflightPassed\":3,\"statuses\":[200,409],\"persisted\":1}",
    "{\"case\":\"controlled-identity-race\",\"field\":\"nationalId\",\"preflightPassed\":3,\"statuses\":[409,200],\"persisted\":1}",
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "{\"case\":\"night-boundary\",\"endsAt\":\"2026-09-24T13:00:00.000Z\",\"settledAt\":\"2026-09-24T14:10:00.000Z\",\"before\":false,\"at\":true}",
    "{\"case\":\"concurrent-auto-approval\",\"responses\":[{\"routed\":0,\"autoApproved\":0},{\"routed\":0,\"autoApproved\":0},{\"routed\":0,\"autoApproved\":1},{\"routed\":0,\"autoApproved\":0}],\"requests\":1,\"decisions\":1,\"amount\":140.62}",
    "{\"case\":\"monthly-fallback\",\"systemDecisions\":0,\"manualDecisions\":3,\"amount\":140.62}",
    "{\"case\":\"sql-version\",\"version\":\"16.0.4255.1\",\"compatibility\":150}",
    "{\"case\":\"auto-manual-payroll-paid\",\"approve\":201,\"pay\":201,\"repeatPay\":400,\"overtimeAmounts\":[140.62,140.62],\"overtimeTotal\":281.24}",
    "{\"case\":\"transferred-auto-period-scope\",\"transfer\":200,\"detail\":200,\"periodHiddenInList\":true,\"comment\":\"اعتماد تلقائي — فترة إضافي مفتوحة عليها «اعتماد تلقائي» في فرع يوم العمل\",\"storedEvidenceReason\":\"فترة إضافي في فرع تاني\",\"leaked\":false}",
    "Cleanup verified: hr_ot_auto_approve_test_b8c5d96780f6912a is absent from sys.databases.",
    "tests 26",
    "suites 0",
    "pass 26",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 43582.3157"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r17_identity_test_62263796b3fbbcbe\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r17_identity_test_62263796b3fbbcbe\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r17_identity_test_62263796b3fbbcbe\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_b8c5d96780f6912a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_b8c5d96780f6912a\"}\n"
  ]
}
