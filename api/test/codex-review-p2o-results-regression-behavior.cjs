module.exports = {
  "selected": [
    "audit-log",
    "queue-outbox",
    "notifications",
    "tasks",
    "request-execution-tasks",
    "approval-delegations",
    "policies",
    "hr-document-acknowledgements",
    "hr-documents"
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
    "duration_ms": 182540.7095
  },
  "results": [
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 10794.2931,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 178.2282,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 26.2483,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 153.9717,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "ms": 229.8236,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-01: حدث اتكتب في معاملة اترجعت مابيتسجلش ومابيتنفذش",
      "ms": 10005.9593,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-02: الحدث المتوزع مهمة لكل مستهلك وبتتنفذ مرة؛ والنوع من غير مستهلك بيتعلّم «اتوزع» من غير مهام",
      "ms": 117.3602,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-03: مهمة فشلت بتتعاد بعد مهلة مش فورًا، وبعد الحد الأقصى DEAD برسالتها، و«إعادة» بترجعها",
      "ms": 115.3671,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-04: عاملين مابياخدوش نفس المهمة، ومنع التكرار بالمفتاح، والمهمة المتمسكة من عامل وقع بترجع",
      "ms": 128.0986,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-05: الأحداث الست من مصادرها الحقيقية في نفس معاملتها",
      "ms": 2170.1097,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox.integration.cjs",
      "name": "QO-06: شاشة الطابور لحساب الشركة بس، و/health بالعدد بس",
      "ms": 28.0144,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "ms": 10896.8684,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "ms": 983.7232,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "ms": 667.4527,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "ms": 971.224,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "ms": 683.9,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "ms": 260.7565,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "ms": 1609.205,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "ms": 1624.1007,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "ms": 1558.1341,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "ms": 2983.5507,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "ms": 262.3881,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "ms": 162.3932,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "ms": 1554.0962,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "ms": 2176.69,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-01: مهمة لموظف — في «مهامي» بتاعته بس، ويشوفها أصحاب الحق، وبرّه كده 404",
      "ms": 10985.8472,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-02: حدود التكليف — مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، ومن غير كاشف وجود",
      "ms": 144.7302,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-03: المدير المباشر بيكلّف مرؤوسيه من غير صلاحية — مش غيرهم ولا نفسه ولا دور",
      "ms": 111.4428,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-04: الحالة — المسؤول يبدأ ويعلّق ويقفل بإثبات، والمنشئ يلغي ويعيد الفتح، وإقفالين في نفس اللحظة واحد بس",
      "ms": 923.9847,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-05: مهمة الدور — لحاملي الدور اللي فرعها في نطاقهم، ومش مدير النظام في «مهامي» بتاعته",
      "ms": 173.8822,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-06: «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم",
      "ms": 1290.43,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-07: «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف",
      "ms": 1162.2738,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-08: قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول",
      "ms": 234.554,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-09: التعديل والتحويل للمنشئ أو صاحب الصلاحية — التحويل تكليف جديد، وتغيير الموعد بيرجّع التذكير",
      "ms": 559.7872,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-10: التذكير والتصعيد مرة واحدة لكل مهمة وموعد، بأيام الإعدادين، والمقفولة برّه",
      "ms": 701.1596,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-11: التهيئة وقت التعيين — المهام بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة",
      "ms": 1247.1172,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة",
      "ms": 139.6034,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-13: حدود الإعدادين",
      "ms": 206.4629,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-14: إشعارات المهام بالبريد — تكليف وتذكير للمسؤول، وتأخير لمديره، بالعنوان والموعد بس وبفحص وقت الإرسال",
      "ms": 4309.1902,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها",
      "ms": 721.4909,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-16: طلبات متزامنة أكتر من اتصالات المجمّع — كل طلب على اتصال معاملته، ومحدش بيستنى اتصال تاني",
      "ms": 2668.6467,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-17: مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server) — «فريقي» وقايمة التكليف و«مهامي» شغالين",
      "ms": 3792.8509,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-18: مهمة مسوغات التعيين في «مهامي» حالتها من المستندات دلوقتي — من غير ما شاشة التهيئة تتفتح الأول",
      "ms": 480.8393,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-01: نوع من غير الإعداد — الاعتماد بيكمّل الطلب في لحظتها ومن غير مهمة",
      "ms": 11554.7103,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-02: الإعداد على نوع الطلب — الدور والمهلة والإثبات بحدودهم، وشيل الدور بيشيل الباقي",
      "ms": 420.4404,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-03: نوع عليه مهمة — الطلب «قيد التنفيذ» ومهمة واحدة على الدور في فرع الطلب، وفي «مهامي» والتقرير",
      "ms": 272.1252,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-04: اللي المهمة عليه بيقرا الطلب، وحامل الدور في فرع تاني والغريب لأ",
      "ms": 129.0533,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-05: إقفال المهمة — الطلب «مكتمل» وسطر «اتنفّذ» وبريد لصاحبه؛ والإثبات الإجباري، وإقفالين في نفس اللحظة، ومن غير إعادة فتح",
      "ms": 978.555,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-06: مهمة التنفيذ ماتتلغيش ولا تتعدّل ولا تتحوّل من شاشة المهام — رفض التنفيذ من لوحة الطلبات بيلغيها ويرفض الطلب",
      "ms": 323.1175,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-07: الطلب السري — عنوان المهمة عام ومن غير اسم معتمده، وأصحاب «عرض كل المهام» و«إدارة المهام» مالهمش طريق له، والمنفّذ بيقراه",
      "ms": 1499.0249,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-08: المهمة والاعتماد معاملة واحدة — لو المهمة ماتكتبتش، الاعتماد كله بيرجع",
      "ms": 81.1569,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-09: باقي مداخل الاعتماد — سلسلة فاضية باعتماد تلقائي، وطلب الموارد البشرية نيابةً؛ ومعالج لسه ماخلّصش من غير مهمة",
      "ms": 381.9775,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-10: محدش ينفّذ طلبه — صاحب الطلب ومنشئه نيابةً مايشتغلوش على مهمته، ومدير النظام بيفكّ الانسداد",
      "ms": 567.4598,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-11: إثبات مهمة التنفيذ وسبب تعليقها ومين قفلها — للي يقدر يفتح الطلب بس، وملف إثباتها لرافعه",
      "ms": 537.0301,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-12: إقفال المهمة ورفض تنفيذ الطلب في نفس اللحظة — واحد بس بيكسب والتاني بيترفض برسالة، من غير تعليق متبادل",
      "ms": 267.4775,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-13: مهمة ربطها بطلبها اتثبّت والنداء واقف على صفها — مابتتعاملش كمهمة عادية",
      "ms": 334.9091,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-01: الإنشاء — الموظف لنفسه، ولغيره بصلاحية وفي نطاقه؛ وحدود الفترة والفئات والبديل؛ والقايمة",
      "ms": 10564.7724,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين",
      "ms": 532.0869,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس",
      "ms": 369.2859,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل",
      "ms": 155.5691,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض",
      "ms": 281.9603,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل",
      "ms": 1662.5421,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
      "ms": 1072.2632,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس",
      "ms": 647.7021,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال",
      "ms": 2605.1364,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى",
      "ms": 1000.868,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-11: تفويضين متداخلين لنفس المفوِّض في نفس اللحظة — واحد بس",
      "ms": 88.1504,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة",
      "ms": 9889.9816,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة",
      "ms": 512.384,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية",
      "ms": 355.2918,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل",
      "ms": 237.1425,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا",
      "ms": 634.9023,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه",
      "ms": 417.7827,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها",
      "ms": 219.6012,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ",
      "ms": 211.8762,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة",
      "ms": 589.7506,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة",
      "ms": 880.9399,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب",
      "ms": 79.9308,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-01: الإصدار بطلب إقرار — الطلب والمهمة وبصمة الملف مع الإصدار؛ ومن غير موظف مرفوض؛ وحدود الموعد؛ ومفتاح منع التكرار",
      "ms": 10071.5277,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-02: «مستني إقرارك» وقراءة المستند — لصاحبه بس، والبصمة من قراءة المستند مش من القايمة، وملفه بحجمه المعلَن",
      "ms": 149.3987,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-03: الإقرار — صاحب المستند لنفسه، وببصمة ملفه، ومرة واحدة، والدليل؛ ومهمته بتتقفل معاه",
      "ms": 348.172,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-04: الملف — اتبدّل على التخزين مابيتعرضش؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول",
      "ms": 475.4618,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-05: المهمة في محرك المهام — في «مهامي» برابط مستندها، ومابتتقفلش ولا بتتعدّل ولا بتتلغي من شاشة المهام، والتذكير والتصعيد شغالين عليها",
      "ms": 923.5647,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-06: الإلغاء — لصاحب «إدارة المستندات» اللي يشوف المستند، وقبل الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني",
      "ms": 542.1626,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-07: السجل — حالة الإقرار وفلترها، وبنطاق القارئ بفرع الموظف دلوقتي",
      "ms": 310.9978,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements.integration.cjs",
      "name": "DA-08: إقرار المستند مابيقفلش النظام (حتى المتأخر)؛ والحساب المقفول على سياسة إلزامية بيقرّ بيها الأول",
      "ms": 244.8414,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "HR template permissions and validation prevent forged variables and null patches without changing letters",
      "ms": 9136.5708,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "draft edits do not change publication, and stale versions cannot overwrite a template",
      "ms": 123.3997,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "sample preview is a real PDF and neither it nor employee preview creates records",
      "ms": 64.2414,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "employee and custom fields are required only when referenced, with branch isolation before issuance",
      "ms": 83.1301,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "issuance archives a PDF in employee documents and concurrent retries issue it only once",
      "ms": 148.2605,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a saved document keeps its bytes after template and employee changes; an idempotent retry returns that issuance",
      "ms": 128.9822,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "financial tokens and both PDF download paths enforce finance permission and current branch",
      "ms": 136.0649,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a general company document needs no employee and remains visible only in its branch scope",
      "ms": 87.0406,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a database failure after PDF creation leaves no files or partial records and the same key can retry",
      "ms": 107.5564,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_audit_log_test_3ee1f745d461092e is absent from sys.databases.",
    "Cleanup verified: hr_queue_outbox_test_699f6951a717bc8e is absent from sys.databases.",
    "Cleanup verified: hr_notifications_test_54f93d5424cd5904 is absent from sys.databases.",
    "Cleanup verified: hr_tasks_test_8c3fca8ed887e716 is absent from sys.databases.",
    "Cleanup verified: hr_reqexec_test_ffc44f8b364b8104 is absent from sys.databases.",
    "Cleanup verified: hr_delegation_test_1551b4d104d8a3bb is absent from sys.databases.",
    "Cleanup verified: hr_policies_test_8627ee85f85f5475 is absent from sys.databases.",
    "Cleanup verified: hr_docack_test_bbea5c805b08eb79 is absent from sys.databases.",
    "tests 95",
    "suites 0",
    "pass 95",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 182540.7095"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_test_3ee1f745d461092e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_test_3ee1f745d461092e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_queue_outbox_test_699f6951a717bc8e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_queue_outbox_test_699f6951a717bc8e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notifications_test_54f93d5424cd5904\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notifications_test_54f93d5424cd5904\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_tasks_test_8c3fca8ed887e716\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_tasks_test_8c3fca8ed887e716\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_reqexec_test_ffc44f8b364b8104\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_reqexec_test_ffc44f8b364b8104\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_delegation_test_1551b4d104d8a3bb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_delegation_test_1551b4d104d8a3bb\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policies_test_8627ee85f85f5475\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policies_test_8627ee85f85f5475\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_docack_test_bbea5c805b08eb79\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_docack_test_bbea5c805b08eb79\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_documents_test_eb3c59abf86ecce6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_documents_test_eb3c59abf86ecce6\"}\n"
  ]
}
