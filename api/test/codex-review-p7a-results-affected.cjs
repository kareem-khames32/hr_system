module.exports = {
  "selected": [
    "org-audience",
    "overtime-period-audience",
    "notification-channels",
    "notification-channels-migration",
    "dashboard-cards",
    "job-share",
    "announcements-home",
    "performance-reviews",
    "training"
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
    "duration_ms": 92329.6049
  },
  "results": [
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-01: the preview counts and names an audience at every level, inside the asker's branch scope only",
      "ms": 11789.7972,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-02: an announcement for one administration reaches its people only; exclusion; a branch account targets units of its own branches only",
      "ms": 502.11,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-03: a policy, a knowledge article and a survey for one administration apply to its people only",
      "ms": 398.359,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-04: a module opened for one administration is on for its people only (and whoever is excluded by name is out)",
      "ms": 203.1079,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-05: a group task gives every employee of the audience their own task, inside the assigner's branch scope, and only to permission holders",
      "ms": 224.9769,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-01: an open period for one team opens overtime for that team only; whoever is outside it is judged as if the period did not exist",
      "ms": 11665.9066,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-02: an administration covers the departments under it, the excluded employee stays out, and a closed period closes for its audience only",
      "ms": 303.2493,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-03: a branch account sets an audience inside its branches only; wrong ids and a company-wide exclusion are refused; periods without an audience are as before",
      "ms": 203.531,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-04: a damaged audience never opens overtime, and before migration 186 periods behave as before and an audience is refused",
      "ms": 240.4718,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-01: الافتراضي = سلوك النظام الحالي، والشاشة لمدير النظام بس",
      "ms": 11856.3967,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-02: خادم البريد من الشاشة — كلمة السر مختومة ومابترجعش، والإعداد المحفوظ بياخد مكان إعداد الخادم من غير إعادة تشغيل",
      "ms": 223.1405,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-03: الواتساب من الشاشة — التوكن مختوم ومابيرجعش، وربط قالب Meta بمتغيرات الحدث، ورسالة التجربة على خادم Meta بس",
      "ms": 180.6277,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-04: «خلص لما» — طلب مستني اعتماد وصل للمعتمد على البريد والواتساب، والسجل بيقول اتبعتت",
      "ms": 401.0801,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-05: الطلب السري — القالب العام على القناتين من غير نوع ولا اسم، ومستلمه مخفي في السجل",
      "ms": 306.1797,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-06: حدث من غير قالب واتساب «اتخطّى»، ومستلم من غير رقم «اتخطّى»، وموبايل الملف بياخد مكانه لما الإدارة تفتح الاختيار بس",
      "ms": 931.454,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-07: اختيار المستخدم «مقفول» محترم على الواتساب، و«إلزامي» بيلغيه، وصفحة المستخدم بتقول إيه الإلزامي",
      "ms": 608.783,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-08: ساعات الهدوء بتأجّل الواتساب، وفشل المزوّد: إعادة محاولة، والرقم المرفوض «فشل» من غير إعادة، والتوكن المرفوض بيوقّف الإرسال",
      "ms": 1001.338,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-09: القناة المقفولة = ولا صف؛ واللي اتقفلت قبل الإرسال «اتخطّى»؛ وجدول الحدث × القناة بيقفل البريد أو داخل النظام للحدث لوحده",
      "ms": 1163.9036,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-10: رقم واتساب الموظف بنطاق الفروع والصلاحية، ومين ناقصه رقم أو بريد",
      "ms": 132.9798,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-11: البحث في سجل الإرسال — القناة والحالة والحدث واسم المستلم والتاريخ والصفحات، واسم مستلم السري مابيطابقش",
      "ms": 202.6852,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-12: القالب الإنجليزي للي لغة حسابه إنجليزي، والباقي عربي",
      "ms": 581.7139,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels-migration.integration.cjs",
      "name": "NCM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 12601.0158,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels-migration.integration.cjs",
      "name": "NCM-2: من غير الجداول السلوك هو سلوك النظام قبل الدفعة؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإعداد بيتحفظ",
      "ms": 6865.4841,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels-migration.integration.cjs",
      "name": "NCM-3: آمن للتكرار، وجدول موجود بشكل تاني بيوقّف الترحيل من غير ما يغيّر حاجة",
      "ms": 2605.2281,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-01: every card has its own permission on top of the dashboard permission, and the money card needs the payroll permission",
      "ms": 11978.4231,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-02: a one-branch HR manager opens the dashboard, picks an administration, clicks \"absent\" in a team and sees the names — inside the branch only",
      "ms": 273.8765,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-03: absent and late by name grouped by team, and the phone only for whoever may see employees",
      "ms": 11.3782,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-04: no amount without the payroll permission — the field is absent, and the payroll card is refused",
      "ms": 457.0494,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-05: a closed module removes its card, and its endpoint answers like a missing route",
      "ms": 328.621,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-06: the workforce numbers are the metrics dictionary numbers, and the expiring lists stay inside the scope and the permission",
      "ms": 375.5151,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-07: leaves, requests, tasks and trends count inside the scope and follow the dashboard filter",
      "ms": 143.2204,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-08: the dashboard opens within the 3-second target for 600 employees",
      "ms": 7279.4261,
      "pass": true,
      "skip": false
    },
    {
      "file": "job-share.integration.cjs",
      "name": "JS-01: لوحة «انشر الوظيفة» — بصلاحيتها وبنطاق الفروع، وللمنشورة «خارجي» بس وبشكلها العام، وقنوات النشر، ومن غير كتابة",
      "ms": 12753.5262,
      "pass": true,
      "skip": false
    },
    {
      "file": "job-share.integration.cjs",
      "name": "JS-02: «خلص لما» — لينك LinkedIn من اللوحة ← مرشح قدّم منه ← مصدره «LinkedIn» في المرشحين وفي «مصادر المرشحين»؛ والمجهول «لينك عام»",
      "ms": 671.9246,
      "pass": true,
      "skip": false
    },
    {
      "file": "job-share.integration.cjs",
      "name": "JS-03: الفيد العام — ورا ميزة الصفحة العامة، والمنشور «خارجي» بس وبخاناته العامة، ولينك التقديم بمصدره",
      "ms": 244.3397,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements-home.integration.cjs",
      "name": "AH-01: an announcement for one department notifies its employees only, shows on their board (pinned first), and the read rate is right",
      "ms": 12282.6955,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-01: النماذج والدورات — القيم، ونطاق الفروع، والإطلاق بتكليف لكل موظف شغال بمديره ونسخة نموذج متجمّدة",
      "ms": 12516.157,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-02: التقييم الذاتي وتقييم المدير — مرة واحدة، على النموذج المتجمّد وأهداف الفترة، والدرجة بالأوزان، والأدلة بتتجمّد مع الرد",
      "ms": 779.6652,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-03: إدارة الأداء — تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات",
      "ms": 285.6458,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-04: الاعتماد والإعلان والإقرار — المدير سلّم ← معتمد ← معلن ← الموظف أقرّ، وتقييم المدير بيظهر للموظف بعد الإعلان بس",
      "ms": 351.5364,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-05: المعايرة والاعتراض — تعديل بسبب قبل الاعتماد بيتسجّل (قبل/بعد/مين)، وتوزيع التقديرات لكل مدير، والاعتراض طلب مربوط بتقييم معلن في مهلته ومرة واحدة، والمعايرة بعد اعتراض اتقبل",
      "ms": 1568.2223,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-06: a cycle with a unified audience (a unit with what is under it, minus the excluded) launches for its people only, inside the manager's branches",
      "ms": 142.1549,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-01: الموديول مقفول افتراضيًا؛ الكتالوج بقيمه وتعديله بالخانات؛ والجلسات بقيمها ونطاق الفروع",
      "ms": 9956.8023,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-02: التسجيل تحت قفل الجلسة بنطاق الفروع والسعة، والحضور والإكمال، والشهادة مستند موظف بانتهائه، والمقفول مابيتغيّرش",
      "ms": 644.6735,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-03: الموظف — «دوراتي» بشهادته، وتقييم التدريب مرة واحدة بعد الحضور، ومش لتسجيل غيره",
      "ms": 168.556,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-04: «طلب تدريب» — الجلسة من المتاح لفرع مقدّم الطلب، ورقمها بيثبّته الخادم، والاعتماد النهائي بيسجّله تحت قفل الجلسة والسعة، والجلسة اللي راحت بتوقّف الاعتماد",
      "ms": 985.1208,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-05: ميزانية الأقسام وتقرير التكلفة مقابلها بنطاق الفروع، والتدريب الإلزامي لمسمى أو قسم والناقص منه (لإدارة التدريب، وللمدير عن فريقه)",
      "ms": 508.178,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-06: enrolling by a unified audience registers the current employees of the audience inside the account scope, under the same session rules",
      "ms": 120.0719,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_cdf7e949797f1060",
    "تحقق حذف قاعدة الاختبار: hr_otaudience_test_6070302c80918877",
    "Cleanup verified: hr_notify_channels_test_1ef3b271b0bdaef6 is absent from sys.databases.",
    "Cleanup verified: hr_notify_channels_migration_test_5a6de18ef90a3b81 is absent from sys.databases.",
    "600 employees, 60 without a row — first open 1098 ms (cards in parallel: {\"requests\":39,\"leaves\":45,\"tasks\":51,\"trends\":85,\"overtime\":99,\"workforce\":100,\"payroll\":121,\"absentLate\":1094,\"attendance\":1095}), second open 87 ms, drill-down + names 8 ms",
    "600 employees, 300 without a row — first open 3412 ms (cards in parallel: {\"leaves\":35,\"requests\":40,\"trends\":44,\"tasks\":69,\"overtime\":90,\"workforce\":94,\"payroll\":113,\"attendance\":3409,\"absentLate\":3408}); the attendance engine's own live-absence pass for the same scope: 1428 ms (0 rows); names of one team with shifts 50 ms",
    "تحقق حذف قاعدة الاختبار: hr_dashboard_cards_test_ec0522d17588e513",
    "Cleanup verified: hr_job_share_test_c9056517012f8e7e is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_annhome_test_ddd2e6c2d8ccc4e3",
    "Cleanup verified: hr_perf_reviews_test_2add63c348bd5fc3 is absent from sys.databases.",
    "tests 48",
    "suites 0",
    "pass 48",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 92329.6049"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_cdf7e949797f1060\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_cdf7e949797f1060\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_otaudience_test_6070302c80918877\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_otaudience_test_6070302c80918877\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_1ef3b271b0bdaef6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_1ef3b271b0bdaef6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_migration_test_5a6de18ef90a3b81\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_migration_test_5a6de18ef90a3b81\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dashboard_cards_test_ec0522d17588e513\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dashboard_cards_test_ec0522d17588e513\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_job_share_test_c9056517012f8e7e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_job_share_test_c9056517012f8e7e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_annhome_test_ddd2e6c2d8ccc4e3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_annhome_test_ddd2e6c2d8ccc4e3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_reviews_test_2add63c348bd5fc3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_reviews_test_2add63c348bd5fc3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_training_test_4fbbc4fa3cb4453e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_training_test_4fbbc4fa3cb4453e\"}\n"
  ]
}
