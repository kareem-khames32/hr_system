module.exports = {
  "reviewed": "ecf6163",
  "checkout": "32a20340126b8379993f5c005b8d1bdd624822b7",
  "verdicts": {
    "partA": "approve",
    "partB": "approve"
  },
  "totals": {
    "passed": 189,
    "failed": 0
  },
  "runs": [
    {
      "artifact": "codex-review-p2u-results-closure.cjs",
      "passed": 65,
      "failed": 0,
      "results": [
        {
          "file": "codex-review-p2u-independent.integration.cjs",
          "name": "P2U A: initial draft submission must recheck current employee attributes",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-independent.integration.cjs",
          "name": "P2U B: an initial draft must not bypass a custom audience field that became restricted",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-independent.integration.cjs",
          "name": "P2U A: corrupted stored condition must fail closed on actual catalog and request creation",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-independent.integration.cjs",
          "name": "P2U B: edit-only permission must not commit values then answer forbidden",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-independent.integration.cjs",
          "name": "P2U controls: field hiding, branch boundary, rebinding and unknown keys do not expose or partially save",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-independent.integration.cjs",
          "name": "P2U object-name field control: constructor is accepted through the API and is included among audience-editor options",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-concurrency.integration.cjs",
          "name": "P2U two value saves serialize on employee and retain both distinct keys",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-concurrency.integration.cjs",
          "name": "P2U a transfer holding the employee row forces the waiting writer to recheck branch after lock",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-concurrency.integration.cjs",
          "name": "P2U malformed bundle rolls back deletion and update; field definition audit failure rolls back its change",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-migration-shape.integration.cjs",
          "name": "P2U migration must reject a preexisting ten-column fields table with a wrong required type",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-migration-shape.integration.cjs",
          "name": "P2U migration must reject a same-named unique field index on the wrong column",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-auditor-units.integration.cjs",
          "name": "P2U malformed known condition values must be rejected as a whole by the evaluator",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-auditor-units.integration.cjs",
          "name": "P2U constructor is a valid field key and must not crash the actual audience-editor JSX",
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
          "file": "request-audience-conditions.test.cjs",
          "name": "AC-05: الشرط المتخزّن بيتدقق كله وقت التقييم — التالف مابيتحققش لحد، حتى للي كان هيطابق جزءه السليم",
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
        },
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
          "file": "request-audience-conditions.integration.cjs",
          "name": "AD-04: أول تقديم لمسودة بيتحكم بجمهور النوع دلوقتي — والنيابة زي الإنشاء، والمرجّع للاستكمال بيكمّل، والشرط التالف بيقفل",
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
          "file": "employee-custom-fields.integration.cjs",
          "name": "EF-06: القراءة والحفظ تحت قفل واحد باسم الموظف — قيمة اتحفظت بعد بداية القراءة مابترجعش فيها، واللي مايلاقيش القفل «حاول تاني»",
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
        }
      ]
    },
    {
      "artifact": "codex-review-p2u-results-locks-rc.cjs",
      "passed": 4,
      "failed": 0,
      "results": [
        {
          "file": "codex-review-p2u-lock-consistency.integration.cjs",
          "name": "P2U reader cannot return a value written after restriction; writer waits on real application lock",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-lock-consistency.integration.cjs",
          "name": "P2U reader before branch transfer gets only pre-transfer value; new branch writer waits",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-lock-consistency.integration.cjs",
          "name": "P2U saved response remains inside transaction; transfer blocks until response is built",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-lock-consistency.integration.cjs",
          "name": "P2U concurrent definition update with value save completes without losing either result",
          "pass": true,
          "skip": false
        }
      ]
    },
    {
      "artifact": "codex-review-p2u-results-locks-rcsi.cjs",
      "passed": 7,
      "failed": 0,
      "results": [
        {
          "file": "codex-review-p2u-lock-consistency.integration.cjs",
          "name": "P2U reader cannot return a value written after restriction; writer waits on real application lock",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-lock-consistency.integration.cjs",
          "name": "P2U reader before branch transfer gets only pre-transfer value; new branch writer waits",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-lock-consistency.integration.cjs",
          "name": "P2U saved response remains inside transaction; transfer blocks until response is built",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-lock-consistency.integration.cjs",
          "name": "P2U concurrent definition update with value save completes without losing either result",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-concurrency.integration.cjs",
          "name": "P2U two value saves serialize on employee and retain both distinct keys",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-concurrency.integration.cjs",
          "name": "P2U a transfer holding the employee row forces the waiting writer to recheck branch after lock",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-concurrency.integration.cjs",
          "name": "P2U malformed bundle rolls back deletion and update; field definition audit failure rolls back its change",
          "pass": true,
          "skip": false
        }
      ]
    },
    {
      "artifact": "codex-review-p2u-results-migration-extra.cjs",
      "passed": 3,
      "failed": 0,
      "results": [
        {
          "file": "codex-review-p2u-migration-extra.integration.cjs",
          "name": "P2U migration accepts identical columns in a different physical order and completes missing indexes",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-migration-extra.integration.cjs",
          "name": "P2U bad values table is rejected before creating the missing fields table",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-migration-extra.integration.cjs",
          "name": "P2U disabled unique index is rejected before filling the other missing index",
          "pass": true,
          "skip": false
        }
      ]
    },
    {
      "artifact": "codex-review-p2u-results-draft-controls.cjs",
      "passed": 2,
      "failed": 0,
      "results": [
        {
          "file": "codex-review-p2u-draft-controls.integration.cjs",
          "name": "P2U draft cannot use an unsupported edit route, resubmission or caller-supplied bypass flags to evade first-submission audience",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-draft-controls.integration.cjs",
          "name": "P2U real returned request continues after loss of audience while another never-submitted draft is denied",
          "pass": true,
          "skip": false
        }
      ]
    },
    {
      "artifact": "codex-review-p2u-results-regressions.cjs",
      "passed": 100,
      "failed": 0,
      "results": [
        {
          "file": "request-execution.integration.cjs",
          "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "future title changes wait for their effective date and scheduled execution is idempotent",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "a failure after both shift writes rolls back overrides and audit rows together",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "new handlers reject incompatible request codes instead of silently completing",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "custody transfer enforces the officer branch and request owner before any write",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "forged attachment references are also rejected when saving drafts",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "concurrent cancellation of the same leave restores its balance only once",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-execution.integration.cjs",
          "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-01: من غير أي ربط — كل فئة من غير سلسلة، وكل نوع على سلسلته، والباب المالي «ثابت» بسببه",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-02: ربط الإجازات بسلسلة موجودة ينقل المختارين بس — والتالت بيفضل على سلسلته",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-03: الحضور على نفس سلسلة الإجازات — «مشتركة مع» في الخريطة",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-09: الرفض — سلسلة فرع أو معطّلة أو فاضية، نوع من فئة تانية، الباب المالي، الإضافي على سلسلة بلا معتمدين، وطلب ناقص",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس",
          "pass": true,
          "skip": false
        },
        {
          "file": "request-category-chains.integration.cjs",
          "name": "RC-12: ربط الفئة مايتكتبش من إعدادات النظام العامة، وسلسلة الفئة ماتتنقلش لفرع حتى لو مفيش نوع عليها",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "HTTP catalog upgrades salary fields without changing the stored request catalog",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "HTTP salary payload rejects missing or daily-dated payroll months, numeric money and forged server metadata before creating a draft",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "HTTP final approval writes one payroll-month salary revision with six exact amounts and actual HR actor",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "server-derived ten percent retains executive approval despite forged caller percentage; scope cannot bypass it and only HR authority may push the executive step",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "next-month approved request leaves salary and history unchanged until its payroll cycle starts, then runs once",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "salary source drift rolls back final approval and returning/resubmitting rebuilds the source basis",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "employee branch drift and cross-branch submission cannot change financial data",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "legacy request without a payroll month cannot be approved implicitly and can be returned for explicit monthly resubmission",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "resubmission with owner-configured auto approval records the current actor rather than an older approval",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "concurrent final approval and retry leave one salary revision and one financial audit",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "request execution preserves cents above safe integer range in current salary, history and audit",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "authorized rejection recovers a stale future salary request without reversing money or allowing scheduled execution",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "rejection guard refuses a scheduled-status salary request with any existing financial reference",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "rejection guard also refuses legacy APPROVED salary status when its financial change already exists",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "administrative rejection cannot use request ownership or wildcard permissions to cross the request branch",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "Owner 26-Sep: an increase HR files on behalf is approved and applied at once for the current payroll month, with HR as actor in history, audit and approval evidence",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "Owner 26-Sep: an HR increase above the executive threshold passes every conditional step at once; a next-month one is scheduled with the HR decision and applied when its cycle starts",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "Owner 26-Sep: a salary basis problem refuses the HR instant approval as a whole — no draft, no decision, no money",
          "pass": true,
          "skip": false
        },
        {
          "file": "payroll-salary-request.integration.cjs",
          "name": "salary requests do not create payroll, attendance, overtime, loans or offboarding effects",
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
        }
      ]
    },
    {
      "artifact": "codex-review-p2u-results-decision-race.cjs",
      "passed": 8,
      "failed": 0,
      "results": [
        {
          "file": "codex-review-p2u-decision-race.integration.cjs",
          "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-decision-race.integration.cjs",
          "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-decision-race.integration.cjs",
          "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-decision-race.integration.cjs",
          "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-decision-race.integration.cjs",
          "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-decision-race.integration.cjs",
          "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-decision-race.integration.cjs",
          "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
          "pass": true,
          "skip": false
        },
        {
          "file": "codex-review-p2u-decision-race.integration.cjs",
          "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
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
  "closed": [
    "CRP2T-A-B01",
    "CRP2T-A-B02",
    "CRP2T-B-B01",
    "CRP2T-B-B02",
    "CRP2T-B-B03",
    "CRP2T-B-N01",
    "CRP2T-B-N02"
  ],
  "evidence": [
    "Initial draft audience checked with current requester attributes/custom fields; on-behalf permissions and branch scope rechecked; returned request continues",
    "Edited-draft route absent; client flags cannot bypass submission check and resubmit rejects DRAFT",
    "Known corrupted condition values rejected as a whole",
    "Reader gets only pre-lock values when restriction or branch changes; new writer waits on observed SQL application lock under RC and RCSI",
    "Saved response built before transaction releases employee row; concurrent transfer waits under RC and RCSI",
    "Concurrent writes preserve distinct fields; foreign-branch write refused after row lock; failures roll back and release locks",
    "Migration rejects incompatible columns and indexes before DDL; missing valid indexes completed; reordered columns accepted; replay and schema delta clean",
    "Edit-only write succeeds; constructor editor fragment compiled and rendered successfully"
  ],
  "supersededSetupResults": [
    {
      "artifact": "codex-review-p2u-results-regressions.cjs",
      "files": [
        "codex-review-p2u-draft-controls.integration.cjs"
      ],
      "reason": "New review test initially assumed PATCH draft route exists; controller inspection and HTTP showed absent route. Corrected own test to assert 404 and no mutation, then ran both controls successfully."
    },
    {
      "artifact": "codex-review-p2u-results-regressions.cjs",
      "files": [
        "request-decision-race.integration.cjs"
      ],
      "reason": "Existing fixture database name lacks required _test_ safety marker; guard rejected before CREATE. Re-ran existing P2S copy under new P2U filename with disposable name and instance mail mock; eight assertions unchanged and passed."
    }
  ],
  "limits": [
    "SQL Server 2022 with compatibility 150; native SQL Server 2019 not available",
    "No whole-suite or full browser run; exact edited audience JSX fragment rendered with React",
    "No product or existing-test edits; own test files only",
    "Only own disposable databases; no service starts/stops or ports3000/4000; SQL-only local network; SMTP transporter blocked and fixture instance mail substitutions",
    "No performance verdict based on durations"
  ],
  "decisions": [
    "Unknown conditions fail closed; old who/where behavior and owner/builder/on-behalf exceptions preserved",
    "First submission differs from resubmission of an already returned request",
    "Employee application lock is held on the same connection as reads/writes; old permitted values may finish returning if definition or branch changes during read, never newly written hidden values",
    "Amending unpublished/unapplied migration094 in place is acceptable"
  ]
}
