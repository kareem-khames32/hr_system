module.exports = {
  "selected": [
    "notifications",
    "request-execution",
    "request-execution-tasks",
    "administration-level",
    "manager-of-direct-manager",
    "executive-cross-branch-parent",
    "request-decision-race"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 108,
      "failed": 8,
      "passed": 100,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 108,
      "suites": 0
    },
    "duration_ms": 87760.5119
  },
  "results": [
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "ms": 6904.3577,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "ms": 843.5536,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "ms": 687.6477,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "ms": 981.5164,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "ms": 790.0151,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "ms": 315.1851,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "ms": 1924.5083,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "ms": 1896.4506,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "ms": 1790.0475,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "ms": 3160.8944,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "ms": 327.4422,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "ms": 157.4687,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "ms": 1574.6702,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "ms": 2332.7658,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 6282.8783,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 137.6604,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 179.9199,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 83.5897,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 829.2587,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 213.6031,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 87.8492,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 246.0413,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 166.0478,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 189.7268,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.527,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 181.2514,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 52.4302,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 167.4302,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 119.0733,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 64.1542,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 185.1259,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 38.9716,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 178.184,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 80.111,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 108.2155,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1170.2798,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 205.1239,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 194.0878,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 468.4972,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 64.1506,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 119.6158,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 72.4136,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 165.2828,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 276.4228,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 254.0452,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 57.6838,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 82.8006,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 159.0013,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 68.977,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 160.3162,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 73.0481,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 142.906,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 89.91,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 117.7027,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-01: نوع من غير الإعداد — الاعتماد بيكمّل الطلب في لحظتها ومن غير مهمة",
      "ms": 6043.4911,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-02: الإعداد على نوع الطلب — الدور والمهلة والإثبات بحدودهم، وشيل الدور بيشيل الباقي",
      "ms": 336.1162,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-03: نوع عليه مهمة — الطلب «قيد التنفيذ» ومهمة واحدة على الدور في فرع الطلب، وفي «مهامي» والتقرير",
      "ms": 253.7039,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-04: اللي المهمة عليه بيقرا الطلب، وحامل الدور في فرع تاني والغريب لأ",
      "ms": 111.8361,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-05: إقفال المهمة — الطلب «مكتمل» وسطر «اتنفّذ» وبريد لصاحبه؛ والإثبات الإجباري، وإقفالين في نفس اللحظة، ومن غير إعادة فتح",
      "ms": 926.5799,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-06: مهمة التنفيذ ماتتلغيش ولا تتعدّل ولا تتحوّل من شاشة المهام — رفض التنفيذ من لوحة الطلبات بيلغيها ويرفض الطلب",
      "ms": 244.8918,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-07: الطلب السري — عنوان المهمة عام ومن غير اسم معتمده، وأصحاب «عرض كل المهام» و«إدارة المهام» مالهمش طريق له، والمنفّذ بيقراه",
      "ms": 1411.2527,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-08: المهمة والاعتماد معاملة واحدة — لو المهمة ماتكتبتش، الاعتماد كله بيرجع",
      "ms": 83.1715,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-09: باقي مداخل الاعتماد — سلسلة فاضية باعتماد تلقائي، وطلب الموارد البشرية نيابةً؛ ومعالج لسه ماخلّصش من غير مهمة",
      "ms": 318.2875,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-10: محدش ينفّذ طلبه — صاحب الطلب ومنشئه نيابةً مايشتغلوش على مهمته، ومدير النظام بيفكّ الانسداد",
      "ms": 483.7204,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-11: إثبات مهمة التنفيذ وسبب تعليقها ومين قفلها — للي يقدر يفتح الطلب بس، وملف إثباتها لرافعه",
      "ms": 448.3994,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-12: إقفال المهمة ورفض تنفيذ الطلب في نفس اللحظة — واحد بس بيكسب والتاني بيترفض برسالة، من غير تعليق متبادل",
      "ms": 281.4791,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-01: إدارة وأقسامها وقسم فرعي؛ الإدارة التنفيذية بتتعمل «إدارة» لوحدها؛ وإدارة فرع تحت الإدارة التنفيذية من فرع تاني",
      "ms": 6342.593,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-02: قواعد الأب — إدارة تحت قسم أو إدارة عادية، قسم تحت إدارة فرع تاني، تحويل لإدارة وأبوه مايصلحش، ونوع غلط: كله مرفوض ومفيش حاجة بتتكتب",
      "ms": 80.6549,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-03: المسموح — تحويل قسم رئيسي أو تحت الإدارة التنفيذية لإدارة والعكس، وإدارة لقسم وأقسامها فرعية، والهيكل القائم بيتعدّل من غير إجبار",
      "ms": 142.698,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-04: الإدارة التنفيذية «إدارة» دايمًا ومالهاش أب، وشيل تعليمها (صريح أو ضمني) مرفوض طول ما تحتها إدارات",
      "ms": 67.2983,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-05: «مدير الإدارة» — موظف قسم تحت إدارة بيروح لمديرها، وهو بس اللي بيعتمد",
      "ms": 169.2589,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-06: قسم فرعي على مستويين تحت الإدارة — نفس مدير الإدارة",
      "ms": 34.7844,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-07: مدير الإدارة هو مقدّم الطلب — الخطوة بتطلع للإدارة التنفيذية برابطها لفرع تاني، والرئيس بيعتمد من حساب «كل الفروع»",
      "ms": 103.8754,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-08: الإيقاف برسالة بتسمّي الوحدة — مفيش قسم، مفيش إدارة، الإدارة مالهاش مدير، المدير الوحيد هو مقدّم الطلب",
      "ms": 164.8564,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-09: السرّي مابيتخطّاش «مدير الإدارة» (زي «مدير القسم»)، والدور مش مقبول كجهة تصعيد",
      "ms": 99.8876,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-10: فلتر المسير وجمهور العطلات على إدارة بيشملوا أقسامها — في فرعها بس",
      "ms": 653.683,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-11: «الإدارة» في بطاقة صاحب الطلب — الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، ومحجوبة مع orgHidden",
      "ms": 190.7296,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-12: حساب الفرع — إدارة في فرعه وقسم تحتها، والربط تحت الإدارة التنفيذية برّه نطاقه 403، والقائمة ماتكشفش اسمها",
      "ms": 74.9598,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-13: تعليم قسم «إدارة تنفيذية» بيخلّيه «إدارة» تلقائي، والتنفيذية القديمة إدارة عادية تتحول قسم وأقسامها فرعية",
      "ms": 70.6766,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس",
      "ms": 6237.841,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة",
      "ms": 84.3102,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش",
      "ms": 147.9333,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو",
      "ms": 39.7281,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه",
      "ms": 38.61,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف",
      "ms": 26.3892,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06b: دايرة أطول في المديرين المسجّلين (3 و4 أشخاص) — «مدير المدير» مرؤوس لمقدّم الطلب، فالتقديم بيقف (CR10-N01)",
      "ms": 134.6195,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06c: لفّة التدرّج الطبيعية (مدير فرع جوه قسم مديره تحته) مابتتحسبش دايرة — الخطوة بتروح لمدير الفرع",
      "ms": 107.764,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه",
      "ms": 62.1959,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-08: «مدير المدير المباشر» مش مقبول كجهة تصعيد (إنشاء السلسلة وتعديل الخطوة)",
      "ms": 17.8786,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-09: الشاشة — الاختيار ظاهر بعد «المدير المباشر» ومش في قايمة التصعيد، وتسميته في الصناديق",
      "ms": 14.0823,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-01: قسم من فرع تاني تحت الإدارة التنفيذية — الإنشاء والتعديل ينجحوا، وقسم الفرع يفضل أب لأقسام فرعه",
      "ms": 5890.057,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-02: أب من فرع مختلف غير الإدارة التنفيذية لسه مرفوض بنفس الرسالة القديمة — ومفيش حاجة بتتكتب",
      "ms": 54.5294,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-03: حساب فرع النصر مايربطش قسم تحت الإدارة التنفيذية (فرعها برّه نطاقه) — 403 في الإنشاء والتعديل",
      "ms": 35.9895,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-04: شيل تعليم الإدارة التنفيذية وتحتها أقسام من فروع تانية مرفوض — صريح وضمني — والرسالة بتسمّي قسم منهم ومفيش حاجة بتتغير",
      "ms": 64.0511,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-05: نقل الإدارة التنفيذية نفسها لفرع تاني عادي وأقسامها في فروعها؛ نقل قسم عادي بيسيب أقسامه الفرعية لسه مرفوض",
      "ms": 39.7936,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-06: الدائرة لسه مرفوضة — حتى عبر أقسام الفروع اللي تحت الإدارة التنفيذية",
      "ms": 33.7335,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-07: عطلة أقسام للفرع الرئيسي على الإدارة التنفيذية ماتوصلش لموظف النصر تحتها — وعطلة النصر على قسمه بتشمل قسمه الفرعي",
      "ms": 399.0819,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-08: مسير على الإدارة التنفيذية مايسحبش موظفي فرع تاني تحتها، ومسير قسم النصر بياخد قسمه الفرعي",
      "ms": 234.747,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-09: الخصومات والمكافآت — مسار القسم وأقسامه الفرعية وسلطة مدير القسم جوه الفرع، وقوايم حساب النصر ماتكشفش الإدارة التنفيذية",
      "ms": 113.4483,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-10: بعد نقل أقسام الفروع التانية من تحت الإدارة التنفيذية شيل التعليم بيعدّي — القاعدة مابتقفلش أكتر من اللازم",
      "ms": 65.7323,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 23.3154,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.3296,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0405,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0247,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0332,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0207,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0187,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0208,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "failures": [
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 23.3154,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.3296,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0405,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0247,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0332,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0207,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0187,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0208,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_58841133759e223f'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_notifications_test_cfbd8fe7cf67466c is absent from sys.databases.",
    "Cleanup verified: hr_reqexec_test_af2f79cb45927154 is absent from sys.databases.",
    "Cleanup verified: hr_administration_level_test_cc0e0cfe839aab2c is absent from sys.databases.",
    "Cleanup verified: hr_skip_level_test_529fb14a6745246c is absent from sys.databases.",
    "Cleanup verified: hr_exec_cross_branch_test_179f78ab2da75089 is absent from sys.databases.",
    "tests 108",
    "suites 0",
    "pass 100",
    "fail 8",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 87760.5119"
  ],
  "stdout": [
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notifications_test_cfbd8fe7cf67466c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notifications_test_cfbd8fe7cf67466c\"}\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_6540450cea933e09\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_6540450cea933e09\"}\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_reqexec_test_af2f79cb45927154\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_reqexec_test_af2f79cb45927154\"}\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_administration_level_test_cc0e0cfe839aab2c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_administration_level_test_cc0e0cfe839aab2c\"}\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_skip_level_test_529fb14a6745246c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_skip_level_test_529fb14a6745246c\"}\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_exec_cross_branch_test_179f78ab2da75089\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_exec_cross_branch_test_179f78ab2da75089\"}\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
