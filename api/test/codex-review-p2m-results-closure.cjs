module.exports = {
  "selected": [
    "codex-review-p2m-closure",
    "policies",
    "policies-migration",
    "codex-review-p2m-units",
    "codex-review-p2m-streams"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 45,
      "failed": 0,
      "passed": 45,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 45,
      "suites": 0
    },
    "duration_ms": 71967.3884
  },
  "results": [
    {
      "file": "codex-review-p2m-closure.integration.cjs",
      "name": "P2L bootstrap read failure must not open an overdue account after SQL recovers",
      "ms": 8470.6673,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-closure.integration.cjs",
      "name": "P2L clear cache must not cross account relinking and a new token version",
      "ms": 277.6042,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-closure.integration.cjs",
      "name": "P2L branch views follow current audience; foreign identities and policy events stay hidden",
      "ms": 342.0288,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-closure.integration.cjs",
      "name": "P2L acknowledgement is self only, unique, preserves evidence and opens gate; material publication re-closes it",
      "ms": 338.5996,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-closure.integration.cjs",
      "name": "P2L policy manager can populate the existing role audience selector without account-administration rights",
      "ms": 160.4285,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة",
      "ms": 11363.7452,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة",
      "ms": 1004.1176,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية",
      "ms": 801.1598,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل",
      "ms": 426.8594,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا",
      "ms": 1218.2423,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه",
      "ms": 1236.9406,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها",
      "ms": 557.17,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ",
      "ms": 484.566,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة",
      "ms": 1150.4371,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة",
      "ms": 1374.4677,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب",
      "ms": 159.4202,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-migration.integration.cjs",
      "name": "PM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11621.1861,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-migration.integration.cjs",
      "name": "PM-2: من غير الجداول الشاشات «مستنية الترحيل» ومفيش بوابة؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده النشر والإقرار شغالين والمشغّلين بيمنعوا التعديل والمسح",
      "ms": 4809.1822,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-migration.integration.cjs",
      "name": "PM-3: آمن للتكرار",
      "ms": 1330.7428,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-01: القواعد الصافية — النسخة السارية والجاية، وأساس الإقرار، وموعد القفل، وحالة الموظف",
      "ms": 3.0142,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-02: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، والمسارات الثابتة قبل ‎:id، والمسارات المسموحة والحساب مقفول",
      "ms": 312.339,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-03: ربط البوابة في الواجهة — التحويل بكود الخادم، والفحص مرة مع كل دخول، وشاشة الإقرار والقارئ",
      "ms": 4.875,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-04: الشاشات والقايمة الجانبية وصلاحيات المسارات والتقرير",
      "ms": 3.587,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-05: ملف السياسة بالتدفق — البصمة والحجم من غير تحميل الملف كله، وتيار الإرسال بيقطع قبل ما يكمل لو الملف مش هو",
      "ms": 14.8518,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.5068,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 1.1051,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.4396,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 1.0301,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 293.8279,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
      "ms": 0.7308,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
      "ms": 0.3054,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
      "ms": 7.123,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
      "ms": 0.3639,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
      "ms": 0.1678,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
      "ms": 0.2086,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
      "ms": 0.1673,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
      "ms": 0.3999,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
      "ms": 0.4781,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
      "ms": 2.1742,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "TZ: الفاضي = توقيت الجهاز، والاسم المعروف مقبول، والغلط بيوقف الإقلاع برسالة واضحة",
      "ms": 5.1214,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "قايمة المهام: كل مهمة بموعد صالح، وكل موعد في الكود من القايمة ومتسجل مرة واحدة، ومفيش @Cron خارجها",
      "ms": 271.6028,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "الشاشة: «المهام المجدولة» في الإعدادات بصلاحية إدارة الإعدادات، والخادم بيشترط حساب على كل الفروع",
      "ms": 2.531,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-streams.integration.cjs",
      "name": "P2M stream: exact bytes across chunk boundaries; preflight hashes the same bytes",
      "ms": 91.4232,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-streams.integration.cjs",
      "name": "P2M stream: same-size, shorter, larger and trailing-chunk replacements cannot complete the advertised length",
      "ms": 19.9153,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-streams.integration.cjs",
      "name": "P2M stream: disconnect and source failure close file descriptors; subsequent requests remain healthy",
      "ms": 8.1605,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"bootstrap-fail-open\",\"faultInjected\":true,\"pendingBlocked\":true,\"protectedStatus\":403,\"code\":\"POLICY_ACK_REQUIRED\"}",
    "{\"case\":\"identity-cache\",\"previousEmployeeId\":4,\"currentEmployeeId\":3,\"tokenVersionChanged\":true,\"pendingBlocked\":true,\"protectedStatus\":403,\"code\":\"POLICY_ACK_REQUIRED\"}",
    "{\"case\":\"branch-views\",\"listHidden\":true,\"detailReportContentUniform404\":true,\"auditHidden\":true,\"companyPreserved\":true}",
    "{\"case\":\"proof-control\",\"duplicates\":1,\"selfOnly\":true,\"hash\":true,\"device\":true,\"newMaterialReblocks\":true,\"oldEvidenceUnchanged\":true}",
    "{\"case\":\"policy-role-editor\",\"canManage\":true,\"branchesStatus\":200,\"roleSourceStatus\":200,\"uiSilentlyUsesEmptyRoles\":true}",
    "Cleanup verified: hr_policies_test_afdd4ae5c149d55a is absent from sys.databases.",
    "Cleanup verified: hr_policies_migration_test_4c4e67bfd3f6b283 is absent from sys.databases.",
    "tests 45",
    "suites 0",
    "pass 45",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 71967.3884"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2m_closure_test_fcab2898e9a363e2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2m_closure_test_fcab2898e9a363e2\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2m_closure_test_fcab2898e9a363e2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policies_test_afdd4ae5c149d55a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policies_test_afdd4ae5c149d55a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policies_migration_test_4c4e67bfd3f6b283\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policies_migration_test_4c4e67bfd3f6b283\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n"
  ]
}
