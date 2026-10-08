module.exports = {
  "selected": [
    "fulltest-leaves-payroll"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 32,
      "failed": 1,
      "passed": 31,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 32,
      "suites": 0
    },
    "duration_ms": 29088.4735
  },
  "results": [
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 10818.7956,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 578.9736,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 162.7038,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 466.7497,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 328.78,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 318.5329,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 696.299,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 321.788,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 127.0656,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 31.8919,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 459.7138,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 261.9332,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 198.542,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 118.0325,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 230.9465,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 110.8896,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 12.5661,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 112.212,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 175.193,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 950.5869,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 1611.4192,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 1499.0853,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 457.6991,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 1594.3309,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 803.8715,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 771.5514,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 900.9305,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 842.0931,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 231.9847,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 900.9184,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 134.1466,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.7864,
      "pass": false,
      "error": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "cause": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: 2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\fulltest-leaves-payroll.integration.cjs:1363:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.7864,
      "pass": false,
      "error": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "cause": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: 2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\fulltest-leaves-payroll.integration.cjs:1363:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_fulltest_payroll_test_73a2ea64c4c867b6 is absent from sys.databases.",
    "tests 32",
    "suites 0",
    "pass 31",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 29088.4735"
  ],
  "stdout": [
    "REVIEW_PROGRESS pre-fix RequestsService loaded in memory; files unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_fulltest_payroll_test_73a2ea64c4c867b6\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "  [L10] أثر بذرة الرصيد: entitled المحفوظ=21 — المعروض annualEntitlement=21 accruedToDate=15.75 remaining=15.75 (العرض يقرأ استحقاق نوع الإجازة، فالعمود المحفوظ غير مستعمل اليوم)\n",
    "  [P2] وضع المحرك=LEGACY المصروف=LEGACY تكافؤ: {\"employees\":0,\"matched\":0,\"different\":0,\"unavailable\":0,\"error\":0,\"differences\":0} — وضع LEGACY: لم يُحسب محرك السياسة بجانب المسير\n",
    "\n================ الملاحظات ================\n1. [P4 الإضافي وبدل العطلة] ساعات الإضافي ومبلغه مسجلان\n   hours=0 amount=0 overtime=[]\n",
    "2. [P4 الإضافي وبدل العطلة] سطر الإضافي في القسيمة\n   [{\"key\":\"BASIC\",\"name\":\"الأساسي\",\"amount\":6000},{\"key\":\"SALARY:HOUSING\",\"name\":\"بدل السكن\",\"amount\":1200},{\"key\":\"SALARY:TRANSPORT\",\"name\":\"بدل الانتقال\",\"amount\":600},{\"key\":\"HOLIDAY_WORK\",\"name\":\"بدل دوام أيام العطلات\",\"amount\":195}]\n===========================================\n\nسيناريوهات: 31 — تحققات فاشلة: 2\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_fulltest_payroll_test_73a2ea64c4c867b6\"}\n"
  ]
}
