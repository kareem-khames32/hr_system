module.exports = {
  "selected": [
    "codex-review-p2s-account-lock",
    "codex-review-p2s-concurrency",
    "codex-review-p2s-controls",
    "codex-review-p2s-decision-race",
    "codex-review-p2s-independent",
    "codex-review-p2s-pagination",
    "codex-review-p2s-boundaries",
    "codex-review-p2s-units"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 65,
      "failed": 0,
      "passed": 65,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 65,
      "suites": 0
    },
    "duration_ms": 103928.7899
  },
  "results": [
    {
      "file": "codex-review-p2s-account-lock.integration.cjs",
      "name": "P2S real SQL serialization retains intermediate employee history and hides internal text/files; RCSI=false",
      "ms": 5431.9228,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-account-lock.integration.cjs",
      "name": "P2S permissions-only edit cannot overwrite a concurrent binding under the account lock; RCSI=false",
      "ms": 105.8335,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-account-lock.integration.cjs",
      "name": "P2S lock timeout returns 409 without executing the waiter, keeps the active handler protected and permits a later retry",
      "ms": 15118.6627,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-account-lock.integration.cjs",
      "name": "P2S a rejected edit releases its application lock; an unrelated account remains editable; RCSI=false",
      "ms": 88.3123,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-concurrency.integration.cjs",
      "name": "P2S two comments race for one attachment with RCSI=false",
      "ms": 5249.1544,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-concurrency.integration.cjs",
      "name": "P2S task transfer while comment waits rechecks the new assignee with RCSI=false",
      "ms": 92.3181,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-concurrency.integration.cjs",
      "name": "P2S late document/execution task mapping rejects comments with RCSI=false",
      "ms": 189.8556,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-controls.integration.cjs",
      "name": "P2S history insertion failure refuses relinking; an account save failure after history remains conservative",
      "ms": 4989.2871,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-controls.integration.cjs",
      "name": "P2S historical owner stays restricted after detach/relink, deactivate/reactivate, and replacement account; history is absent from projected responses",
      "ms": 564.2203,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-controls.integration.cjs",
      "name": "P2S in-app mentions hide without a reader callback and after identity loss, do not mark hidden rows read, and return unchanged when visibility returns",
      "ms": 449.917,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-controls.integration.cjs",
      "name": "P2S hidden notifications must not crowd a still-readable notification out of the returned list",
      "ms": 4036.5191,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 7123.0941,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 88.6728,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 99.5277,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 74.5725,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 81.51,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 72.5967,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 57.0811,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 45.2031,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-independent.integration.cjs",
      "name": "P2S internal rows cannot alter public truncation, reply references or author identity after transfer",
      "ms": 5510.4534,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-independent.integration.cjs",
      "name": "P2S comment rollback and deadlock retry leave exactly one comment, attachment binding and outbox event",
      "ms": 671.9287,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-independent.integration.cjs",
      "name": "P2S immediate and digest email recheck current requester identity, with active-recipient controls",
      "ms": 848.8531,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-independent.integration.cjs",
      "name": "P2S all four comment endpoints and upload remain behind the policy acknowledgement gate",
      "ms": 212.5509,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-pagination.integration.cjs",
      "name": "P2S keyset pagination deduplicates across pages and ignores concurrent new rows until the next read",
      "ms": 6050.5786,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-pagination.integration.cjs",
      "name": "P2S readable-comment memoization distinguishes internal and public comments for the same request",
      "ms": 195.3273,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-pagination.integration.cjs",
      "name": "P2S documented page cap stops at ten pages without exposing hidden links or changing stored rows",
      "ms": 98.5834,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-boundaries.integration.cjs",
      "name": "P2S internal attachment must obey current comment visibility after its uploader becomes the requester",
      "ms": 5837.723,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-boundaries.integration.cjs",
      "name": "P2S in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "ms": 437.0386,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-boundaries.integration.cjs",
      "name": "P2S ordinary file owner remains allowed while an unbound upload is private to that account",
      "ms": 49.8332,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-boundaries.integration.cjs",
      "name": "P2S request made on behalf: unlinking its owner account must not reveal internal comments to that same account",
      "ms": 149.5825,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-01: مدخل التعليق — النص بحده بعد توحيد نهايات السطور، و«داخلي» قيمة منطقية، والأرقام صالحة ومن غير تكرار وبحدودها",
      "ms": 3.5706,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-02: الإشارة لأدوار الكيان نفسه بس — دور كيان تاني أو اسم مش معروف مرفوض",
      "ms": 0.2368,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-03: الإشارات المخزّنة — من غير إشارات مابيتخزنش حاجة، وأي شكل غير متوقع بيتقري «من غير إشارات»",
      "ms": 0.252,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-01: عميل الـAPI على مسارات الخادم نفسها وبحدوده، والمسارات الأربعة بموديول كيانها ومن غير صلاحية خاصة",
      "ms": 334.4149,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-02: مكوّن الحوار — مابيعرضش حاجة قبل الترحيل، وضغطتين تعليق واحد، والداخلي مايشاورش لصاحب الطلب ولا تعليق ظاهر يرد على داخلي",
      "ms": 0.8176,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-03: الحوار في تفاصيل الطلب (الشاشات التلاتة) وفي كارت المهمة العادية بس، ولينك الإشعار بيفتح الموضوع",
      "ms": 4.0373,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "ms": 0.8778,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "ms": 0.4743,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "ms": 0.3752,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "ms": 0.6954,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "ms": 0.5058,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "ms": 0.3746,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والقيم بنفس كتالوج الخادم",
      "ms": 13.6649,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-02: اختيارات المستخدم في صفحة الإشعارات — البريد (فورًا، ملخص يومي، مقفول) وداخل النظام للفئات المخزّنة بس، وفئة الرواتب باسمها",
      "ms": 1.6085,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-03: لوحة الإشعارات تحت «المهام المجدولة» — سجل الإرسال بحالاته وسببه، وتعديل القوالب بمتغيراتها والرجوع للافتراضي",
      "ms": 1.6824,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-04: الإعدادات التلاتة في «سياسات النظام» بنفس مفاتيح الخادم وحدوده، والبريد مقفول افتراضيًا",
      "ms": 2.8512,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-05: المهمة المجدولة للملخص اليومي متسجّلة في القايمة وسجل الموديولات، ومسح مهام الطابور المنتهية مع مسح السجل",
      "ms": 1.4337,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 17.1139,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 1.1847,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 1.3506,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 25.878,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.5654,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.8621,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.3196,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.6867,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 177.007,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4908,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.5325,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4738,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2911,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4959,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3235,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2639,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2559,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1256,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"rcsi\":false,\"patchStatuses\":[200,200],\"bothIdentitiesRecorded\":true,\"tokenVersion\":2,\"internalHidden\":true}",
    "{\"case\":\"real-lock-timeout\",\"status\":409,\"code\":409}",
    "{\"rcsi\":false,\"sharedFileStatuses\":[201,400],\"comments\":1,\"mentionEvents\":1}",
    "{\"rcsi\":false,\"lateLinks\":[{\"kind\":\"document\",\"initial\":409,\"retry\":400,\"comments\":0},{\"kind\":\"execution\",\"initial\":409,\"retry\":400,\"comments\":0}]}",
    "{\"case\":\"notification-filter-after-limit\",\"hiddenNewer\":60,\"stillReadableMentionReturned\":true,\"returnedCount\":1}",
    "{\"emailIdentityChecks\":[{\"mode\":\"ON\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"ON\",\"revoked\":true,\"status\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"DIGEST\",\"revoked\":true,\"status\":\"SKIPPED\"}],\"realMail\":false}",
    "{\"case\":\"rebound-uploader-is-now-requester\",\"threadComments\":0,\"canInternal\":false,\"fileStatus\":404,\"fileBytesMatch\":false}",
    "{\"case\":\"foreign-link-after-account-rebinding\",\"detailStatus\":404,\"threadStatus\":404,\"foreignLinkRetained\":false}",
    "{\"case\":\"known-limit-on-behalf-owner-unlink\",\"canInternal\":false,\"internalBodyVisible\":false}",
    "tests 65",
    "suites 0",
    "pass 65",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 103928.7899"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_account_lock_test_6feb92254511d3d2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_account_lock_test_6feb92254511d3d2\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_account_lock_test_6feb92254511d3d2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_concurrency_test_07111a5f35ddddb8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_concurrency_test_07111a5f35ddddb8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_concurrency_test_07111a5f35ddddb8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_controls_test_20396bf8d846d546\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_controls_test_20396bf8d846d546\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_controls_test_20396bf8d846d546\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_decision_race_test_6ec306a055f87875\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_decision_race_test_6ec306a055f87875\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_independent_test_671a772f0486e7f4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_independent_test_671a772f0486e7f4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_independent_test_671a772f0486e7f4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_pagination_test_d36ad6d082a8f729\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_pagination_test_d36ad6d082a8f729\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_pagination_test_d36ad6d082a8f729\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_boundaries_test_135a5d0acbf9e982\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_boundaries_test_135a5d0acbf9e982\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_boundaries_test_135a5d0acbf9e982\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
