module.exports = {
  "selected": [
    "surveys",
    "penalties",
    "cases",
    "helpdesk",
    "performance-goals",
    "performance-reviews",
    "performance-rewards",
    "training",
    "preboarding",
    "policies",
    "tasks",
    "dependents",
    "candidate-applications"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 79,
      "failed": 0,
      "passed": 79,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 79,
      "suites": 0
    },
    "duration_ms": 88726.779
  },
  "results": [
    {
      "file": "surveys.integration.cjs",
      "name": "SV-01: الإدارة — القيم وجمهور حساب الفروع، والمسودة بتتعدّل والمفتوح لأ، والفتح بيعمل دعوة لكل موظف حالي في الجمهور بمجموعته",
      "ms": 7744.9917,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-02: السرية الحقيقية — الرد المجهول من غير موظف ولا ساعة ولا رابط بالدعوة ولا سطر تدقيق، ومرة واحدة، والنتايج بالحد الأدنى ومن غير طرح",
      "ms": 893.8673,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-03: الاستبيان بالاسم بيسجّل الموظف؛ والمقفول واللي فات آخر يومه مابيتردّش عليهم؛ والموديول المقفول",
      "ms": 172.9493,
      "pass": true,
      "skip": false
    },
    {
      "file": "penalties.integration.cjs",
      "name": "PN-01: اللائحة — مخالفة بدرجات تكرارها ونوع خصمها، بالصلاحية، والتعديل بالخانات",
      "ms": 7402.7459,
      "pass": true,
      "skip": false
    },
    {
      "file": "penalties.integration.cjs",
      "name": "PN-02: التوقيع — التكرار في المدة ومطابق للمعاينة، وخصم الأيام خصم مصنّف في سلسلته مربوط بالقضية، ورفض الخصومات مابيسيبش جزاء، والملغى مابيتحسبش",
      "ms": 853.3998,
      "pass": true,
      "skip": false
    },
    {
      "file": "penalties.integration.cjs",
      "name": "PN-03: بصمة المعاينة بتغطّي الجزاء نفسه، وجزاء الخصم حجز لحد ما خصمه يثبت — من غير تكرار زيادة ولا طلب خصم تاني",
      "ms": 494.0035,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.integration.cjs",
      "name": "CS-01: السرية وتعارض المصالح — فتح قضية بالصلاحية، والملف للمطّلعين عليه بس، والمشكو في حقه أو مديره مايتضافوش",
      "ms": 8002.2946,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.integration.cjs",
      "name": "CS-02: الدورة — محقق، إخطار ودفاع، قرار بشرطه، إقفال؛ والطرف شايف اللي له بس؛ والاعتراض في المهلة ومرة واحدة",
      "ms": 733.9994,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.integration.cjs",
      "name": "CS-03: من الطلب — «شكوى» بوجهة «فتح ملف قضية»: الاعتماد النهائي بيفتح ملف واحد، مقدّم الطلب شاكي والمعتمد أول مطّلع",
      "ms": 256.9374,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.integration.cjs",
      "name": "CS-04: مرفق الدليل — رفعه للمطّلعين على قضية بس، وبيتربط بحدثه تحت قفل القضية مرة واحدة، وتحميله بحكم القضية نفسها (حتى لرافعه)",
      "ms": 410.9623,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.integration.cjs",
      "name": "CS-05: المطّلع شخص مش حساب — حساب اتغيّر ربطه مابقاش مطّلع، والتعارض بالهوية الحالية، والإضافة من جديد بقرار مطّلع",
      "ms": 556.8628,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-01: الاستفسار على محرك الطلبات — اعتماد فوري ومهمة على دوره بمهلة، وحالة الخدمة من المهمة، ورد في التعليقات، وإقفال، وتقييم مرة واحدة من صاحبه",
      "ms": 8117.8605,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-02: التقرير بالصلاحية وبنطاق الفروع — العدد والمفتوح ومتوسطات الرد والحل والمتجاوز للمهلتين والرضا؛ والموديول المقفول",
      "ms": 250.7877,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-03: قاعدة المعرفة — الإدارة بالصلاحية وبنطاق الفروع، والموظف بيشوف المنشور اللي في جمهوره بس (بحث بكلمة أو بنوع استفسار)، ولينك لسياسة من غير تكرار",
      "ms": 575.7691,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.integration.cjs",
      "name": "PG-01: الموديول مقفول افتراضيًا؛ وبعد الفتح الموظف يقترح، ومديره المباشر يعتمد أو يرفض بسبب، واللي مالوش دور = غير موجود",
      "ms": 8167.4745,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.integration.cjs",
      "name": "PG-02: التقدّم والتعديل بسبب والقفل والمهمة الدليل — وكل حركة سطر في السجل",
      "ms": 290.7054,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-goals.integration.cjs",
      "name": "PG-03: الموارد البشرية بالصلاحية وبنطاق الفروع — أهداف الأقسام والشركة، و«كل الأهداف» بالفرع الحالي، والقراءة لأصحاب القسم والشركة",
      "ms": 577.713,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-01: النماذج والدورات — القيم، ونطاق الفروع، والإطلاق بتكليف لكل موظف شغال بمديره ونسخة نموذج متجمّدة",
      "ms": 8111.4833,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-02: التقييم الذاتي وتقييم المدير — مرة واحدة، على النموذج المتجمّد وأهداف الفترة، والدرجة بالأوزان، والأدلة بتتجمّد مع الرد",
      "ms": 459.8673,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-03: إدارة الأداء — تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات",
      "ms": 191.9488,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-04: الاعتماد والإعلان والإقرار — المدير سلّم ← معتمد ← معلن ← الموظف أقرّ، وتقييم المدير بيظهر للموظف بعد الإعلان بس",
      "ms": 243.6007,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-05: المعايرة والاعتراض — تعديل بسبب قبل الاعتماد بيتسجّل (قبل/بعد/مين)، وتوزيع التقديرات لكل مدير، والاعتراض طلب مربوط بتقييم معلن في مهلته ومرة واحدة، والمعايرة بعد اعتراض اتقبل",
      "ms": 1227.9899,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-rewards.integration.cjs",
      "name": "RW-01: الاقتراح — بقاعدة تقدير ← قيمة، بنطاق الفروع وبصلاحيتين، للي له مدير مباشر وتقدير بقيمة، ومرة واحدة، ومن غير أي أثر مالي",
      "ms": 7521.3184,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-rewards.integration.cjs",
      "name": "RW-02: التقديم — المدير الموجّه له بس، بطلب مكافأة باسمه في سلسلتها ومرة واحدة، ورفض المكافآت بيرجّع الاقتراح، ولا قيد قبل آخر اعتماد، وصرف النظر",
      "ms": 775.8827,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-rewards.integration.cjs",
      "name": "RW-03: طلب المكافأة ثبت والرد وقع — الاقتراح بيتربط بطلبه، وإعادة المحاولة مابتعملش طلب تاني حتى لو فحص التكرار مقفول",
      "ms": 213.5896,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-01: الموديول مقفول افتراضيًا؛ الكتالوج بقيمه وتعديله بالخانات؛ والجلسات بقيمها ونطاق الفروع",
      "ms": 7797.0476,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-02: التسجيل تحت قفل الجلسة بنطاق الفروع والسعة، والحضور والإكمال، والشهادة مستند موظف بانتهائه، والمقفول مابيتغيّرش",
      "ms": 593.5175,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-03: الموظف — «دوراتي» بشهادته، وتقييم التدريب مرة واحدة بعد الحضور، ومش لتسجيل غيره",
      "ms": 142.7069,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-04: «طلب تدريب» — الجلسة من المتاح لفرع مقدّم الطلب، ورقمها بيثبّته الخادم، والاعتماد النهائي بيسجّله تحت قفل الجلسة والسعة، والجلسة اللي راحت بتوقّف الاعتماد",
      "ms": 885.6103,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-05: ميزانية الأقسام وتقرير التكلفة مقابلها بنطاق الفروع، والتدريب الإلزامي لمسمى أو قسم والناقص منه (لإدارة التدريب، وللمدير عن فريقه)",
      "ms": 532.704,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.integration.cjs",
      "name": "PB-01: with the feature closed (the default) an account whose employee has not started yet gets an ordinary session",
      "ms": 8174.2734,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.integration.cjs",
      "name": "PB-02: with the feature open the session carries the start date and no permissions, and opens the pre-boarding screens only — whatever the role",
      "ms": 1190.3395,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.integration.cjs",
      "name": "PB-03: the mark follows its date — inert from the start day without a new login; the actual start date wins; a later login after the date moved or the feature closed is ordinary",
      "ms": 630.4058,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة",
      "ms": 7665.949,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة",
      "ms": 513.5026,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية",
      "ms": 379.741,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل",
      "ms": 302.1882,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا",
      "ms": 564.8649,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه",
      "ms": 457.1067,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها",
      "ms": 204.1794,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ",
      "ms": 231.7451,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة",
      "ms": 611.3123,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة",
      "ms": 864.2248,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب",
      "ms": 86.238,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-01: مهمة لموظف — في «مهامي» بتاعته بس، ويشوفها أصحاب الحق، وبرّه كده 404",
      "ms": 7753.987,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-02: حدود التكليف — مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، ومن غير كاشف وجود",
      "ms": 136.5331,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-03: المدير المباشر بيكلّف مرؤوسيه من غير صلاحية — مش غيرهم ولا دور",
      "ms": 103.5145,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-04: الحالة — المسؤول يبدأ ويعلّق ويقفل بإثبات، والمنشئ يلغي ويعيد الفتح، وإقفالين في نفس اللحظة واحد بس",
      "ms": 845.6047,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-05: مهمة الدور — لحاملي الدور اللي فرعها في نطاقهم، ومش مدير النظام في «مهامي» بتاعته",
      "ms": 155.9648,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-06: «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم",
      "ms": 1103.115,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-07: «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف",
      "ms": 1258.4044,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-08: قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول",
      "ms": 209.9156,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-09: التعديل والتحويل للمنشئ أو صاحب الصلاحية — التحويل تكليف جديد، وتغيير الموعد بيرجّع التذكير",
      "ms": 568.5943,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-10: التذكير والتصعيد مرة واحدة لكل مهمة وموعد، بأيام الإعدادين، والمقفولة برّه",
      "ms": 668.4997,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-11: التهيئة وقت التعيين — المهام بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة",
      "ms": 1214.4747,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة",
      "ms": 154.2441,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-13: حدود الإعدادين",
      "ms": 157.2745,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-14: إشعارات المهام بالبريد — تكليف وتذكير للمسؤول، وتأخير لمديره، بالعنوان والموعد بس وبفحص وقت الإرسال",
      "ms": 4221.3762,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها",
      "ms": 990.3907,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-16: طلبات متزامنة أكتر من اتصالات المجمّع — كل طلب على اتصال معاملته، ومحدش بيستنى اتصال تاني",
      "ms": 2890.1422,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-17: مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server) — «فريقي» وقايمة التكليف و«مهامي» شغالين",
      "ms": 3887.9562,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-18: مهمة مسوغات التعيين في «مهامي» حالتها من المستندات دلوقتي — من غير ما شاشة التهيئة تتفتح الأول",
      "ms": 500.2808,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.integration.cjs",
      "name": "DP-01: الموارد البشرية — القيم والنطاق بفرع الموظف الحالي، ورقم الهوية المكرر، ومستند الهوية بانتهائه، والتعديل بالمبعوت بس، والحذف بسبب، وسجل التغييرات",
      "ms": 7724.161,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.integration.cjs",
      "name": "DP-02: طلب «تحديث المعالين» — الحقول من الخادم، والاعتماد بيضيف المعال بمستند هويته، والتعديل والحذف لمعال صاحب الطلب بس، والمحذوف بعد التقديم بيوقّف الاعتماد",
      "ms": 756.2963,
      "pass": true,
      "skip": false
    },
    {
      "file": "dependents.integration.cjs",
      "name": "DP-03: ضغطتين مع بعض بنفس رقم الهوية — واحدة بتعدّي والتانية 409، وصف واحد ومستند واحد",
      "ms": 87.5699,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-01: مرشح على وظيفة — المسمى والفرع منها، والنطاق، والحالة، وفحص التكرار، والإضافة من غير وظيفة زي ما هي",
      "ms": 8044.4741,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-02: وظائف داخلية — المنشور داخليًا في فرع الموظف الحالي بس، والتقديم مرة واحدة من بيانات الملف، والحكم بالفرع الحالي",
      "ms": 233.093,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-03: الموديول المقفول بيقفل المسارات، ومن غير دخول 401",
      "ms": 78.1721,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-04: صفحة الوظائف العامة — الميزة المقفولة 404، والمفتوحة بتعرض المنشور «خارجي» بس ومن غير راتب ولا قسم",
      "ms": 135.7187,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-05: التقديم من اللينك — القيم والموافقة والسيرة الذاتية، والمكرر بنفس الرد من غير صف، وغير المنشور خارجيًا غير موجود، والحد 429",
      "ms": 275.8094,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-06: السيرة الذاتية بتتقري بحكم المرشح — مسؤول توظيف فرعه بس",
      "ms": 102.8666,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-07: نقل المراحل — كل نقل سطر في السجل، والجماعي كلهم أو ولا واحد، والسجل بنطاق المرشح واسم اللي نقل بنطاق القارئ",
      "ms": 257.1108,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-08: تحديد مقابلة — القيم، ونطاق المرشح والمحاورين، والبطاقات الفاضية، والدعوة بالبريد",
      "ms": 211.0364,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-09: بطاقات التقييم — المحاور بيسلّم مرة واحدة ومابيشوفش بطاقات غيره قبل ما يسلّم، وبيقرا سيرة المرشح وهو محاور بس",
      "ms": 160.2704,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-10: قفل المقابلة وإلغاؤها وملف الدعوة — من «محددة» بس، والملغاة بتختفي من «مقابلاتي» وبطاقتها مابتتسلّمش",
      "ms": 168.9739,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-11: عرض العمل — القيم والنطاق، وعرض مفتوح واحد، وتحذير النطاق، والاعتماد بصلاحيته ولغير اللي عمله، والإرسال بلينك برمز",
      "ms": 356.2301,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-12: رد المرشح — من اللينك مرة واحدة وبدليله، أو مسجّل من مسؤول التوظيف؛ والمسحوب والمنتهي والميزة المقفولة = اللينك مابيشتغلش",
      "ms": 268.3693,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-13: التعيين من العرض — العرض المقبول مع المرشح في القايمة، والوظيفة بتتقفل لما عدد المُعيَّنين يكمل",
      "ms": 142.5783,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-14: أرقام التوظيف — بنطاق فروع الحساب ومتطابقة مع الصفوف",
      "ms": 62.7187,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_perf_goals_test_53dc155531a9a250 is absent from sys.databases.",
    "Cleanup verified: hr_perf_reviews_test_5f88c9f52d6e2a09 is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_preboarding_test_fb7fb3d002167929",
    "Cleanup verified: hr_policies_test_8326aa7c45d474a7 is absent from sys.databases.",
    "Cleanup verified: hr_tasks_test_cea409bfcbf22197 is absent from sys.databases.",
    "Cleanup verified: hr_candidate_apps_test_292807c671051f83 is absent from sys.databases.",
    "tests 79",
    "suites 0",
    "pass 79",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 88726.779"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_surveys_test_a57bfc7efbd8ee34\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_surveys_test_a57bfc7efbd8ee34\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_dced3f3c9a6c11f6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_dced3f3c9a6c11f6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_cases_test_098042cb4f0602a1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_cases_test_098042cb4f0602a1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_helpdesk_test_8d678a676feb3dd4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_helpdesk_test_8d678a676feb3dd4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_goals_test_53dc155531a9a250\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_goals_test_53dc155531a9a250\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_reviews_test_5f88c9f52d6e2a09\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_reviews_test_5f88c9f52d6e2a09\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_rewards_test_6fa700eacb0117c3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_rewards_test_6fa700eacb0117c3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_training_test_e1dd3e0521d79646\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_training_test_e1dd3e0521d79646\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_preboarding_test_fb7fb3d002167929\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_preboarding_test_fb7fb3d002167929\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policies_test_8326aa7c45d474a7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policies_test_8326aa7c45d474a7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_tasks_test_cea409bfcbf22197\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_tasks_test_cea409bfcbf22197\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dependents_test_d0730d99d3255850\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dependents_test_d0730d99d3255850\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_candidate_apps_test_292807c671051f83\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_candidate_apps_test_292807c671051f83\"}\n"
  ]
}
