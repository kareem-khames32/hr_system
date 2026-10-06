module.exports = {
  "target": "6288e78",
  "head": "64f3f55",
  "counts": {
    "passed": 180,
    "failed": 0,
    "skipped": 0
  },
  "runs": [
    {
      "file": "codex-review-p2o-results-independent-rc.cjs",
      "counts": {
        "tests": 47,
        "failed": 0,
        "passed": 47,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 47,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2o-results-migration-races-rc.cjs",
      "counts": {
        "tests": 9,
        "failed": 1,
        "passed": 8,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 9,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2o-results-migration-races-rc-fixed.cjs",
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
    },
    {
      "file": "codex-review-p2o-results-independent-rcsi.cjs",
      "counts": {
        "tests": 3,
        "failed": 0,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2o-results-regression-migrations.cjs",
      "counts": {
        "tests": 27,
        "failed": 0,
        "passed": 27,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 27,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p2o-results-before-after.cjs",
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
    },
    {
      "file": "codex-review-p2o-results-regression-behavior.cjs",
      "counts": {
        "tests": 95,
        "failed": 0,
        "passed": 95,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 95,
        "suites": 0
      }
    }
  ],
  "rows": [
    {
      "file": "codex-review-p2o-schema-cache.integration.cjs",
      "name": "P2O schema transition: an older application cache must not permit status or assignee edits on newly linked document tasks",
      "ms": 16909.2791,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rcsi.cjs"
    },
    {
      "file": "codex-review-p2o-concurrency.integration.cjs",
      "name": "P2O concurrent issue, ack/cancel and late task links with RCSI=false",
      "ms": 7054.2025,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O identity: supported rebind and deactivation reject old sessions; current branch readers and owner remain correctly separated",
      "ms": 6255.7302,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O concurrency: acknowledgement versus cancellation and two cancellations leave one consistent document/task outcome",
      "ms": 186.1954,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O rollback: a task-link failure rolls back issuing, stored-file rows and actual bytes; task-close failure rolls back evidence",
      "ms": 118.2279,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O issuance: transfer committed while issuing waits must reject the old branch without a document or task",
      "ms": 70.9663,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "codex-review-p2o-independent.integration.cjs",
      "name": "P2O mail: immediate and digest delivery revalidate acknowledgement/cancellation; active control sends only through the instance mock",
      "ms": 465.288,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "codex-review-p2o-streams.integration.cjs",
      "name": "P2O stream: exact bytes across chunk boundaries; preflight hashes the same bytes",
      "ms": 81.2607,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "codex-review-p2o-streams.integration.cjs",
      "name": "P2O stream: same-size, shorter, larger and trailing-chunk replacements cannot complete the advertised length",
      "ms": 7.5913,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "codex-review-p2o-streams.integration.cjs",
      "name": "P2O stream: disconnect and source failure close file descriptors; subsequent requests remain healthy",
      "ms": 18.3741,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-01: بصمة محاولة الإصدار فيها طلب الإقرار وموعده — نفس المفتاح مايتبعتش ببيانات تانية",
      "ms": 26.3748,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-02: عميل الـAPI على مسارات الخادم نفسها — «مستني إقرارك»، والقراءة، والإقرار، والإلغاء، وفلتر السجل؛ والمعاينة من غير طلب الإقرار",
      "ms": 335.6811,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-03: «مستنداتي» — «مستني إقرارك» بقارئ المستند؛ والإقرار ببصمة الملف اللي اتعرض، وبعد ما يتعرض فعلًا بس",
      "ms": 1.2953,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-04: «مهامي» — مهمة إقرار المستند من غير أزرار، ورابط فتح المستند لصاحبها",
      "ms": 1.1708,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-05: شاشة الإصدار — طلب الإقرار وموعده، وحالته وفلترها وإلغاؤه في السجل، ونفس المستند لمجموعة",
      "ms": 1.3594,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-01: القواعد الصافية — النسخة السارية والجاية، وأساس الإقرار، وموعد القفل، وحالة الموظف",
      "ms": 0.9994,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-02: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، والمسارات الثابتة قبل ‎:id، والمسارات المسموحة والحساب مقفول",
      "ms": 64.7651,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-03: ربط البوابة في الواجهة — التحويل بكود الخادم، والفحص مرة مع كل دخول، وشاشة الإقرار والقارئ",
      "ms": 5.1761,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-04: الشاشات والقايمة الجانبية وصلاحيات المسارات والتقرير",
      "ms": 2.8644,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-05: ملف السياسة بالتدفق — البصمة والحجم من غير تحميل الملف كله، وتيار الإرسال بيقطع قبل ما يكمل لو الملف مش هو",
      "ms": 10.2821,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم",
      "ms": 16.1876,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد",
      "ms": 6.8874,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال",
      "ms": 2.5098,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين",
      "ms": 22.9712,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.4714,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.7272,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.3047,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.643,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 163.4156,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
      "ms": 0.5043,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
      "ms": 0.1811,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
      "ms": 4.7663,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
      "ms": 0.2273,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
      "ms": 0.107,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
      "ms": 0.1489,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
      "ms": 0.1187,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
      "ms": 0.2669,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
      "ms": 0.2895,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
      "ms": 1.2788,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4363,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2625,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2295,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1382,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2137,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1912,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1237,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.193,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rc.cjs"
    },
    {
      "file": "codex-review-p2o-migration-races.integration.cjs",
      "name": "P2O migration during a blocked task mutation: fresh link checks under RC and RCSI",
      "ms": 9680.1692,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rcsi.cjs"
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: auditTableReady",
      "ms": 18.7972,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-migration-races-rc.cjs"
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: queueTablesReady",
      "ms": 0.44,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-migration-races-rc.cjs"
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: notificationTablesReady",
      "ms": 6.6092,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-migration-races-rc.cjs"
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: tasksTableReady",
      "ms": 0.6942,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-migration-races-rc.cjs"
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: executionSchemaReady",
      "ms": 0.5373,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-migration-races-rc.cjs"
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: delegationSchemaReady",
      "ms": 0.4004,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-migration-races-rc.cjs"
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: policySchemaReady",
      "ms": 6.346,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-migration-races-rc.cjs"
    },
    {
      "file": "codex-review-p2o-readiness.integration.cjs",
      "name": "P2O readiness failures, warning once and out-of-order results: documentAckSchemaReady",
      "ms": 15.4526,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-migration-races-rc.cjs"
    },
    {
      "file": "codex-review-p2o-concurrency.integration.cjs",
      "name": "P2O concurrent issue, ack/cancel and late task links with RCSI=true",
      "ms": 8899.8685,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-independent-rcsi.cjs"
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11687.807,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-2: من غير الجدول الإجراءات شغالة والبحث بيقول محتاج الترحيل؛ والمُرحّل بيعمل الجدول والمشغّل والفرق صفر، والتعديل والمسح مرفوضين",
      "ms": 3262.1852,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-3: آمن للتكرار",
      "ms": 763.2959,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "stored-file-sha256-migration.integration.cjs",
      "name": "FSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10222.8586,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "stored-file-sha256-migration.integration.cjs",
      "name": "FSM-2: من غير العمود الرفع شغال من غير بصمة؛ والمُرحّل بيضيفه بنفس الشكل، والقديم من غير بصمة، والجديد ببصمته",
      "ms": 3049.9073,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "stored-file-sha256-migration.integration.cjs",
      "name": "FSM-3: آمن للتكرار",
      "ms": 527.455,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "queue-outbox-migration.integration.cjs",
      "name": "QM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11389.9318,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "queue-outbox-migration.integration.cjs",
      "name": "QM-2: من غير الجدولين الإجراء شغال والحدث مابيتسجلش؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الحدث بيتسجل ويتوزع",
      "ms": 3252.5048,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "queue-outbox-migration.integration.cjs",
      "name": "QM-3: آمن للتكرار",
      "ms": 737.2261,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11139.4458,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-2: من غير الجداول الإشعارات المخزّنة والبريد واقفين من غير أخطاء؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر",
      "ms": 3786.1034,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-3: آمن للتكرار",
      "ms": 884.1166,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "tasks-migration.integration.cjs",
      "name": "TM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10466.6229,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "tasks-migration.integration.cjs",
      "name": "TM-2: من غير الجدول «مهامي» شغالة والمهمة العامة مرفوضة برسالة؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده المهمة بتتكلّف وتظهر",
      "ms": 3304.2062,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "tasks-migration.integration.cjs",
      "name": "TM-3: آمن للتكرار",
      "ms": 553.1568,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "request-execution-migration.integration.cjs",
      "name": "RM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10777.6815,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "request-execution-migration.integration.cjs",
      "name": "RM-2: من غير الأعمدة الإعداد مرفوض برسالة والاعتماد بيكمّل الطلب زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده المهمة بتتفتح",
      "ms": 3753.9033,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "request-execution-migration.integration.cjs",
      "name": "RM-3: آمن للتكرار",
      "ms": 561.2372,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11076.7711,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-2: من غير الجدول والعمود التفويض مرفوض برسالة والصندوق والقرار والبريد والتصعيد زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده القرار بيتكتب «بالنيابة عن»",
      "ms": 4209.2735,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 624.2875,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "policies-migration.integration.cjs",
      "name": "PM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11025.5138,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "policies-migration.integration.cjs",
      "name": "PM-2: من غير الجداول الشاشات «مستنية الترحيل» ومفيش بوابة؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده النشر والإقرار شغالين والمشغّلين بيمنعوا التعديل والمسح",
      "ms": 3620.7094,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "policies-migration.integration.cjs",
      "name": "PM-3: آمن للتكرار",
      "ms": 838.9327,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11687.9522,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-2: من غير الترحيل الإصدار العادي شغال وطلب الإقرار مرفوض برسالته؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الإقرار شغال والمشغّل بيمنع تعديله",
      "ms": 3883.4266,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 774.3137,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-migrations.cjs"
    },
    {
      "file": "codex-review-p2o-before-after.integration.cjs",
      "name": "P2O one running process without 084-092: ordinary document survives, first post-migration operation records audit and outbox",
      "ms": 10162.4217,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-before-after.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 10794.2931,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 178.2282,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 26.2483,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 153.9717,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "ms": 229.8236,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-01: حدث اتكتب في معاملة اترجعت مابيتسجلش ومابيتنفذش",
      "ms": 10005.9593,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-02: الحدث المتوزع مهمة لكل مستهلك وبتتنفذ مرة؛ والنوع من غير مستهلك بيتعلّم «اتوزع» من غير مهام",
      "ms": 117.3602,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-03: مهمة فشلت بتتعاد بعد مهلة مش فورًا، وبعد الحد الأقصى DEAD برسالتها، و«إعادة» بترجعها",
      "ms": 115.3671,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-04: عاملين مابياخدوش نفس المهمة، ومنع التكرار بالمفتاح، والمهمة المتمسكة من عامل وقع بترجع",
      "ms": 128.0986,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-05: الأحداث الست من مصادرها الحقيقية في نفس معاملتها",
      "ms": 2170.1097,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-06: شاشة الطابور لحساب الشركة بس، و/health بالعدد بس",
      "ms": 28.0144,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "ms": 10896.8684,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "ms": 983.7232,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "ms": 667.4527,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "ms": 971.224,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "ms": 683.9,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "ms": 260.7565,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "ms": 1609.205,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "ms": 1624.1007,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "ms": 1558.1341,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "ms": 2983.5507,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "ms": 262.3881,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "ms": 162.3932,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "ms": 1554.0962,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "ms": 2176.69,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-01: مهمة لموظف — في «مهامي» بتاعته بس، ويشوفها أصحاب الحق، وبرّه كده 404",
      "ms": 10985.8472,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-02: حدود التكليف — مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، ومن غير كاشف وجود",
      "ms": 144.7302,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-03: المدير المباشر بيكلّف مرؤوسيه من غير صلاحية — مش غيرهم ولا نفسه ولا دور",
      "ms": 111.4428,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-04: الحالة — المسؤول يبدأ ويعلّق ويقفل بإثبات، والمنشئ يلغي ويعيد الفتح، وإقفالين في نفس اللحظة واحد بس",
      "ms": 923.9847,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-05: مهمة الدور — لحاملي الدور اللي فرعها في نطاقهم، ومش مدير النظام في «مهامي» بتاعته",
      "ms": 173.8822,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-06: «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم",
      "ms": 1290.43,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-07: «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف",
      "ms": 1162.2738,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-08: قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول",
      "ms": 234.554,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-09: التعديل والتحويل للمنشئ أو صاحب الصلاحية — التحويل تكليف جديد، وتغيير الموعد بيرجّع التذكير",
      "ms": 559.7872,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-10: التذكير والتصعيد مرة واحدة لكل مهمة وموعد، بأيام الإعدادين، والمقفولة برّه",
      "ms": 701.1596,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-11: التهيئة وقت التعيين — المهام بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة",
      "ms": 1247.1172,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة",
      "ms": 139.6034,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-13: حدود الإعدادين",
      "ms": 206.4629,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-14: إشعارات المهام بالبريد — تكليف وتذكير للمسؤول، وتأخير لمديره، بالعنوان والموعد بس وبفحص وقت الإرسال",
      "ms": 4309.1902,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها",
      "ms": 721.4909,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-16: طلبات متزامنة أكتر من اتصالات المجمّع — كل طلب على اتصال معاملته، ومحدش بيستنى اتصال تاني",
      "ms": 2668.6467,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-17: مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server) — «فريقي» وقايمة التكليف و«مهامي» شغالين",
      "ms": 3792.8509,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-18: مهمة مسوغات التعيين في «مهامي» حالتها من المستندات دلوقتي — من غير ما شاشة التهيئة تتفتح الأول",
      "ms": 480.8393,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-01: نوع من غير الإعداد — الاعتماد بيكمّل الطلب في لحظتها ومن غير مهمة",
      "ms": 11554.7103,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-02: الإعداد على نوع الطلب — الدور والمهلة والإثبات بحدودهم، وشيل الدور بيشيل الباقي",
      "ms": 420.4404,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-03: نوع عليه مهمة — الطلب «قيد التنفيذ» ومهمة واحدة على الدور في فرع الطلب، وفي «مهامي» والتقرير",
      "ms": 272.1252,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-04: اللي المهمة عليه بيقرا الطلب، وحامل الدور في فرع تاني والغريب لأ",
      "ms": 129.0533,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-05: إقفال المهمة — الطلب «مكتمل» وسطر «اتنفّذ» وبريد لصاحبه؛ والإثبات الإجباري، وإقفالين في نفس اللحظة، ومن غير إعادة فتح",
      "ms": 978.555,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-06: مهمة التنفيذ ماتتلغيش ولا تتعدّل ولا تتحوّل من شاشة المهام — رفض التنفيذ من لوحة الطلبات بيلغيها ويرفض الطلب",
      "ms": 323.1175,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-07: الطلب السري — عنوان المهمة عام ومن غير اسم معتمده، وأصحاب «عرض كل المهام» و«إدارة المهام» مالهمش طريق له، والمنفّذ بيقراه",
      "ms": 1499.0249,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-08: المهمة والاعتماد معاملة واحدة — لو المهمة ماتكتبتش، الاعتماد كله بيرجع",
      "ms": 81.1569,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-09: باقي مداخل الاعتماد — سلسلة فاضية باعتماد تلقائي، وطلب الموارد البشرية نيابةً؛ ومعالج لسه ماخلّصش من غير مهمة",
      "ms": 381.9775,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-10: محدش ينفّذ طلبه — صاحب الطلب ومنشئه نيابةً مايشتغلوش على مهمته، ومدير النظام بيفكّ الانسداد",
      "ms": 567.4598,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-11: إثبات مهمة التنفيذ وسبب تعليقها ومين قفلها — للي يقدر يفتح الطلب بس، وملف إثباتها لرافعه",
      "ms": 537.0301,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-12: إقفال المهمة ورفض تنفيذ الطلب في نفس اللحظة — واحد بس بيكسب والتاني بيترفض برسالة، من غير تعليق متبادل",
      "ms": 267.4775,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-13: مهمة ربطها بطلبها اتثبّت والنداء واقف على صفها — مابتتعاملش كمهمة عادية",
      "ms": 334.9091,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-01: الإنشاء — الموظف لنفسه، ولغيره بصلاحية وفي نطاقه؛ وحدود الفترة والفئات والبديل؛ والقايمة",
      "ms": 10564.7724,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين",
      "ms": 532.0869,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس",
      "ms": 369.2859,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل",
      "ms": 155.5691,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض",
      "ms": 281.9603,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل",
      "ms": 1662.5421,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
      "ms": 1072.2632,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس",
      "ms": 647.7021,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال",
      "ms": 2605.1364,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى",
      "ms": 1000.868,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-11: تفويضين متداخلين لنفس المفوِّض في نفس اللحظة — واحد بس",
      "ms": 88.1504,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة",
      "ms": 9889.9816,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة",
      "ms": 512.384,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية",
      "ms": 355.2918,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل",
      "ms": 237.1425,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا",
      "ms": 634.9023,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه",
      "ms": 417.7827,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها",
      "ms": 219.6012,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ",
      "ms": 211.8762,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة",
      "ms": 589.7506,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة",
      "ms": 880.9399,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب",
      "ms": 79.9308,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-01: الإصدار بطلب إقرار — الطلب والمهمة وبصمة الملف مع الإصدار؛ ومن غير موظف مرفوض؛ وحدود الموعد؛ ومفتاح منع التكرار",
      "ms": 10071.5277,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-02: «مستني إقرارك» وقراءة المستند — لصاحبه بس، والبصمة من قراءة المستند مش من القايمة، وملفه بحجمه المعلَن",
      "ms": 149.3987,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-03: الإقرار — صاحب المستند لنفسه، وببصمة ملفه، ومرة واحدة، والدليل؛ ومهمته بتتقفل معاه",
      "ms": 348.172,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-04: الملف — اتبدّل على التخزين مابيتعرضش؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول",
      "ms": 475.4618,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-05: المهمة في محرك المهام — في «مهامي» برابط مستندها، ومابتتقفلش ولا بتتعدّل ولا بتتلغي من شاشة المهام، والتذكير والتصعيد شغالين عليها",
      "ms": 923.5647,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-06: الإلغاء — لصاحب «إدارة المستندات» اللي يشوف المستند، وقبل الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني",
      "ms": 542.1626,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-07: السجل — حالة الإقرار وفلترها، وبنطاق القارئ بفرع الموظف دلوقتي",
      "ms": 310.9978,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-08: إقرار المستند مابيقفلش النظام (حتى المتأخر)؛ والحساب المقفول على سياسة إلزامية بيقرّ بيها الأول",
      "ms": 244.8414,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "HR template permissions and validation prevent forged variables and null patches without changing letters",
      "ms": 9136.5708,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "draft edits do not change publication, and stale versions cannot overwrite a template",
      "ms": 123.3997,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "sample preview is a real PDF and neither it nor employee preview creates records",
      "ms": 64.2414,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "employee and custom fields are required only when referenced, with branch isolation before issuance",
      "ms": 83.1301,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "issuance archives a PDF in employee documents and concurrent retries issue it only once",
      "ms": 148.2605,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a saved document keeps its bytes after template and employee changes; an idempotent retry returns that issuance",
      "ms": 128.9822,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "financial tokens and both PDF download paths enforce finance permission and current branch",
      "ms": 136.0649,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a general company document needs no employee and remains visible only in its branch scope",
      "ms": 87.0406,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a database failure after PDF creation leaves no files or partial records and the same key can retry",
      "ms": 107.5564,
      "pass": true,
      "skip": false,
      "source": "codex-review-p2o-results-regression-behavior.cjs"
    }
  ],
  "notes": [
    "Unique tests use the latest completed outcome; repeated isolation runs are not double-counted.",
    "The previous P2N schema-cache proof was copied and its obsolete post-migration negative-cache assertion removed. No existing test was edited. Both independent application processes and real SQL DDL are retained.",
    "Both READ COMMITTED and READ_COMMITTED_SNAPSHOT were tested. Migration 089/092 and the parent task mapping commit from another connection while the real endpoint is blocked on its task row.",
    "Initial new migration-race fixture attempted to PATCH its ordinary control after closing it. The existing product correctly returned 400. The review-only fixture now reopens with a reason before PATCH; all scenarios pass.",
    "Deterministic synthetic PDF renderer and in-process HTTP transport are inherited from P2N. Actual changed services, SQL transactions, guards, file storage and hashes execute. No native Chromium or browser-visual claim.",
    "Every notification-enabled fixture substitutes MailService.send and isConfigured on its instance; the review network guard also refuses real SMTP and listening ports.",
    "The review scope contains eight readiness functions only. Existing stored-file hash and employee-suspension readiness do not cache missing schema; daily accrual 061 remains the pre-existing documented fallback. No product or existing test changes."
  ]
}
