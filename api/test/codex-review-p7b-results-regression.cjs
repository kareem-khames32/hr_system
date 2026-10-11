module.exports = {
  "selected": [
    "org-audience",
    "overtime-period-audience",
    "dashboard-cards",
    "notification-channels",
    "announcements",
    "announcements-home",
    "surveys",
    "helpdesk",
    "policies",
    "modules-settings",
    "modules-enforcement",
    "tasks",
    "tasks-assignment-rules",
    "overtime-auto-approve-period",
    "request-audience-conditions",
    "notifications",
    "performance-reviews",
    "training",
    "holiday-work",
    "attendance-calendar-history",
    "team-dashboard",
    "comments",
    "employee-custom-fields",
    "job-share",
    "candidate-applications",
    "recruitment-jobs"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 226,
      "failed": 0,
      "passed": 226,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 226,
      "suites": 0
    },
    "duration_ms": 307416.1284
  },
  "results": [
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-01: the preview counts and names an audience at every level, inside the asker's branch scope only",
      "ms": 12802.0466,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-02: an announcement for one administration reaches its people only; exclusion; a branch account targets units of its own branches only",
      "ms": 462.5987,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-03: a policy, a knowledge article and a survey for one administration apply to its people only",
      "ms": 357.0198,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-04: a module opened for one administration is on for its people only (and whoever is excluded by name is out)",
      "ms": 196.558,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-05: a group task gives every employee of the audience their own task, inside the assigner's branch scope, and only to permission holders",
      "ms": 235.9156,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-06 (P7A-B01): a team or a unit that moved to another branch is out of its old branch audience — on the board and in the preview",
      "ms": 160.913,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-07 (P7A-B02): an incomplete new-shape audience is refused, and a damaged stored one opens for nobody",
      "ms": 84.0053,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-audience.integration.cjs",
      "name": "OA-08 (P7A-B03): a group task holds its employees' rows — a transfer waits until the tasks are written, and never lands between the rule and the write",
      "ms": 552.9277,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-01: an open period for one team opens overtime for that team only; whoever is outside it is judged as if the period did not exist",
      "ms": 12644.1414,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-02: an administration covers the departments under it, the excluded employee stays out, and a closed period closes for its audience only",
      "ms": 282.7721,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-03: a branch account sets an audience inside its branches only; wrong ids and a company-wide exclusion are refused; periods without an audience are as before",
      "ms": 188.1353,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-04: a damaged audience never opens overtime, and before migration 186 periods behave as before and an audience is refused",
      "ms": 220.9725,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-05 (P7A-B04): editing or deleting a period reads its audience on the transaction's own connection — ten concurrent edits with a full pool all succeed",
      "ms": 602.91,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-period-audience.integration.cjs",
      "name": "OTA-06 (P7A-B05): the period list names a team or a department only while it is inside the reader's branches",
      "ms": 86.5098,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-01: every card has its own permission on top of the dashboard permission, and the money card needs the payroll permission",
      "ms": 11425.08,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-02: a one-branch HR manager opens the dashboard, picks an administration, clicks \"absent\" in a team and sees the names — inside the branch only",
      "ms": 382.5244,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-03: absent and late by name grouped by team, and the phone only for whoever may see employees",
      "ms": 47.7698,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-04: no amount without the payroll permission — the field is absent, and the payroll card is refused",
      "ms": 408.4424,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-05: a closed module removes its card, and its endpoint answers like a missing route",
      "ms": 230.1577,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-06: the workforce numbers are the metrics dictionary numbers, and the expiring lists stay inside the scope and the permission",
      "ms": 281.1411,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-07: leaves, requests, tasks and trends count inside the scope and follow the dashboard filter",
      "ms": 214.8096,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-08: the dashboard opens within the 3-second target for 600 employees",
      "ms": 6950.0428,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-09 (P7A-B06): an employee who moved outside the reader's branches is not named anywhere — not in the tasks card, and not from an older snapshot",
      "ms": 137.1691,
      "pass": true,
      "skip": false
    },
    {
      "file": "dashboard-cards.integration.cjs",
      "name": "DC-10 (P7A-B07): a request whose definition is confidential is confidential in the requests card — a unit filter never counts it",
      "ms": 167.921,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-01: الافتراضي = سلوك النظام الحالي، والشاشة لمدير النظام بس",
      "ms": 11091.5045,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-02: خادم البريد من الشاشة — كلمة السر مختومة ومابترجعش، والإعداد المحفوظ بياخد مكان إعداد الخادم من غير إعادة تشغيل",
      "ms": 189.3583,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-03: الواتساب من الشاشة — التوكن مختوم ومابيرجعش، وربط قالب Meta بمتغيرات الحدث، ورسالة التجربة على خادم Meta بس",
      "ms": 169.8188,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-04: «خلص لما» — طلب مستني اعتماد وصل للمعتمد على البريد والواتساب، والسجل بيقول اتبعتت",
      "ms": 325.4146,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-05: الطلب السري — القالب العام على القناتين من غير نوع ولا اسم، ومستلمه مخفي في السجل",
      "ms": 278.6579,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-06: حدث من غير قالب واتساب «اتخطّى»، ومستلم من غير رقم «اتخطّى»، وموبايل الملف بياخد مكانه لما الإدارة تفتح الاختيار بس",
      "ms": 804.9493,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-07: اختيار المستخدم «مقفول» محترم على الواتساب، و«إلزامي» بيلغيه، وصفحة المستخدم بتقول إيه الإلزامي",
      "ms": 595.7586,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-08: ساعات الهدوء بتأجّل الواتساب، وفشل المزوّد: إعادة محاولة، والرقم المرفوض «فشل» من غير إعادة، والتوكن المرفوض بيوقّف الإرسال",
      "ms": 944.0135,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-09: القناة المقفولة = ولا صف؛ واللي اتقفلت قبل الإرسال «اتخطّى»؛ وجدول الحدث × القناة بيقفل البريد أو داخل النظام للحدث لوحده",
      "ms": 943.1486,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-10: رقم واتساب الموظف بنطاق الفروع والصلاحية، ومين ناقصه رقم أو بريد",
      "ms": 114.7316,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-11: البحث في سجل الإرسال — القناة والحالة والحدث واسم المستلم والتاريخ والصفحات، واسم مستلم السري مابيطابقش",
      "ms": 186.142,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-12: القالب الإنجليزي للي لغة حسابه إنجليزي، والباقي عربي",
      "ms": 524.5848,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-13 (P7A-B08): الملخص اليومي بيحترم قفل بريد الحدث من «قنوات الإشعارات» — اللي اتجمّع قبل القفل «اتخطّى»",
      "ms": 462.036,
      "pass": true,
      "skip": false
    },
    {
      "file": "notification-channels.integration.cjs",
      "name": "NC-14 (P7A-B09): حفظ رقم واتساب الموظف بيقفل صفه — نقله لفرع تاني بيستنى لحد ما الحفظ يخلص، ومابيتكتبش رقم لموظف برّه نطاق الكاتب",
      "ms": 557.9592,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-01: the module is closed until opened; a draft is judged field by field; a branch account manages announcements of its own branches only",
      "ms": 10120.8395,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-02: an announcement for one branch does not show to another branch; pinned first; reading is recorded once by the employee himself",
      "ms": 716.6344,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-03: the read report lists the announcement audience inside the reader's branches — who read and when, and who has not",
      "ms": 110.8433,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-04: publishing notifies the audience accounts once, judged again when the mail leaves and when the list is read",
      "ms": 2221.4804,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-05: an announcement attachment is uploaded by a manager, bound to a draft once, and read by the announcement's own rule",
      "ms": 892.7968,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements.integration.cjs",
      "name": "AN-06: the occasions feature is closed by default; open, it lists branch colleagues' birthdays and service anniversaries without the birth year",
      "ms": 302.2463,
      "pass": true,
      "skip": false
    },
    {
      "file": "announcements-home.integration.cjs",
      "name": "AH-01: an announcement for one department notifies its employees only, shows on their board (pinned first), and the read rate is right",
      "ms": 10830.3641,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-01: الإدارة — القيم وجمهور حساب الفروع، والمسودة بتتعدّل والمفتوح لأ، والفتح بيعمل دعوة لكل موظف حالي في الجمهور بمجموعته",
      "ms": 11600.6736,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-02: السرية الحقيقية — الرد المجهول من غير موظف ولا ساعة ولا رابط بالدعوة ولا سطر تدقيق، ومرة واحدة، والنتايج بالحد الأدنى ومن غير طرح",
      "ms": 1138.482,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-03: الاستبيان بالاسم بيسجّل الموظف؛ والمقفول واللي فات آخر يومه مابيتردّش عليهم؛ والموديول المقفول",
      "ms": 256.7378,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.integration.cjs",
      "name": "SV-04: Codex P3L-B02 — الإخفاء التكميلي لكل سؤال، والقفل بيستنى الرد الجاري فالنتايج بعده ثابتة",
      "ms": 6503.2044,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-01: الاستفسار على محرك الطلبات — اعتماد فوري ومهمة على دوره بمهلة، وحالة الخدمة من المهمة، ورد في التعليقات، وإقفال، وتقييم مرة واحدة من صاحبه",
      "ms": 12176.5567,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-02: التقرير بالصلاحية وبنطاق الفروع — العدد والمفتوح ومتوسطات الرد والحل والمتجاوز للمهلتين والرضا؛ والموديول المقفول",
      "ms": 335.9598,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.integration.cjs",
      "name": "HD-03: قاعدة المعرفة — الإدارة بالصلاحية وبنطاق الفروع، والموظف بيشوف المنشور اللي في جمهوره بس (بحث بكلمة أو بنوع استفسار)، ولينك لسياسة من غير تكرار",
      "ms": 737.5535,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة",
      "ms": 10831.3853,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة",
      "ms": 542.065,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية",
      "ms": 414.9641,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل",
      "ms": 261.4438,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا",
      "ms": 570.4164,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه",
      "ms": 446.1236,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها",
      "ms": 201.6155,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ",
      "ms": 235.6738,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة",
      "ms": 709.4056,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة",
      "ms": 843.0208,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب",
      "ms": 84.2089,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-01: الصلاحية — settings.modules بس، والكتابة لحساب على مستوى الشركة",
      "ms": 10178.4813,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-02: الكتالوج — الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات",
      "ms": 3.9384,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-03: التفعيل والقفل من الشاشة — الأثر فوري والتغيير متسجّل باسم اللي عمله",
      "ms": 123.9025,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-04: الرفض — تبعيات وأساسي ومجهول وجسم غلط، ومفيش حاجة بتتكتب",
      "ms": 179.9097,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-05: أثر القفل قبل القفل — الطلبات المفتوحة والبيانات الشغالة",
      "ms": 217.129,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-06: الباقات — معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات",
      "ms": 298.895,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-07: المزايا الفرعية وجمهور التفعيل من الشاشة",
      "ms": 232.8796,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-08: شاشة الأدوار — صلاحيات الموديول المقفول متعلّمة، والممنوحة منها بتفضل على الدور",
      "ms": 279.0649,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 10442.127,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 131.7235,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 270.6123,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 486.2616,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 159.7774,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 350.0959,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 349.9268,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 525.078,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1628.3371,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 364.4187,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 667.0313,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 170.3105,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-01: مهمة لموظف — في «مهامي» بتاعته بس، ويشوفها أصحاب الحق، وبرّه كده 404",
      "ms": 10855.9489,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-02: حدود التكليف — مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، ومن غير كاشف وجود",
      "ms": 127.9906,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-03: المدير المباشر بيكلّف مرؤوسيه من غير صلاحية — مش غيرهم ولا دور",
      "ms": 168.3815,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-04: الحالة — المسؤول يبدأ ويعلّق ويقفل بإثبات، والمنشئ يلغي ويعيد الفتح، وإقفالين في نفس اللحظة واحد بس",
      "ms": 1032.6084,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-05: مهمة الدور — لحاملي الدور اللي فرعها في نطاقهم، ومش مدير النظام في «مهامي» بتاعته",
      "ms": 177.2188,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-06: «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم",
      "ms": 1191.4166,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-07: «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف",
      "ms": 1426.5204,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-08: قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول",
      "ms": 250.8284,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-09: التعديل والتحويل للمنشئ أو صاحب الصلاحية — التحويل تكليف جديد، وتغيير الموعد بيرجّع التذكير",
      "ms": 766.7028,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-10: التذكير والتصعيد مرة واحدة لكل مهمة وموعد، بأيام الإعدادين، والمقفولة برّه",
      "ms": 797.5732,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-11: التهيئة وقت التعيين — المهام بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة",
      "ms": 1695.1636,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة",
      "ms": 184.7242,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-13: حدود الإعدادين",
      "ms": 191.5,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-14: إشعارات المهام بالبريد — تكليف وتذكير للمسؤول، وتأخير لمديره، بالعنوان والموعد بس وبفحص وقت الإرسال",
      "ms": 6330.3397,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها",
      "ms": 1345.0318,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-16: طلبات متزامنة أكتر من اتصالات المجمّع — كل طلب على اتصال معاملته، ومحدش بيستنى اتصال تاني",
      "ms": 4634.7995,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-17: مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server) — «فريقي» وقايمة التكليف و«مهامي» شغالين",
      "ms": 4612.2071,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-18: مهمة مسوغات التعيين في «مهامي» حالتها من المستندات دلوقتي — من غير ما شاشة التهيئة تتفتح الأول",
      "ms": 870.1297,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-01: اختبارات المالك الخمسة — زميل مرفوض، وتحت المدير المرؤوس مقبول، وقسم تاني مرفوض برسالة الطلب، والمسؤول مايحوّلش، وHR برّه فروعه 404",
      "ms": 13671.7668,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-02: «تحته في الشجرة» — المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، ومش لفوق ولا للجنب؛ و«كل اللي تحته» بنفس حكم «تحته؟»",
      "ms": 4354.181,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-03: المهمة الشخصية — لصاحبها ومديره المباشر بس، وبيديرها صاحبها، وبرّه قايمة «المهام» والتقرير، ومن غير إشعار تكليف ولا تبليغ تأخير",
      "ms": 1771.8384,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-04: «تكليف أي موظف» — أي موظف في نطاق الحساب، وبيدير اللي كلّف بيه هو بس وبحقه دلوقتي، والصلاحية مش في أي دور جاهز",
      "ms": 421.0758,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-05: اللي كلّف بيها بيديرها بحقه دلوقتي — مسؤولها خرج من تحته = لا يشوفها ولا يديرها، ورجع = رجعت؛ و«فريقي» فيه اللي كلّف بيه حد أبعد من مرؤوسيه",
      "ms": 322.3121,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-06: المسؤول مايرفضش ولا يحوّل ولا يلغي ولا يغيّر الموعد؛ و«مش بتاعتي» تعليق بعلامته بيتشاور فيه للي كلّف من الخادم",
      "ms": 443.3076,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-07: طلب تمديد الميعاد — للمسؤول بسبب، واحد معلّق، واللي بيدير المهمة يوافق أو يرفض، وبيتشال مع تغيير الموعد أو التحويل أو الإقفال",
      "ms": 907.7258,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-08: «خلص لما» والميزة مفتوحة — مهمة معلّمة، اتقفلت متأخر يومين بإثبات، اترجّعت مرة بسبب، واتقبلت واتقيّمت 4؛ وكله في السجل والتقرير",
      "ms": 797.6609,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-09: نفس السيناريو والميزة مقفولة — من غير علامة ولا تقييم ولا خاناتهم، والالتزام والرجوع شغالين",
      "ms": 687.2359,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-10: التقرير — صاحب «عرض كل المهام» في نطاقه، والمدير على اللي يشوفه، وغيرهم فاضي؛ ومهمة الدور والشخصية برّاه؛ وحدود الفترة",
      "ms": 304.3668,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-11: سجل المهمة — كل تغيير سطر في حوارها بعلامة نوعه وباسم اللي عمله، بيتقري بحكم المهمة",
      "ms": 576.9054,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-12: حالة ميزة التقييم بتتقري قبل معاملة المهمة مش جواها (CRP2Y-B02) — تعديل العلامة، والإقفال، والرجوع، والتقييم",
      "ms": 303.2297,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 11899.0183,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 996.112,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1045.5312,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 1235.217,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 1095.4681,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 1889.932,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 686.5142,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 608.5427,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 1173.5813,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 667.9131,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.5887,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 4.4947,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1795.8179,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 8309.1546,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-14 (B1.7): «بصمة الجهاز بس» مفتوح — يوم بصمات الجهاز بيتعتمد تلقائي، ويوم فيه بصمة يدوية أو تصحيح بصمة بيروح لسلسلته؛ والمقفول زي النهارده",
      "ms": 2992.4561,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-15 (B1.7): الضابط مفتوح والسقف الشهري صفر — فترة «اعتماد تلقائي» جديدة أو معدّلة مرفوضة برسالة، والإيقاف والقفل وشيل العلامة مسموحين؛ والسقف أكبر من صفر بيعدّي",
      "ms": 457.9122,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-01: نوع طلب للسعوديين على عقد محدد المدة — بيظهر ويتقدّم للي ينطبق عليه بس، والعضوية بصفات الموظف دلوقتي",
      "ms": 11764.2016,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-02: الحفظ — الشروط بتتدقق، والشكل المتخزّن من غير شروط زي ما هو بالحرف",
      "ms": 187.116,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-03: الدرجة وتاريخ التعيين، وشاشة الخصم بتقرا صفات الموظف لما جمهور النوع فيه شروط",
      "ms": 150.7687,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-audience-conditions.integration.cjs",
      "name": "AD-04: أول تقديم لمسودة بيتحكم بجمهور النوع دلوقتي — والنيابة زي الإنشاء، والمرجّع للاستكمال بيكمّل، والشرط التالف بيقفل",
      "ms": 810.8628,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "ms": 12010.1343,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "ms": 979.4197,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "ms": 1068.5611,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "ms": 1672.053,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "ms": 1400.5765,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "ms": 710.8089,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "ms": 2447.307,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "ms": 2346.6505,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "ms": 2122.2402,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "ms": 4245.8164,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "ms": 429.4235,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "ms": 231.2544,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "ms": 2354.1019,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "ms": 3340.4997,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-01: النماذج والدورات — القيم، ونطاق الفروع، والإطلاق بتكليف لكل موظف شغال بمديره ونسخة نموذج متجمّدة",
      "ms": 12391.7447,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-02: التقييم الذاتي وتقييم المدير — مرة واحدة، على النموذج المتجمّد وأهداف الفترة، والدرجة بالأوزان، والأدلة بتتجمّد مع الرد",
      "ms": 527.9492,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-03: إدارة الأداء — تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات",
      "ms": 211.2731,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-04: الاعتماد والإعلان والإقرار — المدير سلّم ← معتمد ← معلن ← الموظف أقرّ، وتقييم المدير بيظهر للموظف بعد الإعلان بس",
      "ms": 329.7191,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-05: المعايرة والاعتراض — تعديل بسبب قبل الاعتماد بيتسجّل (قبل/بعد/مين)، وتوزيع التقديرات لكل مدير، والاعتراض طلب مربوط بتقييم معلن في مهلته ومرة واحدة، والمعايرة بعد اعتراض اتقبل",
      "ms": 1451.4001,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-06: a cycle with a unified audience (a unit with what is under it, minus the excluded) launches for its people only, inside the manager's branches",
      "ms": 149.1432,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-01: الموديول مقفول افتراضيًا؛ الكتالوج بقيمه وتعديله بالخانات؛ والجلسات بقيمها ونطاق الفروع",
      "ms": 13035.5836,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-02: التسجيل تحت قفل الجلسة بنطاق الفروع والسعة، والحضور والإكمال، والشهادة مستند موظف بانتهائه، والمقفول مابيتغيّرش",
      "ms": 789.6845,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-03: الموظف — «دوراتي» بشهادته، وتقييم التدريب مرة واحدة بعد الحضور، ومش لتسجيل غيره",
      "ms": 195.7159,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-04: «طلب تدريب» — الجلسة من المتاح لفرع مقدّم الطلب، ورقمها بيثبّته الخادم، والاعتماد النهائي بيسجّله تحت قفل الجلسة والسعة، والجلسة اللي راحت بتوقّف الاعتماد",
      "ms": 1223.8084,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-05: ميزانية الأقسام وتقرير التكلفة مقابلها بنطاق الفروع، والتدريب الإلزامي لمسمى أو قسم والناقص منه (لإدارة التدريب، وللمدير عن فريقه)",
      "ms": 678.6735,
      "pass": true,
      "skip": false
    },
    {
      "file": "training.integration.cjs",
      "name": "TR-06: enrolling by a unified audience registers the current employees of the audience inside the account scope, under the same session rules",
      "ms": 183.0762,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 13823.2206,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 6712.8774,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 1713.7824,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 237.5467,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 1435.3865,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1569.4762,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 3371.1068,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR29-B01: أمر دوام العطلة لموظفين بالاسم بيتحفظ تحت قفلهم المالي — موظف اتنقل لفرع تاني قبل القفل بيرفض الأمر كله، وكمان تعديل أمر قائم ليه",
      "ms": 174.5894,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR30-B01: تعديل أو إلغاء أمر عطلة، وتعديل أو حذف فترة إضافي، بصلاحية الفرع القديم وقت ما السجل نفسه بيتنقل لفرع تاني — مابيتحفظوش",
      "ms": 342.634,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR31-B01: تعديل أمر عطلة اتحفظ والأمر اتنقل لفرع تاني واتسمّى بعدها على طول — الرد مابيكشفش الاسم الجديد",
      "ms": 145.4703,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "calendar metadata enforces source identity, read permission and branch scope; global contents contain no branch rules",
      "ms": 11224.1435,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "explicit first confirmation proves only its dated interval and never infers history from joinDate",
      "ms": 374.9765,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "calendar changes require date, reason and current CAS, even for create/delete/toggle",
      "ms": 115.1827,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "holiday create and dated removal retain the old holiday period and public holiday wins over work exception",
      "ms": 634.344,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "future global weekends change only future day kinds and rejects back-insertion into its complete snapshot timeline",
      "ms": 280.9503,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "two concurrent calendar writes allow one committed scope version without lost update",
      "ms": 121.1388,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "branch users cannot change global calendars or foreign branch calendars; branch-only rule does not leak",
      "ms": 121.448,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "dated employee branch changes preserve past organization and require source CAS; future profile move is rejected",
      "ms": 412.8922,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "noncalendar profile and branch edits preserve money and do not create calendar revisions",
      "ms": 207.1212,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "current source drift and tampered immutable history fail closed and never manufacture a new baseline",
      "ms": 64.961,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "failed calendar append rolls back source mutation atomically",
      "ms": 95.9342,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "new branch has an observed creation-date calendar and never backfills its historical configuration",
      "ms": 66.8661,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "approved and paid payroll memberships block calendar rewrites with no payroll or source mutation",
      "ms": 529.929,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "a settled service also blocks retrospective calendar changes before its final working day",
      "ms": 152.4803,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "employee creation records only the observed creation date when no explicit calendar date was supplied",
      "ms": 226.4836,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "an explicit creation calendar date records both branch and schedule without deriving either from joinDate",
      "ms": 178.6879,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "candidate hiring supplies the real actor to employee calendar creation and enforces target branch scope",
      "ms": 294.5043,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-01: a team leader with the plain employee role sees his own team only, without salaries; the module is closed until opened",
      "ms": 11274.5087,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-02: a department head sees the whole tree under him, with direct reports marked and today's leave counted",
      "ms": 103.9066,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-03: salaries appear only with the compensation right, and only for members inside the account's branch scope",
      "ms": 137.1147,
      "pass": true,
      "skip": false
    },
    {
      "file": "team-dashboard.integration.cjs",
      "name": "TD-04 (CRP3D): a unit name follows the unit's current branch — a department moved outside the reader's branches is not named",
      "ms": 162.3871,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل",
      "ms": 12304.6183,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب",
      "ms": 335.3353,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي",
      "ms": 2276.1329,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر",
      "ms": 181.2176,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام",
      "ms": 474.052,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار",
      "ms": 636.7381,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال",
      "ms": 7384.0737,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
      "ms": 850.3784,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق",
      "ms": 5518.8823,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-10: قفل تعديل الحساب مايستنفدش اتصالات القاعدة — نص المخزن بالكتير، والباقي بيستنى دوره من غير اتصال",
      "ms": 1296.6212,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-01: تعريف الحقول — «إدارة الإعدادات» بس، والأنواع الخمسة، والمفتاح والنوع ثابتين، والتعطيل بيخبّي والقيم بتفضل، والتغيير في التدقيق",
      "ms": 9903.6023,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-02: قراءة قيم الموظف بقاعدة ملفه — صاحبه أو «عرض الموظفين» في نطاقه، والمقيّد للي يعدّل الملف بس",
      "ms": 106.7784,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-03: الحفظ — «تعديل الموظفين» في النطاق، وكل نوع بقيمته، والغلط من غير أي كتابة، والإلزامي مايتفضّاش",
      "ms": 461.4298,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-04: شرط الجمهور بالحقل المخصص — للي قيمته من القايمة بس، والحفظ بيدقق، وحقل اتعطّل أو بقى مقيّد = مفيش حد",
      "ms": 867.7901,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-05: الحقول بحد أقصى 50، والمعطّل محسوب",
      "ms": 77.0397,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-custom-fields.integration.cjs",
      "name": "EF-06: القراءة والحفظ تحت قفل واحد باسم الموظف — قيمة اتحفظت بعد بداية القراءة مابترجعش فيها، واللي مايلاقيش القفل «حاول تاني»",
      "ms": 10283.6525,
      "pass": true,
      "skip": false
    },
    {
      "file": "job-share.integration.cjs",
      "name": "JS-01: لوحة «انشر الوظيفة» — بصلاحيتها وبنطاق الفروع، وللمنشورة «خارجي» بس وبشكلها العام، وقنوات النشر، ومن غير كتابة",
      "ms": 14788.2695,
      "pass": true,
      "skip": false
    },
    {
      "file": "job-share.integration.cjs",
      "name": "JS-02: «خلص لما» — لينك LinkedIn من اللوحة ← مرشح قدّم منه ← مصدره «LinkedIn» في المرشحين وفي «مصادر المرشحين»؛ والمجهول «لينك عام»",
      "ms": 624.1014,
      "pass": true,
      "skip": false
    },
    {
      "file": "job-share.integration.cjs",
      "name": "JS-03: الفيد العام — ورا ميزة الصفحة العامة، والمنشور «خارجي» بس وبخاناته العامة، ولينك التقديم بمصدره",
      "ms": 240.3646,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-01: مرشح على وظيفة — المسمى والفرع منها، والنطاق، والحالة، وفحص التكرار، والإضافة من غير وظيفة زي ما هي",
      "ms": 14139.5722,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-02: وظائف داخلية — المنشور داخليًا في فرع الموظف الحالي بس، والتقديم مرة واحدة من بيانات الملف، والحكم بالفرع الحالي",
      "ms": 395.1901,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-03: الموديول المقفول بيقفل المسارات، ومن غير دخول 401",
      "ms": 123.9622,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-04: صفحة الوظائف العامة — الميزة المقفولة 404، والمفتوحة بتعرض المنشور «خارجي» بس ومن غير راتب ولا قسم",
      "ms": 212.5445,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-05: التقديم من اللينك — القيم والموافقة والسيرة الذاتية، والمكرر بنفس الرد من غير صف، وغير المنشور خارجيًا غير موجود، والحد 429",
      "ms": 297.2871,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-06: السيرة الذاتية بتتقري بحكم المرشح — مسؤول توظيف فرعه بس",
      "ms": 151.8227,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-07: نقل المراحل — كل نقل سطر في السجل، والجماعي كلهم أو ولا واحد، والسجل بنطاق المرشح واسم اللي نقل بنطاق القارئ",
      "ms": 364.036,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-08: تحديد مقابلة — القيم، ونطاق المرشح والمحاورين، والبطاقات الفاضية، والدعوة بالبريد",
      "ms": 310.6561,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-09: بطاقات التقييم — المحاور بيسلّم مرة واحدة ومابيشوفش بطاقات غيره قبل ما يسلّم، وبيقرا سيرة المرشح وهو محاور بس",
      "ms": 273.8873,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-10: قفل المقابلة وإلغاؤها وملف الدعوة — من «محددة» بس، والملغاة بتختفي من «مقابلاتي» وبطاقتها مابتتسلّمش",
      "ms": 332.7321,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-11: عرض العمل — القيم والنطاق، وعرض مفتوح واحد، وتحذير النطاق، والاعتماد بصلاحيته ولغير اللي عمله، والإرسال بلينك برمز",
      "ms": 599.9582,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-12: رد المرشح — من اللينك مرة واحدة وبدليله، أو مسجّل من مسؤول التوظيف؛ والمسحوب والمنتهي والميزة المقفولة = اللينك مابيشتغلش",
      "ms": 474.5647,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-13: التعيين من العرض — العرض المقبول مع المرشح في القايمة، والوظيفة بتتقفل لما عدد المُعيَّنين يكمل",
      "ms": 267.2451,
      "pass": true,
      "skip": false
    },
    {
      "file": "candidate-applications.integration.cjs",
      "name": "CA-14: أرقام التوظيف — بنطاق فروع الحساب ومتطابقة مع الصفوف",
      "ms": 127.1186,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-01: طلب «احتياج توظيف» — حقوله من الخادم، وفحوص التقديم، والقسم المتثبّت، والاعتماد بيعمل وظيفة مسودة بمرجعها",
      "ms": 16136.3059,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-02: شاشة الوظائف — بصلاحية إدارة التوظيف وبنطاق فروع الحساب؛ الإنشاء والتعديل بالخانات؛ والوحدة مابتتغيّرش؛ واسم القسم بفرعه الحالي",
      "ms": 449.2326,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-03: الحالة — النشر محتاج وصف ومكان نشر، منشورة ↔ موقوفة، والقفل نهائي، وكل تغيير في سجل التدقيق، والموديول المقفول بيقفل المسارات",
      "ms": 429.0543,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_orgaudience_test_b8b9571433344d7b",
    "تحقق حذف قاعدة الاختبار: hr_otaudience_test_3d0171f85cf04b45",
    "600 employees, 60 without a row — first open 1184 ms (cards in parallel: {\"tasks\":127,\"requests\":144,\"leaves\":155,\"trends\":179,\"overtime\":201,\"workforce\":220,\"payroll\":271,\"absentLate\":1177,\"attendance\":1178}), second open 157 ms, drill-down + names 48 ms",
    "600 employees, 300 without a row — first open 2572 ms (cards in parallel: {\"tasks\":112,\"requests\":113,\"leaves\":122,\"trends\":123,\"workforce\":159,\"overtime\":173,\"payroll\":198,\"absentLate\":2568,\"attendance\":2569}); the attendance engine's own live-absence pass for the same scope: 2008 ms (0 rows); names of one team with shifts 74 ms",
    "تحقق حذف قاعدة الاختبار: hr_dashboard_cards_test_21fe0b78ccba6a89",
    "Cleanup verified: hr_notify_channels_test_31ebb409f3e7ba3a is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_announcements_test_28576b08ee9ca04c",
    "تحقق حذف قاعدة الاختبار: hr_annhome_test_423e2478878ca0bb",
    "Cleanup verified: hr_policies_test_57488d1fc1dabebb is absent from sys.databases.",
    "Cleanup verified: hr_modules_settings_test_adfa2e2feec27733 is absent from sys.databases.",
    "Cleanup verified: hr_modules_test_2abc73285584c7e0 is absent from sys.databases.",
    "Cleanup verified: hr_tasks_test_de25ea727460ce5a is absent from sys.databases.",
    "Cleanup verified: hr_task_rules_test_3bf9b797ec4b06b3 is absent from sys.databases.",
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "Cleanup verified: hr_ot_auto_approve_test_6311e61825705cb6 is absent from sys.databases.",
    "Cleanup verified: hr_audience_test_8ad523ce48078ac7 is absent from sys.databases.",
    "Cleanup verified: hr_notifications_test_64c38b1916463ecc is absent from sys.databases.",
    "Cleanup verified: hr_perf_reviews_test_e56ac9d6044b9693 is absent from sys.databases.",
    "Cleanup verified: hr_holiday_work_test_cb30ad468b0ddd29 is absent from sys.databases.",
    "Cleanup verified: hr_calendar_history_test_a694271bc696a7db removed.",
    "Cleanup verified: temporary uploads removed.",
    "تحقق حذف قاعدة الاختبار: hr_team_dashboard_test_f830652fa10f1ad7",
    "Cleanup verified: hr_comments_test_11b78736d9e7dd09 is absent from sys.databases.",
    "Cleanup verified: hr_custom_fields_test_2be1eefe2bb415e9 is absent from sys.databases.",
    "Cleanup verified: hr_job_share_test_a6d570e1e1910145 is absent from sys.databases.",
    "Cleanup verified: hr_candidate_apps_test_cb2a4b2bc6273851 is absent from sys.databases.",
    "Cleanup verified: hr_recruitment_jobs_test_3234d42b3b1e7688 is absent from sys.databases.",
    "tests 226",
    "suites 0",
    "pass 226",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 307416.1284"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_orgaudience_test_b8b9571433344d7b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_orgaudience_test_b8b9571433344d7b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_otaudience_test_3d0171f85cf04b45\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_otaudience_test_3d0171f85cf04b45\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_dashboard_cards_test_21fe0b78ccba6a89\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_dashboard_cards_test_21fe0b78ccba6a89\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_channels_test_31ebb409f3e7ba3a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_channels_test_31ebb409f3e7ba3a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_announcements_test_28576b08ee9ca04c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_announcements_test_28576b08ee9ca04c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_annhome_test_423e2478878ca0bb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_annhome_test_423e2478878ca0bb\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_surveys_test_e35adfc585fc9ce0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_surveys_test_e35adfc585fc9ce0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_helpdesk_test_72bed510cff31ee5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_helpdesk_test_72bed510cff31ee5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policies_test_57488d1fc1dabebb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policies_test_57488d1fc1dabebb\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_settings_test_adfa2e2feec27733\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_settings_test_adfa2e2feec27733\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_2abc73285584c7e0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_2abc73285584c7e0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_tasks_test_de25ea727460ce5a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_tasks_test_de25ea727460ce5a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_task_rules_test_3bf9b797ec4b06b3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_task_rules_test_3bf9b797ec4b06b3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_6311e61825705cb6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_6311e61825705cb6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audience_test_8ad523ce48078ac7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audience_test_8ad523ce48078ac7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notifications_test_64c38b1916463ecc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notifications_test_64c38b1916463ecc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_reviews_test_e56ac9d6044b9693\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_reviews_test_e56ac9d6044b9693\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_training_test_c4696fb36729ae1d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_training_test_c4696fb36729ae1d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_work_test_cb30ad468b0ddd29\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_work_test_cb30ad468b0ddd29\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_calendar_history_test_a694271bc696a7db\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_calendar_history_test_a694271bc696a7db\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_team_dashboard_test_f830652fa10f1ad7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_team_dashboard_test_f830652fa10f1ad7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comments_test_11b78736d9e7dd09\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comments_test_11b78736d9e7dd09\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_custom_fields_test_2be1eefe2bb415e9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_custom_fields_test_2be1eefe2bb415e9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_job_share_test_a6d570e1e1910145\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_job_share_test_a6d570e1e1910145\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_candidate_apps_test_cb2a4b2bc6273851\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_candidate_apps_test_cb2a4b2bc6273851\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recruitment_jobs_test_3234d42b3b1e7688\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recruitment_jobs_test_3234d42b3b1e7688\"}\n"
  ]
}
