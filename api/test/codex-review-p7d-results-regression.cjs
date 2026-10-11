module.exports = {
  "selected": [
    "notification-channels",
    "notifications",
    "notification-channels-migration"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 33,
      "failed": 0,
      "passed": 33,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 33,
      "suites": 0
    },
    "duration_ms": 41187.9379
  },
  "results": [
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-01: الافتراضي = سلوك النظام الحالي، والشاشة لمدير النظام بس",
      "ms": 10974.1866,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-02: خادم البريد من الشاشة — كلمة السر مختومة ومابترجعش، والإعداد المحفوظ بياخد مكان إعداد الخادم من غير إعادة تشغيل",
      "ms": 187.8194,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-03: الواتساب من الشاشة — التوكن مختوم ومابيرجعش، وربط قالب Meta بمتغيرات الحدث، ورسالة التجربة على خادم Meta بس",
      "ms": 156.9309,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-04: «خلص لما» — طلب مستني اعتماد وصل للمعتمد على البريد والواتساب، والسجل بيقول اتبعتت",
      "ms": 349.4384,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-05: الطلب السري — القالب العام على القناتين من غير نوع ولا اسم، ومستلمه مخفي في السجل",
      "ms": 279.9252,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-06: حدث من غير قالب واتساب «اتخطّى»، ومستلم من غير رقم «اتخطّى»، وموبايل الملف بياخد مكانه لما الإدارة تفتح الاختيار بس",
      "ms": 746.5589,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-07: اختيار المستخدم «مقفول» محترم على الواتساب، و«إلزامي» بيلغيه، وصفحة المستخدم بتقول إيه الإلزامي",
      "ms": 457.0694,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-08: ساعات الهدوء بتأجّل الواتساب، وفشل المزوّد: إعادة محاولة، والرقم المرفوض «فشل» من غير إعادة، والتوكن المرفوض بيوقّف الإرسال",
      "ms": 799.6756,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-09: القناة المقفولة = ولا صف؛ واللي اتقفلت قبل الإرسال «اتخطّى»؛ وجدول الحدث × القناة بيقفل البريد أو داخل النظام للحدث لوحده",
      "ms": 859.0213,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-10: رقم واتساب الموظف بنطاق الفروع والصلاحية، ومين ناقصه رقم أو بريد",
      "ms": 95.7019,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-11: البحث في سجل الإرسال — القناة والحالة والحدث واسم المستلم والتاريخ والصفحات، واسم مستلم السري مابيطابقش",
      "ms": 140.6445,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-12: القالب الإنجليزي للي لغة حسابه إنجليزي، والباقي عربي",
      "ms": 379.6664,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-13 (P7A-B08): الملخص اليومي بيحترم قفل بريد الحدث من «قنوات الإشعارات» — اللي اتجمّع قبل القفل «اتخطّى»",
      "ms": 375.9382,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-14 (P7A-B09): حفظ رقم واتساب الموظف بيقفل صفه — نقله لفرع تاني بيستنى لحد ما الحفظ يخلص، ومابيتكتبش رقم لموظف برّه نطاق الكاتب",
      "ms": 548.2637,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-15 (P7A-B08, P7B): بريد الحدث بيتحكم لكل رسالة في الملخص — لو اتقفل بعد رسالة مستلم، المستلم اللي بعده مابيتبعتلوش",
      "ms": 409.7506,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-16 (P7A-B08, P7C): حكم بريد أحداث الملخص قراءة واحدة وآخر حاجة قبل تسليم الرسالة — تسجيل «اتخطّى» بييجي بعد التسليم ومابيفصلش بينهم",
      "ms": 562.5593,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "ms": 10854.021,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "ms": 969.4334,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "ms": 765.0787,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "ms": 979.3155,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "ms": 818.6109,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "ms": 331.969,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "ms": 1767.4521,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "ms": 2179.5395,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "ms": 1904.6796,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "ms": 3156.1852,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "ms": 380.2325,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "ms": 192.1806,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "ms": 1829.0682,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "ms": 2562.4376,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels-migration.integration.cjs",
      "name": "NCM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 9934.7188,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels-migration.integration.cjs",
      "name": "NCM-2: من غير الجداول السلوك هو سلوك النظام قبل الدفعة؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإعداد بيتحفظ",
      "ms": 5624.5439,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels-migration.integration.cjs",
      "name": "NCM-3: آمن للتكرار، وجدول موجود بشكل تاني بيوقّف الترحيل من غير ما يغيّر حاجة",
      "ms": 2268.8266,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_notify_channels_test_77fac41d7c2401cf is absent from sys.databases.",
    "Cleanup verified: hr_notifications_test_dfae1f745f3a00cd is absent from sys.databases.",
    "Cleanup verified: hr_notify_channels_migration_test_edb971f468745f47 is absent from sys.databases.",
    "tests 33",
    "suites 0",
    "pass 33",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 41187.9379"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_77fac41d7c2401cf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_77fac41d7c2401cf\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notifications_test_dfae1f745f3a00cd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notifications_test_dfae1f745f3a00cd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_migration_test_edb971f468745f47\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_migration_test_edb971f468745f47\"}\n"
  ]
}
