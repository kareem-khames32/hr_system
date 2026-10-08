module.exports = {
  "selected": [
    "expense-reports",
    "compensation-cycles",
    "salary-bands",
    "payroll-compensation",
    "report-builder",
    "people-feedback",
    "performance-reviews",
    "mobile-punch",
    "swap-consents",
    "schedule-tools",
    "calendar-range",
    "modules-enforcement",
    "modules-migration",
    "modules-settings"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 95,
      "failed": 0,
      "passed": 95,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 95,
      "suites": 0
    },
    "duration_ms": 119911.5798
  },
  "results": [
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 12161.0609,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
      "ms": 218.8347,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»",
      "ms": 425.6451,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل",
      "ms": 490.188,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب",
      "ms": 390.5805,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش",
      "ms": 372.6293,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل",
      "ms": 455.8465,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد",
      "ms": 772.3243,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد",
      "ms": 961.759,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند",
      "ms": 220.189,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة",
      "ms": 889.6272,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع",
      "ms": 1106.9678,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-13 (Codex P5A-B01): سلسلة فاضية بـ«تنفيذ فوري» مش مراجعة للمبلغ — تقرير المصروفات وسلفة المأمورية مابيتنفذوش من غير اعتماد بشري، والتقديم كله بيرجع",
      "ms": 370.8499,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-01: الموديول مقفول = مفيش مسار؛ وقبل الترحيلات الشاشة بتقول ناقص وورقة المدير فاضية؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 11086.7647,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-02: الدورة — بصلاحية الموديول، وفتحها وتحريكها لحساب بكل الفروع، والخطوة من حالتها بس، وضغطتين مع بعض = واحدة، وبسطر تدقيق",
      "ms": 200.3828,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-03: ورقة المدير — مرؤوسيه المباشرين النشطين بس، والمبلغ اللي كتبه ومن غير أي رقم راتب، وغيرهم = مش موجود، واقتراحين مع بعض = سطر واحد",
      "ms": 300.876,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-04: المراجعة — سطور نطاق الحساب بفرع الموظف الحالي بس، والراتب لصاحب «عرض الرواتب»، والتعديل بسبب ومين عمله، واقتراح المدير بعده مابيغيّرش النهائي",
      "ms": 432.349,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-05: الميزانية — للوحدة في نطاق الحساب، بتغطي اللي تحتها، وعدّت = تحذير والسطر بيتحفظ؛ وتحت المراجعة المدير مابيقترحش؛ والملغاة مابتتعدّلش",
      "ms": 370.9181,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-06: الاعتماد — بصلاحية اعتماد المسير ولحساب بكل الفروع، ومن حد ماقترحش: مش اللي بعتها للمراجعة ولا اللي كتب أو عدّل سطر؛ والرجوع قبل التطبيق",
      "ms": 593.0288,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-07: التطبيق — من خدمة تاريخ الراتب، سطر سطر: الأساسي اللي اتغيّر بيترفض والباقي بيكمّل، ومابيتكررش، ومرجع الدورة على صف تاريخ الراتب، وضغطتين = مرة واحدة",
      "ms": 593.9944,
      "pass": true,
      "skip": false
    },
    {
      "file": "salary-bands.integration.cjs",
      "name": "SB-01: الموديول مقفول افتراضيًا — تقرير السلّم مش متاح حتى لمدير النظام لحد ما يتفتح",
      "ms": 10362.7317,
      "pass": true,
      "skip": false
    },
    {
      "file": "salary-bands.integration.cjs",
      "name": "SB-02: سلّم الرواتب — نطاق الدرجة ومنتصفه، ونسبة المقارنة والموقع لكل موظف نشط، بصلاحية عرض الرواتب وبنطاق فروع الحساب",
      "ms": 32.0484,
      "pass": true,
      "skip": false
    },
    {
      "file": "salary-bands.integration.cjs",
      "name": "SB-03: أساس المقارنة إعداد — الإجمالي بيغيّر راتب المقارنة ونسبته، والتقرير قراءة بس",
      "ms": 79.0646,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: all six independent components appear once in the full salary, SQL snapshot and HTTP payslip",
      "ms": 10539.7025,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ F1: HTTP employee creation accepts phone and work nature without manufacturing otherAllowance",
      "ms": 804.838,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ F2/F3: HTTP phone-only updates and zeroing both split allowances preserve independent OTHER",
      "ms": 2263.721,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: OTHER equal to PHONE plus WORK_NATURE is still independent money and is not deduplicated",
      "ms": 919.4713,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ / PR-06: swapping PHONE and OTHER with the same gross is captured as a changed employee in recalculation audit",
      "ms": 947.0157,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ / PR-10: joining July 1 prorates all six components by 22/30 while monthly day/hour rates stay whole",
      "ms": 404.7271,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: partial salary still uses all six full-month components for one absence, 48 late minutes and one overtime hour",
      "ms": 461.3951,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ / PR-10: eighteen days in a 31-day cycle use /30; complete 31- and 28-day cycles earn every full component",
      "ms": 1269.4769,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ / PR-10: six half-cent components reconcile to gross without a duplicate or lost rounding adjustment",
      "ms": 183.1069,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: approved member snapshot and employee payslip keep original component values after later salary edits",
      "ms": 943.6044,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: null PHONE/WORK_NATURE plus genuine OTHER remain six explicit lines without guessing or rewriting legacy values",
      "ms": 511.7997,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: HTTP settlement preview and saved EOS agree with the payroll gross for all six independent components",
      "ms": 674.1478,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: invalid negative PHONE or WORK_NATURE is rejected over HTTP without changing stored compensation or payroll",
      "ms": 561.5499,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-builder.integration.cjs",
      "name": "RB-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيل البانِي بيشتغل والحفظ بيقول ناقص؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9106.4566,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-builder.integration.cjs",
      "name": "RB-02: القاموس بصلاحيات القارئ — المصدر بصلاحيته، وعمود الراتب بصلاحية حقله، ومن غير صلاحية مركز التقارير مفيش بانِي",
      "ms": 29.1705,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-builder.integration.cjs",
      "name": "RB-03: التشغيل — مفاتيح من القاموس بس وقيم معاملات، بنطاق فرع الموظف الحالي، وصلاحية الحقل عرضًا وفلترًا وتجميعًا؛ والسرّي والمسودة والمعكوس برّه",
      "ms": 430.073,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-builder.integration.cjs",
      "name": "RB-04: الحفظ والمشاركة — بصلاحية الحفظ، لصاحبه، باسم مايتكررش وأدوار موجودة؛ والمشارَك معاه بيشغّله بصلاحياته ونطاقه هو، وعمود مش متاح له = التقرير كله مش متاح",
      "ms": 272.7504,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-01: الميزات التلاتة مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيلات الشاشات بتقول ناقص ومفيش كتابة؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 10555.8452,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-02: ترشيح الزملاء — لدورة مفتوحة للموظف فيها تكليف، من زملاء فرعه على رأس العمل (مش نفسه ولا مديره)، وقراره للمدير المباشر دلوقتي أو صاحب الصلاحية في نطاقه",
      "ms": 410.1034,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-03: الرد والنتيجة — رد واحد لكل دعوة معتمدة والدورة مفتوحة، من غير مقيّم ولا وقت ولا سطر تدقيق؛ والنتيجة بعد قفل الدورة، بحد أدنى للردود، ومش للموظف نفسه",
      "ms": 447.9763,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-04: اجتماعات 1:1 — بيحددها المدير المباشر دلوقتي، لطرفيها بس؛ الأجندة للطرفين والباقي للمدير؛ مهمة المتابعة في محرك المهام؛ وبتظهر في تقويم الطرفين",
      "ms": 628.5921,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-05: التقدير — كلمة شكر لزميل على رأس العمل في فرع المرسل الحالي بحد في اليوم، في قايمة الفرع بس؛ والإخفاء بصلاحيته في نطاقه وبسطر تدقيق",
      "ms": 262.1762,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-01: النماذج والدورات — القيم، ونطاق الفروع، والإطلاق بتكليف لكل موظف شغال بمديره ونسخة نموذج متجمّدة",
      "ms": 8748.2461,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-02: التقييم الذاتي وتقييم المدير — مرة واحدة، على النموذج المتجمّد وأهداف الفترة، والدرجة بالأوزان، والأدلة بتتجمّد مع الرد",
      "ms": 454.5666,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-03: إدارة الأداء — تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات",
      "ms": 168.0611,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-04: الاعتماد والإعلان والإقرار — المدير سلّم ← معتمد ← معلن ← الموظف أقرّ، وتقييم المدير بيظهر للموظف بعد الإعلان بس",
      "ms": 251.0995,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-05: المعايرة والاعتراض — تعديل بسبب قبل الاعتماد بيتسجّل (قبل/بعد/مين)، وتوزيع التقديرات لكل مدير، والاعتراض طلب مربوط بتقييم معلن في مهلته ومرة واحدة، والمعايرة بعد اعتراض اتقبل",
      "ms": 1215.6707,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-punch.integration.cjs",
      "name": "MP-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيلين الشاشة بتقول ناقص ومفيش بصمة؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان",
      "ms": 10246.5729,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-punch.integration.cjs",
      "name": "MP-02: مواقع البصمة — بنطاق الفرع (فرع تاني «مش موجود»)، بإحداثيات ونصف قطر متحكم فيهم، وبسطر تدقيق",
      "ms": 163.9776,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-punch.integration.cjs",
      "name": "MP-03: البصمة — الحكم على الخادم وكل محاولة بتتسجّل: مفيش موقع، دقة ضعيفة، برّه النطاق = مرفوضة من غير بصمة؛ والمقبولة بوقت الخادم من مسار البصمات القايم، ومهلة دقيقة",
      "ms": 587.1099,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-punch.integration.cjs",
      "name": "MP-04: المراجعة — محاولات موظفين نطاق الحساب بفرعهم الحالي (مقبولة ومرفوضة بسببها)، والموظف بيشوف محاولاته هو بس",
      "ms": 67.8389,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-punch.integration.cjs",
      "name": "MP-05 (Codex P5A-B06): رقم البصمة اتنقل لموظف تاني بين الحكم والإدخال — مفيش بصمة بتتكتب لحد غير صاحب الطلب، والمحاولة بتتعلّم «تعذّر»",
      "ms": 157.5438,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-01: الميزة مقفولة افتراضيًا = التبديل زي الأول بالحرف (اعتماد المدير كفاية ومن غير صف موافقة)؛ وقبل ترحيل 166 الشاشة بتقول ناقص؛ والترحيل بشكل الكيان وبيتكرر",
      "ms": 11014.1437,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-02: الميزة مفتوحة — التقديم بيسجّل موافقة «مستني» للطرف التاني، والتنفيذ بيقف لحد ما يوافق؛ والرفض بيوقّفه؛ والقرار لصاحبه بس ومرة واحدة",
      "ms": 723.893,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-03: الطرف التاني اتغيّر عند إعادة التقديم = الموافقة للطرف الجديد؛ وطلب اترفض مايتسجّلش عليه قرار؛ وموافقة لطرف قديم ماتنفّذش تبديل مع غيره",
      "ms": 1048.2299,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-04 (Codex P5A-B07): حالة الميزة جوه معاملة تقديم التبديل بتتقري بمدير المعاملة — قارئ المخزن مابيتناداش، والذاكرة المؤقتة مش شرط، والميزة مقفولة أو مفتوحة",
      "ms": 399.4114,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار والجدول القايم شغال؛ وقبل الترحيلين الشاشة بتقول ناقص؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان",
      "ms": 9782.2012,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-02: أنماط التدوير — بنطاق فرعها (ونمط «كل الفروع» لحساب بكل الفروع)، بورديات مفعّلة، وبسطر تدقيق",
      "ms": 232.1562,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-03: نسخ أسبوع — لموظفين نطاق الحساب بس، واللي له وردية في الهدف بيتساب إلا مع «اكتب فوق»، والهدف مش أسبوع فات",
      "ms": 202.6132,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-04: تطبيق نمط — كل أسبوع وردية الخانة اللي عليها الدور، والموظف برّه النطاق بيتخطّى بسببه، والكتابة بقواعد الجدول القايم",
      "ms": 287.5096,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-05: النشر — سجل لفرع في النطاق بعدد موظفيه، وإشعار لحسابات موظفين الفرع الحاليين اللي لهم وردية في الأسبوع بس؛ وكل نشر صف وإشعار",
      "ms": 454.0509,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-06: قواعد فحص الجدول — بنطاق فرعها وبشدتين؛ الفحص بيشوف الراحة عند تغيير الوردية بين أسبوعين ووردية اليوم الخاص وأيام الراحة؛ والتغطية بالمهارة وشهادتها السارية",
      "ms": 1569.0722,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-07: النشر مع الفحص — مخالفة «منع» بتوقّف النشر من غير أي أثر إلا بسبب تجاوز؛ وكل مخالفات لحظة النشر بتتسجّل عليه، والسبب على مخالفات المنع بس",
      "ms": 163.9102,
      "pass": true,
      "skip": false
    },
    {
      "file": "calendar-range.integration.cjs",
      "name": "week crossing year uses employee working days and excludes the regional holiday, without attendance permission",
      "ms": 8661.4864,
      "pass": true,
      "skip": false
    },
    {
      "file": "calendar-range.integration.cjs",
      "name": "both boundary month queries return the same range count and preserve monthly totals for existing callers",
      "ms": 120.5964,
      "pass": true,
      "skip": false
    },
    {
      "file": "calendar-range.integration.cjs",
      "name": "self-service calendar cannot expose colleagues through a requested range",
      "ms": 76.7869,
      "pass": true,
      "skip": false
    },
    {
      "file": "calendar-range.integration.cjs",
      "name": "malformed, reversed, oversized or nonintersecting calendar ranges are rejected",
      "ms": 17.4068,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 8909.0977,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 119.7753,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 213.784,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 403.7724,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 185.1891,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 544.5852,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 348.1077,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 549.0827,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 3662.3633,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 376.8644,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 1060.5566,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 164.8356,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-1: الملفين LF من غير BOM، من غير عبارة ممنوعة، وأكوادهم فريدة، وأسماء المفاتيح والقيد والفهرس بتاعة الكيانات، وقاعدة synchronize بنفس الشكل",
      "ms": 9803.4535,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-2: المخطط القديم ببيانات قائمة — المُرحّل بيضيف الجداول ويزرع حالة الشركة من غير ما يغيّر صف قائم، والفرق صفر",
      "ms": 6806.5021,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-3: آمن للتكرار، وصف غيّره المالك من الشاشة مايرجعش لقيمة الترحيل",
      "ms": 1615.5249,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-4: التوظيف — من غير مرشحين ولا حامل للصلاحية مقفول؛ ومرشح واحد أو منحة لمستخدم مفعّل",
      "ms": 268.3802,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-5: شكل غلط بيوقف التحقق بكوده ومايسيبش أثر، و077 قبل 076 بيرفض",
      "ms": 665.5017,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-01: الصلاحية — settings.modules بس، والكتابة لحساب على مستوى الشركة",
      "ms": 9311.4863,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-02: الكتالوج — الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات",
      "ms": 4.6787,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-03: التفعيل والقفل من الشاشة — الأثر فوري والتغيير متسجّل باسم اللي عمله",
      "ms": 115.4754,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-04: الرفض — تبعيات وأساسي ومجهول وجسم غلط، ومفيش حاجة بتتكتب",
      "ms": 187.4447,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-05: أثر القفل قبل القفل — الطلبات المفتوحة والبيانات الشغالة",
      "ms": 218.1727,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-06: الباقات — معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات",
      "ms": 310.938,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-07: المزايا الفرعية وجمهور التفعيل من الشاشة",
      "ms": 254.1137,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-08: شاشة الأدوار — صلاحيات الموديول المقفول متعلّمة، والممنوحة منها بتفضل على الدور",
      "ms": 308.5047,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_expense_reports_test_9426938a0291ce70 is absent from sys.databases.",
    "Cleanup verified: hr_comp_cycles_test_5cc1dd4a62124fc1 is absent from sys.databases.",
    "Cleanup verified: hr_salary_bands_test_0dc80782745cccb3 is absent from sys.databases.",
    "Manual: 6000 + 1500 + 500 + 300 + 200 + 100 = 8600; the five allowances total 2600.",
    "Manual: 8600 × 22 / 30 = 6306.666… cut to 6306.66 (money is truncated to 2 decimals); daily basis remains 8600 / 30 = 286.666… and hourly basis 35.833….",
    "Manual (truncated to 2 decimals): 6306.66 − 286.66 − 28.66 + 53.75 = 6045.09. Rates use 8600, not the partial gross.",
    "Manual: 8600 × 18/30 = 5160, even in a 31-day cycle; a complete 31-day or 28-day cycle pays 8600.",
    "Manual EOS agreement: 2024-07-23 → 2026-07-22 = 2 years; 2 × 0.5 × full gross 8600 = 8600; the last-month salary line = run item net 8600.",
    "Cleanup verified: hr_payroll_comp_test_f4cde9d5e02e6088 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_report_builder_test_cded8c5144288888 is absent from sys.databases.",
    "Cleanup verified: hr_people_feedback_test_f98bb44e1406617d is absent from sys.databases.",
    "Cleanup verified: hr_perf_reviews_test_26451568a28fd54a is absent from sys.databases.",
    "Cleanup verified: hr_mobile_punch_test_8c6ef0df86a140fd is absent from sys.databases.",
    "Cleanup verified: hr_swap_consents_test_304a95384b69074d is absent from sys.databases.",
    "Cleanup verified: hr_schedule_tools_test_10e95f43e4e0d81f is absent from sys.databases.",
    "Cleanup verified: hr_modules_test_f639529313db6fba is absent from sys.databases.",
    "Cleanup verified: hr_modules_migration_test_0371dc0bcbd4dd4a is absent from sys.databases.",
    "Cleanup verified: hr_modules_settings_test_6eff176e86409b23 is absent from sys.databases.",
    "tests 95",
    "suites 0",
    "pass 95",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 119911.5798"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_9426938a0291ce70\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_9426938a0291ce70\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comp_cycles_test_5cc1dd4a62124fc1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comp_cycles_test_5cc1dd4a62124fc1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_salary_bands_test_0dc80782745cccb3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_salary_bands_test_0dc80782745cccb3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_comp_test_f4cde9d5e02e6088\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_comp_test_f4cde9d5e02e6088\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_builder_test_cded8c5144288888\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_builder_test_cded8c5144288888\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_people_feedback_test_f98bb44e1406617d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_people_feedback_test_f98bb44e1406617d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_reviews_test_26451568a28fd54a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_reviews_test_26451568a28fd54a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mobile_punch_test_8c6ef0df86a140fd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mobile_punch_test_8c6ef0df86a140fd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_304a95384b69074d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_304a95384b69074d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_schedule_tools_test_10e95f43e4e0d81f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_schedule_tools_test_10e95f43e4e0d81f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_calendar_test_c7d0b8a08e215939\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_calendar_test_c7d0b8a08e215939\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_f639529313db6fba\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_f639529313db6fba\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_migration_test_0371dc0bcbd4dd4a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_migration_test_0371dc0bcbd4dd4a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_settings_test_6eff176e86409b23\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_settings_test_6eff176e86409b23\"}\n"
  ]
}
