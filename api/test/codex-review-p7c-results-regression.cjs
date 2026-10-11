module.exports = {
  "selected": [
    "org-audience",
    "notification-channels",
    "modules-settings",
    "modules-enforcement",
    "notifications",
    "surveys"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 62,
      "failed": 0,
      "passed": 62,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 62,
      "suites": 0
    },
    "duration_ms": 59322.405
  },
  "results": [
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-01: the preview counts and names an audience at every level, inside the asker's branch scope only",
      "ms": 9356.0478,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-02: an announcement for one administration reaches its people only; exclusion; a branch account targets units of its own branches only",
      "ms": 426.2906,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-03: a policy, a knowledge article and a survey for one administration apply to its people only",
      "ms": 290.3595,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-04: a module opened for one administration is on for its people only (and whoever is excluded by name is out)",
      "ms": 151.3863,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-05: a group task gives every employee of the audience their own task, inside the assigner's branch scope, and only to permission holders",
      "ms": 183.5313,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-06 (P7A-B01): a team or a unit that moved to another branch is out of its old branch audience — on the board and in the preview",
      "ms": 115.9855,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-07 (P7A-B02): an incomplete new-shape audience is refused, and a damaged stored one opens for nobody",
      "ms": 61.2763,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-08 (P7A-B03): a group task holds its employees' rows — a transfer waits until the tasks are written, and never lands between the rule and the write",
      "ms": 540.4259,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-09 (P7A-B01, P7B): a module opened for a team of a branch closes for its people the moment the team moves to another branch — no cached answer",
      "ms": 157.2767,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-01: الافتراضي = سلوك النظام الحالي، والشاشة لمدير النظام بس",
      "ms": 9532.9099,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-02: خادم البريد من الشاشة — كلمة السر مختومة ومابترجعش، والإعداد المحفوظ بياخد مكان إعداد الخادم من غير إعادة تشغيل",
      "ms": 184.9671,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-03: الواتساب من الشاشة — التوكن مختوم ومابيرجعش، وربط قالب Meta بمتغيرات الحدث، ورسالة التجربة على خادم Meta بس",
      "ms": 148.4732,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-04: «خلص لما» — طلب مستني اعتماد وصل للمعتمد على البريد والواتساب، والسجل بيقول اتبعتت",
      "ms": 284.722,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-05: الطلب السري — القالب العام على القناتين من غير نوع ولا اسم، ومستلمه مخفي في السجل",
      "ms": 242.8572,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-06: حدث من غير قالب واتساب «اتخطّى»، ومستلم من غير رقم «اتخطّى»، وموبايل الملف بياخد مكانه لما الإدارة تفتح الاختيار بس",
      "ms": 648.2072,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-07: اختيار المستخدم «مقفول» محترم على الواتساب، و«إلزامي» بيلغيه، وصفحة المستخدم بتقول إيه الإلزامي",
      "ms": 508.0154,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-08: ساعات الهدوء بتأجّل الواتساب، وفشل المزوّد: إعادة محاولة، والرقم المرفوض «فشل» من غير إعادة، والتوكن المرفوض بيوقّف الإرسال",
      "ms": 820.3868,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-09: القناة المقفولة = ولا صف؛ واللي اتقفلت قبل الإرسال «اتخطّى»؛ وجدول الحدث × القناة بيقفل البريد أو داخل النظام للحدث لوحده",
      "ms": 912.857,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-10: رقم واتساب الموظف بنطاق الفروع والصلاحية، ومين ناقصه رقم أو بريد",
      "ms": 126.501,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-11: البحث في سجل الإرسال — القناة والحالة والحدث واسم المستلم والتاريخ والصفحات، واسم مستلم السري مابيطابقش",
      "ms": 207.7919,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-12: القالب الإنجليزي للي لغة حسابه إنجليزي، والباقي عربي",
      "ms": 397.9765,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-13 (P7A-B08): الملخص اليومي بيحترم قفل بريد الحدث من «قنوات الإشعارات» — اللي اتجمّع قبل القفل «اتخطّى»",
      "ms": 428.5863,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-14 (P7A-B09): حفظ رقم واتساب الموظف بيقفل صفه — نقله لفرع تاني بيستنى لحد ما الحفظ يخلص، ومابيتكتبش رقم لموظف برّه نطاق الكاتب",
      "ms": 545.4942,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-15 (P7A-B08, P7B): بريد الحدث بيتحكم لكل رسالة في الملخص — لو اتقفل بعد رسالة مستلم، المستلم اللي بعده مابيتبعتلوش",
      "ms": 426.6544,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-01: الصلاحية — settings.modules بس، والكتابة لحساب على مستوى الشركة",
      "ms": 9361.2237,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-02: الكتالوج — الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات",
      "ms": 4.1437,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-03: التفعيل والقفل من الشاشة — الأثر فوري والتغيير متسجّل باسم اللي عمله",
      "ms": 132.6508,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-04: الرفض — تبعيات وأساسي ومجهول وجسم غلط، ومفيش حاجة بتتكتب",
      "ms": 188.2564,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-05: أثر القفل قبل القفل — الطلبات المفتوحة والبيانات الشغالة",
      "ms": 220.7574,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-06: الباقات — معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات",
      "ms": 321.094,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-07: المزايا الفرعية وجمهور التفعيل من الشاشة",
      "ms": 225.8731,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-08: شاشة الأدوار — صلاحيات الموديول المقفول متعلّمة، والممنوحة منها بتفضل على الدور",
      "ms": 267.3619,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 9379.9073,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 108.177,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 241.8137,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 412.1981,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 124.1112,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 271.6263,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 328.3817,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 478.8417,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1435.1187,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 344.1196,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 610.4626,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 151.3489,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "ms": 10507.9292,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "ms": 1040.4852,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "ms": 870.9802,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "ms": 1211.2799,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "ms": 1032.4304,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "ms": 407.2084,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "ms": 2349.1397,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "ms": 2175.7712,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "ms": 1673.342,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "ms": 2732.8538,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "ms": 298.4899,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "ms": 161.2179,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "ms": 1594.4076,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "ms": 2414.403,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-01: الإدارة — القيم وجمهور حساب الفروع، والمسودة بتتعدّل والمفتوح لأ، والفتح بيعمل دعوة لكل موظف حالي في الجمهور بمجموعته",
      "ms": 10501.2623,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-02: السرية الحقيقية — الرد المجهول من غير موظف ولا ساعة ولا رابط بالدعوة ولا سطر تدقيق، ومرة واحدة، والنتايج بالحد الأدنى ومن غير طرح",
      "ms": 911.2848,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-03: الاستبيان بالاسم بيسجّل الموظف؛ والمقفول واللي فات آخر يومه مابيتردّش عليهم؛ والموديول المقفول",
      "ms": 188.6191,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-04: Codex P3L-B02 — الإخفاء التكميلي لكل سؤال، والقفل بيستنى الرد الجاري فالنتايج بعده ثابتة",
      "ms": 6412.2889,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_e5d62680baccfe74",
    "Cleanup verified: hr_notify_channels_test_b1efe5edc9b436d4 is absent from sys.databases.",
    "Cleanup verified: hr_modules_settings_test_9b5a96472e93513b is absent from sys.databases.",
    "Cleanup verified: hr_modules_test_a4b7b31cb9567801 is absent from sys.databases.",
    "Cleanup verified: hr_notifications_test_8d854ca6bfdd8f3e is absent from sys.databases.",
    "tests 62",
    "suites 0",
    "pass 62",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 59322.405"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_e5d62680baccfe74\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_e5d62680baccfe74\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_b1efe5edc9b436d4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_b1efe5edc9b436d4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_settings_test_9b5a96472e93513b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_settings_test_9b5a96472e93513b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_a4b7b31cb9567801\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_a4b7b31cb9567801\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notifications_test_8d854ca6bfdd8f3e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notifications_test_8d854ca6bfdd8f3e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_surveys_test_e61270b8c8aaf4aa\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_surveys_test_e61270b8c8aaf4aa\"}\n"
  ]
}
