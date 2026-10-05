module.exports = {
  "selected": [
    "modules-enforcement",
    "modules-settings",
    "modules-migration",
    "login-security",
    "login-security-migration",
    "scheduled-jobs",
    "gosi-tracks",
    "statutory-migration",
    "one-person-controls",
    "payment-changes-migration",
    "payroll-period-guards",
    "loan-disbursement",
    "loan-disbursement-migration",
    "settlement-pending-obligations",
    "settlement-payment",
    "settlement-payment-migration",
    "currency-totals",
    "approval-chain-holders",
    "attendance-transfer-race",
    "attendance-holiday-reason",
    "payroll-policy-snapshot-engine",
    "ops-health"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 100,
      "failed": 1,
      "passed": 94,
      "cancelled": 0,
      "skipped": 5,
      "todo": 0,
      "topLevel": 100,
      "suites": 0
    },
    "duration_ms": 356386.8418
  },
  "results": [
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 6671.0819,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 101.8255,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 231.7471,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 351.5618,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 109.6019,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 270.5771,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 180.4347,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 518.6545,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1835.1083,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 382.2595,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 738.298,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 188.9686,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-01: الصلاحية — settings.modules بس، والكتابة لحساب على مستوى الشركة",
      "ms": 8978.5393,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-02: الكتالوج — الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات",
      "ms": 3.8287,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-03: التفعيل والقفل من الشاشة — الأثر فوري والتغيير متسجّل باسم اللي عمله",
      "ms": 100.72,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-04: الرفض — تبعيات وأساسي ومجهول وجسم غلط، ومفيش حاجة بتتكتب",
      "ms": 166.1253,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-05: أثر القفل قبل القفل — الطلبات المفتوحة والبيانات الشغالة",
      "ms": 208.9557,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-06: الباقات — معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات",
      "ms": 148.0879,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-07: المزايا الفرعية وجمهور التفعيل من الشاشة",
      "ms": 232.7066,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-08: شاشة الأدوار — صلاحيات الموديول المقفول متعلّمة، والممنوحة منها بتفضل على الدور",
      "ms": 286.562,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-1: الملفين LF من غير BOM، من غير عبارة ممنوعة، وأكوادهم فريدة، وأسماء المفاتيح والقيد والفهرس بتاعة الكيانات، وقاعدة synchronize بنفس الشكل",
      "ms": 7993.5601,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-2: المخطط القديم ببيانات قائمة — المُرحّل بيضيف الجداول ويزرع حالة الشركة من غير ما يغيّر صف قائم، والفرق صفر",
      "ms": 3870.1687,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-3: آمن للتكرار، وصف غيّره المالك من الشاشة مايرجعش لقيمة الترحيل",
      "ms": 921.0861,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-4: التوظيف — من غير مرشحين ولا حامل للصلاحية مقفول؛ ومرشح واحد أو منحة لمستخدم مفعّل",
      "ms": 209.9698,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-5: شكل غلط بيوقف التحقق بكوده ومايسيبش أثر، و077 قبل 076 بيرفض",
      "ms": 587.0943,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: 10 محاولات غلط بتقفل الحساب، وحتى الصح بيرجع «مقفول»، والمدير بيفكه، والتأخير بيزيد من المحاولة التالتة",
      "ms": 9266.7586,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: الدخول الصح بيصفّر العداد، والقفل بيخلص لوحده بعد المدة، والحساب المعطّل والبريد الغلط نفس الرد",
      "ms": 470.1963,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سجل الدخول بكل محاولة ونتيجتها والـIP والجهاز، وحساب الفرع بيشوف حسابات فرعه بس",
      "ms": 42.8232,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سياسة كلمة السر (NIST) في التغيير والإنشاء والتعديل والكلمة المؤقتة، والموجودة مابتتأثرش",
      "ms": 738.8917,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: التحقق بخطوتين إلزامي لدور بعينه والتحقق العام مقفول — صاحب الدور بس بياخد رمز البريد",
      "ms": 268.2081,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: رؤوس حماية المتصفح في ردود الـAPI، ومن غير X-Powered-By",
      "ms": 0.8172,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security-migration.integration.cjs",
      "name": "LSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 6216.9057,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security-migration.integration.cjs",
      "name": "LSM-2: المخطط القديم بحسابات قائمة — الكود شغال قبل الترحيل، والمُرحّل بيضيف العمودين والجدول من غير ما يغيّر صف، والفرق صفر",
      "ms": 3258.1246,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security-migration.integration.cjs",
      "name": "LSM-3: آمن للتكرار",
      "ms": 677.5938,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-1: نسختين من الـAPI — نفس المهمة في نفس اللحظة بتشتغل مرة واحدة، وتاني في نفس الدقيقة بيتعدّى، والدقيقة الجاية بتشتغل",
      "ms": 8443.7766,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-2: الفشل بيتسجل «فشلت» برسالته والجاية بتشتغل، والموديول المقفول مفيش تشغيل ولا صف، والأساسية بتشتغل دايمًا",
      "ms": 99.9919,
      "pass": true,
      "skip": false
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-3: شاشة المهام لحساب الشركة بإدارة الإعدادات (الفرع ومن غير الصلاحية 403)، ومسح الأقدم من 30 يوم",
      "ms": 150.2527,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(escalations.recent.length >= 2 && escalations.nextRunAt && escalations.last24h.runs >= 2)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(escalations.recent.length >= 2 && escalations.nextRunAt && escalations.last24h.runs >= 2)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(escalations.recent.length >= 2 && escalations.nextRunAt && escalations.last24h.runs >= 2)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\scheduled-jobs.integration.cjs:178:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-4: ترحيل 079 — الملف سليم والأسماء بتاعة الكيان، وقبله المهام شغالة بقفلها من غير سجل، والمُرحّل بيضيف الجدول من غير فرق، وآمن للتكرار",
      "ms": 5382.6988,
      "pass": true,
      "skip": false
    },
    {
      "file": "gosi-tracks.integration.cjs",
      "name": "GT-1: المسير بالمسارين وبالقيمة السارية في آخر يوم في الفترة، وحدود مصر المؤرخة، والمسير المعتمد مابيتغيرش لما يتفتح",
      "ms": 11308.279,
      "pass": true,
      "skip": false
    },
    {
      "file": "gosi-tracks.integration.cjs",
      "name": "GT-2: خانة «تاريخ أول تسجيل في التأمينات» — الحفظ والمسح والتحقق وسجل التغييرات، ومخفية عن غير المالية",
      "ms": 269.2946,
      "pass": true,
      "skip": false
    },
    {
      "file": "gosi-tracks.integration.cjs",
      "name": "GT-3: الإعدادات — «الأساسي + السكن»، والقيم المؤرخة في الشاشة، وتاريخ قرار حدود مصر",
      "ms": 312.5819,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-migration.integration.cjs",
      "name": "SM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7654.8933,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-migration.integration.cjs",
      "name": "SM-2: المخطط القديم بموظفين قائمين — الكود شغال قبل الترحيل، والمُرحّل بيضيف العمود والجدولين من غير ما يغيّر صف، والفرق صفر",
      "ms": 3499.2027,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-migration.integration.cjs",
      "name": "SM-3: آمن للتكرار",
      "ms": 802.415,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-0: الإعدادات الأربعة مبذورة مقفولة ومسموح بيها في الإعدادات (true/false بس)",
      "ms": 6889.9442,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-1: سجل تغييرات الصرف — الملف وExcel والطلب والإنشاء بصف لكل حقل اتغيّر بمصدره ومين، والآيبان متخفي، ومن غير صف لو ماتغيرش",
      "ms": 634.7891,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2: «اتغيّر إيه من آخر مسير» — الراتب قبل وبعد، وتغيير الراتب والآيبان بمين وإمتى، والجديد، والخارج، وبنطاق الفرع",
      "ms": 6290.1888,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-3: «اللي غيّر مايعتمدش لوحده» — مقفول زي النهارده؛ مفتوح رفض برسالة، وحد تاني بيعتمد، ومدير النظام بسبب بيعدّي ويتسجل",
      "ms": 10445.3431,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-4: نفس الضابط في سلسلة الاعتماد — معتمد تاني قبله بيعدّي ويتسجل؛ سلسلة بخطوة واحدة رفض، ومدير النظام بسبب بيعدّي",
      "ms": 4069.4232,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-5: المسار الأمني للحساب البنكي — مقفول زي النهارده؛ مفتوح التعديل وExcel مرفوضين للآيبان والبنك، والطلب نيابةً في سلسلته، ونفس الشخص مايعتمدش الخطوتين",
      "ms": 339.2159,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-6: فحوص النقل من التعديل وExcel — مقفول زي النهارده؛ مفتوح العهدة المفتوحة أو المدير في فرع تاني بيمنع النقل من غير أي تغيير",
      "ms": 398.6179,
      "pass": true,
      "skip": false
    },
    {
      "file": "payment-changes-migration.integration.cjs",
      "name": "PM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيان، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7174.2962,
      "pass": true,
      "skip": false
    },
    {
      "file": "payment-changes-migration.integration.cjs",
      "name": "PM-2: المخطط القديم بموظفين قائمين — التعديل شغال قبل الترحيل من غير السجل الجديد، والمُرحّل بيضيف الجدول فاضي من غير ما يغيّر صف، والفرق صفر",
      "ms": 3777.6905,
      "pass": true,
      "skip": false
    },
    {
      "file": "payment-changes-migration.integration.cjs",
      "name": "PM-3: آمن للتكرار",
      "ms": 729.8528,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-1: الحارس مقفول = أرقام النهارده بالحرف، وشهر 31 بدون راتب بيوقف الاعتماد بالاسم والسبب",
      "ms": 23002.9701,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-2: الحارس مفتوح — بدون راتب ماتعديش راتب الفترة، والغياب والجزاءات زي ما هم، والقسيمة بالمقصوص",
      "ms": 7554.7049,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-3: الحارس في لقطة السياسة — المقفول بنفس البصمة، والتفعيل فرق ظاهر، وإعادة الحساب من غير تحديث بنفس الأرقام",
      "ms": 795.9851,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-4: جزاءات 108% — المسير بيتعتمد ويتصرف، والباقي 720 قيد للشهر الجاي",
      "ms": 4527.0185,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-5: اعتماد شغال لنفس المسير — الطلب التاني بيترفض على طول، وبعده بيتعتمد عادي",
      "ms": 2006.3538,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-disbursement.integration.cjs",
      "name": "LD-1: الإعدادين مقفولين ومسموح بيهم (true/false بس)، وloans.disburse في الكتالوج وموديول السلف",
      "ms": 7331.6425,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-disbursement.integration.cjs",
      "name": "LD-2: أول قسط (D10) — المقفول زي النهارده، والمفتوح فترة المسير اللي بعد فترة التقديم وبيتزق لو الاعتماد اتأخر؛ واختيار الموارد البشرية والاستثنائية زي ما هم",
      "ms": 339.3788,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-disbursement.integration.cjs",
      "name": "LD-3: تسجيل صرف السلفة — الصلاحية والنطاق والمدخلات، مرة واحدة بس، ومين وإمتى والحالة",
      "ms": 203.6315,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-disbursement.integration.cjs",
      "name": "LD-4: «لازم تتصرف الأول» — مقفول زي النهارده؛ مفتوح السلفة الجديدة أقساطها بتفضل مستحقة لحد تسجيل الصرف وبعده بتنزل؛ والقديمة بتتخصم عادي",
      "ms": 1384.1959,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-disbursement-migration.integration.cjs",
      "name": "LM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، والأعمدة برّه الكيان، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 8268.6119,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-disbursement-migration.integration.cjs",
      "name": "LM-2: المخطط القديم بسلف قائمة — الدفتر شغال وتسجيل الصرف بيقول إن الترحيل مش متطبق من غير كتابة؛ والمُرحّل بيضيف الأعمدة فاضية من غير ما يغيّر صف",
      "ms": 3678.3383,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-disbursement-migration.integration.cjs",
      "name": "LM-3: آمن للتكرار",
      "ms": 642.0696,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-01: الإعداد مقفول افتراضيًا — التصفية زي ما كانت: مفيش بند قيود، واللقطة من غير مفاتيح القيود، والقيود زي ما هي",
      "ms": 7691.4468,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-02: مفتوح — القيود اللي شهرها بعد آخر شهر بتدخل بندين، واللي في شهر آخر يوم والمسير لسه مش معتمد والمحجوز والملغي والمعلّق لأ؛ والاعتماد بيعلّمها مستهلكة",
      "ms": 440.7322,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-03: مسير آخر شهر معتمد — قيد شهر آخر يوم والقيد الفوري اللي برّه المسير بيتلموا كمان (مفيش مسير هياخدهم)",
      "ms": 301.1075,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-04: قيد اتلغى بعد التوليد، أو الإعداد اتفتح بعد التوليد — الاعتماد 409 «أعد توليد البنود» من غير أي تغيير",
      "ms": 589.0038,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-05: بند القيود المعدّل يدويًا بيترفض عند الاعتماد، والتسوية اليدوية جنبه مسموحة",
      "ms": 421.3692,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-payment.integration.cjs",
      "name": "SP-01: قبل الاعتماد مرفوض، ومن غير «اعتماد التصفية» 403، وبرّه الفرع 404 — ومفيش أي كتابة",
      "ms": 7512.0134,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-payment.integration.cjs",
      "name": "SP-02: التاريخ (مش بكره ولا قبل الاعتماد) والطريقة والمرجع، والتسجيل مرة واحدة، والتفاصيل بتعرضه للي بيشوف المبالغ بس — والصافي والحالة زي ما هم",
      "ms": 309.6097,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-payment.integration.cjs",
      "name": "SP-03: الملف المقفول بعد الاعتماد (آخر يوم عمل عدّى) بيتسجل صرفه نقدي من غير مرجع",
      "ms": 219.9975,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-payment-migration.integration.cjs",
      "name": "SPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، والأعمدة برّه الكيان، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 9576.4393,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-payment-migration.integration.cjs",
      "name": "SPM-2: المخطط القديم بتصفية معتمدة — التفاصيل من غير بيانات صرف والتسجيل بيقول إن الترحيل مش متطبق من غير كتابة؛ والمُرحّل بيضيف الأعمدة فاضية من غير ما يغيّر صف",
      "ms": 3388.7811,
      "pass": true,
      "skip": false
    },
    {
      "file": "settlement-payment-migration.integration.cjs",
      "name": "SPM-3: آمن للتكرار",
      "ms": 827.674,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-totals.integration.cjs",
      "name": "B1.1: التقارير المالية — كل صف بعملة فرعه، والإجمالي لكل عملة لوحده ومجموعهم = الإجمالي العام",
      "ms": 7510.6529,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-totals.integration.cjs",
      "name": "B1.1: تقرير المسيرات والصرف وكشف البنوك والتأمينات — صافي المسير وكل إجمالي لكل عملة",
      "ms": 270.0797,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-totals.integration.cjs",
      "name": "B1.1: «مسيرات بانتظار اعتمادي» ومراجعة المعتمد — صافي المسير وإجمالياته لكل عملة",
      "ms": 171.4435,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-01: الثغرات بالصلاحيات النهائية — حزمة الدور والمنح والعمود القديم بيحملوا، والمسحوبة والحساب الموقوف ومدير النظام لأ، والفرع المقفول مالوش تحذير",
      "ms": 6750.8592,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-02: قارئ الرياض بيشوف فرعه بس — ولا اسم فرع جدة في الرد",
      "ms": 40.9027,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-03: حامل جديد بيقفل الثغرة فورًا، ونسخة فرع مفعّلة بتشيل فرعها من العامة وبتتفحص لوحدها، والتحذير مابيمنعش الحفظ",
      "ms": 173.253,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-04 (D12): كشف «المدير المسجل غير قائد الفريق» — بنطاق الحساب، والقائد نفسه والمدير الفاضي والموقوف مش في الكشف، ومفيش أي تعديل",
      "ms": 214.5324,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-transfer-race.integration.cjs",
      "name": "AT-1: وردية اليوم ومسح وردية الأسبوع وجدول الأسبوع وإسناد المدة بتقرا فرع الموظف تحت قفله — نقل اتحفظ قبله بيرفضها من غير كتابة",
      "ms": 10166.9985,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-transfer-race.integration.cjs",
      "name": "AT-2: البصمة اليدوية وحذفها بيقروا فرع الموظف تحت قفله — نقل اتحفظ قبله بيرفضهم من غير كتابة",
      "ms": 272.3177,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-holiday-reason.integration.cjs",
      "name": "B1.2: السجل اليومي بيقول سبب «عطلة» — اسم العطلة الرسمية أو راحة أسبوعية، وباقي الصفوف زي ما هي",
      "ms": 7395.5033,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "step 21: overlapping tiers are refused on save (nothing written), the legacy table is read-only, and a dated set is validated and hashed",
      "ms": 6976.2427,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "step 21 (أ1): saving one set never deactivates another set, an identical active set is reused, and a new policy inherits the current set",
      "ms": 146.943,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "steps 19–21 on a real run: 61 minutes × 1.5 on the payslip, SHADOW parity per employee, snapshot keeps absence_penalty_days until an explicit refresh with the shown fingerprint",
      "ms": 3502.0894,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 (D03): فروق فحص التكافؤ (SHADOW) للعرض بس — التحويل لـPOLICY مرفوض (متركن)، والأسباب المكتوبة بتتسجل للعرض، والمصروف والاعتماد بالحساب الحالي",
      "ms": 1555.4278,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "steps 19–20 at approval (payroll simplification): a tampered or missing snapshot is still refused before any write; for SHADOW and LEGACY runs the parity report and its written reasons are information only (POLICY is parked, B1.10), so approval attaches null parity fields",
      "ms": 3005.4174,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "work-pressure allowance (owner decision 26 Sep) stays outside the policy engine: SHADOW parity is MATCHED on the six, POLICY is parked (B1.10) and approval passes with the allowance in the current calculation",
      "ms": 1817.5542,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: الحالات المدعومة (حضور كامل وبدلات، غياب، إضافة وخصم من الدفتر، قسط سلفة) فرقها صفر",
      "ms": 4469.0871,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: الإذونات",
      "ms": 0.1782,
      "pass": true,
      "skip": "حالات إثبات الإذن (بخصم ومن غير خصم) في محرك المعادلات ناقصة — ملاحظة Codex؛ بتتكمل مع B4.3"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: تصحيحات البصمة",
      "ms": 0.1058,
      "pass": true,
      "skip": "محرك المعادلات مابيقراش تصحيح البصمة المعتمد كدليل حضور لسه — بيتكمل مع B4.3"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: استثناءات الحضور",
      "ms": 0.0791,
      "pass": true,
      "skip": "استثناء الحضور (مستثنى من البصمة) مالوش حالات إثبات في المحرك — بيتكمل مع B4.3"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: الإجازة المرضية بشرائح",
      "ms": 0.0404,
      "pass": true,
      "skip": "شرائح المرضية (75% و0%) بتظهر في الظل بس حالات إثباتها ناقصة — بيتكمل مع B4.3"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: الإجازة بدون راتب",
      "ms": 0.0378,
      "pass": true,
      "skip": "ظل الحضور مابيقدرش يثبت يوم الإجازة بدون راتب (ATTENDANCE_SHADOW_PARTIAL) فقيم المحرك بتغيب — بيتكمل مع B4.3"
    },
    {
      "file": "ops-health.integration.cjs",
      "name": "OH-01: من غير دخول — القاعدة شغالة، والمهام سليمة، وبعد فشل آخر تشغيل لمهمة مفعّلة «failing» بالعدد من غير اسم المهمة ولا الخطأ",
      "ms": 8270.5441,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-3: شاشة المهام لحساب الشركة بإدارة الإعدادات (الفرع ومن غير الصلاحية 403)، ومسح الأقدم من 30 يوم",
      "ms": 150.2527,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(escalations.recent.length >= 2 && escalations.nextRunAt && escalations.last24h.runs >= 2)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(escalations.recent.length >= 2 && escalations.nextRunAt && escalations.last24h.runs >= 2)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(escalations.recent.length >= 2 && escalations.nextRunAt && escalations.last24h.runs >= 2)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\scheduled-jobs.integration.cjs:178:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_modules_test_e284fade0a6ffbaf is absent from sys.databases.",
    "Cleanup verified: hr_modules_settings_test_f60176586f37c37e is absent from sys.databases.",
    "Cleanup verified: hr_modules_migration_test_47c71d56f4253241 is absent from sys.databases.",
    "Cleanup verified: hr_login_security_test_42d8a1054598bd44 is absent from sys.databases.",
    "Cleanup verified: hr_login_security_migration_test_8dfc52a1bf3809fa is absent from sys.databases.",
    "Cleanup verified: hr_scheduled_jobs_test_81b32c6e58f01974 is absent from sys.databases.",
    "Cleanup verified: hr_gosi_tracks_test_39bd39114fc44256 is absent from sys.databases.",
    "Cleanup verified: hr_statutory_migration_test_bdb965a9c8d31bc8 is absent from sys.databases.",
    "Cleanup verified: hr_one_person_test_1b79ee6400592e95 is absent from sys.databases.",
    "Cleanup verified: hr_payment_changes_migration_test_b0c679370731dba3 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_guards_test_adb71dde7f08a384 is absent from sys.databases.",
    "Cleanup verified: hr_loan_disbursement_test_24162d84ac91ab61 is absent from sys.databases.",
    "Cleanup verified: hr_loan_disbursement_migration_test_3d0700eeb4c8ad1e is absent from sys.databases.",
    "Cleanup verified: hr_settlement_obligations_test_5a1f9c8675e666fb is absent from sys.databases.",
    "Cleanup verified: hr_settlement_payment_test_22958fe72c23b5d5 is absent from sys.databases.",
    "Cleanup verified: hr_settlement_payment_migration_test_e55fe403fbc0e1c6 is absent from sys.databases.",
    "Cleanup verified: hr_currency_totals_test_5c8b5d2d4e08f2d9 is absent from sys.databases.",
    "Cleanup verified: hr_chain_holders_test_df09928b65dd29c3 is absent from sys.databases.",
    "Cleanup verified: hr_attendance_transfer_race_test_16fa752251daa5c5 is absent from sys.databases.",
    "Cleanup verified: hr_holiday_reason_test_65006ca8d192a002 is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_policy_engine_test_2924789bda196cdb",
    "Cleanup verified: hr_ops_health_test_95acb639a70429fa is absent from sys.databases.",
    "tests 100",
    "suites 0",
    "pass 94",
    "fail 1",
    "cancelled 0",
    "skipped 5",
    "todo 0",
    "duration_ms 356386.8418"
  ],
  "stdout": [
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_e284fade0a6ffbaf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_e284fade0a6ffbaf\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_settings_test_f60176586f37c37e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_settings_test_f60176586f37c37e\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_migration_test_47c71d56f4253241\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_migration_test_47c71d56f4253241\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_login_security_test_42d8a1054598bd44\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_login_security_test_42d8a1054598bd44\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_login_security_migration_test_8dfc52a1bf3809fa\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_login_security_migration_test_8dfc52a1bf3809fa\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_scheduled_jobs_test_81b32c6e58f01974\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_scheduled_jobs_test_81b32c6e58f01974\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_gosi_tracks_test_39bd39114fc44256\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_gosi_tracks_test_39bd39114fc44256\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_statutory_migration_test_bdb965a9c8d31bc8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_statutory_migration_test_bdb965a9c8d31bc8\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_one_person_test_1b79ee6400592e95\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_one_person_test_1b79ee6400592e95\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payment_changes_migration_test_b0c679370731dba3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payment_changes_migration_test_b0c679370731dba3\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_guards_test_adb71dde7f08a384\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_guards_test_adb71dde7f08a384\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_disbursement_test_24162d84ac91ab61\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_disbursement_test_24162d84ac91ab61\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_disbursement_migration_test_3d0700eeb4c8ad1e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_disbursement_migration_test_3d0700eeb4c8ad1e\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_settlement_obligations_test_5a1f9c8675e666fb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_settlement_obligations_test_5a1f9c8675e666fb\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_settlement_payment_test_22958fe72c23b5d5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_settlement_payment_test_22958fe72c23b5d5\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_settlement_payment_migration_test_e55fe403fbc0e1c6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_settlement_payment_migration_test_e55fe403fbc0e1c6\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_currency_totals_test_5c8b5d2d4e08f2d9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_currency_totals_test_5c8b5d2d4e08f2d9\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_holders_test_df09928b65dd29c3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_holders_test_df09928b65dd29c3\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_attendance_transfer_race_test_16fa752251daa5c5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_attendance_transfer_race_test_16fa752251daa5c5\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_reason_test_65006ca8d192a002\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_reason_test_65006ca8d192a002\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policy_engine_test_2924789bda196cdb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policy_engine_test_2924789bda196cdb\"}\n",
    "CRP1_TRANSPORT private PDF/photo fixtures permit dot directory segments; authorization and storage checks unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ops_health_test_95acb639a70429fa\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ops_health_test_95acb639a70429fa\"}\n"
  ]
}
