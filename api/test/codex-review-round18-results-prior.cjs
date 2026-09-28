module.exports = {
  "selected": [
    "codex-review-round17-identity",
    "codex-review-round17-overtime",
    "overtime-auto-approve-period",
    "national-id-or-passport"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 48,
      "failed": 0,
      "passed": 48,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 48,
      "suites": 0
    },
    "duration_ms": 92278.5406
  },
  "results": [
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized passport",
      "ms": 5836.2546,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized national ID",
      "ms": 81.3584,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: legacy passport accepted by old DTO remains editable when form resends it unchanged",
      "ms": 101.8727,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: SQL and JS normalization agree across every stripped character and both Arabic digit sets",
      "ms": 21.6939,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: controlled concurrent interleaving after two real preflight checks cannot persist duplicates",
      "ms": 152.1391,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 9144.8287,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 789.8112,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1789.0198,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 1131.1411,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 1069.0642,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 2815.4144,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 964.9585,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 988.3254,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 1185.7954,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 626.8456,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.6848,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 1.6434,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1996.2326,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: exact overnight settlement boundary and fresh conflicting periods",
      "ms": 1449.5409,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: concurrent dispatch creates exactly one financial approval",
      "ms": 929.8911,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: monthly cap rollback leaves no system decision and ordinary chain can approve later",
      "ms": 1325.6233,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: missing punch after detection blocks automatic approval",
      "ms": 669.1974,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 SQL engine and compatibility recorded without company database access",
      "ms": 13.7273,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: automatic and manual amounts survive real payroll approval and payment exactly once",
      "ms": 2687.4052,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 branch: transferred employee automatic overtime does not expose the former branch period name to new branch reader",
      "ms": 1257.3521,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 5439.9962,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 9475.9475,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 1006.216,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 2224.9318,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 1379.9658,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 1567.9037,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 2384.9206,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 760.5607,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 613.8975,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 1095.8767,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 646.8386,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.7327,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 2.5709,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1642.5482,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 4940.7995,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-01: الإنشاء بالجواز لوحده، أو بهوية بأي صيغة لوحدها (حروف وشرطة وطول أجنبي) — والمحفوظ مطبّع",
      "ms": 8874.9754,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-02: الاتنين فاضيين = 400 برسالة واحدة، والشكل الغلط 400 برسالته",
      "ms": 43.0839,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-03: التكرار على القيمة المطبّعة — «a 123» و«A123» نفس الجواز (409)، والمحفوظ القديم بمسافات وأرقام عربية بيتطابق",
      "ms": 477.9146,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-04: التعديل — مسح واحد والتاني موجود مسموح، مسح الاتنين 400، ونفس الرقم بشكل تاني مش تغيير",
      "ms": 311.8489,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-05: ملف قديم من غير هوية ولا جواز يفتح ويحفظ باقي حقوله، وقيمة مكررة من قبل القرار مابتمنعش الحفظ",
      "ms": 274.9017,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-06: التحديث الجماعي من ملف — الجواز عمود جديد، الهوية بأي صيغة، واحد منهم لكل صف، والتكرار (موظف تاني وجوه الملف)",
      "ms": 252.4367,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-07: إخفاء اسم صاحب الرقم المكرر لحساب فرع تاني زي ما هو — في الإضافة والتعديل والملف",
      "ms": 82.6077,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-08: التصدير لموظف بالجواز بس — عمود الهوية فاضي وعمود الجواز بقيمته",
      "ms": 202.076,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"passport-race\",\"statuses\":[409,200],\"persisted\":[{\"id\":2,\"passportNo\":\"RACEP123\"}]}",
    "{\"case\":\"national-id-race\",\"statuses\":[409,200],\"persisted\":[{\"id\":4,\"nationalId\":\"RACEI123\"}]}",
    "{\"case\":\"legacy-form\",\"sharedValidationIssues\":0,\"partialPatch\":200,\"formPatch\":200,\"phone\":\"0550002222\"}",
    "{\"case\":\"controlled-identity-race\",\"field\":\"passportNo\",\"preflightPassed\":3,\"statuses\":[409,200],\"persisted\":1}",
    "{\"case\":\"controlled-identity-race\",\"field\":\"nationalId\",\"preflightPassed\":3,\"statuses\":[200,409],\"persisted\":1}",
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "{\"case\":\"night-boundary\",\"endsAt\":\"2026-09-24T13:00:00.000Z\",\"settledAt\":\"2026-09-24T14:10:00.000Z\",\"before\":false,\"at\":true}",
    "{\"case\":\"concurrent-auto-approval\",\"responses\":[{\"routed\":0,\"autoApproved\":0},{\"routed\":0,\"autoApproved\":0},{\"routed\":0,\"autoApproved\":1},{\"routed\":0,\"autoApproved\":0}],\"requests\":1,\"decisions\":1,\"amount\":140.62}",
    "{\"case\":\"monthly-fallback\",\"systemDecisions\":0,\"manualDecisions\":3,\"amount\":140.62}",
    "{\"case\":\"sql-version\",\"version\":\"16.0.4255.1\",\"compatibility\":150}",
    "{\"case\":\"auto-manual-payroll-paid\",\"approve\":201,\"pay\":201,\"repeatPay\":400,\"overtimeAmounts\":[140.62,140.62],\"overtimeTotal\":281.24}",
    "{\"case\":\"transferred-auto-period-scope\",\"transfer\":200,\"detail\":200,\"periodHiddenInList\":true,\"comment\":\"اعتماد تلقائي — فترة إضافي مفتوحة عليها «اعتماد تلقائي» في فرع يوم العمل\",\"storedEvidenceReason\":\"فترة إضافي في فرع تاني\",\"leaked\":false}",
    "Cleanup verified: hr_ot_auto_approve_test_f3f7d6c2c3cdb2cd is absent from sys.databases.",
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "Cleanup verified: hr_ot_auto_approve_test_3107eec39f32017e is absent from sys.databases.",
    "Cleanup verified: hr_identity_test_bc9c6d163ed72423 is absent from sys.databases.",
    "tests 48",
    "suites 0",
    "pass 48",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 92278.5406"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r17_identity_test_67b4e6478e7a1beb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r17_identity_test_67b4e6478e7a1beb\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r17_identity_test_67b4e6478e7a1beb\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_f3f7d6c2c3cdb2cd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_f3f7d6c2c3cdb2cd\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_3107eec39f32017e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_3107eec39f32017e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_identity_test_bc9c6d163ed72423\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_identity_test_bc9c6d163ed72423\"}\n"
  ]
}
