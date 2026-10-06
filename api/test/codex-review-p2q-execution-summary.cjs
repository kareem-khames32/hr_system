module.exports = {
  "target": "85ba28c",
  "head": "5af6c30",
  "counts": {
    "passed": 142,
    "failed": 5,
    "skipped": 0
  },
  "runs": [
    {
      "file": "codex-review-p2q-results-rebinding-race.cjs",
      "counts": {
        "tests": 1,
        "failed": 1,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2q-results-closure.cjs",
      "counts": {
        "tests": 51,
        "failed": 0,
        "passed": 51,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 51,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2q-results-controls.cjs",
      "counts": {
        "tests": 19,
        "failed": 1,
        "passed": 18,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 19,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2q-results-rebinding-sql.cjs",
      "counts": {
        "tests": 1,
        "failed": 1,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2q-results-regression.cjs",
      "counts": {
        "tests": 35,
        "failed": 0,
        "passed": 35,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 35,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2q-results-rcsi.cjs",
      "counts": {
        "tests": 4,
        "failed": 1,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2q-results-rebinding-final.cjs",
      "counts": {
        "tests": 37,
        "failed": 2,
        "passed": 35,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 37,
        "suites": 0
      }
    }
  ],
  "rows": [
    {
      "file": "codex-review-p2q-rebinding-race.integration.cjs",
      "name": "P2Q concurrent account rebindings must retain the intermediate employee identity and keep its internal content hidden",
      "pass": false,
      "error": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "cause": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-race.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "codex-review-p2q-boundaries.integration.cjs",
      "name": "P2Q internal attachment must obey current comment visibility after its uploader becomes the requester",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "codex-review-p2q-boundaries.integration.cjs",
      "name": "P2Q in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "codex-review-p2q-boundaries.integration.cjs",
      "name": "P2Q ordinary file owner remains allowed while an unbound upload is private to that account",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "codex-review-p2q-boundaries.integration.cjs",
      "name": "P2Q request made on behalf: unlinking its owner account must not reveal internal comments to that same account",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-01: مدخل التعليق — النص بحده بعد توحيد نهايات السطور، و«داخلي» قيمة منطقية، والأرقام صالحة ومن غير تكرار وبحدودها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-02: الإشارة لأدوار الكيان نفسه بس — دور كيان تاني أو اسم مش معروف مرفوض",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-03: الإشارات المخزّنة — من غير إشارات مابيتخزنش حاجة، وأي شكل غير متوقع بيتقري «من غير إشارات»",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-01: عميل الـAPI على مسارات الخادم نفسها وبحدوده، والمسارات الأربعة بموديول كيانها ومن غير صلاحية خاصة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-02: مكوّن الحوار — مابيعرضش حاجة قبل الترحيل، وضغطتين تعليق واحد، والداخلي مايشاورش لصاحب الطلب ولا تعليق ظاهر يرد على داخلي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-03: الحوار في تفاصيل الطلب (الشاشات التلاتة) وفي كارت المهمة العادية بس، ولينك الإشعار بيفتح الموضوع",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والقيم بنفس كتالوج الخادم",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-02: اختيارات المستخدم في صفحة الإشعارات — البريد (فورًا، ملخص يومي، مقفول) وداخل النظام للفئات المخزّنة بس، وفئة الرواتب باسمها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-03: لوحة الإشعارات تحت «المهام المجدولة» — سجل الإرسال بحالاته وسببه، وتعديل القوالب بمتغيراتها والرجوع للافتراضي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-04: الإعدادات التلاتة في «سياسات النظام» بنفس مفاتيح الخادم وحدوده، والبريد مقفول افتراضيًا",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-05: المهمة المجدولة للملخص اليومي متسجّلة في القايمة وسجل الموديولات، ومسح مهام الطابور المنتهية مع مسح السجل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-2: من غير الجدول الحوار «مش متاح» والتعليق مرفوض برسالته؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده التعليق بيتكتب من غير إعادة تشغيل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-3: آمن للتكرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-closure.cjs"
    },
    {
      "file": "codex-review-p2q-controls.integration.cjs",
      "name": "P2Q history insertion failure refuses relinking; an account save failure after history remains conservative",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-controls.integration.cjs",
      "name": "P2Q historical owner stays restricted after detach/relink, deactivate/reactivate, and replacement account; history is absent from projected responses",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-controls.integration.cjs",
      "name": "P2Q in-app mentions hide without a reader callback and after identity loss, do not mark hidden rows read, and return unchanged when visibility returns",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-controls.integration.cjs",
      "name": "P2Q hidden notifications must not crowd a still-readable notification out of the returned list",
      "pass": false,
      "error": "Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n",
      "cause": "Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-controls.integration.cjs:69:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-independent.integration.cjs",
      "name": "P2Q internal rows cannot alter public truncation, reply references or author identity after transfer",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-independent.integration.cjs",
      "name": "P2Q comment rollback and deadlock retry leave exactly one comment, attachment binding and outbox event",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-independent.integration.cjs",
      "name": "P2Q immediate and digest email recheck current requester identity, with active-recipient controls",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-independent.integration.cjs",
      "name": "P2Q all four comment endpoints and upload remain behind the policy acknowledgement gate",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q two comments race for one attachment with RCSI=false",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q task transfer while comment waits rechecks the new assignee with RCSI=false",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q late document/execution task mapping rejects comments with RCSI=false",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-controls.cjs"
    },
    {
      "file": "codex-review-p2q-rebinding-sql.integration.cjs",
      "name": "P2Q real SQL row lock: both committed employee bindings remain recorded with RCSI=false",
      "pass": false,
      "error": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "cause": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-sql.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "source": "codex-review-p2q-results-rebinding-sql.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-2: من غير الجداول الإشعارات المخزّنة والبريد واقفين من غير أخطاء؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-3: آمن للتكرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-2: من غير الجدول الإجراءات شغالة والبحث بيقول محتاج الترحيل؛ والمُرحّل بيعمل الجدول والمشغّل والفرق صفر، والتعديل والمسح مرفوضين",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-3: آمن للتكرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-regression.cjs"
    },
    {
      "file": "codex-review-p2q-rebinding-sql.integration.cjs",
      "name": "P2Q real SQL row lock: both committed employee bindings remain recorded with RCSI=true",
      "pass": false,
      "error": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "cause": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-sql.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "source": "codex-review-p2q-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q two comments race for one attachment with RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q task transfer while comment waits rechecks the new assignee with RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q late document/execution task mapping rejects comments with RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2q-rebinding-race.integration.cjs",
      "name": "P2Q a concurrent permissions-only PATCH must not silently restore an old employee binding without recording the displaced identity",
      "pass": false,
      "error": "All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n",
      "cause": "All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-race.integration.cjs:61:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A1 — المعاينة مفيش فيها أي كتابة: لقطة جدول المستخدمين قبلها وبعدها متطابقة بالحرف",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A2 — المعاينة بتقول اللي هيحصل بالظبط: الحسابات الجديدة والربط بالاسم والكود",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B1 — المطابقة برقم البصمة شغّالة في الاتجاهين حتى مع الأصفار البادئة والمسافات",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B2 — الغموض مرفوض بالاسم والكود، ومفيش تخمين ومفيش حساب",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B3 — كل سبب تخطّي/تعارض بيطلع على الحساب الصح",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "C1 — التطبيق بيعمل الحسابات المتوقعة بالظبط: بلا كلمة مرور، بالـGUID، بأقل دور، بفرع الموظف",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "D1 — حساب قائم يُربط ولا يتكرر، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "E1 — تعارض الـGUID بيتقال ومايتكتبش فوقه، والحساب المعطّل والبريد المحجوز مالهمش أي أثر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "F1 — تمرير تاني (وثالت): مفيش إنشاء ولا ربط، ولقطة الجدول متطابقة بالحرف",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G1 — الحساب المتزامن بيدخل بحساب المجال ومفيش حساب تاني بيتعمل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G2 — الدخول الحيّ كسب خطوة رقم البصمة: حساب مجال ما اتزامنش بيطابق بالبصمة ويعمل حساب واحد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G3 — الدخول الحيّ بيرفض المطابقة الغامضة برسالة عربية ومفيش حساب بيتعمل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G4 — حساب المجال المتوقف والموظف الأرشيف لسه مرفوضين في الدخول الحيّ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H1 — المسار محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H2 — التطبيق محتاج apply=true صريحة، وأي قيمة غير منطقية مرفوضة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H3 — قائمة المستخدمين بتعلّم حساب الدومين، ومفيش hash بيخرج",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "A1 — موظف جديد موجود في الدومين: حساب واحد بالظبط اتعمل واتربط، والرد بيقول كده",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "A2 — موظف جديد مش في الدومين: اتحفظ عادي، مفيش حساب، والسبب عربي صريح",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "B1 — الدليل واقف أو مش مضبوط أو بيرمي استثناء غريب: الموظف اتحفظ والطلب ناجح",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "B2 — الدليل بطيء: الإضافة بتنجح والحساب بيتعمل، ومفيش فشل ولا نصف عملية",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C1 — المفتاح مبذور في القاعدة عند الإقلاع بقيمته الافتراضية (مفتوح) بلا أي ترحيل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C2 — المفتاح مقفول: مفيش تزويد ومفيش نداء دليل خالص، والموظف اتحفظ وبسبب واضح",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C3 — الزرّ شغّال والمفتاح مقفول (ضغطة بإيد المالك على موظف بالاسم)",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C4 — فتح المفتاح تاني: التزويد التلقائي رجع في نفس اللحظة بلا إعادة تشغيل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D1 — الزرّ بيعمل حساب للموظف المطابق، والضغط تاني مابيغيّرش ولا بايت",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D2 — الزرّ بيربط حساب قائم: العمود الناقص بس، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D3 — كل سبب تخطّي/تعارض بيتقال بالاسم وبعربي، ومفيش أي حساب بيتعمل لأي واحد منهم",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D4 — الدليل الواقف على الزرّ: سبب واضح ومفيش أي كتابة، والموظف المفقود 404",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "E1 — الزرّ محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F1 — الكارت بيقول «مفيش حساب» بصراحة، وبيقول «حساب دومين» و«حساب عندنا» لما يكون فيه",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F2 — الكارت بيتقرا بصلاحية عرض الملف نفسها، مش بـusers.manage، وبلا أي hash",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F3 — عزل الفرع: حساب مقفول على فرع مايقراش كارت موظف فرع تاني، والمفتاح المقفول بيبان في الكارت",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F4 — المزامنة الجماعية لسه شغّالة زي ما هي جنب الزرّ (معاينة افتراضيًّا)",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2q-results-rebinding-final.cjs"
    }
  ],
  "notes": [
    "Latest outcome per file and test name; repeated reproductions are not double-counted. RC and RCSI test names are distinct.",
    "All four prior P2P boundary assertions pass. The new blocker has four failing assertions: controlled overlapping relinks, a permissions-only stale save, and two real SQL row-lock races under RC and RCSI. Both real SQL races use unmodified service methods and real PATCH requests.",
    "The controlled race pauses one actual UsersController repository save after its original-identity history has committed. Another actual PATCH commits an intermediate employee; a new internal comment is then created and verified hidden while the account is that employee. The delayed save displaces this identity without recording it. A fresh current session exposes the internal text and exact attachment bytes.",
    "The remaining failed assertion is notification pagination: sixty newer mentions that become unreadable are filtered after TOP(60), hiding the older still-readable notification. This is recorded separately as a nonblocking functional issue.",
    "History failure blocks user saving; user-save failure leaves conservative history. Supported detach/relink, deactivate/reactivate, replacement employee account, hidden notification read/dismiss and restored visibility controls pass. Persisted notification/history rows are unchanged by reading.",
    "Source scan of application account writers finds the intentional existing-user employeeId assignment in UsersController.update. Domain linking writes domainObjectGuid only; provisioning creates accounts. The blocker also covers whole-entity saves that implicitly overwrite an employeeId without an employeeId DTO field.",
    "History consumers: profile/history use projectEmployeeHistory; employee export uses employee records; payroll changes query a payment-field allowlist; live-employment evidence queries lifecycle fields; audit subscriber only emits employee-history SALARY entries. loginAccount DATA rows are excluded. Generic USER_UPDATED audit entries retain their previously authorized behavior.",
    "Existing tests were never edited. Prior review assertions were copied with new helper/output paths. The first launch attempted the suite before preparation finished and exited with MODULE_NOT_FOUND, before any database access; it was rerun after preparation completed.",
    "domain-login-two-factor was excluded by the runner migration/child-process safety allowlist, before execution. It is not included in any test count or success claim. Domain sync and auto-provision suites both executed.",
    "Instance MailService.send/isConfigured mocks are used before enabling notification email. The network guard blocks real SMTP, LDAP and listening sockets. HTTP executes in-process through Express. No 3000/4000 listener or operating-system service is touched.",
    "No performance conclusion from runner durations. SQL engine available is 2022 with compatibility level 150, not an actual 2019 server; migration 093 idempotence/pre-post/same-process/schema parity tests pass. API and UI tsc pass.",
    "Run from the review worktree: set REVIEW_PRELOAD=codex-review-p2q-regression-preload.cjs, REVIEW_CONCURRENCY=1 and a distinct REVIEW_RESULT_SUFFIX; node api/test/codex-review-p2q-suite.cjs <basenames without .integration.cjs>. Set REVIEW_RCSI=true for RCSI cases. All database names are fresh disposable hr_*_test_<16hex> names; no production DB fallback."
  ]
}
