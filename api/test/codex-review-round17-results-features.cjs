module.exports = {
  "selected": [
    "overtime-auto-approve-period",
    "national-id-or-passport"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 22,
      "failed": 1,
      "passed": 21,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 22,
      "suites": 0
    },
    "duration_ms": 37410.2052
  },
  "results": [
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 9094.8725,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 1032.1651,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 2156.786,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 890.1447,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 927.5514,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 1749.7731,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 658.119,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 566.5805,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 1001.7709,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 521.6554,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.5205,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 2.2704,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1353.1377,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 3.0356,
      "pass": false,
      "error": "LF بس\n\ntrue !== false\n",
      "cause": "LF بس\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\overtime-auto-approve-period.integration.cjs:702:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-01: الإنشاء بالجواز لوحده، أو بهوية بأي صيغة لوحدها (حروف وشرطة وطول أجنبي) — والمحفوظ مطبّع",
      "ms": 9050.1603,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-02: الاتنين فاضيين = 400 برسالة واحدة، والشكل الغلط 400 برسالته",
      "ms": 42.2662,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-03: التكرار على القيمة المطبّعة — «a 123» و«A123» نفس الجواز (409)، والمحفوظ القديم بمسافات وأرقام عربية بيتطابق",
      "ms": 490.6063,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-04: التعديل — مسح واحد والتاني موجود مسموح، مسح الاتنين 400، ونفس الرقم بشكل تاني مش تغيير",
      "ms": 274.8124,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-05: ملف قديم من غير هوية ولا جواز يفتح ويحفظ باقي حقوله، وقيمة مكررة من قبل القرار مابتمنعش الحفظ",
      "ms": 239.2472,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-06: التحديث الجماعي من ملف — الجواز عمود جديد، الهوية بأي صيغة، واحد منهم لكل صف، والتكرار (موظف تاني وجوه الملف)",
      "ms": 283.27,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-07: إخفاء اسم صاحب الرقم المكرر لحساب فرع تاني زي ما هو — في الإضافة والتعديل والملف",
      "ms": 92.1541,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-08: التصدير لموظف بالجواز بس — عمود الهوية فاضي وعمود الجواز بقيمته",
      "ms": 231.6607,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 3.0356,
      "pass": false,
      "error": "LF بس\n\ntrue !== false\n",
      "cause": "LF بس\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\overtime-auto-approve-period.integration.cjs:702:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "Cleanup verified: hr_ot_auto_approve_test_d83b94dd28947821 is absent from sys.databases.",
    "Cleanup verified: hr_identity_test_2ea57a8c2ff39708 is absent from sys.databases.",
    "tests 22",
    "suites 0",
    "pass 21",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 37410.2052"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_d83b94dd28947821\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_d83b94dd28947821\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_identity_test_2ea57a8c2ff39708\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_identity_test_2ea57a8c2ff39708\"}\n"
  ]
}
