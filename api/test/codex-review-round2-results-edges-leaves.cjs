module.exports = {
  "selected": [
    "codex-review-round2-edge",
    "codex-review-round2-all-leave-types"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 36,
      "failed": 1,
      "passed": 3,
      "cancelled": 0,
      "skipped": 32,
      "todo": 0,
      "topLevel": 36,
      "suites": 0
    },
    "duration_ms": 100700.2441
  },
  "results": [
    {
      "file": "codex-review-round2-edge.integration.cjs",
      "name": "CR2-E1 mark then unmark then RUN_LEVEL pays current split and freezes it across five outputs",
      "ms": 30431.5755,
      "pass": true
    },
    {
      "file": "codex-review-round2-edge.integration.cjs",
      "name": "CR2-E2 PER_EMPLOYEE leaves unpaid item live, then a late payment freezes its actual split once",
      "ms": 31455.5063,
      "pass": true
    },
    {
      "file": "codex-review-round2-edge.integration.cjs",
      "name": "CR2-E3 fault after first paid split write rolls back every split and run transition",
      "ms": 30089.651,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 23093.2124,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 0.2472,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 0.1368,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 0.104,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 0.1005,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 0.0707,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 0.0768,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 0.0689,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 0.1055,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 0.108,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 0.0856,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 0.0582,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 0.0475,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 0.0427,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 0.0385,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 0.0464,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 0.0413,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 0.1658,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 0.0618,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 0.0388,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 0.0335,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 0.0355,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 0.0335,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 0.0343,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 0.0328,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 0.0377,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 0.0339,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 0.0318,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 0.0285,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 0.0334,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 0.0317,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.0326,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "CR2 all eleven leave codes through named two-step chain and paid payroll",
      "ms": 27165.1804,
      "pass": false,
      "error": "ANNUAL\n\n6000 !== 7800\n",
      "cause": "ANNUAL\n\n6000 !== 7800\n",
      "stack": "AssertionError [ERR_ASSERTION]: ANNUAL\n\n6000 !== 7800\n\n    at TestContext.reviewTest.timeout (D:\\projects\\hr_system\\api\\test\\fulltest-leaves-payroll.integration.cjs:1385:118)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "CR2 all eleven leave codes through named two-step chain and paid payroll",
      "ms": 27165.1804,
      "pass": false,
      "error": "ANNUAL\n\n6000 !== 7800\n",
      "cause": "ANNUAL\n\n6000 !== 7800\n",
      "stack": "AssertionError [ERR_ASSERTION]: ANNUAL\n\n6000 !== 7800\n\n    at TestContext.reviewTest.timeout (D:\\projects\\hr_system\\api\\test\\fulltest-leaves-payroll.integration.cjs:1385:118)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"scenario\":\"RUN_LEVEL stale UNPAID\",\"frozen\":[600,400],\"fiveOutputsAgree\":true,\"repeatPay\":400}",
    "{\"scenario\":\"PER_EMPLOYEE then late payment\",\"firstFrozen\":[300,700],\"lateFrozen\":[800,200],\"repeatStatus\":409,\"cancelStatus\":409}",
    "{\"scenario\":\"atomic paid snapshot\",\"injectedStatus\":500,\"partialWritesPersisted\":0,\"retrySucceeded\":true}",
    "Cleanup verified: hr_fulltest_payroll_test_218cf4f290862d8b is absent from sys.databases.",
    "tests 36",
    "suites 0",
    "pass 3",
    "fail 1",
    "cancelled 0",
    "skipped 32",
    "todo 0",
    "duration_ms 100700.2441"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_edges_test_c349a90c31ea6e52\"}\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n"
  ]
}
