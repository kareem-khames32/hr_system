module.exports = {
  "target": "555a15520ce2446ec8ed175dc93bbbc1d194a976",
  "blockers": {
    "P5B-B01": "closed",
    "P5B-B02": "persists through receipt ownership reads"
  },
  "newEvidence": "P5C-E11 establishes the remaining blocker; E12 is the no-receipt control",
  "regression": {
    "count": 118,
    "originalFiles": 10,
    "results": [
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
        "ms": 11724.7305,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
        "ms": 226.5517,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»",
        "ms": 393.1444,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل",
        "ms": 465.1153,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب",
        "ms": 427.626,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش",
        "ms": 347.6551,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل",
        "ms": 450.5063,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد",
        "ms": 693.6442,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد",
        "ms": 851.9463,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند",
        "ms": 164.3451,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة",
        "ms": 762.5009,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع",
        "ms": 817.6008,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-13 (Codex P5A-B01): سلسلة فاضية بـ«تنفيذ فوري» مش مراجعة للمبلغ — تقرير المصروفات وسلفة المأمورية مابيتنفذوش من غير اعتماد بشري، والتقديم كله بيرجع",
        "ms": 262.1694,
        "pass": true,
        "skip": false
      },
      {
        "file": "expense-reports.integration.cjs",
        "name": "EX-14 (Codex P5B-B01): اعتماد جولة قبل الإرجاع مايصرفش مبلغ اتغيّر — إعادة تقديم على سلسلة «تنفيذ فوري» مرفوضة كلها، وبالسلسلة الحقيقية القيد بالمبلغ الجديد بعد اعتماد جديد",
        "ms": 283.4164,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
        "ms": 8874.6902,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
        "ms": 104.9873,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
        "ms": 268.2794,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
        "ms": 459.3071,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
        "ms": 132.7113,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
        "ms": 283.0368,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-07: المزايا الفرعية والباقات",
        "ms": 248.048,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
        "ms": 394.6259,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
        "ms": 1235.6442,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
        "ms": 286.242,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
        "ms": 487.2062,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-enforcement.integration.cjs",
        "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
        "ms": 138.6218,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-migration.integration.cjs",
        "name": "MM-1: الملفين LF من غير BOM، من غير عبارة ممنوعة، وأكوادهم فريدة، وأسماء المفاتيح والقيد والفهرس بتاعة الكيانات، وقاعدة synchronize بنفس الشكل",
        "ms": 9945.8799,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-migration.integration.cjs",
        "name": "MM-2: المخطط القديم ببيانات قائمة — المُرحّل بيضيف الجداول ويزرع حالة الشركة من غير ما يغيّر صف قائم، والفرق صفر",
        "ms": 5853.2851,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-migration.integration.cjs",
        "name": "MM-3: آمن للتكرار، وصف غيّره المالك من الشاشة مايرجعش لقيمة الترحيل",
        "ms": 1260.0633,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-migration.integration.cjs",
        "name": "MM-4: التوظيف — من غير مرشحين ولا حامل للصلاحية مقفول؛ ومرشح واحد أو منحة لمستخدم مفعّل",
        "ms": 202.4514,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-migration.integration.cjs",
        "name": "MM-5: شكل غلط بيوقف التحقق بكوده ومايسيبش أثر، و077 قبل 076 بيرفض",
        "ms": 630.263,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-settings.integration.cjs",
        "name": "MS-01: الصلاحية — settings.modules بس، والكتابة لحساب على مستوى الشركة",
        "ms": 8737.6405,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-settings.integration.cjs",
        "name": "MS-02: الكتالوج — الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات",
        "ms": 3.4383,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-settings.integration.cjs",
        "name": "MS-03: التفعيل والقفل من الشاشة — الأثر فوري والتغيير متسجّل باسم اللي عمله",
        "ms": 93.2681,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-settings.integration.cjs",
        "name": "MS-04: الرفض — تبعيات وأساسي ومجهول وجسم غلط، ومفيش حاجة بتتكتب",
        "ms": 175.7927,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-settings.integration.cjs",
        "name": "MS-05: أثر القفل قبل القفل — الطلبات المفتوحة والبيانات الشغالة",
        "ms": 250.4146,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-settings.integration.cjs",
        "name": "MS-06: الباقات — معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات",
        "ms": 372.5709,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-settings.integration.cjs",
        "name": "MS-07: المزايا الفرعية وجمهور التفعيل من الشاشة",
        "ms": 232.5022,
        "pass": true,
        "skip": false
      },
      {
        "file": "modules-settings.integration.cjs",
        "name": "MS-08: شاشة الأدوار — صلاحيات الموديول المقفول متعلّمة، والممنوحة منها بتفضل على الدور",
        "ms": 538.9484,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-M1: migration 070 through the real migrator on a database with old holidays and dated calendar versions — additive, zero schema delta, re-runnable, and a wrong shape stops with its code",
        "ms": 14523.4193,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-M2: no calendar drift after the column — the current global calendar still matches its latest version with the same fingerprint, strict resolution works, and calendar changes keep working",
        "ms": 751.037,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-01: a holiday for employee X only — X's day is a holiday with no absence; Y in the same branch works and gets an absence without a punch; strict payroll calendar agrees",
        "ms": 381.7622,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-02: leave requests count the day for Y and skip it for X, and /attendance/working-days agrees",
        "ms": 251.0953,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-03: department (with sub-departments), team and whole-branch audiences; the old everyone-holiday is unchanged; the branch calendar counts only «the whole branch»",
        "ms": 552.1076,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-04: editing «تسري على» recomputes the stored days (who left the audience becomes absent, who joined becomes a holiday); a rename keeps it; bad targets are rejected with nothing written",
        "ms": 1820.6584,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-05: holiday-work orders — a targeted-holiday date is accepted when a targeted employee has the day off and rejected when nobody targeted does",
        "ms": 418.9265,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-06: lists — managers see every holiday with its audience; an employee sees everyone-holidays and his own targeted ones only, without anyone else's ids",
        "ms": 80.4741,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-07: a branch-scoped settings account sees targeted holidays of its own branches only — in the holidays list and in the global calendar context — while the fingerprint stays the full one",
        "ms": 64.8575,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-08: an employee who moved to another department keeps his dated department holiday, and a holiday-work order for him that day is accepted (CR7-N01); a colleague never in that department is still rejected",
        "ms": 223.5793,
        "pass": true,
        "skip": false
      },
      {
        "file": "public-holiday-audience.integration.cjs",
        "name": "HA-09: the payroll live schedule evidence of a branch-A employee never carries a holiday targeted to branch B — name, date or branch (CR7-B01); the branch-B employee still sees his own",
        "ms": 103.8542,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-audience-conditions.integration.cjs",
        "name": "AD-01: نوع طلب للسعوديين على عقد محدد المدة — بيظهر ويتقدّم للي ينطبق عليه بس، والعضوية بصفات الموظف دلوقتي",
        "ms": 10608.6954,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-audience-conditions.integration.cjs",
        "name": "AD-02: الحفظ — الشروط بتتدقق، والشكل المتخزّن من غير شروط زي ما هو بالحرف",
        "ms": 245.6442,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-audience-conditions.integration.cjs",
        "name": "AD-03: الدرجة وتاريخ التعيين، وشاشة الخصم بتقرا صفات الموظف لما جمهور النوع فيه شروط",
        "ms": 162.0379,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-audience-conditions.integration.cjs",
        "name": "AD-04: أول تقديم لمسودة بيتحكم بجمهور النوع دلوقتي — والنيابة زي الإنشاء، والمرجّع للاستكمال بيكمّل، والشرط التالف بيقفل",
        "ms": 785.1679,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-01: من غير أي ربط — كل فئة من غير سلسلة، وكل نوع على سلسلته، والباب المالي «ثابت» بسببه",
        "ms": 9204.4596,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-02: ربط الإجازات بسلسلة موجودة ينقل المختارين بس — والتالت بيفضل على سلسلته",
        "ms": 57.588,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-03: الحضور على نفس سلسلة الإجازات — «مشتركة مع» في الخريطة",
        "ms": 27.335,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ",
        "ms": 420.391,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين",
        "ms": 364.7114,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة",
        "ms": 114.1613,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)",
        "ms": 100.9582,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك",
        "ms": 170.537,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-09: الرفض — سلسلة فرع أو معطّلة أو فاضية، نوع من فئة تانية، الباب المالي، الإضافي على سلسلة بلا معتمدين، وطلب ناقص",
        "ms": 181.1028,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه",
        "ms": 173.8991,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس",
        "ms": 21.3819,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-category-chains.integration.cjs",
        "name": "RC-12: ربط الفئة مايتكتبش من إعدادات النظام العامة، وسلسلة الفئة ماتتنقلش لفرع حتى لو مفيش نوع عليها",
        "ms": 92.8577,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
        "ms": 9017.4079,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "future title changes wait for their effective date and scheduled execution is idempotent",
        "ms": 145.0228,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
        "ms": 207.2777,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
        "ms": 137.7624,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
        "ms": 993.4151,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
        "ms": 197.7347,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "a failure after both shift writes rolls back overrides and audit rows together",
        "ms": 109.9117,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
        "ms": 281.0636,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
        "ms": 216.1945,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
        "ms": 253.5422,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "new handlers reject incompatible request codes instead of silently completing",
        "ms": 0.4363,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
        "ms": 177.0478,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
        "ms": 67.504,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
        "ms": 153.1734,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
        "ms": 125.5021,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
        "ms": 50.9074,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "custody transfer enforces the officer branch and request owner before any write",
        "ms": 221.3825,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "forged attachment references are also rejected when saving drafts",
        "ms": 57.2905,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
        "ms": 316.4112,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "concurrent cancellation of the same leave restores its balance only once",
        "ms": 118.0997,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
        "ms": 146.6034,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
        "ms": 1394.4432,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
        "ms": 211.8998,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
        "ms": 270.5242,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
        "ms": 515.7803,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
        "ms": 69.2835,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
        "ms": 142.9257,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
        "ms": 95.3949,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
        "ms": 238.0776,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
        "ms": 340.7228,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
        "ms": 287.971,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
        "ms": 95.8858,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
        "ms": 108.775,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
        "ms": 208.2612,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
        "ms": 83.4444,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
        "ms": 174.4922,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
        "ms": 96.259,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
        "ms": 160.8556,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
        "ms": 92.543,
        "pass": true,
        "skip": false
      },
      {
        "file": "request-execution.integration.cjs",
        "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
        "ms": 139.0366,
        "pass": true,
        "skip": false
      },
      {
        "file": "swap-consents.integration.cjs",
        "name": "SW-01: الميزة مقفولة افتراضيًا = التبديل زي الأول بالحرف (اعتماد المدير كفاية ومن غير صف موافقة)؛ وقبل ترحيل 166 الشاشة بتقول ناقص؛ والترحيل بشكل الكيان وبيتكرر",
        "ms": 10764.1756,
        "pass": true,
        "skip": false
      },
      {
        "file": "swap-consents.integration.cjs",
        "name": "SW-02: الميزة مفتوحة — التقديم بيسجّل موافقة «مستني» للطرف التاني، والتنفيذ بيقف لحد ما يوافق؛ والرفض بيوقّفه؛ والقرار لصاحبه بس ومرة واحدة",
        "ms": 631.7162,
        "pass": true,
        "skip": false
      },
      {
        "file": "swap-consents.integration.cjs",
        "name": "SW-03: الطرف التاني اتغيّر عند إعادة التقديم = الموافقة للطرف الجديد؛ وطلب اترفض مايتسجّلش عليه قرار؛ وموافقة لطرف قديم ماتنفّذش تبديل مع غيره",
        "ms": 946.9463,
        "pass": true,
        "skip": false
      },
      {
        "file": "swap-consents.integration.cjs",
        "name": "SW-04 (Codex P5A-B07): حالة الميزة جوه معاملة تقديم التبديل بتتقري بمدير المعاملة — قارئ المخزن مابيتناداش، والذاكرة المؤقتة مش شرط، والميزة مقفولة أو مفتوحة",
        "ms": 328.952,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p5c-decision-race.integration.cjs",
        "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
        "ms": 8095.6755,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p5c-decision-race.integration.cjs",
        "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
        "ms": 74.3134,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p5c-decision-race.integration.cjs",
        "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
        "ms": 70.51,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p5c-decision-race.integration.cjs",
        "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
        "ms": 70.8784,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p5c-decision-race.integration.cjs",
        "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
        "ms": 52.7184,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p5c-decision-race.integration.cjs",
        "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
        "ms": 66.7491,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p5c-decision-race.integration.cjs",
        "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
        "ms": 36.0121,
        "pass": true,
        "skip": false
      },
      {
        "file": "codex-review-p5c-decision-race.integration.cjs",
        "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
        "ms": 38.996,
        "pass": true,
        "skip": false
      }
    ],
    "adaptation": "Only disposable database name changed in an untracked P5C copy; original harness rejected eight tests before database creation."
  },
  "independent": [
    {
      "id": "P5C-E01",
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E01: first expense submission without a human approval is rejected",
      "ms": 8905.8472,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-independent.cjs"
    },
    {
      "id": "P5C-E02",
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E02: return invalidates old approval; a fresh review posts the revised amount once",
      "ms": 422.4239,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-independent.cjs"
    },
    {
      "id": "P5C-E04",
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E04: conditional steps disappearing cannot reuse an approval before return",
      "ms": 254.6055,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-independent.cjs"
    },
    {
      "id": "P5C-E05",
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E05: authorized human HR on-behalf submission succeeds",
      "ms": 165.0058,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-independent.cjs"
    },
    {
      "id": "P5C-E06",
      "file": "codex-review-p5c-expenses.integration.cjs",
      "name": "P5C-E06: custom expense and travel handlers cannot bypass first human approval",
      "ms": 178.572,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-independent.cjs"
    },
    {
      "id": "P5C-E03",
      "file": "codex-review-p5c-expense-pool.integration.cjs",
      "name": "P5C-E03: ten expense submissions succeed with all pool connections held",
      "ms": 9350.4241,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-extended.cjs"
    },
    {
      "id": "P5C-S01",
      "file": "codex-review-p5c-schedule.integration.cjs",
      "name": "P5C-S01: ten submissions finish with a full pool and transaction-local feature reads",
      "ms": 9672.8575,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-independent.cjs"
    },
    {
      "id": "P5C-S02",
      "file": "codex-review-p5c-schedule.integration.cjs",
      "name": "P5C-S02: missing 076 tables preserves default shift submission",
      "ms": 234.4382,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-independent.cjs"
    },
    {
      "id": "P5C-E10",
      "file": "codex-review-p5c-expense-pool.integration.cjs",
      "name": "P5C-E10: ten expense submissions succeed including audience reads with all pool connections held",
      "ms": 876.3854,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-extended.cjs"
    },
    {
      "id": "P5C-M01",
      "file": "codex-review-p5c-module-parity.integration.cjs",
      "name": "P5C-M01: transaction reader matches cached reader for audiences, privileges, dependencies and disabled modules",
      "ms": 8983.034,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-extended.cjs"
    },
    {
      "id": "P5C-M02",
      "file": "codex-review-p5c-module-parity.integration.cjs",
      "name": "P5C-M02: employee location and organization reads use the transaction connection and see its writes",
      "ms": 78.9863,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-extended.cjs"
    },
    {
      "id": "P5C-M03",
      "file": "codex-review-p5c-module-parity.integration.cjs",
      "name": "P5C-M03: draft submit enforces module audience after cached admission changes",
      "ms": 298.9075,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-extended.cjs"
    },
    {
      "id": "P5C-M04",
      "file": "codex-review-p5c-module-parity.integration.cjs",
      "name": "P5C-M04: both missing 076 tables match defaults in the same transaction; new expense feature stays closed",
      "ms": 199.1696,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-extended.cjs"
    },
    {
      "id": "P5C-E07",
      "file": "codex-review-p5c-extended.integration.cjs",
      "name": "P5C-E07: custom expense and travel destinations need approval after each return; retries do not duplicate effects",
      "ms": 8977.1526,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-money-controls.cjs"
    },
    {
      "id": "P5C-E08",
      "file": "codex-review-p5c-extended.integration.cjs",
      "name": "P5C-E08: non-HR creator on behalf cannot approve their own creation",
      "ms": 139.1756,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-money-controls.cjs"
    },
    {
      "id": "P5C-E11",
      "file": "codex-review-p5c-receipt-pool.integration.cjs",
      "name": "P5C-E11: receipt-bearing expense resubmissions still exhaust the connection pool",
      "ms": 11839.959,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-receipt-final.cjs"
    },
    {
      "id": "P5C-E12",
      "file": "codex-review-p5c-receipt-pool.integration.cjs",
      "name": "P5C-E12: receipt-free resubmissions succeed under the same barrier and full pool",
      "ms": 1171.6024,
      "pass": true,
      "skip": false,
      "source": "codex-review-p5c-results-receipt-final.cjs"
    }
  ],
  "units": {
    "tests": 73,
    "failed": 0,
    "passed": 73,
    "cancelled": 0,
    "skipped": 0,
    "todo": 0,
    "topLevel": 73,
    "suites": 0
  },
  "static": [
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
}
