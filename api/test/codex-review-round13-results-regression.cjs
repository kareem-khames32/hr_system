module.exports = {
  "selected": [
    "custom-termination-reasons",
    "administration-level",
    "codex-review-round12-unit"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 56,
      "failed": 0,
      "passed": 56,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 56,
      "suites": 0
    },
    "duration_ms": 33110.1577
  },
  "results": [
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-M1: ترحيل 073 عبر المُرحّل المجمّع من الشكل القديم nvarchar(500) NOT NULL بصفوف قائمة — توسيع بس، القيم زي ما هي، فرق المخطط صفر، آمن للتكرار، والشكل الغلط يوقف بكوده",
      "ms": 11485.8169,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-01: من غير إعداد — الثمانية الأساسية بمسمياتها ونسبها، و«انقطاع عن العمل» الافتراضي بلا مكافأة",
      "ms": 84.5828,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-02: إضافة سبب مخصص — الكود من الخادم (custom_1) والمسمى متنضّف والنسبة رقم أو كسر",
      "ms": 149.4633,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-03: المسمى المكرر (مع أساسي أو مخصص، من غير فرق حروف ولا مسافات) والمسمى أو النسبة الغلط مرفوضين والقائمة ما اتغيرتش",
      "ms": 238.9868,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-04: الحفظ لحساب على مستوى الشركة بصلاحية الإعدادات بس (403)، وPATCH /settings/config مايكتبش القائمة الخام",
      "ms": 57.4099,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-05: ملف بسبب مخصص — المكافأة بنسبته: 1/2 = نص مكافأة «الإنهاء من صاحب العمل» لنفس الموظف، و0 = بلا مكافأة",
      "ms": 838.3423,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-06: السبب الموقوف مرفوض في ملف جديد ومعاينته، والملف القديم عليه بيفضل بمسماه ومكافأته",
      "ms": 174.6273,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-07: السبب المستخدم مايتشالش (409)، والمش مستخدم بيتشال، والكود عمره ما بيتكرر",
      "ms": 123.9005,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-08: المسارات الأساسية زي ما هي — الاستقالة بجدولها، والفصل بلا مكافأة، ومسمى بند المكافأة ماتغيرش",
      "ms": 455.5626,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-09: الكود المش معروف مايتحسبش استقالة ولا مكافأة كاملة — 409 برسالة، والمسمى بيظهر زي ما هو",
      "ms": 93.1301,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-10: القايمة كلها في صف واحد nvarchar(4000) — الأطول من 500 حرف بتتحفظ وترجع بترتيبها، والأطول من 4000 مرفوضة 400 من غير ما تكتب حاجة، والحد 40 سبب",
      "ms": 183.041,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-11: الشاشات — المعالج بيعرض المخصص المفعّل، والملف بمسمى الخادم، و«أسباب إنهاء الخدمة» في سياسات النظام",
      "ms": 16.8909,
      "pass": true,
      "skip": false
    },
    {
      "file": "custom-termination-reasons.integration.cjs",
      "name": "TR-12: شاشتين مفتوحتين — الحفظ ببصمة قديمة مرفوض 409 ومايرجّعش تعديل التانية، والبصمة الحالية بتعدّي",
      "ms": 116.2819,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-01: إدارة وأقسامها وقسم فرعي؛ الإدارة التنفيذية بتتعمل «إدارة» لوحدها؛ وإدارة فرع تحت الإدارة التنفيذية من فرع تاني",
      "ms": 7957.2847,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-02: قواعد الأب — إدارة تحت قسم أو إدارة عادية، قسم تحت إدارة فرع تاني، تحويل لإدارة وأبوه مايصلحش، ونوع غلط: كله مرفوض ومفيش حاجة بتتكتب",
      "ms": 96.763,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-03: المسموح — تحويل قسم رئيسي أو تحت الإدارة التنفيذية لإدارة والعكس، وإدارة لقسم وأقسامها فرعية، والهيكل القائم بيتعدّل من غير إجبار",
      "ms": 170.4807,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-04: الإدارة التنفيذية «إدارة» دايمًا ومالهاش أب، وشيل تعليمها (صريح أو ضمني) مرفوض طول ما تحتها إدارات",
      "ms": 72.0759,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-05: «مدير الإدارة» — موظف قسم تحت إدارة بيروح لمديرها، وهو بس اللي بيعتمد",
      "ms": 233.9982,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-06: قسم فرعي على مستويين تحت الإدارة — نفس مدير الإدارة",
      "ms": 43.1912,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-07: مدير الإدارة هو مقدّم الطلب — الخطوة بتطلع للإدارة التنفيذية برابطها لفرع تاني، والرئيس بيعتمد من حساب «كل الفروع»",
      "ms": 143.2915,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-08: الإيقاف برسالة بتسمّي الوحدة — مفيش قسم، مفيش إدارة، الإدارة مالهاش مدير، المدير الوحيد هو مقدّم الطلب",
      "ms": 175.6973,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-09: السرّي مابيتخطّاش «مدير الإدارة» (زي «مدير القسم»)، والدور مش مقبول كجهة تصعيد",
      "ms": 158.1365,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-10: فلتر المسير وجمهور العطلات على إدارة بيشملوا أقسامها — في فرعها بس",
      "ms": 934.188,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-11: «الإدارة» في بطاقة صاحب الطلب — الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، ومحجوبة مع orgHidden",
      "ms": 170.344,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-12: حساب الفرع — إدارة في فرعه وقسم تحتها، والربط تحت الإدارة التنفيذية برّه نطاقه 403، والقائمة ماتكشفش اسمها",
      "ms": 77.3568,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-13: تعليم قسم «إدارة تنفيذية» بيخلّيه «إدارة» تلقائي، والتنفيذية القديمة إدارة عادية تتحول قسم وأقسامها فرعية",
      "ms": 108.4818,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-01: «مدير الإدارة» في محرر السلاسل بعد «مدير القسم» بوصفه، ومش جهة تصعيد، وبتسميته في الصناديق التلاتة",
      "ms": 2.4072,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-02: اختيارات الأب بقواعد الخادم، وتغيير النوع أو الفرع بيشيل الأب اللي مابقاش يصلح",
      "ms": 1.0447,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-03: «الإدارة ← القسم» واختيارات القسم المجمّعة بالإدارة، وفلتر الإدارة بأقسامها جوه فرعها",
      "ms": 1.4835,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-04: الهيكل التنظيمي بشارة «إدارة» من نوع الوحدة (والقديم زي الأول)، وبطاقة صاحب الطلب بـ«الإدارة» ومحجوبة مع orgHidden",
      "ms": 8.3622,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-05: الشاشات متوصلة — «الإدارات والأقسام» والنوع والأب والشجرة، ونموذج الموظف وقايمته وملفه وملفي",
      "ms": 3.0802,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-01: الخادم — أبو القسم في الحسابات من نفس فرعه، فالتوسعة والمسار مايعدّوش للإدارة التنفيذية في فرع تاني",
      "ms": 0.5819,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-02: شاشة المسير — «القسم وأقسامه الفرعية» جوه فرعه زي الخادم بالحرف",
      "ms": 0.3073,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-03: شجرة الأقسام — حساب الفرع: أقسامه اللي تحت الإدارة التنفيذية جذور مش مختفية؛ حساب الشركة: تحتها وفرعها ظاهر",
      "ms": 0.2318,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-04: «القسم الأب» — الإدارة التنفيذية لأي فرع، والباقي من فرع القسم؛ وتغيير الفرع مايسيبش أب غلط مستخبي",
      "ms": 0.2845,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-05: الهيكل التنظيمي — حساب الشركة: قسم النصر تحت الإدارة التنفيذية وفرعه ظاهر؛ حساب النصر: قسمه جذر من غير ما يختفي",
      "ms": 1.689,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-06: شاشة الأقسام — الجذور والشارات واختيارات الأب والتنبيهات متوصلة بالمنطق ده",
      "ms": 0.5447,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "القمة «الإدارة التنفيذية»: الرئيس التنفيذي مديرها، والسكرتير جنبه بس ومش أب لحد",
      "ms": 0.405,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الإدارات بأبوّة الأقسام: مدير وعدد موظفين شامل الفروع، والفريق بقائده وأعضائه",
      "ms": 0.2748,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "فلتر الفرع وحساب الفرع: الفرع بيشوف جزءه بس، ولو مفيش رئيس تنفيذي ظاهر الفرع هو القمة",
      "ms": 0.2506,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "من غير إعداد: الرئيس التنفيذي والسكرتير يتستنتجوا من المسمى الوظيفي",
      "ms": 0.2004,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "البحث بيعلّم الشخص أو الوحدة ويفتح الطريق ليه (بتطبيع الهمزات)",
      "ms": 0.6392,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "العرض: كروت بخطوط ربط RTL، السكرتير كارت جانبي، والأعضاء والفتح والقفل",
      "ms": 3.247,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشاشة: فتح/قفل الكل، بحث، فلتر فرع، طباعة وتصدير، وإعداد الإدارة التنفيذية لحساب الشركة",
      "ms": 0.8494,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "default resignation factors change exactly at configured 2, 5 and 10 year thresholds",
      "ms": 0.3448,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "termination uses the configured wage tiers without resignation threshold jumps",
      "ms": 0.1186,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "default reason factors apply zero dismissal and full configured non-resignation payouts",
      "ms": 0.1331,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "custom thresholds, wage tiers and reason factors override defaults without changing unspecified reasons",
      "ms": 0.1371,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "payout follows the two-stage money rule (cut at two decimals, no rounding) and zero service or wage yields zero",
      "ms": 0.0688,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "inclusive final working dates reach exactly 2, 5 and 10 years without fractional-year boundary loss",
      "ms": 0.2576,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "calendar service length handles the existing leap-day anniversary convention and impossible/reversed dates",
      "ms": 0.2737,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "policy table parsers reject bad factors, missing fields, duplicate or reversed thresholds and unknown reasons",
      "ms": 0.6999,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "legacy missing reason and malformed historical policy use their existing documented fallback rules",
      "ms": 0.3171,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "custom termination reasons use their own factor on the full award, and an unknown code is never resignation or a full award",
      "ms": 2.1113,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "service preview and persisted EOS lines match independent expected amounts at every resignation/termination boundary",
      "ms": 7.7983,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "service preview respects custom policy and zero payouts do not create a fictitious EOS line",
      "ms": 1.5252,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_termination_reasons_test_a223e2b37e9561e7 is absent from sys.databases.",
    "Cleanup verified: hr_administration_level_test_f44351fdee053e42 is absent from sys.databases.",
    "tests 56",
    "suites 0",
    "pass 56",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 33110.1577"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_termination_reasons_test_a223e2b37e9561e7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_termination_reasons_test_a223e2b37e9561e7\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_administration_level_test_f44351fdee053e42\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_administration_level_test_f44351fdee053e42\"}\n"
  ]
}
