module.exports = {
  "selected": [
    "session-cookie",
    "user-sessions",
    "totp",
    "modules-enforcement",
    "file-upload-type",
    "tasks",
    "policies",
    "request-execution",
    "request-decision-race"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 118,
      "failed": 8,
      "passed": 110,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 118,
      "suites": 0
    },
    "duration_ms": 73534.0067
  },
  "results": [
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token",
      "ms": 7947.6489,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session's CSRF token",
      "ms": 400.7803,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-03: logout clears the cookie only for a request that carries it",
      "ms": 100.9352,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie",
      "ms": 891.2283,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one",
      "ms": 490.35,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
      "ms": 348.498,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token",
      "ms": 188.4866,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only",
      "ms": 7769.61,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-02: ending one session kills its token only; another account's session answers like a missing one",
      "ms": 669.086,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
      "ms": 211.759,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule",
      "ms": 737.5403,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-01: an account turns the authenticator on by confirming a code; the secret is shown once and stored sealed",
      "ms": 8678.8917,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-02: an enrolled account logs in with the app code as the second step — once, with no mail, and wrong codes lock the check for a while",
      "ms": 1417.6377,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-03: a role named in the setting must turn the authenticator on before anything else, and cannot turn it off",
      "ms": 890.0785,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-04: a manager resets an account's authenticator inside his branches; a system admin's only by a system admin",
      "ms": 1267.3857,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-05 (CRP3D): the reset keeps the password-takeover boundary and is re-judged under the account row lock; a mail code opened before enrolment opens nothing after it",
      "ms": 1621.8935,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-06 (CRP3E): a reset is refused when the account version moved after the judgment; a mail-code login that the enrolment overtakes opens no session",
      "ms": 1324.16,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-07 (CRP3F): a stale account or role save cannot write over a promotion, and a password-only login that the enrolment overtakes opens no session",
      "ms": 1062.1842,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-08 (CRP3G): a password change issues its session from the account as it is now, and a role being assigned is pinned until the save",
      "ms": 1068.9905,
      "pass": true,
      "skip": false
    },
    {
      "file": "totp.integration.cjs",
      "name": "TP-09 (CRP3H): a role without a row is pinned for an assignment, and an override replacement is refused when its basis moved",
      "ms": 2350.5991,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 7861.4861,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 109.1458,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 264.5415,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 418.1251,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 125.9496,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 286.7033,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 246.5182,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 461.1364,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1369.539,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 292.3223,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 539.3592,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 150.8882,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص",
      "ms": 7629.2362,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 50.5335,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض",
      "ms": 61.9104,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال",
      "ms": 81.2624,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس",
      "ms": 83.4133,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين",
      "ms": 58.8705,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-07 (CRP2A-B02): النوع من بنية الحاوية — ZIP بتعليق «word/document.xml» مش Word، وExcel قديم متسمي .doc مش Word، ومفيش حاجة اتكتبت",
      "ms": 112.5662,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-08 (CRP2B-A-B01): الرفع الفعلي — نوع ماكرو بتصريح Word جوه تعليق XML مش Word، ومجلد OLE اسمه WordDocument مش Word، والسليم لسه بيتقبل",
      "ms": 212.8572,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-09 (CRP2C-A-B01): الرفع الفعلي — تيار Word من غير بايتات تتقري، أو قطاع بيشاور على نفسه، أو محتواه مش Word = مرفوض؛ وملف تعريف مش XML سليم مرفوض",
      "ms": 171.7104,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-01: مهمة لموظف — في «مهامي» بتاعته بس، ويشوفها أصحاب الحق، وبرّه كده 404",
      "ms": 8220.6485,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-02: حدود التكليف — مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، ومن غير كاشف وجود",
      "ms": 132.9248,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-03: المدير المباشر بيكلّف مرؤوسيه من غير صلاحية — مش غيرهم ولا دور",
      "ms": 112.9382,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-04: الحالة — المسؤول يبدأ ويعلّق ويقفل بإثبات، والمنشئ يلغي ويعيد الفتح، وإقفالين في نفس اللحظة واحد بس",
      "ms": 844.6228,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-05: مهمة الدور — لحاملي الدور اللي فرعها في نطاقهم، ومش مدير النظام في «مهامي» بتاعته",
      "ms": 151.1088,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-06: «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم",
      "ms": 1064.7506,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-07: «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف",
      "ms": 1280.597,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-08: قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول",
      "ms": 189.691,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-09: التعديل والتحويل للمنشئ أو صاحب الصلاحية — التحويل تكليف جديد، وتغيير الموعد بيرجّع التذكير",
      "ms": 601.3869,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-10: التذكير والتصعيد مرة واحدة لكل مهمة وموعد، بأيام الإعدادين، والمقفولة برّه",
      "ms": 612.0598,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-11: التهيئة وقت التعيين — المهام بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة",
      "ms": 1257.725,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة",
      "ms": 149.1579,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-13: حدود الإعدادين",
      "ms": 160.3547,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-14: إشعارات المهام بالبريد — تكليف وتذكير للمسؤول، وتأخير لمديره، بالعنوان والموعد بس وبفحص وقت الإرسال",
      "ms": 3984.1906,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها",
      "ms": 949.3149,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-16: طلبات متزامنة أكتر من اتصالات المجمّع — كل طلب على اتصال معاملته، ومحدش بيستنى اتصال تاني",
      "ms": 2967.4149,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-17: مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server) — «فريقي» وقايمة التكليف و«مهامي» شغالين",
      "ms": 3779.4495,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks.integration.cjs",
      "name": "TK-18: مهمة مسوغات التعيين في «مهامي» حالتها من المستندات دلوقتي — من غير ما شاشة التهيئة تتفتح الأول",
      "ms": 496.9177,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة",
      "ms": 7961.2744,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة",
      "ms": 461.8671,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية",
      "ms": 370.8381,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل",
      "ms": 247.7123,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا",
      "ms": 556.9199,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه",
      "ms": 424.9251,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها",
      "ms": 199.8432,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ",
      "ms": 208.6539,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة",
      "ms": 560.958,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة",
      "ms": 826.0542,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies.integration.cjs",
      "name": "PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب",
      "ms": 72.6961,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 7935.674,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 159.9332,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 192.2883,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 130.5925,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 1307.0138,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 233.9552,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 111.0354,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 280.3111,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 220.8297,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 200.7798,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.3953,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 164.5428,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 62.6677,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 162.1429,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 100.3951,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 45.3046,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 195.476,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 54.0338,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 215.994,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 92.9877,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 127.5336,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1425.3506,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 232.7663,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 233.8034,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 549.1596,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 85.5786,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 131.6505,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 87.2686,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 196.9424,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 324.6564,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 359.1533,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 69.0335,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 72.4818,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 197.0944,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 76.5007,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 152.915,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 80.7468,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 163.6256,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 121.699,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 116.6568,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 16.1731,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.6411,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.1212,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0818,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0827,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0432,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0688,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.1324,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "failures": [
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 16.1731,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.6411,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.1212,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0818,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 0.0827,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 0.0432,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.0688,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 0.1324,
      "pass": false,
      "error": "failed running before hook",
      "cause": "The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The input did not match the regular expression /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/. Input:\n\n'hr_decision_race_d7e3a19bbe1a744e'\n\n    at Object.safeDatabase (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round2-harness.cjs:10:39)\n    at Request.sql.Request.<computed> [as query] (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-round5-harness.cjs:17:48)\n    at TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-decision-race.integration.cjs:47:26)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_session_cookie_test_d42af5d367280ef5",
    "تحقق حذف قاعدة الاختبار: hr_user_sessions_test_b039c4ecca0b84e9",
    "تحقق حذف قاعدة الاختبار: hr_totp_test_363956cd26878543",
    "Cleanup verified: hr_modules_test_617c26f86c7e8a64 is absent from sys.databases.",
    "Cleanup verified: hr_file_upload_test_8f8f14ae9fae2033 is absent from sys.databases.",
    "Cleanup verified: hr_tasks_test_cc7fca64ec724f3e is absent from sys.databases.",
    "Cleanup verified: hr_policies_test_c711bb0ee45a44b9 is absent from sys.databases.",
    "tests 118",
    "suites 0",
    "pass 110",
    "fail 8",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 73534.0067"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_session_cookie_test_d42af5d367280ef5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_session_cookie_test_d42af5d367280ef5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_sessions_test_b039c4ecca0b84e9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_sessions_test_b039c4ecca0b84e9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_totp_test_363956cd26878543\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_totp_test_363956cd26878543\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_617c26f86c7e8a64\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_617c26f86c7e8a64\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_upload_test_8f8f14ae9fae2033\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_upload_test_8f8f14ae9fae2033\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_tasks_test_cc7fca64ec724f3e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_tasks_test_cc7fca64ec724f3e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policies_test_c711bb0ee45a44b9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policies_test_c711bb0ee45a44b9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_dae612eed8e23ad3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_dae612eed8e23ad3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
