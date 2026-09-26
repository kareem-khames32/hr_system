module.exports = {
  "selected": [
    "fulltest-employees-attendance",
    "fulltest-leaves-payroll",
    "fulltest-reports",
    "payroll-approval-chain-disbursement",
    "two-factor-race",
    "disbursed-recorded-split",
    "security-permission-gaps",
    "payroll-coverage",
    "payroll-installment-ledger",
    "payroll-settlement-boundary",
    "permission-window",
    "holiday-work",
    "leave-year-end",
    "leave-attachment-with-request",
    "leave-sick-pay-attachment",
    "request-decision-race",
    "attendance-payroll-race",
    "request-execution",
    "financial-report",
    "cost-center-report",
    "employee-export",
    "assets-branch",
    "payroll-bonuses",
    "payroll-typed-deductions",
    "payroll-financial-exemptions",
    "attendance-exemption-workflow",
    "attendance-calendar-history",
    "attendance-calendar-transfer",
    "schedule-range-overtime-periods",
    "approval-chain-branch-copy",
    "payroll-membership-history",
    "employee-bulk-update",
    "org-chart-executive",
    "roles-scope-presets",
    "security-role-grants",
    "codex-review-round2-independent",
    "codex-review-round3-cache-edges",
    "codex-review-round3-portal-batches"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 354,
      "failed": 11,
      "passed": 343,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 354,
      "suites": 0
    },
    "duration_ms": 524605.2331
  },
  "results": [
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ1 — مجموعة بيانات كاملة: كل قيمة أُرسلت ترجع كما هي عند القراءة",
      "ms": 5009.8355,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ2 — مصفوفة التحقق عند الإضافة: كل مدخل غلط يُرفض برسالة، والكود المرسل يُتجاهل",
      "ms": 355.9784,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ3 — توليد الكود متسلسل بلا فجوات ولا تكرار تحت الإنشاء المتزامن",
      "ms": 325.6508,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ4 — عزل الفروع: حساب فرع أ لا ينشئ ولا يقرأ ولا يعدّل موظف فرع ب",
      "ms": 181.0845,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ5 — حدود التعديل والتعيين المستقبلي: التكرار يُرفض، والكود لا يُعدَّل، ولا غياب قبل التعيين",
      "ms": 1156.4691,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب1 — يوم عادي، تأخير، انصراف مبكر، وتأخير مغطى بإذن معتمد (بلا خصم)",
      "ms": 1267.2664,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب2 — غياب بلا طلب، غياب مغطى بإجازة معتمدة، وبصمة ناقصة",
      "ms": 2012.9475,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب3 — الساعة المرنة: النافذة تعفي داخلها، وبعدها التأخير كامل بلا سماحية مُضافة مرتين",
      "ms": 339.3192,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب4 — دوام يوم عطلة: المكتشف من البصمة، وأمر HR يحوّله لبدل دوام العطلات بدل الإضافي ومرة واحدة",
      "ms": 1466.7288,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب5 — يوم داخل فترة إيقاف عن العمل: يُتخطى ولا يُحفظ غيابًا (فلا يُخصم مرتين)",
      "ms": 4011.338,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب6 — إضافي بطلب معتمد: يُحتسب مرة واحدة، والمعتمد بعد قفل فترته يدخل أول مسير مفتوح بعده بلا تكرار",
      "ms": 5158.9593,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب7 — التقارير والملخص متسقة مع صفوف الأيام، وفلاتر «من/إلى» باليوم تختلف عن فلتر الشهر",
      "ms": 1819.1189,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب8 — فلاتر المدى على سجل الإضافي والكشف، وعزل الفرع في قراءة الحضور",
      "ms": 54.9574,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب9 — حواف: غياب مُجسَّد ثم إجازة معتمدة، حد السماحية بالضبط، وبصمة مستقبلية أو خارج الفرع",
      "ms": 3502.1826,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ج1 — موظف عادي (خدمة ذاتية): يشوف حضوره هو بس، ولا يقرأ غيره ولا التقارير",
      "ms": 366.569,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 15087.3802,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 1189.6262,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 336.2498,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 1005.7092,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 614.3661,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 626.496,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 1736.0416,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 690.2288,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 269.2211,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 60.7586,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 979.9178,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 359.3609,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 281.3502,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 156.6593,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 486.3597,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 137.133,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 22.3898,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 275.373,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 221.274,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 1759.6527,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 2231.7126,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 3687.6921,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 765.4422,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 2491.9663,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 1090.7538,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 812.9992,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 1025.4835,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 962.6822,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 307.0889,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 817.9239,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 95.9218,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.1922,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية",
      "ms": 10206.3514,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق",
      "ms": 6745.4111,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها",
      "ms": 741.7517,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين",
      "ms": 29.885,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه",
      "ms": 50.3569,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع",
      "ms": 32.4944,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات",
      "ms": 10.4839,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة",
      "ms": 492.6838,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة",
      "ms": 47.3298,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور",
      "ms": 80.1229,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي",
      "ms": 75.6105,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف",
      "ms": 88.8154,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده",
      "ms": 46.3382,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير",
      "ms": 43.4236,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر",
      "ms": 43.214,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة",
      "ms": 350.8106,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات",
      "ms": 122.1955,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع",
      "ms": 123.3976,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين",
      "ms": 78.0956,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط",
      "ms": 41.8207,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع",
      "ms": 18.9071,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا",
      "ms": 250.7506,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير",
      "ms": 134.2594,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ",
      "ms": 97.8397,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير",
      "ms": 865.9419,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف",
      "ms": 251.0092,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا",
      "ms": 109.0199,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "ZZ — ملخص التغطية والملاحظات",
      "ms": 0.9132,
      "pass": false,
      "error": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "cause": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: 2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\fulltest-reports.integration.cjs:1425:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 7138.0758,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 200.9012,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 4344.5915,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 5504.8332,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 1108.2504,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 1059.3759,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 616.5755,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 774.9534,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 486.0111,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 127.6788,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة",
      "ms": 7626.6705,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض",
      "ms": 842.529,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد",
      "ms": 802.6852,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل",
      "ms": 447.5361,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال",
      "ms": 299.2332,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401",
      "ms": 429.03,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R7 — 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، وإجمالي الرسايل = الحد المعلن",
      "ms": 1418.052,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-01: البند المصروف نقدي يفضل نقدي في الشاشات الأربع بعد ما الملف بقى «تحويل بنكي»، واللي لسه ماتصرفش بيتبع الملف",
      "ms": 6154.3722,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-02: مسير اتصرف كله مرة واحدة بلا علامات بياخد لقطة البند، و«لم يتم» ترجّع الصف لملف الموظف",
      "ms": 163.2227,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-03: القسيمة تقول اللي اتصرف فعلًا — نقدي بعد ما الملف بقى «تحويل بنكي»، وبند بلا علامة يتبع الملف",
      "ms": 146.8713,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-04: التقسيم المثبت وقت الصرف يغلب الملف الحالي ولقطة الحساب في الخمس شاشات، وتعديل الملف بعده مابيغيّرش حاجة",
      "ms": 348.858,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
      "ms": 6099.5374,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
      "ms": 153.9867,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 478.2879,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
      "ms": 87.9033,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03: an inactive employee whose CLOSED last working day is the period end keeps the full salary",
      "ms": 6460.1733,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-103: 18 covered days earn 7200; the 1000 installment stays whole and leaves 6200",
      "ms": 721.0123,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: joining July 1 earns 5133.33 from a 7000 monthly gross without absence",
      "ms": 469.2237,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: one real absent workday deducts 233.33 from prorated pay and leaves 4900",
      "ms": 663.2873,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: an employee who left before the period and one joining after it have no payable line",
      "ms": 511.6418,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: a cancelled offboarding case does not terminate coverage or reduce salary",
      "ms": 459.8684,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: existing lateness/absence before hiring or after the last working day cannot deduct or generate more days",
      "ms": 317.7582,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: the first and last days of the cycle each count as one covered day",
      "ms": 405.3438,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "الشهر 30 يومًا: 18 يومًا مغطى في دورة 31 يومًا تستحق 3600 — التناسب على 30 مثل سعر يوم الخصم",
      "ms": 403.3211,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 31-day cycle pays exactly 6000, with factor one and no extra day",
      "ms": 545.0935,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 28-day cycle pays exactly 6000 without deducting two calendar days",
      "ms": 572.3003,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / الخطوة 14: cycle start 1 uses its calendar month; 29/30/31 start the day after the previous period ends (no shared day)",
      "ms": 6423.7854,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: a SQL save failure preserves the previous run/items/members and leaves no partial new run",
      "ms": 2268.1901,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-01 / PR-02: branch payroll permissions cannot calculate, read, approve, recalculate or pay another branch",
      "ms": 1914.7382,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08: recalculation keeps the stored period dates after the company cycle setting changes",
      "ms": 652.3344,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / PR-11: recalculation cannot change the stored period or scope type and preserves the old snapshot",
      "ms": 557.3451,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: an employee cannot read their calculated draft payslip but can read the same item after approval",
      "ms": 1170.1637,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: half-cent proration is cut down (قرار المالك: خانتين بلا تقريب) and the adjusted components equal the earned gross",
      "ms": 414.9565,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: calculation is a draft, approval reserves, and payment posts exactly 400 with a 1266 child and net 500",
      "ms": 6814.528,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: SKIP reserves the zero deduction action and posts a full deferred child without reducing salary",
      "ms": 925.486,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: full repayment creates no child, cannot be posted twice, and PAID cannot be reopened or cancelled",
      "ms": 1151.25,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: reopening releases the claim with history and reapproval reserves a fresh allocation before one payment",
      "ms": 1172.1324,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: repeated draft calculations and cancellation never reserve or move a loan balance",
      "ms": 1063.1868,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: an amount changed after calculation rejects approval atomically without reserving stale debt",
      "ms": 998.7612,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: a source revision changed after approval rejects payment and preserves the held allocation",
      "ms": 932.0562,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: approval and payment use captured options when live defaults change",
      "ms": 921.2168,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: failure writing the reservation audit rolls back both installment and employee period claims",
      "ms": 1084.07,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: failure writing payment audit rolls back parent, child, allocation and payroll status together",
      "ms": 1049.7777,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: planless legacy amounts and tampered saved plans require recalculation before approval or payment",
      "ms": 1364.9218,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: manual deferral closes the parent and creates one complete future child even when salary can cover it",
      "ms": 1005.2751,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: held claims block manual deferral and early settlement including zero-deduction SKIP",
      "ms": 1075.4879,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: manual deferral rejects stale revision, changed captured amount and invalid reason without moving debt",
      "ms": 517.3215,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: early settlement consumes only the remaining child after partial payroll and retries are idempotent",
      "ms": 997.3967,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: EOS includes a draft source, blocks on approval, then reads only the unpaid child after payroll payment",
      "ms": 1424.885,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: an EOS snapshot becomes stale when a manual deferral replaces its source with a new child ID",
      "ms": 313.4063,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: inconsistent transferred balances fail visibly in payroll and EOS instead of losing the remainder",
      "ms": 836.6056,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: real JWT permissions and branch scope protect run transitions and loan financial reads",
      "ms": 1853.1064,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: concurrent approvals in different payroll periods cannot reserve the same overdue parent twice",
      "ms": 1203.4687,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: each of the four active payroll states excludes exact overtime/installment claims",
      "ms": 5553.0265,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: DRAFT/CANCELLED payroll items do not reserve financial entries",
      "ms": 186.3468,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: malformed historical payroll references reject regeneration and preserve every reviewed line",
      "ms": 160.4358,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a payroll claim created after generation blocks approval without changing reviewed money",
      "ms": 339.1639,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: concurrent approvals settle once, preserve exact references and do not invent payment state",
      "ms": 157.0946,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: changed or deleted linked financial lines require regeneration; manual adjustments remain independent",
      "ms": 278.2436,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: legacy financial settlement without snapshot requires explicit regeneration and keeps permissions",
      "ms": 141.7435,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: payroll after settlement excludes frozen claims and legacy ambiguity is refused",
      "ms": 974.5394,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: renaming a historical automatic settlement line cannot hide pending financial sources",
      "ms": 77.2251,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: cancelling SETTLED legacy with a renamed automatic line cannot release untracked sources",
      "ms": 69.1278,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: all sources claimed by payroll cannot hide ambiguous automatic money behind an empty settlement snapshot",
      "ms": 150.4756,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: historical automatic EOS with no pending financial sources still permits settlement approval",
      "ms": 129.4408,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: simultaneous payroll calculation and settlement approval cannot claim the same sources",
      "ms": 710.1862,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a later offboarding case cannot reclaim sources in an earlier settled snapshot",
      "ms": 163.0328,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن صباحي ساعة (09:00–10:00) ووصول 10:30: الإذن بيغطي الساعة والـ30 دقيقة الباقية تأخير عادي",
      "ms": 5477.1939,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن صباحي ساعتين (09:00–11:00) ووصول 11:00: مفيش تأخير",
      "ms": 223.4234,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن مسائي ساعة (17:00–18:00) وخروج 17:00: مفيش انصراف بدري",
      "ms": 172.6041,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن مسائي ساعة (17:00–18:00) وخروج 16:30: انصراف بدري 30 دقيقة للجزء اللي برا الإذن",
      "ms": 155.4116,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "رصيد ساعتين في الشهر: ساعة + ساعة أو ساعتين مرة واحدة، والزيادة والحد للمرة الواحدة بيترفضوا",
      "ms": 258.0895,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "وقت الإذن لازم يكون صالح: من غير نهاية أو نفس الوقت بيترفض، والنوع بخصم مالوش رصيد دقايق عند التقديم",
      "ms": 125.5478,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 5807.6294,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 5968.2737,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 879.7091,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 134.5469,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 857.4849,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1085.3015,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 4917.7186,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 6894.2788,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 102.0237,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 187.9887,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 268.2592,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 92.4136,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل",
      "ms": 7310.6689,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع",
      "ms": 269.9154,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف",
      "ms": 401.4481,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط",
      "ms": 411.142,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب",
      "ms": 465.5558,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll",
      "ms": 6489.7579,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: days 31-40 of the year at 75% deduct 750 as their own line; an isUnpaid sick day is not charged twice",
      "ms": 944.1138,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: crossing day 90 splits into 75% and 0% lines; fully paid sick days add nothing",
      "ms": 1162.9985,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 28763.1658,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.4226,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0494,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0365,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0436,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0431,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0287,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.024,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "attendance-payroll-race.integration.cjs",
      "name": "approval holding employee-finance wins before a waiting recompute; attendance snapshot and approved OT stay immutable",
      "ms": 5750.6795,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 5730.8662,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 110.9428,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 147.7586,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 80.5599,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 782.4926,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 135.8788,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 63.7498,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 221.7219,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 149.8382,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 155.0967,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.5041,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 146.9968,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 50.3471,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 137.1367,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 99.6653,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 45.0215,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 171.5407,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 37.1082,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 155.6946,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 77.1014,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 90.1064,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1132.2203,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 240.4472,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 212.5769,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 477.0658,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 61.3798,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 101.9279,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 88.1166,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 150.2978,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 228.3042,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 256.371,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 50.3054,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 53.5806,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 166.8212,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 64.3239,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 140.8889,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 93.1195,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 195.8417,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 81.9895,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 91.3149,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا",
      "ms": 5307.2346,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "ملخص التكلفة والخصومات والإضافي من نفس البنود",
      "ms": 36.4937,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير",
      "ms": 59.1646,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 33.7428,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
      "ms": 5119.889,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 12.5077,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
      "ms": 45.516,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-01: كود البصمة تاني عمود، والأكواد والجوال والهوية نص بأصفارهم، والتواريخ زي ما هي، والأسماء بدل الأرقام",
      "ms": 4811.1268,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-02: من غير payroll.view ولا employees.edit مفيش أي عمود مالي — مش فاضي، مش موجود أصلًا",
      "ms": 17.7281,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-03: نطاق الفرع: موظف فرع تاني مابيطلعش حتى لو رقمه اتبعت، والترتيب زي الشاشة",
      "ms": 58.8698,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-04: من غير employees.view مرفوض، وقائمة فاضية أو أرقام غلط مرفوضة برسالة",
      "ms": 31.065,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-05: التصدير GET (قراءة بس) ومتعرّف قبل «:id» — مش بيتقري كأنه رقم موظف",
      "ms": 0.4033,
      "pass": true,
      "skip": false
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "M1 — ترحيل 065: إضافي، بيعبّي فرع الأصل المُسنَد من حامله الحالي بس، آمن للتكرار، وفرق المخطط مع الكيان صفر",
      "ms": 5977.8444,
      "pass": true,
      "skip": false
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "A1 — الأصل الجديد بيتختم بفرع اللي أضافه، وحساب الفرع يشوف ويعدّل أصول فرعه بس، وأصل الفرع التاني = نفس رد الغايب",
      "ms": 205.8431,
      "pass": true,
      "skip": false
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "A2 — تحديد فرع الأصل: فردي ودفعة، لحساب نطاقه كل الفروع بس، وأصل في عهدة مايتنقلش لفرع غير فرع صاحبها",
      "ms": 185.5485,
      "pass": true,
      "skip": false
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C1 — دورة العهدة كاملة جوه الفرع: تسليم → استلام → اعتماد المدير → نقل → تسليم → إرجاع، والأصل فاضل في فرعه",
      "ms": 236.8112,
      "pass": true,
      "skip": false
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C2 — العهدة بين فرعين مرفوضة، وعهدة الفرع التاني = نفس رد الإسناد الغايب في كل إجراء",
      "ms": 334.5808,
      "pass": true,
      "skip": false
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C3 — نقل عهدة بين فرعين: من حساب نطاقه كل الفروع بس (مش بالدور)، والأصل بيتنقل لفرع المستلم لحظة اعتماد مديره",
      "ms": 170.7649,
      "pass": true,
      "skip": false
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C4 — الأصل القديم اللي بلا فرع: عهدته القائمة بتكمّل في فرع موظفها، وبيتختم بفرع حامله عند التنشيط وعند الإرجاع",
      "ms": 100.7799,
      "pass": true,
      "skip": false
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C5 — طلب العهدة (خدمة ذاتية): أصل فرع تاني أو أصل بلا فرع = نفس رد الأصل الغايب برقمه، وأصل الفرع يتقدّم عادي",
      "ms": 1439.3175,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 6481.1366,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2273.8363,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 380.1654,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 186.9137,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 74.7207,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1125.8417,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 159.4978,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 6408.508,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2167.3983,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 293.3631,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 155.061,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 338.3738,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 46.1817,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1337.8075,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 138.0948,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 229.2119,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 317.0739,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 374.7047,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 1661.2656,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 40.9343,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 310.8522,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 197.771,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
      "ms": 8641.3493,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
      "ms": 5654.4586,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
      "ms": 847.8872,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09: creation requires authentication, explicit permission and the employee branch",
      "ms": 5369.873,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09: the HTTP whitelist blocks mass assignment of approval, actor and termination fields; drafts stay inactive",
      "ms": 49.5045,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09: an ordinary window activates only after HR approval and mine exposes only that employee approved windows",
      "ms": 174.0738,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-16: executive exemption needs HR then a separately authorized executive step, with immutable intermediate history",
      "ms": 183.727,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09: two overlapping pending approvals race to one approved window and one atomic 409",
      "ms": 118.0692,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: termination preserves approved history through today and restores ordinary attendance from tomorrow",
      "ms": 175.2692,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-09/16: cancelling a pending decision retains its records and events and never activates the window",
      "ms": 100.9741,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: approved or paid payroll blocks a new overlapping exemption without any partial window or audit record",
      "ms": 119.276,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: a payroll approved after draft creation blocks exemption approval and termination atomically",
      "ms": 151.1829,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13/16: invalid dates, earlier cycles, reversed ranges and reasons leave no records",
      "ms": 175.9949,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: a new exemption approved after calculation blocks stale payroll approval without claims/events until explicit recalculation",
      "ms": 1242.9035,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "EX-13: termination after coverage and later organization defaults preserve a calculated payroll decision",
      "ms": 636.3184,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 SoD: a creator without HR-manager authority never approves or rejects its own request, even with approval rights",
      "ms": 92.0546,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 SoD: the HR approver of an executive exemption cannot take or reject the executive step; another user completes it",
      "ms": 172.7636,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 reject: another approver rejects with a reason; the window never activates, stays auditable and cannot be decided again",
      "ms": 203.7894,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 overlap: a second overlapping pending request is refused atomically; adjacent, other-employee and post-cancel requests are allowed",
      "ms": 145.2623,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 dates: a pending request created in the previous cycle stays approvable after a new cycle starts; the previous cycle (paid next month) is accepted, anything older stays refused",
      "ms": 131.6383,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 screen API: the scoped list returns names, state and per-user actions and honours the branch scope",
      "ms": 172.1987,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "S24 acceptance: an employee without punches has no attendance deduction on a real payroll run after request and approval by two different users",
      "ms": 839.7965,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "Owner 26-Sep: an HR manager holding the approve permission creates the exemption already approved by himself — creation reason, instant event, window effective at once",
      "ms": 62.0528,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "Owner 26-Sep: an executive-reason exemption by an HR manager without the executive permission gets the HR step at once and waits for the executive step only; super_admin approves both at once",
      "ms": 129.1638,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "Owner 26-Sep: the old separation still binds non-HR creators and the HR manager in his own exemption; the HR manager now decides the legacy pending request he created",
      "ms": 224.7884,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-exemption-workflow.integration.cjs",
      "name": "SoD self: an approver never decides an exemption on himself even when another user created it",
      "ms": 76.4762,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "calendar metadata enforces source identity, read permission and branch scope; global contents contain no branch rules",
      "ms": 5131.4649,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "explicit first confirmation proves only its dated interval and never infers history from joinDate",
      "ms": 261.2254,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "calendar changes require date, reason and current CAS, even for create/delete/toggle",
      "ms": 96.9151,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "holiday create and dated removal retain the old holiday period and public holiday wins over work exception",
      "ms": 456.8296,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "future global weekends change only future day kinds and rejects back-insertion into its complete snapshot timeline",
      "ms": 162.6939,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "two concurrent calendar writes allow one committed scope version without lost update",
      "ms": 55.2317,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "branch users cannot change global calendars or foreign branch calendars; branch-only rule does not leak",
      "ms": 106.4607,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "dated employee branch changes preserve past organization and require source CAS; future profile move is rejected",
      "ms": 266.7105,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "noncalendar profile and branch edits preserve money and do not create calendar revisions",
      "ms": 211.3276,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "current source drift and tampered immutable history fail closed and never manufacture a new baseline",
      "ms": 89.6474,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "failed calendar append rolls back source mutation atomically",
      "ms": 94.4007,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "new branch has an observed creation-date calendar and never backfills its historical configuration",
      "ms": 59.5359,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "approved and paid payroll memberships block calendar rewrites with no payroll or source mutation",
      "ms": 362.4229,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "a settled service also blocks retrospective calendar changes before its final working day",
      "ms": 107.2224,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "employee creation records only the observed creation date when no explicit calendar date was supplied",
      "ms": 136.0079,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "an explicit creation calendar date records both branch and schedule without deriving either from joinDate",
      "ms": 111.2313,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "candidate hiring supplies the real actor to employee calendar creation and enforces target branch scope",
      "ms": 134.2593,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a transfer the administrator files on behalf is approved at once and stores the dated branch and its actual approver while past computeDay retains the historical branch",
      "ms": 5572.22,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a future transfer approved at once changes no employee or org version before its date and concurrent scheduler runs apply it once with the instant approver",
      "ms": 202.7095,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "owner-configured automatic transfer records an explicit automatic decision used by scheduled org history",
      "ms": 180.4195,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a financially closed day rolls back transfer, employee, account and approval together — at instant approval and at a pending decision alike",
      "ms": 486.9446,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "cross-branch creator and approver cannot bypass scope to move the employee or append org history",
      "ms": 142.5961,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "إسناد شهر كامل لموظفي الفرع: الأسابيع الكاملة وردية أسبوع، والأطراف أيام خاصة، وموظف الفرع التاني يتخطى",
      "ms": 5758.9364,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "إعادة الإسناد: الأيام الخاصة جوه المدة تتشال افتراضيًا وتفضل مع keepDayOverrides",
      "ms": 150.3143,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "أيام معينة بس (السبت): أيام خاصة على السبوت، ومفيش وردية أسبوع، وباقي الأيام زي ما هي",
      "ms": 352.6738,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "التحقق: تواريخ غلط وأيام غلط وقائمة فاضية ونطاق الفرع ووردية فرع تاني",
      "ms": 78.6723,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "أيام الحضور اللي فاتت تتحسب تاني بالوردية الجديدة",
      "ms": 407.8269,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "فترات الإضافي: المقفولة توقف الحساب والمفتوحة تسمح بيه، والنطاق محمي",
      "ms": 829.6135,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "إسناد لمدة بالفرق: أعضاء الفريق الشغالين بس، وحساب الفرع مايوصلش لفريق فرع تاني",
      "ms": 203.9678,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-01: من غير نسخ — الفرعين على السلسلة العامة",
      "ms": 6040.3097,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-02: نسخة للمعادي بنفس الكود: طلب المعادي لمعتمدها، والنصر فاضل على العامة، ونسخة تانية لنفس الفرع مرفوضة",
      "ms": 145.6415,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-03: تعطيل نسخة المعادي يرجّع طلبات المعادي للعامة، وتفعيلها يرجّعها لنسختها",
      "ms": 170.0037,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-04: حساب فرع النصر يعمل نسخة لفرعه بس — مش للمعادي، ونسخة النصر بتاخد طلبات النصر",
      "ms": 137.511,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-05: الشاشة: «نسخة خاصة بفرع» شغالة بنفس الكود مقفول، والفروع اللي مالهاش نسخة بس",
      "ms": 0.8779,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-11: the legacy branch calculation creates a replacement after cancellation, while an explicit cancelled runId remains locked",
      "ms": 8191.5651,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: snapshot payslip maps the saved hireDate to joinDate and keeps employee identity and salary from calculation",
      "ms": 697.5389,
      "pass": false,
      "error": "Payslip leaked the current employee nationalId",
      "cause": "Payslip leaked the current employee nationalId",
      "stack": "AssertionError [ERR_ASSERTION]: Payslip leaked the current employee nationalId\n    at assertNoCurrentPrivateValues (D:\\projects\\hr_system\\api\\test\\payroll-membership-history.integration.cjs:83:12)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-membership-history.integration.cjs:191:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: legacy branch payslip never exposes current private data or current salary after an employee transfer",
      "ms": 111.7644,
      "pass": false,
      "error": "Payslip leaked the current employee nationalId",
      "cause": "Payslip leaked the current employee nationalId",
      "stack": "AssertionError [ERR_ASSERTION]: Payslip leaked the current employee nationalId\n    at assertNoCurrentPrivateValues (D:\\projects\\hr_system\\api\\test\\payroll-membership-history.integration.cjs:83:12)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-membership-history.integration.cjs:211:5)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: an installment-only recalculation appears in changedEmployeeIds while membership and employee salary stay unchanged",
      "ms": 762.8071,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: CUSTOM history with old items but no historical members denies branch access even when every current member is local",
      "ms": 663.6046,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "القالب: CSV بعناوين الحقول المختارة ومملي بموظفين النطاق بس، وأعمدة الراتب محتاجة اعتماد المسير",
      "ms": 4856.975,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "المعاينة مابتحفظش: التغيير القديم ← الجديد والأخطاء، وقاعدة البيانات زي ما هي",
      "ms": 23.0473,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "تغيير الراتب من الملف: مراجعة جديدة في سجل الأجر المؤرخ + سجل تغييرات، والسبب والمرجع إجباريين",
      "ms": 152.5739,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "رقم بصمة مكرر مرفوض (مع موظف تاني أو صفين في الملف)، والصفوف السليمة بتتحفظ",
      "ms": 115.0913,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "عزل الفرع: موظف فرع تاني صف خطأ، والنقل لفرع تاني مرفوض لحساب الفرع",
      "ms": 34.1035,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "نقل الفرع من الملف: بتاريخ سريان وسبب، يتسجل في سجل فرع الموظف وسجل التغييرات",
      "ms": 105.1185,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "Excel: القالب المملي يتنزل ويتعدل ويترفع، والتطبيق على دفعات بأرقام الصفوف",
      "ms": 196.2985,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-executive.integration.cjs",
      "name": "الإدارة التنفيذية: قسم واحد في الشركة، والسكرتير معاها بس ومش هو الرئيس التنفيذي",
      "ms": 4902.7297,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-executive.integration.cjs",
      "name": "حساب الفرع: مايغيّرش الإدارة التنفيذية، بيعدّل باقي القسم عادي، ومايشوفش أقسام فرع تاني",
      "ms": 69.3262,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N02A bulk pay must preserve the payment method used immediately before payment",
      "ms": 4881.5085,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N02B bulk mixed payment must freeze its bank/cash amounts after payment",
      "ms": 1047.8844,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N01 self and branch users cannot enumerate foreign/missing monthly or working-day records",
      "ms": 54.9147,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E1 night crosses month and dated shift revision inside one accrual batch",
      "ms": 4166.4496,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E2 actual dated branch transfer and branch holiday/weekend resolved for each day of same batch",
      "ms": 258.2695,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E3 exemption ranges remain exact; overlap outside day does not poison cache, overlap inside day fails both paths",
      "ms": 139.8438,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E4 reference cache ends with batch; punches remain live; changed source visible in next transaction",
      "ms": 101.0965,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E5 dated holiday removal and branch weekend revision inside range survive batch memoization",
      "ms": 869.4013,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-cache-edges.integration.cjs",
      "name": "CR3-E6 supplied shadow UTC date filtering can omit first local SQL DATE; independent oracle covers all dates",
      "ms": 1.7369,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-portal-batches.integration.cjs",
      "name": "CR3 portal extra changed call site saves 500 notification read states then updates them atomically",
      "ms": 4240.6703,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round3-portal-batches.integration.cjs",
      "name": "CR3 portal late-batch SQL constraint failure plus automatic retry leaves no partial notification rows",
      "ms": 483.0725,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "ZZ — ملخص التغطية والملاحظات",
      "ms": 0.9132,
      "pass": false,
      "error": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "cause": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: 2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\fulltest-reports.integration.cjs:1425:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 28763.1658,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.4226,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0494,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0365,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0436,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0431,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0287,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.024,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_cbdce9ac8f56d8d5'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: snapshot payslip maps the saved hireDate to joinDate and keeps employee identity and salary from calculation",
      "ms": 697.5389,
      "pass": false,
      "error": "Payslip leaked the current employee nationalId",
      "cause": "Payslip leaked the current employee nationalId",
      "stack": "AssertionError [ERR_ASSERTION]: Payslip leaked the current employee nationalId\n    at assertNoCurrentPrivateValues (D:\\projects\\hr_system\\api\\test\\payroll-membership-history.integration.cjs:83:12)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-membership-history.integration.cjs:191:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: legacy branch payslip never exposes current private data or current salary after an employee transfer",
      "ms": 111.7644,
      "pass": false,
      "error": "Payslip leaked the current employee nationalId",
      "cause": "Payslip leaked the current employee nationalId",
      "stack": "AssertionError [ERR_ASSERTION]: Payslip leaked the current employee nationalId\n    at assertNoCurrentPrivateValues (D:\\projects\\hr_system\\api\\test\\payroll-membership-history.integration.cjs:83:12)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-membership-history.integration.cjs:211:5)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "إنشاء بفرع خارج النطاق → HTTP 403، الفرع المحفوظ — (نطاق المستخدم 1، المرسل 2)",
    "إنشاء بفرع خارج النطاق وقسم داخل النطاق → HTTP 403، الفرع المحفوظ —",
    "تاريخ تعيين في المستقبل (2026-12-01) → HTTP 201 \"EMP-0015\"",
    "تاريخ تعيين بعد 100 سنة (2126-01-01) → HTTP 400 \"تاريخ التعيين أبعد من سنة من النهارده — راجع السنة\"",
    "قيد الإضافي بعد اعتماد المسير: status=APPROVED، payrollRunId=— (PAID تتسجّل عند الصرف لا الاعتماد)",
    "مسير الفترة التالية (2026-10) → HTTP 201",
    "Cleanup verified: hr_fulltest_attendance_test_7703a87984c3cbd0 is absent from sys.databases.",
    "Cleanup verified: hr_fulltest_payroll_test_90afc90bcacd39cb is absent from sys.databases.",
    "Cleanup verified: hr_reports_test_c72ff9e290c4986b is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_3705d1d6fe5c6502 is absent from sys.databases.",
    "{\"rejected\":12,\"attempts\":5,\"locked\":true,\"consumed\":false}",
    "{\"statuses\":[401,401,401,401,401,401,401,401,401,401,401,401],\"attempts\":5,\"locked\":true}",
    "{\"oldConsumeGuardMatches\":1,\"newConsumeGuardMatches\":0}",
    "{\"oldCodeStatus\":401}",
    "{\"statuses\":[200,401,401,401,401,401]}",
    "{\"statuses\":[429,429,429,200,429,429,429,429],\"mails\":1,\"resendCount\":1,\"waitedSeconds\":120,\"messages\":[\"استنى 60 ثانية قبل طلب رمز جديد\"]}",
    "{\"statuses\":[429,429,429,429,429,429,429,429],\"resendCount\":3,\"mails\":3}",
    "Cleanup verified: hr_2fa_race_test_6591845bface8b54 is absent from sys.databases.",
    "Cleanup verified: hr_recorded_split_test_d7ab3eaa6d54f0bc is absent from sys.databases.",
    "Cleanup verified: hr_sec1_perm_test_0c524662125c99ef removed.",
    "Manual: 12000 × 18 / 30 = 7200; 7200 − 1000 = 6200.",
    "Manual: (6000 + 800 + 200) × 22 / 30 = 5133.33; daily deduction basis remains 7000 / 30.",
    "Manual: 5133.33 − ROUND(7000 / 30, 2) = 4900.00; do not derive day rate from the prorated gross.",
    "قرار المالك (16 سبتمبر): الشهر 30 يومًا في كل شيء — 6000 × 18 / 30 = 3600.",
    "12 explicit cycle-boundary cases checked through POST calculation and persisted GET detail.",
    "Manual half-cent cases (قص بلا تقريب): 30.15 × 3/30 = 3.015 → 3.01؛ (10.15 × 3) × 3/30 = 3.045 → 3.04؛ القروش والإجمالي متطابقين.",
    "Cleanup verified: hr_payroll_coverage_test_f097cc4ebe4639e2 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "SQL barrier observed: [{\"session_id\":54,\"blocking_session_id\":53,\"wait_type\":\"LCK_M_X\"}]",
    "Cleanup verified: hr_payroll_installment_ledger_test_cc62b476121cf6c6 is absent from sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Temporary settlement database removed and absence verified.",
    "Cleanup verified: hr_permission_window_test_186b69d0ab9cc27a removed.",
    "Cleanup verified: hr_holiday_work_test_e39cd080cd80b147 is absent from sys.databases.",
    "Cleanup: hr_leave_year_end_test_ca1f67fc519f118b dropped.",
    "المرفق المطلوب مع الطلب: رفض بلا ملف، قبول معه، ونفس الحقل في الطلب وسجل الإجازة.",
    "مسار «بعد الرجوع» كما هو: تذكير يوم الموعد، رفع بنفس الحقل، وتحويل بدون راتب بعد انقضاء المهلة.",
    "Cleanup verified: hr_leave_attach_test_4a8839782dcbe94f is absent from sys.databases.",
    "Manual: 9000 − 3 × 300 (MISSED sick days now unpaid) = 8100; no tier deduction on top.",
    "Manual: day rate 300; 10 days × 300 × 25% = 750 (sick) + 2 unpaid days × 300 = 600; net 9000 − 1350 = 7650.",
    "Manual: 2 × 300 × 25% = 150 + 2 × 300 × 100% = 600 → 750; five fully paid days → 0.",
    "Cleanup verified: hr_leave_sick_pay_test_9386c21582f2d18b is absent from sys.databases.",
    "Cleanup verified: hr_attendance_race_test_c57373187fa24678 removed.",
    "Cleanup verified: hr_financial_report_test_f8eaecd7de90a91f is absent from sys.databases.",
    "Cleanup verified: hr_cost_center_test_67991ca70130e924 is absent from sys.databases.",
    "Cleanup verified: hr_employee_export_test_acad1d7d31568605 is absent from sys.databases.",
    "Cleanup verified: hr_assets_branch_test_76448218a3cf0257 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_bonuses_test_5456180673b3bebd is absent from sys.databases.",
    "Cleanup verified: hr_payroll_typed_deductions_test_8022d360bd834a20 is absent from sys.databases.",
    "Cleanup verified: hr_exemption_workflow_test_77e12a7d95e2fbc5 was removed and DB_ID is NULL.",
    "Cleanup verified: temporary uploads were removed.",
    "Cleanup verified: hr_calendar_history_test_97935cefd7de5250 removed.",
    "Cleanup verified: temporary uploads removed.",
    "تم التحقق من حذف قاعدة الاختبار: hr_calendar_transfer_test_e0f77f2c26c57cce",
    "تم التحقق من حذف مرفقات الاختبار المؤقتة.",
    "Cleanup verified: hr_schedule_range_test_fb46f4cab1450bd0 removed.",
    "Cleanup verified: hr_chain_branch_copy_test_d55c0f6d77a5a030 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_history_test_aaac2fdec8963f95 is absent from sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_bulk_update_test_7e7075cd672262c3 is absent from sys.databases.",
    "Cleanup verified: hr_org_chart_test_815e2d0c68ee8f45 is absent from sys.databases.",
    "{\"scenario\":\"bulk method changed before payment\",\"beforePay\":{\"bank\":[1000,0],\"screen\":[1000,0],\"financial\":[1000,0],\"state\":\"UNPAID\"},\"afterPay\":{\"bank\":[1000,0],\"screen\":[1000,0],\"financial\":[1000,0],\"state\":\"PAID\"},\"marks\":0}",
    "{\"scenario\":\"mixed amount changed after payment\",\"beforeChange\":{\"bank\":[300,700],\"screen\":[300,700],\"financial\":[300,700],\"state\":\"PAID\"},\"afterChange\":{\"bank\":[300,700],\"screen\":[300,700],\"financial\":[300,700],\"state\":\"PAID\"}}",
    "{\"scenario\":\"no employee enumeration\",\"statuses\":[400,403,400,403]}",
    "{\"nightDays\":[{\"date\":\"2026-08-31\",\"late\":10,\"work\":280,\"shortfall\":20},{\"date\":\"2026-09-01\",\"late\":20,\"work\":280,\"shortfall\":20}]}",
    "{\"transferCalendar\":[{\"date\":\"2026-08-28\",\"branch\":1,\"kind\":\"WEEKEND\"},{\"date\":\"2026-08-29\",\"branch\":2,\"kind\":\"WEEKEND\"},{\"date\":\"2026-08-30\",\"branch\":2,\"kind\":\"WORKING\"}]}",
    "{\"calendarBoundaryKinds\":[\"HOLIDAY\",\"HOLIDAY\",\"WORKING\",\"WORKING\",\"WORKING\",\"WEEKEND\"]}",
    "{\"sqlDate\":\"2026-08-31\",\"originalShadowDay\":\"2026-08-30\",\"firstDayOmitted\":true}",
    "tests 354",
    "suites 0",
    "pass 343",
    "fail 11",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 524605.2331"
  ],
  "stdout": [
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "  [L10] أثر بذرة الرصيد: entitled المحفوظ=21 — المعروض annualEntitlement=21 accruedToDate=14 remaining=14 (العرض يقرأ استحقاق نوع الإجازة، فالعمود المحفوظ غير مستعمل اليوم)\n",
    "  [P2] وضع المحرك=SHADOW المصروف=LEGACY تكافؤ: {\"employees\":1,\"matched\":0,\"different\":0,\"unavailable\":1,\"error\":0,\"differences\":6} — 6 فرقًا بين محرك السياسة والحساب القديم؛ لكل فرق سبب مسجل، والتحويل إلى POLICY يحتاج سببًا مكتوبًا لكل فرق\n",
    "  [P2] حالة الصف=UNAVAILABLE ظل الحضور=PARTIAL\n        فرق LATENESS (خصم التأخير): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق SHORTFALL (خصم نقص الساعات): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n",
    "        فرق ABSENCE (خصم الغياب): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق OTHER_DEDUCTIONS (خصومات الدفتر): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق LOANS (أقساط السلف): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق NET (الصافي): قديم=7800.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n",
    "سيناريوهات: 31 — تحققات فاشلة: 0\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "\n================ تغطية سطح التقارير ================\n",
    "[✗ غير مغطّى] CSV export (deductions) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (loans) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (overtime) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (payroll-cost) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (payroll-register) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✓ مغطّى]    CSV export (مراكز التكلفة) — العناوين العربية والصفوف والإجمالي مقابل أرقام التقرير\n[✓ مغطّى]    GET /attendance/monthly — أيام الموظف ومجاميعه مقابل attendance_days\n[✓ مغطّى]    GET /attendance/payroll-month — حدود شهر الرواتب = حدود المسير\n[✓ مغطّى]    GET /payroll/runs/:id/bank-sheet — السطور والمجاميع وتقسيم نقدي/بنك مقارنة ببنود المسير\n[✓ مغطّى]    GET /payroll/runs/:id/pay-methods — العدد والمبلغ لكل طريقة صرف مقابل بنود المسير\n[✓ مغطّى]    GET /payroll/unassigned-report — يتطابق مع /reports/payroll/unassigned لنفس الفترة\n[✓ مغطّى]    GET /reports/attendance — الأيام والدقائق مقارنة بـattendance_days، والشهر مقابل النطاق\n[✓ مغطّى]    GET /reports/cost-centers — التجميع لكل مركز والإجمالي مقابل بنود المسيرات\n[✓ مغطّى]    GET /reports/financial/deductions (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/deductions — الأنواع والموظفون مقابل أعمدة كشف الرواتب\n[✓ مغطّى]    GET /reports/financial/loans (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/loans — الأصل والمسدد والقائم وأقساط الشهر مقابل جدولي loans و loan_installments\n[✓ مغطّى]    GET /reports/financial/overtime (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/overtime — الدقائق والمبالغ وبدل العطلة مقابل بنود المسير\n[✓ مغطّى]    GET /reports/financial/payroll-cost (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/payroll-cost — التجميع بالفرع والقسم مقابل كشف الرواتب\n[✓ مغطّى]    GET /reports/financial/payroll-register — كل سطر وكل مجموع مقارنة ببنود المسيرات المعتمدة\n[✗ غير مغطّى] GET /reports/financial/payroll-register.csv — ترجع 404 — لا نقطة تصدير على الخادم\n",
    "[✗ غير مغطّى] GET /reports/financial/payroll-register/csv — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/excel — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/export — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/pdf — ترجع 404 — لا نقطة تصدير على الخادم\n[✓ مغطّى]    GET /reports/headcount — الأرقام مقارنة بجدول الموظفين\n[✓ مغطّى]    GET /reports/leaves — الاستهلاك بالنوع والأرصدة مقارنة بجدولي leaves و leave_balances\n[✓ مغطّى]    GET /reports/overtime — الساعات والمبالغ مقابل overtime_entries، والمبلغ محجوب بلا صلاحية الرواتب\n[✓ مغطّى]    GET /reports/payroll — إجمالي كل مسير وطرق الصرف والخصومات مقارنة ببنود المسيرات\n[✓ مغطّى]    GET /reports/payroll/loans — الأصل والمسدد والمتبقي والتقادم والتحصيل المتوقع مقابل صفوف الأقساط\n[✓ مغطّى]    GET /reports/payroll/overtime — كل سجل ومصدر مبلغه والمجاميع مقابل overtime_entries وبنود المسير\n",
    "[✓ مغطّى]    GET /reports/payroll/unassigned — الأسباب والملخص، والشهر مقابل نطاق الأيام\n[✓ مغطّى]    GET /reports/payroll/variance — الفروق والأسباب والمجاميع مقابل بنود الشهرين\n[✓ مغطّى]    GET /reports/requests — العدد بالفئة والحالة مقارنة بجدول requests\n[✓ مغطّى]    GET /social-insurance/report — الصفوف والمجاميع وفلتر الفرع — الفرع بلا نظام تأمين يرجع تقريرًا فاضيًا نظيفًا\n\nسيناريوهات: 27 — تحققات: 393 — ناجحة: 391 — فاشلة: 2\n\n================ الملاحظات ================\n1. [RS13 تقرير بلا مسير] «إظهار الموقوفين» فلتر فعّال: يغيّر الصفوف أو على الأقل يعدّ موقوفًا في الملخص\n   صفوف الموقوفين مع الفلتر=2 وبدونه=2، summary.suspended=0، حالة الموظف=active isActive=true، سجلات الإيقاف=1، سببه في التقرير=OUT_OF_ALL_RUN_SCOPES\n2. [RS13 تقرير بلا مسير] الموقوف يُعرض بسبب «موقوف» لا بسبب عام\n   السبب الفعلي=[{\"code\":\"OUT_OF_ALL_RUN_SCOPES\",\"label\":\"خارج نطاق كل المسيرات المنشأة للفترة\",\"detail\":null,\"run\":null}] وحالة الموظف=active | + actual - expected | + 'OUT_OF_ALL_RUN_SCOPES' | - 'SUSPENDED'\n",
    "===========================================\n\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "{\"cleanupVerified\":\"hr_codex_independent_test_670dea3f8282122a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r3cacheedges_test_334a6c6a667fb640\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r3portal_test_05e8b77c16392c6b\"}\n"
  ]
}
