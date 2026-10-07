module.exports = {
  "selected": [
    "codex-review-p2x-units",
    "employment-periods",
    "employment-periods-migration",
    "codex-review-p2x-fix-controls",
    "codex-review-p2x-payroll-race",
    "codex-review-p2x-reason"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 53,
      "failed": 0,
      "passed": 53,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 53,
      "suites": 0
    },
    "duration_ms": 51959.9197
  },
  "results": [
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-01: اليوم الحقيقي وجمع الأيام، ومفتاح الصف المتجمّد برّه خط الرصيد الزمني",
      "ms": 1.429,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-02: حدود تاريخ المباشرة (أول يوم وآخر يوم)، وسطر السجل بيحفظ السبب الطويل كامل",
      "ms": 0.1847,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-03: حكم الإتاحة — الحالة، وملف الفترة الحالية، وإجازة بعد آخر يوم عمل، وأول يوم مقبول، والمسير المعلّق، وشهر آخر يوم عمل",
      "ms": 3.5792,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-04: مرجع المسير بقاعدة رؤيته — شهر المسير المعلّق للي يشوف المسير بس، وحد تاريخ جاي من مسير مخفي بيقفل الإتاحة من غير تاريخ",
      "ms": 2.6147,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-05: مفيش كاتب لرصيد الإجازات برّه قفل صف الموظف، ومعالجات الطلبات اللي بتحفظ كيان الموظف كله بتقراه بقفل",
      "ms": 3.9917,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-01: إرجاع موظف ملفه مُصفّى — الواجهة بتعرف رد الخادم بكوده، وبتاخد سبب مكتوب، وغير المُصفّى زي ما هو",
      "ms": 1.449,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-02: «إعادة تعيين» — الزرار بصلاحية إنشاء موظف، والإتاحة وحدود التاريخ من الخادم، والتاريخ والسبب إجباريين",
      "ms": 1.1473,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-03: قسم «فترات الخدمة» في ملف الموظف لموظف له فترة مقفولة بس، والمسارين في الخادم بصلاحيتهم",
      "ms": 0.9925,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "YEAR_START = السنة الميلادية، HIRE_ANNIVERSARY = من ذكرى التعيين حتى اليوم السابق للذكرى التالية",
      "ms": 0.2677,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "الصفوف القائمة تبقى صالحة: صف السنة الميلادية كامل وأول سنة ذكرى بعده تبدأ 1 يناير بنسبة أيامها",
      "ms": 0.3368,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "المتراكم الشهري واليومي على نافذة الذكرى مطابق لحساب السنة الميلادية",
      "ms": 0.2216,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "الترحيل: مفعّل بسقف، null بلا سقف، معطّل = صفر؛ والصلاحية من بداية السنة الجديدة",
      "ms": 0.0857,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "إعداد النوع: ANNUAL بالكود قبل أنواع فئة السنوية الأخرى، والأيام الفارغة ترجع للإعداد العام",
      "ms": 0.1919,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "YEAR_START: الاستحقاق من annualDays والترحيل عند التجديد بسقف النوع، والمرضي المعطّل لا يترحّل",
      "ms": 2.1139,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "HIRE_ANNIVERSARY: السنة تتجدد في ذكرى التعيين مع ترحيل بالسقف مرة واحدة، والخصم على سنة الرصيد الصحيحة",
      "ms": 1.9773,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "التحوّل من بداية السنة إلى الذكرى: صف 2040 يبقى كما هو، والترحيل السنوي ينشئ سنة انتقالية حتى الذكرى",
      "ms": 1.2967,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.5639,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2458,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.238,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2132,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2131,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1962,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1973,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1888,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2073,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2277,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-011: 095 فترات الخدمة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1123,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.4991,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.7931,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.2983,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.7249,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 41.749,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-01: الإرجاع القديم — موظف ملفه مُصفّى بيرجع بسبب مكتوب بس والسبب في سجله، ومن غير تصفية زي ما هو",
      "ms": 7382.5745,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-02: إعادة تعيين بعد سنة — الفترة القديمة اتسجّلت، والمكافأة والرصيد ومعاينة التصفية زي موظف جديد بنفس التاريخ، والمسير والحضور من تاريخ المباشرة",
      "ms": 657.6445,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-03: الرفض — مش منتهي، من غير ملف مقفول، ملف مفتوح أو مجهول، أكتر من نهاية، تاريخ أو سبب غلط، بدري أو بعيد، ومن غير الصلاحية أو برّه النطاق",
      "ms": 844.8877,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-04: المسير — المباشرة بعد شهر الرواتب اللي فيه آخر يوم عمل، ومسير الشهر ده معتمد والموظف فيه، ومسير قديم لسه مااتعتمدش بيمنع",
      "ms": 1058.4985,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-05: رصيد الإجازات بعد إعادة التعيين — إجازة قديمة بتتلغى مابترجعش على الرصيد الجديد، والترحيل والإقفال والتجديد مابيشوفوش صفوف الفترة المقفولة",
      "ms": 1350.0146,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-06: إعادة تعيين تانية بتقفل الفترة التانية بمفتاحها، وطلبين في نفس اللحظة واحد بس بينجح",
      "ms": 1726.1789,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-07: إجازة معتمدة بعد آخر يوم عمل بتمنع إعادة التعيين لحد ما تتلغى، وتاريخ جوه فترة مقفولة مالوش خصم، والخصم والإرجاع مابيستنوش صف موظف ممسوك",
      "ms": 498.864,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-08: الترحيل السنوي والتجديد اليومي بيحكموا ويكتبوا وصف الموظف ممسوك — مُرحّل الفترة القديمة مايوصلش لرصيد الجديدة",
      "ms": 5190.8826,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-09: حساب المسير بيحكم على موظفيه ببيانات اتقرت بعد قفل المالية — إعادة تعيين اتثبّتت قبل القفل مابتتحسبش بحكم قديم",
      "ms": 373.238,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-10: مرجع مسير مخفي عن القارئ مابيظهرش في قراءة الفترات ولا في رفض إعادة التعيين — لا شهره ولا نهايته",
      "ms": 396.923,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-11: أثر تعديل الملف على الرصيد جوه معاملة التعديل وتحت صف الموظف — رصيد افتتاحي من الخدمة القديمة مابيوصلش للفترة الجديدة",
      "ms": 5201.9678,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-12: فحص الرصيد مابيكتبش صف، وصفوف السنة الناقصة تحت صف الموظف — صف بمفتاح ذكرى تعيين قديمة مابيتكتبش بعد إعادة التعيين",
      "ms": 2142.7634,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-13: معالج طلب بيحفظ كيان الموظف كله بيقراه وصفه مقفول — اعتماد طلب قديم عبر إعادة التعيين مابيرجّعش تاريخ التعيين القديم",
      "ms": 1629.9482,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7149.0033,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-2: من غير الجدول الفترات «مش متاحة» وإعادة التعيين مرفوضة برسالتها؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده الإجراء بيشتغل من غير إعادة تشغيل",
      "ms": 5148.2286,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-3: آمن للتكرار",
      "ms": 879.4773,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2x-fix-controls.integration.cjs",
      "name": "P2X old approved leave must be cancelled before rehire and must refund only the old row",
      "ms": 4671.264,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2x-fix-controls.integration.cjs",
      "name": "P2X rollover that read its source before rehire must reevaluate it after the employee lock",
      "ms": 177.213,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2x-fix-controls.integration.cjs",
      "name": "P2X hidden payroll end cannot be inferred by probing rehire dates, while company reader retains it",
      "ms": 169.2903,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2x-payroll-race.integration.cjs",
      "name": "P2X B rehire and old-period calculation must not both commit an unresolved old payroll item",
      "ms": 4590.9455,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2x-reason.integration.cjs",
      "name": "P2X A accepted 500-character return reason should retain its final explanation in history",
      "ms": 4674.719,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_employment_periods_test_988daa48d847ff89 is absent from sys.databases.",
    "Cleanup verified: hr_employment_periods_migration_test_e3521cec84f2023a is absent from sys.databases.",
    "{\"case\":\"old-future-leave-closure\",\"initial\":\"REHIRE_FUTURE_LEAVES\",\"newTaken\":2,\"oldTaken\":0}",
    "{\"case\":\"rollover-source-reread\",\"openingDays\":0}",
    "{\"case\":\"hidden-end-oracle\",\"limited\":{\"available\":false,\"code\":\"REHIRE_HIDDEN_RUN\",\"blocked\":\"أيام من خدمته القديمة داخلة في مسير خارج نطاق صلاحيتك — إعادة التعيين محتاجة حساب يشوف المسير ده\",\"lastWorkingDay\":\"2025-06-30\",\"minStartDate\":null,\"maxStartDate\":\"2027-10-08\"},\"companyMinimum\":\"2026-01-01\",\"identicalDateRefusals\":true}",
    "{\"case\":\"old-payroll-crosses-rehire\",\"rehireStatus\":201,\"first\":{\"status\":\"EXCLUDED\",\"items\":[]},\"fresh\":{\"status\":\"EXCLUDED\",\"items\":0}}",
    "{\"case\":\"maximum-return-reason\",\"status\":201,\"inputLength\":500,\"storedLength\":500,\"finalExplanationRetained\":true}",
    "tests 53",
    "suites 0",
    "pass 53",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 51959.9197"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_test_988daa48d847ff89\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_test_988daa48d847ff89\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_migration_test_e3521cec84f2023a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_migration_test_e3521cec84f2023a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2x_fix_controls_test_8b81a87ce16f98ba\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2x_fix_controls_test_8b81a87ce16f98ba\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2x_fix_controls_test_8b81a87ce16f98ba\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2x_payroll_race_test_16a643a45a4c8fa0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2x_payroll_race_test_16a643a45a4c8fa0\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2x_payroll_race_test_16a643a45a4c8fa0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2x_reason_test_197de8eab78ebbf0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2x_reason_test_197de8eab78ebbf0\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2x_reason_test_197de8eab78ebbf0\"}\n"
  ]
}
