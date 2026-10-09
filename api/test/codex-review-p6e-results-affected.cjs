module.exports = {
  "selected": [
    "codex-review-p6e-ai-read",
    "benefits-insurance",
    "payroll-financial-exemptions",
    "fulltest-leaves-payroll",
    "fulltest-reports",
    "ai-reports"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 81,
      "failed": 0,
      "passed": 81,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 81,
      "suites": 0
    },
    "duration_ms": 59723.9207
  },
  "results": [
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9055.2782,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 125.6868,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 261.5723,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 95.612,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 272.5676,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "P6E-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 67.3468,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "P6E-R01: real attendance and nonempty payslip values survive the new projection without leaking free-text contacts",
      "ms": 265.5269,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "P6E-R02: policy effective date matches its actual library source",
      "ms": 28.9362,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-insurance.integration.cjs",
      "name": "BI-01: الموديول مقفول = مفيش مسار (وبيتفتح مع سجل المعالين)؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 9756.392,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-insurance.integration.cjs",
      "name": "BI-02: الوثيقة — بصلاحية الموديول، والكتابة لحساب بكل الفروع، وحالتها (سارية، هتنتهي قريب، انتهت، متعطّلة)، والتعديل بالمبعوت بس وبسطر تدقيق",
      "ms": 149.3531,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-insurance.integration.cjs",
      "name": "BI-03: الفئات — الاسم فريد في الوثيقة، وافتراضية واحدة، والدرجة لفئة مفعّلة واحدة، وطلبين مع بعض = واحد يعدّي، ومفيش مسح",
      "ms": 338.3708,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-insurance.integration.cjs",
      "name": "BI-04: الأهلية — وثيقة دولة فرع الموظف السارية وفئة درجته (ثم الافتراضية)، للنشطين في نطاق الحساب، وقراءة بس",
      "ms": 163.674,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
      "ms": 10921.752,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
      "ms": 2725.0739,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
      "ms": 565.3368,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
      "ms": 842.8512,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
      "ms": 785.7231,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
      "ms": 1215.2432,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 11456.4369,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 688.0828,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 146.5582,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 541.142,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 326.0246,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 274.1886,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 757.647,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 368.4448,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 129.196,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 54.4408,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 512.9286,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 218.6095,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 176.0099,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 108.7697,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 243.0275,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 129.3679,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 13.5545,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 99.2949,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 155.0039,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 1026.8024,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 1778.7076,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 1984.4824,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 476.475,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 1613.8649,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 875.4691,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 947.4956,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 931.5032,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 882.2334,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 259.1265,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 690.1067,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 93.9178,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.1864,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية",
      "ms": 14008.0665,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق",
      "ms": 5004.8147,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها",
      "ms": 791.6123,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين",
      "ms": 41.2659,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه",
      "ms": 49.9516,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع",
      "ms": 35.1191,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات",
      "ms": 12.0014,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة",
      "ms": 460.3142,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة",
      "ms": 61.9772,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور",
      "ms": 76.9333,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي",
      "ms": 70.0787,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف",
      "ms": 72.4474,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده",
      "ms": 49.9607,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير",
      "ms": 59.3555,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر",
      "ms": 50.1163,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة",
      "ms": 295.5607,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات",
      "ms": 107.2458,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع",
      "ms": 99.8274,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين",
      "ms": 73.1859,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط",
      "ms": 28.5264,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع",
      "ms": 26.9838,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا",
      "ms": 237.8274,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير",
      "ms": 129.6531,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ",
      "ms": 89.7535,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير",
      "ms": 736.6009,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف",
      "ms": 220.7412,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا",
      "ms": 159.1655,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "ZZ — ملخص التغطية والملاحظات",
      "ms": 0.4822,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-01: «عدد الغياب في فرع جدة الشهر ده» — نفس رقم تقرير المؤشرات بالحرف (النسبة وعدد أيام الغياب)، والنموذج مابيبعتش غير مفتاح مؤشر واسم فرع",
      "ms": 9290.0826,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-02: الحدود — من غير صلاحية التقارير الأداة مش موجودة؛ فرع برّه النطاق واسم مش موجود ومؤشر مش في القاموس وشهر غلط ومؤشر صلاحيته ناقصة = «مش متاح»؛ والاسم الغامض بيرجع باختياراته",
      "ms": 256.5575,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-03: خادم MCP فوق الـAPI العام — بمفتاح تكامل بيقرا اللي نطاقاته وفروعه تسمح بيه بس، والرد = رد المسار نفسه؛ ومفيش أداة كتابة",
      "ms": 160.1853,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2}",
    "{\"attendanceTimesIntact\":true,\"payslipMoneyIntact\":true,\"rawShiftContact\":false}",
    "{\"closure\":\"policy date field corrected\",\"libraryDatePresent\":true,\"providerDate\":\"2026-10-09\"}",
    "Cleanup verified: hr_aiassist_test_a83faee1b035986f is absent from sys.databases.",
    "Cleanup verified: hr_benefits_test_13828acb373c57dc is absent from sys.databases.",
    "Cleanup verified: hr_fulltest_payroll_test_4bad780e5bc8b88e is absent from sys.databases.",
    "Cleanup verified: hr_reports_test_67e44b41a5ef5de3 is absent from sys.databases.",
    "Cleanup verified: hr_aireports_test_ca77a3506676d44c is absent from sys.databases.",
    "tests 81",
    "suites 0",
    "pass 81",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 59723.9207"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_a83faee1b035986f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_a83faee1b035986f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_benefits_test_13828acb373c57dc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_benefits_test_13828acb373c57dc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_exemptions_test_d21dbe6c607d3f8c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_exemptions_test_d21dbe6c607d3f8c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_fulltest_payroll_test_4bad780e5bc8b88e\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "  [L10] أثر بذرة الرصيد: entitled المحفوظ=21 — المعروض annualEntitlement=21 accruedToDate=15.75 remaining=15.75 (العرض يقرأ استحقاق نوع الإجازة، فالعمود المحفوظ غير مستعمل اليوم)\n",
    "  [P2] وضع المحرك=LEGACY المصروف=LEGACY تكافؤ: {\"employees\":0,\"matched\":0,\"different\":0,\"unavailable\":0,\"error\":0,\"differences\":0} — وضع LEGACY: لم يُحسب محرك السياسة بجانب المسير\n",
    "سيناريوهات: 31 — تحققات فاشلة: 0\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_fulltest_payroll_test_4bad780e5bc8b88e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_reports_test_67e44b41a5ef5de3\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "\n================ تغطية سطح التقارير ================\n",
    "[✗ غير مغطّى] CSV export (deductions) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (loans) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (overtime) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (payroll-cost) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✗ غير مغطّى] CSV export (payroll-register) — الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم\n[✓ مغطّى]    CSV export (مراكز التكلفة) — العناوين العربية والصفوف والإجمالي مقابل أرقام التقرير\n[✓ مغطّى]    GET /attendance/monthly — أيام الموظف ومجاميعه مقابل attendance_days\n[✓ مغطّى]    GET /attendance/payroll-month — حدود شهر الرواتب = حدود المسير\n[✓ مغطّى]    GET /payroll/runs/:id/bank-sheet — السطور والمجاميع وتقسيم نقدي/بنك مقارنة ببنود المسير\n[✓ مغطّى]    GET /payroll/runs/:id/pay-methods — العدد والمبلغ لكل طريقة صرف مقابل بنود المسير\n[✓ مغطّى]    GET /payroll/unassigned-report — يتطابق مع /reports/payroll/unassigned لنفس الفترة\n[✓ مغطّى]    GET /reports/attendance — الأيام والدقائق مقارنة بـattendance_days، والشهر مقابل النطاق\n[✓ مغطّى]    GET /reports/cost-centers — التجميع لكل مركز والإجمالي مقابل بنود المسيرات\n",
    "[✓ مغطّى]    GET /reports/financial/deductions (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/deductions — الأنواع والموظفون مقابل أعمدة كشف الرواتب\n[✓ مغطّى]    GET /reports/financial/loans (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/loans — الأصل والمسدد والقائم وأقساط الشهر مقابل جدولي loans و loan_installments\n[✓ مغطّى]    GET /reports/financial/overtime (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/overtime — الدقائق والمبالغ وبدل العطلة مقابل بنود المسير\n[✓ مغطّى]    GET /reports/financial/payroll-cost (filters) — فلتر الفرع\n[✓ مغطّى]    GET /reports/financial/payroll-cost — التجميع بالفرع والقسم مقابل كشف الرواتب\n[✓ مغطّى]    GET /reports/financial/payroll-register — كل سطر وكل مجموع مقارنة ببنود المسيرات المعتمدة\n[✗ غير مغطّى] GET /reports/financial/payroll-register.csv — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/csv — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/excel — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/export — ترجع 404 — لا نقطة تصدير على الخادم\n[✗ غير مغطّى] GET /reports/financial/payroll-register/pdf — ترجع 404 — لا نقطة تصدير على الخادم\n[✓ مغطّى]    GET /reports/headcount — الأرقام مقارنة بجدول الموظفين\n[✓ مغطّى]    GET /reports/leaves — الاستهلاك بالنوع والأرصدة مقارنة بجدولي leaves و leave_balances\n[✓ مغطّى]    GET /reports/overtime — الساعات والمبالغ مقابل overtime_entries، والمبلغ محجوب بلا صلاحية الرواتب\n[✓ مغطّى]    GET /reports/payroll — إجمالي كل مسير وطرق الصرف والخصومات مقارنة ببنود المسيرات\n",
    "[✓ مغطّى]    GET /reports/payroll/loans — الأصل والمسدد والمتبقي والتقادم والتحصيل المتوقع مقابل صفوف الأقساط\n[✓ مغطّى]    GET /reports/payroll/overtime — كل سجل ومصدر مبلغه والمجاميع مقابل overtime_entries وبنود المسير\n[✓ مغطّى]    GET /reports/payroll/unassigned — الأسباب والملخص، والشهر مقابل نطاق الأيام\n[✓ مغطّى]    GET /reports/payroll/variance — الفروق والأسباب والمجاميع مقابل بنود الشهرين\n[✓ مغطّى]    GET /reports/requests — العدد بالفئة والحالة مقارنة بجدول requests\n[✓ مغطّى]    GET /social-insurance/report — الصفوف والمجاميع وفلتر الفرع — الفرع بلا نظام تأمين يرجع تقريرًا فاضيًا نظيفًا\n\nسيناريوهات: 27 — تحققات: 395 — ناجحة: 395 — فاشلة: 0\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_reports_test_67e44b41a5ef5de3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aireports_test_ca77a3506676d44c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aireports_test_ca77a3506676d44c\"}\n"
  ]
}
