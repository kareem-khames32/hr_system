module.exports = {
  "selected": [
    "request-audience-conditions",
    "employee-custom-fields",
    "employee-custom-fields-migration",
    "codex-review-p2t-units"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 49,
      "failed": 0,
      "passed": 49,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 49,
      "suites": 0
    },
    "duration_ms": 51856.8818
  },
  "results": [
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-01: نوع طلب للسعوديين على عقد محدد المدة — بيظهر ويتقدّم للي ينطبق عليه بس، والعضوية بصفات الموظف دلوقتي",
      "ms": 7822.6574,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-02: الحفظ — الشروط بتتدقق، والشكل المتخزّن من غير شروط زي ما هو بالحرف",
      "ms": 184.0274,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-03: الدرجة وتاريخ التعيين، وشاشة الخصم بتقرا صفات الموظف لما جمهور النوع فيه شروط",
      "ms": 159.6811,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-01: تعريف الحقول — «إدارة الإعدادات» بس، والأنواع الخمسة، والمفتاح والنوع ثابتين، والتعطيل بيخبّي والقيم بتفضل، والتغيير في التدقيق",
      "ms": 7146.4973,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-02: قراءة قيم الموظف بقاعدة ملفه — صاحبه أو «عرض الموظفين» في نطاقه، والمقيّد للي يعدّل الملف بس",
      "ms": 91.1957,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-03: الحفظ — «تعديل الموظفين» في النطاق، وكل نوع بقيمته، والغلط من غير أي كتابة، والإلزامي مايتفضّاش",
      "ms": 456.2987,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-04: شرط الجمهور بالحقل المخصص — للي قيمته من القايمة بس، والحفظ بيدقق، وحقل اتعطّل أو بقى مقيّد = مفيش حد",
      "ms": 705.3553,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-05: الحقول بحد أقصى 50، والمعطّل محسوب",
      "ms": 75.9636,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-migration.integration.cjs",
      "name": "CFM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7089.0588,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-migration.integration.cjs",
      "name": "CFM-2: من غير الجدولين الحقول «مش متاحة» والحفظ مرفوض برسالته؛ والمُرحّل بيعمل الجدولين بنفس الشكل والفرق صفر، وبعده الحقل بيتعرّف من غير إعادة تشغيل",
      "ms": 3348.5712,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-migration.integration.cjs",
      "name": "CFM-3: آمن للتكرار",
      "ms": 682.4951,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-01: «السعوديين على عقد محدد المدة» — للي ينطبق عليه بس؛ والمالك برّه القيد، وبانِي الأنواع بيشوف ومايقدّمش",
      "ms": 1.2398,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-02: كل شرط لوحده — الجنسية، ونوع العقد، والدرجة، وتاريخ التعيين",
      "ms": 0.3008,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-03: الشرط قيد — موضوع من غير صفات، وشرط تالف أو مش معروف = مش من الجمهور؛ ومن غير شروط الشكل القديم زي ما هو",
      "ms": 0.4269,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-04: الصفات بتتحط على الموضوع لما صف الموظف شايلها بس؛ و«مين» و«فين» لازم يتحققوا مع الشروط",
      "ms": 0.2884,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions-ui.test.cjs",
      "name": "AU-01: محرر الجمهور فيه شروط صفات الموظف — بتتبعت لما يبقى فيه شرط بس، وبتتحمّل من المتخزّن، والجملة بتذكرها",
      "ms": 0.6888,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-01: قيمة الشاشة ← أعمدة التخزين لكل نوع، والغلط برسالته، والفاضي من غير قيمة",
      "ms": 1.2566,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-02: أعمدة التخزين ← قيمة الرد لكل نوع",
      "ms": 0.4589,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-03: اختيارات القايمة — لنوع «اختيار» بس، من غير تكرار ولا فاضي، وبحدودها؛ والمفتاح بقاعدته",
      "ms": 1.2708,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-04: شرط الجمهور بالحقل المخصص — قيمة الموظف من القايمة، ومن غير قيمة أو قراءة مش من الجمهور",
      "ms": 0.8032,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-01: مكتبة الواجهة بنفس قيم الخادم وبمساراته",
      "ms": 0.53,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-02: كارت «بيانات إضافية» — مابيظهرش قبل الترحيل أو من غير حقول، والتعديل للي الخادم سمح له، واللي اتغيّر بس بيتبعت",
      "ms": 0.5636,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-03: شاشة «حقول ملف الموظف» — المفتاح والنوع مقفولين في التعديل، ورسالة قبل الترحيل، ومكانها في القوايم وسجل الموديولات",
      "ms": 2.1409,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-04: محرر الجمهور — شرط الحقل المخصص للحقول اللي عليها قيم بس، وبيتحمّل من المتخزّن، وشرط حقل مابقاش متاح بيتشال",
      "ms": 0.5168,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "input check before sending: type, positive value, two decimals for a fixed amount, reason length, target payroll month",
      "ms": 0.2624,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "status badge: «معتمد — بانتظار الصرف» until the ledger entry is consumed by a paid run, then the paid colour; one money formatter with deductions",
      "ms": 0.0956,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "API client: every call goes through apiFetch, bulk submits the preview hash, decisions carry the expected revision",
      "ms": 0.6193,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "workspace (money-requests simplification): one selection list (an employee is a group of one), a team, a department or a branch; «إرسال» previews internally and sends that preview hash; the table appears only when somebody is excluded or refused; catalog behind bonuses.manage",
      "ms": 0.9121,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "money requests (B3/B4): both financial catalog cards open their own form in place, the generic engine refuses them, and the audience gates creating",
      "ms": 4.9134,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "B4: the seeded money types match the live rows — one row each, no approval chain, and an audience limited to the people the owner picks",
      "ms": 1.4403,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "pages: /payroll/bonuses inside MainLayout with the admin workspace, opened prefilled by employee and month from the run row modal’s group link, without the legacy BONUS requests table; /my/bonuses shows the employee his bonuses plus the manager workspace",
      "ms": 3.7854,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "«مكافأة» على صف المسير بتفتح نافذة مكانها: نفس نمط «شيل خصم» و«نقل لمسير آخر»، بلا انتقال لشاشة المكافآت",
      "ms": 1.1571,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "نافذة المكافأة: نفس نقطة الإنشاء الفردي ونفس المعاينة والفحص وبوابة المجموعات — بلا حساب مال ولا نقطة خدمة جديدة",
      "ms": 0.7261,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "نافذة المكافأة: رسالة الخادم العربية على النموذج، وسطر تأكيد باسم سلسلة الاعتماد وشهر المسير — زي نافذتي الخصم والنقل",
      "ms": 1.2736,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل",
      "ms": 0.5533,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
      "ms": 0.8524,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
      "ms": 0.3236,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
      "ms": 0.7542,
      "pass": true,
      "skip": false
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
      "ms": 156.4974,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4954,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2935,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2791,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3633,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2602,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2362,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2694,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2252,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2488,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1899,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_audience_test_a24a4c752e21ba28 is absent from sys.databases.",
    "Cleanup verified: hr_custom_fields_test_7e741a3f56134aed is absent from sys.databases.",
    "Cleanup verified: hr_custom_fields_migration_test_c245fa08ea6f77c2 is absent from sys.databases.",
    "tests 49",
    "suites 0",
    "pass 49",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 51856.8818"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audience_test_a24a4c752e21ba28\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audience_test_a24a4c752e21ba28\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_custom_fields_test_7e741a3f56134aed\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_custom_fields_test_7e741a3f56134aed\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_custom_fields_migration_test_c245fa08ea6f77c2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_custom_fields_migration_test_c245fa08ea6f77c2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
