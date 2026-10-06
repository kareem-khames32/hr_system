module.exports = {
  "selected": [
    "codex-review-p2w-units",
    "employment-periods",
    "employment-periods-migration",
    "codex-review-p2w-payroll-race",
    "codex-review-p2w-reason"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 46,
      "failed": 0,
      "passed": 46,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 46,
      "suites": 0
    },
    "duration_ms": 42658.2597
  },
  "results": [
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-01: اليوم الحقيقي وجمع الأيام، ومفتاح الصف المتجمّد برّه خط الرصيد الزمني",
      "ms": 1.8991,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-02: حدود تاريخ المباشرة (أول يوم وآخر يوم)، وسطر السجل بيحفظ السبب الطويل كامل",
      "ms": 0.3922,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-03: حكم الإتاحة — الحالة، وملف الفترة الحالية، وإجازة بعد آخر يوم عمل، وأول يوم مقبول، والمسير المعلّق، وشهر آخر يوم عمل",
      "ms": 3.6486,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-04: مرجع المسير بقاعدة رؤيته — شهر المسير المعلّق للي يشوف المسير بس، وحد تاريخ جاي من مسير مخفي بيقفل الإتاحة من غير تاريخ",
      "ms": 1.4149,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-01: إرجاع موظف ملفه مُصفّى — الواجهة بتعرف رد الخادم بكوده، وبتاخد سبب مكتوب، وغير المُصفّى زي ما هو",
      "ms": 1.8327,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-02: «إعادة تعيين» — الزرار بصلاحية إنشاء موظف، والإتاحة وحدود التاريخ من الخادم، والتاريخ والسبب إجباريين",
      "ms": 1.3226,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-03: قسم «فترات الخدمة» في ملف الموظف لموظف له فترة مقفولة بس، والمسارين في الخادم بصلاحيتهم",
      "ms": 1.6921,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "YEAR_START = السنة الميلادية، HIRE_ANNIVERSARY = من ذكرى التعيين حتى اليوم السابق للذكرى التالية",
      "ms": 0.3116,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "الصفوف القائمة تبقى صالحة: صف السنة الميلادية كامل وأول سنة ذكرى بعده تبدأ 1 يناير بنسبة أيامها",
      "ms": 0.3933,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "المتراكم الشهري واليومي على نافذة الذكرى مطابق لحساب السنة الميلادية",
      "ms": 0.2788,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "الترحيل: مفعّل بسقف، null بلا سقف، معطّل = صفر؛ والصلاحية من بداية السنة الجديدة",
      "ms": 0.1055,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "إعداد النوع: ANNUAL بالكود قبل أنواع فئة السنوية الأخرى، والأيام الفارغة ترجع للإعداد العام",
      "ms": 0.1739,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "YEAR_START: الاستحقاق من annualDays والترحيل عند التجديد بسقف النوع، والمرضي المعطّل لا يترحّل",
      "ms": 1.9244,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "HIRE_ANNIVERSARY: السنة تتجدد في ذكرى التعيين مع ترحيل بالسقف مرة واحدة، والخصم على سنة الرصيد الصحيحة",
      "ms": 2.0447,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "التحوّل من بداية السنة إلى الذكرى: صف 2040 يبقى كما هو، والترحيل السنوي ينشئ سنة انتقالية حتى الذكرى",
      "ms": 0.6423,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3894,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2349,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2217,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2301,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2048,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1942,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.19,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2206,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2222,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2227,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-011: 095 فترات الخدمة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.111,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.6126,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.7962,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.2913,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.708,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 40.7337,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-01: الإرجاع القديم — موظف ملفه مُصفّى بيرجع بسبب مكتوب بس والسبب في سجله، ومن غير تصفية زي ما هو",
      "ms": 7351.6794,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-02: إعادة تعيين بعد سنة — الفترة القديمة اتسجّلت، والمكافأة والرصيد ومعاينة التصفية زي موظف جديد بنفس التاريخ، والمسير والحضور من تاريخ المباشرة",
      "ms": 605.8345,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-03: الرفض — مش منتهي، من غير ملف مقفول، ملف مفتوح أو مجهول، أكتر من نهاية، تاريخ أو سبب غلط، بدري أو بعيد، ومن غير الصلاحية أو برّه النطاق",
      "ms": 826.9475,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-04: المسير — المباشرة بعد شهر الرواتب اللي فيه آخر يوم عمل، ومسير الشهر ده معتمد والموظف فيه، ومسير قديم لسه مااتعتمدش بيمنع",
      "ms": 1004.8608,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-05: رصيد الإجازات بعد إعادة التعيين — إجازة قديمة بتتلغى مابترجعش على الرصيد الجديد، والترحيل والإقفال والتجديد مابيشوفوش صفوف الفترة المقفولة",
      "ms": 1329.85,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-06: إعادة تعيين تانية بتقفل الفترة التانية بمفتاحها، وطلبين في نفس اللحظة واحد بس بينجح",
      "ms": 1779.4796,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-07: إجازة معتمدة بعد آخر يوم عمل بتمنع إعادة التعيين لحد ما تتلغى، وتاريخ جوه فترة مقفولة مالوش خصم، والخصم والإرجاع مابيستنوش صف موظف ممسوك",
      "ms": 510.5874,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-08: الترحيل السنوي والتجديد اليومي بيحكموا ويكتبوا وصف الموظف ممسوك — مُرحّل الفترة القديمة مايوصلش لرصيد الجديدة",
      "ms": 5218.6775,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-09: حساب المسير بيحكم على موظفيه ببيانات اتقرت بعد قفل المالية — إعادة تعيين اتثبّتت قبل القفل مابتتحسبش بحكم قديم",
      "ms": 379.3662,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-10: مرجع مسير مخفي عن القارئ مابيظهرش في قراءة الفترات ولا في رفض إعادة التعيين — لا شهره ولا نهايته",
      "ms": 302.5804,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7095.742,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-2: من غير الجدول الفترات «مش متاحة» وإعادة التعيين مرفوضة برسالتها؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده الإجراء بيشتغل من غير إعادة تشغيل",
      "ms": 5016.1731,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-3: آمن للتكرار",
      "ms": 962.2476,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2w-payroll-race.integration.cjs",
      "name": "P2W B rehire and old-period calculation must not both commit an unresolved old payroll item",
      "ms": 5090.7608,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2w-reason.integration.cjs",
      "name": "P2W A accepted 500-character return reason should retain its final explanation in history",
      "ms": 4333.9414,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_employment_periods_test_7556c65c42cec84e is absent from sys.databases.",
    "Cleanup verified: hr_employment_periods_migration_test_d44773ecb3c4e55a is absent from sys.databases.",
    "{\"case\":\"old-payroll-crosses-rehire\",\"rehireStatus\":201,\"first\":{\"status\":\"EXCLUDED\",\"items\":[]},\"fresh\":{\"status\":\"EXCLUDED\",\"items\":0}}",
    "{\"case\":\"maximum-return-reason\",\"status\":201,\"inputLength\":500,\"storedLength\":500,\"finalExplanationRetained\":true}",
    "tests 46",
    "suites 0",
    "pass 46",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 42658.2597"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_test_7556c65c42cec84e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_test_7556c65c42cec84e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_migration_test_d44773ecb3c4e55a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_migration_test_d44773ecb3c4e55a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2w_payroll_race_test_45d4bff2a62607dc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2w_payroll_race_test_45d4bff2a62607dc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2w_payroll_race_test_45d4bff2a62607dc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2w_reason_test_6dfe326e87496de5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2w_reason_test_6dfe326e87496de5\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2w_reason_test_6dfe326e87496de5\"}\n"
  ]
}
