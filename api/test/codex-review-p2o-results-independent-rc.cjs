module.exports = {
  "selected": [
    "codex-review-p2o-schema-cache",
    "codex-review-p2o-concurrency",
    "codex-review-p2o-independent",
    "codex-review-p2o-streams",
    "codex-review-p2o-units"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 47,
      "failed": 0,
      "passed": 47,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 47,
      "suites": 0
    },
    "duration_ms": 53006.7928
  },
  "results": [
    {
      "file": "codex-review-p2o-schema-cache.integration.cjs",
      "name": "P2O schema transition: an older application cache must not permit status or assignee edits on newly linked document tasks",
      "ms": 14058.8403,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-concurrency.integration.cjs",
      "name": "P2O concurrent issue, ack/cancel and late task links with RCSI=false",
      "ms": 7054.2025,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O identity: supported rebind and deactivation reject old sessions; current branch readers and owner remain correctly separated",
      "ms": 6255.7302,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O concurrency: acknowledgement versus cancellation and two cancellations leave one consistent document/task outcome",
      "ms": 186.1954,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O rollback: a task-link failure rolls back issuing, stored-file rows and actual bytes; task-close failure rolls back evidence",
      "ms": 118.2279,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O issuance: transfer committed while issuing waits must reject the old branch without a document or task",
      "ms": 70.9663,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O mail: immediate and digest delivery revalidate acknowledgement/cancellation; active control sends only through the instance mock",
      "ms": 465.288,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-streams.integration.cjs",
      "name": "P2O stream: exact bytes across chunk boundaries; preflight hashes the same bytes",
      "ms": 81.2607,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-streams.integration.cjs",
      "name": "P2O stream: same-size, shorter, larger and trailing-chunk replacements cannot complete the advertised length",
      "ms": 7.5913,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-streams.integration.cjs",
      "name": "P2O stream: disconnect and source failure close file descriptors; subsequent requests remain healthy",
      "ms": 18.3741,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-01: بصمة محاولة الإصدار فيها طلب الإقرار وموعده — نفس المفتاح مايتبعتش ببيانات تانية",
      "ms": 26.3748,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-02: عميل الـAPI على مسارات الخادم نفسها — «مستني إقرارك»، والقراءة، والإقرار، والإلغاء، وفلتر السجل؛ والمعاينة من غير طلب الإقرار",
      "ms": 335.6811,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-03: «مستنداتي» — «مستني إقرارك» بقارئ المستند؛ والإقرار ببصمة الملف اللي اتعرض، وبعد ما يتعرض فعلًا بس",
      "ms": 1.2953,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-04: «مهامي» — مهمة إقرار المستند من غير أزرار، ورابط فتح المستند لصاحبها",
      "ms": 1.1708,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-05: شاشة الإصدار — طلب الإقرار وموعده، وحالته وفلترها وإلغاؤه في السجل، ونفس المستند لمجموعة",
      "ms": 1.3594,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-01: القواعد الصافية — النسخة السارية والجاية، وأساس الإقرار، وموعد القفل، وحالة الموظف",
      "ms": 0.9994,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-02: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، والمسارات الثابتة قبل ‎:id، والمسارات المسموحة والحساب مقفول",
      "ms": 64.7651,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-03: ربط البوابة في الواجهة — التحويل بكود الخادم، والفحص مرة مع كل دخول، وشاشة الإقرار والقارئ",
      "ms": 5.1761,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-04: الشاشات والقايمة الجانبية وصلاحيات المسارات والتقرير",
      "ms": 2.8644,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-05: ملف السياسة بالتدفق — البصمة والحجم من غير تحميل الملف كله، وتيار الإرسال بيقطع قبل ما يكمل لو الملف مش هو",
      "ms": 10.2821,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 16.1876,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 6.8874,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 2.5098,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 22.9712,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.4714,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.7272,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.3047,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.643,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 163.4156,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
      "ms": 0.5043,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
      "ms": 0.1811,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
      "ms": 4.7663,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
      "ms": 0.2273,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
      "ms": 0.107,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
      "ms": 0.1489,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
      "ms": 0.1187,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
      "ms": 0.2669,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
      "ms": 0.2895,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
      "ms": 1.2788,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4363,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2625,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2295,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1382,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2137,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1912,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1237,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.193,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":false,\"statusCode\":400,\"editCode\":400,\"states\":[{\"id\":1,\"status\":\"OPEN\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":1}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}",
    "{\"case\":\"isolation-and-late-links\",\"rcsi\":false,\"concurrentIssuers\":3,\"documents\":1,\"ackCancel\":[404,201],\"lateLinkCases\":4}",
    "{\"case\":\"ack-cancel-consistency\",\"responses\":[404,201],\"twoCancels\":[201,400]}",
    "tests 47",
    "suites 0",
    "pass 47",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 53006.7928"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2o_cache_test_edfaccfaf26b1b90\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2o_cache_test_edfaccfaf26b1b90\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2o_cache_test_edfaccfaf26b1b90\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2o_rc_test_0a0ed4e50a957257\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2o_rc_test_0a0ed4e50a957257\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2o_rc_test_0a0ed4e50a957257\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2o_independent_test_d42872f13dc0ea3c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2o_independent_test_d42872f13dc0ea3c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2o_independent_test_d42872f13dc0ea3c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n"
  ]
}
