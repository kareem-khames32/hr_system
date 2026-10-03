module.exports = {
  "selected": [
    "payroll-response-leaks",
    "payroll-financial-exemptions",
    "payroll-corrections",
    "payroll-run-definition",
    "payroll-overview-filters",
    "payroll-policy-publish",
    "payroll-policy-snapshot-engine",
    "payroll-suspended-archived-settlement",
    "payroll-approval-chain-disbursement"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 51,
      "failed": 0,
      "passed": 51,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 51,
      "suites": 0
    },
    "duration_ms": 176464.9265
  },
  "results": [
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 13624.8664,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 98.082,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 94.2091,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 109.7582,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 227.7906,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 85.6071,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-07: إعادة فتح المسير وإلغاؤه من غير «عرض مسيرات الرواتب» — العملية بتتنفذ والرد حالة المسير بس",
      "ms": 105.978,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-08: «ضم موظفين للمسير» بصلاحية الحساب من غير «عرض مسيرات الرواتب» — العضوية بتتغير والرد حالة المسير بس",
      "ms": 1084.6778,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-09: معاينة عضوية المسير بصلاحية الحساب من غير «عرض مسيرات الرواتب» — الأسماء والتغطية من غير راتب الشهر ولا المستحق",
      "ms": 74.6173,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
      "ms": 8601.9476,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
      "ms": 3181.8187,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
      "ms": 601.3897,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
      "ms": 834.5108,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
      "ms": 733.2182,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
      "ms": 1224.9383,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 14660.4926,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 3829.377,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 5421.0268,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
      "ms": 7134.2679,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 16 acceptance: two drafts for the same branch and month under two policy sets, period from the policy cycle, unique name per month, new run separate from recalculation",
      "ms": 9449.1695,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 16 acceptance: membership follows the organisation on the last day; a transferred employee is recorded TRANSFERRED_OUT in the old run",
      "ms": 1866.823,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 16 acceptance: an empty scope is refused unless confirmed with a reason; unknown list ids are refused with the id; exclusions need a reason; filters must be linked",
      "ms": 1375.1944,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 17 acceptance: the membership preview is read-only with codes, coverage, factor and the 30-day basis; an employee in an approved run or with invalid employment data is excluded instead of stopping the run",
      "ms": 4399.2858,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 18 acceptance (payroll simplification): every employee without a run appears in the unassigned report with a reason; acknowledging it stays available as information and never blocks approval",
      "ms": 3905.1628,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Review fixes: a branch-owned policy stays inside its branch; a branch user cannot probe ids of another branch; the recalculation reason has an Arabic code; a draft re-checks its policy when calculated",
      "ms": 2146.2218,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Review fixes: a department/team edit from the employee file (no transfer) does not move the employee in past periods",
      "ms": 255.6603,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "B0.1s-3: معاينة العضوية — صلاحية الحساب من غير عرض الرواتب بتاخدها من غير مبالغ، ومسير برّه نطاق الحساب مايتسمّاش في سبب الاستبعاد",
      "ms": 3950.5598,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
      "ms": 7050.1525,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
      "ms": 1620.3341,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
      "ms": 1039.0294,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
      "ms": 473.5122,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(هـ) فصل الفروع في شاشات الشهر: مسير كل أعضائه في فرع تاني مايتعرضش لحساب فرع، ومسير شهر لاحق بنفس الاسم برّه نطاقه مايتعدّلش، ورد إلغاء قيد على قد صلاحية القراءة",
      "ms": 1368.5484,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "step 21: overlapping tiers are refused on save (nothing written), the legacy table is read-only, and a dated set is validated and hashed",
      "ms": 5556.6428,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "step 21 (أ1): saving one set never deactivates another set, an identical active set is reused, and a new policy inherits the current set",
      "ms": 165.4133,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "steps 19–21 on a real run: 61 minutes × 1.5 on the payslip, SHADOW parity per employee, snapshot keeps absence_penalty_days until an explicit refresh with the shown fingerprint",
      "ms": 3613.9204,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "step 20: a run with differences cannot switch to POLICY until every difference has a written reason; POLICY then pays the engine result",
      "ms": 1630.9515,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "steps 19–20 at approval (payroll simplification): a tampered or missing snapshot is still refused before any write; for SHADOW and LEGACY runs the parity report and its written reasons are information only (POLICY still needs them), so approval attaches null parity fields",
      "ms": 3340.8225,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "work-pressure allowance (owner decision 26 Sep) stays outside the policy engine: SHADOW parity is MATCHED on the six, POLICY pays the same item plus the allowance, and approval passes",
      "ms": 2479.82,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-suspended-archived-settlement.integration.cjs",
      "name": "(أ) الموقوف عضو في المسير: أجر أيامه برّه الإيقاف، وأيام الإيقاف بس هي المخصومة",
      "ms": 8038.9679,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-suspended-archived-settlement.integration.cjs",
      "name": "(ب) المؤرشف بآخر يوم عمل موثق يظهر في شهره فقط، وبلا تاريخ يُستبعد بسبب واضح",
      "ms": 700.6794,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-suspended-archived-settlement.integration.cjs",
      "name": "(ج) التصفية = المسير بالظبط، والمسير بيستبعده من المستحق للصرف وكشف البنك",
      "ms": 5274.4573,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 7853.7119,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 219.1502,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 4954.3082,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 5477.1957,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 1342.8213,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 1296.3978,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 714.0112,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 876.3082,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 545.0137,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 143.3618,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_payslip_leaks_test_6e31520dbc52eeb6 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_corrections_test_519e6456cafa30b8 is absent from sys.databases.",
    "Cleanup verified: hr_run_definition_test_040e2f6cda26d26f is absent from sys.databases.",
    "Cleanup verified: hr_payroll_overview_filters_test_883dd6b5c145ce86 is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_policy_engine_test_9035952a6e41fd18",
    "Cleanup verified: hr_payroll_settle_test_fb9bdcf87a40b96e is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_9f07ae528bd800e6 is absent from sys.databases.",
    "tests 51",
    "suites 0",
    "pass 51",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 176464.9265"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payslip_leaks_test_6e31520dbc52eeb6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payslip_leaks_test_6e31520dbc52eeb6\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_exemptions_test_93121d24b1542b8c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_exemptions_test_93121d24b1542b8c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_corrections_test_519e6456cafa30b8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_corrections_test_519e6456cafa30b8\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_run_definition_test_040e2f6cda26d26f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_run_definition_test_040e2f6cda26d26f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_overview_filters_test_883dd6b5c145ce86\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_overview_filters_test_883dd6b5c145ce86\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policy_engine_test_9035952a6e41fd18\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policy_engine_test_9035952a6e41fd18\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_settle_test_fb9bdcf87a40b96e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_settle_test_fb9bdcf87a40b96e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_9f07ae528bd800e6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_9f07ae528bd800e6\"}\n"
  ]
}
