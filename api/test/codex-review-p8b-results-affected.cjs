module.exports = {
  "selected": [
    "missing-punch-deduction",
    "hiring-suggestions",
    "review-evaluator",
    "meet",
    "meet-calls",
    "codex-review-p8b-mailbox-copy",
    "saved-reports",
    "payroll-financial-exemptions",
    "session-cookie",
    "user-sessions",
    "positions",
    "performance-reviews",
    "recruitment-jobs"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 87,
      "failed": 3,
      "passed": 84,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 87,
      "suites": 0
    },
    "duration_ms": 146452.1038
  },
  "results": [
    {
      "file": "missing-punch-deduction.integration.cjs",
      "name": "MPD-01: المعامل مقفول (الافتراضي) — يوم البصمة الناقصة من غير خصم ولا أثر في اللقطة والقسيمة، وبيوقّف اعتماد المسير زي الأول",
      "ms": 13227.8601,
      "pass": true,
      "skip": false
    },
    {
      "file": "missing-punch-deduction.integration.cjs",
      "name": "MPD-02: المعامل مفعّل — يوم ببصمة واحدة ومن غير طلب بيتخصم بعد المسموح، واللي قدّم طلب لأ، والمستثنى برّه، والمسير بيتعتمد",
      "ms": 1832.006,
      "pass": true,
      "skip": false
    },
    {
      "file": "missing-punch-deduction.integration.cjs",
      "name": "MPD-03 (P8A-B03): طلب تصحيح اتقدّم بعد الحساب (أو طلب اترفض بعده) بيوقّف اعتماد الحساب القديم لحد ما المسير يتحسب تاني",
      "ms": 2296.2585,
      "pass": true,
      "skip": false
    },
    {
      "file": "missing-punch-deduction.integration.cjs",
      "name": "MPD-04 (P8A-B04): الإعفاء من التأخير — المعاينة والمنح بيقدّروا اللي التنفيذ هيشيله بالظبط، ومبلغ نسيان البصمة جواه",
      "ms": 1008.7954,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-suggestions.integration.cjs",
      "name": "HS-01: الاقتراح — الشاغر ناقص وظايف التوظيف المفتوحة، واللي خرج بيزوّد الشاغر لوحده، والمجمّدة والمغطّاة برّه، وبنطاق الفروع",
      "ms": 11776.9312,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-suggestions.integration.cjs",
      "name": "HS-02: فتح وظيفة من الشاغر — مسودة بعدد الناقص، مرة واحدة، بصلاحية إدارة التوظيف، وطلبين مع بعض مايفتحوش أكتر من الشاغر",
      "ms": 360.6349,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-suggestions.integration.cjs",
      "name": "HS-03 (P8A-B01): حساب برّه جمهور موديول التوظيف — مايفتحش وظيفة من الشاغر ولا بيتعرض عليه الفتح، زي ما التوظيف نفسه بيرفضه",
      "ms": 202.2048,
      "pass": true,
      "skip": false
    },
    {
      "file": "review-evaluator.integration.cjs",
      "name": "RE-01: الموظف من غير مدير بياخد مقيِّم — التكليف بيظهر عند الجديد وبيسلّم، والقديم بيخرج",
      "ms": 11905.0563,
      "pass": true,
      "skip": false
    },
    {
      "file": "review-evaluator.integration.cjs",
      "name": "RE-02: القواعد — الصلاحية والنطاق، مش نفسه، على رأس العمل، مش بعد التسليم، والدورة شغالة، وسطر تدقيق للتغيير الفعلي بس",
      "ms": 322.4388,
      "pass": true,
      "skip": false
    },
    {
      "file": "review-evaluator.integration.cjs",
      "name": "RE-03 (P8A-B02): موظف اتنقل لفرع برّه نطاق الحساب والطلب في الطريق — الحكم بفرعه بعد القفل، فالمقيِّم مابيتغيرش",
      "ms": 366.172,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet.integration.cjs",
      "name": "MT-01: الموديول مقفول افتراضيًا = المسارات مقفولة؛ ومن غير إعداد خادم الاجتماعات القراءات بترجع «مش مضبوط» والكتابة برسالة واضحة",
      "ms": 12922.5113,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet.integration.cjs",
      "name": "MT-02: ترحيل 191 — من غير الجداول القراءات فاضية والكتابة برسالة الترحيل؛ والملف بيعملهم بنفس شكل synchronize وفرقها صفر، وآمن للتكرار، وشكل تاني بيوقّفه",
      "ms": 5221.7408,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet.integration.cjs",
      "name": "MT-03: الدليل (الاسم والمسمى بس)، والإنشاء بقيمه، والدعوة بترن عند المدعو، وتذكرة الدخول الموقّعة (الهوية والصلاحيات والمدة)، والحضور",
      "ms": 525.6637,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet.integration.cjs",
      "name": "MT-04: غرفة الانتظار — غير المدعو مايدخلش من غير موافقة صاحب الاجتماع: طلب، رفض، طلب تاني، موافقة؛ والاعتذار؛ والطلب اللي صاحبه مشي بيختفي",
      "ms": 601.5733,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet.integration.cjs",
      "name": "MT-05: تحكم صاحب الاجتماع بس — كتم وإخراج وإنهاء على خادم الاجتماعات، والتعديل والإلغاء، والاجتماع بميعاد ومن غير غرفة انتظار",
      "ms": 898.027,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet.integration.cjs",
      "name": "MT-06 (P8A-B05): الاجتماع اتنهى وطلب التذكرة في الطريق — مفيش تذكرة بعد إنهاء اكتمل؛ والتذكرة عشر دقايق",
      "ms": 279.5378,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet-calls.integration.cjs",
      "name": "MC-01: الموديول مقفول = مسارات الاتصال مقفولة؛ وترحيل 198 — قبله السجل فاضي بالسبب والاتصال برسالة الترحيل والاجتماعات شغالة، والملف بنفس شكل synchronize وآمن للتكرار، وشكل تاني بيوقّفه",
      "ms": 15046.5861,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet-calls.integration.cjs",
      "name": "MC-02: قبل ترحيل 188 (من غير خانة التحويلة) — الاتصال بالاسم شغال، والاتصال بالتحويلة بيقول إن الخانة محتاجة ترحيلها",
      "ms": 226.9913,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet-calls.integration.cjs",
      "name": "MC-03: الاتصال بالتحويلة — بيرن عند صاحبها بس، مالوش صف اجتماع، والرد وتذكرة كل طرف، والقفل بينهيها للاتنين؛ والحساب التالت مالوش تذكرة ولا حالة ولا بيشوفها في أي قايمة",
      "ms": 1695.7568,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet-calls.integration.cjs",
      "name": "MC-04: تحويلة مش عند حد أو صاحبها من غير حساب نشط بنفس الرد، والاتصال بالنفس مرفوض، والقيم، وحساب مالوش وجود",
      "ms": 167.96,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet-calls.integration.cjs",
      "name": "MC-05: الاتصال بالاسم، و«مشغول» من غير ما يتقال مع مين، والرفض، وإلغاء المتصل قبل الرد، واتصالين في نفس اللحظة على نفس الشخص",
      "ms": 422.5933,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet-calls.integration.cjs",
      "name": "MC-06: محدش رد — بعد مدة الرنة المكالمة فايتة: الرنة بتقف، والرد مابقاش ينفع، والاتنين فاضيين",
      "ms": 2037.5581,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet-calls.integration.cjs",
      "name": "MC-07: مكالمة اتردّ عليها ومحدش قفلها — غرفتها الفاضية على الخادم = انتهت، واللي لسه فيها حد = مشغول؛ والموديول لما يتقفل",
      "ms": 298.6201,
      "pass": true,
      "skip": false
    },
    {
      "file": "meet-calls.integration.cjs",
      "name": "MC-08 (P8A-B05): المكالمة اتقفلت وطلب التذكرة في الطريق — مفيش تذكرة بعد إنهاء اكتمل",
      "ms": 149.5664,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-mailbox-copy.integration.cjs",
      "name": "MB-01: الموديول مقفول افتراضيًا — كل مسارات البريد 404 حتى لمدير النظام، وبتتفتح لما يتفعّل",
      "ms": 11623.2436,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-mailbox-copy.integration.cjs",
      "name": "MB-02: البريد مش مضبوط على الخادم — الحالة بتقول، وكل مسار 503 بكود ثابت، ومفيش طلب بيطلع",
      "ms": 27.4806,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-mailbox-copy.integration.cjs",
      "name": "MB-03: «افتح بريدك» على السلك — المقفول 428، والغلط مرفوض ومعدود (خمسة = قفل ربع ساعة)، والصح بيفتح والمفتاح في cookie بس",
      "ms": 881.3428,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-mailbox-copy.integration.cjs",
      "name": "MB-04: المخزن عبر HTTP — مفتاح حساب أو جلسة تانية مايفتحش؛ والقفل والخروج وتغيير إصدار التوكن ونهاية التوكن ورفض خادم البريد بيمسحوه",
      "ms": 2636.2692,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-mailbox-copy.integration.cjs",
      "name": "MB-05: العزل — كل نداء بهوية صاحب الجلسة؛ ومعرّف رسالة أو مرفق حد تاني = غير موجود؛ وصندوق حد تاني بـmbx مرفوض قبل أي نداء",
      "ms": 259.7458,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-mailbox-copy.integration.cjs",
      "name": "MB-06: الصناديق المشتركة — الإدارة بالصلاحية، والفتح للمضاف عليه بس، وخادم البريد له الكلمة الأخيرة؛ وقبل الترحيل 192 وبعده",
      "ms": 4614.6534,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-mailbox-copy.integration.cjs",
      "name": "MB-07: الإرسال — نموذج متعدد الأجزاء بمرفق باسم عربي، والهوية من الجلسة، والقيم الغلط مرفوضة قبل خادم البريد",
      "ms": 87.5544,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-mailbox-copy.integration.cjs",
      "name": "MB-08: «الدخول بحساب الشركة» بيمسك كلمة السر للجلسة لما الموديول مفعّل للحساب — البريد بيفتح من غير نموذج؛ والخروج بيمسح",
      "ms": 497.3855,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-mailbox-copy.integration.cjs",
      "name": "MB-09: ولا كلمة سر في أي رد ولا سطر سجل ولا طلب على السلك ولا عمود في القاعدة",
      "ms": 419.264,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-01: a saved report is named filters judged by the report's own rules, and it belongs to its owner only",
      "ms": 11195.9862,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
      "ms": 2445.7673,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:188:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
      "ms": 1004.9666,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:283:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-04 (CRP3D): the owner is judged again after the file is built — a file built with a withdrawn scope or right does not go out",
      "ms": 551.0873,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:322:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
      "ms": 15141.9405,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
      "ms": 3480.4294,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
      "ms": 689.5324,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
      "ms": 1018.8303,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
      "ms": 1113.3421,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
      "ms": 1617.6807,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token",
      "ms": 11871.5756,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session's CSRF token",
      "ms": 514.6247,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-03: logout clears the cookie only for a request that carries it",
      "ms": 108.0949,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie",
      "ms": 1045.8149,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one",
      "ms": 534.888,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
      "ms": 399.0683,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token",
      "ms": 218.4985,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only",
      "ms": 12340.13,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-02: ending one session kills its token only; another account's session answers like a missing one",
      "ms": 790.537,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
      "ms": 242.5366,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule",
      "ms": 829.8807,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-01: الموديول مقفول افتراضيًا — مساراته مقفولة والتعيين زي ما هو؛ وبعد التفعيل الصلاحيات والنطاق",
      "ms": 12222.0613,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-02: إنشاء وظيفة وتعديلها — المدخلات والروابط، وفرع برّه النطاق زي اللي مش موجود، والوحدة مابتتغيّرش، وسجل التدقيق",
      "ms": 476.2529,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-03: «المشغول» محسوب — المربوط، وخدمته ماانتهتش، ولسه في وحدتها؛ وأرقام المجمّدة والملغية",
      "ms": 631.1822,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-04: تقرير «معتمد / مشغول / شاغر / زيادة» لكل قسم صحيح، وموظفين من غير وظيفة، وفي نطاق القارئ بس",
      "ms": 88.4703,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-05: ربط موظف قايم وفكّه — النطاق، والوحدة، والحالة، والنقل من وظيفة لتانية، والرابط القديم",
      "ms": 391.9183,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-06: التعيين والإنفاذ مقفول — الخانة اختيارية والمليانة «زيادة»؛ ووظيفة فرع تاني أو قسم تاني أو مش نشطة مرفوضة والموظف مابيتعملش",
      "ms": 864.4032,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-07: التعيين والإنفاذ مفعّل — من غير وظيفة مرفوض، وعلى مليانة مرفوض، وعلى اللي فيها شاغر مقبول؛ وتعيينين على آخر مقعد واحد بس",
      "ms": 1159.3931,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-08: قايمة الاختيار في نموذج التعيين — النشطة في الفرع بأرقامها، لصاحب «تعيين موظف جديد»، وفرع برّه النطاق فاضي",
      "ms": 111.747,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-09: التوليد من الموجود — المعاينة والتطبيق، وآمن للتكرار، وفي النطاق بس",
      "ms": 164.1943,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-10: حالة الموديول والإنفاذ بتتقري قبل معاملة التعيين ومعاملة الربط مش جواها (درس Codex CRP2Y-B02)",
      "ms": 239.0767,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-01: نوع الطلب — مقفول مع موديوله، وحقوله من الخادم (المسمى من الكتالوج، والعدد، والسبب)",
      "ms": 208.1083,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-02: التقديم — المسمى لازم من الكتالوج (النشط)، والعدد من 1 لـ1000، ومفتاح زيادة مرفوض",
      "ms": 263.7507,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-03: «الاعتماد بيعمل الوظيفة» — وظيفة نشطة جديدة على قسم مقدّم الطلب في فرع الطلب، والطلب مكتمل بمرجعها",
      "ms": 221.518,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-04: زيادة العدد — وظيفة قايمة بنفس المسمى على نفس القسم عددها بيزيد (حتى المجمّدة)، والملغية بتتساب ووظيفة جديدة بتتعمل",
      "ms": 745.2618,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-05: القسم متثبّت وقت التقديم — نقل مقدّم الطلب بعدها مابيغيّرش الوحدة؛ وقسم مابقاش في فرع الطلب = الاعتماد مرفوض؛ ومسودة مقدّمها اتنقل من فرعها ماتتقدّمش؛ ومن غير قسم = مستوى الفرع؛ وإعادة التقديم بتثبّت من جديد؛ وبالنيابة على قسم صاحب الطلب",
      "ms": 830.8221,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-06: بانِي الطلبات — الوجهة في قايمته باسمها، ونوع جديد بيها بيشتغل زي المزروع وحقول الباني بتتزوّد على حقول الوجهة، وبيتقفل مع الموديول",
      "ms": 401.2796,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-07: اعتمادين في نفس اللحظة لنفس المسمى على نفس الوحدة — وظيفة واحدة بمجموع العددين؛ وطلب مفتوح والموديول اتقفل بيكمّل سلسلته",
      "ms": 1159.8417,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-08: قبل الترحيل — التقديم مرفوض برسالة الترحيل، واعتماد طلب مفتوح مرفوض بيها والطلب زي ما هو؛ وبعد الترحيل بيكمّل",
      "ms": 334.0084,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-11: قسم اتنقل لفرع تاني وموظفيه ووظائفه فضلوا — رقمه واسمه (وفريقه) محجوبين في القايمة والتقرير والتفاصيل ومعاينة التوليد، ووظائفه برّه قايمة التعيين، والتوليد مابيعملش وظيفة عليه",
      "ms": 515.9012,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-12: فريق اتنقل لوحده لقسم في فرع تاني واتغيّر اسمه — رقمه واسمه الجديد محجوبين عن فرع الوظيفة وقسمها لسه ظاهر؛ ونقله جوه نفس الفرع مابيحجبوش",
      "ms": 283.3803,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-13: التوليد واقف بعد ما قرا خطته — المربوط من الشاشة بيفضل، والقسم اللي اتنقل والوظيفة المطابقة اللي اتعملت والمسمى اللي اتقفل مابتتعملش عليهم وظيفة، وإنشاء على مستوى الفرع بيستنى",
      "ms": 1860.7535,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-14: إنشاء وظيفة ونقل قسمها لفرع تاني في نفس اللحظة — النقل بيستنى لحد ما الوظيفة تتحفظ",
      "ms": 1599.504,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-09: الاعتماد مستني قفل الإنشاء والقسم المتثبّت اتنقل لفرع تاني — بيتحكم بعد القفل وبيترفض؛ ونقل بيبدأ بعد الفحص بيستنى الحفظ",
      "ms": 1762.6716,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-15: تعيين مستني صف الوظيفة والقسم اتنقل لفرع تاني — مرفوض ومفيش موظف اتعمل؛ وربط واقف قبل الحفظ: نقل القسم بيستنى",
      "ms": 1885.2159,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-01: النماذج والدورات — القيم، ونطاق الفروع، والإطلاق بتكليف لكل موظف شغال بمديره ونسخة نموذج متجمّدة",
      "ms": 12279.94,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-02: التقييم الذاتي وتقييم المدير — مرة واحدة، على النموذج المتجمّد وأهداف الفترة، والدرجة بالأوزان، والأدلة بتتجمّد مع الرد",
      "ms": 639.331,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-03: إدارة الأداء — تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات",
      "ms": 220.7359,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-04: الاعتماد والإعلان والإقرار — المدير سلّم ← معتمد ← معلن ← الموظف أقرّ، وتقييم المدير بيظهر للموظف بعد الإعلان بس",
      "ms": 306.268,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-05: المعايرة والاعتراض — تعديل بسبب قبل الاعتماد بيتسجّل (قبل/بعد/مين)، وتوزيع التقديرات لكل مدير، والاعتراض طلب مربوط بتقييم معلن في مهلته ومرة واحدة، والمعايرة بعد اعتراض اتقبل",
      "ms": 1457.4968,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-06: a cycle with a unified audience (a unit with what is under it, minus the excluded) launches for its people only, inside the manager's branches",
      "ms": 133.704,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-01: طلب «احتياج توظيف» — حقوله من الخادم، وفحوص التقديم، والقسم المتثبّت، والاعتماد بيعمل وظيفة مسودة بمرجعها",
      "ms": 12737.6442,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-02: شاشة الوظائف — بصلاحية إدارة التوظيف وبنطاق فروع الحساب؛ الإنشاء والتعديل بالخانات؛ والوحدة مابتتغيّرش؛ واسم القسم بفرعه الحالي",
      "ms": 400.8168,
      "pass": true,
      "skip": false
    },
    {
      "file": "recruitment-jobs.integration.cjs",
      "name": "RJ-03: الحالة — النشر محتاج وصف ومكان نشر، منشورة ↔ موقوفة، والقفل نهائي، وكل تغيير في سجل التدقيق، والموديول المقفول بيقفل المسارات",
      "ms": 398.3631,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
      "ms": 2445.7673,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:188:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
      "ms": 1004.9666,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:283:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-04 (CRP3D): the owner is judged again after the file is built — a file built with a withdrawn scope or right does not go out",
      "ms": 551.0873,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:322:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_5eff639cbdb4252e is absent from sys.databases.",
    "Cleanup verified: hr_hiring_suggest_test_12d9c311d58ae351 is absent from sys.databases.",
    "Cleanup verified: hr_review_evaluator_test_40e7d1ef999a8470 is absent from sys.databases.",
    "Cleanup verified: hr_meet_calls_test_8e3643d9123ad5d3 is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_saved_reports_test_869c6a09c5e0d656",
    "تحقق حذف قاعدة الاختبار: hr_session_cookie_test_81267a3712753548",
    "تحقق حذف قاعدة الاختبار: hr_user_sessions_test_8fdac447afff724e",
    "Cleanup verified: hr_positions_test_4131485394f0cd9f is absent from sys.databases.",
    "Cleanup verified: hr_perf_reviews_test_e0476d10ec16df9f is absent from sys.databases.",
    "Cleanup verified: hr_recruitment_jobs_test_12dbe841c60b7030 is absent from sys.databases.",
    "tests 87",
    "suites 0",
    "pass 84",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 146452.1038"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_5eff639cbdb4252e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_5eff639cbdb4252e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_hiring_suggest_test_12d9c311d58ae351\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_hiring_suggest_test_12d9c311d58ae351\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_40e7d1ef999a8470\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_40e7d1ef999a8470\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_meet_test_10c37d9b07be1e61\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_meet_test_10c37d9b07be1e61\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_meet_calls_test_8e3643d9123ad5d3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_meet_calls_test_8e3643d9123ad5d3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mailbox_test_75496444d16b7d37\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mailbox_test_75496444d16b7d37\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_saved_reports_test_869c6a09c5e0d656\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_saved_reports_test_869c6a09c5e0d656\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_exemptions_test_d65988df898ec4c7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_exemptions_test_d65988df898ec4c7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_session_cookie_test_81267a3712753548\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_session_cookie_test_81267a3712753548\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_sessions_test_8fdac447afff724e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_sessions_test_8fdac447afff724e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_positions_test_4131485394f0cd9f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_positions_test_4131485394f0cd9f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_reviews_test_e0476d10ec16df9f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_reviews_test_e0476d10ec16df9f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recruitment_jobs_test_12dbe841c60b7030\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recruitment_jobs_test_12dbe841c60b7030\"}\n"
  ]
}
