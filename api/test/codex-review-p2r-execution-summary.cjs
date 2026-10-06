module.exports = {
  "target": "4e83eae",
  "head": "8fa322a",
  "counts": {
    "passed": 161,
    "failed": 2
  },
  "runs": [
    {
      "file": "codex-review-p2r-results-closure.cjs",
      "counts": {
        "tests": 55,
        "failed": 0,
        "passed": 55,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 55,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2r-results-account-lock.cjs",
      "counts": {
        "tests": 4,
        "failed": 0,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2r-results-transfer.cjs",
      "counts": {
        "tests": 3,
        "failed": 1,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2r-results-rcsi.cjs",
      "counts": {
        "tests": 6,
        "failed": 0,
        "passed": 6,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2r-results-pagination.cjs",
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
      "file": "codex-review-p2r-results-regression.cjs",
      "counts": {
        "tests": 86,
        "failed": 0,
        "passed": 86,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 86,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2r-results-pool.cjs",
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
      "file": "codex-review-p2r-results-pool-baseline.cjs",
      "counts": {
        "tests": 1,
        "failed": 0,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      }
    }
  ],
  "rows": [
    {
      "file": "codex-review-p2r-boundaries.integration.cjs",
      "name": "P2R internal attachment must obey current comment visibility after its uploader becomes the requester",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "codex-review-p2r-boundaries.integration.cjs",
      "name": "P2R in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "codex-review-p2r-boundaries.integration.cjs",
      "name": "P2R ordinary file owner remains allowed while an unbound upload is private to that account",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "codex-review-p2r-boundaries.integration.cjs",
      "name": "P2R request made on behalf: unlinking its owner account must not reveal internal comments to that same account",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "codex-review-p2r-controls.integration.cjs",
      "name": "P2R history insertion failure refuses relinking; an account save failure after history remains conservative",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "codex-review-p2r-controls.integration.cjs",
      "name": "P2R historical owner stays restricted after detach/relink, deactivate/reactivate, and replacement account; history is absent from projected responses",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "codex-review-p2r-controls.integration.cjs",
      "name": "P2R in-app mentions hide without a reader callback and after identity loss, do not mark hidden rows read, and return unchanged when visibility returns",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "codex-review-p2r-controls.integration.cjs",
      "name": "P2R hidden notifications must not crowd a still-readable notification out of the returned list",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-01: مدخل التعليق — النص بحده بعد توحيد نهايات السطور، و«داخلي» قيمة منطقية، والأرقام صالحة ومن غير تكرار وبحدودها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-02: الإشارة لأدوار الكيان نفسه بس — دور كيان تاني أو اسم مش معروف مرفوض",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-03: الإشارات المخزّنة — من غير إشارات مابيتخزنش حاجة، وأي شكل غير متوقع بيتقري «من غير إشارات»",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-01: عميل الـAPI على مسارات الخادم نفسها وبحدوده، والمسارات الأربعة بموديول كيانها ومن غير صلاحية خاصة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-02: مكوّن الحوار — مابيعرضش حاجة قبل الترحيل، وضغطتين تعليق واحد، والداخلي مايشاورش لصاحب الطلب ولا تعليق ظاهر يرد على داخلي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-03: الحوار في تفاصيل الطلب (الشاشات التلاتة) وفي كارت المهمة العادية بس، ولينك الإشعار بيفتح الموضوع",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والقيم بنفس كتالوج الخادم",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-02: اختيارات المستخدم في صفحة الإشعارات — البريد (فورًا، ملخص يومي، مقفول) وداخل النظام للفئات المخزّنة بس، وفئة الرواتب باسمها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-03: لوحة الإشعارات تحت «المهام المجدولة» — سجل الإرسال بحالاته وسببه، وتعديل القوالب بمتغيراتها والرجوع للافتراضي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-04: الإعدادات التلاتة في «سياسات النظام» بنفس مفاتيح الخادم وحدوده، والبريد مقفول افتراضيًا",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-05: المهمة المجدولة للملخص اليومي متسجّلة في القايمة وسجل الموديولات، ومسح مهام الطابور المنتهية مع مسح السجل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-2: من غير الجدول الحوار «مش متاح» والتعليق مرفوض برسالته؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده التعليق بيتكتب من غير إعادة تشغيل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "comments-migration.integration.cjs",
      "name": "CMM-3: آمن للتكرار",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-closure.cjs"
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R real SQL serialization retains intermediate employee history and hides internal text/files; RCSI=false",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-account-lock.cjs"
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R permissions-only edit cannot overwrite a concurrent binding under the account lock; RCSI=false",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-account-lock.cjs"
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R lock timeout returns 409 without executing the waiter, keeps the active handler protected and permits a later retry",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-account-lock.cjs"
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R a rejected edit releases its application lock; an unrelated account remains editable; RCSI=false",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-account-lock.cjs"
    },
    {
      "file": "codex-review-p2r-transfer.integration.cjs",
      "name": "P2R executed transfer preserves the existing USER_UPDATED audit of account branch and token revocation",
      "pass": false,
      "error": "A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n",
      "cause": "A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2r-transfer.integration.cjs:28:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "source": "codex-review-p2r-results-transfer.cjs"
    },
    {
      "file": "codex-review-p2r-transfer.integration.cjs",
      "name": "P2R diagnostic baseline: the previous transfer save emits that audit with the same subscriber and transaction",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-transfer.cjs"
    },
    {
      "file": "codex-review-p2r-transfer.integration.cjs",
      "name": "P2R transfer waiting before its targeted User UPDATE does not restore a binding changed through PATCH",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-transfer.cjs"
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R real SQL serialization retains intermediate employee history and hides internal text/files; RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R permissions-only edit cannot overwrite a concurrent binding under the account lock; RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R a rejected edit releases its application lock; an unrelated account remains editable; RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2r-concurrency.integration.cjs",
      "name": "P2R two comments race for one attachment with RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2r-concurrency.integration.cjs",
      "name": "P2R task transfer while comment waits rechecks the new assignee with RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2r-concurrency.integration.cjs",
      "name": "P2R late document/execution task mapping rejects comments with RCSI=true",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-rcsi.cjs"
    },
    {
      "file": "codex-review-p2r-pagination.integration.cjs",
      "name": "P2R keyset pagination deduplicates across pages and ignores concurrent new rows until the next read",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-pagination.cjs"
    },
    {
      "file": "codex-review-p2r-pagination.integration.cjs",
      "name": "P2R readable-comment memoization distinguishes internal and public comments for the same request",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-pagination.cjs"
    },
    {
      "file": "codex-review-p2r-pagination.integration.cjs",
      "name": "P2R documented page cap stops at ten pages without exposing hidden links or changing stored rows",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-pagination.cjs"
    },
    {
      "file": "codex-review-p2r-independent.integration.cjs",
      "name": "P2R internal rows cannot alter public truncation, reply references or author identity after transfer",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-pagination.cjs"
    },
    {
      "file": "codex-review-p2r-independent.integration.cjs",
      "name": "P2R comment rollback and deadlock retry leave exactly one comment, attachment binding and outbox event",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-pagination.cjs"
    },
    {
      "file": "codex-review-p2r-independent.integration.cjs",
      "name": "P2R immediate and digest email recheck current requester identity, with active-recipient controls",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-pagination.cjs"
    },
    {
      "file": "codex-review-p2r-independent.integration.cjs",
      "name": "P2R all four comment endpoints and upload remain behind the policy acknowledgement gate",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-pagination.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A1 — المعاينة مفيش فيها أي كتابة: لقطة جدول المستخدمين قبلها وبعدها متطابقة بالحرف",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A2 — المعاينة بتقول اللي هيحصل بالظبط: الحسابات الجديدة والربط بالاسم والكود",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B1 — المطابقة برقم البصمة شغّالة في الاتجاهين حتى مع الأصفار البادئة والمسافات",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B2 — الغموض مرفوض بالاسم والكود، ومفيش تخمين ومفيش حساب",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B3 — كل سبب تخطّي/تعارض بيطلع على الحساب الصح",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "C1 — التطبيق بيعمل الحسابات المتوقعة بالظبط: بلا كلمة مرور، بالـGUID، بأقل دور، بفرع الموظف",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "D1 — حساب قائم يُربط ولا يتكرر، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "E1 — تعارض الـGUID بيتقال ومايتكتبش فوقه، والحساب المعطّل والبريد المحجوز مالهمش أي أثر",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "F1 — تمرير تاني (وثالت): مفيش إنشاء ولا ربط، ولقطة الجدول متطابقة بالحرف",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G1 — الحساب المتزامن بيدخل بحساب المجال ومفيش حساب تاني بيتعمل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G2 — الدخول الحيّ كسب خطوة رقم البصمة: حساب مجال ما اتزامنش بيطابق بالبصمة ويعمل حساب واحد",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G3 — الدخول الحيّ بيرفض المطابقة الغامضة برسالة عربية ومفيش حساب بيتعمل",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G4 — حساب المجال المتوقف والموظف الأرشيف لسه مرفوضين في الدخول الحيّ",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H1 — المسار محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H2 — التطبيق محتاج apply=true صريحة، وأي قيمة غير منطقية مرفوضة",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H3 — قائمة المستخدمين بتعلّم حساب الدومين، ومفيش hash بيخرج",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-regression.cjs"
    },
    {
      "file": "codex-review-p2r-pool.integration.cjs",
      "name": "P2R independent account edits must not exhaust the SQL pool with lock-only transactions while their handlers wait for another connection",
      "pass": false,
      "error": "Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "cause": "Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "stack": "AssertionError [ERR_ASSERTION]: Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2r-pool.integration.cjs:27:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "source": "codex-review-p2r-results-pool.cjs"
    },
    {
      "file": "codex-review-p2r-pool.integration.cjs",
      "name": "P2R diagnostic baseline: the same ten paused HTTP handlers succeed without the new lock-only transaction",
      "pass": true,
      "skip": false,
      "source": "codex-review-p2r-results-pool-baseline.cjs"
    }
  ],
  "notes": [
    "Latest completed outcome per file/test; distinct RC and RCSI names. Diagnostic baseline tests are explicitly identified and do not count as tests of the unmodified final writer.",
    "Previous P2Q rebinding tests depended on simultaneous handler entry. New account-lock evidence instead holds the employee-history SQL table, starts two actual PATCH requests, releases it, and checks serialized commits, original/intermediate identity history, tokenVersion=2 and hidden internal text/files. Both RC and RCSI pass.",
    "The real 15-second application-lock timeout returns 409 without entering the waiting handler. The first still-running handler retains its lock; after release a new edit succeeds. Validation failure releases the lock; different account resources remain independent when pool capacity is available.",
    "New pool blocker: the default maximum of ten connections is unchanged. Ten actual PATCH requests for distinct accounts are paused just after acquiring their account locks and before the first handler query. Diagnostics show ten held connections and zero free. Releasing all barriers makes every handler wait for another connection; all ten return 500. The next request succeeds after transactions release. No time-based performance assertion is used.",
    "Pool diagnostic baseline uses the same HTTP requests and barriers with only the new AccountEditLock interceptor bypassed in memory. Connections held at the barrier are zero and all ten requests succeed. No source files changed.",
    "New transfer audit regression: a real approved scheduled transfer is made due in the owned database and executed by DestinationsService.executeTransfer in a real transaction. Branch and token version change, but no USER_UPDATED event is inserted. The previous nine-line save writer is reproduced in memory in a separate test and emits the event with the same audit subscriber. The targeted UPDATE correctly preserves a concurrently rebound employee ID.",
    "Pagination tests cover more than one hidden page, duplicate entity references across pages, insertion between pages, internal/public comments on the same request, the twenty-visible-item limit and the documented ten-page cap. No skipped or duplicate visible item was observed within that cap.",
    "Application writer scan: UsersController.update remains the full-entity save of an existing account; transfer now updates branchId/tokenVersion by employee criterion; domain linking, login/security, offboarding and roles use specific-column updates. Seed scripts are not executed.",
    "Old boundary, projection, saved-history, email, transaction and policy-gate controls pass. Existing comment/migration, notification, audit, request execution, branch scope and domain sync suites execute unchanged. API/UI tsc pass.",
    "Every notification-enabled fixture mocks MailService.send and isConfigured on its instance. The transport is in-process Express; the network guard refuses SMTP/LDAP and listening sockets, including ports 3000/4000. Owned temporary DBs only.",
    "Only new codex-review-p2r-* artifacts and the requested report are written. No performance assessment from recorded test-run durations. Available SQL engine is 2022 with compatibility level 150; no native 2019 claim.",
    "Reproduce from review-p02: REVIEW_PRELOAD=codex-review-p2r-regression-preload.cjs, REVIEW_CONCURRENCY=1, REVIEW_RESULT_SUFFIX=<unique>; node api/test/codex-review-p2r-suite.cjs <basename without .integration.cjs>. REVIEW_RCSI=true selects RCSI. REVIEW_PATTERN=\"diagnostic baseline\" runs only the pool baseline."
  ]
}
