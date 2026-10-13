module.exports = {
  "selected": [
    "domain-login-two-factor",
    "session-cookie",
    "user-sessions",
    "manager-of-direct-manager",
    "administration-level",
    "approval-chain-holders",
    "notifications",
    "modules-enforcement",
    "people-feedback"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 70,
      "failed": 4,
      "passed": 66,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 70,
      "suites": 0
    },
    "duration_ms": 136204.4169
  },
  "results": [
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token",
      "ms": 20233.5712,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session's CSRF token",
      "ms": 707.2064,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-03: logout clears the cookie only for a request that carries it",
      "ms": 150.9876,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n    {\n      ok: true\n    },\n    [\n      'hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',\n+     'hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0'\n    ]\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n    {\n      ok: true\n    },\n    [\n      'hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',\n+     'hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0'\n    ]\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n    {\n      ok: true\n    },\n    [\n      'hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',\n+     'hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0'\n    ]\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\session-cookie.integration.cjs:184:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie",
      "ms": 1486.5918,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one",
      "ms": 769.1255,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
      "ms": 146.7498,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    '__Host-hr_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0',\n+   '__Secure-hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Secure; Max-Age=0'\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    '__Host-hr_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0',\n+   '__Secure-hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Secure; Max-Age=0'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    '__Host-hr_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0',\n+   '__Secure-hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Secure; Max-Age=0'\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\session-cookie.integration.cjs:256:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token",
      "ms": 145.4208,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n+   2\n-   1\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n+   2\n-   1\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n+   2\n-   1\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\session-cookie.integration.cjs:279:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only",
      "ms": 20319.8469,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-02: ending one session kills its token only; another account's session answers like a missing one",
      "ms": 1082.8272,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
      "ms": 344.444,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n2 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\user-sessions.integration.cjs:186:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule",
      "ms": 1214.8404,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس",
      "ms": 18730.3895,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة",
      "ms": 166.0698,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش",
      "ms": 261.2883,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو",
      "ms": 78.6488,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه",
      "ms": 70.4638,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف",
      "ms": 53.7759,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06b: دايرة أطول في المديرين المسجّلين (3 و4 أشخاص) — «مدير المدير» مرؤوس لمقدّم الطلب، فالتقديم بيقف (CR10-N01)",
      "ms": 241.9959,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06c: لفّة التدرّج الطبيعية (مدير فرع جوه قسم مديره تحته) مابتتحسبش دايرة — الخطوة بتروح لمدير الفرع",
      "ms": 173.7514,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه",
      "ms": 136.123,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-08: «مدير المدير المباشر» مش مقبول كجهة تصعيد (إنشاء السلسلة وتعديل الخطوة)",
      "ms": 35.6663,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-09: الشاشة — الاختيار ظاهر بعد «المدير المباشر» ومش في قايمة التصعيد، وتسميته في الصناديق",
      "ms": 22.9062,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-01: إدارة وأقسامها وقسم فرعي؛ الإدارة التنفيذية بتتعمل «إدارة» لوحدها؛ وإدارة فرع تحت الإدارة التنفيذية من فرع تاني",
      "ms": 18492.7929,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-02: قواعد الأب — إدارة تحت قسم أو إدارة عادية، قسم تحت إدارة فرع تاني، تحويل لإدارة وأبوه مايصلحش، ونوع غلط: كله مرفوض ومفيش حاجة بتتكتب",
      "ms": 145.7631,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-03: المسموح — تحويل قسم رئيسي أو تحت الإدارة التنفيذية لإدارة والعكس، وإدارة لقسم وأقسامها فرعية، والهيكل القائم بيتعدّل من غير إجبار",
      "ms": 237.1982,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-04: الإدارة التنفيذية «إدارة» دايمًا ومالهاش أب، وشيل تعليمها (صريح أو ضمني) مرفوض طول ما تحتها إدارات",
      "ms": 127.2558,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-05: «مدير الإدارة» — موظف قسم تحت إدارة بيروح لمديرها، وهو بس اللي بيعتمد",
      "ms": 344.8807,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-06: قسم فرعي على مستويين تحت الإدارة — نفس مدير الإدارة",
      "ms": 58.6098,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-07: مدير الإدارة هو مقدّم الطلب — الخطوة بتطلع للإدارة التنفيذية برابطها لفرع تاني، والرئيس بيعتمد من حساب «كل الفروع»",
      "ms": 185.5673,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-08: الإيقاف برسالة بتسمّي الوحدة — مفيش قسم، مفيش إدارة، الإدارة مالهاش مدير، المدير الوحيد هو مقدّم الطلب",
      "ms": 305.5877,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-09: السرّي مابيتخطّاش «مدير الإدارة» (زي «مدير القسم»)، والدور مش مقبول كجهة تصعيد",
      "ms": 197.1643,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-10: فلتر المسير وجمهور العطلات على إدارة بيشملوا أقسامها — في فرعها بس",
      "ms": 1234.8796,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-11: «الإدارة» في بطاقة صاحب الطلب — الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، ومحجوبة مع orgHidden",
      "ms": 368.1203,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-12: حساب الفرع — إدارة في فرعه وقسم تحتها، والربط تحت الإدارة التنفيذية برّه نطاقه 403، والقائمة ماتكشفش اسمها",
      "ms": 113.4096,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-13: تعليم قسم «إدارة تنفيذية» بيخلّيه «إدارة» تلقائي، والتنفيذية القديمة إدارة عادية تتحول قسم وأقسامها فرعية",
      "ms": 113.6799,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-01: الثغرات بالصلاحيات النهائية — حزمة الدور والمنح والعمود القديم بيحملوا، والمسحوبة والحساب الموقوف ومدير النظام لأ، والفرع المقفول مالوش تحذير",
      "ms": 18870.8846,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-02: قارئ الرياض بيشوف فرعه بس — ولا اسم فرع جدة في الرد",
      "ms": 78.0446,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-03: حامل جديد بيقفل الثغرة فورًا، ونسخة فرع مفعّلة بتشيل فرعها من العامة وبتتفحص لوحدها، والتحذير مابيمنعش الحفظ",
      "ms": 236.5765,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-04 (D12): كشف «المدير المسجل غير قائد الفريق» — بنطاق الحساب، والقائد نفسه والمدير الفاضي والموقوف مش في الكشف، ومفيش أي تعديل",
      "ms": 236.8437,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي",
      "ms": 19403.8125,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر",
      "ms": 1591.4595,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد",
      "ms": 1602.7657,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس",
      "ms": 2345.5777,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس",
      "ms": 1682.4837,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد",
      "ms": 745.9006,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور",
      "ms": 4482.8371,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها",
      "ms": 3805.8912,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش",
      "ms": 3637.0871,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس",
      "ms": 5428.4371,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي",
      "ms": 817.6307,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة",
      "ms": 424.1705,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»",
      "ms": 3408.7681,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications.integration.cjs",
      "name": "NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري",
      "ms": 4755.5155,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 20094.6017,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 214.989,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 490.7013,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 659.2981,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 254.7614,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 418.4062,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 496.868,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 743.8387,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 2523.5133,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 590.5037,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 979.4338,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 211.7759,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-01: الميزات التلاتة مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيلات الشاشات بتقول ناقص ومفيش كتابة؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 19239.041,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-02: ترشيح الزملاء — لدورة مفتوحة للموظف فيها تكليف، من زملاء فرعه على رأس العمل (مش نفسه ولا مديره)، وقراره للمدير المباشر دلوقتي أو صاحب الصلاحية في نطاقه",
      "ms": 714.3507,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-03: الرد والنتيجة — رد واحد لكل دعوة معتمدة والدورة مفتوحة، من غير مقيّم ولا وقت ولا سطر تدقيق؛ والنتيجة بعد قفل الدورة، بحد أدنى للردود، ومش للموظف نفسه",
      "ms": 761.1899,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-04: اجتماعات 1:1 — بيحددها المدير المباشر دلوقتي، لطرفيها بس؛ الأجندة للطرفين والباقي للمدير؛ مهمة المتابعة في محرك المهام؛ وبتظهر في تقويم الطرفين",
      "ms": 1084.2927,
      "pass": true,
      "skip": false
    },
    {
      "file": "people-feedback.integration.cjs",
      "name": "PF-05: التقدير — كلمة شكر لزميل على رأس العمل في فرع المرسل الحالي بحد في اليوم، في قايمة الفرع بس؛ والإخفاء بصلاحيته في نطاقه وبسطر تدقيق",
      "ms": 461.1092,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-03: logout clears the cookie only for a request that carries it",
      "ms": 150.9876,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n    {\n      ok: true\n    },\n    [\n      'hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',\n+     'hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0'\n    ]\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n    {\n      ok: true\n    },\n    [\n      'hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',\n+     'hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0'\n    ]\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n    {\n      ok: true\n    },\n    [\n      'hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',\n+     'hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Max-Age=0'\n    ]\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\session-cookie.integration.cjs:184:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
      "ms": 146.7498,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    '__Host-hr_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0',\n+   '__Secure-hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Secure; Max-Age=0'\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    '__Host-hr_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0',\n+   '__Secure-hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Secure; Max-Age=0'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    '__Host-hr_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0',\n+   '__Secure-hr_mail_key=; Path=/api/mail; HttpOnly; SameSite=Strict; Secure; Max-Age=0'\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\session-cookie.integration.cjs:256:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token",
      "ms": 145.4208,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n+   2\n-   1\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n+   2\n-   1\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n+   2\n-   1\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\session-cookie.integration.cjs:279:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
      "ms": 344.444,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n2 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\user-sessions.integration.cjs:186:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_session_cookie_test_f1291878d03914f5",
    "تحقق حذف قاعدة الاختبار: hr_user_sessions_test_6b8c2e7c8c344df1",
    "Cleanup verified: hr_skip_level_test_1719fc3a83544d7f is absent from sys.databases.",
    "Cleanup verified: hr_administration_level_test_e38755c083837707 is absent from sys.databases.",
    "Cleanup verified: hr_chain_holders_test_106d5a9671d600d4 is absent from sys.databases.",
    "Cleanup verified: hr_notifications_test_763e2acfc32801e3 is absent from sys.databases.",
    "Cleanup verified: hr_modules_test_3bfa6962e1cdaa97 is absent from sys.databases.",
    "Cleanup verified: hr_people_feedback_test_99f927221f941855 is absent from sys.databases.",
    "tests 70",
    "suites 0",
    "pass 66",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 136204.4169"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_session_cookie_test_f1291878d03914f5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_session_cookie_test_f1291878d03914f5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_sessions_test_6b8c2e7c8c344df1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_sessions_test_6b8c2e7c8c344df1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_skip_level_test_1719fc3a83544d7f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_skip_level_test_1719fc3a83544d7f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_administration_level_test_e38755c083837707\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_administration_level_test_e38755c083837707\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_holders_test_106d5a9671d600d4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_holders_test_106d5a9671d600d4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notifications_test_763e2acfc32801e3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notifications_test_763e2acfc32801e3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_3bfa6962e1cdaa97\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_3bfa6962e1cdaa97\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_people_feedback_test_99f927221f941855\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_people_feedback_test_99f927221f941855\"}\n"
  ]
}
