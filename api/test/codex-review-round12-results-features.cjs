module.exports = {
  "selected": [
    "custom-termination-reasons",
    "department-unit-type-migration",
    "administration-level"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 29,
      "failed": 1,
      "passed": 28,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 29,
      "suites": 0
    },
    "duration_ms": 45295.4786
  },
  "results": [
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-M1: ترحيل 073 عبر المُرحّل المجمّع من الشكل القديم nvarchar(500) NOT NULL بصفوف قائمة — توسيع بس، القيم زي ما هي، فرق المخطط صفر، آمن للتكرار، والشكل الغلط يوقف بكوده",
      "ms": 7848.9567,
      "pass": false,
      "error": "LF",
      "cause": "LF",
      "stack": "AssertionError [ERR_ASSERTION]: LF\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\custom-termination-reasons.integration.cjs:127:72)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-01: من غير إعداد — الثمانية الأساسية بمسمياتها ونسبها، و«انقطاع عن العمل» الافتراضي بلا مكافأة",
      "ms": 104.97,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-02: إضافة سبب مخصص — الكود من الخادم (custom_1) والمسمى متنضّف والنسبة رقم أو كسر",
      "ms": 179.8119,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-03: المسمى المكرر (مع أساسي أو مخصص، من غير فرق حروف ولا مسافات) والمسمى أو النسبة الغلط مرفوضين والقائمة ما اتغيرتش",
      "ms": 256.2003,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-04: الحفظ لحساب على مستوى الشركة بصلاحية الإعدادات بس (403)، وPATCH /settings/config مايكتبش القائمة الخام",
      "ms": 81.8319,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-05: ملف بسبب مخصص — المكافأة بنسبته: 1/2 = نص مكافأة «الإنهاء من صاحب العمل» لنفس الموظف، و0 = بلا مكافأة",
      "ms": 1101.7748,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-06: السبب الموقوف مرفوض في ملف جديد ومعاينته، والملف القديم عليه بيفضل بمسماه ومكافأته",
      "ms": 224.7246,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-07: السبب المستخدم مايتشالش (409)، والمش مستخدم بيتشال، والكود عمره ما بيتكرر",
      "ms": 195.327,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-08: المسارات الأساسية زي ما هي — الاستقالة بجدولها، والفصل بلا مكافأة، ومسمى بند المكافأة ماتغيرش",
      "ms": 540.3259,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-09: الكود المش معروف مايتحسبش استقالة ولا مكافأة كاملة — 409 برسالة، والمسمى بيظهر زي ما هو",
      "ms": 96.912,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-10: القايمة كلها في صف واحد nvarchar(4000) — الأطول من 500 حرف بتتحفظ وترجع بترتيبها، والأطول من 4000 مرفوضة 400 من غير ما تكتب حاجة، والحد 40 سبب",
      "ms": 280.3184,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-11: الشاشات — المعالج بيعرض المخصص المفعّل، والملف بمسمى الخادم، و«أسباب إنهاء الخدمة» في سياسات النظام",
      "ms": 13.7572,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-12: شاشتين مفتوحتين — الحفظ ببصمة قديمة مرفوض 409 ومايرجّعش تعديل التانية، والبصمة الحالية بتعدّي",
      "ms": 143.6452,
      "pass": true,
      "skip": false
    },
    {
      "file": "department-unit-type-migration.integration.cjs",
      "name": "UT-M1: الملف إضافي بتعبئة واحدة، وأكواده فريدة، واسم قيده هو اللي TypeORM بيحسبه وsynchronize بيعمله",
      "ms": 10666.755,
      "pass": true,
      "skip": false
    },
    {
      "file": "department-unit-type-migration.integration.cjs",
      "name": "UT-M2: المخطط القديم بإدارة تنفيذية وأقسام — المُرحّل بيضيف العمود بس، والإدارة التنفيذية «إدارة» والباقي «قسم»، والفرق صفر",
      "ms": 2873.18,
      "pass": true,
      "skip": false
    },
    {
      "file": "department-unit-type-migration.integration.cjs",
      "name": "UT-M3: آمن للتكرار، والتعبئة بتلمس الإدارة التنفيذية بس، وشكل غلط بيوقف التحقق بكوده",
      "ms": 1549.5662,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-01: إدارة وأقسامها وقسم فرعي؛ الإدارة التنفيذية بتتعمل «إدارة» لوحدها؛ وإدارة فرع تحت الإدارة التنفيذية من فرع تاني",
      "ms": 8447.9377,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-02: قواعد الأب — إدارة تحت قسم أو إدارة عادية، قسم تحت إدارة فرع تاني، تحويل لإدارة وأبوه مايصلحش، ونوع غلط: كله مرفوض ومفيش حاجة بتتكتب",
      "ms": 101.704,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-03: المسموح — تحويل قسم رئيسي أو تحت الإدارة التنفيذية لإدارة والعكس، وإدارة لقسم وأقسامها فرعية، والهيكل القائم بيتعدّل من غير إجبار",
      "ms": 165.7246,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-04: الإدارة التنفيذية «إدارة» دايمًا ومالهاش أب، وشيل تعليمها (صريح أو ضمني) مرفوض طول ما تحتها إدارات",
      "ms": 102.3086,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-05: «مدير الإدارة» — موظف قسم تحت إدارة بيروح لمديرها، وهو بس اللي بيعتمد",
      "ms": 199.2423,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-06: قسم فرعي على مستويين تحت الإدارة — نفس مدير الإدارة",
      "ms": 54.6377,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-07: مدير الإدارة هو مقدّم الطلب — الخطوة بتطلع للإدارة التنفيذية برابطها لفرع تاني، والرئيس بيعتمد من حساب «كل الفروع»",
      "ms": 140.8888,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-08: الإيقاف برسالة بتسمّي الوحدة — مفيش قسم، مفيش إدارة، الإدارة مالهاش مدير، المدير الوحيد هو مقدّم الطلب",
      "ms": 252.6018,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-09: السرّي مابيتخطّاش «مدير الإدارة» (زي «مدير القسم»)، والدور مش مقبول كجهة تصعيد",
      "ms": 145.5484,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-10: فلتر المسير وجمهور العطلات على إدارة بيشملوا أقسامها — في فرعها بس",
      "ms": 816.8619,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-11: «الإدارة» في بطاقة صاحب الطلب — الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، ومحجوبة مع orgHidden",
      "ms": 166.7754,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-12: حساب الفرع — إدارة في فرعه وقسم تحتها، والربط تحت الإدارة التنفيذية برّه نطاقه 403، والقائمة ماتكشفش اسمها",
      "ms": 69.0391,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-13: تعليم قسم «إدارة تنفيذية» بيخلّيه «إدارة» تلقائي، والتنفيذية القديمة إدارة عادية تتحول قسم وأقسامها فرعية",
      "ms": 74.3175,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-M1: ترحيل 073 عبر المُرحّل المجمّع من الشكل القديم nvarchar(500) NOT NULL بصفوف قائمة — توسيع بس، القيم زي ما هي، فرق المخطط صفر، آمن للتكرار، والشكل الغلط يوقف بكوده",
      "ms": 7848.9567,
      "pass": false,
      "error": "LF",
      "cause": "LF",
      "stack": "AssertionError [ERR_ASSERTION]: LF\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\custom-termination-reasons.integration.cjs:127:72)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_termination_reasons_test_5f2bf361eb7645d6 is absent from sys.databases.",
    "Cleanup verified: hr_unit_type_migration_test_248f6fc9d15a8b0f is absent from sys.databases.",
    "Cleanup verified: hr_administration_level_test_0e6601d930be7648 is absent from sys.databases.",
    "tests 29",
    "suites 0",
    "pass 28",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 45295.4786"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_termination_reasons_test_5f2bf361eb7645d6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_termination_reasons_test_5f2bf361eb7645d6\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_unit_type_migration_test_248f6fc9d15a8b0f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_unit_type_migration_test_248f6fc9d15a8b0f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_administration_level_test_0e6601d930be7648\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_administration_level_test_0e6601d930be7648\"}\n"
  ]
}
