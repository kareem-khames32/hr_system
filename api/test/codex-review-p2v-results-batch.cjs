module.exports = {
  "selected": [
    "codex-review-p2v-units",
    "employment-periods",
    "employment-periods-migration"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 39,
      "failed": 0,
      "passed": 39,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 39,
      "suites": 0
    },
    "duration_ms": 31002.1709
  },
  "results": [
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-01: اليوم الحقيقي وجمع الأيام، ومفتاح الصف المتجمّد برّه خط الرصيد الزمني",
      "ms": 1.4213,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-02: حدود تاريخ المباشرة — من أول يوم مقبول لحد آخر يوم مسموح",
      "ms": 0.1501,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-03: حكم الإتاحة — الحالة، وملف الفترة الحالية، وأول يوم مقبول، والمسير المعلّق، وشهر آخر يوم عمل",
      "ms": 2.0549,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-01: إرجاع موظف ملفه مُصفّى — الواجهة بتعرف رد الخادم بكوده، وبتاخد سبب مكتوب، وغير المُصفّى زي ما هو",
      "ms": 3.0911,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-02: «إعادة تعيين» — الزرار بصلاحية إنشاء موظف، والإتاحة وحدود التاريخ من الخادم، والتاريخ والسبب إجباريين",
      "ms": 2.4654,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-03: قسم «فترات الخدمة» في ملف الموظف لموظف له فترة مقفولة بس، والمسارين في الخادم بصلاحيتهم",
      "ms": 1.6367,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "YEAR_START = السنة الميلادية، HIRE_ANNIVERSARY = من ذكرى التعيين حتى اليوم السابق للذكرى التالية",
      "ms": 0.2899,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "الصفوف القائمة تبقى صالحة: صف السنة الميلادية كامل وأول سنة ذكرى بعده تبدأ 1 يناير بنسبة أيامها",
      "ms": 0.2873,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "المتراكم الشهري واليومي على نافذة الذكرى مطابق لحساب السنة الميلادية",
      "ms": 0.2331,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "الترحيل: مفعّل بسقف، null بلا سقف، معطّل = صفر؛ والصلاحية من بداية السنة الجديدة",
      "ms": 0.1403,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "إعداد النوع: ANNUAL بالكود قبل أنواع فئة السنوية الأخرى، والأيام الفارغة ترجع للإعداد العام",
      "ms": 0.1909,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "YEAR_START: الاستحقاق من annualDays والترحيل عند التجديد بسقف النوع، والمرضي المعطّل لا يترحّل",
      "ms": 1.9798,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "HIRE_ANNIVERSARY: السنة تتجدد في ذكرى التعيين مع ترحيل بالسقف مرة واحدة، والخصم على سنة الرصيد الصحيحة",
      "ms": 1.7928,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "التحوّل من بداية السنة إلى الذكرى: صف 2040 يبقى كما هو، والترحيل السنوي ينشئ سنة انتقالية حتى الذكرى",
      "ms": 0.5071,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3901,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2335,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2232,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2162,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2614,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.213,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.191,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2055,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2579,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2232,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-011: 095 فترات الخدمة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1016,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.4957,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.8096,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.3143,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.845,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 156.3611,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-01: الإرجاع القديم — موظف ملفه مُصفّى بيرجع بسبب مكتوب بس والسبب في سجله، ومن غير تصفية زي ما هو",
      "ms": 7409.3586,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-02: إعادة تعيين بعد سنة — الفترة القديمة اتسجّلت، والمكافأة والرصيد ومعاينة التصفية زي موظف جديد بنفس التاريخ، والمسير والحضور من تاريخ المباشرة",
      "ms": 634.7324,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-03: الرفض — مش منتهي، من غير ملف مقفول، ملف مفتوح أو مجهول، أكتر من نهاية، تاريخ أو سبب غلط، بدري أو بعيد، ومن غير الصلاحية أو برّه النطاق",
      "ms": 857.334,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-04: المسير — المباشرة بعد شهر الرواتب اللي فيه آخر يوم عمل، ومسير الشهر ده معتمد والموظف فيه، ومسير قديم لسه مااتعتمدش بيمنع",
      "ms": 823.2208,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-05: رصيد الإجازات بعد إعادة التعيين — إجازة قديمة بتتلغى مابترجعش على الرصيد الجديد، والترحيل والإقفال والتجديد مابيشوفوش صفوف الفترة المقفولة",
      "ms": 1359.8667,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-06: إعادة تعيين تانية بتقفل الفترة التانية بمفتاحها، وطلبين في نفس اللحظة واحد بس بينجح",
      "ms": 1747.2957,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7252.0667,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-2: من غير الجدول الفترات «مش متاحة» وإعادة التعيين مرفوضة برسالتها؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده الإجراء بيشتغل من غير إعادة تشغيل",
      "ms": 5030.8815,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods-migration.integration.cjs",
      "name": "EPM-3: آمن للتكرار",
      "ms": 887.8519,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_employment_periods_test_90279865aff6d98e is absent from sys.databases.",
    "Cleanup verified: hr_employment_periods_migration_test_553fbc73562365f4 is absent from sys.databases.",
    "tests 39",
    "suites 0",
    "pass 39",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 31002.1709"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_test_90279865aff6d98e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_test_90279865aff6d98e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_migration_test_553fbc73562365f4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_migration_test_553fbc73562365f4\"}\n"
  ]
}
