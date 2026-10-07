module.exports = {
  "selected": [
    "codex-review-p2z-personal-proof",
    "codex-review-p2z-feature-pool",
    "codex-review-p2z-contract-lock-order",
    "codex-review-p2z-retry",
    "codex-review-p2z-independent",
    "codex-review-p2z-units"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 35,
      "failed": 0,
      "passed": 35,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 35,
      "suites": 0
    },
    "duration_ms": 24798.7163
  },
  "results": [
    {
      "file": "codex-review-p2z-personal-proof.integration.cjs",
      "name": "P2Z personal proof follows current employee identity after actual account relinking",
      "ms": 5181.2183,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-feature-pool.integration.cjs",
      "name": "P2Z ten task edits work with the already loaded feature state",
      "ms": 5357.256,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-feature-pool.integration.cjs",
      "name": "P2Z ten task edits also work across an actual feature-setting write",
      "ms": 407.1465,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-contract-lock-order.integration.cjs",
      "name": "P2Z contract renewal and request approval complete without an unhandled lock-order failure",
      "ms": 7102.7648,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-retry.integration.cjs",
      "name": "P2Z suspension deadlock retries the transaction without duplicate effects",
      "ms": 6569.5152,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-independent.integration.cjs",
      "name": "P2Z creator loses new read and decision routes when assign_any is revoked",
      "ms": 4467.935,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-independent.integration.cjs",
      "name": "P2Z a personal task follows its current direct manager across detail, log and comments",
      "ms": 158.5308,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-independent.integration.cjs",
      "name": "P2Z two ratings serialize and feature-off reopening clears the old rating atomically",
      "ms": 206.7393,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-independent.integration.cjs",
      "name": "P2Z system comments use live access when distributing an extension mention",
      "ms": 159.6952,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-01: مين يدير المهمة — الشخصية لصاحبها بس، و«إدارة المهام» في فرعها، واللي كلّف بيها بحقه دلوقتي",
      "ms": 1.1055,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-02: مين يشوف المهمة — الشخصية لصاحبها ومديره المباشر بس، والعادية للمسؤول واللي بيديرها و«عرض كل المهام» في فرعها والمدير المباشر",
      "ms": 0.4489,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-03: «تحته في الشجرة» — المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، والدواير بتقف؛ و«كل اللي تحته» بنفس حكم «تحته؟»",
      "ms": 6.2854,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-04: حالة المهمة — قبل الترحيل القراءة فاضية من غير ما تلمس الجدول، والصف بيتعمل أول مرة المهمة تاخد قيمة غير الفاضية",
      "ms": 0.8861,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-05: الالتزام بالميعاد — محسوب من الموعد وتاريخ الإقفال المحلي، ومسمّاه",
      "ms": 0.1935,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-06: سجل المهمة — سطر مع كل تغيير، والتغيير اللي له مستلم معاه تعليق بإشارة؛ والقراءة بالأقدم الأول باسم اللي عمل التغيير ومن غير أرقام",
      "ms": 1.7104,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 228.7222,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 0.9844,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 0.593,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 66.3783,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-05: قواعد المالك في الشاشات — الأزرار من حكم الخادم (تمديد، رد، «مش بتاعتي»، رجوع، تقييم)، والمهمة الشخصية وعلامة التقييم في النموذج، وتقرير الالتزام وسجل المهمة",
      "ms": 4.2033,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-01: مدخل التعليق — النص بحده بعد توحيد نهايات السطور، و«داخلي» قيمة منطقية، والأرقام صالحة ومن غير تكرار وبحدودها",
      "ms": 2.1485,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-02: الإشارة لأدوار الكيان نفسه بس — دور كيان تاني أو اسم مش معروف مرفوض",
      "ms": 0.1933,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-03: الإشارات المخزّنة — من غير إشارات مابيتخزنش حاجة، وأي شكل غير متوقع بيتقري «من غير إشارات»",
      "ms": 0.3083,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4044,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.168,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 12.5833,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2193,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2311,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2165,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 23.1103,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 25.2541,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1677,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2651,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-011: 095 فترات الخدمة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2274,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-012: 096 قواعد المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1108,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"personal-proof-relinked-account\",\"results\":{\"detail\":404,\"log\":404,\"comments\":404,\"file\":404}}",
    "{\"case\":\"task-feature-pool-warm-control\",\"occupied\":{\"max\":10,\"used\":0,\"free\":9,\"featureReads\":10},\"statuses\":[200,200,200,200,200,200,200,200,200,200],\"testAcquireTimeoutMs\":2000}",
    "{\"case\":\"task-feature-pool-real-settings-write\",\"occupied\":{\"max\":10,\"used\":0,\"free\":10,\"featureReads\":10},\"statuses\":[200,200,200,200,200,200,200,200,200,200],\"settingStatus\":200,\"testAcquireTimeoutMs\":2000}",
    "{\"case\":\"contract-bank-lock-order\",\"approval\":201,\"renewal\":201,\"sqlError\":1205}",
    "{\"case\":\"bank-suspension-lock-order\",\"outcomes\":[{\"oldRead\":false,\"approval\":201,\"suspension\":201,\"sqlError\":1205,\"request\":\"COMPLETED\"}]}",
    "tests 35",
    "suites 0",
    "pass 35",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 24798.7163"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2z_personal_proof_test_c0df419e8ac750e2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2z_personal_proof_test_c0df419e8ac750e2\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2z_personal_proof_test_c0df419e8ac750e2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2z_feature_pool_test_0cd9f8d766238577\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2z_feature_pool_test_0cd9f8d766238577\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2z_feature_pool_test_0cd9f8d766238577\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2z_contract_order_test_a92798e18a6485d8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2z_contract_order_test_a92798e18a6485d8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2z_contract_order_test_a92798e18a6485d8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2z_lock_order_test_5c97a1df53cbf350\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2z_lock_order_test_5c97a1df53cbf350\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2z_lock_order_test_5c97a1df53cbf350\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2z_controls_test_9d6b233e259d3a26\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2z_controls_test_9d6b233e259d3a26\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2z_controls_test_9d6b233e259d3a26\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
