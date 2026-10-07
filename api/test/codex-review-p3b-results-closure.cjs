module.exports = {
  "selected": [
    "positions",
    "positions-migration",
    "codex-review-p3b-units",
    "codex-review-p3b-independent",
    "codex-review-p3b-controls",
    "codex-review-p3b-seat-races",
    "codex-review-p3b-seat-snapshot"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 78,
      "failed": 0,
      "passed": 78,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 78,
      "suites": 0
    },
    "duration_ms": 47798.0134
  },
  "results": [
    {
      "file": "positions.integration.cjs",
      "name": "PS-01: الموديول مقفول افتراضيًا — مساراته مقفولة والتعيين زي ما هو؛ وبعد التفعيل الصلاحيات والنطاق",
      "ms": 7817.8985,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-02: إنشاء وظيفة وتعديلها — المدخلات والروابط، وفرع برّه النطاق زي اللي مش موجود، والوحدة مابتتغيّرش، وسجل التدقيق",
      "ms": 431.525,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-03: «المشغول» محسوب — المربوط، وخدمته ماانتهتش، ولسه في وحدتها؛ وأرقام المجمّدة والملغية",
      "ms": 516.2471,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-04: تقرير «معتمد / مشغول / شاغر / زيادة» لكل قسم صحيح، وموظفين من غير وظيفة، وفي نطاق القارئ بس",
      "ms": 88.7201,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-05: ربط موظف قايم وفكّه — النطاق، والوحدة، والحالة، والنقل من وظيفة لتانية، والرابط القديم",
      "ms": 300.8042,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-06: التعيين والإنفاذ مقفول — الخانة اختيارية والمليانة «زيادة»؛ ووظيفة فرع تاني أو قسم تاني أو مش نشطة مرفوضة والموظف مابيتعملش",
      "ms": 684.2776,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-07: التعيين والإنفاذ مفعّل — من غير وظيفة مرفوض، وعلى مليانة مرفوض، وعلى اللي فيها شاغر مقبول؛ وتعيينين على آخر مقعد واحد بس",
      "ms": 1021.8588,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-08: قايمة الاختيار في نموذج التعيين — النشطة في الفرع بأرقامها، لصاحب «تعيين موظف جديد»، وفرع برّه النطاق فاضي",
      "ms": 101.7872,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-09: التوليد من الموجود — المعاينة والتطبيق، وآمن للتكرار، وفي النطاق بس",
      "ms": 152.6828,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-10: حالة الموديول والإنفاذ بتتقري قبل معاملة التعيين ومعاملة الربط مش جواها (درس Codex CRP2Y-B02)",
      "ms": 183.6114,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-01: نوع الطلب — مقفول مع موديوله، وحقوله من الخادم (المسمى من الكتالوج، والعدد، والسبب)",
      "ms": 180.7662,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-02: التقديم — المسمى لازم من الكتالوج (النشط)، والعدد من 1 لـ1000، ومفتاح زيادة مرفوض",
      "ms": 232.4284,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-03: «الاعتماد بيعمل الوظيفة» — وظيفة نشطة جديدة على قسم مقدّم الطلب في فرع الطلب، والطلب مكتمل بمرجعها",
      "ms": 138.1486,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-04: زيادة العدد — وظيفة قايمة بنفس المسمى على نفس القسم عددها بيزيد (حتى المجمّدة)، والملغية بتتساب ووظيفة جديدة بتتعمل",
      "ms": 1031.1375,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-05: القسم متثبّت وقت التقديم — نقل مقدّم الطلب بعدها مابيغيّرش الوحدة؛ وقسم مابقاش في فرع الطلب = الاعتماد مرفوض؛ ومسودة مقدّمها اتنقل من فرعها ماتتقدّمش؛ ومن غير قسم = مستوى الفرع؛ وإعادة التقديم بتثبّت من جديد؛ وبالنيابة على قسم صاحب الطلب",
      "ms": 938.4056,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-06: بانِي الطلبات — الوجهة في قايمته باسمها، ونوع جديد بيها بيشتغل زي المزروع وحقول الباني بتتزوّد على حقول الوجهة، وبيتقفل مع الموديول",
      "ms": 312.9922,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-07: اعتمادين في نفس اللحظة لنفس المسمى على نفس الوحدة — وظيفة واحدة بمجموع العددين؛ وطلب مفتوح والموديول اتقفل بيكمّل سلسلته",
      "ms": 1085.4996,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-08: قبل الترحيل — التقديم مرفوض برسالة الترحيل، واعتماد طلب مفتوح مرفوض بيها والطلب زي ما هو؛ وبعد الترحيل بيكمّل",
      "ms": 281.0418,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-11: قسم اتنقل لفرع تاني وموظفيه ووظائفه فضلوا — رقمه واسمه (وفريقه) محجوبين في القايمة والتقرير والتفاصيل ومعاينة التوليد، ووظائفه برّه قايمة التعيين، والتوليد مابيعملش وظيفة عليه",
      "ms": 434.7917,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-12: فريق اتنقل لوحده لقسم في فرع تاني واتغيّر اسمه — رقمه واسمه الجديد محجوبين عن فرع الوظيفة وقسمها لسه ظاهر؛ ونقله جوه نفس الفرع مابيحجبوش",
      "ms": 246.6958,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-13: التوليد واقف بعد ما قرا خطته — موظف اتربط بوظيفة من الشاشة بيفضل عليها، وقسم اتنقل لفرع تاني مابتتعملش وظيفة عليه",
      "ms": 180.5898,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PS-14: إنشاء وظيفة ونقل قسمها لفرع تاني في نفس اللحظة — النقل بيستنى لحد ما الوظيفة تتحفظ",
      "ms": 1576.7755,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions.integration.cjs",
      "name": "PR-09: الاعتماد مستني قفل الإنشاء والقسم المتثبّت اتنقل لفرع تاني — بيتحكم بعد القفل وبيترفض؛ ونقل بيبدأ بعد الفحص بيستنى الحفظ",
      "ms": 1714.4016,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-migration.integration.cjs",
      "name": "PSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر، وجدول الموظفين زي ما هو",
      "ms": 7699.6479,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-migration.integration.cjs",
      "name": "PSM-2: من غير الجدولين الشاشة بتقول الترحيل ناقص والتعيين زي ما هو؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الوظائف شغالة",
      "ms": 8032.9113,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-migration.integration.cjs",
      "name": "PSM-3: آمن للتكرار",
      "ms": 1046.4013,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-01: مين بيشغل مقعد — خدمته ماانتهتش، وفي وحدة الوظيفة",
      "ms": 0.7395,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-02: أرقام الوظيفة — المعتمد والمشغول والشاغر والزيادة",
      "ms": 0.4737,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-03: حكم شغل مقعد — الفرع، والقسم والفريق، والحالة، والشاغر مع الإنفاذ",
      "ms": 0.3498,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-04: تنضيف مدخلات وظيفة جديدة، والميزانية، والعدد",
      "ms": 0.8629,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-05: كود الوظيفة، وتطبيع المسمى ومفتاح التوليد",
      "ms": 0.2894,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-01: القايمة والمسار والعنوان — بصلاحية العرض، وتبع موديول positions المقفول افتراضيًا",
      "ms": 2.7126,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-02: شاشة الوظائف — الأزرار من حكم الخادم، ورسالة الترحيل الناقص، وأعمدة التقرير",
      "ms": 1.3744,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-03: النماذج — الوحدة عند الإنشاء بس، والربط للنشطة ولصاحب الإدارة، والتوليد معاينة ثم تطبيق",
      "ms": 1.4737,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-04: خطوة اختيار الوظيفة عند التعيين — مع الموديول، وإجبارية مع الإنفاذ، وفشل القايمة بيوقّف الحفظ، والرقم حمولة",
      "ms": 22.9661,
      "pass": true,
      "skip": false
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-05: طلب «وظيفة جديدة / زيادة عدد» — وجهته متسمّية وتبع الموديول، والحقول بأسمائها عند المعتمد، وحقول النموذج فوق حقول الباني",
      "ms": 32.0898,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري",
      "ms": 0.4344,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين",
      "ms": 0.1999,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها",
      "ms": 4.7761,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات",
      "ms": 0.2509,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد",
      "ms": 0.1482,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا",
      "ms": 0.1657,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد",
      "ms": 0.139,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة",
      "ms": 54.0429,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار",
      "ms": 0.3339,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول",
      "ms": 344.4789,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "القمة «الإدارة التنفيذية»: الرئيس التنفيذي مديرها، والسكرتير جنبه بس ومش أب لحد",
      "ms": 1.3014,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الإدارات بأبوّة الأقسام: مدير وعدد موظفين شامل الفروع، والفريق بقائده وأعضائه",
      "ms": 0.2383,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "فلتر الفرع وحساب الفرع: الفرع بيشوف جزءه بس، ولو مفيش رئيس تنفيذي ظاهر الفرع هو القمة",
      "ms": 0.2898,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "من غير إعداد: الرئيس التنفيذي والسكرتير يتستنتجوا من المسمى الوظيفي",
      "ms": 0.2383,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "البحث بيعلّم الشخص أو الوحدة ويفتح الطريق ليه (بتطبيع الهمزات)",
      "ms": 0.5074,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "العرض: كروت بخطوط ربط RTL، السكرتير كارت جانبي، والأعضاء والفتح والقفل",
      "ms": 6.2069,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشاشة: فتح/قفل الكل، بحث، فلتر فرع، طباعة وتصدير، وإعداد الإدارة التنفيذية لحساب الشركة",
      "ms": 2.285,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشواغر في الهيكل: شاغر الوحدة = وظائفها وكل اللي تحتها، والقمة كل شواغر الفروع الظاهرة، ومن غير وظائف الكروت زي ما هي",
      "ms": 3.0401,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4891,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2886,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 16.0651,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.4174,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.365,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2609,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 28.5427,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 39.4169,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3438,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.3141,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-011: 095 فترات الخدمة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2724,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-012: 096 قواعد المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.2283,
      "pass": true,
      "skip": false
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-013: 097 الوظائف المعتمدة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ",
      "ms": 0.124,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-independent.integration.cjs",
      "name": "P3B-I01: a moved department and team must not expose their foreign identifiers",
      "ms": 5166.492,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-independent.integration.cjs",
      "name": "P3B-I02: moving a team alone to a foreign department must hide its current name",
      "ms": 116.399,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-independent.integration.cjs",
      "name": "P3B-I03: department validity must survive waiting for the position creation lock",
      "ms": 235.4711,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-independent.integration.cjs",
      "name": "P3B-I04: generation must not overwrite a holder assignment committed after its initial plan",
      "ms": 149.9117,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-controls.integration.cjs",
      "name": "P3B-C01: hidden position and employee responses equal nonexistent resources",
      "ms": 5342.707,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-controls.integration.cjs",
      "name": "P3B-C02: holder move removes identity from the old branch detail and counts",
      "ms": 167.8827,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-controls.integration.cjs",
      "name": "P3B-C03: department staging overrides input; concurrent approvals combine once",
      "ms": 344.2376,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-controls.integration.cjs",
      "name": "P3B-C04: an already moved request department rejects before waiting; serial generation preserves a team holder",
      "ms": 309.4424,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-controls.integration.cjs",
      "name": "P3B-C05: position mutations and request execution use only their transaction SQL connection",
      "ms": 261.6735,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-seat-races.integration.cjs",
      "name": "P3B-S1: competing holders on the final seat (RCSI=false)",
      "ms": 5763.3509,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-seat-snapshot.integration.cjs",
      "name": "P3B-S2: competing holders on the final seat (RCSI=true)",
      "ms": 5493.6488,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_positions_test_647ac0c98f9b553c is absent from sys.databases.",
    "Cleanup verified: hr_positions_migration_test_016f183086cf480b is absent from sys.databases.",
    "tests 78",
    "suites 0",
    "pass 78",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 47798.0134"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_positions_test_647ac0c98f9b553c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_positions_test_647ac0c98f9b553c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_positions_migration_test_016f183086cf480b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_positions_migration_test_016f183086cf480b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3b_independent_test_8be28e04d1f70e15\"}\n",
    "REVIEW_MEASURE {\"case\":\"foreign-department-reference\",\"actual\":{\"detail\":[null,null,\"قسم برّه الفرع\",null],\"list\":{\"id\":1,\"code\":\"P-0001\",\"jobTitleId\":1,\"title\":\"Synthetic analyst\",\"gradeId\":null,\"gradeName\":null,\"branchId\":1,\"branchName\":\"Synthetic branch A\",\"departmentId\":null,\"departmentName\":\"قسم برّه الفرع\",\"teamId\":null,\"teamName\":null,\"unitHidden\":true,\"costCenterId\":null,\"costCenterName\":null,\"headcount\":3,\"status\":\"ACTIVE\",\"statusLabel\":\"نشطة\",\"budget\":null,\"approved\":3,\"occupied\":0,\"vacant\":3,\"over\":0,\"createdAt\":\"2026-10-07T08:10:17.326Z\"},\"preview\":[{\"branchId\":1,\"branchName\":\"Synthetic branch A\",\"departmentId\":null,\"departmentName\":\"قسم برّه الفرع\",\"title\":\"Synthetic analyst\",\"employees\":1,\"action\":\"skip\",\"reason\":\"قسمهم مش تبع فرعهم — صحّح القسم أو الفرع على ملفاتهم الأول\"}]}}\n",
    "REVIEW_MEASURE {\"case\":\"foreign-team-name\",\"detail\":{\"teamId\":null,\"teamName\":\"فريق برّه الفرع\"}}\n",
    "REVIEW_MEASURE {\"case\":\"request-department-race\",\"approval\":400,\"positions\":[],\"departmentCurrentBranch\":2}\n",
    "REVIEW_MEASURE {\"case\":\"generation-overwrites-link\",\"assigned\":3,\"final\":3,\"response\":{\"created\":1,\"linked\":1}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3b_independent_test_8be28e04d1f70e15\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3b_independent_test_8be28e04d1f70e15\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3b_controls_test_425d26c2963d9d67\"}\n",
    "REVIEW_MEASURE {\"case\":\"transaction-connection-trace\",\"calls\":{\"own\":60,\"foreign\":0},\"bad\":[]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3b_controls_test_425d26c2963d9d67\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3b_controls_test_425d26c2963d9d67\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3b_seat_locking_test_2b1fba7f14b7eff5\"}\n",
    "REVIEW_MEASURE {\"case\":\"last-seat\",\"rcsi\":false,\"statuses\":[201,409],\"occupied\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3b_seat_locking_test_2b1fba7f14b7eff5\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3b_seat_locking_test_2b1fba7f14b7eff5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3b_seat_snapshot_test_6aafbdc0709f07b4\"}\n",
    "REVIEW_MEASURE {\"case\":\"last-seat\",\"rcsi\":true,\"statuses\":[201,409],\"occupied\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3b_seat_snapshot_test_6aafbdc0709f07b4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3b_seat_snapshot_test_6aafbdc0709f07b4\"}\n"
  ]
}
