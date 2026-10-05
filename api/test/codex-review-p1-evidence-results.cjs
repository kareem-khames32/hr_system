module.exports = {
  "target": "622ed57b19c82ec6e9e87d9546aef3dc260c4e7b",
  "finalRuns": [
    "batches",
    "scheduler-confirmed",
    "regression",
    "regression-download-confirmed",
    "independent-finance-confirmed",
    "migrations-combined-confirmed",
    "boundaries",
    "money-current-final"
  ],
  "counts": {
    "tests": 239,
    "passed": 232,
    "failed": 2,
    "skipped": 5
  },
  "results": [
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 6671.0819,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 101.8255,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 231.7471,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 351.5618,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 109.6019,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 270.5771,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 180.4347,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 518.6545,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1835.1083,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 382.2595,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 738.298,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 188.9686,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-01: الصلاحية — settings.modules بس، والكتابة لحساب على مستوى الشركة",
      "ms": 8978.5393,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-02: الكتالوج — الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات",
      "ms": 3.8287,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-03: التفعيل والقفل من الشاشة — الأثر فوري والتغيير متسجّل باسم اللي عمله",
      "ms": 100.72,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-04: الرفض — تبعيات وأساسي ومجهول وجسم غلط، ومفيش حاجة بتتكتب",
      "ms": 166.1253,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-05: أثر القفل قبل القفل — الطلبات المفتوحة والبيانات الشغالة",
      "ms": 208.9557,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-06: الباقات — معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات",
      "ms": 148.0879,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-07: المزايا الفرعية وجمهور التفعيل من الشاشة",
      "ms": 232.7066,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-08: شاشة الأدوار — صلاحيات الموديول المقفول متعلّمة، والممنوحة منها بتفضل على الدور",
      "ms": 286.562,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-1: الملفين LF من غير BOM، من غير عبارة ممنوعة، وأكوادهم فريدة، وأسماء المفاتيح والقيد والفهرس بتاعة الكيانات، وقاعدة synchronize بنفس الشكل",
      "ms": 7993.5601,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-2: المخطط القديم ببيانات قائمة — المُرحّل بيضيف الجداول ويزرع حالة الشركة من غير ما يغيّر صف قائم، والفرق صفر",
      "ms": 3870.1687,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-3: آمن للتكرار، وصف غيّره المالك من الشاشة مايرجعش لقيمة الترحيل",
      "ms": 921.0861,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-4: التوظيف — من غير مرشحين ولا حامل للصلاحية مقفول؛ ومرشح واحد أو منحة لمستخدم مفعّل",
      "ms": 209.9698,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-5: شكل غلط بيوقف التحقق بكوده ومايسيبش أثر، و077 قبل 076 بيرفض",
      "ms": 587.0943,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: 10 محاولات غلط بتقفل الحساب، وحتى الصح بيرجع «مقفول»، والمدير بيفكه، والتأخير بيزيد من المحاولة التالتة",
      "ms": 9266.7586,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: الدخول الصح بيصفّر العداد، والقفل بيخلص لوحده بعد المدة، والحساب المعطّل والبريد الغلط نفس الرد",
      "ms": 470.1963,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سجل الدخول بكل محاولة ونتيجتها والـIP والجهاز، وحساب الفرع بيشوف حسابات فرعه بس",
      "ms": 42.8232,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سياسة كلمة السر (NIST) في التغيير والإنشاء والتعديل والكلمة المؤقتة، والموجودة مابتتأثرش",
      "ms": 738.8917,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: التحقق بخطوتين إلزامي لدور بعينه والتحقق العام مقفول — صاحب الدور بس بياخد رمز البريد",
      "ms": 268.2081,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: رؤوس حماية المتصفح في ردود الـAPI، ومن غير X-Powered-By",
      "ms": 0.8172,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "login-security-migration.integration.cjs",
      "name": "LSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 6216.9057,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "login-security-migration.integration.cjs",
      "name": "LSM-2: المخطط القديم بحسابات قائمة — الكود شغال قبل الترحيل، والمُرحّل بيضيف العمودين والجدول من غير ما يغيّر صف، والفرق صفر",
      "ms": 3258.1246,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "login-security-migration.integration.cjs",
      "name": "LSM-3: آمن للتكرار",
      "ms": 677.5938,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-1: نسختين من الـAPI — نفس المهمة في نفس اللحظة بتشتغل مرة واحدة، وتاني في نفس الدقيقة بيتعدّى، والدقيقة الجاية بتشتغل",
      "ms": 9486.6087,
      "pass": true,
      "skip": false,
      "evidence": "scheduler-confirmed"
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-2: الفشل بيتسجل «فشلت» برسالته والجاية بتشتغل، والموديول المقفول مفيش تشغيل ولا صف، والأساسية بتشتغل دايمًا",
      "ms": 48.7321,
      "pass": true,
      "skip": false,
      "evidence": "scheduler-confirmed"
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-3: شاشة المهام لحساب الشركة بإدارة الإعدادات (الفرع ومن غير الصلاحية 403)، ومسح الأقدم من 30 يوم",
      "ms": 157.1629,
      "pass": true,
      "skip": false,
      "evidence": "scheduler-confirmed"
    },
    {
      "file": "scheduled-jobs.integration.cjs",
      "name": "SJ-4: ترحيل 079 — الملف سليم والأسماء بتاعة الكيان، وقبله المهام شغالة بقفلها من غير سجل، والمُرحّل بيضيف الجدول من غير فرق، وآمن للتكرار",
      "ms": 5333.7007,
      "pass": true,
      "skip": false,
      "evidence": "scheduler-confirmed"
    },
    {
      "file": "gosi-tracks.integration.cjs",
      "name": "GT-1: المسير بالمسارين وبالقيمة السارية في آخر يوم في الفترة، وحدود مصر المؤرخة، والمسير المعتمد مابيتغيرش لما يتفتح",
      "ms": 11308.279,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "gosi-tracks.integration.cjs",
      "name": "GT-2: خانة «تاريخ أول تسجيل في التأمينات» — الحفظ والمسح والتحقق وسجل التغييرات، ومخفية عن غير المالية",
      "ms": 269.2946,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "gosi-tracks.integration.cjs",
      "name": "GT-3: الإعدادات — «الأساسي + السكن»، والقيم المؤرخة في الشاشة، وتاريخ قرار حدود مصر",
      "ms": 312.5819,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "statutory-migration.integration.cjs",
      "name": "SM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7654.8933,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "statutory-migration.integration.cjs",
      "name": "SM-2: المخطط القديم بموظفين قائمين — الكود شغال قبل الترحيل، والمُرحّل بيضيف العمود والجدولين من غير ما يغيّر صف، والفرق صفر",
      "ms": 3499.2027,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "statutory-migration.integration.cjs",
      "name": "SM-3: آمن للتكرار",
      "ms": 802.415,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-0: الإعدادات الأربعة مبذورة مقفولة ومسموح بيها في الإعدادات (true/false بس)",
      "ms": 6889.9442,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-1: سجل تغييرات الصرف — الملف وExcel والطلب والإنشاء بصف لكل حقل اتغيّر بمصدره ومين، والآيبان متخفي، ومن غير صف لو ماتغيرش",
      "ms": 634.7891,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2: «اتغيّر إيه من آخر مسير» — الراتب قبل وبعد، وتغيير الراتب والآيبان بمين وإمتى، والجديد، والخارج، وبنطاق الفرع",
      "ms": 6290.1888,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-3: «اللي غيّر مايعتمدش لوحده» — مقفول زي النهارده؛ مفتوح رفض برسالة، وحد تاني بيعتمد، ومدير النظام بسبب بيعدّي ويتسجل",
      "ms": 10445.3431,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-4: نفس الضابط في سلسلة الاعتماد — معتمد تاني قبله بيعدّي ويتسجل؛ سلسلة بخطوة واحدة رفض، ومدير النظام بسبب بيعدّي",
      "ms": 4069.4232,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-5: المسار الأمني للحساب البنكي — مقفول زي النهارده؛ مفتوح التعديل وExcel مرفوضين للآيبان والبنك، والطلب نيابةً في سلسلته، ونفس الشخص مايعتمدش الخطوتين",
      "ms": 339.2159,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-6: فحوص النقل من التعديل وExcel — مقفول زي النهارده؛ مفتوح العهدة المفتوحة أو المدير في فرع تاني بيمنع النقل من غير أي تغيير",
      "ms": 398.6179,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payment-changes-migration.integration.cjs",
      "name": "PM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيان، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 7174.2962,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payment-changes-migration.integration.cjs",
      "name": "PM-2: المخطط القديم بموظفين قائمين — التعديل شغال قبل الترحيل من غير السجل الجديد، والمُرحّل بيضيف الجدول فاضي من غير ما يغيّر صف، والفرق صفر",
      "ms": 3777.6905,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payment-changes-migration.integration.cjs",
      "name": "PM-3: آمن للتكرار",
      "ms": 729.8528,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-1: الحارس مقفول = أرقام النهارده بالحرف، وشهر 31 بدون راتب بيوقف الاعتماد بالاسم والسبب",
      "ms": 23002.9701,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-2: الحارس مفتوح — بدون راتب ماتعديش راتب الفترة، والغياب والجزاءات زي ما هم، والقسيمة بالمقصوص",
      "ms": 7554.7049,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-3: الحارس في لقطة السياسة — المقفول بنفس البصمة، والتفعيل فرق ظاهر، وإعادة الحساب من غير تحديث بنفس الأرقام",
      "ms": 795.9851,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-4: جزاءات 108% — المسير بيتعتمد ويتصرف، والباقي 720 قيد للشهر الجاي",
      "ms": 4527.0185,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-period-guards.integration.cjs",
      "name": "PG-5: اعتماد شغال لنفس المسير — الطلب التاني بيترفض على طول، وبعده بيتعتمد عادي",
      "ms": 2006.3538,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "loan-disbursement.integration.cjs",
      "name": "LD-1: الإعدادين مقفولين ومسموح بيهم (true/false بس)، وloans.disburse في الكتالوج وموديول السلف",
      "ms": 7331.6425,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "loan-disbursement.integration.cjs",
      "name": "LD-2: أول قسط (D10) — المقفول زي النهارده، والمفتوح فترة المسير اللي بعد فترة التقديم وبيتزق لو الاعتماد اتأخر؛ واختيار الموارد البشرية والاستثنائية زي ما هم",
      "ms": 339.3788,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "loan-disbursement.integration.cjs",
      "name": "LD-3: تسجيل صرف السلفة — الصلاحية والنطاق والمدخلات، مرة واحدة بس، ومين وإمتى والحالة",
      "ms": 203.6315,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "loan-disbursement.integration.cjs",
      "name": "LD-4: «لازم تتصرف الأول» — مقفول زي النهارده؛ مفتوح السلفة الجديدة أقساطها بتفضل مستحقة لحد تسجيل الصرف وبعده بتنزل؛ والقديمة بتتخصم عادي",
      "ms": 1384.1959,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "loan-disbursement-migration.integration.cjs",
      "name": "LM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، والأعمدة برّه الكيان، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 8268.6119,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "loan-disbursement-migration.integration.cjs",
      "name": "LM-2: المخطط القديم بسلف قائمة — الدفتر شغال وتسجيل الصرف بيقول إن الترحيل مش متطبق من غير كتابة؛ والمُرحّل بيضيف الأعمدة فاضية من غير ما يغيّر صف",
      "ms": 3678.3383,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "loan-disbursement-migration.integration.cjs",
      "name": "LM-3: آمن للتكرار",
      "ms": 642.0696,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-01: الإعداد مقفول افتراضيًا — التصفية زي ما كانت: مفيش بند قيود، واللقطة من غير مفاتيح القيود، والقيود زي ما هي",
      "ms": 7691.4468,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-02: مفتوح — القيود اللي شهرها بعد آخر شهر بتدخل بندين، واللي في شهر آخر يوم والمسير لسه مش معتمد والمحجوز والملغي والمعلّق لأ؛ والاعتماد بيعلّمها مستهلكة",
      "ms": 440.7322,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-03: مسير آخر شهر معتمد — قيد شهر آخر يوم والقيد الفوري اللي برّه المسير بيتلموا كمان (مفيش مسير هياخدهم)",
      "ms": 301.1075,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-04: قيد اتلغى بعد التوليد، أو الإعداد اتفتح بعد التوليد — الاعتماد 409 «أعد توليد البنود» من غير أي تغيير",
      "ms": 589.0038,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-pending-obligations.integration.cjs",
      "name": "SPO-05: بند القيود المعدّل يدويًا بيترفض عند الاعتماد، والتسوية اليدوية جنبه مسموحة",
      "ms": 421.3692,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-payment.integration.cjs",
      "name": "SP-01: قبل الاعتماد مرفوض، ومن غير «اعتماد التصفية» 403، وبرّه الفرع 404 — ومفيش أي كتابة",
      "ms": 7512.0134,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-payment.integration.cjs",
      "name": "SP-02: التاريخ (مش بكره ولا قبل الاعتماد) والطريقة والمرجع، والتسجيل مرة واحدة، والتفاصيل بتعرضه للي بيشوف المبالغ بس — والصافي والحالة زي ما هم",
      "ms": 309.6097,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-payment.integration.cjs",
      "name": "SP-03: الملف المقفول بعد الاعتماد (آخر يوم عمل عدّى) بيتسجل صرفه نقدي من غير مرجع",
      "ms": 219.9975,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-payment-migration.integration.cjs",
      "name": "SPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، والأعمدة برّه الكيان، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 9576.4393,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-payment-migration.integration.cjs",
      "name": "SPM-2: المخطط القديم بتصفية معتمدة — التفاصيل من غير بيانات صرف والتسجيل بيقول إن الترحيل مش متطبق من غير كتابة؛ والمُرحّل بيضيف الأعمدة فاضية من غير ما يغيّر صف",
      "ms": 3388.7811,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "settlement-payment-migration.integration.cjs",
      "name": "SPM-3: آمن للتكرار",
      "ms": 827.674,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "currency-totals.integration.cjs",
      "name": "B1.1: التقارير المالية — كل صف بعملة فرعه، والإجمالي لكل عملة لوحده ومجموعهم = الإجمالي العام",
      "ms": 7510.6529,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "currency-totals.integration.cjs",
      "name": "B1.1: تقرير المسيرات والصرف وكشف البنوك والتأمينات — صافي المسير وكل إجمالي لكل عملة",
      "ms": 270.0797,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "currency-totals.integration.cjs",
      "name": "B1.1: «مسيرات بانتظار اعتمادي» ومراجعة المعتمد — صافي المسير وإجمالياته لكل عملة",
      "ms": 171.4435,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-01: الثغرات بالصلاحيات النهائية — حزمة الدور والمنح والعمود القديم بيحملوا، والمسحوبة والحساب الموقوف ومدير النظام لأ، والفرع المقفول مالوش تحذير",
      "ms": 6750.8592,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-02: قارئ الرياض بيشوف فرعه بس — ولا اسم فرع جدة في الرد",
      "ms": 40.9027,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-03: حامل جديد بيقفل الثغرة فورًا، ونسخة فرع مفعّلة بتشيل فرعها من العامة وبتتفحص لوحدها، والتحذير مابيمنعش الحفظ",
      "ms": 173.253,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-04 (D12): كشف «المدير المسجل غير قائد الفريق» — بنطاق الحساب، والقائد نفسه والمدير الفاضي والموقوف مش في الكشف، ومفيش أي تعديل",
      "ms": 214.5324,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "attendance-transfer-race.integration.cjs",
      "name": "AT-1: وردية اليوم ومسح وردية الأسبوع وجدول الأسبوع وإسناد المدة بتقرا فرع الموظف تحت قفله — نقل اتحفظ قبله بيرفضها من غير كتابة",
      "ms": 10166.9985,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "attendance-transfer-race.integration.cjs",
      "name": "AT-2: البصمة اليدوية وحذفها بيقروا فرع الموظف تحت قفله — نقل اتحفظ قبله بيرفضهم من غير كتابة",
      "ms": 272.3177,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "attendance-holiday-reason.integration.cjs",
      "name": "B1.2: السجل اليومي بيقول سبب «عطلة» — اسم العطلة الرسمية أو راحة أسبوعية، وباقي الصفوف زي ما هي",
      "ms": 7395.5033,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "step 21: overlapping tiers are refused on save (nothing written), the legacy table is read-only, and a dated set is validated and hashed",
      "ms": 6976.2427,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "step 21 (أ1): saving one set never deactivates another set, an identical active set is reused, and a new policy inherits the current set",
      "ms": 146.943,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "steps 19–21 on a real run: 61 minutes × 1.5 on the payslip, SHADOW parity per employee, snapshot keeps absence_penalty_days until an explicit refresh with the shown fingerprint",
      "ms": 3502.0894,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 (D03): فروق فحص التكافؤ (SHADOW) للعرض بس — التحويل لـPOLICY مرفوض (متركن)، والأسباب المكتوبة بتتسجل للعرض، والمصروف والاعتماد بالحساب الحالي",
      "ms": 1555.4278,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "steps 19–20 at approval (payroll simplification): a tampered or missing snapshot is still refused before any write; for SHADOW and LEGACY runs the parity report and its written reasons are information only (POLICY is parked, B1.10), so approval attaches null parity fields",
      "ms": 3005.4174,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "work-pressure allowance (owner decision 26 Sep) stays outside the policy engine: SHADOW parity is MATCHED on the six, POLICY is parked (B1.10) and approval passes with the allowance in the current calculation",
      "ms": 1817.5542,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: الحالات المدعومة (حضور كامل وبدلات، غياب، إضافة وخصم من الدفتر، قسط سلفة) فرقها صفر",
      "ms": 4469.0871,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: الإذونات",
      "ms": 0.1782,
      "pass": true,
      "skip": "حالات إثبات الإذن (بخصم ومن غير خصم) في محرك المعادلات ناقصة — ملاحظة Codex؛ بتتكمل مع B4.3",
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: تصحيحات البصمة",
      "ms": 0.1058,
      "pass": true,
      "skip": "محرك المعادلات مابيقراش تصحيح البصمة المعتمد كدليل حضور لسه — بيتكمل مع B4.3",
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: استثناءات الحضور",
      "ms": 0.0791,
      "pass": true,
      "skip": "استثناء الحضور (مستثنى من البصمة) مالوش حالات إثبات في المحرك — بيتكمل مع B4.3",
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: الإجازة المرضية بشرائح",
      "ms": 0.0404,
      "pass": true,
      "skip": "شرائح المرضية (75% و0%) بتظهر في الظل بس حالات إثباتها ناقصة — بيتكمل مع B4.3",
      "evidence": "batches"
    },
    {
      "file": "payroll-policy-snapshot-engine.integration.cjs",
      "name": "B1.10 اختبار المطابقة الآلي: الإجازة بدون راتب",
      "ms": 0.0378,
      "pass": true,
      "skip": "ظل الحضور مابيقدرش يثبت يوم الإجازة بدون راتب (ATTENDANCE_SHADOW_PARTIAL) فقيم المحرك بتغيب — بيتكمل مع B4.3",
      "evidence": "batches"
    },
    {
      "file": "ops-health.integration.cjs",
      "name": "OH-01: من غير دخول — القاعدة شغالة، والمهام سليمة، وبعد فشل آخر تشغيل لمهمة مفعّلة «failing» بالعدد من غير اسم المهمة ولا الخطأ",
      "ms": 8270.5441,
      "pass": true,
      "skip": false,
      "evidence": "batches"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ1 — مجموعة بيانات كاملة: كل قيمة أُرسلت ترجع كما هي عند القراءة",
      "ms": 8616.523,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ2 — مصفوفة التحقق عند الإضافة: كل مدخل غلط يُرفض برسالة، والكود المرسل يُتجاهل",
      "ms": 603.9863,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ3 — توليد الكود متسلسل بلا فجوات ولا تكرار تحت الإنشاء المتزامن",
      "ms": 529.534,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ4 — عزل الفروع: حساب فرع أ لا ينشئ ولا يقرأ ولا يعدّل موظف فرع ب",
      "ms": 339.4206,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "أ5 — حدود التعديل والتعيين المستقبلي: التكرار يُرفض، والكود لا يُعدَّل، ولا غياب قبل التعيين",
      "ms": 1700.0166,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب1 — يوم عادي، تأخير، انصراف مبكر، وتأخير مغطى بإذن معتمد (بلا خصم)",
      "ms": 1562.1254,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب2 — غياب بلا طلب، غياب مغطى بإجازة معتمدة، وبصمة ناقصة",
      "ms": 2580.5574,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب3 — الساعة المرنة: النافذة تعفي داخلها، وبعدها التأخير كامل بلا سماحية مُضافة مرتين",
      "ms": 474.6474,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب4 — دوام يوم عطلة: المكتشف من البصمة، وأمر HR يحوّله لبدل دوام العطلات بدل الإضافي ومرة واحدة",
      "ms": 2412.7038,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب5 — يوم داخل فترة إيقاف عن العمل: يُتخطى ولا يُحفظ غيابًا (فلا يُخصم مرتين)",
      "ms": 6501.4648,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب6 — إضافي بطلب معتمد: يُحتسب مرة واحدة، والمعتمد بعد قفل فترته يدخل أول مسير مفتوح بعده بلا تكرار",
      "ms": 8219.2542,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب7 — التقارير والملخص متسقة مع صفوف الأيام، وفلاتر «من/إلى» باليوم تختلف عن فلتر الشهر",
      "ms": 2995.2757,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب8 — فلاتر المدى على سجل الإضافي والكشف، وعزل الفرع في قراءة الحضور",
      "ms": 123.7258,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ب9 — حواف: غياب مُجسَّد ثم إجازة معتمدة، حد السماحية بالضبط، وبصمة مستقبلية أو خارج الفرع",
      "ms": 5761.553,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-employees-attendance.integration.cjs",
      "name": "ج1 — موظف عادي (خدمة ذاتية): يشوف حضوره هو بس، ولا يقرأ غيره ولا التقارير",
      "ms": 548.8046,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 11467.6387,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 768.3129,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 209.8328,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 645.2409,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 387.2953,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 410.9027,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 862.6039,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 396.6883,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 158.9208,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 37.9164,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 588.1627,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 232.6126,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 207.7082,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 110.0447,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 305.3682,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 108.5266,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 16.071,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 225.003,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 219.8613,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 1482.2894,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 1914.7408,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 2982.3391,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 663.2965,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 2350.5421,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 1600.5399,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 1783.8877,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 1271.8065,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 1085.4445,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 331.7215,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 1022.8551,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 126.1338,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.214,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: each of the four active payroll states excludes exact overtime/installment claims",
      "ms": 10594.9461,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: DRAFT/CANCELLED payroll items do not reserve financial entries",
      "ms": 297.1209,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: malformed historical payroll references reject regeneration and preserve every reviewed line",
      "ms": 270.2118,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a payroll claim created after generation blocks approval without changing reviewed money",
      "ms": 354.6157,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: concurrent approvals settle once, preserve exact references and do not invent payment state",
      "ms": 244.8986,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: changed or deleted linked financial lines require regeneration; manual adjustments remain independent",
      "ms": 434.2396,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: legacy financial settlement without snapshot requires explicit regeneration and keeps permissions",
      "ms": 493.7621,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: payroll after settlement excludes frozen claims and legacy ambiguity is refused",
      "ms": 1745.7449,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: renaming a historical automatic settlement line cannot hide pending financial sources",
      "ms": 92.1494,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: cancelling SETTLED legacy with a renamed automatic line cannot release untracked sources",
      "ms": 102.3666,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: all sources claimed by payroll cannot hide ambiguous automatic money behind an empty settlement snapshot",
      "ms": 263.8478,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: historical automatic EOS with no pending financial sources still permits settlement approval",
      "ms": 189.4285,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: simultaneous payroll calculation and settlement approval cannot claim the same sources",
      "ms": 988.8027,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-settlement-boundary.integration.cjs",
      "name": "SPEC①/ح٢-ب: a later offboarding case cannot reclaim sources in an earlier settled snapshot",
      "ms": 251.6624,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
      "ms": 6648.3505,
      "pass": true,
      "skip": false,
      "evidence": "regression-download-confirmed"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
      "ms": 158.2118,
      "pass": true,
      "skip": false,
      "evidence": "regression-download-confirmed"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 380.5441,
      "pass": true,
      "skip": false,
      "evidence": "regression-download-confirmed"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
      "ms": 104.6868,
      "pass": true,
      "skip": false,
      "evidence": "regression-download-confirmed"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة",
      "ms": 7397.1573,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض",
      "ms": 882.5298,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد",
      "ms": 839.6132,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل",
      "ms": 423.7046,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال",
      "ms": 317.416,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401",
      "ms": 446.0669,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R7 — 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، وإجمالي الرسايل = الحد المعلن",
      "ms": 1537.2841,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 7680.4927,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 466.496,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 129.266,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 235.3586,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 70.5714,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 54.8641,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 348.7441,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
      "ms": 470.2323,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR34-B01: دفتر السلفة لقارئ رواتب الفرع — رقم مسير اتعمل للموظف في فرع تاني (قبل نقله) مابيظهرش ولا «#رقمه» في نص الحدث؛ مسير فرعه وحساب الشركة والموظف نفسه بيشوفوه",
      "ms": 149.5908,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 9346.8858,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 234.1829,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 4933.9177,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 5194.7857,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 815.5583,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 1071.9738,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 682.889,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 629.7699,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 473.9636,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 122.862,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 7241.3768,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 162.8023,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 207.6142,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 121.4609,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 1259.3708,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 240.5966,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 90.3437,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 315.5603,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 222.8447,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 211.5499,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.5315,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 172.9892,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 58.2652,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 154.3908,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 112.5544,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 53.3031,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 186.7562,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 50.2175,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 211.9534,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 95.0749,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 120.2357,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1477.2376,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 234.2773,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 267.5059,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 661.6902,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 72.3066,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 141.1719,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 104.832,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 209.8254,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 339.6261,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 307.8925,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 67.1174,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 73.4262,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 213.374,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 85.4834,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 188.7519,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 98.2922,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 198.9707,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 116.1952,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 226.8507,
      "pass": true,
      "skip": false,
      "evidence": "regression"
    },
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 simultaneous loan disbursements persist exactly one reference without changing balance",
      "ms": 5791.6622,
      "pass": true,
      "skip": false,
      "evidence": "independent-finance-confirmed"
    },
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 loan disbursement rechecks branch after waiting for the finance lock",
      "ms": 109.2757,
      "pass": true,
      "skip": false,
      "evidence": "independent-finance-confirmed"
    },
    {
      "file": "codex-review-p1-finance-concurrency.integration.cjs",
      "name": "P1 simultaneous settlement payment recordings preserve exactly one reference and the approved net",
      "ms": 414.6976,
      "pass": true,
      "skip": false,
      "evidence": "independent-finance-confirmed"
    },
    {
      "file": "codex-review-p1-restore.integration.cjs",
      "name": "P1 restore and CHECKDB recover a full synthetic schema and exact employee data",
      "ms": 6403.3958,
      "pass": true,
      "skip": false,
      "evidence": "independent-finance-confirmed"
    },
    {
      "file": "codex-review-p1-migrations.integration.cjs",
      "name": "P1 all eight migrations together preserve old rows, permit old-schema boot and replay with zero schema difference",
      "ms": 6772.3602,
      "pass": true,
      "skip": false,
      "evidence": "migrations-combined-confirmed"
    },
    {
      "file": "codex-review-p1-boundaries.integration.cjs",
      "name": "P1 branch reader changes tab must not disclose a foreign prior payroll period or amount",
      "ms": 8674.782,
      "pass": false,
      "error": "Foreign previous period and financial amount must be concealed",
      "cause": "Foreign previous period and financial amount must be concealed",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign previous period and financial amount must be concealed\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-boundaries.integration.cjs:30:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "evidence": "boundaries"
    },
    {
      "file": "codex-review-p1-boundaries.integration.cjs",
      "name": "P1 login log accepts ISO from/to date filters and retains branch isolation",
      "ms": 45.7439,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-boundaries.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "evidence": "boundaries"
    },
    {
      "file": "codex-review-p1-default-money.integration.cjs",
      "name": "P1 default-off money is identical to ce15142 for Egyptian Saudi and uninsured actual payrolls",
      "ms": 7019.0841,
      "pass": true,
      "skip": false,
      "evidence": "money-current-final"
    }
  ],
  "baselineComparison": {
    "base": "ce15142",
    "baselineProductTreeUnmodified": true,
    "exactEquality": true,
    "decimalFieldsCompared": true,
    "totalNet": 34236.56,
    "rows": [
      {
        "scenario": "none",
        "amounts": {
          "absenceDays": 0,
          "absenceDeduction": 0,
          "allowances": 1400,
          "basicSalary": 6000,
          "latenessDeduction": 0,
          "loanInstallments": 0,
          "netPay": 7455.56,
          "otherAdditions": 123.45,
          "otherDeductions": 67.89,
          "overtimeAmount": 0,
          "overtimeHours": 0,
          "paidBankAmount": 7455.56,
          "paidCashAmount": 0,
          "shortfallDeduction": 0,
          "socialInsuranceDeduction": 0,
          "unpaidLeaveDays": 0,
          "unpaidLeaveDeduction": 0
        },
        "socialInsurance": {
          "insuredSalary": 0,
          "employeePct": 0,
          "employerPct": 0,
          "employeeShare": 0,
          "employerShare": 0
        }
      },
      {
        "scenario": "egypt-high",
        "amounts": {
          "absenceDays": 0,
          "absenceDeduction": 0,
          "allowances": 0,
          "basicSalary": 20000,
          "latenessDeduction": 0,
          "loanInstallments": 0,
          "netPay": 18163,
          "otherAdditions": 0,
          "otherDeductions": 0,
          "overtimeAmount": 0,
          "overtimeHours": 0,
          "paidBankAmount": 18163,
          "paidCashAmount": 0,
          "shortfallDeduction": 0,
          "socialInsuranceDeduction": 1837,
          "unpaidLeaveDays": 0,
          "unpaidLeaveDeduction": 0
        },
        "socialInsurance": {
          "insuredSalary": 16700,
          "employeePct": 11,
          "employerPct": 18.75,
          "employeeShare": 1837,
          "employerShare": 3131.25
        }
      },
      {
        "scenario": "egypt-low",
        "amounts": {
          "absenceDays": 0,
          "absenceDeduction": 0,
          "allowances": 0,
          "basicSalary": 2000,
          "latenessDeduction": 0,
          "loanInstallments": 0,
          "netPay": 1703,
          "otherAdditions": 0,
          "otherDeductions": 0,
          "overtimeAmount": 0,
          "overtimeHours": 0,
          "paidBankAmount": 1703,
          "paidCashAmount": 0,
          "shortfallDeduction": 0,
          "socialInsuranceDeduction": 297,
          "unpaidLeaveDays": 0,
          "unpaidLeaveDeduction": 0
        },
        "socialInsurance": {
          "insuredSalary": 2700,
          "employeePct": 11,
          "employerPct": 18.75,
          "employeeShare": 297,
          "employerShare": 506.25
        }
      },
      {
        "scenario": "saudi-old",
        "amounts": {
          "absenceDays": 0,
          "absenceDeduction": 0,
          "allowances": 1500,
          "basicSalary": 6000,
          "latenessDeduction": 0,
          "loanInstallments": 0,
          "netPay": 6915,
          "otherAdditions": 0,
          "otherDeductions": 0,
          "overtimeAmount": 0,
          "overtimeHours": 0,
          "paidBankAmount": 6915,
          "paidCashAmount": 0,
          "shortfallDeduction": 0,
          "socialInsuranceDeduction": 585,
          "unpaidLeaveDays": 0,
          "unpaidLeaveDeduction": 0
        },
        "socialInsurance": {
          "insuredSalary": 6000,
          "employeePct": 9.75,
          "employerPct": 11.75,
          "employeeShare": 585,
          "employerShare": 705
        }
      }
    ],
    "status": "PAID",
    "baselineResult": "codex-review-p1-results-money-baseline-confirmed.cjs"
  },
  "unitResults": {
    "selected": [
      "approval-chain-holders.test.cjs",
      "branch-company-definitions.test.cjs",
      "currency-totals.test.cjs",
      "disbursed-recorded-split.test.cjs",
      "employee-salary-change-ui.test.cjs",
      "financial-report-ui.test.cjs",
      "gosi-tracks.test.cjs",
      "loan-caps.test.cjs",
      "login-security.test.cjs",
      "modules-registry.test.cjs",
      "modules-ui.test.cjs",
      "ops-logging-health.test.cjs",
      "org-filter-wiring-ui.test.cjs",
      "payroll-approval-chain-disbursement-ui.test.cjs",
      "payroll-approval-chain.test.cjs",
      "payroll-engine-ui.test.cjs",
      "payroll-lines-ui.test.cjs",
      "payroll-live-attendance-provider.test.cjs",
      "payroll-period-guards.test.cjs",
      "ready-batch-ui.test.cjs",
      "report-day-range-ui.test.cjs",
      "routes-guards.test.cjs",
      "scheduled-jobs.test.cjs",
      "settings-audit-fixes.test.cjs",
      "settlement-payment-ui.test.cjs",
      "two-factor-hardening.test.cjs"
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
      "duration_ms": 43868.0064
    },
    "results": [
      {
        "file": "approval-chain-holders.test.cjs",
        "name": "CH-01: حامل الخطوة الوظيفية = نفس حكم satisfies بالحرف لكل دور وصلاحية (من غير مدير النظام ولا مخرج الموارد البشرية)",
        "pass": true,
        "skip": false
      },
      {
        "file": "approval-chain-holders.test.cjs",
        "name": "CH-02: السلسلة العامة على الفروع الشغالة اللي مالهاش نسخة، ونسخة الفرع على فرعها، والمعطّلة والفرع المقفول مالهمش تحذير",
        "pass": true,
        "skip": false
      },
      {
        "file": "approval-chain-holders.test.cjs",
        "name": "CH-03: حساب على مستوى الشركة بيغطي كل الفروع، والنطاق الفاضي مابيغطيش حاجة، وتعطيل نسخة الفرع بيرجّع الفرع للعامة",
        "pass": true,
        "skip": false
      },
      {
        "file": "approval-chain-holders.test.cjs",
        "name": "CH-04: القارئ بيشوف فروع نطاقه بس — فرع برّه نطاقه مايتذكرش، والسلسلة اللي كل ثغراتها برّه نطاقه من غير تحذير",
        "pass": true,
        "skip": false
      },
      {
        "file": "approval-chain-holders.test.cjs",
        "name": "CH-05: الواجهة بتعرض التحذير في كارت السلسلة، والرد بيرجّع holderGaps، وصلاحيات الحسابات من نفس حساب التوكن",
        "pass": true,
        "skip": false
      },
      {
        "file": "approval-chain-holders.test.cjs",
        "name": "CH-06 (D12): كشف «المدير المسجل غير قائد الفريق» في شاشة الفرق — الاسم والمخفي والمحذوف، والعدّاد مابيعدّش القائد نفسه",
        "pass": true,
        "skip": false
      },
      {
        "file": "branch-company-definitions.test.cjs",
        "name": "deduction and bonus types: a branch account gets 403 on create/update before any DB access; super_admin passes the guard",
        "pass": true,
        "skip": false
      },
      {
        "file": "branch-company-definitions.test.cjs",
        "name": "shared catalogs: branch account is view-only (403) for every company-wide kind; devices keep their own branch check",
        "pass": true,
        "skip": false
      },
      {
        "file": "branch-company-definitions.test.cjs",
        "name": "auto chain for a branch-only request type is saved on the same branch, and the lookup never reuses another scope",
        "pass": true,
        "skip": false
      },
      {
        "file": "branch-company-definitions.test.cjs",
        "name": "linking an existing chain: a branch account cannot link another branch chain, and a type cannot use a chain from a different branch",
        "pass": true,
        "skip": false
      },
      {
        "file": "branch-company-definitions.test.cjs",
        "name": "chain list: another branch never sees a chain made for a branch-only type (even a legacy null-branch row) nor its type name",
        "pass": true,
        "skip": false
      },
      {
        "file": "currency-totals.test.cjs",
        "name": "التقسيم بالعملة: ترتيب ثابت ومن غير مجموعات فاضية، وإجمالي كل عملة بنفس دالة الإجمالي، ومجموعهم = الإجمالي العام",
        "pass": true,
        "skip": false
      },
      {
        "file": "currency-totals.test.cjs",
        "name": "عرض الإجمالي: عملة واحدة = المبلغ بعلامته، عملتين = لكل عملة سطرها؛ وسطور الإجمالي لكل عملة فاضية لعملة واحدة",
        "pass": true,
        "skip": false
      },
      {
        "file": "currency-totals.test.cjs",
        "name": "تقرير المسيرات: صافي المسيرات لكل عملة، والتصدير عمود عملة لعملة واحدة وعمود صافي لكل عملة لعملتين",
        "pass": true,
        "skip": false
      },
      {
        "file": "currency-totals.test.cjs",
        "name": "الصرف: كروت لكل عملة، وملخص الشهر سطر لكل مسير في كل عملة وإجمالي لكل عملة، والتصدير سطرين لكل عملة؛ عملة واحدة = نفس الشكل القديم بالحرف",
        "pass": true,
        "skip": false
      },
      {
        "file": "currency-totals.test.cjs",
        "name": "التأمينات: فلتر الفرع ← الإدارة بيعيد الإجمالي لكل عملة من نفس الصفوف المتفلترة",
        "pass": true,
        "skip": false
      },
      {
        "file": "currency-totals.test.cjs",
        "name": "الشاشات: كل تقرير بيجمع فروع بيعرض إجمالي لكل عملة، والمحررات بتقول إن الحد بيتقري بعملة فرع الموظف، وشاشات «ملفي» بعملة الحساب نفسه",
        "pass": true,
        "skip": false
      },
      {
        "file": "currency-totals.test.cjs",
        "name": "مراجعة المعتمد: إجماليات لكل عملة بعنوانها، وعملة واحدة = نفس الكروت القديمة، و«بانتظار اعتمادي» بصافي كل عملة",
        "pass": true,
        "skip": false
      },
      {
        "file": "disbursed-recorded-split.test.cjs",
        "name": "REC-01: قاعدة الصرف المسجل — علامة «تم الصرف» ثم «لم يتم» ثم مسير مصروف بلا علامات ثم مسير لسه ما اتصرفش",
        "pass": true,
        "skip": false
      },
      {
        "file": "disbursed-recorded-split.test.cjs",
        "name": "REC-02: كشف البنوك بعد تغيير طريقة الصرف — البند المصروف نقدي يفضل نقدي، واللي بلا علامة يتبع ملف الموظف",
        "pass": true,
        "skip": false
      },
      {
        "file": "disbursed-recorded-split.test.cjs",
        "name": "REC-03: التلات شاشات بنفس الرقم — شاشة الصرف وكشف البنوك والتقرير المالي، والتسوية بنك + نقدي + تصفية = الصافي",
        "pass": true,
        "skip": false
      },
      {
        "file": "disbursed-recorded-split.test.cjs",
        "name": "REC-04: استعلام التقرير المالي بيقرأ علامة الصرف نفسها (مصدر واحد للتلات شاشات)",
        "pass": true,
        "skip": false
      },
      {
        "file": "disbursed-recorded-split.test.cjs",
        "name": "REC-07: القسيمة على نفس القاعدة (قرار المالك 24 سبتمبر) — بلا لقطة هوية جديدة وبلا تقسيم تاني",
        "pass": true,
        "skip": false
      },
      {
        "file": "disbursed-recorded-split.test.cjs",
        "name": "REC-05: تقرير الحضور الشهري بلا كاشف وجود — الموظف الموجود خارج النطاق وغير الموجود نفس الرد",
        "pass": true,
        "skip": false
      },
      {
        "file": "disbursed-recorded-split.test.cjs",
        "name": "REC-06: أيام عمل الموظف ومعاينة الإضافي — نفس الرد للموظف خارج النطاق وغير الموجود",
        "pass": true,
        "skip": false
      },
      {
        "file": "disbursed-recorded-split.test.cjs",
        "name": "REC-08: المثبت وقت الصرف يغلب لقطة الحساب، والعلامة تغلبه، والبند القديم بلا تثبيت يفضل على سلوكه",
        "pass": true,
        "skip": false
      },
      {
        "file": "disbursed-recorded-split.test.cjs",
        "name": "REC-09: الصرف بيثبّت التقسيم على البند قبل ما المسير يبقى PAID، وإقفال موظف بموظف مايثبّتش اللي ما اتصرفلوش",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "context API binds employee and revision/hash while preserving all six exact strings and NULL currency",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "foreign employee, bad revision/hash, lossy money and missing current fields cannot initialize an editable salary",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "invalid employee ID fails before fetch and permission/conflict errors are not retried",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "formatting-only changes do not require payroll month/evidence or create a salary command",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "NULL is not zero and missing currency never becomes SAR on nonfinancial edit",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "a genuine amount change emits only an exact frozen command and preserves all other components",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "nonfinancial PATCH drops all monetary fields/currency including stale top-level null or number values",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "changed salary PATCH contains nested command only and preserves unrelated bank/contact fields",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "context failure permits a nonfinancial PATCH but cannot leak partial or rounded salary data",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "all six changed-salary values must be explicit nonnegative cents; no blank/null/fractional-cent defaults",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "payroll month/reason/reference are required only for real salary changes and later months route to requests",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "previous-month confirmation is optional and only legal for first history with a strictly earlier explicit month",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "display total sums exact cents beyond Number without treating absent components as zero",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "salary increase/resubmit body strips computed percentage, protected basis and daily date while allowing a future payroll month",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "custom salary workflows retain required attachment and customer fields while core money bypasses numeric conversion",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "real financial-step SSR keeps seven exact text fields (six + work pressure) and initially blank payroll months for genuine change only",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "previous salary confirmation displays exact old values and rejects incomplete/unsupported old evidence",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "context failure SSR locks seven salaries (six + work pressure) with the currency read-only by branch while preserving bank edits and explaining recovery",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "execution recovery sends only reason and request ID, permits scheduled reference, and accepts a server-confirmed rejection",
        "pass": true,
        "skip": false
      },
      {
        "file": "employee-salary-change-ui.test.cjs",
        "name": "execution recovery never sends for denied/completed/non-salary requests or empty reason; stale 409 is not retried",
        "pass": true,
        "skip": false
      },
      {
        "file": "financial-report-ui.test.cjs",
        "name": "every financial report has its own screen with the shared filters, Excel export and print, titled like its link",
        "pass": true,
        "skip": false
      },
      {
        "file": "financial-report-ui.test.cjs",
        "name": "the reports hub and the payroll reports page link all financial reports, and the cost-center report stays linked",
        "pass": true,
        "skip": false
      },
      {
        "file": "gosi-tracks.test.cjs",
        "name": "المسار: أول تسجيل من 3 يوليو 2024 = الجديد، وقبله أو فاضي = القديم",
        "pass": true,
        "skip": false
      },
      {
        "file": "gosi-tracks.test.cjs",
        "name": "الجدول المؤرخ: القيمة السارية في آخر يوم في الفترة، والبيانات الأولية 5 نسب للمسار الجديد وحدّين لمصر",
        "pass": true,
        "skip": false
      },
      {
        "file": "gosi-tracks.test.cjs",
        "name": "معيار الخطة: المسار الجديد على 10,000 في يوليو 2026 = 1,075.00 و1,275.00، والقديم 975.00 و1,175.00",
        "pass": true,
        "skip": false
      },
      {
        "file": "gosi-tracks.test.cjs",
        "name": "الخانة الفاضية والقيم الناقصة = نفس حساب النهارده بالحرف",
        "pass": true,
        "skip": false
      },
      {
        "file": "gosi-tracks.test.cjs",
        "name": "حدود الأجر المصري: القرار الأحدث الساري يوم آخر الفترة — الجدول، أو الشاشة لو اتغيرت قبله ومن بداية الصف",
        "pass": true,
        "skip": false
      },
      {
        "file": "gosi-tracks.test.cjs",
        "name": "الأساسي + السكن: ورا الإعداد، لفروع السعودية من غير أجر تأمين مسجل بس",
        "pass": true,
        "skip": false
      },
      {
        "file": "gosi-tracks.test.cjs",
        "name": "الشاشة بتعرض حدود مصر السارية النهارده",
        "pass": true,
        "skip": false
      },
      {
        "file": "gosi-tracks.test.cjs",
        "name": "خانة الملف: فاضي = مسح، والتاريخ صحيح ومش في المستقبل",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "B2: the loan request window closes with one switch whatever the days, and reopens at once",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "D: the first-installment month is stamped once at submission — no server-only flag, no re-stamp at each approval step",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-05 SRS example: MIN(800, 1500, 1000, 500) = 500 governed by the outstanding cap; 501 is rejected with the governing cap named, 500 passes",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-02 switching the percent base from BASIC to GROSS changes the cap immediately",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-04 monthly count and amount: pending requests consume the counter and the reset date is stated",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-04 month definition: calendar month versus payroll period (cycle 23), including the boundary day",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-06 outstanding equal to the cap blocks any new request; lower outstanding frees headroom",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-01 no policy means no caps; months above the policy maximum are refused",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-01/03 policy validation: at least one cap, positive flat cap, percent needs a base, scoped policies need ids",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-01 selection: the most specific scope wins, then priority; inactive and out-of-window versions never participate",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-14 SHORTEN_TERM pays from the last installment: 1668 closes one installment; 1334 leaves 334 on the tail",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-14 REDUCE_INSTALLMENT keeps the count and equalizes the rest (SRS: 1000 + 1000 after 1334)",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-14 full settlement, overpayment refusal with the exact closing amount, and FULL mode needs the closing amount",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-14 every partial plan preserves each installment and the paid total to the cent",
        "pass": true,
        "skip": false
      },
      {
        "file": "loan-caps.test.cjs",
        "name": "AD-13 SRS example: loan balance 3340 against dues 2100 leaves 1240 PENDING_RECOVERY; other debits consume dues first",
        "pass": true,
        "skip": false
      },
      {
        "file": "login-security.test.cjs",
        "name": "القفل والتأخير: أول محاولتين من غير تأخير، وبعدين ثانية ثم 2 ثم 4 كحد أقصى، والقفل عند الحد بالمدة",
        "pass": true,
        "skip": false
      },
      {
        "file": "login-security.test.cjs",
        "name": "سياسة كلمة السر (NIST): الطول، والشائعة، والحرف المتكرر، وجزء البريد واسم صاحب الحساب واسم النظام — من غير شرط رموز",
        "pass": true,
        "skip": false
      },
      {
        "file": "login-security.test.cjs",
        "name": "حراسة إعدادات أمان الدخول، وفرض التحقق على أدوار محتاج البريد مضبوط زي التحقق العام",
        "pass": true,
        "skip": false
      },
      {
        "file": "login-security.test.cjs",
        "name": "الشاشات: «فك القفل» في المستخدمين، و«سجل الدخول» بصلاحيته، وإعدادات الأمان، ورؤوس الحماية في الواجهة",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-registry.test.cjs",
        "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-ui.test.cjs",
        "name": "MU-01: كل شاشة لها صاحب (موديول أو ميزة شاشات العرض)، وكل مسار في السجل له صفحة",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-ui.test.cjs",
        "name": "MU-02: القايمة الجانبية من السجل — الوهمي ورا ميزته، وبنود الموديول المقفول مختفية",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-ui.test.cjs",
        "name": "MU-03: modules.ts — قراءة واحدة للجلسة بكاش مربوط بيها، وفشل الخادم افتراضي السجل، والمسح بيقرا من جديد",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-ui.test.cjs",
        "name": "MU-04: حارس المسارات — «الصفحة دي مش متاحة» قبل فحص الصلاحية، والإطار مابيتعرضش قبل ما الحالة تتقري",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-ui.test.cjs",
        "name": "MU-05: <ModuleGate> — الجزء بيختفي لو الموديول أو الميزة مقفولين",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-ui.test.cjs",
        "name": "MU-06: شاشة «الإعدادات ← الموديولات» — في القايمة بصلاحيتها، وبتأكد القفل بأثره، وبتعرض فرق الباقة",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-ui.test.cjs",
        "name": "MU-07: الحالة بتتجدد من غير دخول جديد — القديم بيتعرض والجديد في الخلفية، ومسار «مش موجود» بيجدّد",
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-ui.test.cjs",
        "name": "MU-08: شاشات الأساس مع موديول مقفول — اللينك مابيتعرضش، والجزء مابيتطلبش ولا بيوقّع الشاشة",
        "pass": true,
        "skip": false
      },
      {
        "file": "ops-logging-health.test.cjs",
        "name": "OL-01: الأخطاء والتحذيرات بتتكتب في ملف اليوم بالسياق والتتبع، والمعلومات لأ؛ واليوم الجديد ملف جديد",
        "pass": true,
        "skip": false
      },
      {
        "file": "ops-logging-health.test.cjs",
        "name": "OL-02: ملفات api-*.log الأقدم من مدة الاحتفاظ بتتمسح مع أول كتابة في اليوم، وأي ملف تاني في المجلد مابيتلمسش",
        "pass": true,
        "skip": false
      },
      {
        "file": "ops-logging-health.test.cjs",
        "name": "OL-03: الإعدادات — LOG_DIR=off بيقفل، والمسار النسبي من مجلد التشغيل، ومدة احتفاظ غلط = 30",
        "pass": true,
        "skip": false
      },
      {
        "file": "ops-logging-health.test.cjs",
        "name": "OL-04: /api/health — ملخص المهام بالعدد بس: المفعّلة اللي آخر تشغيل ليها فشل أو وقف في النص، والمقفولة مابتتحسبش، وسجل مش موجود = unknown",
        "pass": true,
        "skip": false
      },
      {
        "file": "org-filter-wiring-ui.test.cjs",
        "name": "OFW-01: كل شاشة فيها موظفين متوصل فيها الفلتر الموحد، والقوائم القديمة للفرع/القسم/الفريق اتشالت",
        "pass": true,
        "skip": false
      },
      {
        "file": "org-filter-wiring-ui.test.cjs",
        "name": "OFW-02: الشريط نفسه — أربع قوائم مترابطة بـ«الكل»، والفرع المقفول، و«مسح الفلتر»، وبيلف على الموبايل، والتحميل مرة للجلسة",
        "pass": true,
        "skip": false
      },
      {
        "file": "org-filter-wiring-ui.test.cjs",
        "name": "OFW-03: الخادم — النداء بصلاحيات الشاشات، والمعاملات في اللي بيترقّم أو بيتجمّع هناك، والنداءات الجديدة في ملفات مستقلة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain-disbursement-ui.test.cjs",
        "name": "CHAIN-UI-01: الشريط يقول مين اعتمد ومين عليه الدور، ومسير بلا سلسلة مايعرضش حاجة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain-disbursement-ui.test.cjs",
        "name": "CHAIN-UI-02: صاحب الخطوة يشوف «اعتمد خطوتي» و«ارفض بسبب»؛ الممنوع بفصل المهام يشوف السبب والأزرار مقفولة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain-disbursement-ui.test.cjs",
        "name": "CHAIN-UI-03: سبب الرفض ظاهر لمسؤول الرواتب، وبعد إعادة الحساب يفضل آخر رفض ظاهر كتاريخ",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain-disbursement-ui.test.cjs",
        "name": "CHAIN-UI-04: محرر السلسلة — الخطوات بالترتيب باسم الشخص، بحث بالاسم أو الكود، ودور كبديل؛ والحفظ بيبعت الشخص أو الدور فقط",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain-disbursement-ui.test.cjs",
        "name": "CHAIN-UI-05: شاشة المسير — الشريط محمّل مع المسير، وزرار الاعتماد بخطوة واحدة مابيظهرش لمسير تحكمه سلسلة، وباقي الشاشة كما هي",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain-disbursement-ui.test.cjs",
        "name": "DISB-UI-01: «صرف الرواتب» — الفلاتر والعلامة والتعليم الجماعي والإجماليات من الخادم، والتصدير بنفس الصفوف، وبلا حساب فلوس في المتصفح",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain-disbursement-ui.test.cjs",
        "name": "DISB-UI-02: جدول الصرف بالبيانات — خانة «تم الصرف» للصف القابل للتعليم لحامل payroll.disburse فقط، وصف التصفية والمقفول شارة بلا خانة، والإجماليات كما جت من الخادم",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain-disbursement-ui.test.cjs",
        "name": "CHAIN-UI-06: مراجعة المعتمد — إجماليات المسير وموظفوه ببنودهم، والصافي السالب ظاهر قبل الاعتماد النهائي",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain-disbursement-ui.test.cjs",
        "name": "NAV-01: الشاشات التلاتة ليها اسم واحد في القائمة والهيدر والجسم، ومفتوحة لأصحابها حتى بلا payroll.view",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain.test.cjs",
        "name": "CHAIN-01: خطوات السلسلة تتنضف وتترتب، وأسماء الخطوات الافتراضية «مراجعة N» والأخيرة «الاعتماد النهائي»",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain.test.cjs",
        "name": "CHAIN-02: بصمة السلسلة = هوية المعتمدين بترتيبهم؛ اسم الخطوة برّاها، وأي تغيير في شخص أو ترتيب يغيّرها",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain.test.cjs",
        "name": "CHAIN-03: التقدم — الخطوات بالترتيب، والمسير يفضل منتظر صاحب أول خطوة مش معتمدة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain.test.cjs",
        "name": "CHAIN-04: القرارات تخص نسخة حساب واحدة وبصمة سلسلة واحدة — نسخة أقدم أو قرار ملغى أو بصمة قديمة لا تُحتسب",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain.test.cjs",
        "name": "CHAIN-05: الرفض بسبب يرجّع نسخة الحساب لمسؤول الرواتب — مفيش خطوة حالية، وتغيير السلسلة مايمسحش الرفض",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain.test.cjs",
        "name": "CHAIN-06: مسير معتمد أو مصروف — الشريط من القرارات نفسها (تاريخ ثابت مهما اتغيرت السلسلة)، ومسير اتعتمد بخطوة واحدة بلا شريط",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain.test.cjs",
        "name": "CHAIN-07: صاحب الخطوة — الشخص المسمّى برقمه، والدور بكود دور التوكن",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain.test.cjs",
        "name": "CHAIN-07b: حل سلسلة المسير — الخاصة باسمه الدائم أولًا ثم سلسلة الشركة؛ سلسلة بلا خطوات = غير موجودة؛ بلا أي سلسلة = null (الاعتماد بخطوة واحدة)",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-approval-chain.test.cjs",
        "name": "CHAIN-08: خطافات المسير الكبير قليلة ومحددة — الاعتماد القديم يتحقق من السلسلة، وآخر خطوة تنادي approveLocked نفسها، والقسيمة على APPROVED/PAID كما هي",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-engine-ui.test.cjs",
        "name": "payslip: the lateness tier effect row shows minutes, range, multiplier and formula from the saved breakdown",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-engine-ui.test.cjs",
        "name": "أ1: اختيار الشرائح بالشهر أُلغي من الواجهة — لا دالة «المجموعة السارية لشهر»",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-engine-ui.test.cjs",
        "name": "engine panel: SHADOW badge, parity totals, each difference with legacy/policy/system reason and the written reason when present",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-engine-ui.test.cjs",
        "name": "engine panel: approval readiness from the server check, the source plan with a remedy per code, and unavailable values shown as needing a written reason (not \"cannot be explained\")",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-engine-ui.test.cjs",
        "name": "screens are wired (payroll simplification): the run page no longer shows the snapshot and engine panels, recalculation always refreshes to the current formula with the shown fingerprint, dated editor on formulas, tier effect on the payslip; legacy tier writes removed",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-lines-ui.test.cjs",
        "name": "جدول المسير: الأعمدة من بنود الخادم بمجموعتين، والصف والإجمالي من البند نفسه، والتصدير بنفس الأعمدة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-lines-ui.test.cjs",
        "name": "إنشاء مسيرات الشهر الجديد: معاينة من الخادم ثم إنشاء بنفس شهر المصدر، والنتيجة (اتعمل / اتخطى وسببه)",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-lines-ui.test.cjs",
        "name": "القسيمة وتابتا الشهر: بنود الخادم بأسمائها، والبدلات = كل الاستحقاقات والاستقطاعات = كل الخصومات لكل موظف",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-lines-ui.test.cjs",
        "name": "«إذن بخصم» في الواجهة: عموده ودقائقه في جدول المسير، وسطره في القسيمة تحت قرار إلغاء التأخير نفسه",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-lines-ui.test.cjs",
        "name": "إجماليات الأعمدة بالقرش، والاحتياطي من أعمدة البند بنفس المجاميع",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "ثواني التأخير من البصمة نفسها لا من الدقائق المقربة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "ثواني البصمة بعد نافذة المرونة تبدأ من بداية الدوام",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "النافذة المرنة المكتملة تعطي صفر تأخير حتى لو بدأ الدوام متأخرًا",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "تدقيق صف الحضور لا يغير المدخلات أو يعيد حفظها",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "الغياب المثبت يحتاج صفًا صريحًا محسوبًا بعد نهاية اليوم بلا بصمة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "اليوم المفقود لا ينشئ غيابًا افتراضيًا",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "حساب الدخول والانصراف في نفس يومهما يثبت بعد نهاية اليوم",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "تغير أي نتيجة محفوظة أو نسخة الدوام يمنع تفسيرها ماليًا",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "صف قديم بلا snapshot أو قواعد سماح مؤرخة لا يصبح موثقًا",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "تعدد البصمات أو وصول بصمة بعد الحساب لا يختار زوجًا تخمينيًا",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "بصمة بلا مصدر أو بصمة يدوية بلا مدخل مسؤول تبقى غير صالحة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "صفوف أو بصمات موظف آخر لا تظهر في الأدلة المعادة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "فرع اليوم يطابق الفرع المؤرخ لا الفرع الحالي",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "وجود إذن أو مأمورية معتمدة يبقى سببًا صريحًا دون قراءة كتالوج حي",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "تصحيح بلا طلب مكتمل لا يعد تصحيحًا معتمدًا",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "الإجازات الكاملة والجزئية لا تتحول إلى أيام مدفوعة مفترضة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "الاستثناء يحتفظ بقرار الإجازة غير المدفوعة منفصلًا عن البصمة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "تقويم ناقص أو فترة مقلوبة لا ينتجان مجموعة حضور فارغة متاحة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "تقويم مؤرخ غير عامل يثبت عدم طلب الحضور ولا يولد صف غياب",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "التغطية الجزئية لا تضيف أيام ما قبل التعيين إلى الغياب أو مدخلات الشرائح",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "لقطة التقويم الناقصة داخل الخدمة تمنع المصدر رغم تطابق البصمة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "بصمة في يوم غير عامل تحتاج تسوية مستقلة ولا تختفي من العدادات",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "حدود الصفوف وحجم JSON تمنع اعتبار القراءة المقطوعة مكتملة",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "القارئ لا يصدر أي كتابة ويلزم معاملة ويبلغ نقص المخطط فقط",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "S28: ليلة 12 تحمل التأخير والنقص من بصمة 00:50 صباح 13، ويوم 13 يأخذ ليلته فقط",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "S28: ليلة آخر يوم في الفترة تبقى فيها، وأول يوم في الفترة التالية يستبعد انصرافها بدليل جدول الجار",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "S28: وردية الغد الصباحية تقدم حد الليلة فتبقى بصمة 06:00 للغد لا لليلة الأمس",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "S28: الليلة لا تُقفل ولا يثبت غيابها عند منتصف الليل بل عند حد نافذتها صباح الغد",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "S28: توقيت مهمة الغياب الفعلية (01:00) لليلة 20:00 ← 01:00 يُثبت بعد إقفال النافذة دون انتظار لحاق الليلة التالية",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-live-attendance-provider.test.cjs",
        "name": "S28: توقيت يوم الجار غير المثبت لا يحرك حد النافذة ويُعامل «بلا وردية» مع توثيق ذلك في الإثبات",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-period-guards.test.cjs",
        "name": "الصافي السالب: السبب الأكبر وكل بند بمبلغه، ومجموع السطور = الصافي",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-period-guards.test.cjs",
        "name": "رسالة الرفض: أول 3 بالاسم والصافي، والعدد، والسبب",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-period-guards.test.cjs",
        "name": "سطور الإجازة لما الحارس يقص: النقص من سطور المرضية من الآخر ومفيش سطر سالب، والزيادة على آخر سطر زي ما كانت",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-period-guards.test.cjs",
        "name": "الحارس في لقطة السياسة: المقفول مالوش أثر في البصمة، والمفعّل فرق ظاهر بالاسم",
        "pass": true,
        "skip": false
      },
      {
        "file": "payroll-period-guards.test.cjs",
        "name": "اعتماد واحد شغال للمسير: القفل من غير انتظار في الاعتماد بخطوة واحدة وفي «اعتمد خطوتي» بس",
        "pass": true,
        "skip": false
      },
      {
        "file": "ready-batch-ui.test.cjs",
        "name": "B1.2: «تغيير كلمة المرور» في كارت المستخدم لكل حساب غير حساب المجال، والجلسة بتقول حساب المجال بس",
        "pass": true,
        "skip": false
      },
      {
        "file": "ready-batch-ui.test.cjs",
        "name": "B1.2: اللينك المكسور في صفحة الوظيفة بيودّي لصفحة المتقدمين، ومفيش أزرار من غير فعل",
        "pass": true,
        "skip": false
      },
      {
        "file": "ready-batch-ui.test.cjs",
        "name": "B1.2: مفيش «نظام الموارد البشرية» ولا «HR System» كاسم للمنتج، والأيقونة موجودة",
        "pass": true,
        "skip": false
      },
      {
        "file": "ready-batch-ui.test.cjs",
        "name": "B1.2: زرار الحفظ في «أيام العمل» شغّال وبيظهر لما فيه تعديل بس",
        "pass": true,
        "skip": false
      },
      {
        "file": "ready-batch-ui.test.cjs",
        "name": "B1.2: شاشة الحضور بتقول سبب «عطلة» واسم العطلة في اليوم الفاضي",
        "pass": true,
        "skip": false
      },
      {
        "file": "ready-batch-ui.test.cjs",
        "name": "B1.2: مفيش كلمة سر مكتوبة جنب حساب الدخول في الملفات",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "payroll month: cycle 23 → «راتب سبتمبر» = 23 أغسطس → 22 سبتمبر، ويوم 23 يبدأ شهر أكتوبر",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "the web payroll-month math matches the payroll engine for every cycle day and month (2024–2027)",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "day range editing, validation, overlap and labels",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "month quick-pick helpers: options around the current payroll month, labels, optional max length",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "DayRangeFilter renders the month quick-pick + «من تاريخ / إلى تاريخ» and the payroll-month navigation",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "DayRangeFilter keeps a partially typed date (year typed digit by digit) instead of resetting the input",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "PayrollPeriodSelect: a payroll run stays chosen by period but shows its exact days",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "API range helper: from/to wins, month stays backward compatible, bad ranges are 400",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "API «تاريخ الطلب» filter: local days → UTC bounds [start, end) for a SYSUTCDATETIME column, both-or-none",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "API: deductions and bonuses lists filter «من تاريخ / إلى تاريخ» on the server inside every page (before the 500 cap)",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "API: /attendance/payroll-month, and the attendance reports/sheet/overtime/punches accept from/to (parameterised, month still works)",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "attendance screens open on the payroll month with «من تاريخ / إلى تاريخ» (no month picker left)",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "payroll screens: day range on deductions/bonuses/runs report; run period stays a month but shows its exact dates",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "loans screen: filter by request date or by instalment month, with the month quick-pick and exact days",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "reports dashboard: attendance and overtime summaries follow the range filter, not the calendar month",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "attendance fixes: permissions has no unused Calendar import, exemption counters follow the chosen range",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "payroll-period pickers (GOSI, cost centers, financial reports, leave settlement) open on the payroll month and show its days",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "no month-only date filter is left in src/: every remaining month input is a form field or a payroll-run period that shows its days",
        "pass": true,
        "skip": false
      },
      {
        "file": "report-day-range-ui.test.cjs",
        "name": "employee-code search, a readable payroll-month placeholder, and every closable leave year",
        "pass": true,
        "skip": false
      },
      {
        "file": "routes-guards.test.cjs",
        "name": "RG-01: كل مسار تابع لموديول مسجّل",
        "pass": true,
        "skip": false
      },
      {
        "file": "routes-guards.test.cjs",
        "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق",
        "pass": true,
        "skip": false
      },
      {
        "file": "routes-guards.test.cjs",
        "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول",
        "pass": true,
        "skip": false
      },
      {
        "file": "routes-guards.test.cjs",
        "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler",
        "pass": true,
        "skip": false
      },
      {
        "file": "routes-guards.test.cjs",
        "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة",
        "pass": true,
        "skip": false
      },
      {
        "file": "scheduled-jobs.test.cjs",
        "name": "TZ: الفاضي = توقيت الجهاز، والاسم المعروف مقبول، والغلط بيوقف الإقلاع برسالة واضحة",
        "pass": true,
        "skip": false
      },
      {
        "file": "scheduled-jobs.test.cjs",
        "name": "قايمة المهام: كل مهمة بموعد صالح، وكل موعد في الكود من القايمة ومتسجل مرة واحدة، ومفيش @Cron خارجها",
        "pass": true,
        "skip": false
      },
      {
        "file": "scheduled-jobs.test.cjs",
        "name": "الشاشة: «المهام المجدولة» في الإعدادات بصلاحية إدارة الإعدادات، والخادم بيشترط حساب على كل الفروع",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 1: تغيير السماحية العامة يولّد نسخة مؤرخة لكل تعريف ساري، والقيمة القديمة تفضل في نسخها",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 1: يوم قبل تاريخ السريان يحتفظ بسماحيته القديمة، واليوم من تاريخ السريان ياخد الجديدة",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 1: سماحية الوردية تعلو العامة قبل التغيير وبعده",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 1: حفظ attendance.grace_minutes بيولّد النسخة المؤرخة داخل نفس معاملة الأقفال",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 1: للسماحية العامة مدخل في «سياسات النظام» بحدودها الرقمية داخل مجموعة الحضور",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 1: نصّ المدخل بيقول إنه من يوم التغيير وما بعده، وإن سماحية الوردية تعلو عليه",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 1: «أيام العمل والدوام» تفضل عرضاً للقراءة وتدلّ على المدخل الجديد",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 2: التراكم اليومي بيقرا payroll.shortfall_enabled (المفتاح المبذور اللي الشاشة بتضبطه)",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 2: مفيش قارئ تاني لإعداد نقص الساعات بمفتاح غير مبذور",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 3: معامل عقوبة الغياب وباقي المفاتيح الرقمية المبذورة ليها حد أدنى",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 3: الحد الأعلى ورسالة عربية لمعامل عقوبة الغياب ومضاعف العطلة",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 4: مفاتيح التراكم اليومي ودولة النظام مبذورة بقيمها الاحتياطية",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 4: كل مفتاح إعداد يقرأه الخادم بقيمة احتياطية مبذور (PATCH /settings/config مايردّهوش 404)",
        "pass": true,
        "skip": false
      },
      {
        "file": "settings-audit-fixes.test.cjs",
        "name": "الإصلاح 5: الرد بيغطي مفاتيح ملف الشركة الـ23 كلها والأسماء القديمة كما هي",
        "pass": true,
        "skip": false
      },
      {
        "file": "settlement-payment-ui.test.cjs",
        "name": "SPU-01: سطر الصرف المتسجل بالتاريخ والطريقة والمرجع ومين سجّل، وطرق الشاشة هي طرق الخادم بنفس أسمائها",
        "pass": true,
        "skip": false
      },
      {
        "file": "settlement-payment-ui.test.cjs",
        "name": "SPU-02: الشاشة بتعرض القسم بعد الاعتماد ولأصحاب التصفية بس، والمسار بصلاحية «اعتماد التصفية»",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FG1 — المفتاح الغايب أو الفاضي أو غير true = مقفول (قيمة مقروءة بنجاح، مش فشل قراءة)",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FG2 — فشل القراءة = UNKNOWN، مش DISABLED (الحالتان ممنوع يتلخبطوا)",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FF1 — فشل قراءة الإعداد: مسار حساب الشركة مرفوض 503 برسالة عربية بالسبب، ومفيش جلسة ولا بريد",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FF2 — ونفس الشيء لمسار البريد وكلمة المرور (نفس الدالة المشتركة)",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FF3 — حالة الأمان بتقول «مش معروف» صراحةً ومابتقولش مقفول، وبلا أي سر",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FF4 — المصدر: الرفض قبل أي إصدار جلسة، وقراءة الحالة مرة واحدة في مسار الدخول",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FA1 — 12 رمز غلط في نفس اللحظة: العدّاد بيوصل الحد بالظبط والحالة تتقفل، والرمز الصح يُرفض",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FA2 — رمزان صحيحان متوازيان: استهلاك واحد بالظبط وجلسة واحدة",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FR1 — المتتابع زي ما هو: القفل عند المحاولة الخامسة والعدّاد بيوصلها بالظبط",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FS1 — إعادة الإرسال بتُبطل الرمز القديم حتى لتحقق جارٍ، والحالة مابتُستهلكش",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FRS1 — 4 إعادات إرسال في نفس اللحظة: رسالة واحدة لكل خانة، والعدّاد بيطابق عدد الرسايل",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FRS2 — المصدر: الخانة تُحجز بتحديث مشروط قبل الإرسال، مش بتعيين محسوب في JS بعده",
        "pass": true,
        "skip": false
      },
      {
        "file": "two-factor-hardening.test.cjs",
        "name": "2FS2 — المصدر: الاستهلاك مشروط بالـhash اللي قورن، والمقارنة حرفية في JS كمان",
        "pass": true,
        "skip": false
      }
    ],
    "errors": []
  },
  "staticChecks": {
    "target": "622ed57b19c82ec6e9e87d9546aef3dc260c4e7b",
    "results": [
      {
        "area": "api",
        "exitCode": 0,
        "diagnostics": ""
      },
      {
        "area": ".",
        "exitCode": 0,
        "diagnostics": ""
      }
    ]
  },
  "environmentLimitations": {
    "opsBackupTransport": "Docker pipe denied; SQL native full backup/restore/CHECKDB tested separately",
    "nativeSql2019": false,
    "compatibility": 150,
    "browserInteraction": false,
    "performanceMeasured": false
  },
  "supersededAttempts": {
    "scheduler-confirmed": "Scheduler metadata retained with timers disabled; resolves SJ-3 harness nextRunAt failure",
    "regression-download-confirmed": "Express private dot-directory PDF fixture transport only; authorization unchanged",
    "independent-finance-confirmed": "Corrected new test route /disbursement and expected status DISBURSED; supplied branch to backup employee",
    "migrations-combined-confirmed": "Forced only second disposable datasource synchronize=false because Nest forRoot config was cached",
    "money-current-final": "Existing debit seeded directly; creation of new direct debit is guarded by default",
    "money-baseline-confirmed": "Added git safe.directory for read-only baseline comparison"
  },
  "excludedEnvironmentFailure": "codex-review-p1-results-ops.cjs: four tests could not finish because backup transport cannot access Docker; not classified as product failure"
}
