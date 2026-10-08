module.exports = {
  "target": "fbd2350dea5d6d354ebea1e713e536137b77e2dd",
  "trackedFilesUnchanged": 4799,
  "databasesAbsent": 49,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_expense_reports_test_281d20c41fa1e0bd",
    "hr_expense_reports_test_dab642bec00bb894",
    "hr_expense_reports_test_715c3b948af0a6e2",
    "hr_expense_reports_test_5a35102bb2718a5f",
    "hr_expense_reports_test_13f9c3058a06de1f",
    "hr_expense_reports_test_5195db7d8deeb73d",
    "hr_expense_reports_test_b22f9c6b71ae4399",
    "hr_expense_reports_test_09fcb3708f55f5e7",
    "hr_recovery_test_0cb26aa0ef7cad8e",
    "hr_decision_race_test_c3b12877e1defe4a",
    "hr_category_chains_test_377c8e69c56b2eab",
    "hr_skip_level_test_af16eef6ff7e10c4",
    "hr_administration_level_test_93898245e73109b1",
    "hr_chain_holders_test_646cfa02d59eeb2a",
    "hr_chain_branch_copy_test_049630b9acc1fa36",
    "hr_delegation_test_0ec5ddb214a8af23",
    "hr_delegation_migration_test_f194a9af63d5313e",
    "hr_chain_disburse_test_b186435232d12460",
    "hr_holiday_work_test_1756d27ad7de89cd",
    "hr_recovery_test_59d8a7228397e6b9",
    "hr_leave_attach_test_4a9dd91f2e2cfe7c",
    "hr_leave_tiers_test_af94cb489c02371f",
    "hr_leave_sick_pay_test_7374c6867c3fce51",
    "hr_leave_year_end_test_03a3860c518e9867",
    "hr_swap_consents_test_e537812ee73bf76e",
    "hr_expense_reports_test_df656d9e7587ccea",
    "hr_recovery_test_5527884e91b3294d",
    "hr_decision_race_test_5957b55ec7aeb174",
    "hr_category_chains_test_895a3ca96c2d642f",
    "hr_skip_level_test_6214230ba103da2d",
    "hr_administration_level_test_63a755e89214a6f4",
    "hr_chain_holders_test_7235e28218d8c6e2",
    "hr_chain_branch_copy_test_1e1e1595d1558e8c",
    "hr_delegation_test_967e892475733ec9",
    "hr_delegation_migration_test_06ca935da5b8251e",
    "hr_chain_disburse_test_c8e2fe8e34697dc0",
    "hr_holiday_work_test_01483bfa8293e2bc",
    "hr_recovery_test_d8f54993b10158b9",
    "hr_leave_attach_test_7c88927182195d66",
    "hr_leave_tiers_test_3610c48d9d53abd2",
    "hr_leave_sick_pay_test_adcd2f970d339aa8",
    "hr_leave_year_end_test_ddba74d57e68a8d8",
    "hr_swap_consents_test_7cb522fc56cf5a64",
    "hr_expense_reports_test_24c74c2cfb771cf6",
    "hr_expense_reports_test_fd57534cc147ad56",
    "hr_expense_reports_test_6accc0cceda8c5ab",
    "hr_expense_reports_test_bc6514ae9c55e7b5",
    "hr_recovery_test_6cb732f78577691d",
    "hr_decision_race_test_b9cfaea23414dc92"
  ],
  "results": [
    {
      "file": "codex-review-p5e-results-closure.cjs",
      "counts": {
        "tests": 18,
        "failed": 0,
        "passed": 18,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 18,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p5e-results-readpast.cjs",
      "counts": {
        "tests": 2,
        "failed": 0,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p5e-results-regression-final.cjs",
      "counts": {
        "tests": 178,
        "failed": 0,
        "passed": 178,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 178,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p5e-results-regression.cjs",
      "counts": {
        "tests": 178,
        "failed": 80,
        "passed": 98,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 178,
        "suites": 0
      },
      "failures": [
        {
          "name": "EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'جدول سلف المأموريات ناقص — طبّق ترحيل 152 الأول'\n  ]\n"
        },
        {
          "name": "EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
          "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»",
          "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل",
          "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب",
          "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش",
          "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل",
          "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'مبلغ السلفة موجب بخانتين عشريتين بالكتير (لحد 999999.99)'\n  ]\n"
        },
        {
          "name": "EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد",
          "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    400,\n+   'Validation failed (numeric string is expected)'\n-   'حدود الدرجات قايمة (درجة وحد)'\n  ]\n"
        },
        {
          "name": "EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع",
          "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "EX-13 (Codex P5A-B01): سلسلة فاضية بـ«تنفيذ فوري» مش مراجعة للمبلغ — تقرير المصروفات وسلفة المأمورية مابيتنفذوش من غير اعتماد بشري، والتقديم كله بيرجع",
          "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "EX-14 (Codex P5B-B01): اعتماد جولة قبل الإرجاع مايصرفش مبلغ اتغيّر — إعادة تقديم على سلسلة «تنفيذ فوري» مرفوضة كلها، وبالسلسلة الحقيقية القيد بالمبلغ الجديد بعد اعتماد جديد",
          "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n"
        },
        {
          "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "future title changes wait for their effective date and scheduled execution is idempotent",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
          "error": "Expected values to be strictly equal:\n\n500 !== 400\n"
        },
        {
          "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
          "error": "Expected values to be strictly equal:\n\n500 !== 400\n"
        },
        {
          "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n"
        },
        {
          "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
          "error": "Expected values to be strictly equal:\n\n500 !== 201\n"
        },
        {
          "name": "custody transfer enforces the officer branch and request owner before any write",
          "error": "Expected values to be strictly equal:\n\n500 !== 403\n"
        },
        {
          "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n"
        },
        {
          "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
          "error": "Submission race timed out"
        },
        {
          "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
          "error": "Submission race timed out"
        },
        {
          "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n"
        },
        {
          "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n"
        },
        {
          "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
          "error": "Personal update race timed out"
        },
        {
          "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
          "error": "Approval never reached the gated renderer"
        },
        {
          "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "First decision did not reach its gated read"
        },
        {
          "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
          "error": "Approval never reached the gated renderer"
        },
        {
          "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "First decision did not reach its gated read"
        },
        {
          "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
          "error": "Approval never reached the gated renderer"
        },
        {
          "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "Second decision neither blocked nor reached renderer"
        },
        {
          "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس",
          "error": "The expression evaluated to a falsy value:\n\n  assert.ok(typeInfo(all, 'RC_L1').usageCount >= 4)\n"
        },
        {
          "name": "MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n"
        },
        {
          "name": "MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n"
        },
        {
          "name": "MDM-06b: دايرة أطول في المديرين المسجّلين (3 و4 أشخاص) — «مدير المدير» مرؤوس لمقدّم الطلب، فالتقديم بيقف (CR10-N01)",
          "error": "C3-: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n"
        },
        {
          "name": "MDM-06c: لفّة التدرّج الطبيعية (مدير فرع جوه قسم مديره تحته) مابتتحسبش دايرة — الخطوة بتروح لمدير الفرع",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "AL-05: «مدير الإدارة» — موظف قسم تحت إدارة بيروح لمديرها، وهو بس اللي بيعتمد",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "AL-06: قسم فرعي على مستويين تحت الإدارة — نفس مدير الإدارة",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "AL-07: مدير الإدارة هو مقدّم الطلب — الخطوة بتطلع للإدارة التنفيذية برابطها لفرع تاني، والرئيس بيعتمد من حساب «كل الفروع»",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "AL-08: الإيقاف برسالة بتسمّي الوحدة — مفيش قسم، مفيش إدارة، الإدارة مالهاش مدير، المدير الوحيد هو مقدّم الطلب",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n"
        },
        {
          "name": "AL-09: السرّي مابيتخطّاش «مدير الإدارة» (زي «مدير القسم»)، والدور مش مقبول كجهة تصعيد",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "AL-11: «الإدارة» في بطاقة صاحب الطلب — الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، ومحجوبة مع orgHidden",
          "error": "Cannot read properties of undefined (reading 'id')"
        },
        {
          "name": "BC-01: من غير نسخ — الفرعين على السلسلة العامة",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "BC-02: نسخة للمعادي بنفس الكود: طلب المعادي لمعتمدها، والنصر فاضل على العامة، ونسخة تانية لنفس الفرع مرفوضة",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "BC-03: تعطيل نسخة المعادي يرجّع طلبات المعادي للعامة، وتفعيلها يرجّعها لنسختها",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "BC-04: حساب فرع النصر يعمل نسخة لفرعه بس — مش للمعادي، ونسخة النصر بتاخد طلبات النصر",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        },
        {
          "name": "DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى",
          "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n"
        }
      ]
    },
    {
      "file": "codex-review-p5e-results-runtime-audit.cjs",
      "counts": {
        "tests": 18,
        "failed": 18,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 18,
        "suites": 0
      },
      "failures": [
        {
          "name": "EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
          "error": "failed running before hook"
        },
        {
          "name": "EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
          "error": "failed running before hook"
        },
        {
          "name": "EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»",
          "error": "failed running before hook"
        },
        {
          "name": "EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل",
          "error": "failed running before hook"
        },
        {
          "name": "EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب",
          "error": "failed running before hook"
        },
        {
          "name": "EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش",
          "error": "failed running before hook"
        },
        {
          "name": "EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل",
          "error": "failed running before hook"
        },
        {
          "name": "EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد",
          "error": "failed running before hook"
        },
        {
          "name": "EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد",
          "error": "failed running before hook"
        },
        {
          "name": "EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند",
          "error": "failed running before hook"
        },
        {
          "name": "EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة",
          "error": "failed running before hook"
        },
        {
          "name": "EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع",
          "error": "failed running before hook"
        },
        {
          "name": "EX-13 (Codex P5A-B01): سلسلة فاضية بـ«تنفيذ فوري» مش مراجعة للمبلغ — تقرير المصروفات وسلفة المأمورية مابيتنفذوش من غير اعتماد بشري، والتقديم كله بيرجع",
          "error": "failed running before hook"
        },
        {
          "name": "EX-14 (Codex P5B-B01): اعتماد جولة قبل الإرجاع مايصرفش مبلغ اتغيّر — إعادة تقديم على سلسلة «تنفيذ فوري» مرفوضة كلها، وبالسلسلة الحقيقية القيد بالمبلغ الجديد بعد اعتماد جديد",
          "error": "failed running before hook"
        },
        {
          "name": "P5E-E07: custom expense and travel destinations need approval after each return; retries do not duplicate effects",
          "error": "failed running before hook"
        },
        {
          "name": "P5E-E08: non-HR creator on behalf cannot approve their own creation",
          "error": "failed running before hook"
        },
        {
          "name": "P5E-E11: receipt-bearing expense resubmissions succeed with the full connection pool",
          "error": "failed running before hook"
        },
        {
          "name": "P5E-E12: receipt-free resubmissions succeed under the same barrier and full pool",
          "error": "failed running before hook"
        }
      ]
    },
    {
      "file": "codex-review-p5e-results-runtime-corrected.cjs",
      "counts": {
        "tests": 62,
        "failed": 0,
        "passed": 62,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 62,
        "suites": 0
      },
      "failures": []
    }
  ]
}
