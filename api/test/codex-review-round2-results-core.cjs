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
    "cost-center-report"
  ],
  "summary": {
    "success": [REDACTED],
    "counts": {
      "tests": 224,
      "failed": 15,
      "passed": 209,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 224,
      "suites": 0
    },
    "duration_ms": 647416.3043
  },
  "results": [
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ1 — مجموعة بيانات كاملة: كل قيمة أُرسلت ترجع كما هي عند القراءة",
      "ms": 5835.6188,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ2 — مصفوفة التحقق عند الإضافة: كل مدخل غلط يُرفض برسالة، والكود المرسل يُتجاهل",
      "ms": 1964.5507,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ3 — توليد الكود متسلسل بلا فجوات ولا تكرار تحت الإنشاء المتزامن",
      "ms": 1111.4559,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ4 — عزل الفروع: حساب فرع أ لا ينشئ ولا يقرأ ولا يعدّل موظف فرع ب",
      "ms": 995.1481,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ5 — حدود التعديل والتعيين المستقبلي: التكرار يُرفض، والكود لا يُعدَّل، ولا غياب قبل التعيين",
      "ms": 8179.2868,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب1 — يوم عادي، تأخير، انصراف مبكر، وتأخير مغطى بإذن معتمد (بلا خصم)",
      "ms": 9064.0096,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب2 — غياب بلا طلب، غياب مغطى بإجازة معتمدة، وبصمة ناقصة",
      "ms": 14575.816,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب3 — الساعة المرنة: النافذة تعفي داخلها، وبعدها التأخير كامل بلا سماحية مُضافة مرتين",
      "ms": 2639.5284,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب4 — دوام يوم عطلة: المكتشف من البصمة، وأمر HR يحوّله لبدل دوام العطلات بدل الإضافي ومرة واحدة",
      "ms": 10014.0944,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب5 — يوم داخل فترة إيقاف عن العمل: يُتخطى ولا يُحفظ غيابًا (فلا يُخصم مرتين)",
      "ms": 38920.4118,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب6 — إضافي بطلب معتمد: يُحتسب مرة واحدة، والمعتمد بعد قفل فترته يدخل أول مسير مفتوح بعده بلا تكرار",
      "ms": 49704.724,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب7 — التقارير والملخص متسقة مع صفوف الأيام، وفلاتر «من/إلى» باليوم تختلف عن فلتر الشهر",
      "ms": 24108.6797,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب8 — فلاتر المدى على سجل الإضافي والكشف، وعزل الفرع في قراءة الحضور",
      "ms": 215.8948,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب9 — حواف: غياب مُجسَّد ثم إجازة معتمدة، حد السماحية بالضبط، وبصمة مستقبلية أو خارج الفرع",
      "ms": 34409.2051,
      "pass": true
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ج1 — موظف عادي (خدمة ذاتية): يشوف حضوره هو بس، ولا يقرأ غيره ولا التقارير",
      "ms": 6947.5471,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 9549.9505,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 2739.4498,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 818.2679,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 3154.2325,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 2037.8479,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 1708.4698,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 4709.6066,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 539.3032,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 474.6809,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 72.4491,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 2195.4884,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 637.1015,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 563.7791,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 277.31,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 1640.9443,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 152.2594,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 10.5684,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 655.8408,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 654.4224,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 3788.191,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 6155.6809,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 15262.4855,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 1848.2347,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 7107.9789,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 4091.507,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 3113.6709,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 3172.0615,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 4124.3876,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 1490.3895,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 3919.7583,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 249.2704,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.1802,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية",
      "ms": 17298.2665,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق",
      "ms": 58321.1763,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها",
      "ms": 3818.6573,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين",
      "ms": 119.738,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه",
      "ms": 59.7147,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع",
      "ms": 68.562,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات",
      "ms": 8.764,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة",
      "ms": 1843.9174,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة",
      "ms": 178.2954,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور",
      "ms": 145.4054,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي",
      "ms": 149.3557,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف",
      "ms": 147.1408,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده",
      "ms": 124.4865,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير",
      "ms": 78.192,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر",
      "ms": 122.7527,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة",
      "ms": 336.8802,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات",
      "ms": 101.6315,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع",
      "ms": 72.5402,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين",
      "ms": 107.9368,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط",
      "ms": 41.0945,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع",
      "ms": 17.2753,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا",
      "ms": 678.1963,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير",
      "ms": 271.5405,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ",
      "ms": 306.2577,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير",
      "ms": 3887.8498,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف",
      "ms": 1793.7584,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا",
      "ms": 180.6021,
      "pass": true
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "ZZ — ملخص التغطية والملاحظات",
      "ms": 0.8369,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 18455.9525,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 163.0423,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 58631.7592,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 54278.5719,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 12339.1924,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 12404.1536,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 1910.7794,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 4089.713,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 1394.3953,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 527.2039,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة",
      "ms": 4992.8451,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض",
      "ms": 783.9126,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد",
      "ms": 744.6311,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل",
      "ms": 395.3231,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال",
      "ms": 280.4833,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401",
      "ms": 414.0289,
      "pass": true
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-01: البند المصروف نقدي يفضل نقدي في الشاشات الأربع بعد ما الملف بقى «تحويل بنكي»، واللي لسه ماتصرفش بيتبع الملف",
      "ms": 4911.874,
      "pass": true
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-02: مسير اتصرف كله مرة واحدة بلا علامات بياخد لقطة البند، و«لم يتم» ترجّع الصف لملف الموظف",
      "ms": 214.4113,
      "pass": true
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
      "ms": 5548.2915,
      "pass": true
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
      "ms": 456.3449,
      "pass": true
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 1860.3758,
      "pass": true
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
      "ms": 76.6718,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03: an inactive employee whose CLOSED last working day is the period end keeps the full salary",
      "ms": 13008.6969,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-103: 18 covered days earn 7200; the 1000 installment stays whole and leaves 6200",
      "ms": 5974.2045,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: joining July 1 earns 5133.33 from a 7000 monthly gross without absence",
      "ms": 6009.7879,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10 / SPEC E-102: one real absent workday deducts 233.33 from prorated pay and leaves 4900",
      "ms": 6305.84,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: an employee who left before the period and one joining after it have no payable line",
      "ms": 7925.6464,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-03 / PR-10: a cancelled offboarding case does not terminate coverage or reduce salary",
      "ms": 7831.3181,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: existing lateness/absence before hiring or after the last working day cannot deduct or generate more days",
      "ms": 3345.9854,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: the first and last days of the cycle each count as one covered day",
      "ms": 1712.7044,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "الشهر 30 يومًا: 18 يومًا مغطى في دورة 31 يومًا تستحق 3600 — التناسب على 30 مثل سعر يوم الخصم",
      "ms": 5009.9049,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 31-day cycle pays exactly 6000, with factor one and no extra day",
      "ms": 8076.1621,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: full coverage of a 28-day cycle pays exactly 6000 without deducting two calendar days",
      "ms": 7390.6485,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / الخطوة 14: cycle start 1 uses its calendar month; 29/30/31 start the day after the previous period ends (no shared day)",
      "ms": 93522.1095,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: a SQL save failure preserves the previous run/items/members and leaves no partial new run",
      "ms": 45787.1967,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-01 / PR-02: branch payroll permissions cannot calculate, read, approve, recalculate or pay another branch",
      "ms": 24252.2667,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08: recalculation keeps the stored period dates after the company cycle setting changes",
      "ms": 6963.1183,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-08 / PR-11: recalculation cannot change the stored period or scope type and preserves the old snapshot",
      "ms": 8329.9055,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-11: an employee cannot read their calculated draft payslip but can read the same item after approval",
      "ms": 14805.1261,
      "pass": true
    },
    {
      "file": "payroll-coverage.integration.cjs",
      "name": "PR-10: half-cent proration is cut down (قرار المالك: خانتين بلا تقريب) and the adjusted components equal the earned gross",
      "ms": 2746.8427,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: calculation is a draft, approval reserves, and payment posts exactly 400 with a 1266 child and net 500",
      "ms": 17691.7134,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: SKIP reserves the zero deduction action and posts a full deferred child without reducing salary",
      "ms": 10250.9244,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: full repayment creates no child, cannot be posted twice, and PAID cannot be reopened or cancelled",
      "ms": 11425.9873,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: reopening releases the claim with history and reapproval reserves a fresh allocation before one payment",
      "ms": 11059.2997,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: repeated draft calculations and cancellation never reserve or move a loan balance",
      "ms": 10909.4625,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: an amount changed after calculation rejects approval atomically without reserving stale debt",
      "ms": 10387.2712,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: a source revision changed after approval rejects payment and preserves the held allocation",
      "ms": 10469.3916,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: approval and payment use captured options when live defaults change",
      "ms": 10031.0482,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: failure writing the reservation audit rolls back both installment and employee period claims",
      "ms": 11044.2781,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: failure writing payment audit rolls back parent, child, allocation and payroll status together",
      "ms": 10574.6246,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: planless legacy amounts and tampered saved plans require recalculation before approval or payment",
      "ms": 11717.2654,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: manual deferral closes the parent and creates one complete future child even when salary can cover it",
      "ms": 10438.552,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: held claims block manual deferral and early settlement including zero-deduction SKIP",
      "ms": 10648.0707,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: manual deferral rejects stale revision, changed captured amount and invalid reason without moving debt",
      "ms": 1450.283,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: early settlement consumes only the remaining child after partial payroll and retries are idempotent",
      "ms": 10492.9332,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: EOS includes a draft source, blocks on approval, then reads only the unpaid child after payroll payment",
      "ms": 11990.6028,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: an EOS snapshot becomes stale when a manual deferral replaces its source with a new child ID",
      "ms": 1112.849,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: inconsistent transferred balances fail visibly in payroll and EOS instead of losing the remainder",
      "ms": 9636.5079,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: real JWT permissions and branch scope protect run transitions and loan financial reads",
      "ms": 12980.107,
      "pass": true
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: concurrent approvals in different payroll periods cannot reserve the same overdue parent twice",
      "ms": 11486.4864,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: each of the four active payroll states excludes exact overtime/installment claims",
      "ms": 7314.6347,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: DRAFT/CANCELLED payroll items do not reserve financial entries",
      "ms": 750.3078,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: malformed historical payroll references reject regeneration and preserve every reviewed line",
      "ms": 793.0559,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a payroll claim created after generation blocks approval without changing reviewed money",
      "ms": 1125.1884,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: concurrent approvals settle once, preserve exact references and do not invent payment state",
      "ms": 674.5821,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: changed or deleted linked financial lines require regeneration; manual adjustments remain independent",
      "ms": 1313.4519,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: legacy financial settlement without snapshot requires explicit regeneration and keeps permissions",
      "ms": 723.755,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: payroll after settlement excludes frozen claims and legacy ambiguity is refused",
      "ms": 11723.6227,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: renaming a historical automatic settlement line cannot hide pending financial sources",
      "ms": 173.3777,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: cancelling SETTLED legacy with a renamed automatic line cannot release untracked sources",
      "ms": 213.0508,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: all sources claimed by payroll cannot hide ambiguous automatic money behind an empty settlement snapshot",
      "ms": 840.0895,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: historical automatic EOS with no pending financial sources still permits settlement approval",
      "ms": 574.3097,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: simultaneous payroll calculation and settlement approval cannot claim the same sources",
      "ms": 11303.577,
      "pass": true
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a later offboarding case cannot reclaim sources in an earlier settled snapshot",
      "ms": 886.3907,
      "pass": true
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن صباحي ساعة (09:00–10:00) ووصول 10:30: الإذن بيغطي الساعة والـ30 دقيقة الباقية تأخير عادي",
      "ms": 6190.8661,
      "pass": true
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن صباحي ساعتين (09:00–11:00) ووصول 11:00: مفيش تأخير",
      "ms": 1187.1519,
      "pass": true
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن مسائي ساعة (17:00–18:00) وخروج 17:00: مفيش انصراف بدري",
      "ms": 1232.3284,
      "pass": true
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن مسائي ساعة (17:00–18:00) وخروج 16:30: انصراف بدري 30 دقيقة للجزء اللي برا الإذن",
      "ms": 1191.8389,
      "pass": true
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "رصيد ساعتين في الشهر: ساعة + ساعة أو ساعتين مرة واحدة، والزيادة والحد للمرة الواحدة بيترفضوا",
      "ms": 771.0597,
      "pass": true
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "وقت الإذن لازم يكون صالح: من غير نهاية أو نفس الوقت بيترفض، والنوع بخصم مالوش رصيد دقايق عند التقديم",
      "ms": 389.9653,
      "pass": true
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 6203.4734,
      "pass": true
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 82.4211,
      "pass": true
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 385.74,
      "pass": true
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 624.9428,
      "pass": true
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 393.7926,
      "pass": true
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل",
      "ms": 8301.8266,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:185:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع",
      "ms": 321.6027,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:225:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف",
      "ms": 1231.3931,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:239:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط",
      "ms": 603.6687,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:258:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب",
      "ms": 2915.4436,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:289:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll",
      "ms": 5863.2571,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-sick-pay-attachment.integration.cjs:39:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-sick-pay-attachment.integration.cjs:165:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: days 31-40 of the year at 75% deduct 750 as their own line; an isUnpaid sick day is not charged twice",
      "ms": 11555.7955,
      "pass": true
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: crossing day 90 splits into 75% and 0% lines; fully paid sick days add nothing",
      "ms": 21748.5064,
      "pass": true
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 27442.6658,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.3389,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0438,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0267,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0359,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0232,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0251,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0213,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "attendance-payroll-race.integration.cjs",
      "name": "approval holding employee-finance wins before a waiting recompute; attendance snapshot and approved OT stay immutable",
      "ms": 9517.8724,
      "pass": [REDACTED],
      "error": "{\"message\":\"التصفية المعتمدة #1 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "cause": "{\"message\":\"التصفية المعتمدة #1 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"التصفية المعتمدة #1 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\attendance-payroll-race.integration.cjs:130:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 5897.6957,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 579.1701,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 747.7411,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 540.2874,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 6372.0995,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 788.7348,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 287.1823,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 858.2421,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 656.702,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 738.918,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.5359,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 424.9611,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 142.1528,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 514.5566,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 375.977,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 134.524,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 597.2986,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 181.349,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 564.9964,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 242.7217,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 387.6451,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 3134.018,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 1444.8742,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 924.416,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 3920.2216,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 282.2381,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 504.5713,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 431.425,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 377.131,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 270.5321,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 361.8104,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 102.9237,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 98.5168,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 848.5984,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 205.0469,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 644.6716,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 435.8734,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 1188.1333,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 312.1545,
      "pass": true
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 315.3958,
      "pass": true
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا",
      "ms": 5909.357,
      "pass": true
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "ملخص التكلفة والخصومات والإضافي من نفس البنود",
      "ms": 163.9863,
      "pass": true
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير",
      "ms": 151.0413,
      "pass": true
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 123.917,
      "pass": true
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
      "ms": 5365.4357,
      "pass": true
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 54.3091,
      "pass": true
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
      "ms": 41.5649,
      "pass": true
    }
  ],
  "failures": [
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل",
      "ms": 8301.8266,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:185:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع",
      "ms": 321.6027,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:225:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف",
      "ms": 1231.3931,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:239:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط",
      "ms": 603.6687,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:258:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب",
      "ms": 2915.4436,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:48:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:289:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll",
      "ms": 5863.2571,
      "pass": [REDACTED],
      "error": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "cause": "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData",
      "stack": "TypeError: The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received an instance of FormData\n    at Buffer.from (node:buffer:331:9)\n    at global.fetch (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:64:53)\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-sick-pay-attachment.integration.cjs:39:26)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-sick-pay-attachment.integration.cjs:165:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 27442.6658,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.3389,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0438,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0267,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0359,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0232,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0251,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0213,
      "pass": [REDACTED],
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_f13650b5d6260cc6'\n\n    at safeDatabase (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at DataSource.initialize (D:\\projects\\hr_system\\api\\test\\codex-review-round2-harness.cjs:26:3)\n    at D:\\projects\\hr_system\\api\\node_modules\\@nestjs\\typeorm\\dist\\typeorm-core.module.js:191:30"
    },
    {
      "file": "attendance-payroll-race.integration.cjs",
      "name": "approval holding employee-finance wins before a waiting recompute; attendance snapshot and approved OT stay immutable",
      "ms": 9517.8724,
      "pass": [REDACTED],
      "error": "{\"message\":\"التصفية المعتمدة #1 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "cause": "{\"message\":\"التصفية المعتمدة #1 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"التصفية المعتمدة #1 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\attendance-payroll-race.integration.cjs:130:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "إنشاء بفرع خارج النطاق → HTTP 403، الفرع المحفوظ — (نطاق المستخدم 1، المرسل 2)",
    "إنشاء بفرع خارج النطاق وقسم داخل النطاق → HTTP 403، الفرع المحفوظ —",
    "تاريخ تعيين في المستقبل (2026-12-01) → HTTP 201 \"EMP-0015\"",
    "تاريخ تعيين بعد 100 سنة (2126-01-01) → HTTP 400 \"تاريخ التعيين أبعد من سنة من النهارده — راجع السنة\"",
    "قيد الإضافي بعد اعتماد المسير: status=APPROVED، payrollRunId=— (PAID تتسجّل عند الصرف لا الاعتماد)",
    "مسير الفترة التالية (2026-10) → HTTP 201",
    "Cleanup verified: hr_fulltest_attendance_test_ea2575bcae841994 is absent from sys.databases.",
    "Cleanup verified: hr_fulltest_payroll_test_0abe71e10d4e9f1d is absent from sys.databases.",
    "Cleanup verified: hr_reports_test_f694970a2eb70c5e is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_43027c4489a39069 is absent from sys.databases.",
    "{\"rejected\":12,\"attempts\":5,\"locked\":true,\"consumed\":[REDACTED]}",
    "{\"statuses\":[401,401,401,401,401,401,401,401,401,401,401,401],\"attempts\":5,\"locked\":true}",
    "{\"oldConsumeGuardMatches\":1,\"newConsumeGuardMatches\":0}",
    "{\"oldCodeStatus\":401}",
    "{\"statuses\":[200,401,401,401,401,401]}",
    "Cleanup verified: hr_2fa_race_test_fac19458905976b4 is absent from sys.databases.",
    "Cleanup verified: hr_recorded_split_test_d13abeb9972a5992 is absent from sys.databases.",
    "Cleanup verified: hr_sec1_perm_test_d3d4bc0178959829 removed.",
    "Manual: 12000 × 18 / 30 = 7200; 7200 − 1000 = 6200.",
    "Manual: (6000 + 800 + 200) × 22 / 30 = 5133.33; daily deduction basis remains 7000 / 30.",
    "Manual: 5133.33 − ROUND(7000 / 30, 2) = 4900.00; do not derive day rate from the prorated gross.",
    "قرار المالك (16 سبتمبر): الشهر 30 يومًا في كل شيء — 6000 × 18 / 30 = 3600.",
    "12 explicit cycle-boundary cases checked through POST calculation and persisted GET detail.",
    "Manual half-cent cases (قص بلا تقريب): 30.15 × 3/30 = 3.015 → 3.01؛ (10.15 × 3) × 3/30 = 3.045 → 3.04؛ القروش والإجمالي متطابقين.",
    "Cleanup verified: hr_payroll_coverage_test_b4459682e132e93a no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "SQL barrier observed: [{\"session_id\":68,\"blocking_session_id\":63,\"wait_type\":\"LCK_M_X\"}]",
    "Cleanup verified: hr_payroll_installment_ledger_test_c81cc4744cd55c88 is absent from sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Temporary settlement database removed and absence verified.",
    "Cleanup verified: hr_permission_window_test_b9eba20bbeeed4c2 removed.",
    "Cleanup: hr_leave_year_end_test_d5022139d6d34f0f dropped.",
    "Cleanup verified: hr_leave_attach_test_65a9caab388002d7 is absent from sys.databases.",
    "Manual: day rate 300; 10 days × 300 × 25% = 750 (sick) + 2 unpaid days × 300 = 600; net 9000 − 1350 = 7650.",
    "Manual: 2 × 300 × 25% = 150 + 2 × 300 × 100% = 600 → 750; five fully paid days → 0.",
    "Cleanup verified: hr_leave_sick_pay_test_cd561077063bbd20 is absent from sys.databases.",
    "Cleanup verified: hr_attendance_race_test_c7a273b136c2ebd7 removed.",
    "Cleanup verified: hr_financial_report_test_46fb6832a3feba8d is absent from sys.databases.",
    "Cleanup verified: hr_cost_center_test_1afb477c3dd406e0 is absent from sys.databases.",
    "tests 224",
    "suites 0",
    "pass 209",
    "fail 15",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 647416.3043"
  ]
}
