module.exports = {
  "target": "af310a6",
  "head": "9236c5c",
  "counts": {
    "passed": 184,
    "failed": 3,
    "skipped": 0
  },
  "runs": [
    {
      "file": "codex-review-p2p-results-core.cjs",
      "counts": {
        "tests": 12,
        "failed": 0,
        "passed": 12,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 12,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2p-results-boundaries.cjs",
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2p-results-boundaries-final.cjs",
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2p-results-boundaries-final2.cjs",
      "counts": {
        "tests": 39,
        "failed": 3,
        "passed": 36,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 39,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2p-results-independent.cjs",
      "counts": {
        "tests": 4,
        "failed": 2,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2p-results-regression.cjs",
      "counts": {
        "tests": 126,
        "failed": 8,
        "passed": 118,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 126,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2p-results-independent-final.cjs",
      "counts": {
        "tests": 7,
        "failed": 0,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2p-results-concurrency-rcsi.cjs",
      "counts": {
        "tests": 3,
        "failed": 0,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2p-results-decision-adapted.cjs",
      "counts": {
        "tests": 8,
        "failed": 0,
        "passed": 8,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      }
    }
  ],
  "rows": [
    {
      "file": "comments.integration.cjs",
      "name": "CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-2: من غير الجدول الحوار «مش متاح» والتعليق مرفوض برسالته؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده التعليق بيتكتب من غير إعادة تشغيل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-3: آمن للتكرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-core.cjs"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
      "pass": false,
      "error": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "cause": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "stack": "AssertionError [ERR_ASSERTION]: A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:21:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "pass": false,
      "error": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "cause": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P ordinary file owner remains allowed while an unbound upload is private to that account",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P request made on behalf: unlinking its owner account must not reveal internal comments to that same account",
      "pass": false,
      "error": "The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n",
      "cause": "The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:57:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-01: مدخل التعليق — النص بحده بعد توحيد نهايات السطور، و«داخلي» قيمة منطقية، والأرقام صالحة ومن غير تكرار وبحدودها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-02: الإشارة لأدوار الكيان نفسه بس — دور كيان تاني أو اسم مش معروف مرفوض",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-03: الإشارات المخزّنة — من غير إشارات مابيتخزنش حاجة، وأي شكل غير متوقع بيتقري «من غير إشارات»",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-01: عميل الـAPI على مسارات الخادم نفسها وبحدوده، والمسارات الأربعة بموديول كيانها ومن غير صلاحية خاصة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-02: مكوّن الحوار — مابيعرضش حاجة قبل الترحيل، وضغطتين تعليق واحد، والداخلي مايشاورش لصاحب الطلب ولا تعليق ظاهر يرد على داخلي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-03: الحوار في تفاصيل الطلب (الشاشات التلاتة) وفي كارت المهمة العادية بس، ولينك الإشعار بيفتح الموضوع",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والقيم بنفس كتالوج الخادم",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-02: اختيارات المستخدم في صفحة الإشعارات — البريد (فورًا، ملخص يومي، مقفول) وداخل النظام للفئات المخزّنة بس، وفئة الرواتب باسمها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-03: لوحة الإشعارات تحت «المهام المجدولة» — سجل الإرسال بحالاته وسببه، وتعديل القوالب بمتغيراتها والرجوع للافتراضي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-04: الإعدادات التلاتة في «سياسات النظام» بنفس مفاتيح الخادم وحدوده، والبريد مقفول افتراضيًا",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-05: المهمة المجدولة للملخص اليومي متسجّلة في القايمة وسجل الموديولات، ومسح مهام الطابور المنتهية مع مسح السجل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-boundaries-final2.cjs"
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P internal rows cannot alter public truncation, reply references or author identity after transfer",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-independent-final.cjs"
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P comment rollback and deadlock retry leave exactly one comment, attachment binding and outbox event",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-independent-final.cjs"
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P immediate and digest email recheck current requester identity, with active-recipient controls",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-independent-final.cjs"
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P all four comment endpoints and upload remain behind the policy acknowledgement gate",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-independent-final.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-2: من غير الجداول الإشعارات المخزّنة والبريد واقفين من غير أخطاء؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-3: آمن للتكرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-01: مهمة لموظف — في «مهامي» بتاعته بس، ويشوفها أصحاب الحق، وبرّه كده 404",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-02: حدود التكليف — مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، ومن غير كاشف وجود",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-03: المدير المباشر بيكلّف مرؤوسيه من غير صلاحية — مش غيرهم ولا نفسه ولا دور",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-04: الحالة — المسؤول يبدأ ويعلّق ويقفل بإثبات، والمنشئ يلغي ويعيد الفتح، وإقفالين في نفس اللحظة واحد بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-05: مهمة الدور — لحاملي الدور اللي فرعها في نطاقهم، ومش مدير النظام في «مهامي» بتاعته",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-06: «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-07: «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-08: قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-09: التعديل والتحويل للمنشئ أو صاحب الصلاحية — التحويل تكليف جديد، وتغيير الموعد بيرجّع التذكير",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-10: التذكير والتصعيد مرة واحدة لكل مهمة وموعد، بأيام الإعدادين، والمقفولة برّه",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-11: التهيئة وقت التعيين — المهام بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-13: حدود الإعدادين",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-14: إشعارات المهام بالبريد — تكليف وتذكير للمسؤول، وتأخير لمديره، بالعنوان والموعد بس وبفحص وقت الإرسال",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-16: طلبات متزامنة أكتر من اتصالات المجمّع — كل طلب على اتصال معاملته، ومحدش بيستنى اتصال تاني",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-17: مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server) — «فريقي» وقايمة التكليف و«مهامي» شغالين",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-18: مهمة مسوغات التعيين في «مهامي» حالتها من المستندات دلوقتي — من غير ما شاشة التهيئة تتفتح الأول",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-01: نوع من غير الإعداد — الاعتماد بيكمّل الطلب في لحظتها ومن غير مهمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-02: الإعداد على نوع الطلب — الدور والمهلة والإثبات بحدودهم، وشيل الدور بيشيل الباقي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-03: نوع عليه مهمة — الطلب «قيد التنفيذ» ومهمة واحدة على الدور في فرع الطلب، وفي «مهامي» والتقرير",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-04: اللي المهمة عليه بيقرا الطلب، وحامل الدور في فرع تاني والغريب لأ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-05: إقفال المهمة — الطلب «مكتمل» وسطر «اتنفّذ» وبريد لصاحبه؛ والإثبات الإجباري، وإقفالين في نفس اللحظة، ومن غير إعادة فتح",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-06: مهمة التنفيذ ماتتلغيش ولا تتعدّل ولا تتحوّل من شاشة المهام — رفض التنفيذ من لوحة الطلبات بيلغيها ويرفض الطلب",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-07: الطلب السري — عنوان المهمة عام ومن غير اسم معتمده، وأصحاب «عرض كل المهام» و«إدارة المهام» مالهمش طريق له، والمنفّذ بيقراه",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-08: المهمة والاعتماد معاملة واحدة — لو المهمة ماتكتبتش، الاعتماد كله بيرجع",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-09: باقي مداخل الاعتماد — سلسلة فاضية باعتماد تلقائي، وطلب الموارد البشرية نيابةً؛ ومعالج لسه ماخلّصش من غير مهمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-10: محدش ينفّذ طلبه — صاحب الطلب ومنشئه نيابةً مايشتغلوش على مهمته، ومدير النظام بيفكّ الانسداد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-11: إثبات مهمة التنفيذ وسبب تعليقها ومين قفلها — للي يقدر يفتح الطلب بس، وملف إثباتها لرافعه",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-12: إقفال المهمة ورفض تنفيذ الطلب في نفس اللحظة — واحد بس بيكسب والتاني بيترفض برسالة، من غير تعليق متبادل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-13: مهمة ربطها بطلبها اتثبّت والنداء واقف على صفها — مابتتعاملش كمهمة عادية",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-01: الإنشاء — الموظف لنفسه، ولغيره بصلاحية وفي نطاقه؛ وحدود الفترة والفئات والبديل؛ والقايمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-11: تفويضين متداخلين لنفس المفوِّض في نفس اللحظة — واحد بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-01: الإصدار بطلب إقرار — الطلب والمهمة وبصمة الملف مع الإصدار؛ ومن غير موظف مرفوض؛ وحدود الموعد؛ ومفتاح منع التكرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-02: «مستني إقرارك» وقراءة المستند — لصاحبه بس، والبصمة من قراءة المستند مش من القايمة، وملفه بحجمه المعلَن",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-03: الإقرار — صاحب المستند لنفسه، وببصمة ملفه، ومرة واحدة، والدليل؛ ومهمته بتتقفل معاه",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-04: الملف — اتبدّل على التخزين مابيتعرضش؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-05: المهمة في محرك المهام — في «مهامي» برابط مستندها، ومابتتقفلش ولا بتتعدّل ولا بتتلغي من شاشة المهام، والتذكير والتصعيد شغالين عليها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-06: الإلغاء — لصاحب «إدارة المستندات» اللي يشوف المستند، وقبل الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-07: السجل — حالة الإقرار وفلترها، وبنطاق القارئ بفرع الموظف دلوقتي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-08: إقرار المستند مابيقفلش النظام (حتى المتأخر)؛ والحساب المقفول على سياسة إلزامية بيقرّ بيها الأول",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-decision-adapted.cjs"
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-decision-adapted.cjs"
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-decision-adapted.cjs"
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-decision-adapted.cjs"
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-decision-adapted.cjs"
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-decision-adapted.cjs"
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-decision-adapted.cjs"
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-decision-adapted.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-regression.cjs"
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P two comments race for one attachment with RCSI=false",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-independent-final.cjs"
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P task transfer while comment waits rechecks the new assignee with RCSI=false",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-independent-final.cjs"
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P late document/execution task mapping rejects comments with RCSI=false",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-independent-final.cjs"
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P two comments race for one attachment with RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-concurrency-rcsi.cjs"
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P task transfer while comment waits rechecks the new assignee with RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-concurrency-rcsi.cjs"
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P late document/execution task mapping rejects comments with RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2p-results-concurrency-rcsi.cjs"
    }
  ],
  "notes": [
    "Unique test names use their latest completed outcome. READ COMMITTED and RCSI concurrency cases have distinct names. Repeated attempts are retained in raw result files.",
    "The three final failures are independent authorization assertions, reproduced through actual account PATCH endpoints and new sessions. Existing sessions correctly return 401.",
    "Initial review-only fixture issues were corrected: an account must be unlinked before another account takes its employee; the existing notifications route is /notifications; policy publication rejects past dates, so the owned database was aged after publication; author assertions now identify the intended comment by opaque ref.",
    "The existing request-decision-race fixture uses a database name outside the review safety allowlist. Eight before-hook failures happened before database creation. A review-only copy changes just that temporary name/cleanup pattern and adds instance mail mocks; the same eight assertions pass. Its final outcomes supersede the safety-guard setup failures.",
    "All enabled notification tests replace MailService.send and isConfigured on the actual instance. The network guard independently blocks real SMTP and listening ports.",
    "HTTP is exercised in process through Express with guards, interceptors and authorization intact. The download shim permits dotfile ancestors only under the private review upload root (.claude). A deterministic synthetic PDF renderer supports document regressions; no native Chromium or browser-visual validation is claimed.",
    "Migration 093 tests cover pre-migration behavior, same-process availability after applying it, idempotence and schema parity. The available engine is SQL Server 2022 with compatibility level 150, not an actual SQL Server 2019 instance.",
    "No performance conclusion is drawn from recorded runner durations. Only new codex-review-p2p-* evidence and the requested report were written."
  ]
}
