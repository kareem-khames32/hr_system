module.exports = {
  "selected": [
    "suspension-paid",
    "leave-entitlement-tiers",
    "banks",
    "payroll-corrections",
    "payroll-reports",
    "employee-export",
    "attendance-payroll-race",
    "employee-suspension",
    "payroll-suspended-archived-settlement",
    "fulltest-employees-attendance",
    "payroll-bonuses",
    "payroll-typed-deductions"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 91,
      "failed": 0,
      "passed": 91,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 91,
      "suites": 0
    },
    "duration_ms": 135421.3711
  },
  "results": [
    {
      "file": "suspension-paid.integration.cjs",
      "name": "PS-01: قبل ترحيل 137 الإيقاف العادي شغال وبيتخصم، و«بأجر» مش متاح وبيترفض؛ والترحيل بيضيف العمود بشكل الكيان وبيتكرر بأمان",
      "ms": 9914.7923,
      "pass": true,
      "skip": false
    },
    {
      "file": "suspension-paid.integration.cjs",
      "name": "PS-02: الإعداد مقفول (الافتراضي) — «بأجر» مش معروض وبيترفض، وكل إيقاف بيتخصم يوم بيوم زي الأول في فرع مصري وسعودي",
      "ms": 1172.4893,
      "pass": true,
      "skip": false
    },
    {
      "file": "suspension-paid.integration.cjs",
      "name": "PS-03: الإعداد مفتوح — إيقاف «بأجر» أيامه موقوفة ومش مخصومة في المسير والتراكم اليومي، والإيقاف العادي جنبه بيتخصم — مصر والسعودية",
      "ms": 2303.5331,
      "pass": true,
      "skip": false
    },
    {
      "file": "suspension-paid.integration.cjs",
      "name": "PS-04: حد مدة الإيقاف بأجر من حزمة دولة الفرع لما صفه «اتأكد» — مصر 60 يوم والسعودية من غير حد؛ و«محتاج تحقق» مايقيّدش",
      "ms": 290.9787,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-01: قبل ترحيل 136 الكود شغال من غير العمودين، والحفظ بقيمة ليهم بيترفض؛ والترحيل بيضيفهم بشكل الكيان وبيتكرر بأمان",
      "ms": 11400.2225,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-02: من غير شرائح الرصيد زي الأول؛ بشرائح الحزمة كل موظف بياخد شريحة دولة فرعه وخدمته وسنّه — مصر والسعودية — وتفضيتها بترجّع أيام النوع",
      "ms": 648.124,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-03: أقصى مرات طول الخدمة — الإجازات المعتمدة والطلبات اللي في المسار بتتعدّ، والتالتة بتترفض؛ ومن غير حد مفيش رفض",
      "ms": 441.1014,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-04: أنواع إجازات حزمة الدولة لفرع — غير مفعّلة وبأرقام الحزمة، لمصر والسعودية، ومابتتكررش، وبنطاق الحساب",
      "ms": 218.2921,
      "pass": true,
      "skip": false
    },
    {
      "file": "banks.integration.cjs",
      "name": "BK-01: قبل ترحيل 138 الشاشة بتقول إن الجدول ناقص وكشف البنك شغال من غير تنبيه؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان",
      "ms": 12945.8835,
      "pass": true,
      "skip": false
    },
    {
      "file": "banks.integration.cjs",
      "name": "BK-02: جدول البنوك — الإضافة والتعديل لحساب بكل الفروع بصلاحية الإعدادات، والدولة والكود فريدين وثابتين، ومفيش مسح",
      "ms": 131.232,
      "pass": true,
      "skip": false
    },
    {
      "file": "banks.integration.cjs",
      "name": "BK-03: كشف البنك وشاشة الصرف — آيبان سليم كوده مش في الجدول متعلّم (السعودي والمصري)، من غير تغيير مبلغ، والتعطيل بيرجّع الدولة من غير تنبيه",
      "ms": 107.7768,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 14276.205,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 2441.2886,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 4222.816,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
      "ms": 3614.473,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
      "ms": 4854.4294,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01 / CR26: إعفاء منقول لتكميلي فيه موظف اتنقل لفرع تاني — مكان النسخة من عضوية التكميلي نفسه، فقارئ ومانح الفرع القديم مايشوفوهاش ولا يلغوها، وسجلات الإعفاء والمسير مابتسمّيهاش",
      "ms": 5401.3442,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR35-B01 / CR35-N01: موانع عكس الصرف بقاعدة رؤية المسير — قسط ترحيل حجزه مسير فرع تاني بعد نقل الموظف بيتقال من غير رقمه ولا حالته لقارئ الفرع في المعاينة والإنشاء واعتماد مسير العكس، والشركة بتشوفه؛ ومسير العكس بيتبع مسيره الأصلي",
      "ms": 2179.8621,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR37-B02: تقرير الإضافي وتقرير «بلا مسير» — مسير صرف إضافي موظف اتنقل لفرع تاني ومرجع تأجيله وآخر مسير ليه من غير رقمهم ولا اسمهم ولا حالتهم ولا فترتهم لقارئ الفرع الجديد، والشركة بتشوفهم",
      "ms": 1124.7431,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR38-B01/B02: موظف اتنقل — قايمة مسيرات «بلا مسير» لقارئ الفرع الجديد زي ما هي (مسيره القديم مايظهرش)، واسم قيده من غير فترة المسير القديم، والشركة بتشوف الكل",
      "ms": 1202.3429,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR40-B01/B02: موظف اتعكس صرفه واتنقل — بنود مسيره الجديد في كل شاشة (القسيمة، جدول المسير، سطور الشهر، مراجعة الاعتماد، شاشة المسير، السجل المالي) من غير فترة مسيره القديم لقارئ الفرع الجديد، وبصمة المفتاح مابتتفكّش، والشركة وصاحب القسيمة بيشوفوا النص كامل",
      "ms": 2484.1351,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR41: كل موظف بفترات مسيراته هو — مسير مختلط اتعكس لموظفين، واحد منهم اتنقل: نص زميله المرئي بيفضل كامل لقارئ الفرع، ورقم موظف في رابط القسيمة مابيغيرش ردها",
      "ms": 2913.2129,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "runs report lists runs without a branch, keeps cancelled runs out of totals, and scopes branch users by member snapshot",
      "ms": 14012.7246,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "detailed payroll reports require payroll.view on top of reports.view",
      "ms": 56.3267,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "unassigned report lists every on-job employee outside a run with a reason, and changes nothing",
      "ms": 419.1202,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "overtime report shows amounts with their source; rejected rows are zero and outside the total",
      "ms": 131.9424,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "loans report reconciles paid + remaining = principal, shows installment n of m, aging and after-service balances",
      "ms": 366.5024,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "variance report explains each employee difference by component and isolates unexplained residuals",
      "ms": 70.8008,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "month totals are one number in the payroll month report, the variance report and the financial payroll register",
      "ms": 1945.7891,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "a suspended employee is derived from the suspension periods: real reason, real count, and the checkbox filters",
      "ms": 393.4278,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "accepted filters are applied: teamId on the financial reports and branchId on the attendance report",
      "ms": 162.1074,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-01: كود البصمة تاني عمود، والأكواد والجوال والهوية نص بأصفارهم، والتواريخ زي ما هي، والأسماء بدل الأرقام",
      "ms": 8425.8809,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-02: من غير payroll.view ولا employees.edit مفيش أي عمود مالي — مش فاضي، مش موجود أصلًا",
      "ms": 34.5844,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-03: نطاق الفرع: موظف فرع تاني مابيطلعش حتى لو رقمه اتبعت، والترتيب زي الشاشة",
      "ms": 105.0425,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-04: من غير employees.view مرفوض، وقائمة فاضية أو أرقام غلط مرفوضة برسالة",
      "ms": 19.4915,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-05: التصدير GET (قراءة بس) ومتعرّف قبل «:id» — مش بيتقري كأنه رقم موظف",
      "ms": 0.4452,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-payroll-race.integration.cjs",
      "name": "approval holding employee-finance wins before a waiting recompute; attendance snapshot and approved OT stay immutable",
      "ms": 10791.7461,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية أو الجواز بأي صيغة وفريدة، ورقم البصمة فريد",
      "ms": 10334.4786,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو «موقوف» بلا تواريخ مرفوض، وتغيير الجنسية مابيعيدش فحص الهوية",
      "ms": 152.4166,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 455.8926,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 421.7747,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 1013.3202,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "CRP2X-N01: تسجيل إيقاف بيتقاطع مع اعتماد طلب بيغيّر ملف نفس الموظف — الإيقاف بيتعاد بعد التقاطع والاتنين بيكمّلوا",
      "ms": 2582.4603,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "CRP2Y-X-N01: تجديد عقد بيتقاطع مع اعتماد طلب بيغيّر ملف نفس الموظف — التجديد بيتعاد بعد التقاطع والاتنين بيكمّلوا",
      "ms": 4984.5281,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-suspended-archived-settlement.integration.cjs",
      "name": "(أ) الموقوف عضو في المسير: أجر أيامه برّه الإيقاف، وأيام الإيقاف بس هي المخصومة",
      "ms": 9705.1438,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-suspended-archived-settlement.integration.cjs",
      "name": "(ب) المؤرشف بآخر يوم عمل موثق يظهر في شهره فقط، وبلا تاريخ يُستبعد بسبب واضح",
      "ms": 609.8346,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-suspended-archived-settlement.integration.cjs",
      "name": "(ج) التصفية = المسير بالظبط، والمسير بيستبعده من المستحق للصرف وكشف البنك",
      "ms": 1865.3214,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ1 — مجموعة بيانات كاملة: كل قيمة أُرسلت ترجع كما هي عند القراءة",
      "ms": 9096.652,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ2 — مصفوفة التحقق عند الإضافة: كل مدخل غلط يُرفض برسالة، والكود المرسل يُتجاهل",
      "ms": 529.89,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ3 — توليد الكود متسلسل بلا فجوات ولا تكرار تحت الإنشاء المتزامن",
      "ms": 511.059,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ4 — عزل الفروع: حساب فرع أ لا ينشئ ولا يقرأ ولا يعدّل موظف فرع ب",
      "ms": 227.6895,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ5 — حدود التعديل والتعيين المستقبلي: التكرار يُرفض، والكود لا يُعدَّل، ولا غياب قبل التعيين",
      "ms": 1398.5373,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب1 — يوم عادي، تأخير، انصراف مبكر، وتأخير مغطى بإذن معتمد (بلا خصم)",
      "ms": 1281.0315,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب2 — غياب بلا طلب، غياب مغطى بإجازة معتمدة، وبصمة ناقصة",
      "ms": 2058.1333,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب3 — الساعة المرنة: النافذة تعفي داخلها، وبعدها التأخير كامل بلا سماحية مُضافة مرتين",
      "ms": 384.2359,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب4 — دوام يوم عطلة: المكتشف من البصمة، وأمر HR يحوّله لبدل دوام العطلات بدل الإضافي ومرة واحدة",
      "ms": 1628.0838,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب5 — يوم داخل فترة إيقاف عن العمل: يُتخطى ولا يُحفظ غيابًا (فلا يُخصم مرتين)",
      "ms": 4584.3332,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب6 — إضافي بطلب معتمد: يُحتسب مرة واحدة، والمعتمد بعد قفل فترته يدخل أول مسير مفتوح بعده بلا تكرار",
      "ms": 3496.5207,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب7 — التقارير والملخص متسقة مع صفوف الأيام، وفلاتر «من/إلى» باليوم تختلف عن فلتر الشهر",
      "ms": 2060.4207,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب8 — فلاتر المدى على سجل الإضافي والكشف، وعزل الفرع في قراءة الحضور",
      "ms": 100.625,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب9 — حواف: غياب مُجسَّد ثم إجازة معتمدة، حد السماحية بالضبط، وبصمة مستقبلية أو خارج الفرع",
      "ms": 4069.5985,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ج1 — موظف عادي (خدمة ذاتية): يشوف حضوره هو بس، ولا يقرأ غيره ولا التقارير",
      "ms": 452.6626,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 10015.3546,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2050.7441,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 368.7932,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 186.0923,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 67.6762,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1372.4462,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 476.2104,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 178.9616,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 431.0739,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1147.5122,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
      "ms": 406.7749,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
      "ms": 1746.4181,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
      "ms": 875.3991,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
      "ms": 1637.78,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 9142.7088,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2105.4992,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 354.0999,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 177.4556,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 304.1786,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 35.3454,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1080.3779,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 160.9458,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 229.4805,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 330.5793,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 356.106,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 1381.7769,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 36.9696,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 266.9816,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 239.2246,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_suspension_paid_test_f3f3462c0123767e is absent from sys.databases.",
    "Cleanup verified: hr_leave_tiers_test_b7086971c5888e69 is absent from sys.databases.",
    "Cleanup verified: hr_banks_test_69aa8facc1caa4ca is absent from sys.databases.",
    "Cleanup verified: hr_payroll_corrections_test_a5363d6bae95804a is absent from sys.databases.",
    "Cleanup verified: hr_payroll_reports_test_7a8e2a41d683ddda is absent from sys.databases.",
    "Cleanup verified: hr_employee_export_test_7116eabb8277c986 is absent from sys.databases.",
    "Cleanup verified: hr_attendance_race_test_b39b9b26cb95af2d removed.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_081d9fb84ac0c3b3 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_settle_test_730774bdeed40195 is absent from sys.databases.",
    "إنشاء بفرع خارج النطاق → HTTP 403، الفرع المحفوظ — (نطاق المستخدم 1، المرسل 2)",
    "إنشاء بفرع خارج النطاق وقسم داخل النطاق → HTTP 403، الفرع المحفوظ —",
    "تاريخ تعيين في المستقبل (2026-12-01) → HTTP 201 \"EMP-0015\"",
    "تاريخ تعيين بعد 100 سنة (2126-01-01) → HTTP 400 \"تاريخ التعيين أبعد من سنة من النهارده — راجع السنة\"",
    "قيد الإضافي بعد اعتماد المسير: status=APPROVED، payrollRunId=— (PAID تتسجّل عند الصرف لا الاعتماد)",
    "مسير الفترة التالية (2026-10) → HTTP 201",
    "Cleanup verified: hr_fulltest_attendance_test_861d07bde5842461 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_bonuses_test_9d43385e5679d21a is absent from sys.databases.",
    "Cleanup verified: hr_payroll_typed_deductions_test_3f0ab21c4a2fd95f is absent from sys.databases.",
    "tests 91",
    "suites 0",
    "pass 91",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 135421.3711"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_suspension_paid_test_f3f3462c0123767e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_suspension_paid_test_f3f3462c0123767e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_b7086971c5888e69\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_b7086971c5888e69\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_banks_test_69aa8facc1caa4ca\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_banks_test_69aa8facc1caa4ca\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_corrections_test_a5363d6bae95804a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_corrections_test_a5363d6bae95804a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_reports_test_7a8e2a41d683ddda\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_reports_test_7a8e2a41d683ddda\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_export_test_7116eabb8277c986\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_export_test_7116eabb8277c986\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_attendance_race_test_b39b9b26cb95af2d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_attendance_race_test_b39b9b26cb95af2d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_suspension_test_081d9fb84ac0c3b3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_suspension_test_081d9fb84ac0c3b3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_settle_test_730774bdeed40195\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_settle_test_730774bdeed40195\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_fulltest_attendance_test_861d07bde5842461\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_fulltest_attendance_test_861d07bde5842461\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_bonuses_test_9d43385e5679d21a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_bonuses_test_9d43385e5679d21a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_typed_deductions_test_3f0ab21c4a2fd95f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_typed_deductions_test_3f0ab21c4a2fd95f\"}\n"
  ]
}
