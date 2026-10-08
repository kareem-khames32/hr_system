module.exports = {
  "selected": [
    "salary-bands",
    "compensation-cycles",
    "benefits-insurance",
    "benefits-members",
    "benefits-extras",
    "expense-reports",
    "skills",
    "schedule-tools",
    "swap-consents",
    "mobile-punch",
    "safety",
    "timesheets",
    "report-builder",
    "people-feedback"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 74,
      "failed": 0,
      "passed": 74,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 74,
      "suites": 0
    },
    "duration_ms": 119162.9949
  },
  "results": [
    {
      "file": "salary-bands.integration.cjs",
      "name": "SB-01: الموديول مقفول افتراضيًا — تقرير السلّم مش متاح حتى لمدير النظام لحد ما يتفتح",
      "ms": 8675.7062,
      "pass": true,
      "skip": false
    },
    {
      "file": "salary-bands.integration.cjs",
      "name": "SB-02: سلّم الرواتب — نطاق الدرجة ومنتصفه، ونسبة المقارنة والموقع لكل موظف نشط، بصلاحية عرض الرواتب وبنطاق فروع الحساب",
      "ms": 27.2202,
      "pass": true,
      "skip": false
    },
    {
      "file": "salary-bands.integration.cjs",
      "name": "SB-03: أساس المقارنة إعداد — الإجمالي بيغيّر راتب المقارنة ونسبته، والتقرير قراءة بس",
      "ms": 68.3154,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-01: الموديول مقفول = مفيش مسار؛ وقبل الترحيلات الشاشة بتقول ناقص وورقة المدير فاضية؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 10051.8583,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-02: الدورة — بصلاحية الموديول، وفتحها وتحريكها لحساب بكل الفروع، والخطوة من حالتها بس، وضغطتين مع بعض = واحدة، وبسطر تدقيق",
      "ms": 259.7497,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-03: ورقة المدير — مرؤوسيه المباشرين النشطين بس، والمبلغ اللي كتبه ومن غير أي رقم راتب، وغيرهم = مش موجود، واقتراحين مع بعض = سطر واحد",
      "ms": 299.9006,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-04: المراجعة — سطور نطاق الحساب بفرع الموظف الحالي بس، والراتب لصاحب «عرض الرواتب»، والتعديل بسبب ومين عمله، واقتراح المدير بعده مابيغيّرش النهائي",
      "ms": 487.5638,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-05: الميزانية — للوحدة في نطاق الحساب، بتغطي اللي تحتها، وعدّت = تحذير والسطر بيتحفظ؛ وتحت المراجعة المدير مابيقترحش؛ والملغاة مابتتعدّلش",
      "ms": 426.135,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-06: الاعتماد — بصلاحية اعتماد المسير ولحساب بكل الفروع، ومن حد ماقترحش: مش اللي بعتها للمراجعة ولا اللي كتب أو عدّل سطر؛ والرجوع قبل التطبيق",
      "ms": 615.1234,
      "pass": true,
      "skip": false
    },
    {
      "file": "compensation-cycles.integration.cjs",
      "name": "CC-07: التطبيق — من خدمة تاريخ الراتب، سطر سطر: الأساسي اللي اتغيّر بيترفض والباقي بيكمّل، ومابيتكررش، ومرجع الدورة على صف تاريخ الراتب، وضغطتين = مرة واحدة",
      "ms": 702.8582,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-insurance.integration.cjs",
      "name": "BI-01: الموديول مقفول = مفيش مسار (وبيتفتح مع سجل المعالين)؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 10675.6504,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-insurance.integration.cjs",
      "name": "BI-02: الوثيقة — بصلاحية الموديول، والكتابة لحساب بكل الفروع، وحالتها (سارية، هتنتهي قريب، انتهت، متعطّلة)، والتعديل بالمبعوت بس وبسطر تدقيق",
      "ms": 184.0693,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-insurance.integration.cjs",
      "name": "BI-03: الفئات — الاسم فريد في الوثيقة، وافتراضية واحدة، والدرجة لفئة مفعّلة واحدة، وطلبين مع بعض = واحد يعدّي، ومفيش مسح",
      "ms": 343.2494,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-insurance.integration.cjs",
      "name": "BI-04: الأهلية — وثيقة دولة فرع الموظف السارية وفئة درجته (ثم الافتراضية)، للنشطين في نطاق الحساب، وقراءة بس",
      "ms": 170.3926,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-members.integration.cjs",
      "name": "BM-01: قبل ترحيلي 146 و147 — الشاشة بتقول ناقص، وإنهاء الخدمة وحذف المعال زي الأول؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان",
      "ms": 10273.1883,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-members.integration.cjs",
      "name": "BM-02: طلب الإضافة — للموظف أو لمعال مشمول بالتأمين في نطاق الحساب، على وثيقة دولة فرعه وفئته؛ الكشف؛ و«تم» برقم البطاقة = اشتراك ساري واحد",
      "ms": 559.2715,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-members.integration.cjs",
      "name": "BM-03: طلب الحذف من الشاشة — بسبب، لاشتراك ساري في نطاق الحساب، و«تم» بتاريخ النهاية بينهي الاشتراك",
      "ms": 217.1897,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-members.integration.cjs",
      "name": "BM-04: طلبات الحذف اللي بتطلع لوحدها — مع حذف المعال، ومع فتح ملف إنهاء الخدمة (ببند إخلاء طرف)؛ ومن غير اشتراكات مفيش أي حاجة زيادة",
      "ms": 177.8935,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-extras.integration.cjs",
      "name": "BX-01: حصص الموظفين الشهرية — مجموع حصة فئات اشتراكاته السارية (هو ومعاليه)، بعملة فرعه وبنطاق الحساب، وقراءة بس",
      "ms": 10358.2428,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-extras.integration.cjs",
      "name": "BX-02: تذاكر السفر — الميزة الفرعية مقفولة افتراضيًا = مفيش مسار؛ وقبل ترحيل 148 الشاشة بتقول ناقص؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 562.7232,
      "pass": true,
      "skip": false
    },
    {
      "file": "benefits-extras.integration.cjs",
      "name": "BX-03: استحقاق التذاكر بالدرجة — التعريف لحساب بكل الفروع، والعدد من صفر (بيشيل الصف) لحد 12، وطلبين مع بعض = صف واحد، وعدد الموظفين بنطاق الحساب",
      "ms": 219.2477,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 12311.855,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
      "ms": 234.9252,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»",
      "ms": 425.0901,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل",
      "ms": 477.6655,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب",
      "ms": 374.1778,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش",
      "ms": 335.4109,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل",
      "ms": 390.853,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد",
      "ms": 650.582,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد",
      "ms": 772.7972,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند",
      "ms": 174.7786,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة",
      "ms": 852.5035,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع",
      "ms": 920.9972,
      "pass": true,
      "skip": false
    },
    {
      "file": "skills.integration.cjs",
      "name": "SK-01: الموديول مقفول افتراضيًا = مفيش مسار؛ وقبل الترحيلات الشاشة بتقول ناقص وملف الموظف شغال زي ما هو؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 11250.9965,
      "pass": true,
      "skip": false
    },
    {
      "file": "skills.integration.cjs",
      "name": "SK-02: المكتبة — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
      "ms": 153.789,
      "pass": true,
      "skip": false
    },
    {
      "file": "skills.integration.cjs",
      "name": "SK-03: المهارات المطلوبة للوظيفة — لوظائف نطاق الحساب (غيرها «مش موجودة»)، بتتكتب كلها مع بعض، ومهارة مقفولة أو متكررة مرفوضة",
      "ms": 246.2136,
      "pass": true,
      "skip": false
    },
    {
      "file": "skills.integration.cjs",
      "name": "SK-04: تقييم المهارة — لصاحب الصلاحية في نطاقه أو للمدير المباشر (غيرهم «الموظف غير موجود»)، ومحدش بيقيّم نفسه، وصف واحد للموظف والمهارة بسطر تدقيق",
      "ms": 218.1515,
      "pass": true,
      "skip": false
    },
    {
      "file": "skills.integration.cjs",
      "name": "SK-05: الفجوة — مستوفاة، أقل من المطلوب، مش متقيّمة، وشهادة منتهية؛ والمصفوفة بنطاق الحساب بفرع الموظف الحالي، وللمدير على مرؤوسيه، وللموظف على نفسه",
      "ms": 656.9797,
      "pass": true,
      "skip": false
    },
    {
      "file": "skills.integration.cjs",
      "name": "SK-06: الإحلال — سرّي بصلاحيته، وقبل الترحيلين الشاشة بتقول ناقص؛ الوظيفة الحرجة بسبب وفي نطاق الحساب؛ والمرشح على رأس العمل في النطاق ومش شاغل الوظيفة ومش متكرر",
      "ms": 1148.5735,
      "pass": true,
      "skip": false
    },
    {
      "file": "skills.integration.cjs",
      "name": "SK-07: الإحلال — مرشح برّه نطاق القارئ من غير اسم ولا رقم؛ التعديل والشيل تحت نطاق الوظيفة ومن غير مسح؛ وشيل علامة «حرجة» بيخفي الخلفاء؛ والمرشح مايعرفش",
      "ms": 372.6343,
      "pass": true,
      "skip": false
    },
    {
      "file": "skills.integration.cjs",
      "name": "SK-08: شبكة 9-box — ميزة فرعية مقفولة افتراضيًا؛ الأداء من آخر تقييم معلن والإمكانات تقدير لموظفين نطاق الحساب بس، صف واحد للموظف، وبصلاحية الإحلال",
      "ms": 654.4307,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار والجدول القايم شغال؛ وقبل الترحيلين الشاشة بتقول ناقص؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان",
      "ms": 9793.1725,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-02: أنماط التدوير — بنطاق فرعها (ونمط «كل الفروع» لحساب بكل الفروع)، بورديات مفعّلة، وبسطر تدقيق",
      "ms": 217.9906,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-03: نسخ أسبوع — لموظفين نطاق الحساب بس، واللي له وردية في الهدف بيتساب إلا مع «اكتب فوق»، والهدف مش أسبوع فات",
      "ms": 205.3369,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-04: تطبيق نمط — كل أسبوع وردية الخانة اللي عليها الدور، والموظف برّه النطاق بيتخطّى بسببه، والكتابة بقواعد الجدول القايم",
      "ms": 272.3077,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-05: النشر — سجل لفرع في النطاق بعدد موظفيه، وإشعار لحسابات موظفين الفرع الحاليين اللي لهم وردية في الأسبوع بس؛ وكل نشر صف وإشعار",
      "ms": 461.3062,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-06: قواعد فحص الجدول — بنطاق فرعها وبشدتين؛ الفحص بيشوف الراحة عند تغيير الوردية بين أسبوعين ووردية اليوم الخاص وأيام الراحة؛ والتغطية بالمهارة وشهادتها السارية",
      "ms": 1534.6663,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-tools.integration.cjs",
      "name": "ST-07: النشر مع الفحص — مخالفة «منع» بتوقّف النشر من غير أي أثر إلا بسبب تجاوز؛ وكل مخالفات لحظة النشر بتتسجّل عليه، والسبب على مخالفات المنع بس",
      "ms": 143.7755,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-01: الميزة مقفولة افتراضيًا = التبديل زي الأول بالحرف (اعتماد المدير كفاية ومن غير صف موافقة)؛ وقبل ترحيل 166 الشاشة بتقول ناقص؛ والترحيل بشكل الكيان وبيتكرر",
      "ms": 11058.8649,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-02: الميزة مفتوحة — التقديم بيسجّل موافقة «مستني» للطرف التاني، والتنفيذ بيقف لحد ما يوافق؛ والرفض بيوقّفه؛ والقرار لصاحبه بس ومرة واحدة",
      "ms": 692.0619,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-03: الطرف التاني اتغيّر عند إعادة التقديم = الموافقة للطرف الجديد؛ وطلب اترفض مايتسجّلش عليه قرار؛ وموافقة لطرف قديم ماتنفّذش تبديل مع غيره",
      "ms": 1071.5077,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-punch.integration.cjs",
      "name": "MP-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيلين الشاشة بتقول ناقص ومفيش بصمة؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان",
      "ms": 10460.7109,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-punch.integration.cjs",
      "name": "MP-02: مواقع البصمة — بنطاق الفرع (فرع تاني «مش موجود»)، بإحداثيات ونصف قطر متحكم فيهم، وبسطر تدقيق",
      "ms": 188.7414,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-punch.integration.cjs",
      "name": "MP-03: البصمة — الحكم على الخادم وكل محاولة بتتسجّل: مفيش موقع، دقة ضعيفة، برّه النطاق = مرفوضة من غير بصمة؛ والمقبولة بوقت الخادم من مسار البصمات القايم، ومهلة دقيقة",
      "ms": 640.8246,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-punch.integration.cjs",
      "name": "MP-04: المراجعة — محاولات موظفين نطاق الحساب بفرعهم الحالي (مقبولة ومرفوضة بسببها)، والموظف بيشوف محاولاته هو بس",
      "ms": 74.348,
      "pass": true,
      "skip": false
    },
    {
      "file": "safety.integration.cjs",
      "name": "SF-01: الموديول مقفول افتراضيًا = مفيش مسار؛ وقبل الترحيلين الشاشة بتقول ناقص ومفيش بلاغ؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان",
      "ms": 9634.1452,
      "pass": true,
      "skip": false
    },
    {
      "file": "safety.integration.cjs",
      "name": "SF-02: البلاغ — من موظف على رأس العمل على فرعه الحالي، بقيم متحكم فيها، وبحد أقصى في اليوم؛ والمبلّغ بيشوف بلاغاته وحالتها بس",
      "ms": 205.0761,
      "pass": true,
      "skip": false
    },
    {
      "file": "safety.integration.cjs",
      "name": "SF-03: السجل — بصلاحيته وبنطاق فرع الحادث (فرع تاني «مش موجود»)، والمراجعة بقيمها والمصاب من نطاق الحساب، والاسم بيتحجب بفرع الموظف الحالي",
      "ms": 171.8361,
      "pass": true,
      "skip": false
    },
    {
      "file": "safety.integration.cjs",
      "name": "SF-04: الإجراءات التصحيحية ومهمة إبلاغ الجهة مهام في محرك المهام؛ والقفل بيشترط الشدة والسبب وإن كل مهام الحادث اتقفلت؛ والمقفول مابيتعدّلش",
      "ms": 429.8182,
      "pass": true,
      "skip": false
    },
    {
      "file": "safety.integration.cjs",
      "name": "SF-05: ربط إجازة المصاب — إجازة معتمدة للمصاب نفسه آخرها من يوم الحادث؛ وتغيير المصاب بيفك الربط؛ وكل كتابة بسطر تدقيق",
      "ms": 623.0438,
      "pass": true,
      "skip": false
    },
    {
      "file": "timesheets.integration.cjs",
      "name": "TS-01: الموديول مقفول افتراضيًا = مفيش مسار؛ وقبل الترحيلات الشاشة بتقول ناقص ومفيش تسجيل؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 10620.3756,
      "pass": true,
      "skip": false
    },
    {
      "file": "timesheets.integration.cjs",
      "name": "TS-02: المشاريع — بصلاحيتها وبنطاق الفرع (لكل الفروع = حساب بكل الفروع)، بمهامها اللي بتتضاف وتتعدّل وتتقفل، وبسطر تدقيق",
      "ms": 246.7574,
      "pass": true,
      "skip": false
    },
    {
      "file": "timesheets.integration.cjs",
      "name": "TS-03: تسجيل الساعات — لموظف على رأس العمل، على مشروع مفعّل ومتاح لفرعه، بقيم متحكم فيها ومجموع يوم 24 ساعة؛ ودقايق الحضور المحسوبة جنب المسجّل",
      "ms": 277.1651,
      "pass": true,
      "skip": false
    },
    {
      "file": "timesheets.integration.cjs",
      "name": "TS-04: الإرسال والسحب وقرار المدير — الأسبوع المبعوت مابيتعدّلش، والقرار للمدير المباشر دلوقتي أو لصاحب الصلاحية في نطاقه (غير كده «مش موجود»)، ومحدش بيعتمد أسبوعه",
      "ms": 739.9538,
      "pass": true,
      "skip": false
    },
    {
      "file": "timesheets.integration.cjs",
      "name": "TS-05: التقرير — الأسابيع المعتمدة بس، لموظفين نطاق القارئ، لكل مشروع ومهمة وموظف؛ والتكلفة ورا ميزتها المقفولة وصلاحية عرض الرواتب، واللي راتبه مش متحدد «من غير تسعير»",
      "ms": 586.3701,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-builder.integration.cjs",
      "name": "RB-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيل البانِي بيشتغل والحفظ بيقول ناقص؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 12999.3452,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-builder.integration.cjs",
      "name": "RB-02: القاموس بصلاحيات القارئ — المصدر بصلاحيته، وعمود الراتب بصلاحية حقله، ومن غير صلاحية مركز التقارير مفيش بانِي",
      "ms": 110.5142,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-builder.integration.cjs",
      "name": "RB-03: التشغيل — مفاتيح من القاموس بس وقيم معاملات، بنطاق فرع الموظف الحالي، وصلاحية الحقل عرضًا وفلترًا وتجميعًا؛ والسرّي والمسودة والمعكوس برّه",
      "ms": 566.3081,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-builder.integration.cjs",
      "name": "RB-04: الحفظ والمشاركة — بصلاحية الحفظ، لصاحبه، باسم مايتكررش وأدوار موجودة؛ والمشارَك معاه بيشغّله بصلاحياته ونطاقه هو، وعمود مش متاح له = التقرير كله مش متاح",
      "ms": 710.477,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-01: الميزات التلاتة مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيلات الشاشات بتقول ناقص ومفيش كتابة؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 14240.8796,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-02: ترشيح الزملاء — لدورة مفتوحة للموظف فيها تكليف، من زملاء فرعه على رأس العمل (مش نفسه ولا مديره)، وقراره للمدير المباشر دلوقتي أو صاحب الصلاحية في نطاقه",
      "ms": 868.2757,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-03: الرد والنتيجة — رد واحد لكل دعوة معتمدة والدورة مفتوحة، من غير مقيّم ولا وقت ولا سطر تدقيق؛ والنتيجة بعد قفل الدورة، بحد أدنى للردود، ومش للموظف نفسه",
      "ms": 562.9046,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-04: اجتماعات 1:1 — بيحددها المدير المباشر دلوقتي، لطرفيها بس؛ الأجندة للطرفين والباقي للمدير؛ مهمة المتابعة في محرك المهام؛ وبتظهر في تقويم الطرفين",
      "ms": 1369.1659,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-05: التقدير — كلمة شكر لزميل على رأس العمل في فرع المرسل الحالي بحد في اليوم، في قايمة الفرع بس؛ والإخفاء بصلاحيته في نطاقه وبسطر تدقيق",
      "ms": 729.7124,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_salary_bands_test_d699fec66879cd1b is absent from sys.databases.",
    "Cleanup verified: hr_comp_cycles_test_f8308193fdc21a27 is absent from sys.databases.",
    "Cleanup verified: hr_benefits_test_4cad4b3feaf2dafc is absent from sys.databases.",
    "Cleanup verified: hr_benefit_members_test_63a8315fa2e68c9c is absent from sys.databases.",
    "Cleanup verified: hr_benefit_extras_test_dac89ae318f664ab is absent from sys.databases.",
    "Cleanup verified: hr_expense_reports_test_7312f4f246341b58 is absent from sys.databases.",
    "Cleanup verified: hr_skills_test_92f3860829eb11d5 is absent from sys.databases.",
    "Cleanup verified: hr_schedule_tools_test_2a66fc0697fd2ec9 is absent from sys.databases.",
    "Cleanup verified: hr_swap_consents_test_bfb029f4fcb61c56 is absent from sys.databases.",
    "Cleanup verified: hr_mobile_punch_test_b1a6e48f3b929135 is absent from sys.databases.",
    "Cleanup verified: hr_safety_test_e4a6a380c4b6f433 is absent from sys.databases.",
    "Cleanup verified: hr_timesheets_test_49016fe89107e591 is absent from sys.databases.",
    "Cleanup verified: hr_report_builder_test_9191d0c6671ed808 is absent from sys.databases.",
    "Cleanup verified: hr_people_feedback_test_45fa75baebea79b5 is absent from sys.databases.",
    "tests 74",
    "suites 0",
    "pass 74",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 119162.9949"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_salary_bands_test_d699fec66879cd1b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_salary_bands_test_d699fec66879cd1b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comp_cycles_test_f8308193fdc21a27\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comp_cycles_test_f8308193fdc21a27\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_benefits_test_4cad4b3feaf2dafc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_benefits_test_4cad4b3feaf2dafc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_benefit_members_test_63a8315fa2e68c9c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_benefit_members_test_63a8315fa2e68c9c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_benefit_extras_test_dac89ae318f664ab\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_benefit_extras_test_dac89ae318f664ab\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_7312f4f246341b58\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_7312f4f246341b58\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_skills_test_92f3860829eb11d5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_skills_test_92f3860829eb11d5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_schedule_tools_test_2a66fc0697fd2ec9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_schedule_tools_test_2a66fc0697fd2ec9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_bfb029f4fcb61c56\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_bfb029f4fcb61c56\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mobile_punch_test_b1a6e48f3b929135\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mobile_punch_test_b1a6e48f3b929135\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_safety_test_e4a6a380c4b6f433\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_safety_test_e4a6a380c4b6f433\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_timesheets_test_49016fe89107e591\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_timesheets_test_49016fe89107e591\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_builder_test_9191d0c6671ed808\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_builder_test_9191d0c6671ed808\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_people_feedback_test_45fa75baebea79b5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_people_feedback_test_45fa75baebea79b5\"}\n"
  ]
}
