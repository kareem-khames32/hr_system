module.exports = {
  "selected": [
    "onboarding-templates",
    "preboarding",
    "probation",
    "recruitment-jobs",
    "candidate-applications",
    "performance-goals",
    "performance-reviews",
    "performance-rewards",
    "training",
    "helpdesk",
    "cases",
    "penalties",
    "surveys",
    "dependents",
    "phase3-migrations",
    "onboarding-templates-migration",
    "recruitment-jobs-migration"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 65,
      "failed": 0,
      "passed": 65,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 65,
      "suites": 0
    },
    "duration_ms": 118175.1157
  },
  "results": [
    {
      "file": "onboarding-templates.integration.cjs",
      "name": "OT-01: من غير قالب بنطاق السلوك القايم بالحرف؛ والمدخلات الغلط 400، ومن غير الصلاحية 403، وقالب مش موجود 404",
      "ms": 7482.6629,
      "pass": true,
      "skip": false
    },
    {
      "file": "onboarding-templates.integration.cjs",
      "name": "OT-02: القالب بيبدأ بنسخة من العام وبنوده مستقلة؛ الموظف بياخد أدق قالب مفعّل بيطابق ملفه؛ والمعطّل والفاضي = اللي بعده ثم العام",
      "ms": 802.4779,
      "pass": true,
      "skip": false
    },
    {
      "file": "onboarding-templates.integration.cjs",
      "name": "OT-03: حساب الفرع بيشوف ويدير قوالب فرعه بس؛ وقالب لكل الفروع أو لفرع برّه نطاقه وبنوده غير موجود له",
      "ms": 187.2509,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.integration.cjs",
      "name": "PB-01: with the feature closed (the default) an account whose employee has not started yet gets an ordinary session",
      "ms": 8146.4241,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.integration.cjs",
      "name": "PB-02: with the feature open the session carries the start date and no permissions, and opens the pre-boarding screens only — whatever the role",
      "ms": 970.8477,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.integration.cjs",
      "name": "PB-03: the mark follows its date — inert from the start day without a new login; the actual start date wins; a later login after the date moved or the feature closed is ordinary",
      "ms": 669.745,
      "pass": true,
      "skip": false
    },
    {
      "file": "probation.integration.cjs",
      "name": "PR-01: the list follows the reader — HR by branch scope, the direct manager his own reports, nearest end first, with the default duration for a file without an end date",
      "ms": 7374.6809,
      "pass": true,
      "skip": false
    },
    {
      "file": "probation.integration.cjs",
      "name": "PR-02: confirm, extend and terminate are recorded in the employee change log, by the direct manager or HR of the employee's branch only, and a row that changed after the judgment is refused",
      "ms": 402.5634,
      "pass": true,
      "skip": false
    },
    {
      "file": "probation.integration.cjs",
      "name": "PR-03: the daily job opens one decision task per end date on the direct manager (or HR), and the recorded decision closes it",
      "ms": 325.1617,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-01: طلب «احتياج توظيف» — حقوله من الخادم، وفحوص التقديم، والقسم المتثبّت، والاعتماد بيعمل وظيفة مسودة بمرجعها",
      "ms": 8063.9633,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-02: شاشة الوظائف — بصلاحية إدارة التوظيف وبنطاق فروع الحساب؛ الإنشاء والتعديل بالخانات؛ والوحدة مابتتغيّرش؛ واسم القسم بفرعه الحالي",
      "ms": 344.2233,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-03: الحالة — النشر محتاج وصف ومكان نشر، منشورة ↔ موقوفة، والقفل نهائي، وكل تغيير في سجل التدقيق، والموديول المقفول بيقفل المسارات",
      "ms": 339.7008,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-01: مرشح على وظيفة — المسمى والفرع منها، والنطاق، والحالة، وفحص التكرار، والإضافة من غير وظيفة زي ما هي",
      "ms": 7632.1429,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-02: وظائف داخلية — المنشور داخليًا في فرع الموظف الحالي بس، والتقديم مرة واحدة من بيانات الملف، والحكم بالفرع الحالي",
      "ms": 236.9596,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-03: الموديول المقفول بيقفل المسارات، ومن غير دخول 401",
      "ms": 86.5486,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-04: صفحة الوظائف العامة — الميزة المقفولة 404، والمفتوحة بتعرض المنشور «خارجي» بس ومن غير راتب ولا قسم",
      "ms": 154.7693,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-05: التقديم من اللينك — القيم والموافقة والسيرة الذاتية، والمكرر بنفس الرد من غير صف، وغير المنشور خارجيًا غير موجود، والحد 429",
      "ms": 218.5088,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-06: السيرة الذاتية بتتقري بحكم المرشح — مسؤول توظيف فرعه بس",
      "ms": 91.3936,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-07: نقل المراحل — كل نقل سطر في السجل، والجماعي كلهم أو ولا واحد، والسجل بنطاق المرشح واسم اللي نقل بنطاق القارئ",
      "ms": 234.3243,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-08: تحديد مقابلة — القيم، ونطاق المرشح والمحاورين، والبطاقات الفاضية، والدعوة بالبريد",
      "ms": 273.1142,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-09: بطاقات التقييم — المحاور بيسلّم مرة واحدة ومابيشوفش بطاقات غيره قبل ما يسلّم، وبيقرا سيرة المرشح وهو محاور بس",
      "ms": 168.1009,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-10: قفل المقابلة وإلغاؤها وملف الدعوة — من «محددة» بس، والملغاة بتختفي من «مقابلاتي» وبطاقتها مابتتسلّمش",
      "ms": 172.5584,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-11: عرض العمل — القيم والنطاق، وعرض مفتوح واحد، وتحذير النطاق، والاعتماد بصلاحيته ولغير اللي عمله، والإرسال بلينك برمز",
      "ms": 364.892,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-12: رد المرشح — من اللينك مرة واحدة وبدليله، أو مسجّل من مسؤول التوظيف؛ والمسحوب والمنتهي والميزة المقفولة = اللينك مابيشتغلش",
      "ms": 245.5396,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-13: التعيين من العرض — العرض المقبول مع المرشح في القايمة، والوظيفة بتتقفل لما عدد المُعيَّنين يكمل",
      "ms": 124.388,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-14: أرقام التوظيف — بنطاق فروع الحساب ومتطابقة مع الصفوف",
      "ms": 81.2962,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.integration.cjs",
      "name": "PG-01: الموديول مقفول افتراضيًا؛ وبعد الفتح الموظف يقترح، ومديره المباشر يعتمد أو يرفض بسبب، واللي مالوش دور = غير موجود",
      "ms": 7929.6802,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.integration.cjs",
      "name": "PG-02: التقدّم والتعديل بسبب والقفل والمهمة الدليل — وكل حركة سطر في السجل",
      "ms": 314.2912,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.integration.cjs",
      "name": "PG-03: الموارد البشرية بالصلاحية وبنطاق الفروع — أهداف الأقسام والشركة، و«كل الأهداف» بالفرع الحالي، والقراءة لأصحاب القسم والشركة",
      "ms": 501.7246,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-01: النماذج والدورات — القيم، ونطاق الفروع، والإطلاق بتكليف لكل موظف شغال بمديره ونسخة نموذج متجمّدة",
      "ms": 7773.4601,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-02: التقييم الذاتي وتقييم المدير — مرة واحدة، على النموذج المتجمّد وأهداف الفترة، والدرجة بالأوزان، والأدلة بتتجمّد مع الرد",
      "ms": 435.0978,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-03: إدارة الأداء — تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات",
      "ms": 179.9686,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-04: الاعتماد والإعلان والإقرار — المدير سلّم ← معتمد ← معلن ← الموظف أقرّ، وتقييم المدير بيظهر للموظف بعد الإعلان بس",
      "ms": 218.9332,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-05: المعايرة والاعتراض — تعديل بسبب قبل الاعتماد بيتسجّل (قبل/بعد/مين)، وتوزيع التقديرات لكل مدير، والاعتراض طلب مربوط بتقييم معلن في مهلته ومرة واحدة، والمعايرة بعد اعتراض اتقبل",
      "ms": 1074.5422,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-rewards.integration.cjs",
      "name": "RW-01: الاقتراح — بقاعدة تقدير ← قيمة، بنطاق الفروع وبصلاحيتين، للي له مدير مباشر وتقدير بقيمة، ومرة واحدة، ومن غير أي أثر مالي",
      "ms": 7380.5168,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-rewards.integration.cjs",
      "name": "RW-02: التقديم — المدير الموجّه له بس، بطلب مكافأة باسمه في سلسلتها ومرة واحدة، ورفض المكافآت بيرجّع الاقتراح، ولا قيد قبل آخر اعتماد، وصرف النظر",
      "ms": 575.2217,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-01: الموديول مقفول افتراضيًا؛ الكتالوج بقيمه وتعديله بالخانات؛ والجلسات بقيمها ونطاق الفروع",
      "ms": 7998.191,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-02: التسجيل تحت قفل الجلسة بنطاق الفروع والسعة، والحضور والإكمال، والشهادة مستند موظف بانتهائه، والمقفول مابيتغيّرش",
      "ms": 659.1006,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-03: الموظف — «دوراتي» بشهادته، وتقييم التدريب مرة واحدة بعد الحضور، ومش لتسجيل غيره",
      "ms": 153.8843,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-04: «طلب تدريب» — الجلسة من المتاح لفرع مقدّم الطلب، ورقمها بيثبّته الخادم، والاعتماد النهائي بيسجّله تحت قفل الجلسة والسعة، والجلسة اللي راحت بتوقّف الاعتماد",
      "ms": 853.5172,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-05: ميزانية الأقسام وتقرير التكلفة مقابلها بنطاق الفروع، والتدريب الإلزامي لمسمى أو قسم والناقص منه (لإدارة التدريب، وللمدير عن فريقه)",
      "ms": 491.5671,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-01: الاستفسار على محرك الطلبات — اعتماد فوري ومهمة على دوره بمهلة، وحالة الخدمة من المهمة، ورد في التعليقات، وإقفال، وتقييم مرة واحدة من صاحبه",
      "ms": 8357.211,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-02: التقرير بالصلاحية وبنطاق الفروع — العدد والمفتوح ومتوسطات الرد والحل والمتجاوز للمهلتين والرضا؛ والموديول المقفول",
      "ms": 278.1771,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-03: قاعدة المعرفة — الإدارة بالصلاحية وبنطاق الفروع، والموظف بيشوف المنشور اللي في جمهوره بس (بحث بكلمة أو بنوع استفسار)، ولينك لسياسة من غير تكرار",
      "ms": 324.3256,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.integration.cjs",
      "name": "CS-01: السرية وتعارض المصالح — فتح قضية بالصلاحية، والملف للمطّلعين عليه بس، والمشكو في حقه أو مديره مايتضافوش",
      "ms": 7676.1014,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.integration.cjs",
      "name": "CS-02: الدورة — محقق، إخطار ودفاع، قرار بشرطه، إقفال؛ والطرف شايف اللي له بس؛ والاعتراض في المهلة ومرة واحدة",
      "ms": 596.7378,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.integration.cjs",
      "name": "CS-03: من الطلب — «شكوى» بوجهة «فتح ملف قضية»: الاعتماد النهائي بيفتح ملف واحد، مقدّم الطلب شاكي والمعتمد أول مطّلع",
      "ms": 279.7052,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.integration.cjs",
      "name": "CS-04: مرفق الدليل — رفعه للمطّلعين على قضية بس، وبيتربط بحدثه تحت قفل القضية مرة واحدة، وتحميله بحكم القضية نفسها (حتى لرافعه)",
      "ms": 368.5548,
      "pass": true,
      "skip": false
    },
    {
      "file": "penalties.integration.cjs",
      "name": "PN-01: اللائحة — مخالفة بدرجات تكرارها ونوع خصمها، بالصلاحية، والتعديل بالخانات",
      "ms": 7242.3649,
      "pass": true,
      "skip": false
    },
    {
      "file": "penalties.integration.cjs",
      "name": "PN-02: التوقيع — التكرار في المدة ومطابق للمعاينة، وخصم الأيام خصم مصنّف في سلسلته مربوط بالقضية، ورفض الخصومات مابيسيبش جزاء، والملغى مابيتحسبش",
      "ms": 684.8594,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-01: الإدارة — القيم وجمهور حساب الفروع، والمسودة بتتعدّل والمفتوح لأ، والفتح بيعمل دعوة لكل موظف حالي في الجمهور بمجموعته",
      "ms": 7764.6933,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-02: السرية الحقيقية — الرد المجهول من غير موظف ولا ساعة ولا رابط بالدعوة ولا سطر تدقيق، ومرة واحدة، والنتايج بالحد الأدنى ومن غير طرح",
      "ms": 451.314,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-03: الاستبيان بالاسم بيسجّل الموظف؛ والمقفول واللي فات آخر يومه مابيتردّش عليهم؛ والموديول المقفول",
      "ms": 186.3547,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.integration.cjs",
      "name": "DP-01: الموارد البشرية — القيم والنطاق بفرع الموظف الحالي، ورقم الهوية المكرر، ومستند الهوية بانتهائه، والتعديل بالمبعوت بس، والحذف بسبب، وسجل التغييرات",
      "ms": 7836.1975,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.integration.cjs",
      "name": "DP-02: طلب «تحديث المعالين» — الحقول من الخادم، والاعتماد بيضيف المعال بمستند هويته، والتعديل والحذف لمعال صاحب الطلب بس، والمحذوف بعد التقديم بيوقّف الاعتماد",
      "ms": 802.2849,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.integration.cjs",
      "name": "DP-03: ضغطتين مع بعض بنفس رقم الهوية — واحدة بتعدّي والتانية 409، وصف واحد ومستند واحد",
      "ms": 100.658,
      "pass": true,
      "skip": false
    },
    {
      "file": "phase3-migrations.integration.cjs",
      "name": "P3M-1: كل ملف LF من غير BOM ومن غير عبارة ممنوعة، وبكودين THROW بتوعه، والأكواد فريدة بين كل الملفات",
      "ms": 8209.4222,
      "pass": true,
      "skip": false
    },
    {
      "file": "phase3-migrations.integration.cjs",
      "name": "P3M-2: على قاعدة synchronize كل ملف بيعدّي من غير تغيير — شكل الكيان = شكل الترحيل",
      "ms": 4438.1732,
      "pass": true,
      "skip": false
    },
    {
      "file": "phase3-migrations.integration.cjs",
      "name": "P3M-3: من غير الجدول الملف بيعمله بنفس الشكل، وتشغيله تاني آمن، وجدول بشكل تاني بيوقّف الترحيل قبل أي تغيير",
      "ms": 7446.9132,
      "pass": true,
      "skip": false
    },
    {
      "file": "onboarding-templates-migration.integration.cjs",
      "name": "OTM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 8388.8103,
      "pass": true,
      "skip": false
    },
    {
      "file": "onboarding-templates-migration.integration.cjs",
      "name": "OTM-2: من غير الجدول والعمود التهيئة زي الأول؛ وجدول أو عمود بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر",
      "ms": 6621.8303,
      "pass": true,
      "skip": false
    },
    {
      "file": "onboarding-templates-migration.integration.cjs",
      "name": "OTM-3: آمن للتكرار",
      "ms": 916.8685,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs-migration.integration.cjs",
      "name": "RJM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 8846.1522,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs-migration.integration.cjs",
      "name": "RJM-2: من غير الجدول الوظائف بتقول إن الترحيل ناقص والمرشحين زي الأول؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر",
      "ms": 5784.7503,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs-migration.integration.cjs",
      "name": "RJM-3: آمن للتكرار",
      "ms": 835.5905,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_onb_templates_test_1d2a071ec6040417 is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_preboarding_test_2f2362eed3152615",
    "تحقق حذف قاعدة الاختبار: hr_probation_test_6cf3faffa0a1ff5d",
    "Cleanup verified: hr_recruitment_jobs_test_5d306b8969d259ed is absent from sys.databases.",
    "Cleanup verified: hr_candidate_apps_test_762abfde9324fea1 is absent from sys.databases.",
    "Cleanup verified: hr_perf_goals_test_f880990731f9cfb4 is absent from sys.databases.",
    "Cleanup verified: hr_perf_reviews_test_ea64bf7799f8b109 is absent from sys.databases.",
    "Cleanup verified: hr_p3_migrations_test_3bd3cdc0b9f84835 is absent from sys.databases.",
    "Cleanup verified: hr_onb_tpl_migration_test_951d34c6b068a12a is absent from sys.databases.",
    "Cleanup verified: hr_recruit_migration_test_5f1982e1d3d1ff1d is absent from sys.databases.",
    "tests 65",
    "suites 0",
    "pass 65",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 118175.1157"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_onb_templates_test_1d2a071ec6040417\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_onb_templates_test_1d2a071ec6040417\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_preboarding_test_2f2362eed3152615\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_preboarding_test_2f2362eed3152615\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_probation_test_6cf3faffa0a1ff5d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_probation_test_6cf3faffa0a1ff5d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recruitment_jobs_test_5d306b8969d259ed\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recruitment_jobs_test_5d306b8969d259ed\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_candidate_apps_test_762abfde9324fea1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_candidate_apps_test_762abfde9324fea1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_goals_test_f880990731f9cfb4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_goals_test_f880990731f9cfb4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_reviews_test_ea64bf7799f8b109\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_reviews_test_ea64bf7799f8b109\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_rewards_test_2cccec9c593df0be\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_rewards_test_2cccec9c593df0be\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_training_test_797aca7bb94504a6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_training_test_797aca7bb94504a6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_helpdesk_test_9a4c7002b5d4d4b5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_helpdesk_test_9a4c7002b5d4d4b5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_cases_test_c2a0a42eb8fed220\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_cases_test_c2a0a42eb8fed220\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_6085dab468134444\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_6085dab468134444\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_surveys_test_f6cd512dbf8012ab\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_surveys_test_f6cd512dbf8012ab\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dependents_test_ccd3f77fbdac4ef3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dependents_test_ccd3f77fbdac4ef3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_p3_migrations_test_3bd3cdc0b9f84835\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_p3_migrations_test_3bd3cdc0b9f84835\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_onb_tpl_migration_test_951d34c6b068a12a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_onb_tpl_migration_test_951d34c6b068a12a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recruit_migration_test_5f1982e1d3d1ff1d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recruit_migration_test_5f1982e1d3d1ff1d\"}\n"
  ]
}
