module.exports = {
  "selected": [
    "codex-review-p2k-current-scope",
    "codex-review-p2k-independent",
    "codex-review-p2k-closure",
    "codex-review-p2k-decision-race",
    "codex-review-p2k-units"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 43,
      "failed": 0,
      "passed": 43,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 43,
      "suites": 0
    },
    "duration_ms": 51403.9265
  },
  "results": [
    {
      "file": "codex-review-p2k-current-scope.integration.cjs",
      "name": "P2K current-branch rule must also conceal the transferred delegate in the audit summary and search",
      "ms": 5866.8768,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-current-scope.integration.cjs",
      "name": "P2K both creation and revocation summaries must respect the transferred delegator current branch",
      "ms": 328.2527,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-current-scope.integration.cjs",
      "name": "P2K identities become readable after moving into scope, all-branch and party views remain stable, and revoke still works",
      "ms": 308.8124,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-current-scope.integration.cjs",
      "name": "P2K unrelated audit event response remains exactly the same for branch and all-branch readers",
      "ms": 481.3772,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-independent.integration.cjs",
      "name": "P2K delegation audit responses must scope foreign employee identities while preserving stored evidence",
      "ms": 6009.3678,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-independent.integration.cjs",
      "name": "P2K branch-only delegation administrator must not receive the identity of an unrelated foreign delegate",
      "ms": 270.2776,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-independent.integration.cjs",
      "name": "P2K delegated decision and on-behalf audit attribution roll back atomically and retain party access after successful action",
      "ms": 442.8299,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-independent.integration.cjs",
      "name": "P2K revocation committed before the blocked decision obtains its request lock prevents the delegated decision",
      "ms": 280.0651,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-independent.integration.cjs",
      "name": "P2K the delegate cannot act on an undelegable step or leak the request after a real branch-scope change",
      "ms": 366.704,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-closure.integration.cjs",
      "name": "P2K confidential execution access, hidden task proof and post-completion party rights remain bounded",
      "ms": 5352.0639,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-closure.integration.cjs",
      "name": "P2K failed completion event rolls task and request and approval history back together",
      "ms": 295.0826,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-closure.integration.cjs",
      "name": "P2K a current confidential execution party should remain a party in the pending report and reject-execution action",
      "ms": 298.3867,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 6809.438,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 102.4695,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 69.2847,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 74.4309,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 72.2489,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 61.5729,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 38.5315,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 37.9149,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-01: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، ونص «بالنيابة عن»",
      "ms": 197.7706,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-02: القاعدة في مكان واحد — المعتمد المسمّى أو بديله، للأدوار الهيكلية بس، وللخطوة المسموح تتفوّض",
      "ms": 27.1452,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-03: قسم «تفويض اعتماداتي» وشارة الصندوق وسطر السجل",
      "ms": 4.2389,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-04: محرر السلسلة — خانة «مسموح تتفوّض» للأدوار الهيكلية، وبتتبعت لما تتقفل بس",
      "ms": 58.4308,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-01: إعداد النوع — نفس أدوار وتسميات محرك المهام، ونفس حد المهلة، وبيتبعت لما يتغيّر بس",
      "ms": 9.2779,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-02: كارت مهمة التنفيذ — مكتوب إنها بتكمّل الطلب، ولينك الطلب، ومن غير أزرار الإدارة",
      "ms": 3.416,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-03: تقرير «معتمد ومااتنفذش» — فلتر من الخادم جوه لوحة الطلبات، بمسؤول التنفيذ وعمر الاعتماد في الجدول والتصدير",
      "ms": 3.0082,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-04: إجراء «اتنفّذ» — في سجل الطلب بالتلات شاشات، وفي إشعار صاحب الطلب",
      "ms": 2.8021,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 11.4755,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 0.9401,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 1.8358,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 16.8761,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.5147,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 1.1064,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.3614,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.7029,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 159.2543,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس",
      "ms": 0.6932,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة",
      "ms": 0.6933,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني",
      "ms": 0.1907,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها",
      "ms": 0.3225,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني",
      "ms": 0.2103,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار",
      "ms": 0.1891,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"transferred-delegate-audit-text\",\"employeeId\":2,\"currentBranchId\":2,\"readerBranchId\":1,\"returnedEmployeeId\":null,\"nameShown\":false,\"matchingCount\":0,\"absentCount\":0,\"listHidden\":true,\"partyPreserved\":true,\"companyAndStorageUnchanged\":true}",
    "{\"case\":\"transferred-delegator-audit-text\",\"employeeId\":3,\"currentBranchId\":4,\"readerBranchId\":3,\"exposedActions\":[],\"idsHidden\":true,\"companyAndStorageUnchanged\":true}",
    "{\"case\":\"allowed-identities-and-revoke\",\"bothParties\":true,\"currentScope\":true,\"allBranchesWithoutAdmin\":true,\"storedPreserved\":true,\"revokeWorks\":true}",
    "{\"case\":\"unrelated-audit-event\",\"responseExactlyUnchanged\":true,\"storageExactlyUnchanged\":true}",
    "{\"case\":\"delegation-audit-foreign-id\",\"foreignEmployee\":4,\"returnedEmployeeIds\":[null,null],\"actions\":[\"APPROVAL_DELEGATION_REVOKED\",\"APPROVAL_DELEGATION_CREATED\"],\"nameHidden\":true,\"companyPreserved\":true,\"storedPreserved\":true}",
    "{\"case\":\"delegation-foreign-id\",\"branchId\":3,\"foreignBranch\":4,\"foreignEmployee\":8,\"returnedEmployee\":null,\"nameHidden\":true,\"partyHasIdentity\":true,\"companyHasIdentity\":true}",
    "{\"case\":\"delegated-attribution-atomicity\",\"failed\":500,\"requestUnchanged\":true,\"approvalCountAfterFailure\":0,\"retryApproved\":1,\"afterRevokeActorStillParty\":true}",
    "{\"case\":\"revocation-before-decision\",\"decision\":403,\"requestUnchanged\":true,\"auditRows\":0}",
    "{\"case\":\"delegation-lock-and-scope\",\"undelegable\":403,\"beforeMove\":200,\"afterMove\":404,\"decisionAfterMove\":403}",
    "{\"case\":\"execution-party-bounds\",\"hidden\":404,\"viewerClose\":403,\"viewerReject\":403,\"ownerStatus\":\"COMPLETED\",\"storedExecutions\":1}",
    "{\"case\":\"execution-event-atomicity\",\"failedStatus\":500,\"allRowsUnchanged\":true,\"retryExecutions\":1}",
    "{\"case\":\"execution-party-consistency\",\"detailMasked\":false,\"reportMasked\":false,\"rejectStatus\":201,\"message\":null,\"requestStatus\":\"REJECTED\"}",
    "tests 43",
    "suites 0",
    "pass 43",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 51403.9265"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2k_current_scope_test_f55c22ebb686c0a8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2k_current_scope_test_f55c22ebb686c0a8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2k_current_scope_test_f55c22ebb686c0a8\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2k_delegation_test_16e0deb393d9456e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2k_delegation_test_16e0deb393d9456e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2k_delegation_test_16e0deb393d9456e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2k_execution_test_37e68611c4ee0f3e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2k_execution_test_37e68611c4ee0f3e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2k_execution_test_37e68611c4ee0f3e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2k_decision_race_test_309b62013460693b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2k_decision_race_test_309b62013460693b\"}\n"
  ]
}
