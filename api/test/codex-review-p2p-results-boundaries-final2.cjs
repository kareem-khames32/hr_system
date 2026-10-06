module.exports = {
  "selected": [
    "codex-review-p2p-boundaries",
    "codex-review-p2p-units"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 39,
      "failed": 3,
      "passed": 36,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 39,
      "suites": 0
    },
    "duration_ms": 36558.8783
  },
  "results": [
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
      "ms": 5738.1583,
      "pass": false,
      "error": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "cause": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "stack": "AssertionError [ERR_ASSERTION]: A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:21:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "ms": 431.3726,
      "pass": false,
      "error": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "cause": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P ordinary file owner remains allowed while an unbound upload is private to that account",
      "ms": 49.0435,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P request made on behalf: unlinking its owner account must not reveal internal comments to that same account",
      "ms": 178.9719,
      "pass": false,
      "error": "The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n",
      "cause": "The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:57:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-01: مدخل التعليق — النص بحده بعد توحيد نهايات السطور، و«داخلي» قيمة منطقية، والأرقام صالحة ومن غير تكرار وبحدودها",
      "ms": 5.3289,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-02: الإشارة لأدوار الكيان نفسه بس — دور كيان تاني أو اسم مش معروف مرفوض",
      "ms": 0.2935,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-03: الإشارات المخزّنة — من غير إشارات مابيتخزنش حاجة، وأي شكل غير متوقع بيتقري «من غير إشارات»",
      "ms": 0.3314,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-01: عميل الـAPI على مسارات الخادم نفسها وبحدوده، والمسارات الأربعة بموديول كيانها ومن غير صلاحية خاصة",
      "ms": 430.4214,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-02: مكوّن الحوار — مابيعرضش حاجة قبل الترحيل، وضغطتين تعليق واحد، والداخلي مايشاورش لصاحب الطلب ولا تعليق ظاهر يرد على داخلي",
      "ms": 0.5238,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-03: الحوار في تفاصيل الطلب (الشاشات التلاتة) وفي كارت المهمة العادية بس، ولينك الإشعار بيفتح الموضوع",
      "ms": 4.5685,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "ms": 0.7985,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "ms": 0.3476,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "ms": 0.2821,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "ms": 0.394,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "ms": 0.2601,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "ms": 0.2033,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والقيم بنفس كتالوج الخادم",
      "ms": 14.2472,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-02: اختيارات المستخدم في صفحة الإشعارات — البريد (فورًا، ملخص يومي، مقفول) وداخل النظام للفئات المخزّنة بس، وفئة الرواتب باسمها",
      "ms": 1.9876,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-03: لوحة الإشعارات تحت «المهام المجدولة» — سجل الإرسال بحالاته وسببه، وتعديل القوالب بمتغيراتها والرجوع للافتراضي",
      "ms": 1.4207,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-04: الإعدادات التلاتة في «سياسات النظام» بنفس مفاتيح الخادم وحدوده، والبريد مقفول افتراضيًا",
      "ms": 2.3927,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-05: المهمة المجدولة للملخص اليومي متسجّلة في القايمة وسجل الموديولات، ومسح مهام الطابور المنتهية مع مسح السجل",
      "ms": 1.1971,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 25.3783,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 1.141,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 1.8832,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 26.2042,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.5982,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.9073,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.32,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 10.0463,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 196.7702,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.6859,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4283,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.312,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2279,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3022,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3024,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3058,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2592,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2069,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
      "ms": 5738.1583,
      "pass": false,
      "error": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "cause": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n",
      "stack": "AssertionError [ERR_ASSERTION]: A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:21:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "ms": 431.3726,
      "pass": false,
      "error": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "cause": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P request made on behalf: unlinking its owner account must not reveal internal comments to that same account",
      "ms": 178.9719,
      "pass": false,
      "error": "The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n",
      "cause": "The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:57:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"rebound-uploader-is-now-requester\",\"threadComments\":0,\"canInternal\":false,\"fileStatus\":200,\"fileBytesMatch\":true}",
    "{\"case\":\"foreign-link-after-account-rebinding\",\"detailStatus\":404,\"threadStatus\":404,\"foreignLinkRetained\":true}",
    "{\"case\":\"known-limit-on-behalf-owner-unlink\",\"canInternal\":true,\"internalBodyVisible\":true}",
    "tests 39",
    "suites 0",
    "pass 36",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 36558.8783"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2p_boundaries_test_4c5a725229582528\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2p_boundaries_test_4c5a725229582528\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2p_boundaries_test_4c5a725229582528\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
