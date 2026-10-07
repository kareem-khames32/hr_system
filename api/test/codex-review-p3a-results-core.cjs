module.exports = {
  "selected": [
    "positions",
    "positions-migration",
    "modules-enforcement",
    "modules-settings",
    "modules-migration",
    "codex-review-p3a-units"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 88,
      "failed": 0,
      "passed": 88,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 88,
      "suites": 0
    },
    "duration_ms": 44076.0205
  },
  "results": [
    {
      "file": "positions.integration.cjs",
      "name": "PS-01: الموديول مقفول افتراضيًا — مساراته مقفولة والتعيين زي ما هو؛ وبعد التفعيل الصلاحيات والنطاق",
      "ms": 7407.7346,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-02: إنشاء وظيفة وتعديلها — المدخلات والروابط، وفرع برّه النطاق زي اللي مش موجود، والوحدة مابتتغيّرش، وسجل التدقيق",
      "ms": 414.0848,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-03: «المشغول» محسوب — المربوط، وخدمته ماانتهتش، ولسه في وحدتها؛ وأرقام المجمّدة والملغية",
      "ms": 514.3255,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-04: تقرير «معتمد / مشغول / شاغر / زيادة» لكل قسم صحيح، وموظفين من غير وظيفة، وفي نطاق القارئ بس",
      "ms": 78.6831,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-05: ربط موظف قايم وفكّه — النطاق، والوحدة، والحالة، والنقل من وظيفة لتانية، والرابط القديم",
      "ms": 295.4772,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-06: التعيين والإنفاذ مقفول — الخانة اختيارية والمليانة «زيادة»؛ ووظيفة فرع تاني أو قسم تاني أو مش نشطة مرفوضة والموظف مابيتعملش",
      "ms": 538.9017,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-07: التعيين والإنفاذ مفعّل — من غير وظيفة مرفوض، وعلى مليانة مرفوض، وعلى اللي فيها شاغر مقبول؛ وتعيينين على آخر مقعد واحد بس",
      "ms": 837.5575,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-08: قايمة الاختيار في نموذج التعيين — النشطة في الفرع بأرقامها، لصاحب «تعيين موظف جديد»، وفرع برّه النطاق فاضي",
      "ms": 74.0784,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-09: التوليد من الموجود — المعاينة والتطبيق، وآمن للتكرار، وفي النطاق بس",
      "ms": 99.8368,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-10: حالة الموديول والإنفاذ بتتقري قبل معاملة التعيين ومعاملة الربط مش جواها (درس Codex CRP2Y-B02)",
      "ms": 165.4895,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-01: نوع الطلب — مقفول مع موديوله، وحقوله من الخادم (المسمى من الكتالوج، والعدد، والسبب)",
      "ms": 145.1969,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-02: التقديم — المسمى لازم من الكتالوج (النشط)، والعدد من 1 لـ1000، ومفتاح زيادة مرفوض",
      "ms": 167.5693,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-03: «الاعتماد بيعمل الوظيفة» — وظيفة نشطة جديدة على قسم مقدّم الطلب في فرع الطلب، والطلب مكتمل بمرجعها",
      "ms": 116.7781,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-04: زيادة العدد — وظيفة قايمة بنفس المسمى على نفس القسم عددها بيزيد (حتى المجمّدة)، والملغية بتتساب ووظيفة جديدة بتتعمل",
      "ms": 486.4149,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-05: القسم متثبّت وقت التقديم — نقل مقدّم الطلب بعدها مابيغيّرش الوحدة؛ وقسم مابقاش في فرع الطلب = الاعتماد مرفوض؛ ومسودة مقدّمها اتنقل من فرعها ماتتقدّمش؛ ومن غير قسم = مستوى الفرع؛ وإعادة التقديم بتثبّت من جديد؛ وبالنيابة على قسم صاحب الطلب",
      "ms": 603.8139,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-06: بانِي الطلبات — الوجهة في قايمته باسمها، ونوع جديد بيها بيشتغل زي المزروع وحقول الباني بتتزوّد على حقول الوجهة، وبيتقفل مع الموديول",
      "ms": 299.702,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-07: اعتمادين في نفس اللحظة لنفس المسمى على نفس القسم — وظيفة واحدة بمجموع العددين؛ وطلب مفتوح والموديول اتقفل بيكمّل سلسلته",
      "ms": 1214.1045,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-08: قبل الترحيل — التقديم مرفوض برسالة الترحيل، واعتماد طلب مفتوح مرفوض بيها والطلب زي ما هو؛ وبعد الترحيل بيكمّل",
      "ms": 480.9559,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-11: قسم اتنقل لفرع تاني وموظفيه ووظائفه فضلوا — مابيتسمّاش في القايمة والتقرير وقايمة التعيين ومعاينة التوليد، والتوليد مابيعملش وظيفة عليه",
      "ms": 293.6398,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-migration.integration.cjs",
      "name": "PSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر، وجدول الموظفين زي ما هو",
      "ms": 7877.3175,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-migration.integration.cjs",
      "name": "PSM-2: من غير الجدولين الشاشة بتقول الترحيل ناقص والتعيين زي ما هو؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الوظائف شغالة",
      "ms": 7254.7736,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-migration.integration.cjs",
      "name": "PSM-3: آمن للتكرار",
      "ms": 1028.7445,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 6465.9971,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 132.6606,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 292.0964,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 370.6774,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 114.0179,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 245.5949,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 160.2959,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 468.8609,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1401.6095,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 328.5581,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 551.4828,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 146.839,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-01: الصلاحية — settings.modules بس، والكتابة لحساب على مستوى الشركة",
      "ms": 6478.8395,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-02: الكتالوج — الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات",
      "ms": 3.5349,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-03: التفعيل والقفل من الشاشة — الأثر فوري والتغيير متسجّل باسم اللي عمله",
      "ms": 85.8455,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-04: الرفض — تبعيات وأساسي ومجهول وجسم غلط، ومفيش حاجة بتتكتب",
      "ms": 151.6748,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-05: أثر القفل قبل القفل — الطلبات المفتوحة والبيانات الشغالة",
      "ms": 216.1807,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-06: الباقات — معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات",
      "ms": 178.5502,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-07: المزايا الفرعية وجمهور التفعيل من الشاشة",
      "ms": 205.5584,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-settings.integration.cjs",
      "name": "MS-08: شاشة الأدوار — صلاحيات الموديول المقفول متعلّمة، والممنوحة منها بتفضل على الدور",
      "ms": 269.9392,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-1: الملفين LF من غير BOM، من غير عبارة ممنوعة، وأكوادهم فريدة، وأسماء المفاتيح والقيد والفهرس بتاعة الكيانات، وقاعدة synchronize بنفس الشكل",
      "ms": 6897.7923,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-2: المخطط القديم ببيانات قائمة — المُرحّل بيضيف الجداول ويزرع حالة الشركة من غير ما يغيّر صف قائم، والفرق صفر",
      "ms": 3999.9795,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-3: آمن للتكرار، وصف غيّره المالك من الشاشة مايرجعش لقيمة الترحيل",
      "ms": 862.9924,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-4: التوظيف — من غير مرشحين ولا حامل للصلاحية مقفول؛ ومرشح واحد أو منحة لمستخدم مفعّل",
      "ms": 162.3252,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-migration.integration.cjs",
      "name": "MM-5: شكل غلط بيوقف التحقق بكوده ومايسيبش أثر، و077 قبل 076 بيرفض",
      "ms": 601.6774,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-01: مين بيشغل مقعد — خدمته ماانتهتش، وفي وحدة الوظيفة",
      "ms": 0.7815,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-02: أرقام الوظيفة — المعتمد والمشغول والشاغر والزيادة",
      "ms": 0.5041,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-03: حكم شغل مقعد — الفرع، والقسم والفريق، والحالة، والشاغر مع الإنفاذ",
      "ms": 0.1886,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-04: تنضيف مدخلات وظيفة جديدة، والميزانية، والعدد",
      "ms": 0.4032,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-05: كود الوظيفة، وتطبيع المسمى ومفتاح التوليد",
      "ms": 0.1813,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-01: القايمة والمسار والعنوان — بصلاحية العرض، وتبع موديول positions المقفول افتراضيًا",
      "ms": 3.1093,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-02: شاشة الوظائف — الأزرار من حكم الخادم، ورسالة الترحيل الناقص، وأعمدة التقرير",
      "ms": 1.0223,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-03: النماذج — الوحدة عند الإنشاء بس، والربط للنشطة ولصاحب الإدارة، والتوليد معاينة ثم تطبيق",
      "ms": 1.6992,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-04: خطوة اختيار الوظيفة عند التعيين — مع الموديول، وإجبارية مع الإنفاذ، وفشل القايمة بيوقّف الحفظ، والرقم حمولة",
      "ms": 14.0267,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-05: طلب «وظيفة جديدة / زيادة عدد» — وجهته متسمّية وتبع الموديول، والحقول بأسمائها عند المعتمد، وحقول النموذج فوق حقول الباني",
      "ms": 37.0709,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
      "ms": 0.4144,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
      "ms": 0.169,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
      "ms": 4.6203,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
      "ms": 0.1702,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
      "ms": 0.2726,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
      "ms": 0.1738,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
      "ms": 0.1273,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
      "ms": 45.0442,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
      "ms": 0.2865,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
      "ms": 348.4744,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "القمة «الإدارة التنفيذية»: الرئيس التنفيذي مديرها، والسكرتير جنبه بس ومش أب لحد",
      "ms": 1.3143,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الإدارات بأبوّة الأقسام: مدير وعدد موظفين شامل الفروع، والفريق بقائده وأعضائه",
      "ms": 0.3633,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "فلتر الفرع وحساب الفرع: الفرع بيشوف جزءه بس، ولو مفيش رئيس تنفيذي ظاهر الفرع هو القمة",
      "ms": 0.3175,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "من غير إعداد: الرئيس التنفيذي والسكرتير يتستنتجوا من المسمى الوظيفي",
      "ms": 0.2397,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "البحث بيعلّم الشخص أو الوحدة ويفتح الطريق ليه (بتطبيع الهمزات)",
      "ms": 0.5124,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "العرض: كروت بخطوط ربط RTL، السكرتير كارت جانبي، والأعضاء والفتح والقفل",
      "ms": 7.2081,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشاشة: فتح/قفل الكل، بحث، فلتر فرع، طباعة وتصدير، وإعداد الإدارة التنفيذية لحساب الشركة",
      "ms": 2.3633,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشواغر في الهيكل: شاغر الوحدة = وظائفها وكل اللي تحتها، والقمة كل شواغر الفروع الظاهرة، ومن غير وظائف الكروت زي ما هي",
      "ms": 3.4878,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.5019,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2793,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 21.5057,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3189,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2509,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3613,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 17.8616,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 30.4585,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3082,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3105,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-011: 095 فترات الخدمة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2757,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-012: 096 قواعد المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.399,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-013: 097 الوظائف المعتمدة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2428,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_positions_test_5064545f59b6052b is absent from sys.databases.",
    "Cleanup verified: hr_positions_migration_test_db83f24e5e9e8910 is absent from sys.databases.",
    "Cleanup verified: hr_modules_test_cbab21918aedec0f is absent from sys.databases.",
    "Cleanup verified: hr_modules_settings_test_def46ca948f3f862 is absent from sys.databases.",
    "Cleanup verified: hr_modules_migration_test_8dd607512052fb95 is absent from sys.databases.",
    "tests 88",
    "suites 0",
    "pass 88",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 44076.0205"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_positions_test_5064545f59b6052b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_positions_test_5064545f59b6052b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_positions_migration_test_db83f24e5e9e8910\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_positions_migration_test_db83f24e5e9e8910\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_cbab21918aedec0f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_cbab21918aedec0f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_settings_test_def46ca948f3f862\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_settings_test_def46ca948f3f862\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_migration_test_8dd607512052fb95\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_migration_test_8dd607512052fb95\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}
