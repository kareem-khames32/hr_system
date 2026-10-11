module.exports = {
  "selected": [
    "announcements",
    "surveys",
    "helpdesk",
    "policies",
    "modules-settings",
    "modules-enforcement",
    "tasks",
    "overtime-auto-approve-period",
    "request-audience-conditions",
    "candidate-applications",
    "recruitment-jobs",
    "notifications",
    "notifications-migration",
    "report-metrics",
    "team-dashboard",
    "comments",
    "holiday-work",
    "attendance-calendar-history",
    "employee-custom-fields"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 166,
      "failed": 1,
      "passed": 165,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 166,
      "suites": 0
    },
    "duration_ms": 233087.2649
  },
  "results": [
    {
      "file": "announcements.integration.cjs",
      "name": "AN-01: the module is closed until opened; a draft is judged field by field; a branch account manages announcements of its own branches only",
      "ms": 11409.0244,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-02: an announcement for one branch does not show to another branch; pinned first; reading is recorded once by the employee himself",
      "ms": 844.0539,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-03: the read report lists the announcement audience inside the reader's branches — who read and when, and who has not",
      "ms": 163.0634,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-04: publishing notifies the audience accounts once, judged again when the mail leaves and when the list is read",
      "ms": 2155.2121,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-05: an announcement attachment is uploaded by a manager, bound to a draft once, and read by the announcement's own rule",
      "ms": 795.9265,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-06: the occasions feature is closed by default; open, it lists branch colleagues' birthdays and service anniversaries without the birth year",
      "ms": 323.2294,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-01: الإدارة — القيم وجمهور حساب الفروع، والمسودة بتتعدّل والمفتوح لأ، والفتح بيعمل دعوة لكل موظف حالي في الجمهور بمجموعته",
      "ms": 11834.3659,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-02: السرية الحقيقية — الرد المجهول من غير موظف ولا ساعة ولا رابط بالدعوة ولا سطر تدقيق، ومرة واحدة، والنتايج بالحد الأدنى ومن غير طرح",
      "ms": 1043.1779,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-03: الاستبيان بالاسم بيسجّل الموظف؛ والمقفول واللي فات آخر يومه مابيتردّش عليهم؛ والموديول المقفول",
      "ms": 240.3579,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-04: Codex P3L-B02 — الإخفاء التكميلي لكل سؤال، والقفل بيستنى الرد الجاري فالنتايج بعده ثابتة",
      "ms": 6522.9228,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-01: الاستفسار على محرك الطلبات — اعتماد فوري ومهمة على دوره بمهلة، وحالة الخدمة من المهمة، ورد في التعليقات، وإقفال، وتقييم مرة واحدة من صاحبه",
      "ms": 12864.5102,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-02: التقرير بالصلاحية وبنطاق الفروع — العدد والمفتوح ومتوسطات الرد والحل والمتجاوز للمهلتين والرضا؛ والموديول المقفول",
      "ms": 321.9394,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-03: قاعدة المعرفة — الإدارة بالصلاحية وبنطاق الفروع، والموظف بيشوف المنشور اللي في جمهوره بس (بحث بكلمة أو بنوع استفسار)، ولينك لسياسة من غير تكرار",
      "ms": 743.1604,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة",
      "ms": 12015.6597,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة",
      "ms": 727.3147,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية",
      "ms": 508.2426,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل",
      "ms": 291.4025,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا",
      "ms": 651.8145,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه",
      "ms": 628.9524,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها",
      "ms": 253.8185,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ",
      "ms": 330.238,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة",
      "ms": 706.2939,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة",
      "ms": 980.4038,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب",
      "ms": 106.357,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-01: الصلاحية — settings.modules بس، والكتابة لحساب على مستوى الشركة",
      "ms": 11573.7881,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-02: الكتالوج — الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات",
      "ms": 4.6461,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-03: التفعيل والقفل من الشاشة — الأثر فوري والتغيير متسجّل باسم اللي عمله",
      "ms": 143.5485,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-04: الرفض — تبعيات وأساسي ومجهول وجسم غلط، ومفيش حاجة بتتكتب",
      "ms": 199.4572,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-05: أثر القفل قبل القفل — الطلبات المفتوحة والبيانات الشغالة",
      "ms": 266.0253,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-06: الباقات — معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات",
      "ms": 370.3492,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-07: المزايا الفرعية وجمهور التفعيل من الشاشة",
      "ms": 264.9548,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-08: شاشة الأدوار — صلاحيات الموديول المقفول متعلّمة، والممنوحة منها بتفضل على الدور",
      "ms": 342.4331,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 11117.3661,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 136.8398,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 404.498,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 811.4959,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 214.7889,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 431.1676,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 403.6155,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 580.5316,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1617.4513,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 365.1801,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 688.4715,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 200.6327,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-01: مهمة لموظف — في «مهامي» بتاعته بس، ويشوفها أصحاب الحق، وبرّه كده 404",
      "ms": 12724.0186,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-02: حدود التكليف — مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، ومن غير كاشف وجود",
      "ms": 161.0581,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-03: المدير المباشر بيكلّف مرؤوسيه من غير صلاحية — مش غيرهم ولا دور",
      "ms": 121.3254,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-04: الحالة — المسؤول يبدأ ويعلّق ويقفل بإثبات، والمنشئ يلغي ويعيد الفتح، وإقفالين في نفس اللحظة واحد بس",
      "ms": 1064.9961,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-05: مهمة الدور — لحاملي الدور اللي فرعها في نطاقهم، ومش مدير النظام في «مهامي» بتاعته",
      "ms": 163.2448,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-06: «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم",
      "ms": 1169.5383,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-07: «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف",
      "ms": 1378.3391,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-08: قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول",
      "ms": 226.1324,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-09: التعديل والتحويل للمنشئ أو صاحب الصلاحية — التحويل تكليف جديد، وتغيير الموعد بيرجّع التذكير",
      "ms": 783.7654,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-10: التذكير والتصعيد مرة واحدة لكل مهمة وموعد، بأيام الإعدادين، والمقفولة برّه",
      "ms": 815.3144,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-11: التهيئة وقت التعيين — المهام بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة",
      "ms": 2318.7483,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة",
      "ms": 207.1682,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-13: حدود الإعدادين",
      "ms": 235.8041,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-14: إشعارات المهام بالبريد — تكليف وتذكير للمسؤول، وتأخير لمديره، بالعنوان والموعد بس وبفحص وقت الإرسال",
      "ms": 7263.9768,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها",
      "ms": 1363.2696,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-16: طلبات متزامنة أكتر من اتصالات المجمّع — كل طلب على اتصال معاملته، ومحدش بيستنى اتصال تاني",
      "ms": 4361.1461,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-17: مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server) — «فريقي» وقايمة التكليف و«مهامي» شغالين",
      "ms": 4361.0487,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-18: مهمة مسوغات التعيين في «مهامي» حالتها من المستندات دلوقتي — من غير ما شاشة التهيئة تتفتح الأول",
      "ms": 767.9671,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 13192.1885,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 1193.5241,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1270.5683,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 1493.0058,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 1418.6104,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 2712.187,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 917.324,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 859.0774,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 1408.121,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 704.7199,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.579,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 4.9267,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1807.2804,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 7529.227,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-14 (B1.7): «بصمة الجهاز بس» مفتوح — يوم بصمات الجهاز بيتعتمد تلقائي، ويوم فيه بصمة يدوية أو تصحيح بصمة بيروح لسلسلته؛ والمقفول زي النهارده",
      "ms": 2927.665,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-15 (B1.7): الضابط مفتوح والسقف الشهري صفر — فترة «اعتماد تلقائي» جديدة أو معدّلة مرفوضة برسالة، والإيقاف والقفل وشيل العلامة مسموحين؛ والسقف أكبر من صفر بيعدّي",
      "ms": 473.694,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-01: نوع طلب للسعوديين على عقد محدد المدة — بيظهر ويتقدّم للي ينطبق عليه بس، والعضوية بصفات الموظف دلوقتي",
      "ms": 11175.0722,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-02: الحفظ — الشروط بتتدقق، والشكل المتخزّن من غير شروط زي ما هو بالحرف",
      "ms": 169.776,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-03: الدرجة وتاريخ التعيين، وشاشة الخصم بتقرا صفات الموظف لما جمهور النوع فيه شروط",
      "ms": 140.2424,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-04: أول تقديم لمسودة بيتحكم بجمهور النوع دلوقتي — والنيابة زي الإنشاء، والمرجّع للاستكمال بيكمّل، والشرط التالف بيقفل",
      "ms": 970.4418,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-01: مرشح على وظيفة — المسمى والفرع منها، والنطاق، والحالة، وفحص التكرار، والإضافة من غير وظيفة زي ما هي",
      "ms": 11959.3677,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-02: وظائف داخلية — المنشور داخليًا في فرع الموظف الحالي بس، والتقديم مرة واحدة من بيانات الملف، والحكم بالفرع الحالي",
      "ms": 304.4035,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-03: الموديول المقفول بيقفل المسارات، ومن غير دخول 401",
      "ms": 110.718,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-04: صفحة الوظائف العامة — الميزة المقفولة 404، والمفتوحة بتعرض المنشور «خارجي» بس ومن غير راتب ولا قسم",
      "ms": 170.2861,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-05: التقديم من اللينك — القيم والموافقة والسيرة الذاتية، والمكرر بنفس الرد من غير صف، وغير المنشور خارجيًا غير موجود، والحد 429",
      "ms": 234.3136,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-06: السيرة الذاتية بتتقري بحكم المرشح — مسؤول توظيف فرعه بس",
      "ms": 129.6896,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-07: نقل المراحل — كل نقل سطر في السجل، والجماعي كلهم أو ولا واحد، والسجل بنطاق المرشح واسم اللي نقل بنطاق القارئ",
      "ms": 311.0995,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-08: تحديد مقابلة — القيم، ونطاق المرشح والمحاورين، والبطاقات الفاضية، والدعوة بالبريد",
      "ms": 269.698,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-09: بطاقات التقييم — المحاور بيسلّم مرة واحدة ومابيشوفش بطاقات غيره قبل ما يسلّم، وبيقرا سيرة المرشح وهو محاور بس",
      "ms": 279.9464,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-10: قفل المقابلة وإلغاؤها وملف الدعوة — من «محددة» بس، والملغاة بتختفي من «مقابلاتي» وبطاقتها مابتتسلّمش",
      "ms": 218.0737,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-11: عرض العمل — القيم والنطاق، وعرض مفتوح واحد، وتحذير النطاق، والاعتماد بصلاحيته ولغير اللي عمله، والإرسال بلينك برمز",
      "ms": 491.1813,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-12: رد المرشح — من اللينك مرة واحدة وبدليله، أو مسجّل من مسؤول التوظيف؛ والمسحوب والمنتهي والميزة المقفولة = اللينك مابيشتغلش",
      "ms": 385.3378,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-13: التعيين من العرض — العرض المقبول مع المرشح في القايمة، والوظيفة بتتقفل لما عدد المُعيَّنين يكمل",
      "ms": 190.0161,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-14: أرقام التوظيف — بنطاق فروع الحساب ومتطابقة مع الصفوف",
      "ms": 86.6155,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-01: طلب «احتياج توظيف» — حقوله من الخادم، وفحوص التقديم، والقسم المتثبّت، والاعتماد بيعمل وظيفة مسودة بمرجعها",
      "ms": 13205.9369,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-02: شاشة الوظائف — بصلاحية إدارة التوظيف وبنطاق فروع الحساب؛ الإنشاء والتعديل بالخانات؛ والوحدة مابتتغيّرش؛ واسم القسم بفرعه الحالي",
      "ms": 388.8749,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-03: الحالة — النشر محتاج وصف ومكان نشر، منشورة ↔ موقوفة، والقفل نهائي، وكل تغيير في سجل التدقيق، والموديول المقفول بيقفل المسارات",
      "ms": 367.0126,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "ms": 12539.0031,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "ms": 1098.5522,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "ms": 929.2519,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "ms": 1353.8719,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "ms": 1488.9132,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "ms": 414.5536,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "ms": 2460.7833,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "ms": 2464.3499,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "ms": 2182.6722,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "ms": 3803.3992,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "ms": 531.8158,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "ms": 244.3214,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "ms": 2442.1906,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "ms": 3321.3929,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 13146.9232,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-2: من غير الجداول الإشعارات المخزّنة والبريد واقفين من غير أخطاء؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر",
      "ms": 5585.1938,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-3: آمن للتكرار",
      "ms": 1190.0688,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-01: the active-employees number is the same on the dashboard, in the report, in the metrics and in the export",
      "ms": 12041.7693,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-02: turnover, absence and overtime follow the dictionary definitions, inside the reader scope",
      "ms": 118.7565,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
      "ms": 3202.7762,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\report-metrics.integration.cjs:238:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-01: a team leader with the plain employee role sees his own team only, without salaries; the module is closed until opened",
      "ms": 12612.8137,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-02: a department head sees the whole tree under him, with direct reports marked and today's leave counted",
      "ms": 123.161,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-03: salaries appear only with the compensation right, and only for members inside the account's branch scope",
      "ms": 164.0939,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-04 (CRP3D): a unit name follows the unit's current branch — a department moved outside the reader's branches is not named",
      "ms": 227.6966,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل",
      "ms": 13747.984,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب",
      "ms": 362.0092,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي",
      "ms": 1749.9381,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر",
      "ms": 188.2366,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام",
      "ms": 465.7207,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار",
      "ms": 517.4682,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال",
      "ms": 5125.8424,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
      "ms": 708.9792,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق",
      "ms": 4703.9581,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-10: قفل تعديل الحساب مايستنفدش اتصالات القاعدة — نص المخزن بالكتير، والباقي بيستنى دوره من غير اتصال",
      "ms": 1266.5082,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 11310.867,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 4038.4349,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 905.5706,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 155.2263,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 1069.407,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1065.5189,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 2543.6624,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR29-B01: أمر دوام العطلة لموظفين بالاسم بيتحفظ تحت قفلهم المالي — موظف اتنقل لفرع تاني قبل القفل بيرفض الأمر كله، وكمان تعديل أمر قائم ليه",
      "ms": 169.6935,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR30-B01: تعديل أو إلغاء أمر عطلة، وتعديل أو حذف فترة إضافي، بصلاحية الفرع القديم وقت ما السجل نفسه بيتنقل لفرع تاني — مابيتحفظوش",
      "ms": 389.9453,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR31-B01: تعديل أمر عطلة اتحفظ والأمر اتنقل لفرع تاني واتسمّى بعدها على طول — الرد مابيكشفش الاسم الجديد",
      "ms": 201.3058,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "calendar metadata enforces source identity, read permission and branch scope; global contents contain no branch rules",
      "ms": 10575.0448,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "explicit first confirmation proves only its dated interval and never infers history from joinDate",
      "ms": 405.9367,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "calendar changes require date, reason and current CAS, even for create/delete/toggle",
      "ms": 131.9579,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "holiday create and dated removal retain the old holiday period and public holiday wins over work exception",
      "ms": 618.7756,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "future global weekends change only future day kinds and rejects back-insertion into its complete snapshot timeline",
      "ms": 251.3887,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "two concurrent calendar writes allow one committed scope version without lost update",
      "ms": 87.7813,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "branch users cannot change global calendars or foreign branch calendars; branch-only rule does not leak",
      "ms": 158.5185,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "dated employee branch changes preserve past organization and require source CAS; future profile move is rejected",
      "ms": 470.4923,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "noncalendar profile and branch edits preserve money and do not create calendar revisions",
      "ms": 234.9722,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "current source drift and tampered immutable history fail closed and never manufacture a new baseline",
      "ms": 76.9379,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "failed calendar append rolls back source mutation atomically",
      "ms": 118.4861,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "new branch has an observed creation-date calendar and never backfills its historical configuration",
      "ms": 75.7832,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "approved and paid payroll memberships block calendar rewrites with no payroll or source mutation",
      "ms": 597.9505,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "a settled service also blocks retrospective calendar changes before its final working day",
      "ms": 179.0102,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "employee creation records only the observed creation date when no explicit calendar date was supplied",
      "ms": 249.0942,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "an explicit creation calendar date records both branch and schedule without deriving either from joinDate",
      "ms": 165.2965,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "candidate hiring supplies the real actor to employee calendar creation and enforces target branch scope",
      "ms": 221.2239,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-01: تعريف الحقول — «إدارة الإعدادات» بس، والأنواع الخمسة، والمفتاح والنوع ثابتين، والتعطيل بيخبّي والقيم بتفضل، والتغيير في التدقيق",
      "ms": 11241.77,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-02: قراءة قيم الموظف بقاعدة ملفه — صاحبه أو «عرض الموظفين» في نطاقه، والمقيّد للي يعدّل الملف بس",
      "ms": 124.8202,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-03: الحفظ — «تعديل الموظفين» في النطاق، وكل نوع بقيمته، والغلط من غير أي كتابة، والإلزامي مايتفضّاش",
      "ms": 552.0107,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-04: شرط الجمهور بالحقل المخصص — للي قيمته من القايمة بس، والحفظ بيدقق، وحقل اتعطّل أو بقى مقيّد = مفيش حد",
      "ms": 935.2761,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-05: الحقول بحد أقصى 50، والمعطّل محسوب",
      "ms": 73.4297,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-06: القراءة والحفظ تحت قفل واحد باسم الموظف — قيمة اتحفظت بعد بداية القراءة مابترجعش فيها، واللي مايلاقيش القفل «حاول تاني»",
      "ms": 10252.2283,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
      "ms": 3202.7762,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\report-metrics.integration.cjs:238:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_announcements_test_61214a21a9a1dc56",
    "Cleanup verified: hr_policies_test_b066185c3a9e9173 is absent from sys.databases.",
    "Cleanup verified: hr_modules_settings_test_5e53dcde2ec5d7eb is absent from sys.databases.",
    "Cleanup verified: hr_modules_test_bfdf086e2182dc34 is absent from sys.databases.",
    "Cleanup verified: hr_tasks_test_b68fce59caa119e4 is absent from sys.databases.",
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "Cleanup verified: hr_ot_auto_approve_test_8bc220dcb117944b is absent from sys.databases.",
    "Cleanup verified: hr_audience_test_9913e11cebee0932 is absent from sys.databases.",
    "Cleanup verified: hr_candidate_apps_test_5732b449d9c25a0b is absent from sys.databases.",
    "Cleanup verified: hr_recruitment_jobs_test_174274bedb767f94 is absent from sys.databases.",
    "Cleanup verified: hr_notifications_test_27adc53604adbf4a is absent from sys.databases.",
    "Cleanup verified: hr_notify_migration_test_96fdff6ee35e946c is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_report_metrics_test_f19326081a25e34c",
    "تحقق حذف قاعدة الاختبار: hr_team_dashboard_test_43674ebd9a60a0ab",
    "Cleanup verified: hr_comments_test_5b8ec57902ed555e is absent from sys.databases.",
    "Cleanup verified: hr_holiday_work_test_abd0237130e9b782 is absent from sys.databases.",
    "Cleanup verified: hr_calendar_history_test_d3868a698d308183 removed.",
    "Cleanup verified: temporary uploads removed.",
    "Cleanup verified: hr_custom_fields_test_bb36c58766371894 is absent from sys.databases.",
    "tests 166",
    "suites 0",
    "pass 165",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 233087.2649"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_announcements_test_61214a21a9a1dc56\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_announcements_test_61214a21a9a1dc56\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_surveys_test_3573681652c0e09c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_surveys_test_3573681652c0e09c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_helpdesk_test_539931d64ed0f363\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_helpdesk_test_539931d64ed0f363\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policies_test_b066185c3a9e9173\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policies_test_b066185c3a9e9173\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_settings_test_5e53dcde2ec5d7eb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_settings_test_5e53dcde2ec5d7eb\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_bfdf086e2182dc34\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_bfdf086e2182dc34\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_tasks_test_b68fce59caa119e4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_tasks_test_b68fce59caa119e4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_8bc220dcb117944b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_8bc220dcb117944b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audience_test_9913e11cebee0932\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audience_test_9913e11cebee0932\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_candidate_apps_test_5732b449d9c25a0b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_candidate_apps_test_5732b449d9c25a0b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recruitment_jobs_test_174274bedb767f94\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recruitment_jobs_test_174274bedb767f94\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notifications_test_27adc53604adbf4a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notifications_test_27adc53604adbf4a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_migration_test_96fdff6ee35e946c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_migration_test_96fdff6ee35e946c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_metrics_test_f19326081a25e34c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_metrics_test_f19326081a25e34c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_team_dashboard_test_43674ebd9a60a0ab\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_team_dashboard_test_43674ebd9a60a0ab\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comments_test_5b8ec57902ed555e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comments_test_5b8ec57902ed555e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_work_test_abd0237130e9b782\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_work_test_abd0237130e9b782\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_calendar_history_test_d3868a698d308183\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_calendar_history_test_d3868a698d308183\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_custom_fields_test_bb36c58766371894\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_custom_fields_test_bb36c58766371894\"}\n"
  ]
}
