module.exports = {
  "selected": [
    "codex-review-p2f-boundaries",
    "notifications",
    "notifications-migration",
    "codex-review-p2f-units",
    "queue-outbox"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 59,
      "failed": 0,
      "passed": 59,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 59,
      "suites": 0
    },
    "duration_ms": 84689.4219
  },
  "results": [
    {
      "file": "codex-review-p2f-boundaries.integration.cjs",
      "name": "P2E control: current approver receives only metadata, branch change before send suppresses it",
      "ms": 5946.6043,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-boundaries.integration.cjs",
      "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
      "ms": 790.5777,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-boundaries.integration.cjs",
      "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
      "ms": 707.9269,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-boundaries.integration.cjs",
      "name": "P2E digest observes quiet hours and resumes after they end",
      "ms": 333.4754,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-boundaries.integration.cjs",
      "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
      "ms": 578.0036,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-boundaries.integration.cjs",
      "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
      "ms": 711.7789,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-boundaries.integration.cjs",
      "name": "P2E added request events are atomic: outbox failure rolls back submission and return",
      "ms": 267.7481,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "ms": 8117.906,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "ms": 995.362,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "ms": 1020.3207,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "ms": 1863.4183,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "ms": 994.7789,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "ms": 352.0539,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "ms": 2391.4057,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "ms": 2460.7283,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "ms": 2049.119,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "ms": 3179.7034,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "ms": 351.663,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "ms": 188.9712,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "ms": 1934.7638,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "ms": 2624.0947,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7847.6005,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-2: من غير الجداول الإشعارات المخزّنة والبريد واقفين من غير أخطاء؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر",
      "ms": 3668.1134,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-3: آمن للتكرار",
      "ms": 826.0531,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "ms": 1.7115,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "ms": 0.7536,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "ms": 0.2583,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "ms": 0.3862,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "ms": 0.2716,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "ms": 0.218,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والقيم بنفس كتالوج الخادم",
      "ms": 219.9672,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-02: اختيارات المستخدم في صفحة الإشعارات — البريد (فورًا، ملخص يومي، مقفول) وداخل النظام للفئات المخزّنة بس، وفئة الرواتب باسمها",
      "ms": 1.6557,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-03: لوحة الإشعارات تحت «المهام المجدولة» — سجل الإرسال بحالاته وسببه، وتعديل القوالب بمتغيراتها والرجوع للافتراضي",
      "ms": 1.1587,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-04: الإعدادات التلاتة في «سياسات النظام» بنفس مفاتيح الخادم وحدوده، والبريد مقفول افتراضيًا",
      "ms": 2.5089,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-05: المهمة المجدولة للملخص اليومي متسجّلة في القايمة وسجل الموديولات، ومسح مهام الطابور المنتهية مع مسح السجل",
      "ms": 0.7641,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.6054,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 1.0242,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.343,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.7537,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 177.1583,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "TZ: الفاضي = توقيت الجهاز، والاسم المعروف مقبول، والغلط بيوقف الإقلاع برسالة واضحة",
      "ms": 2.1714,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "قايمة المهام: كل مهمة بموعد صالح، وكل موعد في الكود من القايمة ومتسجل مرة واحدة، ومفيش @Cron خارجها",
      "ms": 172.09,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "الشاشة: «المهام المجدولة» في الإعدادات بصلاحية إدارة الإعدادات، والخادم بيشترط حساب على كل الفروع",
      "ms": 1.9694,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
      "ms": 0.5672,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
      "ms": 0.213,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
      "ms": 5.462,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
      "ms": 0.266,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
      "ms": 0.131,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
      "ms": 0.1724,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
      "ms": 0.1402,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
      "ms": 0.293,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
      "ms": 0.3219,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
      "ms": 1.346,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-01: حدث اتكتب في معاملة اترجعت مابيتسجلش ومابيتنفذش",
      "ms": 7007.2116,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-02: الحدث المتوزع مهمة لكل مستهلك وبتتنفذ مرة؛ والنوع من غير مستهلك بيتعلّم «اتوزع» من غير مهام",
      "ms": 119.2749,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-03: مهمة فشلت بتتعاد بعد مهلة مش فورًا، وبعد الحد الأقصى DEAD برسالتها، و«إعادة» بترجعها",
      "ms": 125.0412,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-04: عاملين مابياخدوش نفس المهمة، ومنع التكرار بالمفتاح، والمهمة المتمسكة من عامل وقع بترجع",
      "ms": 150.9841,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-05: الأحداث الست من مصادرها الحقيقية في نفس معاملتها",
      "ms": 2288.9971,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-06: شاشة الطابور لحساب الشركة بس، و/health بالعدد بس",
      "ms": 24.3755,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"current-account-scope-control\",\"sent\":1,\"afterBranchChange\":\"SKIPPED\"}",
    "{\"case\":\"module-closed-after-dispatch\",\"outcomes\":[{\"mode\":\"ON\",\"screenStatus\":404,\"sent\":0,\"delivery\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"screenStatus\":404,\"sent\":0,\"delivery\":\"SKIPPED\"}]}",
    "{\"case\":\"relinked-owner-via-public-apis\",\"outcomes\":[{\"mode\":\"ON\",\"userEditStatus\":200,\"requestStatus\":404,\"sent\":0,\"containsOldType\":false,\"delivery\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"userEditStatus\":200,\"requestStatus\":404,\"sent\":0,\"containsOldType\":false,\"delivery\":\"SKIPPED\"}]}",
    "{\"case\":\"quiet-digest\",\"sentInQuiet\":0,\"quietStatus\":\"DIGEST\",\"resumed\":1,\"sentTotal\":1}",
    "{\"case\":\"staggered-delivery-claim\",\"overlapping\":1,\"sent\":1,\"attempts\":1,\"status\":\"SENT\"}",
    "{\"case\":\"confidential-return-staleness\",\"results\":[{\"secret\":false,\"event\":\"request.returned\",\"sent\":0,\"status\":\"SKIPPED\"},{\"secret\":true,\"event\":\"request.confidential\",\"sent\":0,\"status\":\"SKIPPED\"}]}",
    "{\"case\":\"added-event-atomicity\",\"submit\":500,\"return\":500,\"requestsUnchanged\":true,\"actionsUnchanged\":true}",
    "Cleanup verified: hr_notifications_test_4ae2f8489f1aedf4 is absent from sys.databases.",
    "Cleanup verified: hr_notify_migration_test_99895402008651ec is absent from sys.databases.",
    "Cleanup verified: hr_queue_outbox_test_b486e1348089701b is absent from sys.databases.",
    "tests 59",
    "suites 0",
    "pass 59",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 84689.4219"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2f_boundaries_test_3974ff4556c4ed90\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2f_boundaries_test_3974ff4556c4ed90\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2f_boundaries_test_3974ff4556c4ed90\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notifications_test_4ae2f8489f1aedf4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notifications_test_4ae2f8489f1aedf4\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_migration_test_99895402008651ec\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_migration_test_99895402008651ec\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_queue_outbox_test_b486e1348089701b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_queue_outbox_test_b486e1348089701b\"}\n"
  ]
}
