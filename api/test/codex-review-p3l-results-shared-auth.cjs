module.exports = {
  "selected": [
    "session-cookie",
    "user-sessions",
    "login-security",
    "two-factor-race",
    "tasks-assignment-rules",
    "modules-enforcement"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 48,
      "failed": 0,
      "passed": 48,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 48,
      "suites": 0
    },
    "duration_ms": 43520.3512
  },
  "results": [
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token",
      "ms": 7961.5942,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session's CSRF token",
      "ms": 407.6894,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-03: logout clears the cookie only for a request that carries it",
      "ms": 90.4396,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie",
      "ms": 892.8709,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one",
      "ms": 487.8061,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read",
      "ms": 352.2163,
      "pass": true,
      "skip": false
    },
    {
      "file": "session-cookie.integration.cjs",
      "name": "SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session's CSRF token",
      "ms": 209.0403,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only",
      "ms": 7737.078,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-02: ending one session kills its token only; another account's session answers like a missing one",
      "ms": 638.7171,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie",
      "ms": 195.7585,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-sessions.integration.cjs",
      "name": "US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule",
      "ms": 717.4951,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: 10 محاولات غلط بتقفل الحساب، وحتى الصح بيرجع «مقفول»، والمدير بيفكه، والتأخير بيزيد من المحاولة التالتة",
      "ms": 9973.1171,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: الدخول الصح بيصفّر العداد، والقفل بيخلص لوحده بعد المدة، والحساب المعطّل والبريد الغلط نفس الرد",
      "ms": 601.8438,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سجل الدخول بكل محاولة ونتيجتها والـIP والجهاز، وحساب الفرع بيشوف حسابات فرعه بس",
      "ms": 80.0006,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سياسة كلمة السر (NIST) في التغيير والإنشاء والتعديل والكلمة المؤقتة، والموجودة مابتتأثرش",
      "ms": 808.4679,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: التحقق بخطوتين إلزامي لدور بعينه والتحقق العام مقفول — صاحب الدور بس بياخد رمز البريد",
      "ms": 328.1168,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: رؤوس حماية المتصفح في ردود الـAPI، ومن غير X-Powered-By",
      "ms": 0.7338,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة",
      "ms": 7296.6286,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض",
      "ms": 817.3699,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد",
      "ms": 806.332,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل",
      "ms": 450.3994,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال",
      "ms": 331.6954,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401",
      "ms": 439.9203,
      "pass": true,
      "skip": false
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R7 — 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، وإجمالي الرسايل = الحد المعلن",
      "ms": 1415.8539,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-01: اختبارات المالك الخمسة — زميل مرفوض، وتحت المدير المرؤوس مقبول، وقسم تاني مرفوض برسالة الطلب، والمسؤول مايحوّلش، وHR برّه فروعه 404",
      "ms": 7801.1415,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-02: «تحته في الشجرة» — المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، ومش لفوق ولا للجنب؛ و«كل اللي تحته» بنفس حكم «تحته؟»",
      "ms": 2441.5883,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-03: المهمة الشخصية — لصاحبها ومديره المباشر بس، وبيديرها صاحبها، وبرّه قايمة «المهام» والتقرير، ومن غير إشعار تكليف ولا تبليغ تأخير",
      "ms": 1073.9162,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-04: «تكليف أي موظف» — أي موظف في نطاق الحساب، وبيدير اللي كلّف بيه هو بس وبحقه دلوقتي، والصلاحية مش في أي دور جاهز",
      "ms": 160.4625,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-05: اللي كلّف بيها بيديرها بحقه دلوقتي — مسؤولها خرج من تحته = لا يشوفها ولا يديرها، ورجع = رجعت؛ و«فريقي» فيه اللي كلّف بيه حد أبعد من مرؤوسيه",
      "ms": 177.7906,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-06: المسؤول مايرفضش ولا يحوّل ولا يلغي ولا يغيّر الموعد؛ و«مش بتاعتي» تعليق بعلامته بيتشاور فيه للي كلّف من الخادم",
      "ms": 278.5044,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-07: طلب تمديد الميعاد — للمسؤول بسبب، واحد معلّق، واللي بيدير المهمة يوافق أو يرفض، وبيتشال مع تغيير الموعد أو التحويل أو الإقفال",
      "ms": 638.1378,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-08: «خلص لما» والميزة مفتوحة — مهمة معلّمة، اتقفلت متأخر يومين بإثبات، اترجّعت مرة بسبب، واتقبلت واتقيّمت 4؛ وكله في السجل والتقرير",
      "ms": 526.8806,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-09: نفس السيناريو والميزة مقفولة — من غير علامة ولا تقييم ولا خاناتهم، والالتزام والرجوع شغالين",
      "ms": 519.0212,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-10: التقرير — صاحب «عرض كل المهام» في نطاقه، والمدير على اللي يشوفه، وغيرهم فاضي؛ ومهمة الدور والشخصية برّاه؛ وحدود الفترة",
      "ms": 232.5668,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-11: سجل المهمة — كل تغيير سطر في حوارها بعلامة نوعه وباسم اللي عمله، بيتقري بحكم المهمة",
      "ms": 406.8728,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-12: حالة ميزة التقييم بتتقري قبل معاملة المهمة مش جواها (CRP2Y-B02) — تعديل العلامة، والإقفال، والرجوع، والتقييم",
      "ms": 240.6423,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 7300.1277,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 104.7457,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 235.5732,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 347.1247,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 117.7163,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 268.155,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 225.1555,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 397.2649,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1275.8173,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 280.6791,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 522.1307,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 129.2811,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_session_cookie_test_4301846ced76f70e",
    "تحقق حذف قاعدة الاختبار: hr_user_sessions_test_9ea137f87b152378",
    "Cleanup verified: hr_login_security_test_5c53d104f7533bf3 is absent from sys.databases.",
    "{\"rejected\":12,\"attempts\":5,\"locked\":true,\"consumed\":false}",
    "{\"statuses\":[401,401,401,401,401,401,401,401,401,401,401,401],\"attempts\":5,\"locked\":true}",
    "{\"oldConsumeGuardMatches\":1,\"newConsumeGuardMatches\":0}",
    "{\"oldCodeStatus\":401}",
    "{\"statuses\":[401,401,401,401,200,401]}",
    "{\"statuses\":[429,429,200,429,429,429,429,429],\"mails\":1,\"resendCount\":1,\"waitedSeconds\":120,\"messages\":[\"استنى 60 ثانية قبل طلب رمز جديد\"]}",
    "{\"statuses\":[429,429,429,429,429,429,429,429],\"resendCount\":3,\"mails\":3}",
    "Cleanup verified: hr_2fa_race_test_9eef3dad5a86271e is absent from sys.databases.",
    "Cleanup verified: hr_task_rules_test_3c9f0112dcb96534 is absent from sys.databases.",
    "Cleanup verified: hr_modules_test_954c7a13512ee799 is absent from sys.databases.",
    "tests 48",
    "suites 0",
    "pass 48",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 43520.3512"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_session_cookie_test_4301846ced76f70e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_session_cookie_test_4301846ced76f70e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_sessions_test_9ea137f87b152378\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_sessions_test_9ea137f87b152378\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_login_security_test_5c53d104f7533bf3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_login_security_test_5c53d104f7533bf3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_2fa_race_test_9eef3dad5a86271e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_2fa_race_test_9eef3dad5a86271e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_task_rules_test_3c9f0112dcb96534\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_task_rules_test_3c9f0112dcb96534\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_954c7a13512ee799\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_954c7a13512ee799\"}\n"
  ]
}
