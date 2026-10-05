module.exports = {
  "selected": [
    "request-execution-tasks",
    "request-execution-migration",
    "codex-review-p2h-units"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 34,
      "failed": 0,
      "passed": 34,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 34,
      "suites": 0
    },
    "duration_ms": 56111.0081
  },
  "results": [
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-01: نوع من غير الإعداد — الاعتماد بيكمّل الطلب في لحظتها ومن غير مهمة",
      "ms": 10868.6877,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-02: الإعداد على نوع الطلب — الدور والمهلة والإثبات بحدودهم، وشيل الدور بيشيل الباقي",
      "ms": 559.9294,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-03: نوع عليه مهمة — الطلب «قيد التنفيذ» ومهمة واحدة على الدور في فرع الطلب، وفي «مهامي» والتقرير",
      "ms": 401.6648,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-04: اللي المهمة عليه بيقرا الطلب، وحامل الدور في فرع تاني والغريب لأ",
      "ms": 178.7616,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-05: إقفال المهمة — الطلب «مكتمل» وسطر «اتنفّذ» وبريد لصاحبه؛ والإثبات الإجباري، وإقفالين في نفس اللحظة، ومن غير إعادة فتح",
      "ms": 1403.9155,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-06: مهمة التنفيذ ماتتلغيش ولا تتعدّل ولا تتحوّل من شاشة المهام — رفض التنفيذ من لوحة الطلبات بيلغيها ويرفض الطلب",
      "ms": 425.4104,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-07: الطلب السري — عنوان المهمة عام ومن غير اسم معتمده، وأصحاب «عرض كل المهام» و«إدارة المهام» مالهمش طريق له، والمنفّذ بيقراه",
      "ms": 2039.7833,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-08: المهمة والاعتماد معاملة واحدة — لو المهمة ماتكتبتش، الاعتماد كله بيرجع",
      "ms": 134.948,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-09: باقي مداخل الاعتماد — سلسلة فاضية باعتماد تلقائي، وطلب الموارد البشرية نيابةً؛ ومعالج لسه ماخلّصش من غير مهمة",
      "ms": 528.3791,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-10: محدش ينفّذ طلبه — صاحب الطلب ومنشئه نيابةً مايشتغلوش على مهمته، ومدير النظام بيفكّ الانسداد",
      "ms": 801.9734,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-11: إثبات مهمة التنفيذ وسبب تعليقها ومين قفلها — للي يقدر يفتح الطلب بس، وملف إثباتها لرافعه",
      "ms": 724.8232,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-12: إقفال المهمة ورفض تنفيذ الطلب في نفس اللحظة — واحد بس بيكسب والتاني بيترفض برسالة، من غير تعليق متبادل",
      "ms": 369.3661,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-migration.integration.cjs",
      "name": "RM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10582.7054,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-migration.integration.cjs",
      "name": "RM-2: من غير الأعمدة الإعداد مرفوض برسالة والاعتماد بيكمّل الطلب زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده المهمة بتتفتح",
      "ms": 4625.837,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-migration.integration.cjs",
      "name": "RM-3: آمن للتكرار",
      "ms": 738.4196,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-01: إعداد النوع — نفس أدوار وتسميات محرك المهام، ونفس حد المهلة، وبيتبعت لما يتغيّر بس",
      "ms": 9.7572,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-02: كارت مهمة التنفيذ — مكتوب إنها بتكمّل الطلب، ولينك الطلب، ومن غير أزرار الإدارة",
      "ms": 3.4006,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-03: تقرير «معتمد ومااتنفذش» — فلتر من الخادم جوه لوحة الطلبات، بمسؤول التنفيذ وعمر الاعتماد في الجدول والتصدير",
      "ms": 4.8173,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-04: إجراء «اتنفّذ» — في سجل الطلب بالتلات شاشات، وفي إشعار صاحب الطلب",
      "ms": 4.2179,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 218.0828,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 1.5465,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 2.0089,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 28.7726,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.7136,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 1.1039,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.4968,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 1.1322,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 231.0546,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "ms": 1.1463,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "ms": 0.7932,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "ms": 0.282,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "ms": 0.4999,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "ms": 0.2589,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "ms": 0.2904,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_reqexec_test_0cee0081ef2e3546 is absent from sys.databases.",
    "Cleanup verified: hr_reqexec_migration_test_a5b0cec1cddca61d is absent from sys.databases.",
    "tests 34",
    "suites 0",
    "pass 34",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 56111.0081"
  ],
  "stdout": [
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_reqexec_test_0cee0081ef2e3546\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_reqexec_test_0cee0081ef2e3546\"}\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_reqexec_migration_test_a5b0cec1cddca61d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_reqexec_migration_test_a5b0cec1cddca61d\"}\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
