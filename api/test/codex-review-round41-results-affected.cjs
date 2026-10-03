module.exports = {
  "selected": [
    "payroll-reports",
    "payroll-corrections",
    "fulltest-reports",
    "fulltest-leaves-payroll",
    "overtime-auto-approve-period",
    "payroll-response-leaks",
    "user-branch-scopes",
    "payroll-overtime-request",
    "payroll-bonuses",
    "payroll-typed-deductions",
    "payroll-overview-filters",
    "security-permission-gaps",
    "loan-completion",
    "payroll-allowances",
    "payroll-financial-exemptions",
    "payroll-approval-chain-disbursement",
    "payroll-membership-history",
    "financial-report",
    "cost-center-report",
    "request-execution",
    "leave-contract",
    "fulltest-settings"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 344,
      "failed": 0,
      "passed": 344,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 344,
      "suites": 0
    },
    "duration_ms": 503457.1673
  },
  "results": [
    {
      "file": "payroll-reports.integration.cjs",
      "name": "runs report lists runs without a branch, keeps cancelled runs out of totals, and scopes branch users by member snapshot",
      "ms": 12787.4011,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "detailed payroll reports require payroll.view on top of reports.view",
      "ms": 72.2709,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "unassigned report lists every on-job employee outside a run with a reason, and changes nothing",
      "ms": 567.6511,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "overtime report shows amounts with their source; rejected rows are zero and outside the total",
      "ms": 154.821,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "loans report reconciles paid + remaining = principal, shows installment n of m, aging and after-service balances",
      "ms": 103.4092,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "variance report explains each employee difference by component and isolates unexplained residuals",
      "ms": 65.2045,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "month totals are one number in the payroll month report, the variance report and the financial payroll register",
      "ms": 2091.2252,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "a suspended employee is derived from the suspension periods: real reason, real count, and the checkbox filters",
      "ms": 325.419,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "accepted filters are applied: teamId on the financial reports and branchId on the attendance report",
      "ms": 153.5818,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 15162.1844,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 3729.7615,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 5996.5016,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
      "ms": 7351.059,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
      "ms": 6987.7229,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01 / CR26: إعفاء منقول لتكميلي فيه موظف اتنقل لفرع تاني — مكان النسخة من عضوية التكميلي نفسه، فقارئ ومانح الفرع القديم مايشوفوهاش ولا يلغوها، وسجلات الإعفاء والمسير مابتسمّيهاش",
      "ms": 5854.4681,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR35-B01 / CR35-N01: موانع عكس الصرف بقاعدة رؤية المسير — قسط ترحيل حجزه مسير فرع تاني بعد نقل الموظف بيتقال من غير رقمه ولا حالته لقارئ الفرع في المعاينة والإنشاء واعتماد مسير العكس، والشركة بتشوفه؛ ومسير العكس بيتبع مسيره الأصلي",
      "ms": 3547.8861,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR37-B02: تقرير الإضافي وتقرير «بلا مسير» — مسير صرف إضافي موظف اتنقل لفرع تاني ومرجع تأجيله وآخر مسير ليه من غير رقمهم ولا اسمهم ولا حالتهم ولا فترتهم لقارئ الفرع الجديد، والشركة بتشوفهم",
      "ms": 1867.1765,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR38-B01/B02: موظف اتنقل — قايمة مسيرات «بلا مسير» لقارئ الفرع الجديد زي ما هي (مسيره القديم مايظهرش)، واسم قيده من غير فترة المسير القديم، والشركة بتشوف الكل",
      "ms": 1736.739,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR40-B01/B02: موظف اتعكس صرفه واتنقل — بنود مسيره الجديد في كل شاشة (القسيمة، جدول المسير، سطور الشهر، مراجعة الاعتماد، شاشة المسير، السجل المالي) من غير فترة مسيره القديم لقارئ الفرع الجديد، وبصمة المفتاح مابتتفكّش، والشركة وصاحب القسيمة بيشوفوا النص كامل",
      "ms": 3276.6985,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية",
      "ms": 12198.9052,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق",
      "ms": 8739.3713,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها",
      "ms": 787.4484,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين",
      "ms": 31.7025,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه",
      "ms": 50.0515,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع",
      "ms": 31.9699,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات",
      "ms": 11.1567,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة",
      "ms": 525.9206,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة",
      "ms": 43.9664,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور",
      "ms": 76.3535,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي",
      "ms": 73.3652,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف",
      "ms": 75.8837,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده",
      "ms": 44.6511,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير",
      "ms": 42.2584,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر",
      "ms": 42.3037,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة",
      "ms": 337.0947,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات",
      "ms": 120.5757,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع",
      "ms": 104.7091,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين",
      "ms": 70.2328,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط",
      "ms": 42.4789,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع",
      "ms": 19.4924,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا",
      "ms": 251.3524,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير",
      "ms": 150.3278,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ",
      "ms": 110.0913,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير",
      "ms": 1132.7973,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف",
      "ms": 264.6249,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا",
      "ms": 135.2742,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "ZZ — ملخص التغطية والملاحظات",
      "ms": 0.5129,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 10641.7566,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 833.5384,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 273.3826,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 823.5965,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 608.6753,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 442.9032,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 1049.4719,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 444.7659,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 205.2281,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 50.8516,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 738.2594,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 282.6889,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 211.2217,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 137.8066,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 339.393,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 125.8818,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 22.5035,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 170.4246,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 173.1064,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 1495.5323,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 2114.9901,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 2761.3826,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 573.7726,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 2098.3451,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 1269.4203,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 942.2241,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 1131.2329,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 1131.3918,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 333.9357,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 1056.2448,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 105.9723,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.2129,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 7134.2266,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 710.9006,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1559.3004,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 937.2958,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 840.5409,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 1653.3595,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 542.5265,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 513.2176,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 855.3373,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 488.0509,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.5014,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 1.4371,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1186.5314,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 4342.7687,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 15689.4895,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 104.9881,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 80.9083,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 108.1431,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 258.8631,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 87.7859,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-07: إعادة فتح المسير وإلغاؤه من غير «عرض مسيرات الرواتب» — العملية بتتنفذ والرد حالة المسير بس",
      "ms": 105.9539,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-08: «ضم موظفين للمسير» بصلاحية الحساب من غير «عرض مسيرات الرواتب» — العضوية بتتغير والرد حالة المسير بس",
      "ms": 1047.32,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-09: معاينة عضوية المسير بصلاحية الحساب من غير «عرض مسيرات الرواتب» — الأسماء والتغطية من غير راتب الشهر ولا المستحق",
      "ms": 65.9426,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
      "ms": 9432.8008,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
      "ms": 328.1565,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
      "ms": 280.7839,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
      "ms": 1970.214,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
      "ms": 518.156,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
      "ms": 408.0012,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
      "ms": 372.6885,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
      "ms": 226.5398,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
      "ms": 158.0772,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
      "ms": 245.0799,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
      "ms": 6521.1653,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
      "ms": 942.5805,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
      "ms": 1273.7987,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
      "ms": 686.7041,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
      "ms": 612.8609,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
      "ms": 1211.6156,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
      "ms": 637.6654,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
      "ms": 640.783,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
      "ms": 382.3237,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
      "ms": 492.6178,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
      "ms": 600.5819,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
      "ms": 817.3794,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
      "ms": 1154.7248,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
      "ms": 517.1605,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
      "ms": 926.0492,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
      "ms": 1233.6268,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
      "ms": 1121.7312,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
      "ms": 694.8939,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
      "ms": 796.5066,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
      "ms": 615.8856,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
      "ms": 537.7257,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
      "ms": 1003.256,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
      "ms": 1588.3312,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
      "ms": 1439.6546,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
      "ms": 554.9457,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
      "ms": 931.8584,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
      "ms": 1719.8153,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
      "ms": 859.0348,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
      "ms": 461.3293,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
      "ms": 917.3166,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
      "ms": 1901.9899,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
      "ms": 1602.5536,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 3405.0134,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
      "ms": 1742.2467,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
      "ms": 3438.6554,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
      "ms": 2136.0048,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
      "ms": 790.3007,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1618.3105,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
      "ms": 2800.5971,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
      "ms": 550.5424,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
      "ms": 800.8067,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
      "ms": 963.0269,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
      "ms": 486.5796,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
      "ms": 775.4673,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
      "ms": 1764.0656,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
      "ms": 3369.4713,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
      "ms": 1318.6399,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
      "ms": 795.2455,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
      "ms": 3055.1693,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
      "ms": 1277.608,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
      "ms": 4634.1753,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
      "ms": 2768.5752,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
      "ms": 737.2564,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
      "ms": 2274.9384,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
      "ms": 26.2599,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
      "ms": 2406.6992,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
      "ms": 2518.4487,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 8451.5524,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2625.2721,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 409.6951,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 230.9073,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 70.3767,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1435.9197,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 464.6799,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 180.7516,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 461.4472,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1243.8929,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
      "ms": 346.1646,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
      "ms": 2205.1619,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
      "ms": 1094.1626,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
      "ms": 2202.2064,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 7657.0847,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2515.4768,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 362.4015,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 179.2545,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 370.2457,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 47.7713,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1704.2187,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 160.2047,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 274.7651,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 410.7602,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 423.8556,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 2184.4959,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 41.0777,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 262.1031,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 312.9145,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
      "ms": 6573.8015,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
      "ms": 1550.0603,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
      "ms": 877.5239,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
      "ms": 345.5973,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(هـ) فصل الفروع في شاشات الشهر: مسير كل أعضائه في فرع تاني مايتعرضش لحساب فرع، ومسير شهر لاحق بنفس الاسم برّه نطاقه مايتعدّلش، ورد إلغاء قيد على قد صلاحية القراءة",
      "ms": 1164.1631,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
      "ms": 6130.5847,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
      "ms": 181.7644,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 428.5957,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
      "ms": 121.8657,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 6814.9749,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 397.2023,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 118.3165,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 260.1661,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 60.6343,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 54.0422,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 316.1117,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
      "ms": 425.2638,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR34-B01: دفتر السلفة لقارئ رواتب الفرع — رقم مسير اتعمل للموظف في فرع تاني (قبل نقله) مابيظهرش ولا «#رقمه» في نص الحدث؛ مسير فرعه وحساب الشركة والموظف نفسه بيشوفوه",
      "ms": 146.1011,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز",
      "ms": 5843.5946,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع",
      "ms": 2309.0313,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز",
      "ms": 1136.935,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "بدل على الشركة كلها: حساب الفرع يشوف عدد سطور فرعه بس (مش عدد الشركة)، ومفيش «اتلغى منه» من سطور فروع تانية",
      "ms": 132.8657,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "CR32-B01: مسير فرع تاني للموظف بعد نقله مايظهرش لحساب الفرع في ردود البدل وقايمته، ومسير فرعه بيظهر",
      "ms": 927.3059,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "CR33-B01: رفض إلغاء سطر بدل في مسير فرع تاني معتمد أو مصروف من غير رقم المسير لحساب الفرع، وبالرقم للشركة",
      "ms": 1096.4377,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
      "ms": 8711.8787,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
      "ms": 3280.8544,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
      "ms": 645.71,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
      "ms": 914.9718,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
      "ms": 865.7912,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
      "ms": 1145.6853,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 7456.9614,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 228.3056,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 4822.0637,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 5450.7602,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 1011.3729,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 1022.586,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 595.5434,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 735.2706,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 467.3315,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 155.8573,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-11: the legacy branch calculation creates a replacement after cancellation, while an explicit cancelled runId remains locked",
      "ms": 7445.3346,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: snapshot payslip maps the saved hireDate to joinDate and keeps employee identity and salary from calculation",
      "ms": 672.8693,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: legacy branch payslip never exposes current private data or current salary after an employee transfer",
      "ms": 139.9909,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: an installment-only recalculation appears in changedEmployeeIds while membership and employee salary stay unchanged",
      "ms": 781.8197,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: CUSTOM history with old items but no historical members denies branch access even when every current member is local",
      "ms": 690.496,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا",
      "ms": 6298.9167,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "ملخص التكلفة والخصومات والإضافي من نفس البنود",
      "ms": 35.5972,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير",
      "ms": 60.3035,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 37.2341,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
      "ms": 6633.3034,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 16.1773,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
      "ms": 49.3751,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 5985.7064,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 156.1762,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 207.9068,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 105.644,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 936.6394,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 191.1553,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 80.2375,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 232.6217,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 183.54,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 185.6756,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.5369,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 160.2917,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 55.9025,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 164.2407,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 94.7996,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 42.6712,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 161.4483,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 37.9929,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 180.155,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 86.0186,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 112.5514,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1519.2104,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 249.8947,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 230.2355,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 550.6542,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 67.0089,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 101.6768,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 121.0886,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 219.9891,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 308.5843,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 320.6532,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 67.3811,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 89.2084,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 211.145,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 73.8312,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 164.0455,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 78.7623,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 180.2986,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 99.4846,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 117.6922,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 6295.0678,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 733.7585,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 48.0936,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 188.1999,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 270.4644,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 120.408,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 198.1513,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 168.4177,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 172.1822,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 36.591,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 437.1433,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 182.6737,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 217.3299,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 19.2833,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 89.3014,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "A1 — كتالوج مفاتيح الإعدادات كامل ومقروء (GET /settings/config)",
      "ms": 7772.1214,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "A2 — مفتاح غير مُعلن مرفوض ولا يُخزَّن (لا إنشاء مفاتيح من العميل)",
      "ms": 16.4221,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "A3 — سلطة الكتابة: نطاق الشركة فقط، والموظف العادي ممنوع",
      "ms": 61.207,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "A4 — مفاتيح يقرؤها الخادم ولا تُضبط من الإعدادات (مفاتيح يتيمة)",
      "ms": 91.3084,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B1 — attendance.grace_minutes: السماحية تغيّر التأخير المحسوب",
      "ms": 1408.8519,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B2 — attendance.weekend_days: أيام الراحة تغيّر أيام العمل المحسوبة",
      "ms": 186.4095,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B3 — attendance.device_key: المفتاح يفتح/يقفل استقبال البصمات",
      "ms": 163.1365,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B4 — attendance.holiday_work_multiplier: مضاعف بدل دوام العطلة الافتراضي",
      "ms": 147.5366,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B5 — attendance.flex.*: إعدادات المرونة تُثبَّت في نسخة تعريف الدوام الجديدة",
      "ms": 218.0453,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B6 — attendance.absence_penalty_days / sync_interval_minutes / absence_catchup_max_days",
      "ms": 61.0742,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C1 — overtime.detection_threshold_hours / rounding_minutes: البصمة تُنتج دقائق مختلفة",
      "ms": 544.8657,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C2 — overtime.multiplier_* : مضاعف نوع اليوم يغيّر قيمة الإضافي",
      "ms": 346.2259,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C3 — overtime.enabled / allow_early_overtime / request_backdate_days / max_hours_*",
      "ms": 469.5137,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C3b — مفاتيح «إعداد» مقفولة على قيمة واحدة منفّذة (توثيق لا إعداد)",
      "ms": 6.5312,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C4 — overtime.wage_components: مفتاح توافق — أي قيمة تُعاد لقائمة المكونات الكاملة",
      "ms": 20.8984,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D1 — leave.annual_entitled: استحقاق الموظف الجديد يتبع الإعداد",
      "ms": 334.4597,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D2 — leave.sick_entitled: هل المفتاح مقروء فعلاً؟ (مفتاح ميت مشتبه فيه)",
      "ms": 184.0166,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D3 — leave.max_backdate_days: حد الأثر الرجعي لطلب الإجازة",
      "ms": 195.3424,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D4 — leave.accrual_mode / probation_months / carryover_*",
      "ms": 120.7478,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D5 — أنواع الإجازات: إنشاء وتعديل، والقاعدة تتحكم في الطلب",
      "ms": 127.163,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E1 — payroll.cycle_start_day: يوم بداية الدورة يغيّر مدى فترة المسير",
      "ms": 83.8098,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E2 — payroll.monthly_days / daily_hours / late_deduction_enabled / salary_evidence_mode",
      "ms": 136.2201,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E3 — payroll.shortfall_* و attendance_overlap_policy و attendance_daily_cap_days",
      "ms": 131.7406,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E4 — payroll.policy.*: افتراضات النسخة الجديدة متحقَّق منها ومتصلة",
      "ms": 217.8959,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E5 — system.currency و onboarding.window_days و eos.*",
      "ms": 276.9471,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "F1 — loan.request_open / request_from_day / request_to_day: فتح وقفل طلب السلفة",
      "ms": 279.6812,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "F2 — loan.exceptional_reason_min_length / first_installment_max_months_ahead / insufficient_net_behavior",
      "ms": 78.8784,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "G1 — deductions.*: أقل طول للسبب وحد الدفعة وإنشاء المدير",
      "ms": 233.5622,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "G2 — bonuses.* و financial_exemptions.*",
      "ms": 202.0958,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "H1 — company.*: صيغ ملف الشركة وأثرها على المستندات",
      "ms": 169.0845,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I1 — الفروع: إنشاء وتعديل، وأيام الراحة على مستوى الفرع تغيّر أيام العمل",
      "ms": 155.9889,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I2 — الأقسام والفرق: الهيكل وعزل الفروع",
      "ms": 111.7842,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I3 — الكتالوجات (مسميات/درجات/مراكز تكلفة/أنواع أصول/أنواع إذن): إنشاء وتعديل وسلطة",
      "ms": 350.7493,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I4 — الورديات وجداول العمل: القاعدة تغيّر التأخير وأيام العمل",
      "ms": 548.8349,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I5 — قواعد استثناء أيام العمل: القاعدة تغيّر يوم الراحة إلى دوام",
      "ms": 225.6619,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I6 — العطلات الرسمية: العطلة تغيّر أيام العمل، وحساب الفرع ممنوع",
      "ms": 268.8036,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I7 — المستخدمون والأدوار: الصلاحية الممنوحة تفتح السلوك فعلاً",
      "ms": 266.5875,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I8 — سلاسل الاعتماد وأنواع الطلبات: التعريف يتحكم في مسار الطلب",
      "ms": 212.6811,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I9 — أنواع الخصم والمكافأة (كتالوج): إنشاء وتعديل وسلطة",
      "ms": 57.611,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_payroll_reports_test_8f37944c93455753 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_corrections_test_79d9e4d9c9c3bd12 is absent from sys.databases.",
    "Cleanup verified: hr_reports_test_07a183f1f44d198d is absent from sys.databases.",
    "Cleanup verified: hr_fulltest_payroll_test_38d0d20c8a607a8f is absent from sys.databases.",
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "Cleanup verified: hr_ot_auto_approve_test_27afd89626809770 is absent from sys.databases.",
    "Cleanup verified: hr_payslip_leaks_test_0a59b3913a3a9151 is absent from sys.databases.",
    "Cleanup verified: hr_user_branch_scopes_test_90d1671ad7c6a719 removed.",
    "Manual: (19:20−07:52)=688 − 540 = 148; floor(148/15)×15=135min=2.25h; 9000/30/8×1.5×2.25=126.56.",
    "Manual: 07:00–17:00 = 600 − 540 = 60 ≥ 30 ⇒ 60min=1h; 37.50×1.5×1 = 56.25.",
    "Manual: request180min, evidence135min ⇒ approved135min=2.25h; frozen37.50×1.50×2.25=126.56.",
    "Manual: evidence 135 of the 180 requested minutes ⇒ 2.25h × 37.50 × 1.5 = 126.56, approved by HR at submission.",
    "Cleanup verified: hr_payroll_ot_test_86ecc414f6631679 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_payroll_bonuses_test_03a90efc9729f9a0 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_typed_deductions_test_453b6fa24e3188c9 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_overview_filters_test_f509d0d231476150 is absent from sys.databases.",
    "Cleanup verified: hr_sec1_perm_test_9bb3b2448482fcaa removed.",
    "Cleanup verified: hr_payroll_allowances_test_b1d3599d9cc9c4a6 is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_463d54fffb05c7e2 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_history_test_395b8d6b0345ba43 is absent from sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_financial_report_test_fcfad9b20cb72f12 is absent from sys.databases.",
    "Cleanup verified: hr_cost_center_test_98f2000a0d780cde is absent from sys.databases.",
    "scenarios=39 checks=360 passed=360 failed=0",
    "Cleanup verified: hr_settings_test_11df41211cef39c4 is absent from sys.databases.",
    "tests 344",
    "suites 0",
    "pass 344",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 503457.1673"
  ],
  "stdout": [
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_reports_test_8f37944c93455753\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_reports_test_8f37944c93455753\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_corrections_test_79d9e4d9c9c3bd12\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_corrections_test_79d9e4d9c9c3bd12\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_reports_test_07a183f1f44d198d\"}\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "\n================ تغطية سطح التقارير ================\n",
    "[✗ غير مغطّى] CSV export (deductions) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (loans) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (overtime) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (payroll-cost) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (payroll-register) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✓ مغطّى]    CSV export (مراكز التكلفة) — العناوين العربية والصفوف والإجمالي مقابل أرقام التقرير\n[✓ مغطّى]    GET /attendance/monthly — أيام الموظف ومجاميعه مقابل attendance_days\n[✓ مغطّى]    GET /attendance/payroll-month — حدود شهر الرواتب = حدود المسير\n[✓ مغطّى]    GET /payroll/runs/:id/bank-sheet — السطور والمجاميع وتقسيم نقدي/بنك مقارنة ببنود المسير\n[✓ مغطّى]    GET /payroll/runs/:id/pay-methods — العدد والمبلغ لكل طريقة صرف مقابل بنود المسير\n[✓ مغطّى]    GET /payroll/unassigned-report — يتطابق مع /reports/payroll/unassigned لنفس الفترة\n[✓ مغطّى]    GET /reports/attendance — الأيام والدقائق مقارنة بـattendance_days، والشهر مقابل النطاق\n[✓ مغطّى]    GET /reports/cost-centers — التجميع لكل مركز والإجمالي مقابل بنود المسيرات\n[✓ مغطّى]    GET /reports/financial/deductions (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/deductions — الأنواع والموظفون مقابل أعمدة كشف الرواتب\n[✓ مغطّى]    GET /reports/financial/loans (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/loans — الأصل والمسدد والقائم وأقساط الشهر مقابل جدولي loans و loan_installments\n[✓ مغطّى]    GET /reports/financial/overtime (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/overtime — الدقائق والمبالغ وبدل العطلة مقابل بنود المسير\n[✓ مغطّى]    GET /reports/financial/payroll-cost (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/payroll-cost — التجميع بالفرع والقسم مقابل كشف الرواتب\n[✓ مغطّى]    GET /reports/financial/payroll-register — كل سطر وكل مجموع مقارنة ببنود المسيرات المعتمدة\n[✗ غير مغطّى] GET /reports/financial/payroll-register.csv — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/csv — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/excel — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/export — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/pdf — ترجع 404 — لا نقطة تصدير على الخادم\n[✓ مغطّى]    GET /reports/headcount — الأرقام مقارنة بجدول الموظفين\n[✓ مغطّى]    GET /reports/leaves — الاستهلاك بالنوع والأرصدة مقارنة بجدولي leaves و leave_balances\n[✓ مغطّى]    GET /reports/overtime — الساعات والمبالغ مقابل overtime_entries، والمبلغ محجوب بلا صلاحية الرواتب\n[✓ مغطّى]    GET /reports/payroll — إجمالي كل مسير وطرق الصرف والخصومات مقارنة ببنود المسيرات\n[✓ مغطّى]    GET /reports/payroll/loans — الأصل والمسدد والمتبقي والتقادم والتحصيل المتوقع مقابل صفوف الأقساط\n[✓ مغطّى]    GET /reports/payroll/overtime — كل سجل ومصدر مبلغه والمجاميع مقابل overtime_entries وبنود المسير\n[✓ مغطّى]    GET /reports/payroll/unassigned — الأسباب والملخص، والشهر مقابل نطاق الأيام\n[✓ مغطّى]    GET /reports/payroll/variance — الفروق والأسباب والمجاميع مقابل بنود الشهرين\n[✓ مغطّى]    GET /reports/requests — العدد بالفئة والحالة مقارنة بجدول requests\n[✓ مغطّى]    GET /social-insurance/report — الصفوف والمجاميع وفلتر الفرع — الفرع بلا نظام تأمين يرجع تقريرًا فاضيًا نظيفًا\n",
    "\nسيناريوهات: 27 — تحققات: 395 — ناجحة: 395 — فاشلة: 0\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_reports_test_07a183f1f44d198d\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_fulltest_payroll_test_38d0d20c8a607a8f\"}\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "  [L10] أثر بذرة الرصيد: entitled المحفوظ=21 — المعروض annualEntitlement=21 accruedToDate=15.75 remaining=15.75 (العرض يقرأ استحقاق نوع الإجازة، فالعمود المحفوظ غير مستعمل اليوم)\n",
    "  [P2] وضع المحرك=SHADOW المصروف=LEGACY تكافؤ: {\"employees\":1,\"matched\":0,\"different\":0,\"unavailable\":1,\"error\":0,\"differences\":6} — 6 فرقًا بين محرك السياسة والحساب القديم؛ لكل فرق سبب مسجل، والتحويل إلى POLICY يحتاج سببًا مكتوبًا لكل فرق\n",
    "  [P2] حالة الصف=UNAVAILABLE ظل الحضور=PARTIAL\n        فرق LATENESS (خصم التأخير): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق SHORTFALL (خصم نقص الساعات): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق ABSENCE (خصم الغياب): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق OTHER_DEDUCTIONS (خصومات الدفتر): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق LOANS (أقساط السلف): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق NET (الصافي): قديم=7800.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n",
    "سيناريوهات: 31 — تحققات فاشلة: 0\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_fulltest_payroll_test_38d0d20c8a607a8f\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_27afd89626809770\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_27afd89626809770\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payslip_leaks_test_0a59b3913a3a9151\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payslip_leaks_test_0a59b3913a3a9151\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_branch_scopes_test_90d1671ad7c6a719\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_branch_scopes_test_90d1671ad7c6a719\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_ot_test_86ecc414f6631679\"}\n",
    "# SQL barrier 2 operations: [{\"session_id\":67,\"blocking_session_id\":66,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":68,\"blocking_session_id\":67,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "# SQL barrier 3 operations: [{\"session_id\":64,\"blocking_session_id\":66,\"wait_type\":\"LCK_M_X\",\"depth\":2},{\"session_id\":66,\"blocking_session_id\":68,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":67,\"blocking_session_id\":66,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_ot_test_86ecc414f6631679\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_bonuses_test_03a90efc9729f9a0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_bonuses_test_03a90efc9729f9a0\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_typed_deductions_test_453b6fa24e3188c9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_typed_deductions_test_453b6fa24e3188c9\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_overview_filters_test_f509d0d231476150\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_overview_filters_test_f509d0d231476150\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_sec1_perm_test_9bb3b2448482fcaa\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_sec1_perm_test_9bb3b2448482fcaa\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_completion_test_4f4c32160046d4f1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_completion_test_4f4c32160046d4f1\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_allowances_test_b1d3599d9cc9c4a6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_allowances_test_b1d3599d9cc9c4a6\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_exemptions_test_e193c0fde78b2750\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_exemptions_test_e193c0fde78b2750\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_463d54fffb05c7e2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_463d54fffb05c7e2\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_history_test_395b8d6b0345ba43\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_history_test_395b8d6b0345ba43\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_financial_report_test_fcfad9b20cb72f12\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_financial_report_test_fcfad9b20cb72f12\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_cost_center_test_98f2000a0d780cde\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_cost_center_test_98f2000a0d780cde\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_fe7afd209a5e4a9a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_fe7afd209a5e4a9a\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_8633427cea869dce\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_8633427cea869dce\"}\n",
    "CR41_TRANSPORT private PDF fixture permits dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_settings_test_11df41211cef39c4\"}\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "\n===== FINDINGS =====\n===== COVERAGE =====\nCOVERED   overtime.enabled [behaviour,read,write]\nCOVERED   overtime.biometric_requires_confirmation [dead,read,validate,write]\nCOVERED   overtime.detection_threshold_hours [behaviour,read,validate,write]\nCOVERED   overtime.rounding_minutes [behaviour,read,validate,write]\nCOVERED   overtime.rounding_direction [dead,read,validate,write]\nCOVERED   overtime.request_backdate_days [read,validate,write]\nCOVERED   overtime.max_closed_periods [read,write]\nCOVERED   overtime.max_hours_per_day [behaviour,read,validate,write]\nCOVERED   overtime.max_hours_per_week [read,write]\nCOVERED   overtime.max_hours_per_month [read,write]\nCOVERED   overtime.allow_early_overtime [read,write]\nCOVERED   overtime.missing_punch_policy [dead,read,validate,write]\nCOVERED   overtime.leave_conflict_policy [dead,read,validate,write]\nCOVERED   overtime.wage_components [behaviour,read,write]\nCOVERED   overtime.multiplier_weekday [behaviour,read,validate,write]\nCOVERED   overtime.multiplier_weekend [behaviour,read,write]\nCOVERED   overtime.multiplier_holiday [behaviour,read,write]\nCOVERED   attendance.holiday_work_multiplier [behaviour,read,write]\nCOVERED   attendance.grace_minutes [behaviour,read,validate,write]\nCOVERED   attendance.flex.count_early_work_toward_required [behaviour,read,write]\nCOVERED   attendance.flex.prorate_window_on_partial_leave [read,snapshot]\nCOVERED   attendance.flex.shortfall_grace_minutes [behaviour,read,write]\nCOVERED   attendance.flex.unpaid_break_minutes [behaviour,read,validate,write]\nCOVERED   attendance.flex.max_session_minutes [read,snapshot,write]\nCOVERED   attendance.flex.window_supersedes_grace [read,snapshot]\nCOVERED   attendance.flex.missing_checkout_policy [dead,read,snapshot,write]\nCOVERED   payroll.shortfall_enabled [read,write]\nCOVERED   payroll.daily_accrual_enabled [dead,read,write]\nCOVERED   payroll.daily_accrual_hour [dead,read,write]\nCOVERED   payroll.shortfall_mode [read,validate,write]\nCOVERED   payroll.shortfall_value [read,validate,write]\nCOVERED   payroll.attendance_overlap_policy [read,validate,write]\nCOVERED   payroll.attendance_daily_cap_days [read,validate,write]\nCOVERED   attendance.absence_penalty_days [read,validate,write]\nCOVERED   attendance.weekend_days [behaviour,read,validate,write]\nCOVERED   attendance.sync_interval_minutes [read,write]\nCOVERED   attendance.absence_catchup_max_days [read,validate,write]\nCOVERED   attendance.device_key [behaviour,read,validate,write]\nCOVERED   leave.annual_entitled [authority,behaviour,read,validate,write]\nCOVERED   leave.sick_entitled [behaviour,read,write]\nCOVERED   leave.max_backdate_days [behaviour,read,write]\nCOVERED   leave.accrual_mode [read,validate,write]\nCOVERED   leave.probation_months [behaviour,read,write]\nCOVERED   leave.carryover_max_days [read,write]\nCOVERED   leave.carryover_expiry_months [read,write]\nCOVERED   onboarding.window_days [behaviour,read,write]\nCOVERED   system.currency [read,validate,write]\nCOVERED   system.country [dead,read,write]\nCOVERED   company.name [read,validate,write]\nCOVERED   company.name_en [read,write]\nCOVERED   company.commercial_register [read,write]\nCOVERED   company.address [read,write]\nCOVERED   company.phone [read,write]\nCOVERED   company.logo_file_id [read,write]\nCOVERED   company.commercial_register_expiry [read,validate,write]\nCOVERED   company.vat_number [read,validate,write]\nCOVERED   company.unified_number [read,validate,write]\nCOVERED   company.gosi_establishment_number [read,write]\nCOVERED   company.eg_insurance_establishment_number [read,write]\nCOVERED   company.qiwa_establishment_number [read,write]\nCOVERED   company.national_address_building_no [read,write]\nCOVERED   company.national_address_street [read,write]\nCOVERED   company.national_address_district [read,write]\nCOVERED   company.national_address_city [read,write]\nCOVERED   company.national_address_postal_code [read,validate,write]\nCOVERED   company.national_address_additional_no [read,write]\nCOVERED   company.email [read,validate,write]\nCOVERED   company.website [read,validate,write]\nCOVERED   company.payroll_bank_name [read,write]\nCOVERED   company.payroll_iban [read,validate,write]\nCOVERED   company.wps_establishment_id [read,write]\nCOVERED   eos.months_per_year [read,validate,write]\nCOVERED   eos.tier1_years [read,write]\nCOVERED   eos.months_per_year_after [read,write]\nCOVERED   eos.resignation_factors [read,validate,write]\nCOVERED   eos.reason_factors [read,validate,write]\nCOVERED   payroll.cycle_start_day [behaviour,read,validate,write]\nCOVERED   payroll.monthly_days [dead,read,validate,write]\nCOVERED   payroll.daily_hours [read,validate,write]\nCOVERED   payroll.late_deduction_enabled [read,validate,write]\nCOVERED   payroll.salary_evidence_mode [read,validate,write]\nCOVERED   loan.insufficient_net_behavior [read,validate,write]\nCOVERED   loan.exceptional_reason_min_length [behaviour,read,validate,write]\nCOVERED   loan.first_installment_max_months_ahead [read,validate,write]\nCOVERED   loan.request_from_day [behaviour,read,validate,write]\nCOVERED   loan.request_to_day [behaviour,read,write]\nCOVERED   loan.request_open [behaviour,read,validate,write]\nCOVERED   payroll.policy.default_period_type [read,write]\nCOVERED   payroll.policy.cycle_end_mode [read,write]\nCOVERED   payroll.policy.cycle_end_day [read,validate,write]\nCOVERED   payroll.policy.base_days_basis [read,write]\nCOVERED   payroll.policy.rate_base [read,write]\nCOVERED   payroll.policy.rounding_mode [read,validate,write]\nCOVERED   payroll.policy.rounding_scale [read,validate,write]\nCOVERED   payroll.policy.division_by_zero_mode [read,write]\nCOVERED   payroll.policy.max_deduction_pct_of_gross [read,write]\nCOVERED   payroll.policy.min_net_guarantee [read,validate,write]\nCOVERED   payroll.policy.net_floor_pct [behaviour,read,write]\nCOVERED   payroll.policy.carry_over_excess [read,write]\nCOVERED   payroll.policy.skip_attendance [read,write]\nCOVERED   payroll.early_leave_deduction_enabled [read,write]\nCOVERED   payroll.hourly_rate_basis [dead,read,validate,write]\nCOVERED   payroll.day_rate_basis [dead,read,validate,write]\nCOVERED   payroll.loan_catchup_max_overdue [read,validate,write]\nCOVERED   overtime.default_window [dead,read,validate,write]\nCOVERED   overtime.outside_window_policy [dead,read,validate,write]\nCOVERED   payroll.approval_self_approval_allowed [authority,read,write]\nCOVERED   payroll.exempt_overtime_eligible [read,validate,write]\nCOVERED   payroll.exempt_unpaid_leave_deductible [read,write]\nCOVERED   payroll.exemption_reason_min_length [read,validate,write]\nCOVERED   deductions.reason_min_length [behaviour,read,validate,write]\nCOVERED   deductions.duplicate_window_hours [read,write]\nCOVERED   deductions.bulk_max_employees [read,validate,write]\nCOVERED   deductions.step_sla_hours [read,write]\nCOVERED   deductions.objection_window_days [read,validate,write]\nCOVERED   deductions.max_carry_forward_count [read,write]\nCOVERED   deductions.repeat_deduction_threshold [read,write]\nCOVERED   deductions.manager_creation_enabled [read,validate,write]\nCOVERED   deductions.missing_approver_fallback [read,validate,write]\nCOVERED   deductions.sla_breach_action [read,validate,write]\nCOVERED   deductions.objection_blocks_approval [read,write]\nCOVERED   bonuses.reason_min_length [behaviour,read,validate,write]\nCOVERED   bonuses.duplicate_window_hours [read,write]\nCOVERED   bonuses.bulk_max_employees [read,write]\nCOVERED   bonuses.manager_creation_enabled [read,write]\nCOVERED   bonuses.missing_approver_fallback [read,validate,write]\nCOVERED   financial_exemptions.reason_min_length [read,write]\nCOVERED   financial_exemptions.attachment_threshold_days [read,write]\nCOVERED   financial_exemptions.max_per_employee_year [read,write]\nCOVERED   financial_exemptions.max_pct_per_grantor [read,validate,write]\nCOVERED   financial_exemptions.cooldown_hours [read,validate,write]\nCOVERED   financial_exemptions.repeat_alert_count [read,write]\nCOVERED   financial_exemptions.type_drain_alert_pct [read,write]\nCOVERED   financial_exemptions.department_manager_enabled [read,validate,write]\nCOVERED   auth.two_factor_enabled [read]\nCOVERED   auth.domain_autoprovision_enabled [read]\nEXTRA     evil.injected_key [write]\nEXTRA     settings/leave-types [behaviour]\nEXTRA     branches [behaviour]\nEXTRA     departments [behaviour]\nEXTRA     teams [behaviour]\nEXTRA     catalogs/job-titles [behaviour]\nEXTRA     catalogs/grades [behaviour]\nEXTRA     catalogs/cost-centers [behaviour]\nEXTRA     catalogs/asset-types [behaviour]\nEXTRA     catalogs/permission-types [behaviour]\nEXTRA     catalogs/doc-types [behaviour]\nEXTRA     catalogs/shifts [behaviour]\nEXTRA     catalogs/work-schedules [behaviour]\nEXTRA     attendance/schedule-rules [behaviour]\nEXTRA     catalogs/holidays [behaviour]\nEXTRA     roles [behaviour]\nEXTRA     users [behaviour]\nEXTRA     settings/approval-chains [behaviour]\nEXTRA     settings/request-types [behaviour]\nEXTRA     deductions/types [behaviour]\nEXTRA     bonuses/types [behaviour]\n===== TOTALS: keys=136 covered=136 checks=360 passed=360 failed=0 =====\n\nreport: D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round41-tmp\\hr-settings-findings-1791016112240.txt\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_settings_test_11df41211cef39c4\"}\n"
  ]
}
