module.exports = {
  "selected": [
    "codex-review-p2j-independent",
    "codex-review-p2j-closure",
    "codex-review-p2j-decision-race",
    "codex-review-p2j-units"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 39,
      "failed": 0,
      "passed": 39,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 39,
      "suites": 0
    },
    "duration_ms": 61835.0155
  },
  "results": [
    {
      "file": "codex-review-p2j-independent.integration.cjs",
      "name": "P2J delegation audit responses must scope foreign employee identities while preserving stored evidence",
      "ms": 8379.4479,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-independent.integration.cjs",
      "name": "P2J branch-only delegation administrator must not receive the identity of an unrelated foreign delegate",
      "ms": 356.034,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-independent.integration.cjs",
      "name": "P2J delegated decision and on-behalf audit attribution roll back atomically and retain party access after successful action",
      "ms": 635.4221,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-independent.integration.cjs",
      "name": "P2J revocation committed before the blocked decision obtains its request lock prevents the delegated decision",
      "ms": 443.6833,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-independent.integration.cjs",
      "name": "P2J the delegate cannot act on an undelegable step or leak the request after a real branch-scope change",
      "ms": 515.8548,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-closure.integration.cjs",
      "name": "P2J confidential execution access, hidden task proof and post-completion party rights remain bounded",
      "ms": 10104.1801,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-closure.integration.cjs",
      "name": "P2J failed completion event rolls task and request and approval history back together",
      "ms": 636.3346,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-closure.integration.cjs",
      "name": "P2J a current confidential execution party should remain a party in the pending report and reject-execution action",
      "ms": 652.7952,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 12349.5248,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 153.5627,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 135.0091,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 114.2086,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 120.8386,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 83.2898,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 98.184,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 117.4213,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-01: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، ونص «بالنيابة عن»",
      "ms": 271.1825,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-02: القاعدة في مكان واحد — المعتمد المسمّى أو بديله، للأدوار الهيكلية بس، وللخطوة المسموح تتفوّض",
      "ms": 38.101,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-03: قسم «تفويض اعتماداتي» وشارة الصندوق وسطر السجل",
      "ms": 8.1121,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-04: محرر السلسلة — خانة «مسموح تتفوّض» للأدوار الهيكلية، وبتتبعت لما تتقفل بس",
      "ms": 83.4201,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-01: إعداد النوع — نفس أدوار وتسميات محرك المهام، ونفس حد المهلة، وبيتبعت لما يتغيّر بس",
      "ms": 6.3074,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-02: كارت مهمة التنفيذ — مكتوب إنها بتكمّل الطلب، ولينك الطلب، ومن غير أزرار الإدارة",
      "ms": 3.6486,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-03: تقرير «معتمد ومااتنفذش» — فلتر من الخادم جوه لوحة الطلبات، بمسؤول التنفيذ وعمر الاعتماد في الجدول والتصدير",
      "ms": 12.0092,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-04: إجراء «اتنفّذ» — في سجل الطلب بالتلات شاشات، وفي إشعار صاحب الطلب",
      "ms": 3.6867,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 17.6777,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 3.2695,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 2.0937,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 24.5306,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.7257,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 1.414,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.562,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 1.0004,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 248.5472,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "ms": 1.0843,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "ms": 1.032,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "ms": 0.2718,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "ms": 0.5936,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "ms": 0.3334,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "ms": 0.2909,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"delegation-audit-foreign-id\",\"foreignEmployee\":4,\"returnedEmployeeIds\":[null,null],\"actions\":[\"APPROVAL_DELEGATION_REVOKED\",\"APPROVAL_DELEGATION_CREATED\"],\"nameHidden\":true,\"companyPreserved\":true,\"storedPreserved\":true}",
    "{\"case\":\"delegation-foreign-id\",\"branchId\":3,\"foreignBranch\":4,\"foreignEmployee\":8,\"returnedEmployee\":null,\"nameHidden\":true,\"partyHasIdentity\":true,\"companyHasIdentity\":true}",
    "{\"case\":\"delegated-attribution-atomicity\",\"failed\":500,\"requestUnchanged\":true,\"approvalCountAfterFailure\":0,\"retryApproved\":1,\"afterRevokeActorStillParty\":true}",
    "{\"case\":\"revocation-before-decision\",\"decision\":403,\"requestUnchanged\":true,\"auditRows\":0}",
    "{\"case\":\"delegation-lock-and-scope\",\"undelegable\":403,\"beforeMove\":200,\"afterMove\":404,\"decisionAfterMove\":403}",
    "{\"case\":\"execution-party-bounds\",\"hidden\":404,\"viewerClose\":403,\"viewerReject\":403,\"ownerStatus\":\"COMPLETED\",\"storedExecutions\":1}",
    "{\"case\":\"execution-event-atomicity\",\"failedStatus\":500,\"allRowsUnchanged\":true,\"retryExecutions\":1}",
    "{\"case\":\"execution-party-consistency\",\"detailMasked\":false,\"reportMasked\":false,\"rejectStatus\":201,\"message\":null,\"requestStatus\":\"REJECTED\"}",
    "tests 39",
    "suites 0",
    "pass 39",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 61835.0155"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2j_delegation_test_aaa583835576622b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2j_delegation_test_aaa583835576622b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2j_delegation_test_aaa583835576622b\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2j_execution_test_ad9cfaaf41055459\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2j_execution_test_ad9cfaaf41055459\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2j_execution_test_ad9cfaaf41055459\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2j_decision_race_test_4b0c13f503b51293\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2j_decision_race_test_4b0c13f503b51293\"}\n"
  ]
}
