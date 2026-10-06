module.exports = {
  "selected": [
    "codex-review-p2q-boundaries",
    "codex-review-p2q-units",
    "comments",
    "comments-migration"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 51,
      "failed": 0,
      "passed": 51,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 51,
      "suites": 0
    },
    "duration_ms": 82343.7545
  },
  "results": [
    {
      "file": "codex-review-p2q-boundaries.integration.cjs",
      "name": "P2Q internal attachment must obey current comment visibility after its uploader becomes the requester",
      "ms": 7676.7563,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-boundaries.integration.cjs",
      "name": "P2Q in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "ms": 563.5995,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-boundaries.integration.cjs",
      "name": "P2Q ordinary file owner remains allowed while an unbound upload is private to that account",
      "ms": 45.5094,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-boundaries.integration.cjs",
      "name": "P2Q request made on behalf: unlinking its owner account must not reveal internal comments to that same account",
      "ms": 167.9471,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-01: مدخل التعليق — النص بحده بعد توحيد نهايات السطور، و«داخلي» قيمة منطقية، والأرقام صالحة ومن غير تكرار وبحدودها",
      "ms": 4.8715,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-02: الإشارة لأدوار الكيان نفسه بس — دور كيان تاني أو اسم مش معروف مرفوض",
      "ms": 0.2634,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-03: الإشارات المخزّنة — من غير إشارات مابيتخزنش حاجة، وأي شكل غير متوقع بيتقري «من غير إشارات»",
      "ms": 0.2915,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-01: عميل الـAPI على مسارات الخادم نفسها وبحدوده، والمسارات الأربعة بموديول كيانها ومن غير صلاحية خاصة",
      "ms": 400.826,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-02: مكوّن الحوار — مابيعرضش حاجة قبل الترحيل، وضغطتين تعليق واحد، والداخلي مايشاورش لصاحب الطلب ولا تعليق ظاهر يرد على داخلي",
      "ms": 1.4168,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-03: الحوار في تفاصيل الطلب (الشاشات التلاتة) وفي كارت المهمة العادية بس، ولينك الإشعار بيفتح الموضوع",
      "ms": 5.0569,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "ms": 0.9127,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "ms": 0.3882,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "ms": 0.2852,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "ms": 0.4428,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "ms": 0.2987,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "ms": 0.2414,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والقيم بنفس كتالوج الخادم",
      "ms": 16.9759,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-02: اختيارات المستخدم في صفحة الإشعارات — البريد (فورًا، ملخص يومي، مقفول) وداخل النظام للفئات المخزّنة بس، وفئة الرواتب باسمها",
      "ms": 1.4083,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-03: لوحة الإشعارات تحت «المهام المجدولة» — سجل الإرسال بحالاته وسببه، وتعديل القوالب بمتغيراتها والرجوع للافتراضي",
      "ms": 1.8095,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-04: الإعدادات التلاتة في «سياسات النظام» بنفس مفاتيح الخادم وحدوده، والبريد مقفول افتراضيًا",
      "ms": 3.1138,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-05: المهمة المجدولة للملخص اليومي متسجّلة في القايمة وسجل الموديولات، ومسح مهام الطابور المنتهية مع مسح السجل",
      "ms": 1.8005,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 18.3881,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 1.1243,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 1.2369,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 36.5454,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.646,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.943,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.4492,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 1.0476,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 193.7211,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.495,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2827,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2462,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1882,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2921,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3069,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2597,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2176,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1113,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل",
      "ms": 9959.204,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب",
      "ms": 379.658,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي",
      "ms": 2028.283,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر",
      "ms": 213.1614,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام",
      "ms": 533.9307,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار",
      "ms": 609.4575,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال",
      "ms": 5747.476,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
      "ms": 954.6533,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق",
      "ms": 2033.4045,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11027.6492,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-2: من غير الجدول الحوار «مش متاح» والتعليق مرفوض برسالته؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده التعليق بيتكتب من غير إعادة تشغيل",
      "ms": 3811.1363,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-3: آمن للتكرار",
      "ms": 741.9774,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"rebound-uploader-is-now-requester\",\"threadComments\":0,\"canInternal\":false,\"fileStatus\":404,\"fileBytesMatch\":false}",
    "{\"case\":\"foreign-link-after-account-rebinding\",\"detailStatus\":404,\"threadStatus\":404,\"foreignLinkRetained\":false}",
    "{\"case\":\"known-limit-on-behalf-owner-unlink\",\"canInternal\":false,\"internalBodyVisible\":false}",
    "Cleanup verified: hr_comments_test_92806a45974a7198 is absent from sys.databases.",
    "Cleanup verified: hr_comments_migration_test_527514d8345dbad8 is absent from sys.databases.",
    "tests 51",
    "suites 0",
    "pass 51",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 82343.7545"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_boundaries_test_4810a9e709b5f999\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_boundaries_test_4810a9e709b5f999\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2q_boundaries_test_4810a9e709b5f999\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comments_test_92806a45974a7198\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comments_test_92806a45974a7198\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comments_migration_test_527514d8345dbad8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comments_migration_test_527514d8345dbad8\"}\n"
  ]
}
