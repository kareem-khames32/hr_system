module.exports = {
  "selected": [
    "positions",
    "positions-migration",
    "codex-review-p3c-units",
    "codex-review-p3c-independent",
    "codex-review-p3c-controls",
    "codex-review-p3c-seat-races",
    "codex-review-p3c-seat-snapshot",
    "codex-review-p3c-generation",
    "codex-review-p3c-unit-writes",
    "codex-review-p3c-isolation"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 87,
      "failed": 0,
      "passed": 87,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 87,
      "suites": 0
    },
    "duration_ms": 56550.0721
  },
  "results": [
    {
      "file": "positions.integration.cjs",
      "name": "PS-01: الموديول مقفول افتراضيًا — مساراته مقفولة والتعيين زي ما هو؛ وبعد التفعيل الصلاحيات والنطاق",
      "ms": 7330.8076,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-02: إنشاء وظيفة وتعديلها — المدخلات والروابط، وفرع برّه النطاق زي اللي مش موجود، والوحدة مابتتغيّرش، وسجل التدقيق",
      "ms": 487.9056,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-03: «المشغول» محسوب — المربوط، وخدمته ماانتهتش، ولسه في وحدتها؛ وأرقام المجمّدة والملغية",
      "ms": 504.0757,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-04: تقرير «معتمد / مشغول / شاغر / زيادة» لكل قسم صحيح، وموظفين من غير وظيفة، وفي نطاق القارئ بس",
      "ms": 64.2284,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-05: ربط موظف قايم وفكّه — النطاق، والوحدة، والحالة، والنقل من وظيفة لتانية، والرابط القديم",
      "ms": 274.5223,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-06: التعيين والإنفاذ مقفول — الخانة اختيارية والمليانة «زيادة»؛ ووظيفة فرع تاني أو قسم تاني أو مش نشطة مرفوضة والموظف مابيتعملش",
      "ms": 575.0885,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-07: التعيين والإنفاذ مفعّل — من غير وظيفة مرفوض، وعلى مليانة مرفوض، وعلى اللي فيها شاغر مقبول؛ وتعيينين على آخر مقعد واحد بس",
      "ms": 906.6008,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-08: قايمة الاختيار في نموذج التعيين — النشطة في الفرع بأرقامها، لصاحب «تعيين موظف جديد»، وفرع برّه النطاق فاضي",
      "ms": 88.3803,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-09: التوليد من الموجود — المعاينة والتطبيق، وآمن للتكرار، وفي النطاق بس",
      "ms": 128.2929,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-10: حالة الموديول والإنفاذ بتتقري قبل معاملة التعيين ومعاملة الربط مش جواها (درس Codex CRP2Y-B02)",
      "ms": 162.6493,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-01: نوع الطلب — مقفول مع موديوله، وحقوله من الخادم (المسمى من الكتالوج، والعدد، والسبب)",
      "ms": 148.7484,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-02: التقديم — المسمى لازم من الكتالوج (النشط)، والعدد من 1 لـ1000، ومفتاح زيادة مرفوض",
      "ms": 164.1737,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-03: «الاعتماد بيعمل الوظيفة» — وظيفة نشطة جديدة على قسم مقدّم الطلب في فرع الطلب، والطلب مكتمل بمرجعها",
      "ms": 142.4375,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-04: زيادة العدد — وظيفة قايمة بنفس المسمى على نفس القسم عددها بيزيد (حتى المجمّدة)، والملغية بتتساب ووظيفة جديدة بتتعمل",
      "ms": 581.5366,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-05: القسم متثبّت وقت التقديم — نقل مقدّم الطلب بعدها مابيغيّرش الوحدة؛ وقسم مابقاش في فرع الطلب = الاعتماد مرفوض؛ ومسودة مقدّمها اتنقل من فرعها ماتتقدّمش؛ ومن غير قسم = مستوى الفرع؛ وإعادة التقديم بتثبّت من جديد؛ وبالنيابة على قسم صاحب الطلب",
      "ms": 1105.1456,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-06: بانِي الطلبات — الوجهة في قايمته باسمها، ونوع جديد بيها بيشتغل زي المزروع وحقول الباني بتتزوّد على حقول الوجهة، وبيتقفل مع الموديول",
      "ms": 462.2042,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-07: اعتمادين في نفس اللحظة لنفس المسمى على نفس الوحدة — وظيفة واحدة بمجموع العددين؛ وطلب مفتوح والموديول اتقفل بيكمّل سلسلته",
      "ms": 1125.1778,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-08: قبل الترحيل — التقديم مرفوض برسالة الترحيل، واعتماد طلب مفتوح مرفوض بيها والطلب زي ما هو؛ وبعد الترحيل بيكمّل",
      "ms": 246.2237,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-11: قسم اتنقل لفرع تاني وموظفيه ووظائفه فضلوا — رقمه واسمه (وفريقه) محجوبين في القايمة والتقرير والتفاصيل ومعاينة التوليد، ووظائفه برّه قايمة التعيين، والتوليد مابيعملش وظيفة عليه",
      "ms": 423.2183,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-12: فريق اتنقل لوحده لقسم في فرع تاني واتغيّر اسمه — رقمه واسمه الجديد محجوبين عن فرع الوظيفة وقسمها لسه ظاهر؛ ونقله جوه نفس الفرع مابيحجبوش",
      "ms": 293.6585,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-13: التوليد واقف بعد ما قرا خطته — المربوط من الشاشة بيفضل، والقسم اللي اتنقل والوظيفة المطابقة اللي اتعملت والمسمى اللي اتقفل مابتتعملش عليهم وظيفة، وإنشاء على مستوى الفرع بيستنى",
      "ms": 1741.1171,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-14: إنشاء وظيفة ونقل قسمها لفرع تاني في نفس اللحظة — النقل بيستنى لحد ما الوظيفة تتحفظ",
      "ms": 1574.3259,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-09: الاعتماد مستني قفل الإنشاء والقسم المتثبّت اتنقل لفرع تاني — بيتحكم بعد القفل وبيترفض؛ ونقل بيبدأ بعد الفحص بيستنى الحفظ",
      "ms": 1784.63,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-15: تعيين مستني صف الوظيفة والقسم اتنقل لفرع تاني — مرفوض ومفيش موظف اتعمل؛ وربط واقف قبل الحفظ: نقل القسم بيستنى",
      "ms": 1818.8242,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-migration.integration.cjs",
      "name": "PSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر، وجدول الموظفين زي ما هو",
      "ms": 7763.332,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-migration.integration.cjs",
      "name": "PSM-2: من غير الجدولين الشاشة بتقول الترحيل ناقص والتعيين زي ما هو؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الوظائف شغالة",
      "ms": 7286.632,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-migration.integration.cjs",
      "name": "PSM-3: آمن للتكرار",
      "ms": 955.7567,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-01: مين بيشغل مقعد — خدمته ماانتهتش، وفي وحدة الوظيفة",
      "ms": 0.7402,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-02: أرقام الوظيفة — المعتمد والمشغول والشاغر والزيادة",
      "ms": 0.4532,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-03: حكم شغل مقعد — الفرع، والقسم والفريق، والحالة، والشاغر مع الإنفاذ",
      "ms": 0.1892,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-04: تنضيف مدخلات وظيفة جديدة، والميزانية، والعدد",
      "ms": 0.3941,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-05: كود الوظيفة، وتطبيع المسمى ومفتاح التوليد",
      "ms": 0.1654,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-01: القايمة والمسار والعنوان — بصلاحية العرض، وتبع موديول positions المقفول افتراضيًا",
      "ms": 2.3351,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-02: شاشة الوظائف — الأزرار من حكم الخادم، ورسالة الترحيل الناقص، وأعمدة التقرير",
      "ms": 1.0342,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-03: النماذج — الوحدة عند الإنشاء بس، والربط للنشطة ولصاحب الإدارة، والتوليد معاينة ثم تطبيق",
      "ms": 1.6017,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-04: خطوة اختيار الوظيفة عند التعيين — مع الموديول، وإجبارية مع الإنفاذ، وفشل القايمة بيوقّف الحفظ، والرقم حمولة",
      "ms": 20.4611,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-05: طلب «وظيفة جديدة / زيادة عدد» — وجهته متسمّية وتبع الموديول، والحقول بأسمائها عند المعتمد، وحقول النموذج فوق حقول الباني",
      "ms": 28.4267,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
      "ms": 0.8237,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
      "ms": 0.1736,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
      "ms": 4.8091,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
      "ms": 0.173,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
      "ms": 0.1276,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
      "ms": 0.1522,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
      "ms": 0.1035,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
      "ms": 45.6803,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
      "ms": 0.322,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
      "ms": 328.6377,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "القمة «الإدارة التنفيذية»: الرئيس التنفيذي مديرها، والسكرتير جنبه بس ومش أب لحد",
      "ms": 1.2688,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الإدارات بأبوّة الأقسام: مدير وعدد موظفين شامل الفروع، والفريق بقائده وأعضائه",
      "ms": 0.2276,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "فلتر الفرع وحساب الفرع: الفرع بيشوف جزءه بس، ولو مفيش رئيس تنفيذي ظاهر الفرع هو القمة",
      "ms": 0.279,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "من غير إعداد: الرئيس التنفيذي والسكرتير يتستنتجوا من المسمى الوظيفي",
      "ms": 0.2099,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "البحث بيعلّم الشخص أو الوحدة ويفتح الطريق ليه (بتطبيع الهمزات)",
      "ms": 0.6656,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "العرض: كروت بخطوط ربط RTL، السكرتير كارت جانبي، والأعضاء والفتح والقفل",
      "ms": 6.3162,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشاشة: فتح/قفل الكل، بحث، فلتر فرع، طباعة وتصدير، وإعداد الإدارة التنفيذية لحساب الشركة",
      "ms": 2.0149,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشواغر في الهيكل: شاغر الوحدة = وظائفها وكل اللي تحتها، والقمة كل شواغر الفروع الظاهرة، ومن غير وظائف الكروت زي ما هي",
      "ms": 2.8867,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4361,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3112,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 15.0662,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3369,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3012,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2358,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 25.4498,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 38.0657,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.326,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.332,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-011: 095 فترات الخدمة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2362,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-012: 096 قواعد المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2429,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-013: 097 الوظائف المعتمدة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.1205,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-independent.integration.cjs",
      "name": "P3C-I01: a moved department and team must not expose their foreign identifiers",
      "ms": 4426.5723,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-independent.integration.cjs",
      "name": "P3C-I02: moving a team alone to a foreign department must hide its current name",
      "ms": 74.1612,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-independent.integration.cjs",
      "name": "P3C-I03: department validity must survive waiting for the position creation lock",
      "ms": 183.4333,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-independent.integration.cjs",
      "name": "P3C-I04: generation must not overwrite a holder assignment committed after its initial plan",
      "ms": 117.5342,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-controls.integration.cjs",
      "name": "P3C-C01: hidden position and employee responses equal nonexistent resources",
      "ms": 5003.8368,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-controls.integration.cjs",
      "name": "P3C-C02: holder move removes identity from the old branch detail and counts",
      "ms": 114.7986,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-controls.integration.cjs",
      "name": "P3C-C03: department staging overrides input; concurrent approvals combine once",
      "ms": 198.7792,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-controls.integration.cjs",
      "name": "P3C-C04: an already moved request department rejects before waiting; serial generation preserves a team holder",
      "ms": 229.4217,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-controls.integration.cjs",
      "name": "P3C-C05: position mutations and request execution use only their transaction SQL connection",
      "ms": 228.7714,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-seat-races.integration.cjs",
      "name": "P3C-S1: competing holders on the final seat (RCSI=false)",
      "ms": 4880.7307,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-seat-snapshot.integration.cjs",
      "name": "P3C-S2: competing holders on the final seat (RCSI=true)",
      "ms": 5132.8054,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-generation.integration.cjs",
      "name": "P3C-G01: an existing position committed after the plan must prevent duplicate generation",
      "ms": 4904.3513,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-generation.integration.cjs",
      "name": "P3C-G02: an inactive catalog title after the plan must not create a new approved position",
      "ms": 75.3918,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-generation.integration.cjs",
      "name": "P3C-G03: equivalent changes before the plan are skipped",
      "ms": 93.0833,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-unit-writes.integration.cjs",
      "name": "P3C-W01: linking must not seat an employee on a position whose department is already foreign",
      "ms": 4859.3529,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-unit-writes.integration.cjs",
      "name": "P3C-W02: hiring must recheck department ownership after waiting on the seat",
      "ms": 126.0219,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-unit-writes.integration.cjs",
      "name": "P3C-W03: ordinary in-branch hiring and holder assignment still work",
      "ms": 282.7383,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-isolation.integration.cjs",
      "name": "P3C-H01: moved department identities are hidden and aggregated with identical update responses",
      "ms": 4961.2559,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3c-isolation.integration.cjs",
      "name": "P3C-H02: same-branch team moves remain visible; outside moves hide name and ID until returned",
      "ms": 139.7401,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_positions_test_d35d242bc840a65f is absent from sys.databases.",
    "Cleanup verified: hr_positions_migration_test_699e4a44ed32e939 is absent from sys.databases.",
    "tests 87",
    "suites 0",
    "pass 87",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 56550.0721"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_positions_test_d35d242bc840a65f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_positions_test_d35d242bc840a65f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_positions_migration_test_699e4a44ed32e939\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_positions_migration_test_699e4a44ed32e939\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3c_independent_test_4b6b6cbe4a171eec\"}\n",
    "REVIEW_MEASURE {\"case\":\"foreign-department-reference\",\"actual\":{\"detail\":[null,null,\"قسم برّه الفرع\",null],\"list\":{\"id\":1,\"code\":\"P-0001\",\"jobTitleId\":1,\"title\":\"Synthetic analyst\",\"gradeId\":null,\"gradeName\":null,\"branchId\":1,\"branchName\":\"Synthetic branch A\",\"departmentId\":null,\"departmentName\":\"قسم برّه الفرع\",\"teamId\":null,\"teamName\":null,\"unitHidden\":true,\"costCenterId\":null,\"costCenterName\":null,\"headcount\":3,\"status\":\"ACTIVE\",\"statusLabel\":\"نشطة\",\"budget\":null,\"approved\":3,\"occupied\":0,\"vacant\":3,\"over\":0,\"createdAt\":\"2026-10-07T08:47:40.253Z\"},\"preview\":[{\"branchId\":1,\"branchName\":\"Synthetic branch A\",\"departmentId\":null,\"departmentName\":\"قسم برّه الفرع\",\"title\":\"Synthetic analyst\",\"employees\":1,\"action\":\"skip\",\"reason\":\"قسمهم مش تبع فرعهم — صحّح القسم أو الفرع على ملفاتهم الأول\"}]}}\n",
    "REVIEW_MEASURE {\"case\":\"foreign-team-name\",\"detail\":{\"teamId\":null,\"teamName\":\"فريق برّه الفرع\"}}\n",
    "REVIEW_MEASURE {\"case\":\"request-department-race\",\"approval\":400,\"positions\":[],\"departmentCurrentBranch\":2}\n",
    "REVIEW_MEASURE {\"case\":\"generation-overwrites-link\",\"assigned\":3,\"final\":3,\"response\":{\"created\":1,\"linked\":1}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3c_independent_test_4b6b6cbe4a171eec\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3c_independent_test_4b6b6cbe4a171eec\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3c_controls_test_55eb15f3d0fdd055\"}\n",
    "REVIEW_MEASURE {\"case\":\"transaction-connection-trace\",\"calls\":{\"own\":61,\"foreign\":0},\"bad\":[]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3c_controls_test_55eb15f3d0fdd055\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3c_controls_test_55eb15f3d0fdd055\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3c_seat_locking_test_a87c881a7ba3b430\"}\n",
    "REVIEW_MEASURE {\"case\":\"last-seat\",\"rcsi\":false,\"statuses\":[201,409],\"occupied\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3c_seat_locking_test_a87c881a7ba3b430\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3c_seat_locking_test_a87c881a7ba3b430\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3c_seat_snapshot_test_b7c6956188ed79ed\"}\n",
    "REVIEW_MEASURE {\"case\":\"last-seat\",\"rcsi\":true,\"statuses\":[409,201],\"occupied\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3c_seat_snapshot_test_b7c6956188ed79ed\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3c_seat_snapshot_test_b7c6956188ed79ed\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3c_generation_test_bd905bb24d97888b\"}\n",
    "REVIEW_MEASURE {\"case\":\"generation-existing-after-plan\",\"manual\":1,\"positions\":[{\"id\":1,\"headcount\":3}],\"result\":{\"created\":1,\"linked\":1}}\n",
    "REVIEW_MEASURE {\"case\":\"generation-inactive-title-after-plan\",\"active\":false,\"created\":[],\"result\":{\"created\":0,\"linked\":0}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3c_generation_test_bd905bb24d97888b\"}\n{\"cleanupVerified\":\"hr_codex_p3c_generation_test_bd905bb24d97888b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3c_unit_writes_test_b94845acf59f522d\"}\n",
    "REVIEW_MEASURE {\"case\":\"link-foreign-department\",\"hidden\":true,\"status\":400,\"positionBranch\":1,\"departmentCurrentBranch\":2,\"link\":null}\n",
    "REVIEW_MEASURE {\"case\":\"hire-moved-department\",\"status\":400,\"message\":\"وحدة الوظيفة دي اتغيّرت في الهيكل ومابقتش تبع فرعها: مفيش تعيين ولا ربط عليها. الغِ الوظيفة واعمل واحدة على الوحدة الصح\",\"employees\":[],\"departmentCurrentBranch\":2}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3c_unit_writes_test_b94845acf59f522d\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3c_unit_writes_test_b94845acf59f522d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3c_isolation_test_696121c8ee1d602e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3c_isolation_test_696121c8ee1d602e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3c_isolation_test_696121c8ee1d602e\"}\n"
  ]
}
