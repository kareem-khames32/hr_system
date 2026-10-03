module.exports = {
  "selected": [
    "payroll-corrections",
    "payroll-run-membership-moves",
    "payroll-financial-exemptions",
    "payroll-response-leaks",
    "payroll-run-definition",
    "codex-review-round26-ui"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 54,
      "failed": 0,
      "passed": 54,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 54,
      "suites": 0
    },
    "duration_ms": 118829.1318
  },
  "results": [
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 15914.5054,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 4037.5628,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 5014.6218,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
      "ms": 6768.0029,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
      "ms": 5658.9403,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01: إعفاء منقول لتكميلي موظف اتنقل لفرع تاني — النسخة بمكانه الجديد، ومانح الإعفاء الأصلي في الفرع القديم مايشوفهاش ولا يلغيها ولا يفتح بيها التكميلي، ورقم التكميلي مايتقالش في سجلاته",
      "ms": 2047.461,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-membership-moves.integration.cjs",
      "name": "(أ) «أضفهم لمسير…» من تبويب بلا مسير: عضوية دائمة، التبويب يفضى، ومسير الشهر الجديد بينسخها",
      "ms": 7871.984,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-membership-moves.integration.cjs",
      "name": "(ب) «نقل لمسير آخر» من شهر مختار ورايح: الشهر المعتمد قبله وبعده ما يتغيرش",
      "ms": 833.0838,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-membership-moves.integration.cjs",
      "name": "(ج) «شيل خصم» لموظف واحد من مسار شاشة المسير: البند يختفي والصافي يزيد بمقداره",
      "ms": 560.393,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-membership-moves.integration.cjs",
      "name": "(د) CR25-B02: امتداد الضم للشهور اللاحقة بحساب فرع — مسير محسوب الحساب مايقدرش يقراه مايتكتبش فيه، والمسودة الفاضية بتعريف جوه نطاقه بتتعدّل",
      "ms": 653.1796,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
      "ms": 8189.2084,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
      "ms": 3010.9186,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
      "ms": 586.7155,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
      "ms": 834.8483,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
      "ms": 787.7559,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
      "ms": 1269.9638,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 13434.3366,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 94.3093,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 92.6138,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 109.4361,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 211.0101,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 93.6696,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-07: إعادة فتح المسير وإلغاؤه من غير «عرض مسيرات الرواتب» — العملية بتتنفذ والرد حالة المسير بس",
      "ms": 100.0947,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-08: «ضم موظفين للمسير» بصلاحية الحساب من غير «عرض مسيرات الرواتب» — العضوية بتتغير والرد حالة المسير بس",
      "ms": 996.6542,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-09: معاينة عضوية المسير بصلاحية الحساب من غير «عرض مسيرات الرواتب» — الأسماء والتغطية من غير راتب الشهر ولا المستحق",
      "ms": 69.3781,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 16 acceptance: two drafts for the same branch and month under two policy sets, period from the policy cycle, unique name per month, new run separate from recalculation",
      "ms": 8464.6016,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 16 acceptance: membership follows the organisation on the last day; a transferred employee is recorded TRANSFERRED_OUT in the old run",
      "ms": 1460.9586,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 16 acceptance: an empty scope is refused unless confirmed with a reason; unknown list ids are refused with the id; exclusions need a reason; filters must be linked",
      "ms": 908.467,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 17 acceptance: the membership preview is read-only with codes, coverage, factor and the 30-day basis; an employee in an approved run or with invalid employment data is excluded instead of stopping the run",
      "ms": 3803.2593,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Step 18 acceptance (payroll simplification): every employee without a run appears in the unassigned report with a reason; acknowledging it stays available as information and never blocks approval",
      "ms": 3713.8524,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Review fixes: a branch-owned policy stays inside its branch; a branch user cannot probe ids of another branch; the recalculation reason has an Arabic code; a draft re-checks its policy when calculated",
      "ms": 2036.0627,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "Review fixes: a department/team edit from the employee file (no transfer) does not move the employee in past periods",
      "ms": 219.0803,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition.integration.cjs",
      "name": "B0.1s-3: معاينة العضوية — صلاحية الحساب من غير عرض الرواتب بتاخدها من غير مبالغ، ومسير برّه نطاق الحساب مايتسمّاش في سبب الاستبعاد",
      "ms": 3166.6228,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "candidates: a branch user lists only his branch (and unassigned), creates into his branch, and cannot edit another branch",
      "ms": 2.3432,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions run screen: a run with no member in the user branch is out of scope (snapshot or legacy branch)",
      "ms": 0.7271,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions service wires the run scope gate into runView and candidates, and filters recalc ids by branch",
      "ms": 0.6614,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a branch-scoped call touches only that branch employees; null keeps the company-wide job",
      "ms": 1.1728,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a multi-branch scope touches exactly those branches",
      "ms": 0.4603,
      "pass": true,
      "skip": false
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "payroll draft calculate / recalculate check the run branch scope before revealing its status",
      "ms": 0.9846,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "النداءات عبر ملف API واحد بمسارات الخادم، ولا fetch مباشر، والمبالغ بالمنسّق الموحد",
      "ms": 1.284,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "اللوحة: الإنشاء يرسل بصمة المعاينة، ومعطل قبل معاينة حالية غير ممنوعة وسبب مستوفٍ، وموانع الخادم تُعرض",
      "ms": 0.698,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "شاشة المسير (تبسيط الرواتب): لوحات العكس والتكميلي ولقطة السياسة ومحرك الحساب و«بلا مسير» والإعفاء المالي لا تُعرض، وملفاتها وأنواع الـAPI باقية",
      "ms": 1.5021,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "القسيمة وقسائمي (تبسيط الرواتب): بلا شريط عكس الصرف ولا قسيمة التكميلي ولا علامتيهما، وسجل المسير (غير المعروض) يبقى يسمي أحداث التصحيح",
      "ms": 0.7837,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "السلف وتقارير الرواتب: القسط المُلغى بعكس الصرف وحركة REVERSAL بتسميات عربية، وتقرير المسيرات (تبسيط الرواتب) بلا مسيرات العكس والتكميلي وسطورها، والـAPI يبقى يسميها",
      "ms": 2.1446,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "تنبيهات الإعفاء عند العكس: إعفاء الحضور يُنقل للتكميلي، و«كل الخصومات» لا يُنقل، والإسقاط أو التأجيل المنفذ يبقى؛ بلا إعفاء لا تنبيه",
      "ms": 0.3892,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "نقل الإعفاء للتكميلي: خصومات الحضور (التأخير والنقص والغياب نوعًا أو يومًا) فقط",
      "ms": 0.0972,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "حالة السلفة عند إعادة فتحها بالعكس: المسجلة في حركة الصرف أولًا، وللحركات القديمة من تاريخ الصرف، والتعارض مانع",
      "ms": 0.1056,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "نوع المسير: null وأي قيمة أخرى = أصلي؛ العكس والتكميلي بأسمائهما العربية",
      "ms": 0.0643,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "سبب التصحيح: 20 حرفًا على الأقل وثلاث كلمات مختلفة، والرفض برمز PAYRUN-CORRECTION-REASON",
      "ms": 0.1235,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "لقطة البند المعكوس: مبالغ بخانتين، والبصمة ثابتة وتتغير بأي مبلغ أو تفصيل",
      "ms": 0.3826,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "تقرير التسويات: المصروف − المعكوس المنفذ = الصافي الفعلي، وفرق التسوية = التكميلي المصروف − المعكوس المنفذ",
      "ms": 0.8965,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "شرط SQL للبند المعكوس: سطر منفذ للمسير والموظف، ويرفض أي تعبير غير عمود أو معامل",
      "ms": 0.2988,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "رصيد الأقساط: الأصل المستحق بعد العكس مع ابن ترحيل مُلغى (REVERSED) صالح بلا رصيد للابن",
      "ms": 0.7649,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "رصيد الأقساط: ترحيل جديد بعد العكس يعيد تفعيل الابن نفسه؛ الابن المُلغى لا يُحتسب ابنًا حيًا، ويُرفض المُلغى بلا أصل أو المدفوع",
      "ms": 0.8211,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_payroll_corrections_test_da6864d0ba8ac49f is absent from sys.databases.",
    "Cleanup verified: hr_payroll_membership_moves_test_21bb485d8c855336 is absent from sys.databases.",
    "Cleanup verified: hr_payslip_leaks_test_02d821d2af087f7b is absent from sys.databases.",
    "Cleanup verified: hr_run_definition_test_9d73f09f1d46ba4d is absent from sys.databases.",
    "tests 54",
    "suites 0",
    "pass 54",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 118829.1318"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_corrections_test_da6864d0ba8ac49f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_corrections_test_da6864d0ba8ac49f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_membership_moves_test_21bb485d8c855336\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_membership_moves_test_21bb485d8c855336\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_exemptions_test_e15cd0ac1ae54e35\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_exemptions_test_e15cd0ac1ae54e35\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payslip_leaks_test_02d821d2af087f7b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payslip_leaks_test_02d821d2af087f7b\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_run_definition_test_9d73f09f1d46ba4d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_run_definition_test_9d73f09f1d46ba4d\"}\n"
  ]
}
