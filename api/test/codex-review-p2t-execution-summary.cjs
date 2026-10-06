module.exports = {
  "reviewed": {
    "partA": "a66d0c9",
    "partB": "1588d39"
  },
  "checkout": "2c7b350d97abce534b56f5d25e1cc603230b4c36",
  "totals": {
    "passed": 109,
    "failed": 17
  },
  "runs": [
    {
      "artifact": "codex-review-p2t-results-batch.cjs",
      "filter": null,
      "selected": [
        "request-audience-conditions",
        "employee-custom-fields",
        "employee-custom-fields-migration",
        "codex-review-p2t-units"
      ],
      "passed": 49,
      "failed": 0,
      "results": [
        {
          "file": "request-audience-conditions.integration.cjs",
          "name": "AD-01: نوع طلب للسعوديين على عقد محدد المدة — بيظهر ويتقدّم للي ينطبق عليه بس، والعضوية بصفات الموظف دلوقتي",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-audience-conditions.integration.cjs",
          "name": "AD-02: الحفظ — الشروط بتتدقق، والشكل المتخزّن من غير شروط زي ما هو بالحرف",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-audience-conditions.integration.cjs",
          "name": "AD-03: الدرجة وتاريخ التعيين، وشاشة الخصم بتقرا صفات الموظف لما جمهور النوع فيه شروط",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields.integration.cjs",
          "name": "EF-01: تعريف الحقول — «إدارة الإعدادات» بس، والأنواع الخمسة، والمفتاح والنوع ثابتين، والتعطيل بيخبّي والقيم بتفضل، والتغيير في التدقيق",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields.integration.cjs",
          "name": "EF-02: قراءة قيم الموظف بقاعدة ملفه — صاحبه أو «عرض الموظفين» في نطاقه، والمقيّد للي يعدّل الملف بس",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields.integration.cjs",
          "name": "EF-03: الحفظ — «تعديل الموظفين» في النطاق، وكل نوع بقيمته، والغلط من غير أي كتابة، والإلزامي مايتفضّاش",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields.integration.cjs",
          "name": "EF-04: شرط الجمهور بالحقل المخصص — للي قيمته من القايمة بس، والحفظ بيدقق، وحقل اتعطّل أو بقى مقيّد = مفيش حد",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields.integration.cjs",
          "name": "EF-05: الحقول بحد أقصى 50، والمعطّل محسوب",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields-migration.integration.cjs",
          "name": "CFM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields-migration.integration.cjs",
          "name": "CFM-2: من غير الجدولين الحقول «مش متاحة» والحفظ مرفوض برسالته؛ والمُرحّل بيعمل الجدولين بنفس الشكل والفرق صفر، وبعده الحقل بيتعرّف من غير إعادة تشغيل",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields-migration.integration.cjs",
          "name": "CFM-3: آمن للتكرار",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-audience-conditions.test.cjs",
          "name": "AC-01: «السعوديين على عقد محدد المدة» — للي ينطبق عليه بس؛ والمالك برّه القيد، وبانِي الأنواع بيشوف ومايقدّمش",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-audience-conditions.test.cjs",
          "name": "AC-02: كل شرط لوحده — الجنسية، ونوع العقد، والدرجة، وتاريخ التعيين",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-audience-conditions.test.cjs",
          "name": "AC-03: الشرط قيد — موضوع من غير صفات، وشرط تالف أو مش معروف = مش من الجمهور؛ ومن غير شروط الشكل القديم زي ما هو",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-audience-conditions.test.cjs",
          "name": "AC-04: الصفات بتتحط على الموضوع لما صف الموظف شايلها بس؛ و«مين» و«فين» لازم يتحققوا مع الشروط",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-audience-conditions-ui.test.cjs",
          "name": "AU-01: محرر الجمهور فيه شروط صفات الموظف — بتتبعت لما يبقى فيه شرط بس، وبتتحمّل من المتخزّن، والجملة بتذكرها",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields.test.cjs",
          "name": "CF-01: قيمة الشاشة ← أعمدة التخزين لكل نوع، والغلط برسالته، والفاضي من غير قيمة",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields.test.cjs",
          "name": "CF-02: أعمدة التخزين ← قيمة الرد لكل نوع",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields.test.cjs",
          "name": "CF-03: اختيارات القايمة — لنوع «اختيار» بس، من غير تكرار ولا فاضي، وبحدودها؛ والمفتاح بقاعدته",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields.test.cjs",
          "name": "CF-04: شرط الجمهور بالحقل المخصص — قيمة الموظف من القايمة، ومن غير قيمة أو قراءة مش من الجمهور",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields-ui.test.cjs",
          "name": "FU-01: مكتبة الواجهة بنفس قيم الخادم وبمساراته",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields-ui.test.cjs",
          "name": "FU-02: كارت «بيانات إضافية» — مابيظهرش قبل الترحيل أو من غير حقول، والتعديل للي الخادم سمح له، واللي اتغيّر بس بيتبعت",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields-ui.test.cjs",
          "name": "FU-03: شاشة «حقول ملف الموظف» — المفتاح والنوع مقفولين في التعديل، ورسالة قبل الترحيل، ومكانها في القوايم وسجل الموديولات",
          "pass": true,
          "skip": false
        },
        {
          "file": "employee-custom-fields-ui.test.cjs",
          "name": "FU-04: محرر الجمهور — شرط الحقل المخصص للحقول اللي عليها قيم بس، وبيتحمّل من المتخزّن، وشرط حقل مابقاش متاح بيتشال",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "input check before sending: type, positive value, two decimals for a fixed amount, reason length, target payroll month",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "status badge: «معتمد — بانتظار الصرف» until the ledger entry is consumed by a paid run, then the paid colour; one money formatter with deductions",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "API client: every call goes through apiFetch, bulk submits the preview hash, decisions carry the expected revision",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "workspace (money-requests simplification): one selection list (an employee is a group of one), a team, a department or a branch; «إرسال» previews internally and sends that preview hash; the table appears only when somebody is excluded or refused; catalog behind bonuses.manage",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "money requests (B3/B4): both financial catalog cards open their own form in place, the generic engine refuses them, and the audience gates creating",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "B4: the seeded money types match the live rows — one row each, no approval chain, and an audience limited to the people the owner picks",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "pages: /payroll/bonuses inside MainLayout with the admin workspace, opened prefilled by employee and month from the run row modal’s group link, without the legacy BONUS requests table; /my/bonuses shows the employee his bonuses plus the manager workspace",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "«مكافأة» على صف المسير بتفتح نافذة مكانها: نفس نمط «شيل خصم» و«نقل لمسير آخر»، بلا انتقال لشاشة المكافآت",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "نافذة المكافأة: نفس نقطة الإنشاء الفردي ونفس المعاينة والفحص وبوابة المجموعات — بلا حساب مال ولا نقطة خدمة جديدة",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses-ui.test.cjs",
          "name": "نافذة المكافأة: رسالة الخادم العربية على النموذج، وسطر تأكيد باسم سلسلة الاعتماد وشهر المسير — زي نافذتي الخصم والنقل",
          "pass": true,
          "skip": false
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-01: كل مسار تابع لموديول مسجّل",
          "pass": true,
          "skip": false
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
          "pass": true,
          "skip": false
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
          "pass": true,
          "skip": false
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
          "pass": true,
          "skip": false
        },
        {
          "file": "routes-guards.test.cjs",
          "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        },
        {
          "file": "schema-readiness.test.cjs",
          "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
          "pass": true,
          "skip": false
        }
      ]
    },
    {
      "artifact": "codex-review-p2t-results-final-independent.cjs",
      "filter": null,
      "selected": [
        "codex-review-p2t-independent",
        "codex-review-p2t-concurrency"
      ],
      "passed": 5,
      "failed": 4,
      "results": [
        {
          "file": "codex-review-p2t-independent.integration.cjs",
          "name": "P2T A: initial draft submission must recheck current employee attributes",
          "pass": false,
          "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
          "cause": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
          "stack": "AssertionError [ERR_ASSERTION]: An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
        },
        {
          "file": "codex-review-p2t-independent.integration.cjs",
          "name": "P2T B: an initial draft must not bypass a custom audience field that became restricted",
          "pass": false,
          "error": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
          "cause": "Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n",
          "stack": "AssertionError [ERR_ASSERTION]: Restricted audience field must close the first-submission path as well as creation\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
        },
        {
          "file": "codex-review-p2t-independent.integration.cjs",
          "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
          "pass": false,
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
          "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
          "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
        },
        {
          "file": "codex-review-p2t-independent.integration.cjs",
          "name": "P2T B: edit-only permission must not commit values then answer forbidden",
          "pass": false,
          "error": "A forbidden response must not follow a committed write",
          "cause": "A forbidden response must not follow a committed write",
          "stack": "AssertionError [ERR_ASSERTION]: A forbidden response must not follow a committed write\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:55:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
        },
        {
          "file": "codex-review-p2t-independent.integration.cjs",
          "name": "P2T controls: field hiding, branch boundary, rebinding and unknown keys do not expose or partially save",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2t-independent.integration.cjs",
          "name": "P2T object-name field control: constructor is accepted through the API and is included among audience-editor options",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2t-concurrency.integration.cjs",
          "name": "P2T two value saves serialize on employee and retain both distinct keys",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2t-concurrency.integration.cjs",
          "name": "P2T a transfer holding the employee row forces the waiting writer to recheck branch after lock",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2t-concurrency.integration.cjs",
          "name": "P2T malformed bundle rolls back deletion and update; field definition audit failure rolls back its change",
          "pass": true,
          "skip": false
        }
      ]
    },
    {
      "artifact": "codex-review-p2t-results-rcsi.cjs",
      "filter": null,
      "selected": [
        "codex-review-p2t-read-races",
        "codex-review-p2t-concurrency"
      ],
      "passed": 3,
      "failed": 3,
      "results": [
        {
          "file": "codex-review-p2t-read-races.integration.cjs",
          "name": "P2T restricted field race must not disclose a new restricted value through an older public definition",
          "pass": false,
          "error": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
          "cause": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
          "stack": "AssertionError [ERR_ASSERTION]: No point in time made the new value readable to this viewer\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
        },
        {
          "file": "codex-review-p2t-read-races.integration.cjs",
          "name": "P2T branch race must not disclose values written in the foreign branch after initial employee check",
          "pass": false,
          "error": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
          "cause": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
          "stack": "AssertionError [ERR_ASSERTION]: Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
        },
        {
          "file": "codex-review-p2t-read-races.integration.cjs",
          "name": "P2T post-write response must not pick up a foreign value after its scope check",
          "pass": false,
          "error": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
          "cause": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
          "stack": "AssertionError [ERR_ASSERTION]: Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:59:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
        },
        {
          "file": "codex-review-p2t-concurrency.integration.cjs",
          "name": "P2T two value saves serialize on employee and retain both distinct keys",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2t-concurrency.integration.cjs",
          "name": "P2T a transfer holding the employee row forces the waiting writer to recheck branch after lock",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2t-concurrency.integration.cjs",
          "name": "P2T malformed bundle rolls back deletion and update; field definition audit failure rolls back its change",
          "pass": true,
          "skip": false
        }
      ]
    },
    {
      "artifact": "codex-review-p2t-results-shape-ui.cjs",
      "filter": null,
      "selected": [
        "codex-review-p2t-migration-shape",
        "codex-review-p2t-auditor-units"
      ],
      "passed": 0,
      "failed": 2,
      "results": [
        {
          "file": "codex-review-p2t-auditor-units.integration.cjs",
          "name": "P2T malformed known condition values must be rejected as a whole by the evaluator",
          "pass": false,
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
          "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
          "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-auditor-units.integration.cjs:12:84)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.start (node:internal/test_runner/test:1003:17)\n    at startSubtestAfterBootstrap (node:internal/test_runner/harness:358:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)"
        },
        {
          "file": "codex-review-p2t-auditor-units.integration.cjs",
          "name": "P2T constructor is a valid field key and must not crash the actual audience-editor JSX",
          "pass": false,
          "error": "Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\"",
          "cause": "Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\"",
          "stack": "AssertionError [ERR_ASSERTION]: Got unwanted exception.\nActual message: \"(form.customConds[field.fieldKey] ?? []).includes is not a function\"\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-auditor-units.integration.cjs:24:9)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n    at Test.postRun (node:internal/test_runner/test:1235:19)\n    at Test.run (node:internal/test_runner/test:1163:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
        }
      ]
    },
    {
      "artifact": "codex-review-p2t-results-migration.cjs",
      "filter": null,
      "selected": [
        "codex-review-p2t-migration-shape"
      ],
      "passed": 0,
      "failed": 2,
      "results": [
        {
          "file": "codex-review-p2t-migration-shape.integration.cjs",
          "name": "P2T migration must reject a preexisting ten-column fields table with a wrong required type",
          "pass": false,
          "error": "094 must not report success on an incompatible same-name table\n\nfalse !== true\n",
          "cause": "094 must not report success on an incompatible same-name table\n\nfalse !== true\n",
          "stack": "AssertionError [ERR_ASSERTION]: 094 must not report success on an incompatible same-name table\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-migration-shape.integration.cjs:23:82)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
        },
        {
          "file": "codex-review-p2t-migration-shape.integration.cjs",
          "name": "P2T migration must reject a same-named unique field index on the wrong column",
          "pass": false,
          "error": "Index name and is_unique alone do not verify key columns\n\nfalse !== true\n",
          "cause": "Index name and is_unique alone do not verify key columns\n\nfalse !== true\n",
          "stack": "AssertionError [ERR_ASSERTION]: Index name and is_unique alone do not verify key columns\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-migration-shape.integration.cjs:33:80)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
        }
      ]
    },
    {
      "artifact": "codex-review-p2t-results-part-a-commit.cjs",
      "filter": null,
      "selected": [
        "codex-review-p2t-independent",
        "codex-review-p2t-auditor-units"
      ],
      "passed": 0,
      "failed": 3,
      "results": [
        {
          "file": "codex-review-p2t-independent.integration.cjs",
          "name": "P2T A: initial draft submission must recheck current employee attributes",
          "pass": false,
          "error": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
          "cause": "An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n",
          "stack": "AssertionError [ERR_ASSERTION]: An unsubmitted draft is not an already submitted request; current contract must govern its first submission\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
        },
        {
          "file": "codex-review-p2t-independent.integration.cjs",
          "name": "P2T A: corrupted stored condition must fail closed on actual catalog and request creation",
          "pass": false,
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
          "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n",
          "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   201\n-   false,\n-   403\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-independent.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
        },
        {
          "file": "codex-review-p2t-auditor-units.integration.cjs",
          "name": "P2T malformed known condition values must be rejected as a whole by the evaluator",
          "pass": false,
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
          "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n",
          "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   true,\n+   true,\n+   true,\n+   true\n-   false,\n-   false,\n-   false,\n-   false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-auditor-units.integration.cjs:12:84)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at Test.start (node:internal/test_runner/test:1003:17)\n    at startSubtestAfterBootstrap (node:internal/test_runner/harness:358:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)"
        }
      ]
    },
    {
      "artifact": "codex-review-p2t-results-independent.cjs",
      "filter": "codex-review-p2t-read-races.integration.cjs",
      "selected": [
        "codex-review-p2t-independent",
        "codex-review-p2t-read-races"
      ],
      "passed": 0,
      "failed": 3,
      "results": [
        {
          "file": "codex-review-p2t-read-races.integration.cjs",
          "name": "P2T restricted field race must not disclose a new restricted value through an older public definition",
          "pass": false,
          "error": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
          "cause": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
          "stack": "AssertionError [ERR_ASSERTION]: No point in time made the new value readable to this viewer\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
        },
        {
          "file": "codex-review-p2t-read-races.integration.cjs",
          "name": "P2T branch race must not disclose values written in the foreign branch after initial employee check",
          "pass": false,
          "error": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
          "cause": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
          "stack": "AssertionError [ERR_ASSERTION]: Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
        },
        {
          "file": "codex-review-p2t-read-races.integration.cjs",
          "name": "P2T post-write response must not pick up a foreign value after its scope check",
          "pass": false,
          "error": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
          "cause": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
          "stack": "AssertionError [ERR_ASSERTION]: Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:59:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
        }
      ]
    },
    {
      "artifact": "codex-review-p2t-results-regressions.cjs",
      "filter": null,
      "selected": [
        "payroll-bonuses",
        "payroll-typed-deductions",
        "modules-enforcement",
        "policies"
      ],
      "passed": 52,
      "failed": 0,
      "results": [
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-bonuses.integration.cjs",
          "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-typed-deductions.integration.cjs",
          "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-07: المزايا الفرعية والباقات",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
          "pass": true,
          "skip": false
        },
        {
          "file": "modules-enforcement.integration.cjs",
          "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة",
          "pass": true,
          "skip": false
        },
        {
          "file": "policies.integration.cjs",
          "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب",
          "pass": true,
          "skip": false
        }
      ]
    }
  ],
  "staticChecks": [
    {
      "area": "api",
      "exitCode": 0,
      "diagnostics": ""
    },
    {
      "area": ".",
      "exitCode": 0,
      "diagnostics": ""
    }
  ],
  "findings": {
    "CRP2T-A-B01": "Initial submission of a draft bypasses newly failing employee attributes",
    "CRP2T-A-B02": "Corrupt known conditions open instead of closing the audience",
    "CRP2T-B-B01": "Split scope/field/value reads reveal newly restricted or foreign-branch values; includes post-write response",
    "CRP2T-B-B02": "Same first-submission bypass when the custom audience field becomes restricted",
    "CRP2T-B-B03": "094 accepts wrong existing column type or same-named unique index on a different key",
    "CRP2T-B-N01": "Edit-only actor receives 403 after custom values have committed",
    "CRP2T-B-N02": "Accepted constructor key crashes the audience editor JSX"
  },
  "passingControls": [
    "101 existing batch/related tests including migration replay and clean schema delta",
    "Two employee value saves serialize and retain distinct keys under RC/RCSI",
    "Employee move before row lock causes 404 with no write under RC/RCSI",
    "Invalid bundle and audit failure roll back under RC/RCSI",
    "Restricted values hidden in ordinary reads; foreign branch indistinguishable from nonexistent employee",
    "Rebound account loses self access; audience options exclude restricted fields",
    "Object-name field handled correctly by server even though editor fails"
  ],
  "supersededSetupRuns": [
    {
      "artifact": "codex-review-p2t-results-independent.cjs",
      "excluded": "Independent controls initially used a duplicate fixture account linked to the same employee; corrected fixture and reran. Read-races results retained."
    },
    {
      "artifact": "codex-review-p2t-results-boundaries.cjs",
      "excluded": "Initial SQL waiter observer counted only direct blockers, not the second waiter behind the first. Corrected observer and reran under RC/RCSI."
    }
  ],
  "limits": [
    "No product/existing-test changes",
    "Only disposable databases, protected-database guard, SQL-only network",
    "HTTP stays inside test process; no listening ports or owner-service interaction",
    "Instance SMTP replacements for fixtures enabling email; transporter also blocked",
    "SQL Server 2022 with compatibility 150, not native SQL Server 2019",
    "Part A attribution confirmed with its four server modules loaded from a66d0c9 in memory; no checkout",
    "No whole-suite or browser run; editor failure uses exact JSX fragment compiled/rendered with React",
    "Known malformed stored conditions and incompatible old tables were injected only in disposable databases"
  ],
  "decisions": [
    "Current attributes govern first submission; the stated continuation exception covers already submitted requests, not drafts",
    "Restricted field permission and existing settings administration retained; no new parallel framework suggested",
    "Concurrency reads must not combine an old permission decision with newly hidden data"
  ]
}
