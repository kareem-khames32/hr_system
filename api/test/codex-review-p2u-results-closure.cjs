module.exports = {
  "selected": [
    "codex-review-p2u-independent",
    "codex-review-p2u-concurrency",
    "codex-review-p2u-migration-shape",
    "codex-review-p2u-auditor-units",
    "codex-review-p2u-units",
    "request-audience-conditions",
    "employee-custom-fields",
    "employee-custom-fields-migration"
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
    "duration_ms": 46299.0534
  },
  "results": [
    {
      "file": "codex-review-p2u-independent.integration.cjs",
      "name": "P2U A: initial draft submission must recheck current employee attributes",
      "ms": 5082.2889,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-independent.integration.cjs",
      "name": "P2U B: an initial draft must not bypass a custom audience field that became restricted",
      "ms": 164.2237,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-independent.integration.cjs",
      "name": "P2U A: corrupted stored condition must fail closed on actual catalog and request creation",
      "ms": 55.102,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-independent.integration.cjs",
      "name": "P2U B: edit-only permission must not commit values then answer forbidden",
      "ms": 31.8316,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-independent.integration.cjs",
      "name": "P2U controls: field hiding, branch boundary, rebinding and unknown keys do not expose or partially save",
      "ms": 182.5254,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-independent.integration.cjs",
      "name": "P2U object-name field control: constructor is accepted through the API and is included among audience-editor options",
      "ms": 71.2614,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-concurrency.integration.cjs",
      "name": "P2U two value saves serialize on employee and retain both distinct keys",
      "ms": 5061.6077,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-concurrency.integration.cjs",
      "name": "P2U a transfer holding the employee row forces the waiting writer to recheck branch after lock",
      "ms": 69.4396,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-concurrency.integration.cjs",
      "name": "P2U malformed bundle rolls back deletion and update; field definition audit failure rolls back its change",
      "ms": 101.986,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-migration-shape.integration.cjs",
      "name": "P2U migration must reject a preexisting ten-column fields table with a wrong required type",
      "ms": 5012.9901,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-migration-shape.integration.cjs",
      "name": "P2U migration must reject a same-named unique field index on the wrong column",
      "ms": 12.2479,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-auditor-units.integration.cjs",
      "name": "P2U malformed known condition values must be rejected as a whole by the evaluator",
      "ms": 1.3224,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-auditor-units.integration.cjs",
      "name": "P2U constructor is a valid field key and must not crash the actual audience-editor JSX",
      "ms": 20.1532,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-01: «السعوديين على عقد محدد المدة» — للي ينطبق عليه بس؛ والمالك برّه القيد، وبانِي الأنواع بيشوف ومايقدّمش",
      "ms": 1.3154,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-02: كل شرط لوحده — الجنسية، ونوع العقد، والدرجة، وتاريخ التعيين",
      "ms": 0.4876,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-03: الشرط قيد — موضوع من غير صفات، وشرط تالف أو مش معروف = مش من الجمهور؛ ومن غير شروط الشكل القديم زي ما هو",
      "ms": 0.2523,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-04: الصفات بتتحط على الموضوع لما صف الموظف شايلها بس؛ و«مين» و«فين» لازم يتحققوا مع الشروط",
      "ms": 0.2459,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-05: الشرط المتخزّن بيتدقق كله وقت التقييم — التالف مابيتحققش لحد، حتى للي كان هيطابق جزءه السليم",
      "ms": 0.3667,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions-ui.test.cjs",
      "name": "AU-01: محرر الجمهور فيه شروط صفات الموظف — بتتبعت لما يبقى فيه شرط بس، وبتتحمّل من المتخزّن، والجملة بتذكرها",
      "ms": 0.699,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-01: قيمة الشاشة ← أعمدة التخزين لكل نوع، والغلط برسالته، والفاضي من غير قيمة",
      "ms": 0.9162,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-02: أعمدة التخزين ← قيمة الرد لكل نوع",
      "ms": 0.1098,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-03: اختيارات القايمة — لنوع «اختيار» بس، من غير تكرار ولا فاضي، وبحدودها؛ والمفتاح بقاعدته",
      "ms": 0.3465,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-04: شرط الجمهور بالحقل المخصص — قيمة الموظف من القايمة، ومن غير قيمة أو قراءة مش من الجمهور",
      "ms": 0.7077,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-01: مكتبة الواجهة بنفس قيم الخادم وبمساراته",
      "ms": 0.4351,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-02: كارت «بيانات إضافية» — مابيظهرش قبل الترحيل أو من غير حقول، والتعديل للي الخادم سمح له، واللي اتغيّر بس بيتبعت",
      "ms": 0.5649,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-03: شاشة «حقول ملف الموظف» — المفتاح والنوع مقفولين في التعديل، ورسالة قبل الترحيل، ومكانها في القوايم وسجل الموديولات",
      "ms": 2.3146,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-04: محرر الجمهور — شرط الحقل المخصص للحقول اللي عليها قيم بس، وبيتحمّل من المتخزّن، وشرط حقل مابقاش متاح بيتشال",
      "ms": 0.5768,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "input check before sending: type, positive value, two decimals for a fixed amount, reason length, target payroll month",
      "ms": 0.2215,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "status badge: «معتمد — بانتظار الصرف» until the ledger entry is consumed by a paid run, then the paid colour; one money formatter with deductions",
      "ms": 0.0811,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "API client: every call goes through apiFetch, bulk submits the preview hash, decisions carry the expected revision",
      "ms": 0.6489,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "workspace (money-requests simplification): one selection list (an employee is a group of one), a team, a department or a branch; «إرسال» previews internally and sends that preview hash; the table appears only when somebody is excluded or refused; catalog behind bonuses.manage",
      "ms": 0.8418,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "money requests (B3/B4): both financial catalog cards open their own form in place, the generic engine refuses them, and the audience gates creating",
      "ms": 4.9329,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "B4: the seeded money types match the live rows — one row each, no approval chain, and an audience limited to the people the owner picks",
      "ms": 1.1667,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "pages: /payroll/bonuses inside MainLayout with the admin workspace, opened prefilled by employee and month from the run row modal’s group link, without the legacy BONUS requests table; /my/bonuses shows the employee his bonuses plus the manager workspace",
      "ms": 2.8091,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "«مكافأة» على صف المسير بتفتح نافذة مكانها: نفس نمط «شيل خصم» و«نقل لمسير آخر»، بلا انتقال لشاشة المكافآت",
      "ms": 0.8975,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "نافذة المكافأة: نفس نقطة الإنشاء الفردي ونفس المعاينة والفحص وبوابة المجموعات — بلا حساب مال ولا نقطة خدمة جديدة",
      "ms": 1.7833,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "نافذة المكافأة: رسالة الخادم العربية على النموذج، وسطر تأكيد باسم سلسلة الاعتماد وشهر المسير — زي نافذتي الخصم والنقل",
      "ms": 2.1029,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.5749,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.9215,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.3365,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.9509,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 150.0925,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.5143,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3116,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3028,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2699,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2505,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2465,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2162,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2116,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2256,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1843,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-01: نوع طلب للسعوديين على عقد محدد المدة — بيظهر ويتقدّم للي ينطبق عليه بس، والعضوية بصفات الموظف دلوقتي",
      "ms": 6938.754,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-02: الحفظ — الشروط بتتدقق، والشكل المتخزّن من غير شروط زي ما هو بالحرف",
      "ms": 140.8198,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-03: الدرجة وتاريخ التعيين، وشاشة الخصم بتقرا صفات الموظف لما جمهور النوع فيه شروط",
      "ms": 132.1156,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-04: أول تقديم لمسودة بيتحكم بجمهور النوع دلوقتي — والنيابة زي الإنشاء، والمرجّع للاستكمال بيكمّل، والشرط التالف بيقفل",
      "ms": 721.8671,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-01: تعريف الحقول — «إدارة الإعدادات» بس، والأنواع الخمسة، والمفتاح والنوع ثابتين، والتعطيل بيخبّي والقيم بتفضل، والتغيير في التدقيق",
      "ms": 6661.7422,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-02: قراءة قيم الموظف بقاعدة ملفه — صاحبه أو «عرض الموظفين» في نطاقه، والمقيّد للي يعدّل الملف بس",
      "ms": 109.7152,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-03: الحفظ — «تعديل الموظفين» في النطاق، وكل نوع بقيمته، والغلط من غير أي كتابة، والإلزامي مايتفضّاش",
      "ms": 413.8989,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-04: شرط الجمهور بالحقل المخصص — للي قيمته من القايمة بس، والحفظ بيدقق، وحقل اتعطّل أو بقى مقيّد = مفيش حد",
      "ms": 706.2962,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-05: الحقول بحد أقصى 50، والمعطّل محسوب",
      "ms": 71.1484,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-06: القراءة والحفظ تحت قفل واحد باسم الموظف — قيمة اتحفظت بعد بداية القراءة مابترجعش فيها، واللي مايلاقيش القفل «حاول تاني»",
      "ms": 10208.1294,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-migration.integration.cjs",
      "name": "CFM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7470.0227,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-migration.integration.cjs",
      "name": "CFM-2: من غير الجدولين الحقول «مش متاحة» والحفظ مرفوض برسالته؛ والمُرحّل بيعمل الجدولين بنفس الشكل والفرق صفر، وبعده الحقل بيتعرّف من غير إعادة تشغيل",
      "ms": 5380.1614,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-migration.integration.cjs",
      "name": "CFM-3: آمن للتكرار",
      "ms": 960.1365,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"attribute-draft-recheck\",\"freshCreate\":403,\"draftSubmit\":403}",
    "{\"case\":\"restricted-custom-draft\",\"freshCreate\":403,\"draftSubmit\":403}",
    "{\"case\":\"invalid-condition\",\"catalog\":false,\"submit\":403,\"nationalityMissing\":true}",
    "{\"case\":\"edit-only-save\",\"status\":200,\"stored\":\"committed despite error\"}",
    "{\"rcsi\":false,\"parallelSaves\":[200,200],\"bothKeysPreserved\":true}",
    "{\"rcsi\":false,\"writeAfterMove\":404,\"noWrite\":true}",
    "{\"case\":\"old-table-required-type\",\"rejected\":true}",
    "{\"case\":\"old-table-wrong-index\",\"rejected\":true}",
    "{\"case\":\"malformed-runtime-conditions\",\"actual\":[false,false,false,false]}",
    "Cleanup verified: hr_audience_test_f969dfeaac8be23b is absent from sys.databases.",
    "Cleanup verified: hr_custom_fields_test_cf320b4046138a4e is absent from sys.databases.",
    "Cleanup verified: hr_custom_fields_migration_test_a45c159ee9272bd0 is absent from sys.databases.",
    "tests 65",
    "suites 0",
    "pass 65",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 46299.0534"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_independent_test_7aa67a990bc4c9b1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_independent_test_7aa67a990bc4c9b1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2u_independent_test_7aa67a990bc4c9b1\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_concurrency_test_b0051f95496e2f67\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_concurrency_test_b0051f95496e2f67\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2u_concurrency_test_b0051f95496e2f67\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_migration_shape_test_ae4c46869741674c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_migration_shape_test_ae4c46869741674c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2u_migration_shape_test_ae4c46869741674c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audience_test_f969dfeaac8be23b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audience_test_f969dfeaac8be23b\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_custom_fields_test_cf320b4046138a4e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_custom_fields_test_cf320b4046138a4e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_custom_fields_migration_test_a45c159ee9272bd0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_custom_fields_migration_test_a45c159ee9272bd0\"}\n"
  ]
}
