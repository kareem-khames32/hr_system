module.exports = {
  "selected": [
    "codex-review-p2q-rebinding-race",
    "domain-users-sync",
    "domain-autoprovision",
    "domain-login-two-factor"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 37,
      "failed": 2,
      "passed": 35,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 37,
      "suites": 0
    },
    "duration_ms": 55416.5589
  },
  "results": [
    {
      "file": "codex-review-p2q-rebinding-race.integration.cjs",
      "name": "P2Q concurrent account rebindings must retain the intermediate employee identity and keep its internal content hidden",
      "ms": 5078.0662,
      "pass": false,
      "error": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "cause": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-race.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2q-rebinding-race.integration.cjs",
      "name": "P2Q a concurrent permissions-only PATCH must not silently restore an old employee binding without recording the displaced identity",
      "ms": 151.6758,
      "pass": false,
      "error": "All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n",
      "cause": "All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-race.integration.cjs:61:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي",
      "ms": 8694.4586,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A1 — المعاينة مفيش فيها أي كتابة: لقطة جدول المستخدمين قبلها وبعدها متطابقة بالحرف",
      "ms": 24.4414,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "A2 — المعاينة بتقول اللي هيحصل بالظبط: الحسابات الجديدة والربط بالاسم والكود",
      "ms": 8.0516,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B1 — المطابقة برقم البصمة شغّالة في الاتجاهين حتى مع الأصفار البادئة والمسافات",
      "ms": 7.0674,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B2 — الغموض مرفوض بالاسم والكود، ومفيش تخمين ومفيش حساب",
      "ms": 7.5839,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "B3 — كل سبب تخطّي/تعارض بيطلع على الحساب الصح",
      "ms": 7.0473,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "C1 — التطبيق بيعمل الحسابات المتوقعة بالظبط: بلا كلمة مرور، بالـGUID، بأقل دور، بفرع الموظف",
      "ms": 20913.3709,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "D1 — حساب قائم يُربط ولا يتكرر، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر",
      "ms": 97.4892,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "E1 — تعارض الـGUID بيتقال ومايتكتبش فوقه، والحساب المعطّل والبريد المحجوز مالهمش أي أثر",
      "ms": 19.8992,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "F1 — تمرير تاني (وثالت): مفيش إنشاء ولا ربط، ولقطة الجدول متطابقة بالحرف",
      "ms": 20.0608,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G1 — الحساب المتزامن بيدخل بحساب المجال ومفيش حساب تاني بيتعمل",
      "ms": 40.2731,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G2 — الدخول الحيّ كسب خطوة رقم البصمة: حساب مجال ما اتزامنش بيطابق بالبصمة ويعمل حساب واحد",
      "ms": 159.4282,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G3 — الدخول الحيّ بيرفض المطابقة الغامضة برسالة عربية ومفيش حساب بيتعمل",
      "ms": 18.0597,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "G4 — حساب المجال المتوقف والموظف الأرشيف لسه مرفوضين في الدخول الحيّ",
      "ms": 26.9516,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H1 — المسار محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع",
      "ms": 4.9725,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H2 — التطبيق محتاج apply=true صريحة، وأي قيمة غير منطقية مرفوضة",
      "ms": 24.4924,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-users-sync.integration.cjs",
      "name": "H3 — قائمة المستخدمين بتعلّم حساب الدومين، ومفيش hash بيخرج",
      "ms": 15.564,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي",
      "ms": 7560.7725,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "A1 — موظف جديد موجود في الدومين: حساب واحد بالظبط اتعمل واتربط، والرد بيقول كده",
      "ms": 3701.9137,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "A2 — موظف جديد مش في الدومين: اتحفظ عادي، مفيش حساب، والسبب عربي صريح",
      "ms": 116.6395,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "B1 — الدليل واقف أو مش مضبوط أو بيرمي استثناء غريب: الموظف اتحفظ والطلب ناجح",
      "ms": 367.1333,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "B2 — الدليل بطيء: الإضافة بتنجح والحساب بيتعمل، ومفيش فشل ولا نصف عملية",
      "ms": 444.6034,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C1 — المفتاح مبذور في القاعدة عند الإقلاع بقيمته الافتراضية (مفتوح) بلا أي ترحيل",
      "ms": 3.1079,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C2 — المفتاح مقفول: مفيش تزويد ومفيش نداء دليل خالص، والموظف اتحفظ وبسبب واضح",
      "ms": 134.4319,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C3 — الزرّ شغّال والمفتاح مقفول (ضغطة بإيد المالك على موظف بالاسم)",
      "ms": 68.4679,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "C4 — فتح المفتاح تاني: التزويد التلقائي رجع في نفس اللحظة بلا إعادة تشغيل",
      "ms": 147.2893,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D1 — الزرّ بيعمل حساب للموظف المطابق، والضغط تاني مابيغيّرش ولا بايت",
      "ms": 124.1953,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D2 — الزرّ بيربط حساب قائم: العمود الناقص بس، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر",
      "ms": 100.812,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D3 — كل سبب تخطّي/تعارض بيتقال بالاسم وبعربي، ومفيش أي حساب بيتعمل لأي واحد منهم",
      "ms": 109.2172,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "D4 — الدليل الواقف على الزرّ: سبب واضح ومفيش أي كتابة، والموظف المفقود 404",
      "ms": 11.5928,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "E1 — الزرّ محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع",
      "ms": 21.4351,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F1 — الكارت بيقول «مفيش حساب» بصراحة، وبيقول «حساب دومين» و«حساب عندنا» لما يكون فيه",
      "ms": 42.9386,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F2 — الكارت بيتقرا بصلاحية عرض الملف نفسها، مش بـusers.manage، وبلا أي hash",
      "ms": 29.1201,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F3 — عزل الفرع: حساب مقفول على فرع مايقراش كارت موظف فرع تاني، والمفتاح المقفول بيبان في الكارت",
      "ms": 37.3813,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-autoprovision.integration.cjs",
      "name": "F4 — المزامنة الجماعية لسه شغّالة زي ما هي جنب الزرّ (معاينة افتراضيًّا)",
      "ms": 17.3571,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2q-rebinding-race.integration.cjs",
      "name": "P2Q concurrent account rebindings must retain the intermediate employee identity and keep its internal content hidden",
      "ms": 5078.0662,
      "pass": false,
      "error": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "cause": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-race.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2q-rebinding-race.integration.cjs",
      "name": "P2Q a concurrent permissions-only PATCH must not silently restore an old employee binding without recording the displaced identity",
      "ms": 151.6758,
      "pass": false,
      "error": "All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n",
      "cause": "All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-race.integration.cjs:61:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"concurrent-rebinding\",\"recordedOldEmployees\":[5,5],\"intermediateEmployeeRecorded\":false,\"canInternal\":true,\"internalContentVisible\":true,\"fileStatus\":200,\"fileBytesMatch\":true}",
    "{\"case\":\"nonlinking-PATCH-overwrites-link\",\"restoredOriginalBinding\":true,\"intermediateRecorded\":false,\"internalVisible\":true}",
    "Cleanup verified: hr_domain_sync_test_8a1692ca47736db5 is absent from sys.databases.",
    "Cleanup verified: hr_domain_autoprov_test_3d94337f98a481e7 is absent from sys.databases.",
    "tests 37",
    "suites 0",
    "pass 35",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 55416.5589"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_rebinding_race_test_93f30ea7522e5611\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_rebinding_race_test_93f30ea7522e5611\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2q_rebinding_race_test_93f30ea7522e5611\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_domain_sync_test_8a1692ca47736db5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_domain_sync_test_8a1692ca47736db5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_domain_autoprov_test_3d94337f98a481e7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_domain_autoprov_test_3d94337f98a481e7\"}\n"
  ]
}
