module.exports = {
  "summary": {
    "success": false,
    "counts": {
      "tests": 2257,
      "failed": 1,
      "passed": 2256,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2257,
      "suites": 0
    },
    "duration_ms": 148573.542
  },
  "files": 262,
  "failures": [
    {
      "file": "db-migrate.test.cjs",
      "name": "freeze backup: a new COPY_ONLY CHECKSUM backup is copied outside the volume, verified, and becomes stale after the next write",
      "error": "ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_migrate_test_65a59d2370ee81fd_freeze_20261008192236_228ad02b.bak' -> 'C:\\Users\\Kareem\\AppData\\Local\\Temp\\hr-freeze-test-VG96ZZ\\hr_migrate_test_65a59d2370ee81fd_freeze_20261008192236_228ad02b.bak'"
    }
  ],
  "results": [
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-01: «مدير الإدارة» في محرر السلاسل بعد «مدير القسم» بوصفه، ومش جهة تصعيد، وبتسميته في الصناديق التلاتة"
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-02: اختيارات الأب بقواعد الخادم، وتغيير النوع أو الفرع بيشيل الأب اللي مابقاش يصلح"
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-03: «الإدارة ← القسم» واختيارات القسم المجمّعة بالإدارة، وفلتر الإدارة بأقسامها جوه فرعها"
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-04: الهيكل التنظيمي بشارة «إدارة» من نوع الوحدة (والقديم زي الأول)، وبطاقة صاحب الطلب بـ«الإدارة» ومحجوبة مع orgHidden"
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-05: الشاشات متوصلة — «الإدارات والأقسام» والنوع والأب والشجرة، ونموذج الموظف وقايمته وملفه وملفي"
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-01: title, body, dates, the audience text and its branch scope, and when an announcement is live"
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-02: the module, its permission, guarded routes, writes under the row lock, and the «new announcement» event judged at dispatch, at send and in the list"
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-03: the announcements screen — the board for everyone, management for the permission holder, the sidebar item and the page title"
    },
    {
      "file": "announcements.test.cjs",
      "name": "AU-04: the attachment is bound once under the row lock and read by the announcement's rule; occasions give the next day without the birth year"
    },
    {
      "file": "api-network-error-ui.test.cjs",
      "name": "a dropped connection becomes ApiError with status 0 and an Arabic message; an abort is passed through"
    },
    {
      "file": "api-network-error-ui.test.cjs",
      "name": "network, timeout, server and non-API errors are uncertain saves; client errors are not"
    },
    {
      "file": "api-network-error-ui.test.cjs",
      "name": "document issue page keeps the retry lock for any uncertain error, including status 0"
    },
    {
      "file": "approval-chain-holders.test.cjs",
      "name": "CH-01: حامل الخطوة الوظيفية = نفس حكم satisfies بالحرف لكل دور وصلاحية (من غير مدير النظام ولا مخرج الموارد البشرية)"
    },
    {
      "file": "approval-chain-holders.test.cjs",
      "name": "CH-02: السلسلة العامة على الفروع الشغالة اللي مالهاش نسخة، ونسخة الفرع على فرعها، والمعطّلة والفرع المقفول مالهمش تحذير"
    },
    {
      "file": "approval-chain-holders.test.cjs",
      "name": "CH-03: حساب على مستوى الشركة بيغطي كل الفروع، والنطاق الفاضي مابيغطيش حاجة، وتعطيل نسخة الفرع بيرجّع الفرع للعامة"
    },
    {
      "file": "approval-chain-holders.test.cjs",
      "name": "CH-04: القارئ بيشوف فروع نطاقه بس — فرع برّه نطاقه مايتذكرش، والسلسلة اللي كل ثغراتها برّه نطاقه من غير تحذير"
    },
    {
      "file": "approval-chain-holders.test.cjs",
      "name": "CH-05: الواجهة بتعرض التحذير في كارت السلسلة، والرد بيرجّع holderGaps، وصلاحيات الحسابات من نفس حساب التوكن"
    },
    {
      "file": "approval-chain-holders.test.cjs",
      "name": "CH-06 (D12): كشف «المدير المسجل غير قائد الفريق» في شاشة الفرق — الاسم والمخفي والمحذوف، والعدّاد مابيعدّش القائد نفسه"
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-01: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، ونص «بالنيابة عن»"
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-02: القاعدة في مكان واحد — المعتمد المسمّى أو بديله، للأدوار الهيكلية بس، وللخطوة المسموح تتفوّض"
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-03: قسم «تفويض اعتماداتي» وشارة الصندوق وسطر السجل"
    },
    {
      "file": "approval-delegations-ui.test.cjs",
      "name": "DGU-04: محرر السلسلة — خانة «مسموح تتفوّض» للأدوار الهيكلية، وبتتبعت لما تتقفل بس"
    },
    {
      "file": "assets-branch.test.cjs",
      "name": "الرؤية والكتابة بناتج branchScopeOf: null = كل الفروع، فرع أو أكتر = أصولها + القديم قراءة بس، والنطاق الفاضي مايشوفش حاجة"
    },
    {
      "file": "assets-branch.test.cjs",
      "name": "العهدة جوه الفرع الواحد، والنقل بين فرعين لحساب نطاقه كل الفروع بس — الحكم على قيمة النطاق مش على اسم الدور"
    },
    {
      "file": "assets-branch.test.cjs",
      "name": "الترحيل 065: إضافي، محروس، أكواده فريدة، واسم الفهرس هو اللي TypeORM بيولّده من الكيان"
    },
    {
      "file": "assets-branch.test.cjs",
      "name": "الربط: مسارات الأصول بصلاحية العهد وبتقرا النطاق، و«المتاح» مقسوم على الفرع، والتنشيط بيختم الأصل بفرع حامله"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "public holiday takes precedence over working exceptions and preserves country/global matching"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "branch exceptions apply after global exceptions and ID order decides within each scope"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "occurrence evaluation covers first through fourth and last including a fifth occurrence"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "calendar selection uses the effective date and latest same-day version rather than the latest stored data"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "strict reads never promote legacy baselines or current-only configuration into dated evidence"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "strict employee day carries all dated scope and assignment references without inferring shift timings"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "employee organization follows its dated branch and country rather than the current profile"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "future global and branch weekend edits leave historical working dates unchanged"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "explicit employee work schedule overrides branch weekend while an unassigned default schedule never does"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "work schedule assignment and its weekend definition each resolve per date"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "unknown historical employee assignment does not assume the current null schedule proves inherited weekend"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "legacy missing global setting has an explicit compatibility fallback but never a strict financial default"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "strict calendar rejects current source drift; runtime preserves dated data and reports the conflict"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "an unrelated legacy assignment cannot manufacture weekend defaults for a dated but incomplete global calendar"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "raw attendance assignment corruption, scope mismatch, duplicate versions and overlong JSON fail closed"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "bounded source loading never silently truncates assignment history"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "per-read cache shares source reads across dates but cannot cross managers or retained transactions"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "actual employee working-range method uses each dated calendar instead of one current weekend"
    },
    {
      "file": "attendance-calendar-resolver.test.cjs",
      "name": "invalid identity/date and missing employee never become a working day"
    },
    {
      "file": "attendance-exemption-migration.test.cjs",
      "name": "EX-09 SQL003 contains only new tables/indexes and a later DDL failure rolls back everything"
    },
    {
      "file": "attendance-exemption-migration.test.cjs",
      "name": "EX-09 SQL003 matches all entity metadata, preserves old bytes and uses pending/null policy defaults"
    },
    {
      "file": "attendance-exemption-migration.test.cjs",
      "name": "EX-13 SQL resolver loads approved historical windows without restoring exemption on the termination date"
    },
    {
      "file": "attendance-exemption-migration.test.cjs",
      "name": "EX-09 SQL resolver rejects a one-day approved overlap and permits a replacement from the termination date"
    },
    {
      "file": "attendance-exemption-migration.test.cjs",
      "name": "EX-09 SQL003 replay preserves decisions, historical termination, audit payloads and original data"
    },
    {
      "file": "attendance-exemption-resolver.test.cjs",
      "name": "EX-13: a partial period evaluates every day and an open end continues beyond month boundaries"
    },
    {
      "file": "attendance-exemption-resolver.test.cjs",
      "name": "EX-13: effectiveFrom and effectiveTo are inclusive, including a one-day leap-day window"
    },
    {
      "file": "attendance-exemption-resolver.test.cjs",
      "name": "EX-13: termination preserves earlier approved days and restores attendance from terminatedFrom itself"
    },
    {
      "file": "attendance-exemption-resolver.test.cjs",
      "name": "EX-09: pending, rejected and cancelled decisions never make a day exempt"
    },
    {
      "file": "attendance-exemption-resolver.test.cjs",
      "name": "EX-09: overlapping approved windows fail closed, but consecutive windows can meet at a termination boundary"
    },
    {
      "file": "attendance-exemption-resolver.test.cjs",
      "name": "أ7: المستثنى من البصمة بلا خصومات إطلاقًا وبلا إضافي بالقيم الافتراضية؛ والتجاوز الفردي قرار صريح"
    },
    {
      "file": "attendance-exemption-resolver.test.cjs",
      "name": "EX-13: exemption defaults do not change ordinary days or rewrite an earlier resolved policy snapshot"
    },
    {
      "file": "attendance-exemption-resolver.test.cjs",
      "name": "EX-13: malformed calendar days, reversed windows and invalid default decisions are rejected"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "09:30–18:30 completes the floating day"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "09:30–18:00 is short, not late"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "10:00 is inside the inclusive window"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "10:01 owes lateness even after nine hours"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "10:01–20:00 keeps lateness"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "late plus real shortfall remain separate"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "10:00:59 is outside even though lateness is floored to 60"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "early work is informational by default and can be enabled"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "disabled flexibility still measures shortfall and applies ordinary grace"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "flex window supersedes a larger ordinary grace unless explicitly configured otherwise"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "shortfall tolerance stays out of the quantity calculation"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "missing checkout keeps known lateness, unknown work and shortfall, and a review flag"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "missing checkin does not invent a lateness or duration"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "no punches remains absence, without an invented missing-punch review"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "free permission leaves genuine shortfall after unexcused lateness overlap"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "paid permission keeps one direct charge and a disjoint overlap quantity"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "overlapping free and paid permissions never credit or charge the same minute twice"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "an approved permission inside already counted work cannot erase another shortfall"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "morning half-leave shifts the full inclusive window to 13:30–14:30"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "partial-leave proportional window requires the explicit policy switch"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "night shift keeps its window and floating end on the extended business-day line"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "actual elapsed duration is retained at a DST boundary and requests review"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "invalid enabled window null is never silently defaulted"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "invalid enabled window 0 is never silently defaulted"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "invalid enabled window -1 is never silently defaulted"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "invalid enabled window 60.5 is never silently defaulted"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "invalid enabled window 540 is never silently defaulted"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "interval union does not sum overlapping approval windows"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "«سماحية N د» تظهر في شاشات الحضور حيث تُطبَّق فعلاً (بنفس شرط المحرك)"
    },
    {
      "file": "attendance-flex-calculator.test.cjs",
      "name": "لا مسار ولا زر إعادة حساب ثانٍ، وتجسيد غياب الكشف بصلاحية الإدارة وللفجوات وحدها"
    },
    {
      "file": "attendance-flex-migration.test.cjs",
      "name": "FX SQL004 is additive and rolls back a later DDL failure without touching old source bytes"
    },
    {
      "file": "attendance-flex-migration.test.cjs",
      "name": "FX SQL004 matches TypeORM exactly and preserves legacy NULL rather than inventing a flexible window"
    },
    {
      "file": "attendance-flex-migration.test.cjs",
      "name": "FX09 baseline carries no invented effective date and an earlier day keeps its original version"
    },
    {
      "file": "attendance-flex-migration.test.cjs",
      "name": "FX09 unique source version rejects a duplicate without modifying prior snapshots"
    },
    {
      "file": "attendance-flex-migration.test.cjs",
      "name": "FX SQL004 replay preserves every stored version and old financial bytes"
    },
    {
      "file": "attendance-report-search-ui.test.cjs",
      "name": "searching by employee number keeps that employee in the overtime table"
    },
    {
      "file": "attendance-report-search-ui.test.cjs",
      "name": "name search still works on both tables, including overtime without an attendance row"
    },
    {
      "file": "attendance-report-search-ui.test.cjs",
      "name": "reports page uses the shared filter for both tables"
    },
    {
      "file": "attendance-suspension-overtime-window.test.cjs",
      "name": "قرار الحفظ: يوم الإيقاف بلا بصمة ما يتحفظش غياب، وباقي القواعد زي ما هي"
    },
    {
      "file": "attendance-suspension-overtime-window.test.cjs",
      "name": "computeDay موصول: الإيقاف بيتفحص قبل الحفظ على كل المسارات، والصف القديم بيتمسح والمكتشف القديم يتلغى"
    },
    {
      "file": "attendance-suspension-overtime-window.test.cjs",
      "name": "تجسيد الغياب: الغياب المحفوظ القديم في يوم إيقاف يتعاد حسابه (فيتمسح)، وأيام الإيقاف ما تتعدش غياب"
    },
    {
      "file": "attendance-suspension-overtime-window.test.cjs",
      "name": "الغياب اللحظي للنهارده يتخطى الموقوف عن العمل"
    },
    {
      "file": "attendance-suspension-overtime-window.test.cjs",
      "name": "فرع نسخة EMPLOYEE_ORG"
    },
    {
      "file": "attendance-suspension-overtime-window.test.cjs",
      "name": "أهداف إعادة الحساب: فترة الفرع بتشمل اللي نقل منه (فرع اليوم المحفوظ أو نسخة فرع مؤرخة) لحد النهارده"
    },
    {
      "file": "attendance-suspension-overtime-window.test.cjs",
      "name": "حفظ/إيقاف/حذف فترة فرع بيعيد أيام اللي نقل من الفرع (فرع اليوم ونسخ الفرع المؤرخة، مش الفرع الحالي بس)"
    },
    {
      "file": "audit-ui.test.cjs",
      "name": "AUI-01: فئات الشاشة هي فئات الخادم بنفس أسمائها، وعرض قبل/بعد"
    },
    {
      "file": "audit-ui.test.cjs",
      "name": "AUI-02: تسجيل التصدير في المتصفح بس — downloadCsv بيناديه بعدد الصفوف، وبرّه المتصفح مفيش نداء"
    },
    {
      "file": "audit-ui.test.cjs",
      "name": "AUI-03: الشاشة في القايمة وحراسة المسار بصلاحية «سجل التدقيق»، والجدول والفلاتر والاحتفاظ"
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "تنبيه الصف: طريقة مجهولة، «نقدي + بنك» بلا مبلغ، بنك أو آيبان ناقص، وآيبان مش بالشكل الصحيح"
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "كشف البنوك: التنبيهات مجمَّعة بمبلغها، والصف يفضل في الكشف بمبلغه، والتصفية برّه التنبيهات"
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "مصادر الكشف: الهوية من لقطة العضوية، وبيانات الصرف من ملف الموظف الحالي، وفلترة الفرع، والتصفية"
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "ملخص طرق الصرف = نفس صفوف كشف البنوك: بنك + نقدي لكل طريقة، ومجموعهما = الصافي المستحق"
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "الصافي السالب: الصافي زي ما هو في التقرير (يطابق إجمالي المسير) والمصروف صفر — الحالة الوحيدة اللي التسوية فيها بتختلف"
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "القاعدة بالقرش لكل حالة: بنك = أقل من (مبلغ البنك، الصافي) ونقدي = الباقي، بلا تقريب لأعلى"
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "الربط: تقرير طرق الصرف من نفس مصدر الكشف، والشاشة بتعرض التنبيه والتصفية والقالب بيصدّرهم"
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "تقسيم الصافي: نقدي كله نقدي، تحويل كله بنك، نقدي + بنك = مبلغ البنك والباقي نقدي بالقص"
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "فحص طريقة الصرف: مبلغ البنك > 0 في «نقدي + بنك»، والبنك والآيبان مطلوبان لما البنك داخل، والملف القديم الناقص يتحفظ"
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "كشف البنوك: مبلغ البنك والنقدي لكل موظف، وإجمالي كل بنك، والنقدي الكامل خارج البنوك"
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "كود الموظف: EMP- + 4 أرقام (شكل النظام القديم)، والتالي = أكبر EMP-#### أو EMP#### + 1 مع تجاهل الأكواد الأخرى"
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "الـDTO: كود الموظف مش مدخل في الإضافة ولا التعديل (يتشال)، و«نقدي + بنك» مقبولة بمبلغ موجب"
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "الربط: البصمات برقم البصمة وحده، والتوليد داخل معاملة الإضافة بقفل، والشاشات والترحيل"
    },
    {
      "file": "banks.test.cjs",
      "name": "BKU-01: كود البنك من الآيبان — السعودي رقمين والمصري 4 أرقام بعد خانتي التحقق؛ والآيبان الغلط من غير كود"
    },
    {
      "file": "banks.test.cjs",
      "name": "BKU-02: التنبيه بس لما الجدول فيه بنوك مفعّلة لدولة الآيبان والكود مش منهم"
    },
    {
      "file": "banks.test.cjs",
      "name": "BKU-03: خانات البنك — الدولة والكود عند الإضافة بس، وطول الكود بدولته، والاسم والسويفت والتفعيل"
    },
    {
      "file": "banks.test.cjs",
      "name": "BKU-04: كشف البنك — من غير جدول الصفوف زي الأول بالحرف؛ وبالجدول تنبيه كود البنك بعد تنبيهات الملف القايمة ومن غير تغيير مبلغ"
    },
    {
      "file": "banks.test.cjs",
      "name": "BKU-06: شاشة الصرف — نفس تنبيه كشف البنك بنفس الجدول، ومن غيره الصفوف زي الأول"
    },
    {
      "file": "banks.test.cjs",
      "name": "BKU-05: مصدر الكود — مفيش عمود كود بنك على الموظف، والجدول من غير بذرة، والتنبيه في كشف البنك وشاشة الصرف من نفس القايمة"
    },
    {
      "file": "benefits-insurance.test.cjs",
      "name": "BIU-01: حالة الوثيقة — لسه مابدأتش، سارية، هتنتهي في 60 يوم، انتهت، متعطّلة"
    },
    {
      "file": "benefits-insurance.test.cjs",
      "name": "BIU-02: بيانات الوثيقة والفئة — المطلوب والحدود، والدولة مصر أو السعودية أو فاضية، والحصة من غير تقريب صامت"
    },
    {
      "file": "benefits-insurance.test.cjs",
      "name": "BIU-03: الأهلية — وثيقة دولة الفرع السارية (ثم وثيقة كل الشركة)، والفئة بالدرجة ثم الافتراضية ثم من غير فئة"
    },
    {
      "file": "benefits-insurance.test.cjs",
      "name": "BIU-04: مصدر الكود — الموديول مقفول افتراضيًا بصلاحيته، والكتابة لحساب بكل الفروع تحت قفل صف الوثيقة، ومفيش مسح ولا مبلغ"
    },
    {
      "file": "benefits-members.test.cjs",
      "name": "BMU-01: خطوات الطلب — «اتبعت» من المستني بس، و«تم» و«إلغاء» للمفتوح، والمقفول مالوش خطوة"
    },
    {
      "file": "benefits-members.test.cjs",
      "name": "BMU-02: رد شركة التأمين — تاريخ السريان مطلوب، ورقم البطاقة مطلوب للإضافة بس؛ والسبب بحده"
    },
    {
      "file": "benefits-members.test.cjs",
      "name": "BMU-03: مصدر الكود — كل كتابة تحت قفل صف الموظف ثم الطلب، وبنطاق الحساب، وطلبات الحذف التلقائية بقفل مدى ومن غير مبلغ"
    },
    {
      "file": "benefits-members.test.cjs",
      "name": "BMU-04 (ج): تذاكر السفر ميزة فرعية مقفولة، والاستحقاق عدد صحيح من صفر لـ12؛ وتقرير الحصص قراءة بس"
    },
    {
      "file": "bonus-request-ui.test.cjs",
      "name": "one field-kind map next to the approver labels: dates, payroll months, times and numbers each get their own control"
    },
    {
      "file": "bonus-request-ui.test.cjs",
      "name": "the numeric fields carry a sensible step and minimum instead of a free text box"
    },
    {
      "file": "bonus-request-ui.test.cjs",
      "name": "the requests screen derives every generic control from that one map — it does not guess on its own"
    },
    {
      "file": "bonus-request-ui.test.cjs",
      "name": "holiday work: a from/to range resolves the real holiday days from the same server answer the request is judged by"
    },
    {
      "file": "bonus-request-ui.test.cjs",
      "name": "the value field speaks the bonus type language, and the day step is checked before sending exactly as the server checks it"
    },
    {
      "file": "bonus-request-ui.test.cjs",
      "name": "the requests screen opens the bonus form inline — no navigation, like the deduction card"
    },
    {
      "file": "bonus-request-ui.test.cjs",
      "name": "the bonus form is bound to the bonus catalog: allowed types, server-scoped employees, the type value unit, target month, reason counter, document reference, and a live amount preview"
    },
    {
      "file": "bonus-request-ui.test.cjs",
      "name": "the bonus employee picker is the server's managerial scope only, and the form fails closed when that scope is empty"
    },
    {
      "file": "bonus-request-ui.test.cjs",
      "name": "the bulk path on the payroll bonuses screen is untouched: one screen still proposes a bonus for a whole group"
    },
    {
      "file": "branch-company-definitions.test.cjs",
      "name": "deduction and bonus types: a branch account gets 403 on create/update before any DB access; super_admin passes the guard"
    },
    {
      "file": "branch-company-definitions.test.cjs",
      "name": "shared catalogs: branch account is view-only (403) for every company-wide kind; devices keep their own branch check"
    },
    {
      "file": "branch-company-definitions.test.cjs",
      "name": "auto chain for a branch-only request type is saved on the same branch, and the lookup never reuses another scope"
    },
    {
      "file": "branch-company-definitions.test.cjs",
      "name": "linking an existing chain: a branch account cannot link another branch chain, and a type cannot use a chain from a different branch"
    },
    {
      "file": "branch-company-definitions.test.cjs",
      "name": "chain list: another branch never sees a chain made for a branch-only type (even a legacy null-branch row) nor its type name"
    },
    {
      "file": "branch-company-settings.test.cjs",
      "name": "company-wide write: only an account with no branch scope passes"
    },
    {
      "file": "branch-company-settings.test.cjs",
      "name": "company-wide settings endpoints call the guard before writing"
    },
    {
      "file": "branch-company-settings.test.cjs",
      "name": "deductions and bonuses: a branch account gets no creator basis and no candidate outside its branch"
    },
    {
      "file": "branch-company-settings.test.cjs",
      "name": "submit refuses a non-positive money amount and a bad punch correction date/time"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "old audience shapes keep working exactly as before (all / departments / roles / employees / positions / broken JSON)"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "who + where: «department managers in branch 2 only» needs both the position and the branch"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "where = specific teams: only members of the chosen teams, combined with who; old shapes untouched"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "owner bypass at both doors; the type builder sees every type in the catalog but submits under the audience"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "the subject carries branch and department: the employee record first, then the account branch"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "branch definitions: company-wide rows are available everywhere, branch rows only inside their branch"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "lists: a branch account sees company-wide + its branch; the company account sees all, or company + one branch"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "create: branch account = its branch automatically; company account chooses company or an existing active branch"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "edit: branch account edits its own branch rows only; company rows need a company account; branch is fixed after creation"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "wiring: every door asks the same helpers (settings, request catalog + submit, leave submit, money screens, shifts/schedules, assignment)"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "migration 043: additive, re-runnable, nullable branch column on the four definition tables"
    },
    {
      "file": "branch-definitions.test.cjs",
      "name": "screens: «يظهر لـ…» on every request type card, a clear who/where section, and «متاح في» on the four definition screens"
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "candidates: a branch user lists only his branch (and unassigned), creates into his branch, and cannot edit another branch"
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions run screen: a run with no member in the user branch is out of scope (snapshot or legacy branch)"
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "financial exemptions service wires the run scope gate into runView and candidates, and filters recalc ids by branch"
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a branch-scoped call touches only that branch employees; null keeps the company-wide job"
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "leave balance rollover: a multi-branch scope touches exactly those branches"
    },
    {
      "file": "branch-separation.test.cjs",
      "name": "payroll draft calculate / recalculate check the run branch scope before revealing its status"
    },
    {
      "file": "branding-ui.test.cjs",
      "name": "BR-UI-01: اسم المنتج ثابت، والحدث باسم ثابت، والعلامة البديلة بحرف الشركة المميز (مش «شركة») أو حرفين للاتيني"
    },
    {
      "file": "branding-ui.test.cjs",
      "name": "BR-UI-02: fetchBranding بيقص الاسم، وبيحوّل مسار الشعار لرابط على الـAPI نفسه، ومايقبلش رابط من برّه"
    },
    {
      "file": "branding-ui.test.cjs",
      "name": "BR-UI-03: صفحة الدخول بتترسم على الخادم بالنصّين: هيكل مكان الاسم (مفيش اسم احتياطي يومض)، والنقشة والكروت و«بواسطة Logic Leap HR»"
    },
    {
      "file": "branding-ui.test.cjs",
      "name": "BR-UI-04: القائمة الجانبية: هوية الشركة فوق (والطويل على سطرين بتلميح) و«بواسطة» تحت؛ والعنوان والتبويب باسم المنتج"
    },
    {
      "file": "branding-ui.test.cjs",
      "name": "BR-UI-05: حفظ الاسم أو الشعار في «بيانات الشركة» بيبعت الحدث (حتى لو الحفظ وقف بعدهم)، والهوية بتعيد الجلب عليه"
    },
    {
      "file": "branding-ui.test.cjs",
      "name": "BR-UI-06: الحركة كلها ll-* جوّه prefers-reduced-motion: no-preference، ومفيش صورة ولا أصل خارجي"
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-01: phone, e-mail and id normalisation, and the typed id and source"
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-02: adding and applying run under the job row lock with the judgment after it, and the routes are guarded"
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-03: public applications — applicant values and consent, the attempt limiter, a closed feature without a session guard on purpose"
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-04: stage moves — values, rows locked in id order, the stage column only, and the standing edit goes through the same place"
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-05: interviews — values, the invite file, the judgment order in scheduling and submitting, and the routes"
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-06: offers — values, the token hash, who may do what, transitions under the offer row lock, and the public answer link"
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-07: hiring from an offer — the job closes under its row lock when its openings are filled, after the hire is recorded"
    },
    {
      "file": "candidate-applications.test.cjs",
      "name": "CU-08: recruitment numbers — day differences and averages, behind the recruitment permission and the branch scope"
    },
    {
      "file": "candidate-hire-required.test.cjs",
      "name": "POST /candidates/:id/hire بيتحقق من نفس الحقول الإجبارية بتاعة إضافة الموظف"
    },
    {
      "file": "candidate-hire-required.test.cjs",
      "name": "الخدمة نفسها بتفرض الحقول الإجبارية وشكلها على أي مسار إنشاء، قبل أي قراءة أو كتابة"
    },
    {
      "file": "candidate-hire-required.test.cjs",
      "name": "التعيين بيبعت بيانات النموذج كاملة للخدمة بنطاق فرع المستخدم، وبيقفل المرشح؛ والفرع التاني ممنوع"
    },
    {
      "file": "candidate-hire-required.test.cjs",
      "name": "شاشة التعيين: نموذج الإضافة متعبّي من المرشح (الاسم غير العربي في خانات الإنجليزي)، وشاشتا التوظيف بتفتحه"
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-11: case values, the objection window from its setting, and the conflict of interest"
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-12: a new closed module with its permission and request destination, access by case membership under the row lock, the conflict judged inside the transaction, the decision conditions, the objection, and the routes"
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-13: case attachments by membership (upload, one-time conditional attach under the case lock, download by the case rule) and the real screens"
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-14: the penalties catalog steps, the step for a repetition, the counting window, and applying under the employee row lock with the deduction created through the typed-deductions service outside the transaction"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-01: مدخل التعليق — النص بحده بعد توحيد نهايات السطور، و«داخلي» قيمة منطقية، والأرقام صالحة ومن غير تكرار وبحدودها"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-02: الإشارة لأدوار الكيان نفسه بس — دور كيان تاني أو اسم مش معروف مرفوض"
    },
    {
      "file": "comments-rules.test.cjs",
      "name": "CK-03: الإشارات المخزّنة — من غير إشارات مابيتخزنش حاجة، وأي شكل غير متوقع بيتقري «من غير إشارات»"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-01: عميل الـAPI على مسارات الخادم نفسها وبحدوده، والمسارات الأربعة بموديول كيانها ومن غير صلاحية خاصة"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-02: مكوّن الحوار — مابيعرضش حاجة قبل الترحيل، وضغطتين تعليق واحد، والداخلي مايشاورش لصاحب الطلب ولا تعليق ظاهر يرد على داخلي"
    },
    {
      "file": "comments-ui.test.cjs",
      "name": "CU-03: الحوار في تفاصيل الطلب (الشاشات التلاتة) وفي كارت المهمة العادية بس، ولينك الإشعار بيفتح الموضوع"
    },
    {
      "file": "compensation-cycles.test.cjs",
      "name": "CCU-01: مبلغ الزيادة — رقم من صفر بمنزلتين بالكتير ومن غير تقريب صامت؛ والملاحظة بحدها وسبب التعديل مطلوب"
    },
    {
      "file": "compensation-cycles.test.cjs",
      "name": "CCU-02: الدورة — الاسم والشهر، وخطواتها من حالة لحالة، والمدير بيقترح والدورة مفتوحة بس"
    },
    {
      "file": "compensation-cycles.test.cjs",
      "name": "CCU-03: الميزانية — الباقي و«عدّت» (تحذير)، وميزانية الوحدة بتغطي اللي تحتها"
    },
    {
      "file": "compensation-cycles.test.cjs",
      "name": "CCU-04: مصدر الكود — مفيش راتب بيتكتب، والكتابة تحت قفل الدورة ثم الموظف، وورقة المدير من غير أرقام راتب، والصلاحيات"
    },
    {
      "file": "compensation-cycles.test.cjs",
      "name": "CCU-05: الاعتماد من حد ماقترحش، والأساسي الجديد بالقروش، ومرجع الدورة، وترتيب أقفال التطبيق"
    },
    {
      "file": "cost-center-report.test.cjs",
      "name": "money: cents cut (no rounding) and text with 2 decimals"
    },
    {
      "file": "cost-center-report.test.cjs",
      "name": "groups by cost center: headcount distinct, gross/deductions/net summed, no-center last"
    },
    {
      "file": "cost-center-report.test.cjs",
      "name": "employer insurance is null everywhere when the insurance source is not available"
    },
    {
      "file": "cost-center-report.test.cjs",
      "name": "company profile validation: IBAN SA/EG, email, unified number, dates, digits; empty always allowed"
    },
    {
      "file": "cost-center-report.test.cjs",
      "name": "PATCH /settings/config runs the company profile check, seed + migration 051 create every new key"
    },
    {
      "file": "cost-center-report.test.cjs",
      "name": "cost center endpoint: branch scoped, payroll.view required, registered in AppModule"
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "currency.ts: مفيش بوابة settings.manage ولا قراءة إعدادات ولا «ر.س» افتراضي — السياق من /settings/currency-context"
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "القاعدة المشتركة مع الخادم: مصر جنيه، السعودية ريال، ومن غير دولة (أو رمز قديم) عملة النظام"
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "عملة الشاشة: الفرع المحدد بعملته؛ من غير فرع — الموظف بعملة فرعه، والإداري بفرعه الوحيد أو العملة المشتركة وإلا عملة النظام"
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "السياق بيتقري لموظف من غير أي صلاحية، ويتخزن للجلسة بحسابه، ويتمسح بـ invalidateCurrency"
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "نموذج الموظف: من غير اختيار عملة — سطر قراءة «العملة: … (حسب الفرع)» والعملة مابتتبعتش في الإضافة"
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "معادلات الرواتب: من غير اختيار عملة — الخادم بيحطها عند الحفظ"
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "شاشة الفروع: «دولة الفرع» مصر/السعودية بعملتها، وتأمينات دولتها بس، وتنبيه للفرع المختلف، ومسح كاش العملة بعد الحفظ"
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "الشاشات الخاصة بموظف بتاخد عملة فرعه (مش العمود المحفوظ في ملفه)"
    },
    {
      "file": "currency-totals.test.cjs",
      "name": "التقسيم بالعملة: ترتيب ثابت ومن غير مجموعات فاضية، وإجمالي كل عملة بنفس دالة الإجمالي، ومجموعهم = الإجمالي العام"
    },
    {
      "file": "currency-totals.test.cjs",
      "name": "عرض الإجمالي: عملة واحدة = المبلغ بعلامته، عملتين = لكل عملة سطرها؛ وسطور الإجمالي لكل عملة فاضية لعملة واحدة"
    },
    {
      "file": "currency-totals.test.cjs",
      "name": "تقرير المسيرات: صافي المسيرات لكل عملة، والتصدير عمود عملة لعملة واحدة وعمود صافي لكل عملة لعملتين"
    },
    {
      "file": "currency-totals.test.cjs",
      "name": "الصرف: كروت لكل عملة، وملخص الشهر سطر لكل مسير في كل عملة وإجمالي لكل عملة، والتصدير سطرين لكل عملة؛ عملة واحدة = نفس الشكل القديم بالحرف"
    },
    {
      "file": "currency-totals.test.cjs",
      "name": "التأمينات: فلتر الفرع ← الإدارة بيعيد الإجمالي لكل عملة من نفس الصفوف المتفلترة"
    },
    {
      "file": "currency-totals.test.cjs",
      "name": "الشاشات: كل تقرير بيجمع فروع بيعرض إجمالي لكل عملة، والمحررات بتقول إن الحد بيتقري بعملة فرع الموظف، وشاشات «ملفي» بعملة الحساب نفسه"
    },
    {
      "file": "currency-totals.test.cjs",
      "name": "مراجعة المعتمد: إجماليات لكل عملة بعنوانها، وعملة واحدة = نفس الكروت القديمة، و«بانتظار اعتمادي» بصافي كل عملة"
    },
    {
      "file": "data-protection.test.cjs",
      "name": "DPU-01: موعد الإخطار = الاكتشاف + 72 ساعة؛ والساعات الباقية والتأخير للحادثة اللي لسه مااتبلّغتش بس"
    },
    {
      "file": "data-protection.test.cjs",
      "name": "DPU-02: خانات الحادثة — العنوان ووقت الاكتشاف (مش في المستقبل) وعدد المتأثرين، وملاحظة الإخطار مطلوبة"
    },
    {
      "file": "data-protection.test.cjs",
      "name": "DPU-03: مدد الاحتفاظ — فاضي أو صفر أو غلط = من غير مدة (الافتراضي)، وحد التاريخ = النهارده ناقص الشهور"
    },
    {
      "file": "data-protection.test.cjs",
      "name": "DPU-04: مصدر الكود — مفيش مسح، ولحساب بكل الفروع بصلاحية الإعدادات، ومهمة يومية بتعمل مهام مراجعة بس"
    },
    {
      "file": "db-b4-lateness-tier-conversion.test.cjs",
      "name": "028 converts the active legacy tiers (inclusive bounds, day fractions) into one dated set with a verified content hash; inactive rows are not converted"
    },
    {
      "file": "db-b4-lateness-tier-conversion.test.cjs",
      "name": "028 is re-runnable, maps MINUTES and zero fractions faithfully, and stops (instead of silently trimming) when active legacy tiers overlap"
    },
    {
      "file": "db-dated-calendar-versions.test.cjs",
      "name": "cycleStart: the payroll cycle containing a date, wrapping to the previous month and year"
    },
    {
      "file": "db-dated-calendar-versions.test.cjs",
      "name": "first run: dated versions from the start of the earliest recorded payroll cycle; employees without a branch are reported, not invented"
    },
    {
      "file": "db-dated-calendar-versions.test.cjs",
      "name": "strict calendar resolution works from the effective date and still reports missing versions before it"
    },
    {
      "file": "db-dated-calendar-versions.test.cjs",
      "name": "second run skips every source that already has versions and reports the same unresolved employee"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "GO splits batches only on standalone lines outside strings and block comments"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "legacy payroll 001-012 files run statement by statement (as their original runner did); new files use GO batches"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "static guard rejects destructive statements, including split dynamic SQL, and accepts value-preserving ones"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "script migrations (.cjs) are scanned before connecting: row deletes, destructive QueryRunner calls, transaction control and SQL literals"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "column changes: widening passes; narrowing, lossy type changes and collation changes are refused"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "THROW codes must be unique across files"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "repository migrations: pre-payroll 001-007 then payroll 001-012 in name order, no problems, duplicate file superseded"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "target guard: company database needs --company, review and arbitrary databases are refused"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "company mode stops before any connection when the given backup or the pre-payroll baseline file is missing"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "backup freshness: a backup is a rollback point only if no migration, write or server restart happened after it"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "trial transaction runs every pending file then rolls everything back on failure"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "each file commits in its own transaction; a failing file rolls back alone and stops the run"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "script migrations run inside the ledger; replays skip; changed applied files and destructive new files are refused"
    },
    {
      "file": "db-migrate.test.cjs",
      "name": "runtime guard: files that pass the text scan but delete, narrow, drop, disable or turn XACT_ABORT off are rolled back and not recorded"
    },
    {
      "file": "deduction-request-ui.test.cjs",
      "name": "the value field speaks the type language: fixed amount, a fraction of a day, hours, or a percentage"
    },
    {
      "file": "deduction-request-ui.test.cjs",
      "name": "the quarter-day step is checked before sending, exactly as the server checks it (DEDUCTION_STEP_INVALID)"
    },
    {
      "file": "deduction-request-ui.test.cjs",
      "name": "the same input check as the payroll screen: type, positive value, reason length, target payroll month, required attachment"
    },
    {
      "file": "deduction-request-ui.test.cjs",
      "name": "the requests screen opens the deduction form inline — no navigation, and the generic engine fields stay out of its way"
    },
    {
      "file": "deduction-request-ui.test.cjs",
      "name": "the form is bound to the deduction catalog: allowed types, the type value unit, target month, reason counter, attachment, instalments, and a live amount preview"
    },
    {
      "file": "deduction-request-ui.test.cjs",
      "name": "the bulk path on the payroll deductions screen is untouched: one screen still applies a deduction to a whole group"
    },
    {
      "file": "dependents.test.cjs",
      "name": "DU-01: values for adding and for editing, the removal reason, and the request form fields"
    },
    {
      "file": "dependents.test.cjs",
      "name": "DU-02: a new closed module in the basic preset with its request handler, writes under the employee row lock then the dependent row, the request destination wiring, the seed untouched, and the card"
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-01: قاعدة الصرف المسجل — علامة «تم الصرف» ثم «لم يتم» ثم مسير مصروف بلا علامات ثم مسير لسه ما اتصرفش"
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-02: كشف البنوك بعد تغيير طريقة الصرف — البند المصروف نقدي يفضل نقدي، واللي بلا علامة يتبع ملف الموظف"
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-03: التلات شاشات بنفس الرقم — شاشة الصرف وكشف البنوك والتقرير المالي، والتسوية بنك + نقدي + تصفية = الصافي"
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-04: استعلام التقرير المالي بيقرأ علامة الصرف نفسها (مصدر واحد للتلات شاشات)"
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-07: القسيمة على نفس القاعدة (قرار المالك 24 سبتمبر) — بلا لقطة هوية جديدة وبلا تقسيم تاني"
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-05: تقرير الحضور الشهري بلا كاشف وجود — الموظف الموجود خارج النطاق وغير الموجود نفس الرد"
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-06: أيام عمل الموظف ومعاينة الإضافي — نفس الرد للموظف خارج النطاق وغير الموجود"
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-08: المثبت وقت الصرف يغلب لقطة الحساب، والعلامة تغلبه، والبند القديم بلا تثبيت يفضل على سلوكه"
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-09: الصرف بيثبّت التقسيم على البند قبل ما المسير يبقى PAID، وإقفال موظف بموظف مايثبّتش اللي ما اتصرفلوش"
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-01: alert days are read and entered safely, and a document reaches the nearest alert day"
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-02: the new columns stay outside the entities; alerts run under the document row lock; the task and the notice follow the type"
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-03: the settings sit on the document types screen and the report on the employees documents screen"
    },
    {
      "file": "document-expiry.test.cjs",
      "name": "DE-04: the renewal destination is registered with its own form fields and server-written key"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP1 — المفتاح اسمه auth.domain_autoprovision_enabled وبيتسلّم مفتوح"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP2 — المفتاح الناقص أو الفاضي = مفتوح (الافتراضي)، و«false» وأخواتها بس هي اللي تقفل"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP3 — المفتاح مبذور في configSeed بقيمته الافتراضية، فبيوصل لقاعدة قائمة عند الإقلاع بلا ترحيل"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP4 — كل حالة لها نص عربي، والحالات هي المعلنة بالظبط"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP5 — المشبك بيجري بعد ما معاملة إنشاء الموظف اتثبّتت، ومفيش استثناء بيرجّع الإنشاء"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP6 — موظف واحد بيمرّ على **نفس** خطة المزامنة الجماعية: مفيش مطابقة تانية ومفيش إنشاء تاني"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP7 — زرّ الموظف الواحد محروس زي المزامنة الجماعية: users.manage + نطاق كل الفروع"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP8 — كارت الملف بيتقرا بصلاحية عرض الموظف نفسها، بعزل الفرع، وبلا أي hash"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP9 — كارت «مرتبط بحساب دخول» وزرّ «مزامنة من AD» في ملف الموظف، بعربي RTL زي جيرانه"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP11 — حارس بنيوي: ولا اتصال LDAP حقيقي من أي اختبار، مهما كان api/.env مضبوط على المجال الحيّ"
    },
    {
      "file": "domain-autoprovision.test.cjs",
      "name": "AP10 — مفيش تسجيل لكلمة مرور ولا لكلمة حساب الخدمة في الملفات الجديدة"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "AD1 — المجال مقفول تمامًا بلا AD_HOST، ومفتوح لما يتكتب، وAD_ENABLED=false بيقفله بلا مسح الإعداد"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "AD2 — المنفذ الافتراضي يتبع LDAPS، والقيم التالفة ترجع للافتراضي، واللاحقة بتتنضف من @"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "AD3 — LDAPS مقفول = تحذير إقلاع صريح؛ وشهادة غير متحقَّق منها = تحذير كذلك؛ والآمن بلا تحذير"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "MAIL1 — البريد ناقص بلا SMTP_HOST أو SMTP_FROM، والمنفذ والتشفير بافتراضات معلنة"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "MAIL2 — تقنيع العنوان: الدومين ظاهر والاسم مقنَّع، ومفيش عنوان كامل بيطلع للعميل"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "AD4 — تطبيع اسم الدخول: الاسم بس، DOMAIN\\الاسم، والـUPN الكامل — كلهم لنفس الحساب"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "AD5 — هروب فلتر LDAP: اسم فيه ( أو * أو \\ مايبنيش فلتر تاني"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "AD6 — objectGUID: أول 3 مجموعات little-endian، والباقي كما هو؛ والطول الغلط = null"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "AD7 — بِت الحساب المتوقف (userAccountControl & 2) يُقرأ من رقم أو نص أو مصفوفة"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "SEC1 — مسح الأسرار من نص الخطأ: كلمة المستخدم وكلمة حساب الخدمة مايظهروش"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "SEC2 — كل رسائل رفض المجال عربية ومختلفة عن بعضها (المستخدم يعرف السبب بلا تفاصيل تقنية)"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "2FA1 — المفتاح مبذور مقفول، ومُعلن في قائمة القيم المغلقة (true/false بس)"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "2FA2 — الفتح مرفوض وخادم البريد مش مضبوط، ومسموح لما يتضبط، والقفل مسموح دايمًا"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "2FA3 — ثوابت الرمز: 6 أرقام، 5 دقائق، حد محاولات، ومهلة وحد لإعادة الإرسال"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "SRC1 — مفيش تسجيل لكلمة مرور في أي ملف من ملفات الدخول الجديدة"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "SRC2 — الرمز بيتخزن hash فقط (bcrypt) ومفيش أي عمود بيحمله صريحًا"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "SRC3 — الحالة المعلَّقة مش جلسة: مفيش توقيع توكن في two-factor.service، والتوقيع في auth.service بس"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "SRC4 — فشل البريد بيرفض الدخول (503) ومابيفتحش جلسة ولا حالة معلَّقة"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "SRC5 — حساب المجال بلا كلمة مرور قابلة للاستخدام، والصلاحيات مش من AD (مفيش memberOf)"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "SRC6 — كلمة مرور فاضية مرفوضة قبل أي اتصال (الربط المجهول في LDAP بينجح)"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "MIG1 — ترحيل 066 إضافي وآمن للتكرار وبأكواد THROW فريدة 66xxx ومتوافق مع 2019"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "MIG2 — أسماء القيد والفهارس في الترحيل مطابقة لكيانات TypeORM بالحرف"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "MIG3 — الترحيل بيبذر مفتاح التحقق مقفول ولا يلمس قيمة موجودة"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "OPS1 — سكربت الطوارئ موجود، مابيحتاجش التطبيق، وبيكتب المفتاح على القاعدة مباشرة"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "OPS2 — سكربت فحص البريد بيقرأ نفس إعداد الخادم ومابيطبعش كلمة مرور البريد"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "OPS3 — .env.example فيه كل مفاتيح المجال والبريد بلا أي قيمة سر"
    },
    {
      "file": "domain-login-two-factor.test.cjs",
      "name": "UI1 — شاشة الدخول فيها الطريقتان وخطوة الرمز، وشاشة السياسات فيها مفتاح التحقق وحالة البريد"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "MATCH1 — مفتاح الكود: قصّ وتوحيد حالة الأحرف وشيل الأصفار البادئة (وبيفضل حرف على الأقل)"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "MATCH2 — مفتاح البريد: قصّ وتوحيد حالة بس — الأصفار جزء من العنوان"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "MATCH3 — مرشّحات الأصفار: المفتاح + كل تصفير ممكن لطول العمود، ومفيش أطول من العمود"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "MATCH4 — الترتيب بالحرف: كود الموظف ← رقم البصمة ← بريد AD ← الـUPN، وأول ما ينجح بيوقف"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "MATCH5 — رقم البصمة بالأصفار البادئة: «00123» بتطابق «123» والعكس (السبب اللي 323 موظف اتعلّقوا عليه)"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "MATCH6 — قيمة بتطابق أكتر من موظف = غموض مرفوض، وممنوع الرجوع للخطوة اللي بعدها"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "MATCH7 — نفس الموظف بيرجع من أكتر من خانة مش غموض، والقيم الفاضية مابتطابقش حاجة"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "MATCH8 — كل خانة مطابقة لها اسم عربي للتقرير"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SYNC1 — الموظف الأرشيف/المنتهي/غير النشط مقفول، والنشط مفتوح"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SYNC2 — حساب الجهاز أو الخدمة مش شخص"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SYNC3 — بريد الحساب الجديد بالترتيب: AD ثم نسختنا ثم الـUPN، بلا تكرار وبلا عنوان بلا @"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SYNC4 — كل سبب تخطّي/تعارض وكل إجراء له نص عربي، ومفيش نص فاضي"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SRC-SYNC1 — الإنشاء والربط في مكان واحد: المزامنة بتنادي DomainLoginService مش بتكتب users بنفسها"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SRC-SYNC2 — السرد قراءة فقط بحساب الخدمة، بصفحات، وبلا أي مجموعة"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SRC-SYNC3 — السكربت: معاينة افتراضيًّا، بلا NestJS، ومفيش سر بيتطبع"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SRC-SYNC4 — مفيش تسجيل لكلمة مرور في ملفات المزامنة الجديدة"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SRC-SYNC5 — المسار محروس بـusers.manage ونطاق كل الفروع، والقائمة بتعلّم حساب الدومين"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SRC-SYNC6 — الشاشة: معاينة قبل التأكيد، وعلامة «حساب دومين»، وعربي RTL زي جيرانها"
    },
    {
      "file": "domain-users-sync.test.cjs",
      "name": "SRC-SYNC7 — .env.example بيشرح مفتاح حساب الخدمة المطلوب للمزامنة بلا أي قيمة سر"
    },
    {
      "file": "eg-salary-tax.test.cjs",
      "name": "ET-01: الجدول من حزمة الدولة بتاريخ الفترة — الشرائح والإعفاء والسنة 360 يوم، وقبل سريانه أو ناقص = مفيش حساب"
    },
    {
      "file": "eg-salary-tax.test.cjs",
      "name": "ET-02: الضريبة السنوية بالشرائح وعلى حدودها"
    },
    {
      "file": "eg-salary-tax.test.cjs",
      "name": "ET-03: مثال C-EG-01 — راتب 15,000 كله خاضع للتأمين: 1,482.50 في يناير وفي فبراير (تراكمي)، وبالطريقة المباشرة"
    },
    {
      "file": "eg-salary-tax.test.cjs",
      "name": "ET-04: التراكمي — زيادة في نص السنة ومكافأة شهر وتعيين في نص الشهر، ودخل تحت الإعفاء، وفترة من غير أيام"
    },
    {
      "file": "eg-salary-tax.test.cjs",
      "name": "ET-05: إلغاء الشرائح الدنيا للدخول العالية — أول الوعاء بنسبة الدرجة والباقي بشرائحه"
    },
    {
      "file": "eg-salary-tax.test.cjs",
      "name": "ET-06: صافي الدخل الخاضع من سطور القسيمة بعلامات بنود الراتب، وأيام الفترة من تناسب البند"
    },
    {
      "file": "eg-salary-tax.test.cjs",
      "name": "ET-07: مصدر الكود — حساب نقي: مفيش قاعدة بيانات ولا كتابة، والأرقام من حزمة الدولة مش ثوابت"
    },
    {
      "file": "employee-branch-isolation-fixes.test.cjs",
      "name": "تكرار الهوية/البصمة/الكود: الاسم يظهر لمدير النظام ولنفس الفرع بس، وحساب فرع تاني ياخد رسالة عامة"
    },
    {
      "file": "employee-branch-isolation-fixes.test.cjs",
      "name": "جدول العمل في حفظة واحدة مع نقل الفرع: الفحص على الفرع الجديد (fresh.branchId قبل حفظ الدوام)"
    },
    {
      "file": "employee-branch-isolation-fixes.test.cjs",
      "name": "نقل الموظف لفرع تاني وجدوله الساري أو المؤرخ بعد النقل خاص بفرع غيره يترفض — من الملف أو طلب نقل منفّذ"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "CSV: BOM، علامات تنصيص بفواصل وأسطر، فاصل «;» أو Tab، وCRLF"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "CSV للقالب: BOM، تحييد المعادلات، والقراءة بترجّع نفس القيم (من غير الفاصلة العليا)"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "العناوين: الاسم بالعربي بأي همزة/تطويل أو اسم الحقل بالإنجليزي، والمجهول بيتجاهل، والمتكرر والكود الناقص أخطاء"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "قيم الخلايا: تواريخ بأكتر من شكل، مبالغ، أرقام عربية، اختيارات، «مسح»، وصيغة Excel العلمية"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "الخطة: كود مش موجود، كود متكرر، موظف فرع تاني لحساب فرع، وصف من غير تغيير"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "الخطة: التغيير القديم ← الجديد، الأصفار اللي Excel شالها بتتجاهل، والهوية بأي صيغة من غير قاعدة جنسية"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "الخطة: رقم الهوية أو الجواز — «مسح» واحد لو التاني فاضل، مسح الاتنين مرفوض، والتكرار بعد التطبيع (موظف تاني أو صفين في الملف)"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "الخطة: التكرار — رقم هوية مسجل لموظف تاني (الاسم بس لو في النطاق) ورقم بصمة متكرر في الملف"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "الخطة: القسم والفريق بالاسم جوه الفرع، نقل الفرع، الدرجة المعطّلة، مركز التكلفة بالكود، والمدير بكوده"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "الخطة: طريقة الصرف على الحالة بعد الحفظ، والعقد نهايته بعد بدايته"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "الخطة: الراتب والبدلات — صلاحية اعتماد المسير، شهر السريان (مش مستقبلي)، والباقي من الأجر الحالي"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "الملف: الصفوف الفاضية بتتجاهل، أرقام الصفوف زي الملف، والحد 2000 صف"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "Excel: القالب بيتكتب ويتقري تاني بنفس القيم (أرقام نصية وتواريخ ومبالغ)، وxls القديم مرفوض"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "Excel: ملف مضغوط بينفجر بعد فك الضغط بيترفض قبل القراءة"
    },
    {
      "file": "employee-bulk-update.test.cjs",
      "name": "CSV مش UTF-8 أو ملف فاضي بيترفض برسالة واضحة"
    },
    {
      "file": "employee-create-salary-month.test.cjs",
      "name": "حدود أجر التعيين بدورة 23: شهر التعيين الجاري أو اللاحق هو الافتراض، والتعيين القديم يُوثَّق افتراضيًا من الشهر الجاري ويقبل شهر التعيين صراحة"
    },
    {
      "file": "employee-create-salary-month.test.cjs",
      "name": "مساعد الواجهة: الشهر يُرسل مع أجر فعلي فقط، ضمن الحدود وبعملة المسير، وبدون الحدود يترك افتراض الخادم"
    },
    {
      "file": "employee-create-salary-month.test.cjs",
      "name": "جلب الحدود يرسل تاريخ التعيين وحده ويرفض ردًا لا يطابقه أو ناقصًا"
    },
    {
      "file": "employee-create-salary-month.test.cjs",
      "name": "خطوة البيانات المالية في نموذج الإضافة تعرض «يسري من راتب شهر» لأجر التعيين، والعملة سطر قراءة حسب الفرع من غير اختيار"
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-01: مكتبة الواجهة بنفس قيم الخادم وبمساراته"
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-02: كارت «بيانات إضافية» — مابيظهرش قبل الترحيل أو من غير حقول، والتعديل للي الخادم سمح له، واللي اتغيّر بس بيتبعت"
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-03: شاشة «حقول ملف الموظف» — المفتاح والنوع مقفولين في التعديل، ورسالة قبل الترحيل، ومكانها في القوايم وسجل الموديولات"
    },
    {
      "file": "employee-custom-fields-ui.test.cjs",
      "name": "FU-04: محرر الجمهور — شرط الحقل المخصص للحقول اللي عليها قيم بس، وبيتحمّل من المتخزّن، وشرط حقل مابقاش متاح بيتشال"
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-01: قيمة الشاشة ← أعمدة التخزين لكل نوع، والغلط برسالته، والفاضي من غير قيمة"
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-02: أعمدة التخزين ← قيمة الرد لكل نوع"
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-03: اختيارات القايمة — لنوع «اختيار» بس، من غير تكرار ولا فاضي، وبحدودها؛ والمفتاح بقاعدته"
    },
    {
      "file": "employee-custom-fields.test.cjs",
      "name": "CF-04: شرط الجمهور بالحقل المخصص — قيمة الموظف من القايمة، ومن غير قيمة أو قراءة مش من الجمهور"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "الرصيد الافتتاحي: حفظ تعديل بلا تغيير لا يرسل الأيام، والتغيير يرسلها، و«لا يستحق» لا يرسل شيئًا"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "«حتى تاريخ أحدده» يطلب تاريخًا صالحًا غير ماضٍ، والتاريخ المحفوظ غير الملموس لا يمنع الحفظ"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "الخادم: نفس الأيام والصلاحية بلا تغيير، والمستخدم من الطبقة يبقى محدودًا بالأيام الجديدة"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "الخدمة: تعديل بنفس الرصيد لا يكتب، وتغييره يُبقي المستخدم منه، وسبب الأرشفة الطويل يُرفض قبل أي قراءة"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "الدرجة والمسمى من الكتالوج: الفعّال فقط بأسمائه، والمحفوظ المعطّل أو خارج الكتالوج يبقى خيارًا"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "نوع المستند من كتالوج doc_types: «خطاب رسمي» متاح، وأكواد الخطابات المرفوضة ليست خيارًا، والقديم «(نوع قديم)»"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "ملف إنهاء الخدمة يعرض السبب وتاريخ الإشعار والملاحظتين وإيقاف الحساب من رد GET /offboarding/:id"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "سبب الأرشفة: 300 حرف في الواجهة والخادم (عمود nvarchar(300)) برسالة عربية بدل 500"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "نصوص العهد: 100 حرف في الـDTO والواجهة، ورسائل عربية بدل «must be shorter than»"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "اسم بند التصفية: حرف واحد لا يُرسل من الواجهة، والخادم يرد برسالة عربية"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "السجل الوظيفي: عناوين وقيم عربية للفريق والعقد ودورة الراتب والراتب بدل «تغيير حالة» و«teamId:3»"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "التعديل: إفراغ الاسم الإنجليزي أو «اختر» للمسمى ونوع التوظيف والتأمينات يرسل null، وغير المحمّل لا يُمس"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "دورة الراتب: الظاهر «شهري» هو المحفوظ، و biweekly «كل أسبوعين» في النموذج والملف"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "البريد الشخصي لا يُنسخ إلى بريد العمل؛ إفراغ بريد العمل في التعديل يرسل null"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "صف مؤهل مكتوب بلا «+ إضافة»: يُضاف تلقائيًا إن اكتمل حقله الإجباري، وإلا رسالة «أضف الصف أو امسحه»"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "العنوان: المدينة وحدها تُحفظ «، المدينة» وتعود في خانة المدينة، والملف يعرضها بلا الفاصل"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "الاسم: التقسيم المبهم يُعرض في خانة الاسم الكامل، والاسم الرباعي البسيط يبقى أجزاء"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "SSR الإضافة: خطوة 2 فيها «بدون جدول (يتبع الفرع)» بلا قوائم ثابتة، وخطوة 3 «شهري» مختارة بلا مركز تكلفة مكرر"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "SSR التعديل: الاسم المبهم في خانة واحدة، والمستندات المحفوظة بجانب كل خانة رفع مع «إضافة نسخة جديدة»"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "الملف يعرض الفريق ومركز التكلفة وجدول العمل واستحقاق السنوي وسجل الدوام بسببه، والعنوان بلا فاصل بادئ"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "بداية استحقاق الراتب: حقل يوم اختياري يُرسل ويُمسح، ولا يسبق تاريخ التعيين، وله مدخل واحد في الشاشة"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "شاشة الموظف: بلا مدخل مرونة، وعناوين عربية لأجزاء الاسم الإنجليزي، وبلا ملاحظة الفريق، وحذف المؤهل بتأكيد"
    },
    {
      "file": "employee-field-roundtrip.test.cjs",
      "name": "الخطوة الأولى: رقم الهوية والجواز جنب بعض بملحوظة واحدة، خانات نصية بأي صيغة، والمحفوظ يرجع ويتمسح"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "normalization: Arabic spelling variants, diacritics, tatweel, hidden marks, digits, case and spaces"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "names match across spelling variants, in any word order, with or without spaces; codes ignore case and dashes"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "results are ranked: exact code first, then name/code prefix, then word prefix, then the rest — ties keep the list order"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "picker results: capped at 50 with the total for «اكتب أكتر للتصفية», the page filter applies, and the current choice stays reachable"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "keyboard navigation wraps around, and nothing is active in an empty list"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "SSR: an accessible combobox that shows the current choice by name and code, with clear only when something is chosen"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "SSR in place: the approval step «موظف بعينه» and the payroll sources panel render the picker"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "every employee choice is the shared searchable picker — no plain employee dropdown left in these places"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "B10 shift swap: the substitute is picked by name or code, never typed as an internal id — and the payload is still that numeric id"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "inline employee search lists keep their UI but use the same matcher"
    },
    {
      "file": "employee-picker-ui.test.cjs",
      "name": "the picker itself: portal next to its dialog, keyboard, Enter never submits the form, and relative imports for server-side tests"
    },
    {
      "file": "employee-privacy.test.cjs",
      "name": "EPU-01: شكل الإخفاء — الآيبان «SA•• •••• 1234» والهوية «•••••• 1234»، والقصير كله مخفي، والفاضي null"
    },
    {
      "file": "employee-privacy.test.cjs",
      "name": "EPU-02: الإعداد مقفول — الإسقاط زي الأول بالحرف لكل الحسابات (المالية مشيولة عن غير المصرّح، والهوية كاملة)"
    },
    {
      "file": "employee-privacy.test.cjs",
      "name": "EPU-03: الإعداد مفتوح — الهوية كاملة لصاحب الملف وللي بيعدّل بس، والآيبان مخفي لغير المصرّح له بالمالية، والأصلية مشيولة"
    },
    {
      "file": "employee-privacy.test.cjs",
      "name": "EPU-04: مصدر الكود — الإعداد مبذور مقفول، وكل رد بملف موظف بياخد حكمه، وملف Excel بنفس الحكم، والتصدير الكامل بصلاحية التعديل وبسطر تدقيق"
    },
    {
      "file": "employee-privacy.test.cjs",
      "name": "EPU-05 (CR4-SELF): سجل تغيير الهوية والجواز بنفس حكم الخانة — مقفول زي الأول، ومفتوح مخفي لغير صاحب الملف واللي بيعدّل"
    },
    {
      "file": "employee-privacy.test.cjs",
      "name": "EPU-06 (P4C-B01): حجب النص السردي المنسوخ من طلب سري — كله، أو مقطوع، أو قدامه بادئة؛ والأكواد والأرقام والتواريخ زي ما هي"
    },
    {
      "file": "employee-privacy.test.cjs",
      "name": "EPU-07 (P4D-B01): خانات الكلام الحر متحددة بنوعها — كل خانة نصية اسمها سردي أو طولها 300 فأكتر في جداول التصدير مصنّفة، وحجبها مابيبصّش لشكل النص"
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "رقم الهوية / الإقامة والجواز: أي صيغة لأي جنسية بعد التطبيع — من غير قواعد دولة"
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "إضافة: كل حقل إجباري ناقص له رسالة بخطوته، والمكتوب يُفحص شكله"
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "تعديل: ملف قديم ناقص يحفظ باقي حقوله، والمسح أو التغيير الغلط بس هو اللي يوقف"
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "CreateEmployeeDto: رسالة عربية واحدة لكل حقل إجباري، وUpdateEmployeeDto يفضل اختياري"
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "الواجهة: نموذج الموظف يستخدم نفس القاعدة ويعلّم الخانات الإجبارية"
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "تاريخ التعيين: سقف سنة قدّام، والمُرحّلون بـ1900-01-01 يعدّوا"
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "إضافة موظف: فرع غير فرع المستخدم يُرفض صراحةً بدل إعادة كتابته"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "context API binds employee and revision/hash while preserving all six exact strings and NULL currency"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "foreign employee, bad revision/hash, lossy money and missing current fields cannot initialize an editable salary"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "invalid employee ID fails before fetch and permission/conflict errors are not retried"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "formatting-only changes do not require payroll month/evidence or create a salary command"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "NULL is not zero and missing currency never becomes SAR on nonfinancial edit"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "a genuine amount change emits only an exact frozen command and preserves all other components"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "nonfinancial PATCH drops all monetary fields/currency including stale top-level null or number values"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "changed salary PATCH contains nested command only and preserves unrelated bank/contact fields"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "context failure permits a nonfinancial PATCH but cannot leak partial or rounded salary data"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "all six changed-salary values must be explicit nonnegative cents; no blank/null/fractional-cent defaults"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "payroll month/reason/reference are required only for real salary changes and later months route to requests"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "previous-month confirmation is optional and only legal for first history with a strictly earlier explicit month"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "display total sums exact cents beyond Number without treating absent components as zero"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "salary increase/resubmit body strips computed percentage, protected basis and daily date while allowing a future payroll month"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "custom salary workflows retain required attachment and customer fields while core money bypasses numeric conversion"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "real financial-step SSR keeps seven exact text fields (six + work pressure) and initially blank payroll months for genuine change only"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "previous salary confirmation displays exact old values and rejects incomplete/unsupported old evidence"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "context failure SSR locks seven salaries (six + work pressure) with the currency read-only by branch while preserving bank edits and explaining recovery"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "execution recovery sends only reason and request ID, permits scheduled reference, and accepts a server-confirmed rejection"
    },
    {
      "file": "employee-salary-change-ui.test.cjs",
      "name": "execution recovery never sends for denied/completed/non-salary requests or empty reason; stale 409 is not retried"
    },
    {
      "file": "employee-suspension.test.cjs",
      "name": "الحالة مشتقة من التواريخ: «موقوف» طول الفترة، وترجع لوحدها بعدها، والملغى لا يغطي"
    },
    {
      "file": "employee-suspension.test.cjs",
      "name": "إدخال الإيقاف والتداخل والإنهاء المبكر"
    },
    {
      "file": "employee-suspension.test.cjs",
      "name": "أيام المسير: يوم بيوم داخل الفترة، بلا ازدواج مع الإجازة بدون راتب، وسطر مستقل بمجموع ثابت"
    },
    {
      "file": "employee-suspension.test.cjs",
      "name": "مساعد الواجهة: نص الفترة والملاحظات"
    },
    {
      "file": "employee-suspension.test.cjs",
      "name": "نقاط الربط: تجسيد الغياب يتخطى أيام الإيقاف، والمسير يضيفها لعمود بدون راتب بسطر مستقل، والشاشات موصولة"
    },
    {
      "file": "employee-suspension.test.cjs",
      "name": "إيقاف داخل مسير معتمد أو مصروف: يترفض قبل الحفظ وقبل مسح صفوف الغياب، وبرا المسير يتسجل ويمسح الغياب بعد الفحص"
    },
    {
      "file": "employee-suspension.test.cjs",
      "name": "إيقاف منتهي (أثر رجعي غلط): يتلغى وأيامه تتجسد تاني، إلا لو داخل مسير معتمد؛ والإنهاء المبكر يفحص الأيام اللي رجعت بس"
    },
    {
      "file": "employee-suspension.test.cjs",
      "name": "إيقاف فوق إجازة معتمدة أو طلب إجازة قيد المعالجة يترفض برسالة «الغي الإجازة أو قصّرها الأول»، وطلب إلغاء إجازة مش مانع"
    },
    {
      "file": "employee-suspension.test.cjs",
      "name": "شاشة الملف: الإيقاف المنتهي في السجل له زرار «إلغاء أو تعديل النهاية» يفتح نافذة التصحيح"
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-01: إرجاع موظف ملفه مُصفّى — الواجهة بتعرف رد الخادم بكوده، وبتاخد سبب مكتوب، وغير المُصفّى زي ما هو"
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-02: «إعادة تعيين» — الزرار بصلاحية إنشاء موظف، والإتاحة وحدود التاريخ من الخادم، والتاريخ والسبب إجباريين"
    },
    {
      "file": "employment-periods-ui.test.cjs",
      "name": "PU-03: قسم «فترات الخدمة» في ملف الموظف لموظف له فترة مقفولة بس، والمسارين في الخادم بصلاحيتهم"
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-01: اليوم الحقيقي وجمع الأيام، ومفتاح الصف المتجمّد برّه خط الرصيد الزمني"
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-02: حدود تاريخ المباشرة (أول يوم وآخر يوم)، وسطر السجل بيحفظ السبب الطويل كامل"
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-03: حكم الإتاحة — الحالة، وملف الفترة الحالية، وإجازة بعد آخر يوم عمل، وأول يوم مقبول، والمسير المعلّق، وشهر آخر يوم عمل"
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-04: مرجع المسير بقاعدة رؤيته — شهر المسير المعلّق للي يشوف المسير بس، وحد تاريخ جاي من مسير مخفي بيقفل الإتاحة من غير تاريخ"
    },
    {
      "file": "employment-periods.test.cjs",
      "name": "EU-05: مفيش كاتب لرصيد الإجازات برّه قفل صف الموظف، ومعالجات الطلبات اللي بتحفظ كيان الموظف كله بتقراه بقفل"
    },
    {
      "file": "employment-window-ui.test.cjs",
      "name": "EWUI-01: the weekly schedule shows each employee only on his service days and warns about missing schedules/shifts"
    },
    {
      "file": "employment-window-ui.test.cjs",
      "name": "EWUI-02: the work-days page edits weekend exceptions inside the schedule and flags employees without a schedule"
    },
    {
      "file": "env-guard.test.cjs",
      "name": "synchronize is refused for the company database and any non-disposable name, in every environment"
    },
    {
      "file": "env-guard.test.cjs",
      "name": "known placeholder secrets are refused outside test and only warned about inside test"
    },
    {
      "file": "env-guard.test.cjs",
      "name": "real bootstrap with DB_SYNCHRONIZE=true and DB_DATABASE=hr_system exits with a clear message before TypeORM connects"
    },
    {
      "file": "env-guard.test.cjs",
      "name": "seed and reset refuse the company database before connecting; seed syncs only disposable or empty fresh-install databases"
    },
    {
      "file": "env-guard.test.cjs",
      "name": "npm run seed / reset against hr_system exit non-zero with the Arabic refusal before any database connection"
    },
    {
      "file": "env-guard.test.cjs",
      "name": "the device key seed is not a published value (empty = reception stopped until a strong key is set)"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "default resignation factors change exactly at configured 2, 5 and 10 year thresholds"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "termination uses the configured wage tiers without resignation threshold jumps"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "default reason factors apply zero dismissal and full configured non-resignation payouts"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "custom thresholds, wage tiers and reason factors override defaults without changing unspecified reasons"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "payout follows the two-stage money rule (cut at two decimals, no rounding) and zero service or wage yields zero"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "inclusive final working dates reach exactly 2, 5 and 10 years without fractional-year boundary loss"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "calendar service length handles the existing leap-day anniversary convention and impossible/reversed dates"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "policy table parsers reject bad factors, missing fields, duplicate or reversed thresholds and unknown reasons"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "legacy missing reason and malformed historical policy use their existing documented fallback rules"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "custom termination reasons use their own factor on the full award, and an unknown code is never resignation or a full award"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "service preview and persisted EOS lines match independent expected amounts at every resignation/termination boundary"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "service preview respects custom policy and zero payouts do not create a fictitious EOS line"
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "B4.5 (أ): end of service applies per country — applied by default, closed only by an explicit false, seeded, validated and shown on the policies screen"
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-01: الخادم — أبو القسم في الحسابات من نفس فرعه، فالتوسعة والمسار مايعدّوش للإدارة التنفيذية في فرع تاني"
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-02: شاشة المسير — «القسم وأقسامه الفرعية» جوه فرعه زي الخادم بالحرف"
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-03: شجرة الأقسام — حساب الفرع: أقسامه اللي تحت الإدارة التنفيذية جذور مش مختفية؛ حساب الشركة: تحتها وفرعها ظاهر"
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-04: «القسم الأب» — الإدارة التنفيذية لأي فرع، والباقي من فرع القسم؛ وتغيير الفرع مايسيبش أب غلط مستخبي"
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-05: الهيكل التنظيمي — حساب الشركة: قسم النصر تحت الإدارة التنفيذية وفرعه ظاهر؛ حساب النصر: قسمه جذر من غير ما يختفي"
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-06: شاشة الأقسام — الجذور والشارات واختيارات الأب والتنبيهات متوصلة بالمنطق ده"
    },
    {
      "file": "expense-reports.test.cjs",
      "name": "EXU-01: المبلغ والفئة — موجب بمنزلتين بالكتير ومن غير تقريب صامت؛ والحد اختياري ووضعه تحذير أو منع"
    },
    {
      "file": "expense-reports.test.cjs",
      "name": "EXU-02: التقرير والبند — العنوان، وفترة المأمورية الاتنين أو ولا واحد، وتاريخ البند مش في المستقبل، والإيصال رقم ملف"
    },
    {
      "file": "expense-reports.test.cjs",
      "name": "EXU-03: حكم السياسة على البند — فئة مقفولة أو فوق حد «منع» بيمنع، فوق حد «تحذير» بيتعلّم، والإيصال الإجباري بيتحكم عند التقديم بس"
    },
    {
      "file": "expense-reports.test.cjs",
      "name": "EXU-04: حالة التقرير الفعلية = حالته + حالة طلبه، والتعديل في المسودة والراجع والمرفوض بس"
    },
    {
      "file": "expense-reports.test.cjs",
      "name": "EXU-05: الميزة الفرعية بتملك مساراتها — الشاشة بتتقفل مع الميزة حتى وموديولها مفعّل، وباقي المسارات زي ما هي"
    },
    {
      "file": "expense-reports.test.cjs",
      "name": "EXU-06: مصدر الكود — المسارات ورا الموديول والميزة، الفئات لحساب بكل الفروع، التعديل تحت قفل الطلب ثم التقرير، والقيد بيتكتب في مكان واحد"
    },
    {
      "file": "expense-reports.test.cjs",
      "name": "EXU-07: الواجهة — «مصروفاتي» بتقدّم الطلب برقم التقرير بس والإيصال بيترفع بنوع «طلب»، و«المصروفات» للفئات والتقارير، والقايمة والعناوين"
    },
    {
      "file": "expense-reports.test.cjs",
      "name": "EXU-08: سلفة المأمورية — المبلغ والغرض، ومصدر الكود: الاعتماد من غير قيد، والتسوية تحت قفل التقرير ثم السلفة بقيد واحد حسب إشارة الصافي"
    },
    {
      "file": "expense-reports.test.cjs",
      "name": "EXU-09: حد الدرجة والبدل اليومي — حد الدرجة بيسبق حد الفئة، وسعر درجة الموظف بيسبق سعر كل الدرجات، والمبلغ = الأيام × السعر، وأي تغيير في السعر بيمنع البند"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-01: كل نوع من محتواه، والـZIP العادي والنص والـHTML مش من الأنواع"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-02: الامتداد لازم يطابق المحتوى — PDF متسمي .jpg مرفوض، والحروف الكبيرة والامتدادين لـJPG مقبولين"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-03: Word وExcel القديم بيتحسموا من تيارات الحاوية، مش من الامتداد"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-04: الإعدادات — نوع مقفول بيترفض باسمه، والحد بالميجا من 1 لـ50 والغلط = 10، وقيمة الأنواع بتتراجع"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-05 (CRP2A-B02): أرشيف ZIP مش Word ولا Excel إلا بجزئه الرئيسي الفعلي ونوعه المعلن — التعليق والمحتوى والاسم لوحدهم مايكفوش"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-06 (CRP2A-B02، مسح الصنف): حاوية OLE مش Word ولا Excel إلا بتيارها — MSI أو رسالة Outlook أو حاوية مقطوعة مرفوضين، ومفيش خطأ على أي بايتات"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-07 (CRP2B-A-B01): ملفات تعريف الحزمة بتتقري كـXML فعلي وبترتيب Office — التعليق وCDATA وقيمة خاصية تانية والتصريح المكرر والجزء الطُّعم مابيغيّروش النوع"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-08 (CRP2B-A-B01): حاوية OLE بشجرة دليلها — تيار في الجذر مش مجلد ولا تيار جوه مجلد، وحجمه مش صفر، والروابط المكسورة مرفوضة"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-09 (CRP2C-A-B01): تيار OLE لازم بايتاته تتقري فعلًا — السلسلة المصغّرة والعادية من غير قطاع ناقص ولا متكرر، وبداية الصيغة"
    },
    {
      "file": "file-type.test.cjs",
      "name": "FT-10 (CRP2C-A-N01): قارئ XML صارم زي أي قارئ فعلي، والجزء الرئيسي بيبدأ بعنصر جذر نوعه"
    },
    {
      "file": "financial-report-ui.test.cjs",
      "name": "every financial report has its own screen with the shared filters, Excel export and print, titled like its link"
    },
    {
      "file": "financial-report-ui.test.cjs",
      "name": "the reports hub and the payroll reports page link all financial reports, and the cost-center report stays linked"
    },
    {
      "file": "financial-report.test.cjs",
      "name": "row: buckets from salary components, credits/debits by category, leave lines split, pay split, gross = columns"
    },
    {
      "file": "financial-report.test.cjs",
      "name": "row: legacy item with no breakdown keeps totals via explicit unsplit lines; cash/transfer split; negative net pays nothing"
    },
    {
      "file": "financial-report.test.cjs",
      "name": "register: dynamic columns only for used buckets/categories, footer totals equal the sum of rows"
    },
    {
      "file": "financial-report.test.cjs",
      "name": "register vs bank sheet: the bank and cash totals of one run equal the bank sheet, the settlement leavers stay in the net column"
    },
    {
      "file": "financial-report.test.cjs",
      "name": "register wiring: one exclusion rule imported from the bank sheet, the mark read from the saved breakdown"
    },
    {
      "file": "financial-report.test.cjs",
      "name": "cost summary: by branch and by department with headcount, overtime, employer share and company cost"
    },
    {
      "file": "financial-report.test.cjs",
      "name": "deductions: by kind with affected employees, typed by deduction type, other debits by category, merged per employee"
    },
    {
      "file": "financial-report.test.cjs",
      "name": "overtime: minutes and amounts per employee (merged across runs) and per department"
    },
    {
      "file": "financial-report.test.cjs",
      "name": "loans: outstanding from DUE installments, month due/paid/remaining, overdue, deducted in payroll, settled loans hidden"
    },
    {
      "file": "gosi-tracks.test.cjs",
      "name": "المسار: أول تسجيل من 3 يوليو 2024 = الجديد، وقبله أو فاضي = القديم"
    },
    {
      "file": "gosi-tracks.test.cjs",
      "name": "الجدول المؤرخ: القيمة السارية في آخر يوم في الفترة، والبيانات الأولية 5 نسب للمسار الجديد وحدّين لمصر"
    },
    {
      "file": "gosi-tracks.test.cjs",
      "name": "معيار الخطة: المسار الجديد على 10,000 في يوليو 2026 = 1,075.00 و1,275.00، والقديم 975.00 و1,175.00"
    },
    {
      "file": "gosi-tracks.test.cjs",
      "name": "الخانة الفاضية والقيم الناقصة = نفس حساب النهارده بالحرف"
    },
    {
      "file": "gosi-tracks.test.cjs",
      "name": "حدود الأجر المصري: القرار الأحدث الساري يوم آخر الفترة — الجدول، أو الشاشة لو اتغيرت قبله ومن بداية الصف"
    },
    {
      "file": "gosi-tracks.test.cjs",
      "name": "الأساسي + السكن: ورا الإعداد، لفروع السعودية من غير أجر تأمين مسجل بس"
    },
    {
      "file": "gosi-tracks.test.cjs",
      "name": "الشاشة بتعرض حدود مصر السارية النهارده"
    },
    {
      "file": "gosi-tracks.test.cjs",
      "name": "خانة الملف: فاضي = مسح، والتاريخ صحيح ومش في المستقبل"
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-01: rating and comment, the first-response limit from its setting, the report range and the average"
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-02: a new closed module owning the inquiry types, the category and the seed, the rating under the request row lock, the scoped report, and the routes"
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-03: knowledge base — article values, search matching, the reader limited to published articles in the viewer audience, and management within the branch scope under the row lock"
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "Codex P3L-B06: the policy reference of an article is read with the manager of the transaction that holds the article row"
    },
    {
      "file": "hijri-display.test.cjs",
      "name": "HJU-01: قايمة كيانات الإعداد — أرقام صحيحة موجبة فريدة مرتّبة، والغلط بيتشال، والتفعيل والقفل"
    },
    {
      "file": "hijri-display.test.cjs",
      "name": "HJU-02: دالة عرض التاريخ — مقفول = ميلادي بس؛ مفتوح = الهجري بين قوسين للتاريخ الكامل بس، بتقويم أم القرى"
    },
    {
      "file": "hijri-display.test.cjs",
      "name": "HJU-03: مصدر الكود — الإعداد بيتكتب من مسار الكيانات بس، والحكم بفروع الحساب نفسه، والهيكل بيقراه مرة للجلسة"
    },
    {
      "file": "hiring-documents-ui.test.cjs",
      "name": "HD-UI-01: «نواقص مسوغات التعيين» في القائمة بعد «مستندات الموظفين» بصلاحيتها، وعنوانها في الهيدر، وحارس المسار"
    },
    {
      "file": "hiring-documents-ui.test.cjs",
      "name": "HD-UI-02: النداءات في hiring-documents-api.ts (مش api.ts)، ونصوص الشاشات، ورابط «ارفع الناقص» ذهابًا وإيابًا"
    },
    {
      "file": "hiring-documents-ui.test.cjs",
      "name": "HD-UI-03: الشاشات متوصلة — أنواع المستندات، ونواقص مسوغات التعيين، وتهيئة الموظفين الجدد، ومستنداتي"
    },
    {
      "file": "holiday-audience-ui.test.cjs",
      "name": "HAU-01: picker value ↔ server audience — company is everyone (null), only the chosen level list is sent, sorted and deduped"
    },
    {
      "file": "holiday-audience-ui.test.cjs",
      "name": "HAU-02: labels — «للكل», branch/department/team by name, employees by count; without names (version summary) by count only"
    },
    {
      "file": "holiday-audience-ui.test.cjs",
      "name": "HAU-03: the calendar context accepts a well-formed audience and rejects a malformed one (never read as everyone)"
    },
    {
      "file": "holiday-audience-ui.test.cjs",
      "name": "HAU-04: the version summary shows «تسري على» per holiday without printing raw objects"
    },
    {
      "file": "holiday-audience-ui.test.cjs",
      "name": "HAU-05: the holidays screen offers the unified picker as «تسري على», sends the audience with the dated calendar change, and lists it"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-01: canonical audience — null means everyone, ids are sorted, and every malformed shape is rejected (never read as everyone)"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-02: stored column — round trip, NULL = everyone, corrupt text fails closed"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-03: screen input — company/null = everyone, the picker lists are deduped and only the chosen level is kept"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-04: matching — branch audience covers the branch and its people; departments include sub-departments; teams and names cover people only"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-05: day kind — a targeted holiday wins only for the people it covers; for everyone else the day keeps its normal rules"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-06: an everyone-holiday snapshot keeps the exact five keys and the pre-feature fingerprint; audience enters the snapshot only when set"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-07: employee level — a holiday for X only is X's holiday; Y in the same branch works; the branch and the global calendars stay working"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-08: branch level — «the whole branch» counts for the branch calendar and every employee dated in that branch, not for other branches"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-09: department level — sub-departments included; the department on a past day comes from the organization history, not today's file"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-10: team level — the team on the day; the org history is read once per employee inside one cache and only when a team/department holiday falls on the day"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-11: organization history for one employee filters by that employee with a parameter; the payroll-wide read is unchanged"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-12: write validation — new ids must exist in the chosen branch; kept ids stay valid; branch-scoped accounts never set company-wide or foreign audiences"
    },
    {
      "file": "holiday-audience.test.cjs",
      "name": "HA-13: short Arabic description for lists and calendars"
    },
    {
      "file": "holiday-work.test.cjs",
      "name": "المبلغ = الساعات × (الإجمالي ÷ 30 ÷ ساعات اليوم) × المضاعف، مقصوص لقرشين (مش مقرّب)"
    },
    {
      "file": "holiday-work.test.cjs",
      "name": "الاستحقاق: يوم عطلة ببصمة دخول وخروج بس — والساعات ناقص الاستراحة غير المدفوعة"
    },
    {
      "file": "holiday-work.test.cjs",
      "name": "مطابقة الأمر: الشركة، الفرع، أقسام وفرق جوه الفرع، والموظفين بالاسم"
    },
    {
      "file": "holiday-work.test.cjs",
      "name": "الإضافي والبدل ما يجتمعوش: يوم العطلة المغطى بأمر/طلب للموظف بيرفض الإضافي، ويوم العمل العادي للموظف لأ"
    },
    {
      "file": "holiday-work.test.cjs",
      "name": "يوم عليه أكتر من أمر/طلب بيتحسب مرة واحدة بأعلى مضاعف ثم الأقدم، وجوه المدى بس"
    },
    {
      "file": "holiday-work.test.cjs",
      "name": "أيام الطلب: مصفوفة أو نص مفصول بفواصل عربية/إنجليزية، مرتبة بلا تكرار، والطلب ما يسبقش النهارده"
    },
    {
      "file": "holiday-work.test.cjs",
      "name": "المضاعف: من 0.01 لـ 99.99 بمنزلتين بالكتير"
    },
    {
      "file": "holiday-work.test.cjs",
      "name": "مرجع القيد في الدفتر وبيانه: الأمر واليوم، والبيان بالساعات والمضاعف"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-01: بصمة محاولة الإصدار فيها طلب الإقرار وموعده — نفس المفتاح مايتبعتش ببيانات تانية"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-02: عميل الـAPI على مسارات الخادم نفسها — «مستني إقرارك»، والقراءة، والإقرار، والإلغاء، وفلتر السجل؛ والمعاينة من غير طلب الإقرار"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-03: «مستنداتي» — «مستني إقرارك» بقارئ المستند؛ والإقرار ببصمة الملف اللي اتعرض، وبعد ما يتعرض فعلًا بس"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-04: «مهامي» — مهمة إقرار المستند من غير أزرار، ورابط فتح المستند لصاحبها"
    },
    {
      "file": "hr-document-acknowledgements-ui.test.cjs",
      "name": "DU-05: شاشة الإصدار — طلب الإقرار وموعده، وحالته وفلترها وإلغاؤه في السجل، ونفس المستند لمجموعة"
    },
    {
      "file": "hr-document-content.test.cjs",
      "name": "HR content accepts exactly the configured custom keys and rejects malformed or unauthorized placeholders"
    },
    {
      "file": "hr-document-content.test.cjs",
      "name": "HR custom fields have bounded unique keys, explicit required flags and text-only values"
    },
    {
      "file": "hr-document-content.test.cjs",
      "name": "HR document values are replaced once and contract/date/financial values retain direction in Arabic text"
    },
    {
      "file": "hr-document-content.test.cjs",
      "name": "HR document content bounds also limit repeated expansion of long custom values"
    },
    {
      "file": "hr-document-migration.test.cjs",
      "name": "HR007 transactional DDL rollback leaves existing document data and no partial tables"
    },
    {
      "file": "hr-document-migration.test.cjs",
      "name": "HR007 creates exact current TypeORM schema without changing existing document bytes"
    },
    {
      "file": "hr-document-migration.test.cjs",
      "name": "HR007 replay preserves saved drafts revisions snapshots and unique issuance constraints"
    },
    {
      "file": "hr-document-ui.test.cjs",
      "name": "readable Arabic custom and built-in tokens round-trip to stable API keys without expanding custom values"
    },
    {
      "file": "hr-document-ui.test.cjs",
      "name": "unknown or removed custom variables, duplicate fields and unclosed tokens block publishing"
    },
    {
      "file": "hr-document-ui.test.cjs",
      "name": "four starter drafts are valid and contract terms must come from user; general draft needs no employee"
    },
    {
      "file": "hr-document-ui.test.cjs",
      "name": "issuance retry fingerprint is stable across field order but changes for employee, values and published revision"
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "طلب الخطاب يُرسل من ملف الموظف نفسه: لا كارت يوجّه إلى «طلباتي»"
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "الخطاب يمر بنفس نقطة الإنشاء وبوابة النيابة اللي في شاشة «طلباتي»"
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "«بصم رغم الإجازة» بتفتح سجل الإجازات على الموظف ويومه، مش على قائمة كل الإجازات"
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "سجل الإجازات بيقرأ employee/date ويحطهم في فلاتره القائمة (بحث + مدى التاريخ) بلا فلتر جديد"
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "القرار على الإذن من صفّه: اعتماد ورفض بسبب بنفس actOnRequest وقاعدة صندوق الموافقات"
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "نافذة قرار الإذن بنفس مكونات «رفض بسبب» في شاشة الإضافي"
    },
    {
      "file": "leave-attachment-ui.test.cjs",
      "name": "قاعدة المرفق بنصها: مطلوب مع الطلب، اختياري، وفوق N يوم — وبلا نص لنوع «بعد الرجوع» أو بلا مرفق"
    },
    {
      "file": "leave-attachment-ui.test.cjs",
      "name": "شاشة «طلب إجازة»: الزر بقاعدة النوع، النص جنبه، والإرسال محجوب بلا المرفق المطلوب"
    },
    {
      "file": "leave-attachment-ui.test.cjs",
      "name": "شاشة «الطلبات» الموحّدة: نفس القاعدة ونفس الحقل ونفس الحجب"
    },
    {
      "file": "leave-attachment-ui.test.cjs",
      "name": "مرفق «بعد الرجوع» في «إجازاتي» كما هو: PENDING فقط، وentityType=leave_attachment"
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "YEAR_START = السنة الميلادية، HIRE_ANNIVERSARY = من ذكرى التعيين حتى اليوم السابق للذكرى التالية"
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "الصفوف القائمة تبقى صالحة: صف السنة الميلادية كامل وأول سنة ذكرى بعده تبدأ 1 يناير بنسبة أيامها"
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "المتراكم الشهري واليومي على نافذة الذكرى مطابق لحساب السنة الميلادية"
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "الترحيل: مفعّل بسقف، null بلا سقف، معطّل = صفر؛ والصلاحية من بداية السنة الجديدة"
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "إعداد النوع: ANNUAL بالكود قبل أنواع فئة السنوية الأخرى، والأيام الفارغة ترجع للإعداد العام"
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "YEAR_START: الاستحقاق من annualDays والترحيل عند التجديد بسقف النوع، والمرضي المعطّل لا يترحّل"
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "HIRE_ANNIVERSARY: السنة تتجدد في ذكرى التعيين مع ترحيل بالسقف مرة واحدة، والخصم على سنة الرصيد الصحيحة"
    },
    {
      "file": "leave-balance-periods.test.cjs",
      "name": "التحوّل من بداية السنة إلى الذكرى: صف 2040 يبقى كما هو، والترحيل السنوي ينشئ سنة انتقالية حتى الذكرى"
    },
    {
      "file": "leave-entitlement-tiers.test.cjs",
      "name": "LTU-01: التحقق من الشرائح — الدولة والخدمة والسن والأيام، وشريحة من غير شرط أو مكررة مرفوضة"
    },
    {
      "file": "leave-entitlement-tiers.test.cjs",
      "name": "LTU-02: من غير شرائح = أيام النوع بالحرف؛ بالشرائح أعلى شريحة منطبقة بدولة الفرع والخدمة والسن"
    },
    {
      "file": "leave-entitlement-tiers.test.cjs",
      "name": "LTU-03: اقتراح الشرائح من حزمة الدولة — مصر 4 والسعودية 2، والأرقام من الحزمة مش من الكود"
    },
    {
      "file": "leave-entitlement-tiers.test.cjs",
      "name": "LTU-04: أنواع إجازات الحزمة لكل دولة — مصر (وضع 120 × 3، أبوة 1 × 3، حج 30 مرة) والسعودية (وضع 84، أبوة 3، زواج 5، وفاة 5 و3، حج 15 مرة)"
    },
    {
      "file": "leave-entitlement-tiers.test.cjs",
      "name": "LTU-05: مصدر الكود — الشرائح بتدخل في سياق الاستحقاق بس لما النوع ليه شرائح، والعمودين برّه قراءة وكتابة النوع"
    },
    {
      "file": "leave-sick-pay-tiers.test.cjs",
      "name": "tiers: default 1-30 = 100%, 31-90 = 75%, 91+ = 0%; invalid JSON falls back to the default; a gap pays in full"
    },
    {
      "file": "leave-sick-pay-tiers.test.cjs",
      "name": "cumulative position counts every prior sick day of the same calendar year; only days inside the cover are returned"
    },
    {
      "file": "leave-sick-pay-tiers.test.cjs",
      "name": "crossing into 91+ splits into one line per pay percent; a new year restarts the count; fully paid days add nothing"
    },
    {
      "file": "leave-sick-pay-tiers.test.cjs",
      "name": "half days count as halves; exempt days are not charged; cancelled leaves are ignored"
    },
    {
      "file": "leave-sick-pay-tiers.test.cjs",
      "name": "leave deduction lines always sum to the paid unpaid-leave column"
    },
    {
      "file": "leave-sick-pay-tiers.test.cjs",
      "name": "attachment after return: PENDING until toDate + deadline only when the rule requires it; the due day itself is not overdue"
    },
    {
      "file": "leave-suspension-overlap.test.cjs",
      "name": "القاعدة الصرفة: أي يوم إيقاف غير ملغى داخل مدى الإجازة يرفضها، والملغى والأيام اللي اتشالت بالإنهاء المبكر مش مانعة"
    },
    {
      "file": "leave-suspension-overlap.test.cjs",
      "name": "القراءة من القاعدة: إيقافات الموظف نفسه غير الملغاة بس، وجدول الإيقاف لو مش موجود مايوقفش الإجازات"
    },
    {
      "file": "leave-suspension-overlap.test.cjs",
      "name": "اعتماد إجازة بعد ما الموظف اتوقف على نفس الأيام: يترفض قبل كتابة الإجازة، وإيقاف انتهى بدري قبلها مايمنعش"
    },
    {
      "file": "leave-suspension-overlap.test.cjs",
      "name": "تقديم إجازة على أيام إيقاف يترفض للموظف وللموارد البشرية نيابةً، والإيقاف الملغى أو اللي خلص قبلها مايمنعش"
    },
    {
      "file": "leave-suspension-overlap.test.cjs",
      "name": "طلب النقل وجدول الموظف خاص بفرعه القديم: الرسالة تقول «جدول لكل الشركة الأول، وجدول الفرع الجديد بعد النقل»، ورسالة تعديل الملف زي ما هي"
    },
    {
      "file": "leave-type-rules.test.cjs",
      "name": "counting mode: ALL_DAYS counts the calendar, WORKING_DAYS working days; unpaid and sick always calendar; no category falls back to paid/unpaid"
    },
    {
      "file": "leave-type-rules.test.cjs",
      "name": "min and max days per request, in the type unit"
    },
    {
      "file": "leave-type-rules.test.cjs",
      "name": "notice days: fromDate at least N days after today, 0 allows today"
    },
    {
      "file": "leave-type-rules.test.cjs",
      "name": "backdate: not allowed, allowed up to N days, or left to the global setting"
    },
    {
      "file": "leave-type-rules.test.cjs",
      "name": "half day refused when the type does not allow it, even for HR on behalf"
    },
    {
      "file": "leave-type-rules.test.cjs",
      "name": "occasion: fixed days and times per year"
    },
    {
      "file": "leave-type-rules.test.cjs",
      "name": "attachment at submit: required, required above days, and never for after-return"
    },
    {
      "file": "leave-type-rules.test.cjs",
      "name": "submit path wires the rules: counting mode for stored days, type backdate overrides global, times per year counted"
    },
    {
      "file": "leave-year-end.test.cjs",
      "name": "الترحيل واللي يسقط: لحد سقف النوع والباقي يسقط؛ بعد الإقفال اللي يتسوّى هو اللي سقط بس"
    },
    {
      "file": "leave-year-end.test.cjs",
      "name": "بدل الأيام: الراتب الشامل ÷ 30 × الأيام، مقصوص لقرشين من الراتب مباشرة"
    },
    {
      "file": "leave-year-end.test.cjs",
      "name": "بداية الاستحقاق وأول سنة: قبل يوم الاستحقاق صفر، وأول سنة بالنسبة من يومه أو كاملة"
    },
    {
      "file": "leave-year-end.test.cjs",
      "name": "المعاينة: المستحق والمستخدم والمتبقي واللي يترحّل واللي يسقط لكل موظف في النطاق، والإقفال يرحّل ويكمّل الناقص ومايتكررش"
    },
    {
      "file": "leave-year-end.test.cjs",
      "name": "التسوية قبل الإقفال: المتبقي كله يتصفّر ومايترحّلش؛ بعد الإقفال اللي سقط بس"
    },
    {
      "file": "leave-year-end.test.cjs",
      "name": "بداية الاستحقاق من نوع السنوية: الرصيد والتقديم قبل يوم الاستحقاق برسالة واضحة"
    },
    {
      "file": "legacy-password-marker.test.cjs",
      "name": "missing record → no badges"
    },
    {
      "file": "legacy-password-marker.test.cjs",
      "name": "only accounts the importer created with an unusable password (linked ones excluded, BOM tolerated)"
    },
    {
      "file": "legacy-password-marker.test.cjs",
      "name": "record changes are picked up; a corrupt record yields no badges instead of partial ones"
    },
    {
      "file": "legal-entities.test.cjs",
      "name": "LU-01: creating and editing values, currency from the country, a fixed country, the IBAN of the entity country, the time zone, the gaps, and the branch currency"
    },
    {
      "file": "legal-entities.test.cjs",
      "name": "LU-02: one currency source before and after the migration, the branch column outside the entity, locked field-only writes, the unlink on a country change, the payroll guard, the routes and the screens"
    },
    {
      "file": "legal-entities.test.cjs",
      "name": "LU-03: the local day in a zone, and the absence catch-up split into the general group and one group per zoned entity"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "B2: the loan request window closes with one switch whatever the days, and reopens at once"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "D: the first-installment month is stamped once at submission — no server-only flag, no re-stamp at each approval step"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-05 SRS example: MIN(800, 1500, 1000, 500) = 500 governed by the outstanding cap; 501 is rejected with the governing cap named, 500 passes"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-02 switching the percent base from BASIC to GROSS changes the cap immediately"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-04 monthly count and amount: pending requests consume the counter and the reset date is stated"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-04 month definition: calendar month versus payroll period (cycle 23), including the boundary day"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-06 outstanding equal to the cap blocks any new request; lower outstanding frees headroom"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-01 no policy means no caps; months above the policy maximum are refused"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-01/03 policy validation: at least one cap, positive flat cap, percent needs a base, scoped policies need ids"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-01 selection: the most specific scope wins, then priority; inactive and out-of-window versions never participate"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-14 SHORTEN_TERM pays from the last installment: 1668 closes one installment; 1334 leaves 334 on the tail"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-14 REDUCE_INSTALLMENT keeps the count and equalizes the rest (SRS: 1000 + 1000 after 1334)"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-14 full settlement, overpayment refusal with the exact closing amount, and FULL mode needs the closing amount"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-14 every partial plan preserves each installment and the paid total to the cent"
    },
    {
      "file": "loan-caps.test.cjs",
      "name": "AD-13 SRS example: loan balance 3340 against dues 2100 leaves 1240 PENDING_RECOVERY; other debits consume dues first"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "AD10 floors each installment to cents and assigns all remainder to the final installment"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "SPEC5-2 rejects sub-unit ordinary installments without inventing zero-balance due rows"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "DEC18,2 boundary preserves every cent without Number conversion"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "amount precision and technical month bounds reject without silent rounding"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "varied schedules conserve principal and never exceed the ordinary floor before the final installment"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "client admits four fields only and normalizes numeric form IDs without changing the caller"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "client cannot supply a balance, revision, approval, actor or protected evidence even in a draft"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "required identifiers, period and reason reject invalid values at submission"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "strict plain data shapes reject inherited, hidden and accessor data without invoking it"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "server evidence freezes the open remainder for thresholds while preserving source revision"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "stored source snapshot cannot mismatch the protected amount, IDs or month"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "execution cannot use an unstaged draft or one half of an evidence snapshot"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "financial approval comparisons preserve a one-cent difference beyond safe Number precision"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "seed preserves the actual loan chain and its branch override even when the branch is found first"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "seed keeps an existing deferral reference and its old template independent of a newly selected loan chain"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "an unconfigured existing loan type does not get a fabricated chain or prevent seed completion"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "actual deferral chain uses current LOAN, requester branch and exact server amount for approval thresholds"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "deferral-only seed creates one missing type without touching chains, templates, owner configuration or other types"
    },
    {
      "file": "loan-installment-requests.test.cjs",
      "name": "deferral-only seed preserves an existing custom type and refuses to invent a missing LOAN"
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "loan kind labels: «سلفة استثنائية — N قسط», «سلفة (مرة واحدة)», and an old regular loan keeps its installment count"
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "resubmitting a returned loan: the server default month is dropped (re-stamped), a month an authorized user chose or an exceptional month is kept, and a month in the patch drops the old chooser"
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "«سلفي»: no months input, the request is one month, the note is shown, and the list works at phone width (cards under md, the table from md)"
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "«السلف والقروض»: the new-loan form has no months and sends one month; «سلفة استثنائية» is behind loans.exceptional, opens its modal and refreshes the list"
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "the exceptional loan modal: the shared employee picker (not a select), no self-loan, and a payload the server accepts"
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "«طلباتي»: the regular loan form hides the months field, shows the note and always sends one month; a returned exceptional loan keeps its months"
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "approvals and request details show the loan kind; the caps panel no longer asks for the max installment months but keeps the saved value"
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "work-days warning: an «إجازة/راحة» rule on a day that is already a rest day, and the mirror «دوام» on a working day; unknown weekend = no warning"
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "work-days wiring: the schedule exceptions list warns against the weekend on screen, and the rule modal against the branch or global weekend — warning only, saving stays enabled"
    },
    {
      "file": "login-security.test.cjs",
      "name": "القفل والتأخير: أول محاولتين من غير تأخير، وبعدين ثانية ثم 2 ثم 4 كحد أقصى، والقفل عند الحد بالمدة"
    },
    {
      "file": "login-security.test.cjs",
      "name": "سياسة كلمة السر (NIST): الطول، والشائعة، والحرف المتكرر، وجزء البريد واسم صاحب الحساب واسم النظام — من غير شرط رموز"
    },
    {
      "file": "login-security.test.cjs",
      "name": "حراسة إعدادات أمان الدخول، وفرض التحقق على أدوار محتاج البريد مضبوط زي التحقق العام"
    },
    {
      "file": "login-security.test.cjs",
      "name": "الشاشات: «فك القفل» في المستخدمين، و«سجل الدخول» بصلاحيته، وإعدادات الأمان، ورؤوس الحماية في الواجهة"
    },
    {
      "file": "mobile-punch.test.cjs",
      "name": "MPU-01: المسافة والحكم — أقرب موقع، جوه نصف القطر مقبولة، برّه مرفوضة، والدقة الضعيفة مرفوضة حتى لو النقطة جوه، ومن غير مواقع مفيش حكم"
    },
    {
      "file": "mobile-punch.test.cjs",
      "name": "MPU-02: قواعد الموقع ونقطة الموظف — إحداثيات في المدى، نصف قطر بحده، ودقة موجبة مطلوبة"
    },
    {
      "file": "mobile-punch.test.cjs",
      "name": "MPU-03: مصدر الكود — ميزة مقفولة بمساراتها؛ الحكم تحت قفل صف الموظف والمحاولة بتتسجّل في نفس المعاملة؛ والبصمة المقبولة بوقت الخادم من ingest القايم برّه المعاملة"
    },
    {
      "file": "mobile-punch.test.cjs",
      "name": "MPU-04: الواجهة — «بصمتي» بتبعت الموقع ودقته بس وبتأكد فورًا؛ و«بصمة الموبايل» للمواقع (بزرار من الخادم) والمحاولات؛ والقايمة والعناوين"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-01: زرار القائمة في الهيدر (أقل من lg بس) بـaria-label وaria-expanded وبيتحكم في القائمة، والعنوان سطر واحد على الموبايل"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-02: القائمة الجانبية درج تحت lg — مقفول برّه الشاشة ومخفي، مفتوح ظاهر، وكل كلاس جديد max-lg: بس"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-03: AppShell — المحتوى lg:mr-72 وp-4 lg:p-8، خلفية معتمة بتقفل، Esc والانتقال بيقفلوا، وقفل تمرير الصفحة"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-04: CSS المشروع — كل max-lg: جوّه (أقل من 1024px) بس، وlg:mr-72 من 1024 وفوق، وclip للهيدر الثابت على الموبايل بس"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-05: الـviewport: Next بيطلع width=device-width, initial-scale=1 افتراضيًا ومحدش بيغيّره"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-06: شاشات البوابة — مفيش mr-72 ثابت، ولا grid-cols-3+ من غير بديل للشاشة الصغيرة، ولا col-span بيعمل عمود ضمني"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-07: الجداول جوّه overflow-x-auto، والنوافذ جوّه الشاشة بهامش وmax-h وتمرير داخلي"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-08: لوحة الإشعارات جوّه الشاشة على الموبايل، ومنتقي الموظف قايمته مقصوصة على عرض الشاشة"
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-09: الطباعة — زرار القائمة مابيتطبعش، وطباعة الهيكل التنظيمي بتلغي هامش القائمة الجديد (lg:mr-72)"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-01: السجل سليم — تبعيات مسجّلة ومن غير دايرة، والأساسي مايعتمدش على اختياري"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-02: الحالة — الصف الغايب افتراضي السجل، والأساسي مايتقفلش، والقفل بينزل على المعتمدين"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-03: صاحب مسار الواجهة — أطول نمط بيكسب، والنجمة أضعف من الثابت، والشاشات الوهمية ورا ميزتها"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-04: أنواع الطلبات — بالكود الأول ثم بمعالج التنفيذ، وغير كده محرك الطلبات"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-05: المهام المجدولة والصلاحيات — كل اسم لموديول واحد"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-06: الباقات — كل باقة بتشمل اللي قبلها والأساسي دايمًا"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-07: التبعيات عند القفل والفتح — الناقص والمعتمد"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-08: كل صلاحية في سجل الصلاحيات لها موديول، وكل صلاحية في سجل الموديولات معروفة"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-10: صلاحيات تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة في شاشة الأدوار"
    },
    {
      "file": "modules-registry.test.cjs",
      "name": "MR-09: أنواع الطلبات المزروعة — كل نوع في موديوله، وكل معالج تنفيذ حقيقي متسجّل لموديول"
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-01: كل شاشة لها صاحب (موديول أو ميزة شاشات العرض)، وكل مسار في السجل له صفحة"
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-02: القايمة الجانبية من السجل — الوهمي ورا ميزته، وبنود الموديول المقفول مختفية"
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-03: modules.ts — قراءة واحدة للجلسة بكاش مربوط بيها، وفشل الخادم افتراضي السجل، والمسح بيقرا من جديد"
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-04: حارس المسارات — «الصفحة دي مش متاحة» قبل فحص الصلاحية، والإطار مابيتعرضش قبل ما الحالة تتقري"
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-05: <ModuleGate> — الجزء بيختفي لو الموديول أو الميزة مقفولين"
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-06: شاشة «الإعدادات ← الموديولات» — في القايمة بصلاحيتها، وبتأكد القفل بأثره، وبتعرض فرق الباقة"
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-07: الحالة بتتجدد من غير دخول جديد — القديم بيتعرض والجديد في الخلفية، ومسار «مش موجود» بيجدّد"
    },
    {
      "file": "modules-ui.test.cjs",
      "name": "MU-08: شاشات الأساس مع موديول مقفول — اللينك مابيتعرضش، والجزء مابيتطلبش ولا بيوقّع الشاشة"
    },
    {
      "file": "night-shift-hint-ui.test.cjs",
      "name": "بصمات الليلة بعد منتصف الليل تُعلَّم صباح الغد، ومساء يوم البداية لا"
    },
    {
      "file": "night-shift-hint-ui.test.cjs",
      "name": "المكون يعرض التلميح للحقل المطلوب فقط، والشاشات الثلاث تمرره للدخول والانصراف"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-01: الكتالوج متسق — فئة معروفة، وقالب لكل قناة، والنص الافتراضي بمتغيرات الحدث بس"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-02: تحقق نص القالب — متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وطول زيادة"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-03: تعويض المتغيرات — من غير قيمة فاضي، والعنوان سطر واحد، والقيمة مابتتفسّرش تاني"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-04: ساعات الهدوء — الشكل، والنافذة اللي بتعدّي نص الليل، وآخرها"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-05: عنوان البريد — شكل بس، واسم الدخول اللي مش عنوان مرفوض، والعنوان الداخلي بعد أي عنوان تاني"
    },
    {
      "file": "notification-events.test.cjs",
      "name": "NE-06: الخصوصية — مفيش متغير مبلغ في أي حدث، والطلب السري من غير نوع ولا اسم ولا قرار"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والقيم بنفس كتالوج الخادم"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-02: اختيارات المستخدم في صفحة الإشعارات — البريد (فورًا، ملخص يومي، مقفول) وداخل النظام للفئات المخزّنة بس، وفئة الرواتب باسمها"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-03: لوحة الإشعارات تحت «المهام المجدولة» — سجل الإرسال بحالاته وسببه، وتعديل القوالب بمتغيراتها والرجوع للافتراضي"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-04: الإعدادات التلاتة في «سياسات النظام» بنفس مفاتيح الخادم وحدوده، والبريد مقفول افتراضيًا"
    },
    {
      "file": "notifications-ui.test.cjs",
      "name": "NU-05: المهمة المجدولة للملخص اليومي متسجّلة في القايمة وسجل الموديولات، ومسح مهام الطابور المنتهية مع مسح السجل"
    },
    {
      "file": "onboarding-templates.test.cjs",
      "name": "OU-01: a template matches when every written scope field equals the employee file; most specific first, then the oldest"
    },
    {
      "file": "onboarding-templates.test.cjs",
      "name": "OU-02: the link column stays outside entity reads and writes, the copy falls back to the general template, and management is scoped"
    },
    {
      "file": "onboarding-templates.test.cjs",
      "name": "OU-03: the template window offers the scoped templates only after the migration, with the same item table"
    },
    {
      "file": "ops-logging-health.test.cjs",
      "name": "OL-01: الأخطاء والتحذيرات بتتكتب في ملف اليوم بالسياق والتتبع، والمعلومات لأ؛ واليوم الجديد ملف جديد"
    },
    {
      "file": "ops-logging-health.test.cjs",
      "name": "OL-02: ملفات api-*.log الأقدم من مدة الاحتفاظ بتتمسح مع أول كتابة في اليوم، وأي ملف تاني في المجلد مابيتلمسش"
    },
    {
      "file": "ops-logging-health.test.cjs",
      "name": "OL-03: الإعدادات — LOG_DIR=off بيقفل، والمسار النسبي من مجلد التشغيل، ومدة احتفاظ غلط = 30"
    },
    {
      "file": "ops-logging-health.test.cjs",
      "name": "OL-04: /api/health — ملخص المهام بالعدد بس: المفعّلة اللي آخر تشغيل ليها فشل أو وقف في النص، والمقفولة مابتتحسبش، وسجل مش موجود = unknown"
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "القمة «الإدارة التنفيذية»: الرئيس التنفيذي مديرها، والسكرتير جنبه بس ومش أب لحد"
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الإدارات بأبوّة الأقسام: مدير وعدد موظفين شامل الفروع، والفريق بقائده وأعضائه"
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "فلتر الفرع وحساب الفرع: الفرع بيشوف جزءه بس، ولو مفيش رئيس تنفيذي ظاهر الفرع هو القمة"
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "من غير إعداد: الرئيس التنفيذي والسكرتير يتستنتجوا من المسمى الوظيفي"
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "البحث بيعلّم الشخص أو الوحدة ويفتح الطريق ليه (بتطبيع الهمزات)"
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "العرض: كروت بخطوط ربط RTL، السكرتير كارت جانبي، والأعضاء والفتح والقفل"
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشاشة: فتح/قفل الكل، بحث، فلتر فرع، طباعة وتصدير، وإعداد الإدارة التنفيذية لحساب الشركة"
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشواغر في الهيكل: شاغر الوحدة = وظائفها وكل اللي تحتها، والقمة كل شواغر الفروع الظاهرة، ومن غير وظائف الكروت زي ما هي"
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-01: الإدارة والقسم بأقسامهم الفرعية جوه فرعهم بس، والفريق بالظبط، والمش معروف مش مطابق"
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-02: الاختيارات مترابطة، واختيار مستوى أعلى بيشيل اللي تحته اللي مابقاش يصلح"
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-03: شريط الفلتر — أربع قوائم بـ«الكل»، والفرع المقفول، و«مسح الفلتر» لما يشتغل، وبيلف على الموبايل"
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-04: الشجرة مرة للجلسة — طلب واحد مشترك، والنسخة الجديدة من غير طلب، والتحديث بالطلب"
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-05: الخادم — قراءة المعاملات والشروط بمعاملات، وفلاتر المسير والصرف بأقسام الإدارة/القسم"
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-07: كشف البنوك — الفلتر في الخادم بمكان لقطة المسير، والإجماليات من الصفوف المفلترة"
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-06: الإجماليات بعد الفلتر بنفس حساب الخادم — البدلات وإقفال السنة والتأمينات"
    },
    {
      "file": "org-filter-wiring-ui.test.cjs",
      "name": "OFW-01: كل شاشة فيها موظفين متوصل فيها الفلتر الموحد، والقوائم القديمة للفرع/القسم/الفريق اتشالت"
    },
    {
      "file": "org-filter-wiring-ui.test.cjs",
      "name": "OFW-02: الشريط نفسه — أربع قوائم مترابطة بـ«الكل»، والفرع المقفول، و«مسح الفلتر»، وبيلف على الموبايل، والتحميل مرة للجلسة"
    },
    {
      "file": "org-filter-wiring-ui.test.cjs",
      "name": "OFW-03: الخادم — النداء بصلاحيات الشاشات، والمعاملات في اللي بيترقّم أو بيتجمّع هناك، والنداءات الجديدة في ملفات مستقلة"
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "الاستهداف بالترتيب: الشركة ← الفرع ← أقسامه ← موظفينه، ومن ساب الشغل مايتستهدفش"
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "قيمة البداية والوصف: مستخدم الفرع يبدأ من فرعه، والوصف بالعربي"
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "المكوّن: اختيار الفرع يعرض أقسامه وموظفينه بس، والمستويات والقفل على الفرع شغالين"
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "المكوّن بالفرق: فرق الفرع بس، متفلترة بالأقسام المختارة، وفلتر الفريق في الموظفين"
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "الشاشات: الجدول الأسبوعي بيعيّن لمدة بالمنتقي، وفترات الإضافي في شاشة الإضافي، وأيام العمل فيها رابط بس"
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "المقفول بيقول سبب القفل: خلية الوردية في وضع «عرض»، و«نشط» في الجدول الافتراضي"
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "أيام العمل: إسناد الجدول بالمنتقي الموحد (فرع ← قسم ← فريق ← موظفين)، والجدول الخاص بفرع مقفول على فرعه"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "25 دقيقة لا تتجاوز عتبة 30"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "155 دقيقة تبقى خامًا وتصبح 150 بعد التقريب"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "العتبة تفحص الثواني قبل إسقاطها من مقدار التقرير"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "السقف يأتي بعد التقريب مع علامة واضحة والصفري غير مفعل"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "الدقائق السالبة أو ما دون وحدة التقريب لا ينشئ ساعات"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "المعاينة تحفظ ثواني بصمة الدخول والخروج"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "تكرار نفس دقيقة الحضور لا يصنع بصمة خروج"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "اتجاه تصحيح الخروج لا يتحول إلى دخول ولو كان الدليل الوحيد"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "التصحيح المعتمد يغلب الخام باتجاهه"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "نوافذ البصمة تميز خروجًا وحيدًا ولا تختلق دخولًا"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "خروج الليلية يمتد على خط يوم بدء الوردية"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "التصحيح التالف يصبح سبب مراجعة ولا يختلق وقتًا"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "بصمة الأدلة ثابتة حتى قراءة جديدة وتتغير بتغير الدليل"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "سجل العمل الإضافي يعرض سبب النافذة المقفولة وحد الأثر الرجعي"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "المالك: اشتغل 10 ساعات ← 60 دقيقة"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "المالك: اشتغل 9 ساعات و40 دقيقة ← صفر (40 أقل من شرط الساعة)"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "المالك: جه متأخر ساعة ومشي بعد الميعاد بساعة (9 ساعات) ← صفر"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "المالك: جه بدري ساعة ومشي في ميعاده (10 ساعات) ← 60 دقيقة"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "المالك: لو الزيادة وصلت الشرط بتتحسب كلها ثم التقريب لتحت والسقف اليومي"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "المالك: ماكملش الساعات المطلوبة ← صفر ومفيش دقيقة بداية إضافي"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "الاستراحة غير المدفوعة ووقت الإذن جوه المدة بيتخصموا من الشغل الفعلي"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "نص يوم إجازة بيقلل الساعات المطلوبة زي الحضور"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "وردية ليلية: الشغل على خط يوم البداية"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "الفترة المقفولة: نقص البصمات أو الزيادة الأقل من الشرط مابيمنعوش التقديم، والمفتوحة والمستثنى والمكتشف زي ما هم"
    },
    {
      "file": "overtime-evidence.test.cjs",
      "name": "خدمة الحضور بتقيس إضافي يوم العمل بالشغل الفعلي مش بنهاية الوردية"
    },
    {
      "file": "overtime-legal-minimum.test.cjs",
      "name": "OLU-01: مصر — نهار العمل 1.35 ويوم الراحة 2، والعطلة الرسمية من غير حد، وقبل سريان الصف مفيش"
    },
    {
      "file": "overtime-legal-minimum.test.cjs",
      "name": "OLU-02: السعودية — 1 + 50% × (الأساسي ÷ الإجمالي) لأي نوع يوم، مقرّب لفوق لمنزلتين"
    },
    {
      "file": "overtime-legal-minimum.test.cjs",
      "name": "OLU-03: المعامل المطبّق = الأعلى، واللقطة للحد القانوني لما هو اللي اتطبق بس"
    },
    {
      "file": "overtime-legal-minimum.test.cjs",
      "name": "OLU-04: مصدر الكود — ورا الإعداد المقفول في أدلة الإضافي، والأرقام من الحزمة، والتفعيل من مسار الحسابات القانونية"
    },
    {
      "file": "overtime-legal-minimum.test.cjs",
      "name": "OLU-05 (P4A-B01): صف «محتاج تحقق» في يوم الإضافي = مفيش حد قانوني — حتى لو صف أحدث منه «اتأكد»"
    },
    {
      "file": "overtime-seed.test.cjs",
      "name": "OT-04 seed: new installation has three ordered approval steps and rerun does not duplicate them"
    },
    {
      "file": "overtime-seed.test.cjs",
      "name": "OT-04 seed: customized existing shared overtime chain and request definition remain unchanged"
    },
    {
      "file": "overtime-seed.test.cjs",
      "name": "OT-04 seed: failure while adding steps leaves no partial overtime chain or request type"
    },
    {
      "file": "overtime-workflow-migration.test.cjs",
      "name": "OT SQL005 contains only six nullable additions and separate claim/event tables"
    },
    {
      "file": "overtime-workflow-migration.test.cjs",
      "name": "OT SQL005 later DDL failure rolls back additions and preserves old duplicate entries"
    },
    {
      "file": "overtime-workflow-migration.test.cjs",
      "name": "OT SQL005 matches metadata and leaves every historical snapshot NULL without backfill"
    },
    {
      "file": "overtime-workflow-migration.test.cjs",
      "name": "OT runtime guard rejects historical active duplicates without deleting either row"
    },
    {
      "file": "overtime-workflow-migration.test.cjs",
      "name": "OT filtered unique guard permits a replacement only after release and preserves immutable events"
    },
    {
      "file": "overtime-workflow-migration.test.cjs",
      "name": "OT SQL005 replay preserves all legacy values and existing audit bytes"
    },
    {
      "file": "page-titles-ui.test.cjs",
      "name": "every sidebar item opens a screen whose header title is the same words"
    },
    {
      "file": "page-titles-ui.test.cjs",
      "name": "the heading inside the screen says the same words as its header and its sidebar item"
    },
    {
      "file": "page-titles-ui.test.cjs",
      "name": "the employee screens that had no title (deductions and bonuses) have one now, and the renamed screens match the sidebar"
    },
    {
      "file": "page-titles-ui.test.cjs",
      "name": "no raw user number and no latin system name on the screens"
    },
    {
      "file": "page-titles-ui.test.cjs",
      "name": "the money screens speak plainly: no ledger words, and the payslip says what was cancelled"
    },
    {
      "file": "payroll-allowances-ui.test.cjs",
      "name": "تابة «البدلات» آخر تابة في شاشة المسير وبتفتح المسير من الجدول"
    },
    {
      "file": "payroll-allowances-ui.test.cjs",
      "name": "التابة: الشهر والبحث، والمنتقي الموحد، والإجماليات، والإلغاء"
    },
    {
      "file": "payroll-allowances-ui.test.cjs",
      "name": "القسيمة: البدل سطر باسمه والباقي «إضافات أخرى»، والمجموع هو عمود الإضافات"
    },
    {
      "file": "payroll-allowances.test.cjs",
      "name": "الشركة كلها: كل الشغالين في أي فرع (واللي ساب الشغل أو متوقف حسابه برا)"
    },
    {
      "file": "payroll-allowances.test.cjs",
      "name": "الفرع: موظفين الفرع بس، ومن غير فرع مفيش حد"
    },
    {
      "file": "payroll-allowances.test.cjs",
      "name": "الأقسام والفرق جوه فرع الاستهداف بس"
    },
    {
      "file": "payroll-allowances.test.cjs",
      "name": "الموظفين بالاسم جوه الفرع، من غير تكرار ومرتبين"
    },
    {
      "file": "payroll-allowances.test.cjs",
      "name": "مبلغ البدل: موجب بمنزلتين بحد أقصى ومن غير تقريب صامت"
    },
    {
      "file": "payroll-allowances.test.cjs",
      "name": "اسم البدل والكود: بدل العطلات محجوز لأوامر الشغل، والكود بيتولد لو فاضي"
    },
    {
      "file": "payroll-allowances.test.cjs",
      "name": "أرقام قيود الدفتر من نافذة التفصيل"
    },
    {
      "file": "payroll-allowances.test.cjs",
      "name": "حالة السطر: ملغى، اتصرف/اتعكس، في مسير معتمد، محسوب أو محتاج إعادة حساب، مستني"
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-01: الشريط يقول مين اعتمد ومين عليه الدور، ومسير بلا سلسلة مايعرضش حاجة"
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-02: صاحب الخطوة يشوف «اعتمد خطوتي» و«ارفض بسبب»؛ الممنوع بفصل المهام يشوف السبب والأزرار مقفولة"
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-03: سبب الرفض ظاهر لمسؤول الرواتب، وبعد إعادة الحساب يفضل آخر رفض ظاهر كتاريخ"
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-04: محرر السلسلة — الخطوات بالترتيب باسم الشخص، بحث بالاسم أو الكود، ودور كبديل؛ والحفظ بيبعت الشخص أو الدور فقط"
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-05: شاشة المسير — الشريط محمّل مع المسير، وزرار الاعتماد بخطوة واحدة مابيظهرش لمسير تحكمه سلسلة، وباقي الشاشة كما هي"
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "DISB-UI-01: «صرف الرواتب» — الفلاتر والعلامة والتعليم الجماعي والإجماليات من الخادم، والتصدير بنفس الصفوف، وبلا حساب فلوس في المتصفح"
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "DISB-UI-02: جدول الصرف بالبيانات — خانة «تم الصرف» للصف القابل للتعليم لحامل payroll.disburse فقط، وصف التصفية والمقفول شارة بلا خانة، والإجماليات كما جت من الخادم"
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-06: مراجعة المعتمد — إجماليات المسير وموظفوه ببنودهم، والصافي السالب ظاهر قبل الاعتماد النهائي"
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "NAV-01: الشاشات التلاتة ليها اسم واحد في القائمة والهيدر والجسم، ومفتوحة لأصحابها حتى بلا payroll.view"
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-01: خطوات السلسلة تتنضف وتترتب، وأسماء الخطوات الافتراضية «مراجعة N» والأخيرة «الاعتماد النهائي»"
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-02: بصمة السلسلة = هوية المعتمدين بترتيبهم؛ اسم الخطوة برّاها، وأي تغيير في شخص أو ترتيب يغيّرها"
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-03: التقدم — الخطوات بالترتيب، والمسير يفضل منتظر صاحب أول خطوة مش معتمدة"
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-04: القرارات تخص نسخة حساب واحدة وبصمة سلسلة واحدة — نسخة أقدم أو قرار ملغى أو بصمة قديمة لا تُحتسب"
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-05: الرفض بسبب يرجّع نسخة الحساب لمسؤول الرواتب — مفيش خطوة حالية، وتغيير السلسلة مايمسحش الرفض"
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-06: مسير معتمد أو مصروف — الشريط من القرارات نفسها (تاريخ ثابت مهما اتغيرت السلسلة)، ومسير اتعتمد بخطوة واحدة بلا شريط"
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-07: صاحب الخطوة — الشخص المسمّى برقمه، والدور بكود دور التوكن"
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-07b: حل سلسلة المسير — الخاصة باسمه الدائم أولًا ثم سلسلة الشركة؛ سلسلة بلا خطوات = غير موجودة؛ بلا أي سلسلة = null (الاعتماد بخطوة واحدة)"
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-08: خطافات المسير الكبير قليلة ومحددة — الاعتماد القديم يتحقق من السلسلة، وآخر خطوة تنادي approveLocked نفسها، والقسيمة على APPROVED/PAID كما هي"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "input check before sending: type, positive value, two decimals for a fixed amount, reason length, target payroll month"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "status badge: «معتمد — بانتظار الصرف» until the ledger entry is consumed by a paid run, then the paid colour; one money formatter with deductions"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "API client: every call goes through apiFetch, bulk submits the preview hash, decisions carry the expected revision"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "workspace (money-requests simplification): one selection list (an employee is a group of one), a team, a department or a branch; «إرسال» previews internally and sends that preview hash; the table appears only when somebody is excluded or refused; catalog behind bonuses.manage"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "money requests (B3/B4): both financial catalog cards open their own form in place, the generic engine refuses them, and the audience gates creating"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "B4: the seeded money types match the live rows — one row each, no approval chain, and an audience limited to the people the owner picks"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "pages: /payroll/bonuses inside MainLayout with the admin workspace, opened prefilled by employee and month from the run row modal’s group link, without the legacy BONUS requests table; /my/bonuses shows the employee his bonuses plus the manager workspace"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "«مكافأة» على صف المسير بتفتح نافذة مكانها: نفس نمط «شيل خصم» و«نقل لمسير آخر»، بلا انتقال لشاشة المكافآت"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "نافذة المكافأة: نفس نقطة الإنشاء الفردي ونفس المعاينة والفحص وبوابة المجموعات — بلا حساب مال ولا نقطة خدمة جديدة"
    },
    {
      "file": "payroll-bonuses-ui.test.cjs",
      "name": "نافذة المكافأة: رسالة الخادم العربية على النموذج، وسطر تأكيد باسم سلسلة الاعتماد وشهر المسير — زي نافذتي الخصم والنقل"
    },
    {
      "file": "payroll-bonuses.test.cjs",
      "name": "EX-05 catalog: defaults (100% of base cap, one-day escalation to the department manager, HR last), code immutable, version bump only on financial fields"
    },
    {
      "file": "payroll-bonuses.test.cjs",
      "name": "EX-05 SRS example: 2 days at a 375.00 day rate = 750.00 and escalates above one day; a fixed 1,500.00 on base 9,000 stays under the cap"
    },
    {
      "file": "payroll-bonuses.test.cjs",
      "name": "EX-05 rule 2: 9,500 on base 9,000 exceeds the 100% cap — rejected without bonuses.exceed_cap, accepted with it"
    },
    {
      "file": "payroll-bonuses.test.cjs",
      "name": "EX-05 limits: step 0.25, minimum, maximum, zero salary, decimals are exact (cut at 2 decimals, no rounding)"
    },
    {
      "file": "payroll-bonuses.test.cjs",
      "name": "EX-05 rule 1 chain: an escalated bonus from a direct manager inserts the department manager before HR; a department-manager proposer skips his own step"
    },
    {
      "file": "payroll-bonuses.test.cjs",
      "name": "EX-05 settings and payout state: bonuses.* keys validate their ranges; «paid» only after the ledger entry is applied"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "context binds scope/id and AbortSignal, preserving nullable global/branch values"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "foreign/stale identity and malformed scope rows cannot initialize mutation"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "branchless employee context is readable and does not invent an assignment"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "scope guard does not treat star permissions as unlimited branch scope"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "metadata requires explicit actual date, ordered history and bounded reason; same-date correction allowed"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "forged evidence revision/hash/extra keys are discarded in favor of read server context"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "whole-scope unchanged confirmation sends only scope identity and metadata; verifies new revision"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "confirmation rejects stale revision/effective date/current drift/changed hash without automatic retry"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "holiday and exceptional-rule DELETE retain dated body and URL"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "rule toggle cannot bind a stale list decision to a newer calendar hash"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "existing config/branch writes preserve narrow nested metadata without polluting other config values"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "unchanged employee branch omits branch and forged command despite missing context, preserving noncalendar changes"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "employee change and explicit unchanged confirmation require EMPLOYEE context and dated evidence"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "actual calendar fields SSR starts blank, has date lower bound, and disables missing/drift context"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "actual calendar summary displays counts/undated status and drift without fabricated history"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "whole-scope confirmation summary exposes every holiday range and inactive exceptional rule for review"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "employee edit shows the branch/schedule change line only when branch or schedule actually changes (no version text, no confirmation box)"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "employee creation shows no branch/schedule date box and keeps the server creation fallback without joinDate inference"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "schedule separates dated calendar classification from timing and shows daily blocker/source reference"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "attendance proof renders verified exact seconds and source refs; missing proof never supplies zero"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "unavailable or unknown proof cannot expose stale financial facts; nonworking proof says not applicable"
    },
    {
      "file": "payroll-calendar-ui.test.cjs",
      "name": "confirmed zero totals remain zero while absent totals stay unproved"
    },
    {
      "file": "payroll-chain-disbursement-migration.test.cjs",
      "name": "CHAIN-MIG-01: الترحيلان إضافيان بالكامل ومتوافقان مع SQL Server 2019 ويمرّان من فحص المُرحّل النصي بأكواد THROW فريدة"
    },
    {
      "file": "payroll-chain-disbursement-migration.test.cjs",
      "name": "CHAIN-MIG-02: كل أعمدة الكيانات وقيودها وفهارسها موجودة في ترحيلها بأسمائها، وكل إنشاء محروس فيعاد تشغيله بأمان"
    },
    {
      "file": "payroll-chain-disbursement-migration.test.cjs",
      "name": "CHAIN-MIG-03: المُرحّل المجمّع يطبق الملفين (معاملة لكل ملف والفحص الفعلي)، وفرق مخطط TypeORM للكيانات الثلاثة = صفر، وإعادة التشغيل لا تغيّر شيئًا"
    },
    {
      "file": "payroll-chain-disbursement-migration.test.cjs",
      "name": "CHAIN-MIG-04: قيود القاعدة شغالة — خطوة معتمدة مرة واحدة لنسخة الحساب، رفض بلا سبب مرفوض، وعلامة صرف واحدة لكل بند"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 discovers exactly one nullable NVARCHAR(MAX) column with no default, table, index or backfill"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 metadata diff is only its nullable field and omitted NULL still requires exact field nullable evidence"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 does not widen authored SQL permission to writes, destructive changes, cross-database names or required columns"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 disposable execution guards reject source, retained-review and unguarded database handles before queries"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 late SQL failure rolls back its column and ledger row with all historical policy and loan bytes intact"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 a truncated column type cannot pass full metadata validation or leave a partial migration"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 an unrelated additive operation cannot substitute for required policy metadata"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 commits above immutable 006–009 with every prior field preserved, historical NULL and no remaining schema queries"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 stores long Arabic non-policy JSON and decimal strings exactly, and recognizes only the complete textual policy shape"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 malformed JSON, JSON null and non-object values stay INVALID and clone/save preserves their original bytes"
    },
    {
      "file": "payroll-collection-policy-migration.test.cjs",
      "name": "010 replay preserves collection bytes, all earlier checksums and rejects changed or missing migration history"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "classifications normalize by complete definition order while owner collection ranks remain unchanged"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "all nine source classes are accepted with protected classes outside owner ordering"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "inactive deductions remain mandatory and inactive loan definitions retain debt protection"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "empty or protected-only collections are valid without inventing reducible priorities"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "each deduction is classified exactly once; unknown, earning, INFO, and duplicate targets are rejected"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "collection order requires every reducible once, excludes protected, and never sorts owner choices"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "LOAN if and only if LEDGER DEBIT; credits remain earnings and cannot be disguised as loans"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "carry eligibility comes from the definition and matches the NET guard for attendance/protected/debt"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "historical missing differs from invalid; malformed stored values never fall back to a policy"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "definition edits invalidate stale classifications, order, source mapping, or carry policy"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "definition-only ordering edits canonicalize classifications but never overwrite collection ranks"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "builder derives evidence and carry flags from stored definition and preserves exact fractions"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "builder exact huge decimal cents and formatted 60-digit bases never pass through Number"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "builder rejects supplied classification evidence, flags, financial Numbers, and malformed evidence"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "strict version, keys, code lengths, and collection scalar types are enforced"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "definition shape, duplicates, metadata enums and ledger direction are validated before use"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "accessors anywhere in raw policy, definition, or evidence are rejected without invocation"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "custom prototypes, sparse arrays, symbols and hidden keys are closed on every public path"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "explicit technical limits reject excessive components, keys, text and cyclic nesting"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "DTO requires full shape and exact enums, with raw unknown-field rejection delegated to strict helper"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "stored collection builds the actual NET input and user rank controls a full pure financial finalization"
    },
    {
      "file": "payroll-collection-policy.test.cjs",
      "name": "normalized, inspected and built outputs are deeply frozen, JSON-safe and leave caller objects untouched"
    },
    {
      "file": "payroll-collection-storage.test.cjs",
      "name": "actual metadata declares nullable nvarchar MAX and SQL null alone is MISSING"
    },
    {
      "file": "payroll-collection-storage.test.cjs",
      "name": "JSON literal null and surrounding whitespace remain INVALID raw text rather than SQL null"
    },
    {
      "file": "payroll-collection-storage.test.cjs",
      "name": "JSON scalars including unsafe numbers are wrapped before reserialization can change them"
    },
    {
      "file": "payroll-collection-storage.test.cjs",
      "name": "arrays and syntax errors survive clone byte-for-byte and never become a usable collection"
    },
    {
      "file": "payroll-collection-storage.test.cjs",
      "name": "persisted objects resembling the internal wrapper cannot unwrap or replace their own raw value"
    },
    {
      "file": "payroll-collection-storage.test.cjs",
      "name": "valid policy document stays usable and retains values after JSON cloning through actual transformer"
    },
    {
      "file": "payroll-collection-storage.test.cjs",
      "name": "invalid object values cannot lose nonfinite or unsafe numeric content during clone"
    },
    {
      "file": "payroll-collection-storage.test.cjs",
      "name": "wrapper to only unwraps the exact internal two-field marker and raw string shape"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "missing collection leaves explicit choices blank except locked ledger loans; inactive deductions remain"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "saved order survives initialization exactly; payload contains only closed collection fields"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "protected classification leaves order; explicit return appends without reordering other items"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "loan kind cannot be changed and nonledger kind cannot become loan"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "quick proposals are stable and leave protected deductions outside owner order"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "up/down is bounded, immutable and moves one priority at a time"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "carry contradictions are visible and cannot become save payload"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "missing/duplicate kinds and incomplete/protected orders are rejected before save"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "SSR includes inactive rows and a locked loan select; protected tax has no reorder controls"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "SSR editing follows the server capability (payroll.policy.manage + branch scope), not payroll.calculate"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "SSR blocks missing/invalid settings or definition and explains actual server issues"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "SSR distinguishes initializing collection, invalid replacement and copy-on-write"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "empty deductions are a legitimate complete definition, not fake default components"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "API wrapper uses exact routes, review revision and reason without additional fields or autosave"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "HTTP conflict is surfaced without retry or mutation; 404 tells the user to update service or reload version"
    },
    {
      "file": "payroll-collection-ui.test.cjs",
      "name": "payroll policy route has its own Arabic title before generic payroll prefix"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "six implemented sources use ordered rounded COMP and totals exclude INFO and deferred NET"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "all time units convert with exact supplied rates; INFO retains hours without conversion"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "facts exact fractions flow into components without using displayed six-place amounts"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "pipeline prorates then min/max then percent cap, preserving every exact intermediate"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "rounded monetary COMP, not raw source, feeds later formulas and mixed-scale totals"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "INFO rounding stays in its unit and negative INFO does not affect financial totals"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "negative earning and negative deduction clamp terminally without min resurrection"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "zero factor and zero conversion rate cannot conceal negative raw money before min"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "missing employee SKIP bypasses min; ZERO follows normal pipeline and warns"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "inactive and false conditions skip source reads and min without claiming unsupported ledger output"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "missing catalog variable is zero with warning but lazy unread refs have no warning or source provenance"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "division by zero follows frozen mode and lazy unselected denominator does not fail"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "FULL exemption preserves calculated amount and source decision but rejects non-deduction or unexemptible targets"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "ordinary balance may be negative before net caps; no policy net limit is executed here"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "intrinsic earned money and explicit metadata prevent direct and formula proration twice"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "direct period quantities cannot prorate again but their condition or performance ratio does not mark monthly money earned"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "already-prorated provenance survives rounded COMP and PERCENT_OF; conditional reference alone does not taint amount"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "IF condition-only earned references remain auditable without marking the selected monthly amount as prorated"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "INFO period count passed through COMP remains a quantity, explicit metadata and applied factors still propagate"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "working factor unavailable is harmless when unused and an explicit error when applied"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "approved OT amount is consumed once, informational formula may inspect it and COMP without claiming again"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "OT safeguards reject repricing, non-cent values, lossy rounding and a false overtime rollup"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "INFO OT hours and amount are unclaimed; false direct OT source does not reserve consumption"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "attendance exemptions skip direct deduction before min and preserve unpaid leave"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "policy skipAttendance and lateDeductionEnabled use the precise separate masks"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "constant and available-rate pairs must agree exactly without inventing absent rates"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "large exact salaries and fractions survive without Number or fixed six-place truncation"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "strict snapshot rejects unknown keys, numeric JSON money, missing metadata and invalid fractions even unused"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "plain-own contract rejects getters and custom prototypes before invocation"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "closed shape guards source metadata, factor bounds, source refs, sparse arrays and technical fraction bounds"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "definition is revalidated, future COMP references never become missing zero, and inputs stay unchanged"
    },
    {
      "file": "payroll-component-execution.test.cjs",
      "name": "shared execution budget stops repeated exact arithmetic across many individually valid components"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "due preCaps sources are exact and contain no budget, collection or financial posting claims"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "allocation is separate and preserves 1666 as paid400 plus proposed1266 with supplied budget only"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "zero budget retains full principal and fractional cents never enlarge the usable budget"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "BLOCK uses frozen policy mode and extends after complete future tails without reducing salary"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "manual deferral preserves raw due amount while allocation defers even with sufficient budget"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "manual tails and successive skipped installments retain the existing kernel schedule rules"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "CREDIT obligations return due additions in full and cannot enter installment collection"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "DEBIT obligations fail explicitly rather than silently becoming synthetic loan installments"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "kind plus identity rejects duplicate mappings while raw IDs and source request refs can be shared across legitimate rows"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "one loan cannot be split between policy components with conflicting choices"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "explicit category mapping is case sensitive and wildcard belongs only to the policy component"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "principal rejects proration min max percentage cap rounding below cents and disabled carry"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "credit also preserves its exact source principal through policy rounding and rejects amount-changing limits"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "inactive and conditional ledger components need no source row and valid inactive mappings remain available for core skip"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "source priority is separate from component reduction priority and ties follow original due sequence and ref"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "separate component allocation keeps source assignments and manual decisions scoped to their own component"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "maximum SQL decimal values keep exact cents and aggregate beyond safe Number without binary conversion"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "numeric strings are mandatory and overprecision signs exponent notation and SQL overflow fail"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "unknown fields spoofed modes missing required fields invalid refs and unsafe integers are rejected before resolution"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "monthly periods and future tails validate explicitly with no current clock or implicit extension"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "manual decisions cannot target future closed unknown or duplicate installments nor an earlier period"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "plain JSON guards reject prototype pollution getters hidden fields sparse arrays and oversized inputs"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "invalid settings and definitions are not backfilled or silently stripped"
    },
    {
      "file": "payroll-component-ledger-source.test.cjs",
      "name": "preparation and allocation are deterministic deeply frozen and independent of caller mutation"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-04 catalog includes every SRS scalar plus immutable approved OT amount, with versioned descriptions"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-04 reference namespaces and legacy aliases are excluded from scalar symbols"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-04 symbols reject reserved names, malformed codes, duplicates and component-parameter collisions"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-04 accepts independent typed references, valid boundary codes and system NET only as a component"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-04 symbol groups form a closed own-property contract with a 200-symbol technical bound"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 explicit stages and previous references give an executable active order without input mutation"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 two-node and indirect cycles report the complete deterministic repeated-endpoint path"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 self dependency reports A → A and cannot be auto-corrected"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 manual forward reference names both components and offers a within-stage correction"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 auto-order fixes within-stage sequence only and warns without activating or removing anything"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 forward references across stages are rejected even with auto-order"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 missing and disabled dependencies are explicit failures for active and disabled dependents"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 sequence duplicates are rejected manually and deterministically renumbered in auto mode"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 duplicate component and dependency codes are never silently removed"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 NET is mandatory, active, in stage six and last; complete empty graphs fail"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 no component can depend on final NET even if its manual sequence suggests otherwise"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 hostile shapes, names, stage/sequence numbers and options return structured errors"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 limit boundaries permit a 200-node chain and reject oversized component or dependency lists"
    },
    {
      "file": "payroll-component-order.test.cjs",
      "name": "PL-06 deterministic branching DAG proposals remain identical across input and dependency permutations"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "TIERED value is exactly the sum of daily rounded lines, never rounded aggregate raw amount"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "repeating intermediate rates remain exact through LT reference example"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "daily and period caps preserve oldest-first line allocation and every reduction"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "PER_DAY and PERIOD_ACCUMULATED retain different LT06 semantics"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "OCCURRENCE_COUNT counts only effective nonexempt days and preserves daily evidence"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "MARGINAL fixed and day-fraction enter fully at inclusive lower bound; zero never creates a charge"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "permissions, seconds, shift grace, minute rounding and grace-use limits keep their order"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "disabled attendance and exempt days do not evaluate unavailable formula operands or consume grace"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "empty daily sample has zero value without requesting unused COMP"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "exact context transports a recurring fraction without canonical truncation and keeps used references"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "missing executed COMP rejects instead of preview missing-input zero, but lazy unused branch needs no value"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "COMP in an IF condition stays in audit references without becoming an amount contributor"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "COMP in the selected amount branch remains a value contributor even when also read by the IF condition"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "stored active parameters feed formulas; caller parameters and future components cannot be forged"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "monthly rates and policy constants must agree exactly with the existing execution context"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "BASE/GROSS keep their general context meaning unless a tier formula actually consumes them"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "source min and proration cannot revive or double-charge tiers; later reducing caps remain permitted"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "inactive, unknown, wrong-source and unit or multiplier mutations fail without silent source invention"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "generic stored tier input formula and non-lateness variables reject until a source provider exists"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "policy tier rounding is preserved as the source precision rather than applying component rounding to the sum"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "large salary cents remain exact and caller snapshots are detached, normalized and immutable"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "replay with reordered input days and map insertion order produces identical trace and exact total"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "closed day input rejects forged totals, foreign maps, bad dates, unsafe money and missing reference"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "strict plain snapshots reject getters, hidden fields, symbols, cycles and custom prototypes without invoking getters"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "exact contexts reject numeric approximations, unknown names, prototype attacks and computed Decimal fields"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "shared caller budget is propagated through preview and its exact tier kernel"
    },
    {
      "file": "payroll-component-tier-source.test.cjs",
      "name": "public preview keeps its existing JSON contract while internal exact preview is separate and fail-closed"
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "النداءات عبر ملف API واحد بمسارات الخادم، ولا fetch مباشر، والمبالغ بالمنسّق الموحد"
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "اللوحة: الإنشاء يرسل بصمة المعاينة، ومعطل قبل معاينة حالية غير ممنوعة وسبب مستوفٍ، وموانع الخادم تُعرض"
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "شاشة المسير (تبسيط الرواتب): لوحات العكس والتكميلي ولقطة السياسة ومحرك الحساب و«بلا مسير» والإعفاء المالي لا تُعرض، وملفاتها وأنواع الـAPI باقية"
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "القسيمة وقسائمي (تبسيط الرواتب): بلا شريط عكس الصرف ولا قسيمة التكميلي ولا علامتيهما، وسجل المسير (غير المعروض) يبقى يسمي أحداث التصحيح"
    },
    {
      "file": "payroll-corrections-ui.test.cjs",
      "name": "السلف وتقارير الرواتب: القسط المُلغى بعكس الصرف وحركة REVERSAL بتسميات عربية، وتقرير المسيرات (تبسيط الرواتب) بلا مسيرات العكس والتكميلي وسطورها، والـAPI يبقى يسميها"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "تنبيهات الإعفاء عند العكس: إعفاء الحضور يُنقل للتكميلي، و«كل الخصومات» لا يُنقل، والإسقاط أو التأجيل المنفذ يبقى؛ بلا إعفاء لا تنبيه"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "نقل الإعفاء للتكميلي: خصومات الحضور (التأخير والنقص والغياب نوعًا أو يومًا) فقط"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "حالة السلفة عند إعادة فتحها بالعكس: المسجلة في حركة الصرف أولًا، وللحركات القديمة من تاريخ الصرف، والتعارض مانع"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "نوع المسير: null وأي قيمة أخرى = أصلي؛ العكس والتكميلي بأسمائهما العربية"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "سبب التصحيح: 20 حرفًا على الأقل وثلاث كلمات مختلفة، والرفض برمز PAYRUN-CORRECTION-REASON"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "لقطة البند المعكوس: مبالغ بخانتين، والبصمة ثابتة وتتغير بأي مبلغ أو تفصيل"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "تقرير التسويات: المصروف − المعكوس المنفذ = الصافي الفعلي، وفرق التسوية = التكميلي المصروف − المعكوس المنفذ"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "شرط SQL للبند المعكوس: سطر منفذ للمسير والموظف، ويرفض أي تعبير غير عمود أو معامل"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "رصيد الأقساط: الأصل المستحق بعد العكس مع ابن ترحيل مُلغى (REVERSED) صالح بلا رصيد للابن"
    },
    {
      "file": "payroll-corrections.test.cjs",
      "name": "رصيد الأقساط: ترحيل جديد بعد العكس يعيد تفعيل الابن نفسه؛ الابن المُلغى لا يُحتسب ابنًا حيًا، ويُرفض المُلغى بلا أصل أو المدفوع"
    },
    {
      "file": "payroll-daily-accrual-migration.test.cjs",
      "name": "ACR-MIG-01: الترحيل إضافي بالكامل — بلا حذف ولا تعديل ولا تعبئة رجعية"
    },
    {
      "file": "payroll-daily-accrual-migration.test.cjs",
      "name": "ACR-MIG-02: كل أعمدة الكيان موجودة في الترحيل بنفس النوع والقابلية للإفراغ"
    },
    {
      "file": "payroll-daily-accrual-ui.test.cjs",
      "name": "ACR-UI-01: عميل الـAPI بيعرّف قراءة التراكم وتحديثه على مسارات الخادم نفسها"
    },
    {
      "file": "payroll-daily-accrual-ui.test.cjs",
      "name": "ACR-UI-02: شاشة المسير بتعرض «آخر يوم محسوب» وزرار «حدّث الحساب» للمسير المفتوح بس"
    },
    {
      "file": "payroll-daily-accrual-ui.test.cjs",
      "name": "ACR-UI-03: نصوص الشاشة عربية بسيطة بلا مصطلحات تقنية"
    },
    {
      "file": "payroll-decision-settings.test.cjs",
      "name": "configSeed carries every decision key with the chosen owner value (D1, D2, D3, D5, D10, D11)"
    },
    {
      "file": "payroll-decision-settings.test.cjs",
      "name": "PATCH /settings/config validation: monthly days only 30 and closed or bounded decision values"
    },
    {
      "file": "payroll-decision-settings.test.cjs",
      "name": "أ4: لا ترتيب تداخل بين التأخير والنقص — كل خصم يُحتسب كما جاء، مهما كانت سياسة التداخل المحفوظة"
    },
    {
      "file": "payroll-decision-settings.test.cjs",
      "name": "أ4: لا سقف يومي لخصم الحضور — التأخير والنقص يتجاوزان قيمة اليوم ولا يُقتطع منهما شيء"
    },
    {
      "file": "payroll-decision-settings.test.cjs",
      "name": "D1: early leave on a fixed shift is deducted at the minute rate unless the setting is off; flex shifts keep the shortfall rule"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "الشركة كلها بتطابق أي موظف في أي فرع"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "الفرع بيطابق موظفين الفرع بس"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "الأقسام والفرق جوه فرع القاعدة بس"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "الموظفين بالاسم، ومستوى غير معروف ما يطابقش"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "الأنواع المشالة: كل قاعدة مطابقة بنوعها، والنوع الغلط يتجاهل"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "يوم الحضور: التأخير ومعاه الإذن، والخروج المبكر على الثابتة ونقص الساعات على المرنة"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "قيود الدفتر: المسجلة والأخرى بتتشال، والإضافات لا"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "مجاميع ظل الحضور بنفس القرار، والنقص يتصفر بس لما النوعين مشالين"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "أرقام الاستهداف المحفوظة JSON"
    },
    {
      "file": "payroll-deduction-waivers.test.cjs",
      "name": "الحساب موصول بالقاعدة: الخدمة بتقرا القواعد وتطبقها على كل نوع"
    },
    {
      "file": "payroll-disbursement.test.cjs",
      "name": "DISB-01: وضع الصرف — بلا علامات (لم يبدأ / اتصرف كله مرة واحدة) أو موظف بموظف، ومتى التعليم مفتوح"
    },
    {
      "file": "payroll-disbursement.test.cjs",
      "name": "DISB-02: الصفوف من نفس دوال كشف البنوك (مصدر واحد)، وصف التصفية والصافي صفر لا يُعلَّمان"
    },
    {
      "file": "payroll-disbursement.test.cjs",
      "name": "DISB-03: صف «تم الصرف» بتقسيمه المثبت وقت العلامة، والتعليم بعد الإقفال للي لسه ماتصرفلوش بس"
    },
    {
      "file": "payroll-disbursement.test.cjs",
      "name": "DISB-04: الفلاتر كلها مع بعض — الفرع والقسم والفريق وطريقة الصرف والحالة والبحث بالاسم أو الكود"
    },
    {
      "file": "payroll-disbursement.test.cjs",
      "name": "DISB-05: الملاحظة اختيارية بحد أقصى، ومتقصوصة"
    },
    {
      "file": "payroll-disbursement.test.cjs",
      "name": "DISB-06: خدمة الصرف لا تكتب غير جدول العلامات وحدث المسير، وآثار الصرف تفضل في pay() وحده مرة واحدة، وإعادة الفتح مرفوضة بعد أول علامة"
    },
    {
      "file": "payroll-employment.test.cjs",
      "name": "PR-10 coverage includes a terminated employee through the last working day: 18 inclusive days"
    },
    {
      "file": "payroll-employment.test.cjs",
      "name": "PR-10 actual start controls 22-day coverage; employment outside the period is excluded"
    },
    {
      "file": "payroll-employment.test.cjs",
      "name": "PR-10 inclusive boundaries count one day and a cancelled case does not terminate employment"
    },
    {
      "file": "payroll-employment.test.cjs",
      "name": "PR-10 archive fallback is explicit and an old closed case cannot terminate a later hire"
    },
    {
      "file": "payroll-employment.test.cjs",
      "name": "PR-10 unknown or ambiguous employment end cannot silently create a full salary"
    },
    {
      "file": "payroll-employment.test.cjs",
      "name": "PR-10 suspension is not an undocumented termination and an ambiguous rehire cannot silently vanish"
    },
    {
      "file": "payroll-employment.test.cjs",
      "name": "OWNER-1 الموقوف عضو في المسير مهما كانت isActive وما بقاش له كود استبعاد SUSPENDED"
    },
    {
      "file": "payroll-employment.test.cjs",
      "name": "OWNER-2 المؤرشف بتاريخ آخر يوم عمل يأخذ أجر أيامه، وبلا تاريخ يُستبعد بسبب واضح، وبعد شهره يختفي"
    },
    {
      "file": "payroll-employment.test.cjs",
      "name": "OWNER-1 سطر حالة الإيقاف على صف الموظف: «موقوف من … إلى …» و«رجع نشط من …»"
    },
    {
      "file": "payroll-engine-ui.test.cjs",
      "name": "payslip: the lateness tier effect row shows minutes, range, multiplier and formula from the saved breakdown"
    },
    {
      "file": "payroll-engine-ui.test.cjs",
      "name": "أ1: اختيار الشرائح بالشهر أُلغي من الواجهة — لا دالة «المجموعة السارية لشهر»"
    },
    {
      "file": "payroll-engine-ui.test.cjs",
      "name": "engine panel: SHADOW badge, parity totals, each difference with legacy/policy/system reason and the written reason when present"
    },
    {
      "file": "payroll-engine-ui.test.cjs",
      "name": "engine panel: approval readiness from the server check, the source plan with a remedy per code, and unavailable values shown as needing a written reason (not \"cannot be explained\")"
    },
    {
      "file": "payroll-engine-ui.test.cjs",
      "name": "screens are wired (payroll simplification): the run page no longer shows the snapshot and engine panels, recalculation always refreshes to the current formula with the shown fingerprint, dated editor on formulas, tier effect on the payslip; legacy tier writes removed"
    },
    {
      "file": "payroll-financial-exemptions-ui.test.cjs",
      "name": "النداءات عبر ملف API واحد، ولا fetch مباشر ولا أرقام عربية في مكونات الإعفاء"
    },
    {
      "file": "payroll-financial-exemptions-ui.test.cjs",
      "name": "شاشة المسير: «شيل خصم» على صف الموظف ببوابة صلاحية المنح، بكل بنود استقطاعه ومعاينة إلزامية وسبب مكتوب، ثم إعادة حساب تلقائية بآخر معادلة"
    },
    {
      "file": "payroll-financial-exemptions-ui.test.cjs",
      "name": "القسيمة: كل خصم ملغى سطر واحد «أُلغي خصم <البند> بمبلغ <المبلغ>» بلا رقم الإعفاء ولا المانح، والبند في موضعه بين الخصومات"
    },
    {
      "file": "payroll-financial-exemptions-ui.test.cjs",
      "name": "حد مرفق الإعفاء المالي يرجع كما كان — الموجة لا تضيف اشتراطًا"
    },
    {
      "file": "payroll-financial-exemptions-ui.test.cjs",
      "name": "صفحتا «الإعفاءات المالية» و«إعفاءاتي» تتحولان بلا مداخل جانبية، والـAPI باقٍ"
    },
    {
      "file": "payroll-financial-exemptions.test.cjs",
      "name": "EX-01: كل الخصومات تُصفّر التأخير والغياب والجودة وتؤجل القسط، والنظامي يبقى، والمُسقط 2,472.22"
    },
    {
      "file": "payroll-financial-exemptions.test.cjs",
      "name": "EX-02: نوع التأخير يُصفّر 159.72 ويُبقي الغياب والجودة؛ يوم غياب واحد يُصفّر 375 ويبقي اليوم الآخر"
    },
    {
      "file": "payroll-financial-exemptions.test.cjs",
      "name": "EX-02 قاعدة 5/6: المحتوى في «الكل» يُرفض، و«الكل» يحل محل الأضيق، والنوع المصنف يتداخل مع قسطه"
    },
    {
      "file": "payroll-financial-exemptions.test.cjs",
      "name": "EX-03/08: السبب المكرر يُرفض، والحضور لا يُؤجل، والأقساط تُؤجل دائمًا، والهدف غير المتسق يُرفض"
    },
    {
      "file": "payroll-financial-exemptions.test.cjs",
      "name": "الاستردادات غير المصنفة والإجازة بلا أجر لا يشملها «الكل»، وبلا إعفاء تمر القيود بترتيبها"
    },
    {
      "file": "payroll-financial-exemptions.test.cjs",
      "name": "قروش التقريب: مجموع الأيام المُعفاة = المطلوب − الباقي، وظل المحرك يُطرح بالتاريخ نفسه، وحد المرفق يوم راتب"
    },
    {
      "file": "payroll-financial-exemptions.test.cjs",
      "name": "إعدادات financial_exemptions.* بحدودها ونفس البذرة"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "decimal: finite decimal strings and exponent numbers normalize exactly without accepting unsafe integers"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "amount arithmetic preserves exact intermediates and precedences"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "raw display rounds to six without causing final double rounding or intermediate truncation"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "there is no commercial amount cap and decimal-string inputs retain all provided digits"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "all four rounding modes handle positive/negative ties and avoid negative zero"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "whitelisted functions implement MIN/MAX/ABS/ROUND/FLOOR/CEIL/CLAMP"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "percent is a numeric literal suffix and leaves the legacy remainder contract unchanged"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "conditions use strict boolean comparisons with NOT/AND/OR precedence"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "IF chooses numeric or boolean branches with no truthiness coercion"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "IF and boolean short-circuiting skip zero divisors, missing inputs, and invalid values in unselected branches"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "constant zero divisors, including compound expressions and dead branches, reject at compile time"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "constant ROUND folding uses the actual policy mode and syntax-only compilation does not invent one"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "variable division by zero produces an auditable warning or FAIL_ROW error at the operator"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "missing and null numeric references use own properties only, normalize zero, and warn once per reference"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "provided invalid numeric values and accessors reject rather than coerce or execute code"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "typed references are catalogued separately and substitution preserves their source spans"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "unknown identifiers and references reject even in unreachable branches"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "catalog names are closed uppercase identifiers and may not collide across kinds or with language words"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "typed deduction codes may share a component or parameter code while each namespace remains closed"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "unlisted functions, bad arities, invalid ROUND scales and CLAMP bounds reject statically"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "dynamic ROUND scales and CLAMP bounds validate only on the selected execution path"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "property access, strings, assignment, comments and code-like payloads never enter evaluation"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "compile error positions are one-based and point to the offending source token"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "text/token/nesting boundaries are exact and unary/function nesting is also bounded"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "resource bounds are deterministic and exposed without a wall-clock or external dependency"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "evaluation validates its contract/options and reparses JSON-safe source instead of executing a forged AST"
    },
    {
      "file": "payroll-formula-engine.test.cjs",
      "name": "same compiled expression and inputs repeat one thousand times with byte-identical results and untouched caller data"
    },
    {
      "file": "payroll-formula-value-references.test.cjs",
      "name": "a period allowance used only as IF eligibility does not become a value source of the monthly salary branch"
    },
    {
      "file": "payroll-formula-value-references.test.cjs",
      "name": "only the selected false branch contributes value while the condition stays in the trace"
    },
    {
      "file": "payroll-formula-value-references.test.cjs",
      "name": "a cached reference first read as a condition is still tracked when later used numerically"
    },
    {
      "file": "payroll-formula-value-references.test.cjs",
      "name": "nested boolean short circuits and nested IF choices retain all consumed evidence but no unused values"
    },
    {
      "file": "payroll-formula-value-references.test.cjs",
      "name": "a full boolean condition contributes no numeric result references including prior components"
    },
    {
      "file": "payroll-formula-value-references.test.cjs",
      "name": "ROUND scale controls precision while an actual multiplier parameter contributes to the value"
    },
    {
      "file": "payroll-formula-value-references.test.cjs",
      "name": "arithmetic and numerical limits track evaluated numeric operands without algebraic simplification"
    },
    {
      "file": "payroll-formula-value-references.test.cjs",
      "name": "an unselected branch is neither tracked nor read even when it contains an accessor"
    },
    {
      "file": "payroll-formula-value-references.test.cjs",
      "name": "public formula output keeps its previous shape and numerical result"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "explicit six salary facts retain separate monthly equivalents, earned amounts, and full monthly rates"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "owner 30-day basis: full cycles of 28, 29, 30, and 31 days all earn one full monthly salary"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "partial coverage divides earned salary by 30 without prorating the day rate or mixing calendar ratio"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "partial coverage of 30 days in a 31-day period caps calendar-30 factor at one"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "راتب سبتمبر10000 يسري على دورة23أغسطس إلى22سبتمبر كاملة دون وزن يومي"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "تغير مكوّن راتب داخل الدورة لا يسمح بإعادة المتوسط حتى مع تغطية متصلة وصحيحة"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "rates use BASIC or GROSS monthly equivalent independent of earned calendar amount"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "راتب الشهر الدقيق يحتفظ بكسور سعر اليوم وتناسب الخدمة دون الاعتماد على تقريب العرض"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "large SQL-decimal salaries beyond Number precision retain exact cents and sums"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "working ratios use the full supplied period schedule while the monthly source records calendar and work counts"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "empty schedule yields explicit unavailable working ratio and warning without inventing calendar workdays"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "a real zero working ratio is distinct from unavailable denominator"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "zero salary is explicit and valid; none of the six components is implicitly filled"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "nonempty explicit source references are mandatory and remain opaque caller claims"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "invalid and nonexistent dates, time suffixes, missing hire date, and reverse periods are rejected"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "coverage must be nonempty, within period, and on or after the actual hire date"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "segments cannot invent salaries outside service coverage or reverse date ranges"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "مصدر راتب الشهر الواحد يغطي الخدمة كاملة ويرفض غياب القيمة أو تعددها ولو كانت القيم متساوية"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "schedule duplicates, days outside period, malformed dates, and omitted complete schedule are rejected"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "salary values reject null, binary numbers, signs, exponents, nonfinite and precision loss"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "frozen settings require complete valid values and stage zero rejects unsupported half-month and long periods"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "step 14/15: a fixed 5-to-20 (or 5-to-5) cycle leaves days without payroll and is refused; the contiguous fixed 5-to-4 cycle needs its whole month"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "PR-08 calendar month requires the first and last actual calendar dates"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "PR-08 derived and fixed 23-to-22 use end month as reference and reject matching-length shifted periods"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "PR-08 + step 14: cycle 31 (derived, or fixed 30) uses payroll-period.ts bounds — no clamped day shared between months"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "step 15: a fixed end day must continue the cycle — 30→31 is refused as settings, 31→30 and 30→29 follow the derived bounds"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "PR-08 year crossing follows the end-month reference without changing the calendar entitlement basis"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "PR-08 date generation preserves years 0001 through 0099 and refuses a previous-year underflow"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "Gregorian century leap rules generate 2000 February 29 and 2100 February 28 without Date.UTC shortcuts"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "الدورة الشاملة 31 يومًا (5→4) تسمح بـ31 تاريخًا مع راتب واحد وترفض التكرار وتجاوز حد القائمة وتعدد قيم الراتب"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "canonical normalization sorts data and equivalent decimals without mutating or borrowing input references"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "own-property guards reject unknown fields, accessors, inherited required values, and sparse arrays without invoking code"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "strict nested DTO accepts the agreed input and rejects null salaries, strings-as-arrays, and non-string salary numbers"
    },
    {
      "file": "payroll-input-facts.test.cjs",
      "name": "JSON-safe exact fractions make repeated output deterministic without BigInt, rates or employee history mutation"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "AD12 partial allocation preserves 400 paid and1266 carried without changing next installment"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "AD12 skip-and-extend leaves capacity available and defers the entire installment past the supplied schedule"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "manual deferral precedes capacity checks and preserves source decision without claiming its approval"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "exact full coverage, one-cent shortage and zero capacity produce distinct outcomes"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "budget floor cents retains the exact unused six-place fraction rather than rounding debt capacity up"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "future and zero-balance closed rows remain traceable without entering eligible totals"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "overdue installments are eligible, oldest original due takes precedence after explicit priority"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "canonical priority/date/sequence/ordinal ordering ignores input order and permits shared source refs"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "skipping an oversized installment does not prevent a later affordable installment from using the capacity"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "multiple skipped installments extend once per month with explicit later targets respected"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "different loans extend independently while the automatic extension follows the latest manual deferral of the same loan"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "manual tail applies even when its row sorts later, with earlier explicit extension and multiple skipped rows"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "repeated partial carries conserve the original obligation across explicit later snapshots"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "large DEC18,2 amounts are preserved beyond binary safe cents"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "60-digit budget remains exact and canonical while decimals beyond declared precision reject"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "formatted .00 from budget helper does not invalidate an otherwise valid60-digit integer capacity"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "empty schedule and all-zero closed schedule preserve budget without artificial deductions"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "duplicate installment identity rejects even if amount or source revision differ; shared sourceRef is valid"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "manual deferral targets must be due open known and unique, with a strictly future period"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "extension period must exceed current and every supplied due period of its loan"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "period validation handles year transitions and years0001 without Date year-offset behavior"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "automatic extension overflow is explicit instead of producing year10000 or losing a remainder"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "manual tail at9999-12 blocks only a needed automatic extension, without moving the manual decision"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "invalid source ordering, numeric identity fields, modes and scales reject explicitly"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "unknown keys reject at top, installment and manual decision levels"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "accessors, custom prototypes, symbols and dangerous own names are never evaluated"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "bounded lists and text reject excess, sparse rows and arrays with extra properties"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "pure input is unchanged, output is deeply frozen and contains JSON values only"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "deterministic varied schedules preserve every cent for all allocation modes and mixed priorities"
    },
    {
      "file": "payroll-installment-allocation.test.cjs",
      "name": "maximum supported schedule of1000 rows allocates without degrading precision or losing zero-balance trace"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "AD-12 net 900 and floor 500 leaves 400 without allocating an installment"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "DD-11 earned 11750 at 50 percent less consumed 3320 leaves 2555"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "null floors and cap stay disabled rather than assuming 50 percent"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "zero percent cap is enabled and leaves no capacity while zero floor is valid"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "percentage floor and cap use earned fixed gross independent of cash including extras"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "absolute and percentage floors combine by maximum before capacity calculation"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "cash and cap capacities intersect instead of taking their maximum"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "available cash always floors to cents regardless of policy currency rounding mode and scale"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "cash already below floor stays unchanged in input and produces zero capacity with warning"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "negative cash creates neither negative capacity nor a fictional floor payment"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "already excessive cap consumption warns but does not refund prior deductions"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "simultaneous floor and cap violations emit deterministic warnings in both currencies"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "exactly exhausted floor and cap boundaries are not reported as prior violations"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "fractional floor remains exact and only final available money floors to cents"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "unsafe integer money and all sixty input digits remain exact without Number conversion"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "normalized results are detached, deeply frozen, JSON safe and deterministic"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "numeric JSON, nondecimal text, overprecision, oversized and negative unsigned money fail closed"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "plain shape rejects unknown and inherited fields, accessors, arrays and hidden properties without invoking getters"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "all three caller references are mandatory bounded nonempty strings and accept no metadata injection"
    },
    {
      "file": "payroll-installment-budget.test.cjs",
      "name": "full policy settings are validated without defaults, silent rounding or getter evaluation"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 contains only six nullable additions, two new tables and four indexes without historical backfill"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 named CHECK allowlist rejects weakened expressions, SQL functions and existing-table ALTER constraints"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 filter predicates remain closed and foreign keys cannot target legacy sources"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 metadata plan requires exact nullable additions and new-table CHECK/FK proof"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 late failure rolls back new columns, tables, indexes, CHECKs and migration row preserving 008"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 missing metadata index and forged CHECK metadata fail before commit"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 then 010 apply above immutable 008 with empty metadata diff and old values unchanged"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 creates only the new-table FK and trusted named CHECKs with exact filtered indexes"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 DEC18,2 columns preserve maximum cents through explicit nvarchar CASTs"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 allocation CHECKs reject negative amounts and unknown status while required fields reject NULL"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 active claim race admits one holder and POSTED remains reserved until explicit release"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 one continuation per parent is enforced under race and original amount remains on partial parent"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 event idempotency is unique under race and optional allocation FK protects referenced history"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 UTC defaults populate new audit records without backfilling historical paidAt"
    },
    {
      "file": "payroll-installment-ledger-migration.test.cjs",
      "name": "009 replay preserves installment amounts, released claims, audit payloads and all prior migration checksums"
    },
    {
      "file": "payroll-item-lines.test.cjs",
      "name": "بند كامل: كل استحقاق واستقطاع سطر باسمه بالترتيب، والمجاميع = الأعمدة والصافي المحفوظ"
    },
    {
      "file": "payroll-item-lines.test.cjs",
      "name": "بند قديم بلا تفصيل: الأعمدة نفسها سطور عامة («البدلات الثابتة» و«إضافات أخرى» و«خصومات أخرى»)، والأساسي دايمًا"
    },
    {
      "file": "payroll-item-lines.test.cjs",
      "name": "سطور الدفتر والإجازة ومكونات الراتب اللي ما تطابقش أعمدتها ما تغيرش المجموع: الباقي سطر صريح أو العمود كله سطر واحد"
    },
    {
      "file": "payroll-item-lines.test.cjs",
      "name": "الانصراف المبكر ما يزيدش عن عمود النقص بعد حماية الصافي (النقص بيسقط الأول)"
    },
    {
      "file": "payroll-item-lines.test.cjs",
      "name": "شهر بتأخير وإذن بخصم: سطران مجموعهما = رقم «التأخير» القديم بالقرش، وعدّادا الدقائق منفصلان"
    },
    {
      "file": "payroll-item-lines.test.cjs",
      "name": "مسير قديم بلا تقسيم محفوظ: «التأخير» يفضل سطرًا واحدًا كما هو — لا سطر «إذن بخصم» بصفر"
    },
    {
      "file": "payroll-item-lines.test.cjs",
      "name": "حماية الصافي قصّت عمود التأخير: الإذن بخصم ما يزيدش عن العمود ومجموع السطرين يساويه بالقرش"
    },
    {
      "file": "payroll-item-lines.test.cjs",
      "name": "المجاميع بالقرش لأي بيانات (عشوائي): مجموع البنود = الأعمدة المحفوظة والصافي كما هو"
    },
    {
      "file": "payroll-item-lines.test.cjs",
      "name": "أعمدة الجدول: اتحاد البنود اللي ليها مبلغ في أي صف بالترتيب الثابت، والأساسي أول عمود"
    },
    {
      "file": "payroll-lateness-tier-sets.test.cjs",
      "name": "overlapping tiers are rejected on save with both rows and the shared minute named; touching inclusive bounds count as overlap"
    },
    {
      "file": "payroll-lateness-tier-sets.test.cjs",
      "name": "valid set: sorted, normalized to 3 decimals, gaps reported as per-minute, hash stable and content-sensitive"
    },
    {
      "file": "payroll-lateness-tier-sets.test.cjs",
      "name": "step 21 acceptance (pure): 61 minutes × 1.5 × minute rate with the tier effect trace; legacy fraction and no-match semantics kept"
    },
    {
      "file": "payroll-lateness-tier-sets.test.cjs",
      "name": "SHADOW conversion: a multiplier and a no-deduction tier become a valid contiguous policy tier set with the same per-day amount"
    },
    {
      "file": "payroll-lines-ui.test.cjs",
      "name": "جدول المسير: الأعمدة من بنود الخادم بمجموعتين، والصف والإجمالي من البند نفسه، والتصدير بنفس الأعمدة"
    },
    {
      "file": "payroll-lines-ui.test.cjs",
      "name": "إنشاء مسيرات الشهر الجديد: معاينة من الخادم ثم إنشاء بنفس شهر المصدر، والنتيجة (اتعمل / اتخطى وسببه)"
    },
    {
      "file": "payroll-lines-ui.test.cjs",
      "name": "القسيمة وتابتا الشهر: بنود الخادم بأسمائها، والبدلات = كل الاستحقاقات والاستقطاعات = كل الخصومات لكل موظف"
    },
    {
      "file": "payroll-lines-ui.test.cjs",
      "name": "«إذن بخصم» في الواجهة: عموده ودقائقه في جدول المسير، وسطره في القسيمة تحت قرار إلغاء التأخير نفسه"
    },
    {
      "file": "payroll-lines-ui.test.cjs",
      "name": "إجماليات الأعمدة بالقرش، والاحتياطي من أعمدة البند بنفس المجاميع"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "ثواني التأخير من البصمة نفسها لا من الدقائق المقربة"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "ثواني البصمة بعد نافذة المرونة تبدأ من بداية الدوام"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "النافذة المرنة المكتملة تعطي صفر تأخير حتى لو بدأ الدوام متأخرًا"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "تدقيق صف الحضور لا يغير المدخلات أو يعيد حفظها"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "الغياب المثبت يحتاج صفًا صريحًا محسوبًا بعد نهاية اليوم بلا بصمة"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "اليوم المفقود لا ينشئ غيابًا افتراضيًا"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "حساب الدخول والانصراف في نفس يومهما يثبت بعد نهاية اليوم"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "تغير أي نتيجة محفوظة أو نسخة الدوام يمنع تفسيرها ماليًا"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "صف قديم بلا snapshot أو قواعد سماح مؤرخة لا يصبح موثقًا"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "تعدد البصمات أو وصول بصمة بعد الحساب لا يختار زوجًا تخمينيًا"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "بصمة بلا مصدر أو بصمة يدوية بلا مدخل مسؤول تبقى غير صالحة"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "صفوف أو بصمات موظف آخر لا تظهر في الأدلة المعادة"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "فرع اليوم يطابق الفرع المؤرخ لا الفرع الحالي"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "وجود إذن أو مأمورية معتمدة يبقى سببًا صريحًا دون قراءة كتالوج حي"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "تصحيح بلا طلب مكتمل لا يعد تصحيحًا معتمدًا"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "الإجازات الكاملة والجزئية لا تتحول إلى أيام مدفوعة مفترضة"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "الاستثناء يحتفظ بقرار الإجازة غير المدفوعة منفصلًا عن البصمة"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "تقويم ناقص أو فترة مقلوبة لا ينتجان مجموعة حضور فارغة متاحة"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "تقويم مؤرخ غير عامل يثبت عدم طلب الحضور ولا يولد صف غياب"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "التغطية الجزئية لا تضيف أيام ما قبل التعيين إلى الغياب أو مدخلات الشرائح"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "لقطة التقويم الناقصة داخل الخدمة تمنع المصدر رغم تطابق البصمة"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "بصمة في يوم غير عامل تحتاج تسوية مستقلة ولا تختفي من العدادات"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "حدود الصفوف وحجم JSON تمنع اعتبار القراءة المقطوعة مكتملة"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "القارئ لا يصدر أي كتابة ويلزم معاملة ويبلغ نقص المخطط فقط"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "S28: ليلة 12 تحمل التأخير والنقص من بصمة 00:50 صباح 13، ويوم 13 يأخذ ليلته فقط"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "S28: ليلة آخر يوم في الفترة تبقى فيها، وأول يوم في الفترة التالية يستبعد انصرافها بدليل جدول الجار"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "S28: وردية الغد الصباحية تقدم حد الليلة فتبقى بصمة 06:00 للغد لا لليلة الأمس"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "S28: الليلة لا تُقفل ولا يثبت غيابها عند منتصف الليل بل عند حد نافذتها صباح الغد"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "S28: توقيت مهمة الغياب الفعلية (01:00) لليلة 20:00 ← 01:00 يُثبت بعد إقفال النافذة دون انتظار لحاق الليلة التالية"
    },
    {
      "file": "payroll-live-attendance-provider.test.cjs",
      "name": "S28: توقيت يوم الجار غير المثبت لا يحرك حد النافذة ويُعامل «بلا وردية» مع توثيق ذلك في الإثبات"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "September payroll Aug23-Sep22 selects10000 for whole coverage and never splits at September1"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "first calculation of old months after a later raise still uses each named month salary"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "partial employment changes coverage only and still emits the full monthly rate"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "legacy dated history remains evidence for review but cannot invent payroll reference months"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "large exact SQL money stays decimal text without repricing or rounding"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "absent salary history never fills old periods from current employee columns"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "missing schema is distinguished from connection failures"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "changed current salary component blocks publication of monthly financial input"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "currency changes and null-to-zero changes are not silently accepted as the same source"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "missing current salary fields do not become zero for source matching"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "tampered salary, month, derived dates, contract or hash invalidate stored evidence"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "a missing month in the latest revision never borrows previous or future salary"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "a future salary alone cannot establish an earlier payroll month"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "policy currency must match selected month but other months may have another currency"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "salary choice stays the same when its saved cycle differs from inspected run dates"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "missing employment proof never supplies a financial salary coverage"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "reversed, impossible or out-of-period employment coverage cannot appear AVAILABLE"
    },
    {
      "file": "payroll-live-compensation-provider.test.cjs",
      "name": "invalid requested dates fail before any SQL is read"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "active employee has full documented employment coverage; salary and attendance remain explicitly unsupported"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "partial hire and actual start precedence produce inclusive coverage without full-month guessing"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "documented termination includes the last working day and never uses administrative archive time"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "notice period uses its actual offboarding document and cancelled cases do not end service"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "missing hire never becomes 1900 and an invalid preferred start never falls back to join date"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "archived or inactive employee without an end document stays unresolved despite archivedAt"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "suspension and ambiguous lifecycle history never fabricate paid service intervals"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "multiple end dates, active-after-closed and earlier service end all require documented rehire history"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "out-of-period employment is AVAILABLE with a documented empty intersection, not a fabricated salary"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "bad end documents, invalid employee state and corrupt lifecycle JSON are detailed rather than used"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "exact current six-field DECIMAL strings retain large cents but cannot become dated salary segments"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "missing salary components remain null and invalid/number/currency values do not gain fallback defaults"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "stored attendance exposes raw/unexcused integer minutes, snapshot and review evidence without claiming raw seconds"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "even complete attendance rows are unsupported and cannot establish the historical work schedule"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "missing and duplicate attendance dates are diagnostic; no missing day becomes absent or off"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "attendance corrupt JSON, mismatched snapshot, null legacy metrics and review flags are kept explicit"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "nonfinite or unsafe JSON values cannot silently corrupt readable attendance snapshot data"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "large row sets are bounded and explicitly unsupported instead of pretending the truncated source is complete"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "valid leap/32-day/year-one intervals are supported while invalid or oversized requests make no SQL read"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "missing employee produces MISSING groups, and query errors propagate instead of masquerading as absent data"
    },
    {
      "file": "payroll-live-employment-provider.test.cjs",
      "name": "data and references serialize canonically, stay immutable, and never mutate fetched rows"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "empty verified source groups are AVAILABLE with exact zero and no invented approval or installment"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "real exact position reader preserves maximum DEC18,2 cents without conversion through Number"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "partial original preserves original amount and paid amount while only its child carries the remaining debt and future tail"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "deferred original does not count as repayment and legacy paid row remains explicitly paid"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "HELD claims include zero collection decisions and expose full balance without making it collectible"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "POSTED unreleased allocations remain an explicit claim and are never silently released during a read"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "approved and paid legacy runs exclude documented installment and CREDIT references across all old periods"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "modern approved installmentPlan claims only its eligible lines and reconciles exact collection with SQL money"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "settlement sources are read as raw text, retain history and exclude their documented installment"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "missing financial source metadata on a past automatic settlement blocks availability without assuming zero"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "malformed or JSON-null previous payroll claims are INVALID even if old totals were zero"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "positive old installment or CREDIT totals without source IDs are not treated as unclaimed zero"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "invalid allocation conservation and corrupted settlement references expose INVALID while retaining raw evidence"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "credits include immediate and overdue entries, while future entries remain visible in excluded"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "ordinary due DEBIT remains UNSUPPORTED and never appears as a loan or collectible CREDIT"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "future DEBIT stays excluded without pretending it is due in the current period"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "corrupted partial chain and missing schedule never produce an apparently complete zero balance"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "money returned as Number and inconsistent pending applied markers are rejected per source group"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "stale HELD revision quarantines the source and an unknown obligation direction retains its raw row for review"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "schema absence is MISSING but unexpected connection errors propagate instead of becoming empty sources"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "5001 rows fail with an explicit limit issue rather than silently truncating positions or credits"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "transaction, employee and real calendar period are checked before a query; input does not interpolate SQL"
    },
    {
      "file": "payroll-live-ledger-provider.test.cjs",
      "name": "identical reads are deterministic and leave source fixture arrays and snapshots unchanged"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "approved SQL money remains exact, cents sum without floating drift and no live price lookup"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "approval price is never rescaled to a newly selected wage setting"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "payment link on an approved row is contradictory even when no old breakdown claims the source"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "large but safe approved prices are summed as decimal strings"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "legacy approved entries with or without payable hours are unsupported and block partial totals"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "corrupt raw snapshots and new approval fields without snapshot return INVALID, never JSON exceptions"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "SQL amount versus approval mismatch cannot pass a Number round trip"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "unsafe cents or extra precision in numeric approval rejects AVAILABLE"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "pending, rejected and cancelled workflow rows are visible but never priced or eligible"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "paid sources remain visible with original amount and are excluded from eligible totals"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "approved and paid payroll claims exclude sources; draft runs cannot be included by query"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "SETTLED and CLOSED settlements exclude their exact overtime source ids"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "old automatic settlement lacking source snapshot blocks unresolved approved overtime"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "invalid or ambiguous payroll and settlement claim JSON produces INVALID"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "a source claimed by two runs or payroll plus settlement is not silently merged"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "approved backlog requires a closed covered period and keeps its original approval price"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "active period claim is read without dirty hints and before historical run fallback"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "duplicate active day or duplicate source id is INVALID even if one source is pending or already claimed"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "empty explicit read returns known zero; invalid identifiers/dates perform no SELECT"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "combined source row limit prevents pretending truncated reads are complete"
    },
    {
      "file": "payroll-live-overtime-provider.test.cjs",
      "name": "same source data produces stable content hash and preserves raw approval evidence"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "explicit employee and source versions supply timings without inventing missing historical calendar"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "employee schedule changes take effect on the inclusive date and ignore the current employee pointer"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "same-effective-date amendments use the highest explicit version; future amendments do not leak backward"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "legacy baseline remains explicitly undated and never becomes an authoritative historical source"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "future-only employee or rule versions leave prior days missing without catalog or branch defaults"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "day override wins over dated week plan; source version timings win over cached assignment timings"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "inline dated plan remains readable with unknown required minutes and no invented shift identity"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "explicit dated default is resolved only after an explicit employee null assignment"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "conflicting dated default schedules are invalid rather than selected by arbitrary ID"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "inactive dated rule is shown but never silently replaced with current/default settings"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "individual flex ENABLED requires a defined valid source window; DISABLED overrides source flex"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "missing required minutes never derive from shift duration or legacy requiredHours"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "calendar current evidence stays separate, including date-specific holidays and inactive recurring rules"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "missing global weekend config never supplies FRI/SAT or manufactures a workday"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "corrupt rule JSON is retained exactly and cannot fall through to an older valid version"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "JSON scalars, arrays, unsafe numbers, poison keys and nonfinite parsed numbers fail closed"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "overlarge and overdeep rule JSON is bounded, identified and never parsed into usable timings"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "duplicate source identity/version or inconsistent baseline metadata are invalid"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "foreign employee, foreign shift rule and unknown enum or invalid timing are rejected without coercion"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "duplicate or malformed dated plan never becomes the selected usable shift"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "invalid branch/calendar source rows are not silently dropped or mapped to ordinary weekdays"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "bounded SQL and aggregate evidence cap do not falsely claim an applicable timing is complete"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "missing schema is explicit while connectivity failure propagates instead of becoming empty data"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "invalid request identity/period and missing transaction fail before any source query"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "same source contents have stable canonical hash; a later read changes evidence without mutating the old snapshot"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "calendar SQL limits recurring rules to the employee branch and holidays to its current country or global scope"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "unexpected foreign-branch rules are invalid and expose neither their name nor source identifier"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "unexpected foreign-country holidays are invalid and do not expose their metadata"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "country comparison matches attendance trimming and case normalization; unconfigured country keeps documented all-country semantics"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "disabled flex accepts an explicit null window but zero violates the existing attendance source validator"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "التقويم المؤرخ المكتمل يفتح أيام العمل ويحفظ فرع كل تاريخ ومراجع نسخه"
    },
    {
      "file": "payroll-live-schedule-provider.test.cjs",
      "name": "فجوة واحدة في التقويم تمنع جدولًا كاملًا رغم اكتمال توقيت الوردية"
    },
    {
      "file": "payroll-live-source-contract.test.cjs",
      "name": "source period validates actual leap dates and end-month attribution without imposing a salary denominator"
    },
    {
      "file": "payroll-live-source-contract.test.cjs",
      "name": "invalid dates reversed intervals and more than one bounded cycle reject before source loading"
    },
    {
      "file": "payroll-live-source-contract.test.cjs",
      "name": "content fingerprint ignores object key order and retains list order and exact decimal text"
    },
    {
      "file": "payroll-live-source-contract.test.cjs",
      "name": "snapshot retains historical dates and decouples nested input references"
    },
    {
      "file": "payroll-live-source-contract.test.cjs",
      "name": "nonfinite unsafe or unrepresentable evidence fails instead of becoming null or disappearing"
    },
    {
      "file": "payroll-live-source-contract.test.cjs",
      "name": "cycle and excessive nesting are bounded with a source-specific failure"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "period helper validates real dates, leap days and inclusive 32-day boundary"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "money strings display exactly; numbers, objects and nondecimal raw values never masquerade as money"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "date helper only says immediate for a nullable obligation date, not a missing attendance date"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "unknown source states and technical reason codes have Arabic fallback without leaking raw codes"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "ledger closure and claim reasons are rendered as Arabic business states"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "all source detail renderers tolerate null and unknown data without crashing or serializing it"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "current compensation labels are complete and do not claim historical salary validity"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "monthly compensation requires one salary, reference month and unchanged source beyond the AVAILABLE label"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "dated schedule display keeps timing separate from unproved calendar workdays"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "employment coverage requires typed dates and day count before it is presented as coverage"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "paid overtime shows exclusion and claim reason, while raw evidence remains absent from markup"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "unknown row payloads never stringify; missing dates do not become immediate money"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "rows are bounded to first 100 with a visible count; unknown section details are not exposed"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "result explains preview limits and source blockers with Arabic labels only"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "SSR permission denial has no employee selection or read action; dirty policy blocks reading"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "API sends only fixed read fields on expected route and passes abort signal"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "bad identifiers or period fail locally without issuing an API request"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "a stale version, different employee/period or non-readonly reply is not rendered as current data"
    },
    {
      "file": "payroll-live-sources-ui.test.cjs",
      "name": "403/409 errors preserve typed API status and never trigger automatic retry"
    },
    {
      "file": "payroll-live-ui.test.cjs",
      "name": "LV-UI-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والمسار الذاتي ورا الميزة الفرعية"
    },
    {
      "file": "payroll-live-ui.test.cjs",
      "name": "LV-UI-02: تاب «لحد امبارح» في شاشة الرواتب — مكتوب عليه تقديري، وزرار «حدّث الحساب» بصلاحية الحساب بس"
    },
    {
      "file": "payroll-live-ui.test.cjs",
      "name": "LV-UI-03: كارت الموظف ومبلغ يومه ورا الميزة الفرعية — مقفولة = مفيش نداء ولا عرض"
    },
    {
      "file": "payroll-live-ui.test.cjs",
      "name": "LV-UI-04: تنبيهات قبل الاعتماد في لوحة «اتغيّر إيه» — من رد الخادم، وبيانات الصرف الناقصة من كشف البنوك الموجود"
    },
    {
      "file": "payroll-live-ui.test.cjs",
      "name": "LV-UI-05: الإعدادين في شاشة السياسات بنفس مفاتيح الخادم وحدوده"
    },
    {
      "file": "payroll-managed-foreign-keys.test.cjs",
      "name": "PL-03 prior table evidence requires the named 006 owner and an exact applied checksum when reading a ledger"
    },
    {
      "file": "payroll-managed-foreign-keys.test.cjs",
      "name": "PL-03 authored inline foreign keys permit only the three named version-owner relationships with prior evidence"
    },
    {
      "file": "payroll-managed-foreign-keys.test.cjs",
      "name": "PL-03 authored FK exceptions cannot reach other existing tables, columns, sources, names or cascading actions"
    },
    {
      "file": "payroll-managed-foreign-keys.test.cjs",
      "name": "PL-03 generated FK classification requires new source, managed target evidence and exact metadata"
    },
    {
      "file": "payroll-managed-foreign-keys.test.cjs",
      "name": "PL-03 new-to-new composite relationships retain create-order proof and strict actions"
    },
    {
      "file": "payroll-managed-foreign-keys.test.cjs",
      "name": "PL-03 file loading proves the earlier 006 owner instead of trusting arbitrary existing table names"
    },
    {
      "file": "payroll-managed-foreign-keys.test.cjs",
      "name": "PL-03 exact named CHECKs accept only the agreed bounds and method expressions on a newly created tier table"
    },
    {
      "file": "payroll-managed-foreign-keys.test.cjs",
      "name": "PL-03 CHECK plan classification needs a new table and exact named metadata, never an existing-table exception"
    },
    {
      "file": "payroll-membership-migration.test.cjs",
      "name": "SPEC① SQL002 uses additive statements only and transactional failure preserves old tables"
    },
    {
      "file": "payroll-membership-migration.test.cjs",
      "name": "SPEC① SQL002 preserves historical NULL snapshots and adds defaults without changing original row values"
    },
    {
      "file": "payroll-membership-migration.test.cjs",
      "name": "SPEC① active-date unique index rejects concurrent identical claims and preserves released history"
    },
    {
      "file": "payroll-membership-migration.test.cjs",
      "name": "SPEC① replay preserves saved member snapshot, run version, released claims and event payloads"
    },
    {
      "file": "payroll-migration.test.cjs",
      "name": "PAY-MIG guards reject source, arbitrary clones and unverified manifests"
    },
    {
      "file": "payroll-migration.test.cjs",
      "name": "PAY-MIG filtered indexes accept only IS NULL or IS NOT NULL without broader predicates"
    },
    {
      "file": "payroll-migration.test.cjs",
      "name": "PAY-MIG accepts omitted NULL only in generated plans with exact nullable metadata evidence"
    },
    {
      "file": "payroll-migration.test.cjs",
      "name": "PAY-MIG rejects destructive, data-writing, disguised and cross-database SQL before execution"
    },
    {
      "file": "payroll-migration.test.cjs",
      "name": "PAY-MIG failure after earlier DDL rolls back the whole batch and the independent ledger"
    },
    {
      "file": "payroll-migration.test.cjs",
      "name": "PAY-MIG metadata mismatch rolls back additive SQL before commit"
    },
    {
      "file": "payroll-migration.test.cjs",
      "name": "PAY-MIG additive apply and replay preserve original bytes, old columns and new review data"
    },
    {
      "file": "payroll-migration.test.cjs",
      "name": "PAY-MIG changed or missing published SQL is rejected without overwriting review rows"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "new monthly salary input starts with no inferred month, amount or effective date"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "monthly ranges allow gaps but reject overlap, invalid months and missing open-end declaration"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "monthly form preserves exact cents and does not derive any amount or currency"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "monthly POST sends period keys and exact amounts only, preserving CAS without derived dates or audit fields"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "monthly history cannot silently downgrade through legacy save; invalid month never makes a request"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "monthly responses reject removed metadata, unknown version, invalid cycle and stale revision"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "clamped cycle31 dates do not turn disjoint February and March salary months into an overlap"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "monthly editor displays reference month and owner cycle example with no date picker"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "permission denial retains values but prevents monthly saving and adding"
    },
    {
      "file": "payroll-monthly-salary-ui.test.cjs",
      "name": "source panel labels one monthly rate and never confirms old multi-rate evidence"
    },
    {
      "file": "payroll-net-change-alert.test.cjs",
      "name": "NC-01: النسبة من الإعداد — عدد صحيح من 0 لـ1000، وغيره = الافتراضي 20"
    },
    {
      "file": "payroll-net-change-alert.test.cjs",
      "name": "NC-02: الفرق قد النسبة أو أكتر ← تنبيه بالبنود اللي فرقت بس؛ تحت النسبة أو من غير فرق ← مفيش"
    },
    {
      "file": "payroll-net-change-alert.test.cjs",
      "name": "NC-03: السابق صفر أو سالب = أي فرق تنبيه من غير نسبة؛ النسبة 0 = مقفول؛ ومن غير بند سابق أو حالي ← مفيش"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "DD-11 example protects statutory and allocates the final 2555 to loans, carrying 445"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "owner explicit order changes attendance versus loan collection with no default priority"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "skip-and-extend leaves available money for later recoveries without writing off principal"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "statutory and court amounts remain full and consume cap even when exceeding it"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "unpaid non-entitlement reduces cash but never consumes the statutory deduction cap"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "floor uses the larger absolute or earned-fixed percentage guarantee, independently of cap"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "protected insolvency returns exact negative NET, blocks approval, and invokes no loan allocation"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "unattainable floor does not invent pay or convert a nonnegative balance to insolvency"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "only explicitly eligible non-debt carries under the global carry switch; attendance always drops"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "INFO values never enter net sums, and financial six-place component precision is preserved"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "exact fractional cap is conservatively floored at the maximum financial scale, with no hidden adjustment"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "currency precision never falls below two even when all component rounding scales are zero"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "zero and skipped deductions are classified and ordered, and optional zero-loan details survive"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "exempted ordinary deduction remains zero and does not consume cap or revive its prior minimum"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "loan callback receives frozen exact budget and integrates the real installment allocator without double collection"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "loan cents are not rounded up to a finer available cap and the remainder remains available"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "large exact source values above Number safe integer retain cents"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "60-digit integer with formatted zeros remains accepted without reducing its numeric domain"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "strict classification and order require all and only known deduction rows and evidence"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "protected classes cannot appear in collection order and loan classification cannot allow principal drop"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "financial numbers, malformed fractions, invalid settings, and non-cent loan debt are rejected"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "tampered execution version, sums, exact values, status, extra fields, or missing NET cannot be finalized"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "accessors and custom prototypes are rejected without invoking getters throughout all public inputs"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "non-JSON properties, sparse arrays, oversized inputs, and symbols fail closed"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "malformed, asynchronous, unsafe, or non-conserving loan resolver output fails closed"
    },
    {
      "file": "payroll-net-finalization.test.cjs",
      "name": "pure result is deeply frozen, retains all evidence, serializes safely, and never mutates supplied objects"
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "قراءة الاستعلام: القيم غير الصالحة تسقط، والحالات من نص مفصول بفاصلة، ومن/إلى المقلوبين يتصححوا"
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "البحث بالاسم أو الكود بلا حساسية لحالة الحروف، والباقي مطابقة دقيقة"
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "مدى تاريخ التعيين شامل الطرفين، وبلا تاريخ = خارج المدى، و«كل التواريخ» ما بتفلترش"
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "المنظور: الكل / المدرجين في مسير / بلا مسير على نفس الصفوف"
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الفلاتر بتشتغل مع بعض (AND)، والعدّاد بيعد المفعّل بس والمنظور مش فلتر"
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الموقوف بيدخل التقرير بس لما يتفلتر بالاسم"
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "تقسيم الاختيار المختلط: مين ينتقل من أنهي مسير، مين يتضاف، ومين يتخطى وليه"
    },
    {
      "file": "payroll-period-guards.test.cjs",
      "name": "الصافي السالب: السبب الأكبر وكل بند بمبلغه، ومجموع السطور = الصافي"
    },
    {
      "file": "payroll-period-guards.test.cjs",
      "name": "رسالة الرفض: أول 3 بالاسم والصافي، والعدد، والسبب"
    },
    {
      "file": "payroll-period-guards.test.cjs",
      "name": "سطور الإجازة لما الحارس يقص: النقص من سطور المرضية من الآخر ومفيش سطر سالب، والزيادة على آخر سطر زي ما كانت"
    },
    {
      "file": "payroll-period-guards.test.cjs",
      "name": "الحارس في لقطة السياسة: المقفول مالوش أثر في البصمة، والمفعّل فرق ظاهر بالاسم"
    },
    {
      "file": "payroll-period-guards.test.cjs",
      "name": "اعتماد واحد شغال للمسير: القفل من غير انتظار في الاعتماد بخطوة واحدة وفي «اعتمد خطوتي» بس"
    },
    {
      "file": "payroll-period-salary-migration.test.cjs",
      "name": "012 يضيف أربعة أعمدةnullable فقط دون تعديل011 أو تعبئة شهر مفترض"
    },
    {
      "file": "payroll-period-salary-migration.test.cjs",
      "name": "فشلDDL بعد الإضافات يعيد الأعمدة والـledger والسجلات الأصلية"
    },
    {
      "file": "payroll-period-salary-migration.test.cjs",
      "name": "ترحيل غير مكتمل لا يثبت حتى لو نجحت بعض الأعمدة"
    },
    {
      "file": "payroll-period-salary-migration.test.cjs",
      "name": "الترحيل يحفظ bytes السجل القديم ومبالغه وhashV1 وتبقى أعمدة الشهرnull"
    },
    {
      "file": "payroll-period-salary-migration.test.cjs",
      "name": "بعد012 تحفظ مراجعة شهرية دقيقة جديدة ويظل أصلV1 بلا تعديل"
    },
    {
      "file": "payroll-period-salary-migration.test.cjs",
      "name": "إعادة الترحيل آمنة وتغييرchecksum لا يغير بيانات المراجعات"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "سبتمبر يعني دورة23أغسطس إلى22سبتمبر براتب شهري كامل واحد"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "نهاية الشهر شاملة واختيار أكتوبر لا يتسرب إلى سبتمبر أو أغسطس"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "الاختيار مستقل عن يوم الدورة المحفوظ ولا يزن أجزاء الراتب"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "الفجوات وقبل أول شهر وبعد آخر شهر تظل نقص إثبات"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "البيانات اليومية القديمة لا تتحول إلى دليل شهري حتى مع تغطية الدورة كلها"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "الشهور تقبل حدود السنة وترفض الصيغ الوهمية والناقصة"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "قص فبراير والسنة الكبيسة وانتقال السنة يحفظ تعريف الدورة"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "التداخل يحسب بالشهر والتجاور مقبول، وتواريخ فبراير ومارس المشتقة متجاورة بلا يوم مشترك"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "المبالغ الستة دقيقة وتقبل الصفر ولا تقبل الأرقام أو التقريب"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "المدخل لا يقبل تواريخ العميل أو دورته أو نقص أحد المكونات"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "التطبيع يرتب الشهور دون تغيير بيانات المدخل الأصلية"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "قارئSQL يتحقق من الشهر والدورة والحدود المشتقة والبصمة معًا"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "بصمةV1 القديمة لا تتغير بإضافة أعمدة شهريةnull"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "إلحاق سجل يومي فوق دليل شهري مرفوض قبل أيINSERT"
    },
    {
      "file": "payroll-period-salary.test.cjs",
      "name": "اختيار صف مشوه أو مراجعة مختلفة يرفض بدل اختيار راتب"
    },
    {
      "file": "payroll-period.test.cjs",
      "name": "دورات 23 و29 و30 و31 (و1) على 24 شهرًا متتاليًا: لا تداخل ولا فجوة، وكل يوم ينتمي لشهر واحد"
    },
    {
      "file": "payroll-period.test.cjs",
      "name": "أمثلة صريحة مكتوبة يدويًا (ليست ناتج الدالة)"
    },
    {
      "file": "payroll-period.test.cjs",
      "name": "شهر يوم العمل حسب الدورة (أساس تسعير الإضافي)"
    },
    {
      "file": "payroll-period.test.cjs",
      "name": "التداخل القديم (قص 29/30/31) والفجوة بعد تغيير الدورة يُكشفان بتواريخهما"
    },
    {
      "file": "payroll-period.test.cjs",
      "name": "المدخلات غير الصالحة ترفض بخطأ الفترة"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "complete normalized definition is independent, canonical, recursively frozen, and contains no implicit values"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "missing/unknown fields, numeric decimals, forged IDs, accessor values and string booleans reject"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "version settings must be complete and valid and caller-selected options are typed"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "all eight user sources and SYS_NET retain their full fields and legal semantic relationships"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "source-discriminated fields cannot be omitted, injected from another source or moved outside the salary whitelist"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "decimals preserve SQL boundaries exactly and refuse silent rounding or overflow"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "negative fixed values are info-only and counting units are limited to information and coherent inputs"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "NET is mandatory, active, last, info and stage6, with no alternate formula or caps"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "base/cap references, stages, ledger direction, caps, rounding and rollups enforce their declared contracts"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "disabled or unknown parameters and ambiguous symbol catalogs cannot be saved as references"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "dependencies from amounts, conditions, percentage bases and cap bases all reject forward/disabled references"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "cycles include full paths and autoOrder returns real normalized sequences without changing stages or input"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "each tier method requires only its own parameter and no non-applicable field survives"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "gaps, overlap, unclosed ranges and disable/re-enable actions validate the final active collection"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "minutes/count have integer bounds while hours/days/currency retain six decimal places"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "grace/caps/unit settings reject contradictions without inventing business defaults"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "tier input and method formulas add AST dependencies to each consuming component"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "monotonicity detects the LT17 multiplier-to-quarter-day decrease using the frozen daily hours"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "mixed fixed/formula tiers declare unproven monotonicity and mandatory marginal/period warnings"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "monotonicity also covers FALLBACK_1_1 before the first tier without treating the initial range as a gap"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "warning details are canonical and change with the business reason so old acknowledgements cannot match"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "ROUND is validated under actual component/tier override and graph normalization is idempotent"
    },
    {
      "file": "payroll-policy-definition.test.cjs",
      "name": "technical collection limits reject before a large collection can be processed"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 begins from explicit historical 007 settings and adds only three nullable markers plus four new tables"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 current SQL metadata diff permits only newly created sources with exact managed-owner and CHECK evidence"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 late DDL failure rolls back every new table, FK, CHECK, nullable column and ledger row"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 missing metadata and mismatched managed FK or CHECK definitions prevent commit"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 applies above 007 without backfill or history changes and leaves complete current metadata"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 creates valid linked definitions and retains decimal strings at SQL precision boundaries"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 SQL foreign keys reject orphan owners and cross-version tier references, including direct SQL writes"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 unique codes and sequences remain scoped to their version, stage and tier set"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 CHECK enforces complete method fields with no SQL UNKNOWN/null escape"
    },
    {
      "file": "payroll-policy-definitions-migration.test.cjs",
      "name": "PL-03/008 replay preserves definition bytes, historical settings and ledger checksums"
    },
    {
      "file": "payroll-policy-editor-ui.test.cjs",
      "name": "cycle helpers mirror the server rule: the suggested start is the start of the period that contains today (a set made today serves this month) and 23 reads as 23 → 22"
    },
    {
      "file": "payroll-policy-editor-ui.test.cjs",
      "name": "create form offers the name, the start date and the cycle editor with the 23 → 22 default; no code or description"
    },
    {
      "file": "payroll-policy-editor-ui.test.cjs",
      "name": "fixed end day mirrors the server rule: only start − 1 (or 31 for start 1) is accepted and the editor explains why before sending"
    },
    {
      "file": "payroll-policy-editor-ui.test.cjs",
      "name": "an active set shows its dates without a content seal; an open one has no end date"
    },
    {
      "file": "payroll-policy-editor-ui.test.cjs",
      "name": "«حفظ وتفعيل» shows only with payroll.policy.manage capabilities; calculate-only sees a read-only panel"
    },
    {
      "file": "payroll-policy-editor-ui.test.cjs",
      "name": "an active set is edited in place: one «حفظ وتفعيل» applies the change from a payroll period start, with no clone, freeze banner or publish review"
    },
    {
      "file": "payroll-policy-editor-ui.test.cjs",
      "name": "«طريقة الخصم»: every charge rule of the set offers «زي الإعدادات العامة» (empty = the general value), with the absence factor"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "the default legacy-equivalent policy passes the real component executor and matches the legacy calculation item by item (full month)"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "partial coverage with odd cents: per-component rounding differs by a cent from the legacy residual distribution — recorded with a reason, never silent"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "unproven attendance source: the dependent items have no policy value (UNAVAILABLE with the shadow reason), the salary items still compute"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "attendance engine difference is named as such (not blamed on upstream)"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "POLICY switch conditions: a SHADOW report for the current calculation version, no missing policy value, and a written reason for every difference"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "step 19 (pure): the fingerprint ignores capture time/actor but covers values and tiers; a changed absence_penalty_days is listed as a labelled difference"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "step 19 (pure): every fingerprint change is a named difference — version status and settings, value source, tier labels — so a refresh is never required with an empty list"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "step 20 approval (pure): no engine mode, LEGACY, a tampered/stale/incomplete report and every unexplained difference or unavailable value block approval; a written reason for an unavailable value satisfies approval but never the POLICY switch"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "source plan (pure): shadow source issue codes per employee, summarised per code with a remedy; matched rows carry none"
    },
    {
      "file": "payroll-policy-engine-run.test.cjs",
      "name": "الراتب على 30 يوم: تناسب المحرك لموظف معيّن نص الدورة على 30 مش على طول الفترة، فمفيش فرق زائف في دورة 31 أو 28 يوم"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "owner controls attendance versus loans; total cap stays fixed and all loan principal survives"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "DD11 worked example reconciles statutory, attendance, recovery, typed, administrative and actual installment rows"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "BLOCK skips and extends the full loan after its future tail, leaving capacity for the next deduction"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "manual deferral wins even with enough salary and later components can use the released capacity"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "rounded COMP remains its calculated pre-cap amount after the loan is partially collected"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "loan cannot be financially duplicated through COMP, INFO forwarding, or an aggregate debt variable"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "loan can be read in a condition without becoming a second financial deduction"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "inactive and false-condition loan sources remain untouched; no implicit financial exemption deletes principal"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "classification and carry flags cannot override the stored loan definition"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "ledger CREDIT pays its due entitlement once and does not inflate the supplied fixed-gross cap base"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "tier daily source flows into the ordered financial pipeline, then shares the capacity with loans"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "executed tier and installment sources cannot silently mix different payroll periods"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "disabled or false tier component needs no source and never revives a positive deduction"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "tier limits reduce the source with a trace; a second rounding that changes it is rejected"
    },
    {
      "file": "payroll-policy-execution.test.cjs",
      "name": "policy snapshot rejects hidden/getter/sparse/unknown inputs before invoking user code"
    },
    {
      "file": "payroll-policy-migration.test.cjs",
      "name": "PL-MIG 006 creates only three new tables and four restrictive relationships"
    },
    {
      "file": "payroll-policy-migration.test.cjs",
      "name": "PL-MIG rejects foreign keys to existing tables and all cascading or disguised operations"
    },
    {
      "file": "payroll-policy-migration.test.cjs",
      "name": "PL-MIG generated foreign-key plans require both new tables and exact metadata evidence"
    },
    {
      "file": "payroll-policy-migration.test.cjs",
      "name": "PL-MIG a late SQL failure rolls back all policy DDL, constraints and ledger"
    },
    {
      "file": "payroll-policy-migration.test.cjs",
      "name": "PL-MIG incomplete schema rolls back before commit"
    },
    {
      "file": "payroll-policy-migration.test.cjs",
      "name": "PL-MIG 006 through 008 then 010 match complete policy metadata and preserve old column definitions and rows"
    },
    {
      "file": "payroll-policy-migration.test.cjs",
      "name": "PL-MIG SQL enforces unique policy codes, unique version numbers and all four foreign keys"
    },
    {
      "file": "payroll-policy-migration.test.cjs",
      "name": "PL-MIG replays preserve policy data and audit bytes and detect checksum changes"
    },
    {
      "file": "payroll-policy-publish.test.cjs",
      "name": "Policy cycle 23: payroll month September = 23 August to 22 September and the next periods follow without gaps"
    },
    {
      "file": "payroll-policy-publish.test.cjs",
      "name": "Policy cycles 23, 29, 30 and 31 are contiguous over 24 months (same derivation rule as step 14)"
    },
    {
      "file": "payroll-policy-publish.test.cjs",
      "name": "Effective range must start at a cycle start and end at a cycle end, with a suggestion when it does not"
    },
    {
      "file": "payroll-policy-publish.test.cjs",
      "name": "Reviewer probes: non-contiguous fixed end days are refused with their real overlaps and gaps (settings, publish review and runtime)"
    },
    {
      "file": "payroll-policy-publish.test.cjs",
      "name": "Fixed end = start − 1 (and 31 for start 1) equals the derived cycle and payroll-period.ts for 48 months, including 29/30/31 without a shared day"
    },
    {
      "file": "payroll-policy-publish.test.cjs",
      "name": "Default config keeps the fixed end day tied to the start day; the legacy cycle day stays free under the derived end"
    },
    {
      "file": "payroll-policy-publish.test.cjs",
      "name": "A later published version stops the earlier one on the day before its start without touching its row; content hash is canonical"
    },
    {
      "file": "payroll-policy-publish.test.cjs",
      "name": "Day helpers cross month and leap-year boundaries"
    },
    {
      "file": "payroll-policy-settings-migration.test.cjs",
      "name": "PL-01/007: exactly eighteen explicit nullable additions match real metadata with no backfill"
    },
    {
      "file": "payroll-policy-settings-migration.test.cjs",
      "name": "PL-01/007: late DDL failure rolls back additions and retains baseline ledger and all historical values"
    },
    {
      "file": "payroll-policy-settings-migration.test.cjs",
      "name": "PL-01/007: an incomplete schema rolls back before commit"
    },
    {
      "file": "payroll-policy-settings-migration.test.cjs",
      "name": "PL-01/007: explicit historical 007 phase keeps eighteen NULL settings before completing 008 and 010 metadata"
    },
    {
      "file": "payroll-policy-settings-migration.test.cjs",
      "name": "PL-01/007: replay preserves explicitly edited new settings and rejects changed migration checksums"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "aggregate debt cannot bypass the detailed ledger and be dropped as OTHER at NET"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "aggregate debt forwarded through INFO cannot be reclassified as a disposable deduction"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "tier formula cannot financially consume ledger COMP, directly or after an INFO forwarding step"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "tier IF condition may inspect a loan while only its selected independent amount contributes"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "selected IF amount inheriting ledger principal is rejected even after a prior condition lookup"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "zero source results retain ledger provenance if a later numeric expression revives them"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "aggregate debt used only in an IF condition does not become a second principal collection"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "a skipped loan needs no source snapshot and does not fabricate a carry event or erase supplied principal"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "NET exposes its final exact amount and source references while blocked debts remain unallocated"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "higher policy precision leaves subcent capacity available without turning it into fractional installment principal"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "a ledger credit cannot become a second financial earning through INFO or PERCENT_OF"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "same ledger entry identity rejects duplication even under a different source reference and component"
    },
    {
      "file": "payroll-policy-source-adversarial.test.cjs",
      "name": "a prior credit can select an independent earning branch without being consumed twice"
    },
    {
      "file": "payroll-report-money-scope.test.cjs",
      "name": "month totals count approved and paid runs only, and includeDraft adds the calculated-but-unapproved ones"
    },
    {
      "file": "payroll-report-money-scope.test.cjs",
      "name": "the SQL status predicate matches the financial service rule for both aliases and both flag values"
    },
    {
      "file": "payroll-report-money-scope.test.cjs",
      "name": "neither the variance report nor the month aggregates count every non-cancelled run any more"
    },
    {
      "file": "payroll-report-money-scope.test.cjs",
      "name": "suspendedWholeRange is true only when every day of the range is a suspension day"
    },
    {
      "file": "payroll-report-money-scope.test.cjs",
      "name": "the suspended flag in both unassigned reports comes from the periods, not from employees.status"
    },
    {
      "file": "payroll-report-money-scope.test.cjs",
      "name": "the unassigned report hash still moves with the rows, and ignores nothing that changes a reason"
    },
    {
      "file": "payroll-report-money-scope.test.cjs",
      "name": "the documented Arabic reason text for a suspended employee is used by both reports"
    },
    {
      "file": "payroll-report-money-scope.test.cjs",
      "name": "the filters that used to be accepted and ignored are now declared and applied"
    },
    {
      "file": "payroll-reports-overtime-allocation.test.cjs",
      "name": "weight units are exact integers of hours x multiplier and reject missing or negative inputs"
    },
    {
      "file": "payroll-reports-overtime-allocation.test.cjs",
      "name": "real hr_system item 1185: 1430.63 over entries 5-13 is split by weighted hours and sums back exactly"
    },
    {
      "file": "payroll-reports-overtime-allocation.test.cjs",
      "name": "largest remainder breaks ties by entry id and never loses or invents a cent"
    },
    {
      "file": "payroll-reports-overtime-allocation.test.cjs",
      "name": "allocation refuses to guess: missing hours, zero weights with money, or negative amounts give null, not zero"
    },
    {
      "file": "payroll-reports-ui.test.cjs",
      "name": "money helpers keep exact cents with latin digits and never round-trip through Number"
    },
    {
      "file": "payroll-reports-ui.test.cjs",
      "name": "query builder drops empty filters and encodes values"
    },
    {
      "file": "payroll-reports-ui.test.cjs",
      "name": "run reference hides masked runs and labels status in Arabic"
    },
    {
      "file": "payroll-reports-ui.test.cjs",
      "name": "every report CSV builder produces one row per displayed row with matching columns"
    },
    {
      "file": "payroll-reports-ui.test.cjs",
      "name": "downloadCsv really produces a UTF-8 BOM file with neutralized formulas"
    },
    {
      "file": "payroll-reports-ui.test.cjs",
      "name": "the dead-control audit really catches a button without a handler (self-check)"
    },
    {
      "file": "payroll-reports-ui.test.cjs",
      "name": "every export/download/print/share control in every screen has a real handler or is removed"
    },
    {
      "file": "payroll-reports-ui.test.cjs",
      "name": "unassigned and overtime tabs default to the API payroll month (cycle start day), not the calendar month"
    },
    {
      "file": "payroll-reports-ui.test.cjs",
      "name": "payroll reports page (payroll simplification) shows the runs tab only, exported from its own builder, without internal run numbers; the other report endpoints stay in the API file"
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "بناء الاستعلام: الفلاتر الفاضية ما بتتبعتش، والمملوءة بتروح للخادم بأسمائها"
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "نداءات الفلاتر والجدول الموحد ووجهات النقل — كلها apiFetch بمسارات الخادم"
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "شريط الفلاتر: بحث وفرع وقسم وفريق ومسمى وحالة ومدى تعيين، وعدّاد الفلاتر و«مسح الفلاتر» وعدد الصفوف"
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "التبويبات: الفلترة في الخادم لكل التبويبات الثلاثة، والشهر المختار محفوظ، والعدد بيعكس الفلتر"
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "الجدول الموحد: منظور «الكل / المدرجين في مسير / بلا مسير»، عمود «المسير»، واختيار الكل وعدد المختار"
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "نافذة النقل الواحدة: قائمة مسيرات بالبحث بفترتها ومعادلتها، شهر البداية، السبب، ونتيجة لكل موظف"
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "نقل موظف واحد من صف المسير ومن ملفه بنفس النافذة"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "linked filters: departments follow chosen branches, teams follow chosen departments (with sub-departments), and pruning drops broken links"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "only published policy versions are offered for a run, labelled by the set name (dates only when one set has two)"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "membership preview view shows the read-only notice, coverage, the formula set name and plain Arabic exclusion reasons, without codes, day basis, factor or the other run number"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion candidates: employees the preview already excludes (data problems first) can get a written exclusion; transferred-out and manual exclusions cannot"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "stored draft: the membership card says an employee with incomplete employment data is left out of the calculation, and offers the written exclusion on those rows"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: name, formula set, month, linked filters or list, exclusions with a reason, preview and save as draft"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "payroll page: «مسير جديد» is separate from «احتساب المسودة» / «إعادة حساب المسير», and approval no longer waits for an unassigned acknowledgement"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "scope sentence: an empty department or team list reads «كل الأقسام»/«كل الفرق», sub-departments are said out loud, and an empty selection says nobody joins"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion scope check mirrors the engine: an empty department list covers the whole branch, sub-departments included, and nothing selected covers nobody"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: the live scope sentence, «كل الأقسام» selected by default, and an exclusion picker that works before any preview"
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "no new endpoint: the exclusion picker reuses the employees the screen already loads (or the scoped directory)"
    },
    {
      "file": "payroll-run-definition.test.cjs",
      "name": "org at date: dated EMPLOYEE_ORG version wins, the legacy baseline covers earlier days, the file covers employees without history"
    },
    {
      "file": "payroll-run-definition.test.cjs",
      "name": "org at date: a future scheduled transfer applies at period end; a past-due unexecuted one is flagged and ignored"
    },
    {
      "file": "payroll-run-definition.test.cjs",
      "name": "org at date: a department/team edit from the employee file (no transfer) applies from the day it was recorded; earlier days keep the old values"
    },
    {
      "file": "payroll-run-definition.test.cjs",
      "name": "org at date: change-log rows written by a transfer execution follow the transfer effective date, not the day they were recorded"
    },
    {
      "file": "payroll-run-definition.test.cjs",
      "name": "legacy calculate endpoints are allowed only on disposable test databases, never on the company database"
    },
    {
      "file": "payroll-run-definition.test.cjs",
      "name": "filters: OR inside one type, AND between types; sub-departments follow the chosen department; a list alone keeps moved employees"
    },
    {
      "file": "payroll-run-definition.test.cjs",
      "name": "transferred out: the last in-scope day inside the period is found from change dates"
    },
    {
      "file": "payroll-run-definition.test.cjs",
      "name": "legacy scopes map to the same filters, and definition columns keep the most specific type for old readers"
    },
    {
      "file": "payroll-run-definition.test.cjs",
      "name": "unassigned report hash: stable for the same rows, changes with a new row or reason, ignores the referenced run status"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B01: مفتاح السطر المحجوب ببصمة من الأصل — مفتاحين مختلفين مايبقوش واحد، ونفس المفتاح نفس النتيجة في الصف والعمود، والاسم من غير الفترة"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40-B01: بصمة المفتاح المحجوب معتمة — مش hash علني للنص الأصلي، فتجربة الشهور من الرد بس مابتطابقش أي شهر"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40: قايمة فترات بعد «مسير» — كل فترة مخفية بتتشال والمرئية تفضل"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40/CR41 (شبكة الأمان): موظفي الرد من الرد نفسه بس، وكل نص بفترات موظفه هو (مش اتحاد الرد) — والأرقام والتواريخ زي ما هي"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B02: تسمية نطاق المسير لقارئ فرع — وحدات نطاقه بس، والباقي «وغيرها خارج نطاق صلاحيتك»، والشركة كاملة، والقايمة المخصّصة من غير عدد"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "one money formatter (FE-06): Latin digits, thousands separators and two decimals cut without rounding, identical to the server kernel"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "no direct toLocaleString('ar-EG') in payroll screens; the run table and the payslip format money with formatMoney only (the deductions page and the hidden payslips page show no run amounts)"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "one formatter with one rounding on every payroll money screen (review fix): deduction, bonus and loan formatters delegate to formatMoney, and the employee payslips page uses it"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "deductions (ALDD-12): every column including shortfall and other deductions has a summary line, row totals = columns, summary lines = grand total (in cents)"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "run table per employee: gross, deductions and net from the same columns, with coverage, factor and the 30-day basis from the saved breakdown"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "allowances page (ALDD-11) is hidden and redirects to the run screen, the formula editor no longer shows settings the run does not read, and banners (FE-02) remain only on data the run does not read"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "run picker (money-requests lane): only regular, non-cancelled runs are listed and opened by default; «?run=ID» still opens any older run and keeps it visible"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "settings (A4 + B1 + B2): the daily cap and the overlap order are gone, the loan request switch is there, and the advance cap is three inputs on one company version"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "loans screen (B1/D): no caps tab, a mandatory employee picker behind requests.create_on_behalf, that employee’s cap, and a send button locked on the refusal"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "events panel: who did what and when, with the reason, the signed parity report, the small-company licence and the pay record"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "conflicts screen (payroll simplification): one line per employee «مدرج في مسير آخر لنفس الأيام» with «استبعاد من هذا المسير»; the other run is neither numbered, dated nor opened"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "pay record form: the channel and the reference come prefilled (mixed channel, «run name + month»); paying still needs both; the summary shows who paid, the channel and the reference"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "operational parity period (step 23) is documented on the engine panel with the real month count"
    },
    {
      "file": "payroll-run-screen-ui.test.cjs",
      "name": "parity period (review fix): a month with an unpaid run is shown as incomplete, test runs are counted apart, the decision owner is named, and an approver can mark a test run"
    },
    {
      "file": "payroll-run-screen-view.test.cjs",
      "name": "SV-01: عرض الشاشة بمفاتيح الشاشة ومجاميع خصم الحضور بس"
    },
    {
      "file": "payroll-run-screen-view.test.cjs",
      "name": "SV-01b: عضو الشاشة — لقطته زي ما هي من غير مكونات الراتب، ومصدر الراتب بنوعه وشهره وسريانه بس"
    },
    {
      "file": "payroll-run-screen-view.test.cjs",
      "name": "SV-02: بند الحدث من غير التفصيل وببصمته"
    },
    {
      "file": "payroll-run-screen-view.test.cjs",
      "name": "SV-03: شاشة المسير بتطلب العرض الخفيف، وبتقرا من التفصيل مفاتيحه بس"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Default collection order (no owner order) keeps the V2 kernel: attendance, recoveries, typed by carry priority, loan slot = net before loans"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Owner order separates typed from administrative deductions as two classes in the chosen order"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Owner order with recoveries before attendance: the recovery takes the capacity and the attendance excess drops (shortfall, lateness, then absence)"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Owner order with loans first: the loan slot is the balance before every other class, and the collected installments shrink the classes after them"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Collection order validation: all five classes exactly once; the kernel refuses anything else"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Owner component order maps to run classes; a class without a component keeps its default place after its default predecessor; OTHER is ignored"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "PAYRUN-STATE-001 names the action, the current state and the allowed states (SRS PR-11)"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Segregation of duties: the calculator cannot approve (PAYRUN-STATE-003) unless the documented small-company licence is enabled"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Pay record: a channel from the list and a written reference are required; the reference is trimmed"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Operational parity period (step 23): only paid SHADOW runs with a signed parity report count, one per payroll month, 3 then 2 more then the owner decision"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Operational parity period (review fix): a month counts only when every live run of that month is a paid SHADOW run with a signed report; test runs marked with a reason neither count nor block"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "Small-company licence (review fix): changing it needs a dedicated permission that only the super admin grants; settings.manage with calculate and approve is refused"
    },
    {
      "file": "payroll-run-screen.test.cjs",
      "name": "One shared money rule (owner decision 16 Sept): two decimals cut toward zero, no rounding, in the run kernel, the end-of-service award and the settlement"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "تغيير أول أجر يبدأ بالشهر المختار فقط دون اختراع شهور قبل التغيير"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "الشهر السابق الاختياري يثبت القيم الحالية الدقيقة دون إعادة إدخالها"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "الشهر السابق لا يقبل شهرًا مساويًا أو لاحقًا أو شهرًا فوق سجل موثق"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "الأجر السابق الناقص أو السلبي أو العملة المفقودة لا يتحول إلى رصيد افتتاحي"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "التغيير يقسم الشهور السابقة ويحافظ على القرارات التالية حتى المستقبل"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "تغيير شهر قديم يحفظ راتب الشهر الجاري من القرار التالي الموثق"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "الكتابة على شهر بداية موجود تستبدل هذا الشهر ولا تحذف ما قبله أو بعده"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "الفجوات السابقة لا تُملأ تلقائياً لكن شهر التغيير ينشئ الشهور المحددة"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "فجوة الشهر الجاري لا تستبدل براتب مدخل يخص شهرًا سابقًا"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "الشهر اللاحق مرفوض في المسار المباشر ولا يطبّق قبل بدايته"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "السجل اليومي القديم لا يُحوَّل إلى شهر مفترض عند التعديل"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "العملة وحدها تغيير مالي بينما التكرار المطابق لا يغير الخطة"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "خطة السريان تتحقق من الشهور وحدود المبالغ ولا تعدل مدخلاتها"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "دورة 31: حدود فبراير ومارس المشتقة متجاورة بلا يوم مشترك"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "الحارس يفحص المسير المعتمد أو المصروف بشهور التغيير والعضوية دون أي كتابة"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "تصفية الخدمة المعتمدة أو المغلقة تمنع التغيير الرجعي من بداية دورة الشهر دون فروقات تلقائية"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "الكاتب يحفظ قيمًا دقيقة ومراجعة شهرية جديدة وتدقيقًا واحدًا لكل حقل متغير فقط"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "المراجعة القديمة وصفوفها تبقى بعد إضافة تغيير الأجر"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "المراجعة المتقادمة أو تغير الأجر الحالي يرفضان قبل أي حفظ"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "تغير الأجر خارج السجل يمنع الإلحاق حتى لو فتح المستخدم النموذج من جديد"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "رفض الفترة المغلقة أو الشهر اللاحق أو السجل اليومي يحفظ الموظف والتاريخ والتدقيق دون تغيير"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "الكاتب يرفض غياب المعاملة والهوية المالية والشهر غير الصالحين قبل SQL"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "إعادة نفس التغيير المطابق لا تضيف مراجعة أو تدقيقًا أو كتابة"
    },
    {
      "file": "payroll-salary-change.test.cjs",
      "name": "سجل الأجر الشهري لا يغير راتب شهر دخل مسيرًا معتمدًا، ويقارن المسير بلا سجل شهري بمصدر لقطته"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 contains only two new tables and two unique indexes, with no existing-table writes or salary backfill"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 employee FK exception is exact and does not permit unrelated legacy references, cascade or ALTER constraints"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 metadata plans prove new source, exact employee INT primary key and both NO ACTION relationships"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 transaction rejects forged FK metadata and absent target primary key before creating salary history"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 late DDL failure rolls back both new tables, indexes, constraints and independent migration entry"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 incomplete schema cannot commit or leave a partial salary timeline"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 applies with empty history, exact current metadata, unchanged employees and unchanged payroll bytes"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 installed foreign keys are trusted NO ACTION and only the two new tables own them"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 revision and segment sequence admit only one concurrent writer per employee/version"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 dates, nullable open end and all six maximum SQL amounts survive exact string reads"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 missing parents are rejected and referenced employee/history cannot cascade away"
    },
    {
      "file": "payroll-salary-history-migration.test.cjs",
      "name": "011 replay retains saved versions and rows exactly; missing or changed migration checksum is rejected"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "seven explicit salary amounts (six + work pressure) have no inferred zero or date in a new segment"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "salary decimals remain strings at maximum cents; blank, negative, exponential and rounded values are rejected"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "real dates, leap boundaries, reverse ranges and year zero are checked before saving"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "period gaps remain explicit; overlap, same-day contact and open intervals before later periods are rejected"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "evidence, reason, currency and 120-segment limit are enforced with no automatic currency conversion"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "GET validates employee identity, preserves exact/null values and forwards AbortSignal"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "current signed values remain readable for diagnosis while historical amounts stay nonnegative"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "empty history is explicit revision zero and does not prefill current salary into dated segments"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "invalid employee IDs and form inputs never issue a network request"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "POST carries the frozen revision/hash and only allowlisted editable fields, preserving cents and input objects"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "different employee, inconsistent revision and malformed saved dates/money cannot render as a current history"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "a POST response must advance exactly one revision and never silently accepts a stale save reply"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "403/409/503 preserve API status and do not automatically resubmit salary evidence"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "initial editor SSR has explicit load action, no invented dated values and no save action"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "loaded editor SSR exposes seven exact amounts (six + work pressure) and explicit payroll months without inferring months from legacy dates"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "permission or server capability denial makes the loaded editor read-only and removes every mutation action"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "summary explains changed current-source evidence and escapes document text instead of executing HTML"
    },
    {
      "file": "payroll-salary-history-ui.test.cjs",
      "name": "saved history integration labels dated periods separately from current employee values"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "مبالغ الأجر تحفظ جميع مكونات DECIMAL(18,2) بدقة دون Number"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "المبالغ ترفض النقص والصيغ العددية السالبة والعلمية والتقريب"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "قراءة المصدر الحالي وحدها تحتفظ بالمبلغ السالب دون إجازته كتاريخ أجر"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "التقويم يقبل الحدين والسنة الكبيسة ويرفض التواريخ الوهمية"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "الفترات ترتب زمنيًا وتحتفظ بالفجوات والتواريخ الأصلية"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "التجاور دون تداخل يقبل وحدوده شاملة لليوم"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "الفترة المفتوحة يجب أن تكون الأخيرة ولا يركب النظام نهاية تلقائية"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "كل فترة تحمل ست قيم صريحة وعملة محددة ولا تقبل حقولًا محقونة"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "الحد الأقصى للفترات والحدود المقلوبة يرفضان قبل القراءة"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "تطبيع الفترات مستقل عن مراجع المدخلات ولا يمحو الصفر الصريح"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "سبب الإثبات ومرجع المستند مطلوبان بعد حذف المسافات"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "بصمة المصدر الحالي تتغير عند تغيير أي مكون أو العملة وتميز null عن الصفر"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "بصمة المصدر الحالي ترفض الحقول المفقودة دون اختراع أجر أو عملة"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "بصمة المراجعة تثبت الموظف والمراجعة والمرجع والأجر والمصدر"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "غياب التاريخ يرجع مراجعة صفر دون قراءة أو استنتاج أجزاء قديمة"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "القارئ يرجع المراجعة الأخيرة بعد إثبات البصمة والمبالغ بالنصوص"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "القارئ يرفض تغيير مبالغ أو مرجع المراجعة المخزنة دون بصمتها"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "القارئ يرفض نقص البيانات وتسلسل الصفوف والتاريخ غير الصالح"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "القارئ يرفض تجاوز الحد حتى لو كانت المراجعة في قاعدة البيانات"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "القراءات المالية ترفض غياب المعاملة أو معرّف موظف غير صالح"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "قراءة الأجر الحالي تحتفظ بالقيم الفارغة والفرع غير المسند ولا تملأهما"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "قراءة الموظف الغائب ترجع null ولا تنشئ أجرًا افتتاحيًا"
    },
    {
      "file": "payroll-salary-history.test.cjs",
      "name": "تعرف نقص المخطط محدود لأخطاء الأعمدة والجداول المعروفة"
    },
    {
      "file": "payroll-settlement-salary.test.cjs",
      "name": "OWNER-3 شهر آخر يوم عمل هو المسير اللي راتبه بيتصرف مع التصفية — وقبله أو بعده لأ"
    },
    {
      "file": "payroll-settlement-salary.test.cjs",
      "name": "OWNER-3 علامة «مصروف مع التصفية» تُقرأ من تفصيل البند المحفوظ بلا إعادة حساب"
    },
    {
      "file": "payroll-settlement-salary.test.cjs",
      "name": "OWNER-3 اعتماد التصفية يرفض أي فرق عن بند المسير — مصدر واحد لا يتجزأ"
    },
    {
      "file": "payroll-settlement-salary.test.cjs",
      "name": "OWNER-3 كشف البنك يستبعد صف التصفية من المبلغ المستحق ويذكره منفصلًا"
    },
    {
      "file": "payroll-shadow-attendance-ui.test.cjs",
      "name": "الليلة تظهر ليوم البداية مع انصراف صباح الغد ومبالغ السياسة والقديم"
    },
    {
      "file": "payroll-shadow-attendance-ui.test.cjs",
      "name": "الفروق والأيام غير المثبتة تظهر بالعربية دون أكواد خام في النص، والتفصيل التالف أو غير SHADOW لا يُعرض"
    },
    {
      "file": "payroll-shadow-attendance.test.cjs",
      "name": "SHADOW: ليلة 12 (20:10 ← 00:30) تُحسب بمحرك السياسة ليوم البداية وتطابق المسير القديم يومًا ومجموعًا"
    },
    {
      "file": "payroll-shadow-attendance.test.cjs",
      "name": "SHADOW: السياسة الافتراضية تعريف صالح لمحرك السياسة، وشرائح التأخير القديمة تطابق نواة الشرائح لكل دقيقة 1..120"
    },
    {
      "file": "payroll-shadow-attendance.test.cjs",
      "name": "SHADOW: شرائح كسر اليوم تطابق المسير القديم، وأ4 أسقطت السقف اليومي فيُخصم كسر اليوم كاملًا"
    },
    {
      "file": "payroll-shadow-attendance.test.cjs",
      "name": "SHADOW: غياب ليلة 12 بمعامل 1.5 يُحسب ليوم 12 وحده ويطابق"
    },
    {
      "file": "payroll-shadow-attendance.test.cjs",
      "name": "SHADOW: أي فرق يومي يُسجل بسببه ولا يصبح المسير مؤهلًا للتحويل"
    },
    {
      "file": "payroll-shadow-attendance.test.cjs",
      "name": "SHADOW: ليلة لم تُقفل بعد تجعل التكافؤ جزئيًا بأكواد الأيام، ومصدر الخدمة غير المثبت لا يُحسب"
    },
    {
      "file": "payroll-shadow-attendance.test.cjs",
      "name": "SHADOW: فشل قراءة المصادر يُسجل ERROR ولا يرمي، فلا يوقف المسير القديم"
    },
    {
      "file": "payroll-shadow-attendance.test.cjs",
      "name": "SHADOW: زمن الحساب اليومي مقبول لمسير كامل"
    },
    {
      "file": "payroll-shadow-attendance.test.cjs",
      "name": "SHADOW: يوم الإيقاف عن العمل مستبعد زي المسير (بلا تأخير ولا نقص) فالتكافؤ يفضل مطابق"
    },
    {
      "file": "payroll-statutory.test.cjs",
      "name": "PSU-01: قرّاء breakdown.statutory — الغايب صفر، والتالف null (مش صفر)، واللقطة بالقرش"
    },
    {
      "file": "payroll-statutory.test.cjs",
      "name": "PSU-02: سطور القسيمة — سطر لكل خصم قانوني بعد التأمينات وجوه إجمالي الاستقطاعات؛ من غيرها أو بلقطة تالفة = السطور القديمة بالحرف"
    },
    {
      "file": "payroll-statutory.test.cjs",
      "name": "PSU-03: وعاء الضريبة من غير السطور القانونية مهما كانت علامتها، ودخل من غير أيام جديدة بيتضاف للتراكمي"
    },
    {
      "file": "payroll-statutory.test.cjs",
      "name": "PSU-04: تفسير الصافي السالب وتنبيه تغيّر الصافي بياخدوا الخصم القانوني من التفصيل"
    },
    {
      "file": "payroll-statutory.test.cjs",
      "name": "PSU-05: مصدر الكود — الحساب ورا سياقه (null والإعدادين مقفولين)، والتحقق بيطرح المجموع القانوني، ومفاتيح التفعيل ليها مسار واحد لمدير النظام"
    },
    {
      "file": "payroll-statutory.test.cjs",
      "name": "PSU-06: B4.4 (د) — قاعدة صندوق التدريب من حزمة الدولة (مثال البطاقة: 2,700 × 0.25% = 6.75 ← 10 جنيه)، وقايمة فروع الحساب، وكود التأمين الصحي في اللقطة"
    },
    {
      "file": "payroll-suspension-deductions.test.cjs",
      "name": "سقف الإيقاف بيطرح أيام المرضية المخصومة: 3 أيام مرضية بلا أجر + 28 إيقاف في دورة 31 يوم = صافي صفر مش سالب"
    },
    {
      "file": "payroll-suspension-deductions.test.cjs",
      "name": "سقف الإيقاف مع يوم مرضي بنسبة 75%: 30 يوم إيقاف تبقى 29.75 والصافي صفر"
    },
    {
      "file": "payroll-suspension-deductions.test.cjs",
      "name": "السقف: بلا مرضية زي ما كان، ومنزلتين مقصوصتين، وما ينزلش تحت الصفر، وبدون راتب بيتطرح"
    },
    {
      "file": "payroll-suspension-deductions.test.cjs",
      "name": "يوم الإيقاف ما يتخصمش تأخير أو نقص أو غياب من صف حضوره، والاعتماد والظل بيستبعدوه بنفس الطريقة"
    },
    {
      "file": "payroll-suspension-deductions.test.cjs",
      "name": "إجمالي الإضافي المحفوظ: القص الحالي والتقريب القديم مقبولين، والرقم الغلط مرفوض"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "LT-03: every WHOLE multiplier reference cell, including inclusive 60 and exclusive 120"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "LT-03: every WHOLE day fraction reference cell"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "LT-03: every WHOLE one-for-one reference cell"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "LT-08: MARGINAL portions match all four published examples without whole-input leakage"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "owner decision: MARGINAL fixed amounts apply fully from 60 and 120, retaining earlier reached tier"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "owner decision: MARGINAL day fractions apply fully from each boundary"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "MARGINAL mixed methods retain the rate-based previous portion and charge fixed boundary fully"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "zero effective input never charges fixed, fraction, or constant formula at zero under either mode"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "WHOLE noMatch explicitly distinguishes zero, fallback one-for-one, and block"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "MARGINAL unmatched prefix remains a used region after reaching later tiers"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "NONE is a matching explicit zero tier, and disabled rows do not override active geometry"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "LT-09 exact repeating rate produces 75.00 and never prices from raw six-decimal display"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "all rate units use the exact matching rate; currency remains currency and count forbids temporal pricing"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "FORMULA WHOLE and MARGINAL bind only the explicit input variable to amount or portion"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "inputFormula does not silently redefine a variable and formula on zero marginal portion is skipped"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "formula rates cannot be spoofed by a competing approximate variables map"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "multiple rational formula portions sum exactly before any display or final rounding"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "kernel raw display does not cause final double rounding; no caps or automatic money rounding are applied"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "explicit ROUND uses the supplied effective rounding mode while remaining kernel arithmetic stays exact"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "negative formula deduction becomes zero with exact original amount retained in trace"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "formula lazy branches, missing-input warnings, and both runtime zero-divisor modes survive composition"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "component, parameter, and typed namespaces remain explicit and exact"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "integers are required for effective minute/count values but exact fractional other units are retained"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "defensive geometry guards reject corrupt gaps, overlaps, missing final, inactive sets, and duplicate sequence"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "defensive method guards prevent missing, extraneous, zero, negative and oversized fraction parameters"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "own-property guards reject getters without calling them, ignore inherited variable values, and reject unknown names"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "exact decimal instances are reconstructed without trusting methods, prototype-only fractions, or oversized BigInts"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "trace is JSON-safe, deterministic, and keeps normalized exact fractions independently of display"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "shared kernel budget prevents 1000 individually valid formulas from creating an unbounded request"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "parent coordinator budget is cumulative across calls and remains attached to returned exact arithmetic"
    },
    {
      "file": "payroll-tier-kernel.test.cjs",
      "name": "internal exact evaluator preserves rational inputs and boolean results while public JSON shape stays unchanged"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "snapshot salary basis derives exact rates and all published deduction totals remain decimal strings"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "excused raw seconds are subtracted before second normalization, grace, and minute-unit rounding"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "seconds normalization honors FLOOR, CEIL and NEAREST including the half-minute boundary"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "fractional snapshot seconds retain exact excuse credit and excess credit clamps at zero"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "minute units are rounded after grace with deterministic FLOOR, CEIL and NEAREST boundaries"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "grace usage counts only reductions of unexcused minutes, preserving the allowance on zero and non-waived days"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "SUBTRACT consumes a genuine minute reduction even below the first monetary bracket"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "exhausted grace still preserves approved excuse credit and both grace modes include their exact bound"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "flexible-shift grace is explicitly opted in and denied attempts never consume its usage counter"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "shift grace overrides apply only when enabled and an explicit zero override disables that day benefit"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "attendance-exempt days and version attendance switches skip money and do not consume grace"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "no effective lateness cannot activate fixed or day-fraction brackets that begin at zero"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "daily caps apply before period budgets and the oldest day retains priority with every reduction exposed"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "PER_DAY rounds each final line once and sums those lines instead of rounding their raw sum"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "a fractional period cap uses the declared monetary precision without mismatched line totals"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "stored tier rounding overrides version rounding with identical precision in lines and the cap budget"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "PERIOD_ACCUMULATED sums snapshot minutes, uses only a period cap, and rounds a single period line"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "OCCURRENCE_COUNT counts positive days after approved excuses and attendance exemptions"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "stored-definition constraints reject a daily cap on accumulation and minute grace on COUNT instead of applying hidden rules"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "large snapshot salary cents survive rate derivation and separate daily rounding without a Number intermediary"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "the owner-approved marginal fixed boundary includes every reached tier without replacing earlier charges"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "formula context uses stored parameters and explicit named snapshot inputs only"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "derived rates, attendance quantities and salary metadata cannot be forged through input maps"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "duplicate, outside-period, impossible and reversed calendar dates are rejected without timezone guesses"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "366 explicit days are supported and a 367th day is a bounded-input rejection"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "invalid scalars, numeric money, forged day fields and missing required snapshot keys fail closed"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "raw JSON shape rejects prototype tricks and accessors without executing caller code"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "reordering incoming days cannot change chronological grace, cap allocation or the complete output, and inputs remain untouched"
    },
    {
      "file": "payroll-tier-preview.test.cjs",
      "name": "the shared 2m-step budget rejects aggregate work that remains below the separate per-day kernel limit"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-01: catalog defaults, HR last in the chain, court orders never exemptable, code immutable"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-02: SRS example — 1.5 days = 562.50 at a 375.00 day rate, 5% of base = 450.00, and the 25% cap rejects with its limit"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-02: the 0.25 step rejects 0.3 and accepts 0.75; zero, below-minimum and missing salary are rejected"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-03: a deduction above one day of salary escalates; exactly one day does not"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-06: chain snapshot — escalation step before HR, creator and target skipped with a recorded reason, HR always pending"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-10 and periods: 1000 over 3 installments sums exactly; payroll month of a date follows cycle day 23"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-11: with no floor or cap, deductions stop at zero net; the excess typed deduction is carried, attendance excess is dropped"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-11: SRS cap example — 50% of 11,750 with 750 attendance leaves 5,125 for ledger debits; credits are consumed in full"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "deduction form (money-requests lane): incident date, document reference, installments, the limits box and the dead reports panel are gone; «إرسال» previews internally"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-01 rule 2: a court order or statutory type cannot be moved to another category (so exemption can never be enabled by two edits)"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-01/03/04: owner unit, functional scope and the per-role escalation matrix normalize, snapshot and bump the version"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-06: a missing approver climbs to the next structural level; an escalation with nobody above goes to the executive; SKIP keeps the recorded skip"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-06 rule 1: the current step waits from the last action or the creation time"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-10 rule 2: day and hour installments split the units (remainder in the last), never the currency"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "Settings: deduction keys clamp to one shared range when read and reject out-of-range values when saved"
    },
    {
      "file": "payroll-typed-deductions.test.cjs",
      "name": "DD-11 order: statutory and court-order deductions come first and use cap room; administrative typed deductions are collected after the other typed ones"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U1: the component catalogue — six effect components stay as they were, the seventh is paid only"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U2: proration is the salary rule itself — full cycle pays in full, a joiner gets coverDays/monthlyDays truncated to the cent"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U3: the paid item adds the earned allowance in exact cents after everything else — nothing is taken from it"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U4: net protection never sees it — floor, cap and deduction room stay on 6000, and debts bigger than the salary leave the 1000 whole"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U5: a zero allowance stays out of every fingerprint — history, current source and request evidence saved before 071 still match"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U6: dated history takes the allowance as an optional seventh amount — old six-field input is still exact, a negative one is refused"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U7: a salary change that does not mention the allowance keeps the current one (never zeroes it), and a real change is dated"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U8: approval compares the month salary including the allowance; a snapshot saved before 071 means zero"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U9: payslip lines, payroll register buckets, bulk update, export, change log and field masking all know the seventh component"
    },
    {
      "file": "payroll-work-pressure.test.cjs",
      "name": "WP-U10: a raise request staged before 071 (six-field basis) is still valid; a new one carries the allowance with the same zero fingerprint"
    },
    {
      "file": "penalty-fine-cap.test.cjs",
      "name": "FCU-01: الحد من الحزمة — السعودية 5 أيام، ومصر ومن غير دولة من غير حد، والرقم بيتغيّر مع صف الحزمة"
    },
    {
      "file": "penalty-fine-cap.test.cjs",
      "name": "FCU-02: الحكم — من غير حد مفيش رفض؛ الجزاء لوحده أكبر من الحد؛ ومجموع الشهر أكبر من الحد؛ والحد بالظبط مسموح"
    },
    {
      "file": "penalty-fine-cap.test.cjs",
      "name": "FCU-03: مصدر الكود — ورا إعداده المقفول، وتحت قفل صف الموظف، ومن مسار الحسابات القانونية بس"
    },
    {
      "file": "penalty-fine-cap.test.cjs",
      "name": "PFU-05 (P4A-B01): صف «محتاج تحقق» بتاريخ الواقعة = من غير حد قانوني"
    },
    {
      "file": "people-feedback.test.cjs",
      "name": "PFU-01: 360 — الترشيح والرد، وملخص النتيجة: أقل من الحد مخفي كله (ولا العدد)، وغير كده عدد ومتوسط وتعليقات أبجديًا"
    },
    {
      "file": "people-feedback.test.cjs",
      "name": "PFU-02: 1:1 والتقدير — الاجتماع وتعديله (الأجندة للطرفين والباقي للمدير) ومهمة المتابعة وكلمة الشكر"
    },
    {
      "file": "people-feedback.test.cjs",
      "name": "PFU-03: سجل الموديولات — التلات ميزات مقفولة افتراضيًا جوه موديول الأداء، وكل واحدة بمسار شاشتها"
    },
    {
      "file": "people-feedback.test.cjs",
      "name": "PFU-04: مصدر الكود — الرد من غير مقيّم ولا وقت ولا تدقيق، النتيجة بعد القفل وبملخص الحد الأدنى، والحكم بعد قفل صف الموظف"
    },
    {
      "file": "people-feedback.test.cjs",
      "name": "PFU-05: الواجهة — التلات شاشات بعناوينهم في القايمة، والتقويم بيعرض الاجتماعات"
    },
    {
      "file": "performance-batching.test.cjs",
      "name": "PB-01: حجم الدفعة تحت حد SQL Server لأي عدد أعمدة، وأعضاء المسير بيتحفظوا على دفعات"
    },
    {
      "file": "performance-batching.test.cjs",
      "name": "PB-02: حجم حزمة TDS الافتراضي 32,767 ومتضبط من DB_PACKET_SIZE في حدود SQL Server بس"
    },
    {
      "file": "performance-batching.test.cjs",
      "name": "PB-03: ذاكرة الدفعة بتقرا القراءة المرجعية مرة واحدة، ومن غير دفعة السلوك القديم بالحرف"
    },
    {
      "file": "performance-batching.test.cjs",
      "name": "PB-04: نسخة لمعاملة تانية ماتورّثش ذاكرة الدفعة، والسماحية دالة عادية مش حقل سهم ماسك الخدمة الأصلية"
    },
    {
      "file": "performance-batching.test.cjs",
      "name": "PB-05: وردية اليوم في الدفعة بتتحل مرة، وكل نداء ياخد نسخة مستقلة (تعديلها مابيوصلش للمحفوظ)"
    },
    {
      "file": "performance-batching.test.cjs",
      "name": "PB-06: السماحية العامة بتتقري بالقارئ اللي بيتمرر (الدفعة)، ومن غيره نفس قراءة الإعداد"
    },
    {
      "file": "performance-batching.test.cjs",
      "name": "PB-07: الدفعة متوصّلة في المسارين الكبار ومش في غيرهم، ومفتاح الإعفاءات بنفس المدى بالظبط"
    },
    {
      "file": "performance-goals.test.cjs",
      "name": "PU-01: title, kind, weight, values, period, reason and the employee stamp"
    },
    {
      "file": "performance-goals.test.cjs",
      "name": "PU-02: a new closed module with its permission, the judgment before the transaction and the locks inside it, and the routes"
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-01: sections with weights, items and server keys; cycle kind, dates and audience"
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-02: answers against the frozen template and the period goals, and the weighted score"
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-03: launching and submitting under the row lock with the judgment after it, no other service inside the transaction, and the routes"
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-04: calibration bands, guide distribution and cleaners; the adjustment judged again under the locks in the objection order; the objection staged by the request under the assignment lock"
    },
    {
      "file": "performance-reviews.test.cjs",
      "name": "RU-05: reward suggestions — the rule values, no bonus written by the suggestion, the manager submits through the bonuses service outside any transaction after claiming the row, and the improvement plan kind"
    },
    {
      "file": "permission-window.test.cjs",
      "name": "إذن صباحي 60 دقيقة (09:00–10:00) ووصول 10:30: الإذن يغطي ساعة والباقي 30 تأخير عادي"
    },
    {
      "file": "permission-window.test.cjs",
      "name": "إذن صباحي 120 دقيقة (09:00–11:00) ووصول 11:00: مفيش تأخير"
    },
    {
      "file": "permission-window.test.cjs",
      "name": "إذن مش من أول الوردية (09:30–10:30) ووصول 10:30: أول نص ساعة مش متغطي فيتحسب تأخير"
    },
    {
      "file": "permission-window.test.cjs",
      "name": "إذن مسائي 60 دقيقة (17:00–18:00) وخروج 17:00: مفيش نقص، وخروج 16:30: نقص 30 دقيقة بس"
    },
    {
      "file": "permission-window.test.cjs",
      "name": "الإذن الصباحي ما بيغطيش الخروج بدري والمسائي ما بيغطيش التأخير"
    },
    {
      "file": "permission-window.test.cjs",
      "name": "مدة الإذن من وقتيه: HH:MM وH:MM، ونص الليل، والوقت الغلط"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-01: القواعد الصافية — النسخة السارية والجاية، وأساس الإقرار، وموعد القفل، وحالة الموظف"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-02: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، والمسارات الثابتة قبل ‎:id، والمسارات المسموحة والحساب مقفول"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-03: ربط البوابة في الواجهة — التحويل بكود الخادم، والفحص مرة مع كل دخول، وشاشة الإقرار والقارئ"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-04: الشاشات والقايمة الجانبية وصلاحيات المسارات والتقرير"
    },
    {
      "file": "policies-ui.test.cjs",
      "name": "PU-05: ملف السياسة بالتدفق — البصمة والحجم من غير تحميل الملف كله، وتيار الإرسال بيقطع قبل ما يكمل لو الملف مش هو"
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-01: مين بيشغل مقعد — خدمته ماانتهتش، وفي وحدة الوظيفة"
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-02: أرقام الوظيفة — المعتمد والمشغول والشاغر والزيادة"
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-03: حكم شغل مقعد — الفرع، والقسم والفريق، والحالة، والشاغر مع الإنفاذ"
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-04: تنضيف مدخلات وظيفة جديدة، والميزانية، والعدد"
    },
    {
      "file": "positions-rules.test.cjs",
      "name": "PQ-05: كود الوظيفة، وتطبيع المسمى ومفتاح التوليد"
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-01: القايمة والمسار والعنوان — بصلاحية العرض، وتبع موديول positions المقفول افتراضيًا"
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-02: شاشة الوظائف — الأزرار من حكم الخادم، ورسالة الترحيل الناقص، وأعمدة التقرير"
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-03: النماذج — الوحدة عند الإنشاء بس، والربط للنشطة ولصاحب الإدارة، والتوليد معاينة ثم تطبيق"
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-04: خطوة اختيار الوظيفة عند التعيين — مع الموديول، وإجبارية مع الإنفاذ، وفشل القايمة بيوقّف الحفظ، والرقم حمولة"
    },
    {
      "file": "positions-ui.test.cjs",
      "name": "PU-05: طلب «وظيفة جديدة / زيادة عدد» — وجهته متسمّية وتبع الموديول، والحقول بأسمائها عند المعتمد، وحقول النموذج فوق حقول الباني"
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-01: the mark closes the session until the start day only; a system admin and an unlinked account stay outside"
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-02: the feature is closed by default; the guard, the permission-less session, and the allowed routes"
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-03: the web app sends a pre-boarding account to its documents, lists the pre-boarding screens only, and greets it with the start date"
    },
    {
      "file": "preboarding.test.cjs",
      "name": "Codex P3L-B01: a pre-boarding session sees only the task that awaits itself — no manager, assigner or task-admin authority"
    },
    {
      "file": "prepayroll-migration.test.cjs",
      "name": "NAM-14/28/30 migrations preserve identity and dates, mask bank history, canonicalize known work types, and replay"
    },
    {
      "file": "prepayroll-migration.test.cjs",
      "name": "unknown work types block the data transition without changing other rows"
    },
    {
      "file": "probation.test.cjs",
      "name": "PT-01: the effective end date, the reason, the extension date, the task titles and the row stamp"
    },
    {
      "file": "probation.test.cjs",
      "name": "PT-02: the judgment before the transaction and the comparison under the employee row lock; the change log; the daily job and its settings"
    },
    {
      "file": "probation.test.cjs",
      "name": "PT-03: the probation screen, its menu entry and title"
    },
    {
      "file": "profile-self-service-ui.test.cjs",
      "name": "the camera button is wired: it opens an image picker, uploads an employee photo and saves it through the self endpoint"
    },
    {
      "file": "profile-self-service-ui.test.cjs",
      "name": "«تعديل الملف» is wired: it opens the edit dialog prefilled with my data and submits only the changed fields as «تحديث بيانات شخصية»"
    },
    {
      "file": "profile-self-service-ui.test.cjs",
      "name": "request details and approvals show every personal field with an Arabic label and readable values"
    },
    {
      "file": "profile-self-service-ui.test.cjs",
      "name": "phone layout: the header wraps, the tabs scroll inside their own strip and the grids stack at ~390px"
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-01: ملف التعريف — اسم المنتج، البداية والنطاق، standalone، عربي RTL، والأيقونات بمقاساتها وأغراضها"
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-02: الأيقونات PNG سليمة بالمقاس المكتوب — العادية بزوايا شفافة، و«maskable» وأيقونة iOS من غير شفافية، وبلون الأيقونة"
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-03: زرار التثبيت — مابيترسمش من غير عرض المتصفح، وبيسمع العرض والتثبيت، ومكانه آخر القايمة قبل «بواسطة»"
    },
    {
      "file": "pwa-ui.test.cjs",
      "name": "PW-04: من غير service worker ولا تخزين مؤقت ولا تغيير في viewport — وخطوة HTTPS مكتوبة في دليل التحديث"
    },
    {
      "file": "queue-ui.test.cjs",
      "name": "QU-01: حالات الطابور الأربعة بأسمائها، والمسارات بنفس الخادم"
    },
    {
      "file": "queue-ui.test.cjs",
      "name": "QU-02: اللوحة في صفحة المهام المجدولة، بالعدّ والميتة والإعادة، وبتقول محتاجة ترحيل 086 قبله"
    },
    {
      "file": "queue-ui.test.cjs",
      "name": "QU-03: ملخص /health للطابور بالعدد بس"
    },
    {
      "file": "r2-step9-data.test.cjs",
      "name": "R2 / الموظف 154: مكونات الراتب كلها صفر أو فارغة تُستبعد NO_SALARY_DEFINED حتى في الوضع الانتقالي"
    },
    {
      "file": "r2-step9-data.test.cjs",
      "name": "R2: أي مكون موجب يبقى راتبًا معرّفًا في الوضع الانتقالي (القاعدة لا تستبعد راتبًا حقيقيًا)"
    },
    {
      "file": "r2-step9-data.test.cjs",
      "name": "R2: الخطاب الرسمي يعامل اسم الشركة والمسمى المؤقتين كحقلين ناقصين برسالة عربية واحدة"
    },
    {
      "file": "r2-step9-data.test.cjs",
      "name": "R2 / ترحيل 021: نص القيم المؤقتة مطابق للكود والواجهة، وأكواد THROW فريدة، ولا حذف"
    },
    {
      "file": "r2-step9-data.test.cjs",
      "name": "R2 / مستندات HR: رمز اسم الشركة أو المسمى بقيمة مؤقتة يُرفض «بيان مطلوب غير متوفر»، ورأس المستند لا يطبع الاسم المؤقت"
    },
    {
      "file": "r2-step9-data.test.cjs",
      "name": "R2 / قوالب الخطابات وبيانات الشركة: الاسم المؤقت = غير مضبوط (التنبيه يظهر، ولا يُحفظ من الإعدادات)"
    },
    {
      "file": "r2-step9-data.test.cjs",
      "name": "R2 / ملف الموظف وطلب تغيير المسمى: القيمة المؤقتة لا تُحفظ كمسمى مؤكد"
    },
    {
      "file": "r2-step9-data.test.cjs",
      "name": "R2 / ترحيل 024: يعيد القيم الأصلية بنفس نص القيم المؤقتة، بلا حذف، كل UPDATE مشروط، وأكواده فريدة"
    },
    {
      "file": "ready-batch-ui.test.cjs",
      "name": "B1.2: «تغيير كلمة المرور» في كارت المستخدم لكل حساب غير حساب المجال، والجلسة بتقول حساب المجال بس"
    },
    {
      "file": "ready-batch-ui.test.cjs",
      "name": "B1.2: اللينك المكسور في صفحة الوظيفة بيودّي لصفحة المتقدمين، ومفيش أزرار من غير فعل"
    },
    {
      "file": "ready-batch-ui.test.cjs",
      "name": "B1.2: مفيش «نظام الموارد البشرية» ولا «HR System» كاسم للمنتج، والأيقونة موجودة"
    },
    {
      "file": "ready-batch-ui.test.cjs",
      "name": "B1.2: زرار الحفظ في «أيام العمل» شغّال وبيظهر لما فيه تعديل بس"
    },
    {
      "file": "ready-batch-ui.test.cjs",
      "name": "B1.2: شاشة الحضور بتقول سبب «عطلة» واسم العطلة في اليوم الفاضي"
    },
    {
      "file": "ready-batch-ui.test.cjs",
      "name": "B1.2: مفيش كلمة سر مكتوبة جنب حساب الدخول في الملفات"
    },
    {
      "file": "recruitment-jobs.test.cjs",
      "name": "RU-01: openings, the salary range, the start date, texts, status transitions and what publishing needs"
    },
    {
      "file": "recruitment-jobs.test.cjs",
      "name": "RU-02: the destination is wired at its seven points, runs with the transaction manager only, and the service is scoped and writes fields"
    },
    {
      "file": "report-builder.test.cjs",
      "name": "RBU-01: القاموس — خمس مصادر بصلاحيات وموديولات مسجّلة، كل مصدر مربوط بالموظف (النطاق على e.[branchId])، ومفيش عمود حساس من غير صلاحية"
    },
    {
      "file": "report-builder.test.cjs",
      "name": "RBU-02: التعريف — مصدر وأعمدة من القاموس، فلاتر بعامل وقيمة يناسبوا نوع العمود، وتجميع بعمود بيتجمّع بيه"
    },
    {
      "file": "report-builder.test.cjs",
      "name": "RBU-03: الاستعلام — تعبيرات القاموس بس، وكل قيمة معامل، وحروف LIKE بتتهرّب، والنطاق والشرط الثابت دايمًا في WHERE، والتجميع بالعدد ومجموع الأرقام"
    },
    {
      "file": "report-builder.test.cjs",
      "name": "RBU-04: سجل الموديولات — ميزة reports.builder مقفولة افتراضيًا بمسار شاشتها، وشاشة العرض القديمة زي ما هي"
    },
    {
      "file": "report-builder.test.cjs",
      "name": "RBU-05: مصدر الكود — التشغيل بصلاحيات القارئ ونطاقه (حتى المتشارك)، وصلاحية الحقل على كل عمود التعريف بيلمسه، والحفظ بصلاحيته تحت قفل مدى"
    },
    {
      "file": "report-builder.test.cjs",
      "name": "RBU-06: الواجهة — شاشة البانِي بعنوانها في القايمة، والقاموس من الخادم"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "payroll month: cycle 23 → «راتب سبتمبر» = 23 أغسطس → 22 سبتمبر، ويوم 23 يبدأ شهر أكتوبر"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "the web payroll-month math matches the payroll engine for every cycle day and month (2024–2027)"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "day range editing, validation, overlap and labels"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "month quick-pick helpers: options around the current payroll month, labels, optional max length"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "DayRangeFilter renders the month quick-pick + «من تاريخ / إلى تاريخ» and the payroll-month navigation"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "DayRangeFilter keeps a partially typed date (year typed digit by digit) instead of resetting the input"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "PayrollPeriodSelect: a payroll run stays chosen by period but shows its exact days"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API range helper: from/to wins, month stays backward compatible, bad ranges are 400"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API «تاريخ الطلب» filter: local days → UTC bounds [start, end) for a SYSUTCDATETIME column, both-or-none"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API: deductions and bonuses lists filter «من تاريخ / إلى تاريخ» on the server inside every page (before the 500 cap)"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API: /attendance/payroll-month, and the attendance reports/sheet/overtime/punches accept from/to (parameterised, month still works)"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "attendance screens open on the payroll month with «من تاريخ / إلى تاريخ» (no month picker left)"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "payroll screens: day range on deductions/bonuses/runs report; run period stays a month but shows its exact dates"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "loans screen: filter by request date or by instalment month, with the month quick-pick and exact days"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "reports dashboard: attendance and overtime summaries follow the range filter, not the calendar month"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "attendance fixes: permissions has no unused Calendar import, exemption counters follow the chosen range"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "payroll-period pickers (GOSI, cost centers, financial reports, leave settlement) open on the payroll month and show its days"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "no month-only date filter is left in src/: every remaining month input is a form field or a payroll-run period that shows its days"
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "employee-code search, a readable payroll-month placeholder, and every closable leave year"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-01: the dictionary holds six metrics with one written definition each, and the rules behind them"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-02: the dashboard and the workforce report read one function, and absence has one condition"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-03: export tables keep the screen columns, the amount column follows the permission, and dangerous text stays text"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-04: status and category labels on the server are the labels of the screens"
    },
    {
      "file": "report-metrics.test.cjs",
      "name": "MX-05: the reports screen exports from the server, shows the dictionary strip, and the dashboard shows the active number"
    },
    {
      "file": "request-audience-conditions-ui.test.cjs",
      "name": "AU-01: محرر الجمهور فيه شروط صفات الموظف — بتتبعت لما يبقى فيه شرط بس، وبتتحمّل من المتخزّن، والجملة بتذكرها"
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-01: «السعوديين على عقد محدد المدة» — للي ينطبق عليه بس؛ والمالك برّه القيد، وبانِي الأنواع بيشوف ومايقدّمش"
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-02: كل شرط لوحده — الجنسية، ونوع العقد، والدرجة، وتاريخ التعيين"
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-03: الشرط قيد — موضوع من غير صفات، وشرط تالف أو مش معروف = مش من الجمهور؛ ومن غير شروط الشكل القديم زي ما هو"
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-04: الصفات بتتحط على الموضوع لما صف الموظف شايلها بس؛ و«مين» و«فين» لازم يتحققوا مع الشروط"
    },
    {
      "file": "request-audience-conditions.test.cjs",
      "name": "AC-05: الشرط المتخزّن بيتدقق كله وقت التقييم — التالف مابيتحققش لحد، حتى للي كان هيطابق جزءه السليم"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-01: تعديل سلسلة الفئة جوّه المحرر المشترك — «سلسلة مختلفة لكل فرع» بكل الفروع لحساب الشركة"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-02: حساب الفرع — السلسلة العامة للقراءة، وصف فرعه بس في الجدول (يقدر يعمل سلسلة فرعه)"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-03: «نسخة خاصة بفرع» — الكود مقفول على العامة، والفروع اللي مالهاش نسخة بس، والفرع المختار من الجدول"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-04: إنشاء سلسلة — «كل الفروع» لحساب الشركة بس، وحساب الفرع على فرعه؛ ومفيش هدف = مفيش محرر"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-05: نطاق الفروع في الواجهة — مرآة branchScopeOf (قائمة فروع أو null للشركة)"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-06: ملخص الخطوات والاستخدام"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-07: «نفس السيناريو» والاختيار الافتراضي في «خلّي طلبات الفئة دي كلها على سلسلة واحدة»"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-08: دوال الخادم الصافية — مفتاح الربط، الأنواع الثابتة، الوضع، وكود السلسلة الجديد"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-09: «بانِي الطلبات» هو المكان الواحد — الفئات بسلاسلها، الشارات والإجراءات، المحرر جوّه الشاشة، والاستخدام وفلتر «غير مستخدمة»"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-10: «الاعتمادات والموافقات» بقت مكتبة السلاسل بنفس المحرر، ومعاها سطر بيدل على «بانِي الطلبات»"
    },
    {
      "file": "request-category-chains-ui.test.cjs",
      "name": "RC-UI-11: الخادم — مسارات بالصلاحيتين، ربط الفئة لكل الشركة، ومفتاح الربط مقفول في الإعدادات العامة"
    },
    {
      "file": "request-destinations-effects.test.cjs",
      "name": "PERSONAL_DATA_UPDATE: blank optional fields sent by the screen never wipe saved data"
    },
    {
      "file": "request-destinations-effects.test.cjs",
      "name": "EMERGENCY_CONTACT: optional relation/alt phone left blank keep their saved values"
    },
    {
      "file": "request-destinations-effects.test.cjs",
      "name": "CUSTODY_LOSS_REPORT: only the requester's held custody, once; debit equals asset value"
    },
    {
      "file": "request-destinations-effects.test.cjs",
      "name": "EXPENSE_CLAIM / PER_DIEM: an approved claim always writes its credit, never a silent no-op"
    },
    {
      "file": "request-destinations-effects.test.cjs",
      "name": "PUNCH_CORRECTION: a correction without a valid day, punch type or HH:MM time is rejected, not completed empty"
    },
    {
      "file": "request-destinations-effects.test.cjs",
      "name": "CUSTODY_REQUEST: approval without assets fails instead of completing with no assignment"
    },
    {
      "file": "request-destinations-effects.test.cjs",
      "name": "BANK_ACCOUNT_CHANGE / RESIGNATION: a missing employee fails the approval instead of completing without effect"
    },
    {
      "file": "request-destinations-effects.test.cjs",
      "name": "SALARY_INCREASE: an incomplete salary file names what HR must complete instead of an opaque 409"
    },
    {
      "file": "request-employee-card-ui.test.cjs",
      "name": "the card shows the employee identity and organization, and says who filed it on behalf"
    },
    {
      "file": "request-employee-card-ui.test.cjs",
      "name": "no on-behalf line for a request the employee filed himself, and missing organization shows a dash — never a raw id"
    },
    {
      "file": "request-employee-card-ui.test.cjs",
      "name": "a masked confidential request (no requester data from the server) renders nothing"
    },
    {
      "file": "request-employee-card-ui.test.cjs",
      "name": "all three request detail views show the card at the top, before the payload"
    },
    {
      "file": "request-employee-card-ui.test.cjs",
      "name": "the request type carries the card data, and the server masks it for a confidential non-party"
    },
    {
      "file": "request-employee-card-ui.test.cjs",
      "name": "«بانتظار موافقتي» counts pending attendance exemptions awaiting the user and links to the pending filter"
    },
    {
      "file": "request-employee-card-ui.test.cjs",
      "name": "creating an exemption reports the instant HR approval the server returned, and the creator hint stays server-driven"
    },
    {
      "file": "request-employee-card-ui.test.cjs",
      "name": "bonus and deduction success messages follow the status the server returned: instant for HR, the chain for everyone else"
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-01: إعداد النوع — نفس أدوار وتسميات محرك المهام، ونفس حد المهلة، وبيتبعت لما يتغيّر بس"
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-02: كارت مهمة التنفيذ — مكتوب إنها بتكمّل الطلب، ولينك الطلب، ومن غير أزرار الإدارة"
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-03: تقرير «معتمد ومااتنفذش» — فلتر من الخادم جوه لوحة الطلبات، بمسؤول التنفيذ وعمر الاعتماد في الجدول والتصدير"
    },
    {
      "file": "request-execution-ui.test.cjs",
      "name": "RXU-04: إجراء «اتنفّذ» — في سجل الطلب بالتلات شاشات، وفي إشعار صاحب الطلب"
    },
    {
      "file": "resignation-legal-terms.test.cjs",
      "name": "RTU-01: مصر — إخطار 3 شهور من تاريخ التقديم ومهلة رد 10 أيام؛ والإخطار الأقصر والمهلة اللي عدّت متعلّمين"
    },
    {
      "file": "resignation-legal-terms.test.cjs",
      "name": "RTU-02: السعودية — إخطار 30 يوم ومهلة رد 30 يوم؛ ودولة تانية أو تاريخ ناقص أو قبل سريان الصف = مفيش"
    },
    {
      "file": "resignation-legal-terms.test.cjs",
      "name": "RTU-03: الحد الأدنى للأجور — مصر من الحزمة والسعودية مالهاش صف؛ والفرق للإجمالي الأقل بس"
    },
    {
      "file": "resignation-legal-terms.test.cjs",
      "name": "RTU-04: مصدر الكود — عرض بس: ورا إعداده المقفول ولمن تنظيم الموظف ظاهر له، ومن مسار الحسابات القانونية؛ وتنبيه الأجور قراءة بنطاق الحساب"
    },
    {
      "file": "resignation-legal-terms.test.cjs",
      "name": "RTU-06 (P4A-B01): صف «محتاج تحقق» يوم التقديم = مفيش مدد قانونية"
    },
    {
      "file": "roles-audit-leaks.test.cjs",
      "name": "D9: الكتالوج الكامل لأنواع الخصم والمكافأة لحامل «إدارة الأنواع» بس، وقائمة نموذج الطلب مفتوحة بنطاق صاحبها"
    },
    {
      "file": "roles-audit-leaks.test.cjs",
      "name": "D11: /deductions/reports بنفس بوابة نظيره /reports/financial/deductions — مركز التقارير + عرض الرواتب"
    },
    {
      "file": "roles-audit-leaks.test.cjs",
      "name": "D6 الخصومات والمكافآت: اللي مالوش صفة على الطلب بياخد نفس رد الغايب — في العرض وفي كل إجراء على :id"
    },
    {
      "file": "roles-audit-leaks.test.cjs",
      "name": "D6 الخطابات: خطاب موجود خارج النطاق = نفس رد الخطاب الغايب في /letters/:id/download و/files/:id"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "registry: the two payroll permissions the disbursement feature relies on exist with their exact Arabic labels"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "registry: every permission sits in exactly one module and has a one-line description — nothing can vanish from the screen"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "presets: the three new roles carry exactly their list — no more, no less"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "presets: payroll_manager cannot approve or pay, read_only cannot write or read the bank sheet, data_entry cannot archive"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "read-only roles: every permission they carry opens GET routes only (a future POST under a «view» permission fails here)"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "branchScopeOf: «كل الفروع» opens the scope only on a literal true; everything else stays locked, and the empty scope stays closed"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "scope is not permission: RolesGuard and userHasPerm ignore «كل الفروع» completely"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "effective permissions = role ∪ grants − revokes (what the users screen shows)"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "source guards: only the super admin flips the switch, it bumps tokenVersion, rides in the JWT and is cross-checked on every request"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "migration 064 is tied to the code letter by letter, additive, idempotent by construction and SQL Server 2019-safe"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "legacy importer: a role with an approved preset is created from the preset, and trimmed permissions do not come back as per-user grants"
    },
    {
      "file": "roles-scope-presets.test.cjs",
      "name": "screens: the roles page shows the whole registry with search, copy and orphan flags; the users page shows effective permissions and the scope switch"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-01: كل مسار تابع لموديول مسجّل"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler"
    },
    {
      "file": "routes-guards.test.cjs",
      "name": "RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة"
    },
    {
      "file": "safety.test.cjs",
      "name": "SFU-01: البلاغ — النوع والتاريخ (مش في المستقبل ولا أقدم من 30 يوم ويوم حقيقي) والمكان والوصف، والمصاب الافتراضي حسب النوع"
    },
    {
      "file": "safety.test.cjs",
      "name": "SFU-02: المراجعة والإجراء والموعد وخطوات الحالة"
    },
    {
      "file": "safety.test.cjs",
      "name": "SFU-03: سجل الموديولات — موديول safety مقفول افتراضيًا في الباقة الكاملة بصلاحيته ومساريه"
    },
    {
      "file": "safety.test.cjs",
      "name": "SFU-04: مصدر الكود — كل كتابة تحت قفل صف الحادث والحكم على النطاق بعده، المهام من محرك المهام بحدث التكليف، والحجب بفرع الموظف الحالي"
    },
    {
      "file": "safety.test.cjs",
      "name": "SFU-05: الواجهة — الشاشتين بعنوانهم في القايمة، والبلاغ مابيبعتش فرع ولا حالة"
    },
    {
      "file": "salary-bands.test.cjs",
      "name": "SBU-01: نطاق الدرجة — المنتصف = (الأدنى + الأقصى) ÷ 2، والنطاق الناقص أو المقلوب = من غير نطاق"
    },
    {
      "file": "salary-bands.test.cjs",
      "name": "SBU-02: نسبة المقارنة = الراتب ÷ المنتصف، والموقع (تحت الأدنى / جوه النطاق / فوق الأقصى)، ومن غير نطاق = null"
    },
    {
      "file": "salary-bands.test.cjs",
      "name": "SBU-03: أساس المقارنة — الأساسي (الافتراضي) أو إجمالي المكونات الثابتة"
    },
    {
      "file": "salary-bands.test.cjs",
      "name": "SBU-04: الموديول مقفول افتراضيًا وفي الباقة الكاملة، بصلاحيته، وتقرير السلّم قراءة بصلاحية عرض الرواتب وبنطاق الفروع"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "client salary values stay exact strings and required payroll month/reason are strict; incomplete drafts remain possible"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "client cannot forge financial basis or approval even as null; legacy increase_pct is discarded"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "submission captures all six exact amounts, branch, actor and revision under caller transaction without writes"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "very large cents and tiny positive increases retain exact threshold meaning despite rounded display percentage"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "zero base and unchanged or lower basic salary do not invent a usable increase percentage"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "missing component/currency and missing/inactive/moved employee stop submission before any financial write"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "stored basis binds request, payroll month, reason and exact salary; payload edits cannot reuse an approval basis"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "old undated, daily-dated and unstaged pending requests fail409 without inferring a payroll month"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "all approval threshold operators compare the exact ratio and reject malformed threshold values"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "future payroll-month approval records trusted actor on request only; no current salary/history writer is called"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "due execution calls the shared writer with exact proposed amount, request reference and real approving actor"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "salary drift or request identity mismatch prevents both future scheduling and current execution"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "execution requires trusted approval and allowed status; actor cannot be taken from request creator"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "explicit auto-approval context can schedule future execution and stored actor must match later audited decisions"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "resubmission auto approval uses current transaction actor and ignores approval retained from an older cycle"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "actual request runtime fields require payroll month/reason and remove derived/private custom inputs without modifying catalog"
    },
    {
      "file": "salary-change-requests.test.cjs",
      "name": "actual configured chain retains managerial route and server-derived executive threshold at exact ten percent"
    },
    {
      "file": "salary-items.test.cjs",
      "name": "SU-01: البذرة — أكواد فريدة، وترتيبها = الرتب الثابتة قبل الجدول، ومكونات الراتب بتتناسب بأيام الخدمة، والبنود القانونية الجديدة مابتتحسبش"
    },
    {
      "file": "salary-items.test.cjs",
      "name": "SU-02: المطابقة على 500 بند مولّدين بكل الحالات — نفس الناتج بالحرف بالترتيب الثابت وبترتيب الجدول، والمجاميع = الأعمدة المحفوظة"
    },
    {
      "file": "salary-items.test.cjs",
      "name": "SU-03: الترتيب من الجدول — تغييره بيرتّب السطور والأعمدة من غير ما يغيّر مبلغ، والسطر اللي مالوش بند في الآخر"
    },
    {
      "file": "salary-items.test.cjs",
      "name": "SU-04: مصدر الكود — كل شاشة بتعرض البنود بتقرا الترتيب من الجدول، والتعديل لحساب الشركة تحت قفل الصف وبسطر تدقيق، ومفيش إضافة ولا مسح"
    },
    {
      "file": "saudization-report.test.cjs",
      "name": "SZU-01: نسبة السعوديين لكل كيان — السعودي بقاعدة التأمينات، ومن غير جنسية متعدّين لوحدهم، وفروع من غير كيان في مجموعة"
    },
    {
      "file": "saudization-report.test.cjs",
      "name": "SZU-02: رخصة العمل وتوثيق العقد في قوى نوعين في بذرة كتالوج المستندات ومرآتها، من غير تغيير في الباقي"
    },
    {
      "file": "saudization-report.test.cjs",
      "name": "SZU-03: مصدر الكود — تقرير قراءة لحساب بكل الفروع، ومن غير عمود إقامة جديد على الموظف"
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-01: names, saved filters, due dates and the previous payroll month"
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-02: the job is registered and goes through tick; mail carries the file; the send uses the owner's identity now"
    },
    {
      "file": "saved-reports.test.cjs",
      "name": "SV-03: the reports screen holds the saved reports card with the server's labels"
    },
    {
      "file": "schedule-tools.test.cjs",
      "name": "STU-01: بداية الأسبوع يوم أحد حقيقي (زي مفتاح الجدول القايم)، والأسابيع اللي بعده، وخانة الدور"
    },
    {
      "file": "schedule-tools.test.cjs",
      "name": "STU-02: قواعد النمط والنسخ والتطبيق والنشر — بحدودها، والهدف مش أسبوع فات"
    },
    {
      "file": "schedule-tools.test.cjs",
      "name": "STU-03: مصدر الكود — المسارات ورا الموديول والميزة وصلاحية إدارة الحضور؛ الكتابة من حفظ الجدول القايم بس؛ والنشر حدث إشعار بيتحكم عليه وقت التوزيع ووقت الإرسال"
    },
    {
      "file": "schedule-tools.test.cjs",
      "name": "STU-04: الواجهة — «أدوات الجدولة»: نسخ، أنماط، تطبيق، ونشر؛ ونمط «كل الفروع» لحساب بكل الفروع بس؛ والقايمة والعنوان"
    },
    {
      "file": "schedule-tools.test.cjs",
      "name": "STU-05: فحص الجدول — مدة الوردية والراحة (بالليلي)، ومخالفة واحدة لكل قاعدة بأسوأ قيمة، وقواعد النشر"
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "TZ: الفاضي = توقيت الجهاز، والاسم المعروف مقبول، والغلط بيوقف الإقلاع برسالة واضحة"
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "قايمة المهام: كل مهمة بموعد صالح، وكل موعد في الكود من القايمة ومتسجل مرة واحدة، ومفيش @Cron خارجها"
    },
    {
      "file": "scheduled-jobs.test.cjs",
      "name": "الشاشة: «المهام المجدولة» في الإعدادات بصلاحية إدارة الإعدادات، والخادم بيشترط حساب على كل الفروع"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-01: 084 سجل التدقيق — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-02: 086 الطابور والـoutbox — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-03: 087 الإشعارات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-04: 088 المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-05: 089 مهمة التنفيذ — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-06: 090 التفويض — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-07: 091 السياسات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-08: 092 إقرار المستندات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-09: 093 التعليقات — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-010: 094 الحقول المخصصة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-011: 095 فترات الخدمة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-012: 096 قواعد المهام — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "schema-readiness.test.cjs",
      "name": "SR-013: 097 الوظائف المعتمدة — الناقص بيتفحص مع كل نداء، والموجود بيتحفظ"
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-01: cookie attributes from the environment, its name, the Set-Cookie value, reading it, and the CSRF verdict"
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-02: the server reads Bearer first with one reader for both the token and the verdict, checks CSRF after the account, and hands the cookie over"
    },
    {
      "file": "session-cookie.test.cjs",
      "name": "SK-03: the web app keeps no token — nothing in storage, no Authorization header, every call through the session with the CSRF token on writes"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 1: تغيير السماحية العامة يولّد نسخة مؤرخة لكل تعريف ساري، والقيمة القديمة تفضل في نسخها"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 1: يوم قبل تاريخ السريان يحتفظ بسماحيته القديمة، واليوم من تاريخ السريان ياخد الجديدة"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 1: سماحية الوردية تعلو العامة قبل التغيير وبعده"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 1: حفظ attendance.grace_minutes بيولّد النسخة المؤرخة داخل نفس معاملة الأقفال"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 1: للسماحية العامة مدخل في «سياسات النظام» بحدودها الرقمية داخل مجموعة الحضور"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 1: نصّ المدخل بيقول إنه من يوم التغيير وما بعده، وإن سماحية الوردية تعلو عليه"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 1: «أيام العمل والدوام» تفضل عرضاً للقراءة وتدلّ على المدخل الجديد"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 2: التراكم اليومي بيقرا payroll.shortfall_enabled (المفتاح المبذور اللي الشاشة بتضبطه)"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 2: مفيش قارئ تاني لإعداد نقص الساعات بمفتاح غير مبذور"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 3: معامل عقوبة الغياب وباقي المفاتيح الرقمية المبذورة ليها حد أدنى"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 3: الحد الأعلى ورسالة عربية لمعامل عقوبة الغياب ومضاعف العطلة"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 4: مفاتيح التراكم اليومي ودولة النظام مبذورة بقيمها الاحتياطية"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 4: كل مفتاح إعداد يقرأه الخادم بقيمة احتياطية مبذور (PATCH /settings/config مايردّهوش 404)"
    },
    {
      "file": "settings-audit-fixes.test.cjs",
      "name": "الإصلاح 5: الرد بيغطي مفاتيح ملف الشركة الـ23 كلها والأسماء القديمة كما هي"
    },
    {
      "file": "settlement-applied-label.test.cjs",
      "name": "SAL-01: APPLIED من غير مسير = اتسوّى في التصفية؛ أي حالة تانية أو مستهلك في مسير لأ"
    },
    {
      "file": "settlement-applied-label.test.cjs",
      "name": "SAL-02: شاشات المكافأة والخصم بتحكم من القيد المخزن نفسه (مش من رقم المسير بعد الحجب)"
    },
    {
      "file": "settlement-payment-ui.test.cjs",
      "name": "SPU-01: سطر الصرف المتسجل بالتاريخ والطريقة والمرجع ومين سجّل، وطرق الشاشة هي طرق الخادم بنفس أسمائها"
    },
    {
      "file": "settlement-payment-ui.test.cjs",
      "name": "SPU-02: الشاشة بتعرض القسم بعد الاعتماد ولأصحاب التصفية بس، والمسار بصلاحية «اعتماد التصفية»"
    },
    {
      "file": "skills.test.cjs",
      "name": "SKU-01: المستويات هي الأربعة القايمة في ملف الموظف، وترتيبها، وقواعد المهارة في المكتبة"
    },
    {
      "file": "skills.test.cjs",
      "name": "SKU-02: متطلبات الوظيفة والتقييم — قايمة من غير تكرار مهارة، ومستوى من المقياس، وصلاحية للشهادة بس، وتاريخ برّه المدى رسالة مش استثناء"
    },
    {
      "file": "skills.test.cjs",
      "name": "SKU-03: حكم الفجوة — مستوفاة، أقل، مش متقيّمة، وشهادة منتهية (حتى لو مستواها كفاية)"
    },
    {
      "file": "skills.test.cjs",
      "name": "SKU-04: مصدر الكود — الموديول مقفول افتراضيًا وبيعتمد على الوظائف المعتمدة؛ المكتبة لحساب بكل الفروع؛ الأقفال والنطاق؛ وأعمدة الربط برّه كيان ملف الموظف"
    },
    {
      "file": "skills.test.cjs",
      "name": "SKU-05: الواجهة — «المهارات والإحلال» للمكتبة والمتطلبات والمصفوفة، و«مهاراتي» لفجوة الموظف وفريق المدير، والتقييم من المصفوفة"
    },
    {
      "file": "skills.test.cjs",
      "name": "SKU-06: الإحلال — قواعد العلامة والترشيح، ومصدر الكود: كل المسارات بصلاحيته السرّية، والكتابة تحت قفل صف الوظيفة، والمرشح برّه النطاق من غير اسم ولا رقم، ومش في تصدير بيانات الموظف"
    },
    {
      "file": "skills.test.cjs",
      "name": "SKU-07: شبكة 9-box — شريحة الأداء بحدودها، ورقم الخانة، وتقدير الإمكانات؛ والمسارين ورا الميزة الفرعية المقفولة وصلاحية الإحلال"
    },
    {
      "file": "social-insurance.test.cjs",
      "name": "السعودي: 9.75% موظف و11.75% صاحب عمل على الأجر التأميني المسجل"
    },
    {
      "file": "social-insurance.test.cjs",
      "name": "غير السعودي في النظام السعودي: 0% موظف و2% صاحب عمل"
    },
    {
      "file": "social-insurance.test.cjs",
      "name": "المصري: 11% و18.75% لكل الجنسيات، بحدود 2700 / 16700"
    },
    {
      "file": "social-insurance.test.cjs",
      "name": "الحد الأدنى والأقصى للأجر التأميني في السعودي"
    },
    {
      "file": "social-insurance.test.cjs",
      "name": "بدون أجر تأميني مسجل: يتحسب على الأساسي"
    },
    {
      "file": "social-insurance.test.cjs",
      "name": "غير مسجل أو فرع بدون نظام = صفر"
    },
    {
      "file": "social-insurance.test.cjs",
      "name": "الفلوس بالقص لمنزلتين مش بالتقريب"
    },
    {
      "file": "social-insurance.test.cjs",
      "name": "الإعدادات: قراءة القيم والرجوع للافتراضي والتحقق"
    },
    {
      "file": "statutory-pack.test.cjs",
      "name": "SP-01: every seed row belongs to a catalog key with exactly its codes, the new keys are reference data no calculator reads, and the worked examples of the C cards hold"
    },
    {
      "file": "statutory-pack.test.cjs",
      "name": "SP-02: value and source cleaners, edits for the system administrator only under the definition row lock with an audit line, the routes and the screen"
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-01: title, kind, minimum group, questions keyed by the server, and answers of each question type only"
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-02: eNPS and the summary, groups shown without one that lets a hidden group be subtracted, and the comment threshold from its setting"
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-03: a new closed module, a one-transaction answer with no link from the response to the invitation, no audit line, the routes and the screens"
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-06: Codex P3L-B02 — per-question complementary suppression between the shown groups"
    },
    {
      "file": "suspension-paid.test.cjs",
      "name": "SPU-01: أيام الإيقاف بأجر موقوفة ومش مخصومة؛ ومن غير علامة «بأجر» الحساب زي الأول بالحرف"
    },
    {
      "file": "suspension-paid.test.cjs",
      "name": "SPU-02: «موقوف بلا أجر» في التقرير للإيقاف من غير أجر بس"
    },
    {
      "file": "suspension-paid.test.cjs",
      "name": "SPU-03: حد مدة الإيقاف بأجر من الحزمة — مصر بس، ولما الصف «اتأكد» بس، وبتاريخ بداية الإيقاف"
    },
    {
      "file": "suspension-paid.test.cjs",
      "name": "SPU-04: مصدر الكود — الإعداد مقفول مبذور، والعمود برّه الكيان، وكل قارئ إيقافات بيحط علامة «بأجر»، والحكم تحت قفل صف الموظف"
    },
    {
      "file": "swap-consents.test.cjs",
      "name": "SWU-01: قرار الطرف التاني — موافق أو لأ صريح، وملاحظة اختيارية بحدها"
    },
    {
      "file": "swap-consents.test.cjs",
      "name": "SWU-02: مصدر الكود — ميزة مقفولة بمسارها؛ صف الموافقة بيتسجّل عند كل تقديم والميزة مفتوحة بس؛ والتنفيذ بيشترط الموافقة بعد قفل الموظفين وقبل أي كتابة"
    },
    {
      "file": "swap-consents.test.cjs",
      "name": "SWU-03: الواجهة — «تبديل ورديتي»: موافق أو مش موافق للطلب المفتوح بس، والقايمة والعنوان"
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-01: مين يدير المهمة — الشخصية لصاحبها بس، و«إدارة المهام» في فرعها، واللي كلّف بيها بحقه دلوقتي"
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-02: مين يشوف المهمة — الشخصية لصاحبها ومديره المباشر بس، والعادية للمسؤول واللي بيديرها و«عرض كل المهام» في فرعها والمدير المباشر"
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-03: «تحته في الشجرة» — المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، والدواير بتقف؛ و«كل اللي تحته» بنفس حكم «تحته؟»"
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-04: حالة المهمة — قبل الترحيل القراءة فاضية من غير ما تلمس الجدول، والصف بيتعمل أول مرة المهمة تاخد قيمة غير الفاضية"
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-05: الالتزام بالميعاد — محسوب من الموعد وتاريخ الإقفال المحلي، ومسمّاه"
    },
    {
      "file": "tasks-assignment-rules.test.cjs",
      "name": "TQ-06: سجل المهمة — سطر مع كل تغيير، والتغيير اللي له مستلم معاه تعليق بإشارة؛ والقراءة بالأقدم الأول باسم اللي عمل التغيير ومن غير أرقام"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين"
    },
    {
      "file": "tasks-ui.test.cjs",
      "name": "TU-05: قواعد المالك في الشاشات — الأزرار من حكم الخادم (تمديد، رد، «مش بتاعتي»، رجوع، تقييم)، والمهمة الشخصية وعلامة التقييم في النموذج، وتقرير الالتزام وسجل المهمة"
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-01: the compensation key adds to the standing rule; every shipped role sees the same money columns before and after"
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-02: the module and the key are registered"
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-03: the service only reads, uses the standing team definition, and money leaves only with the right and inside the account scope"
    },
    {
      "file": "team-dashboard.test.cjs",
      "name": "TM-04: the sidebar item shows for a manager only, and the screen gates the salary column"
    },
    {
      "file": "time-select-ui.test.cjs",
      "name": "حقل وقت طبيعي: type=\"time\" من الشمال لليمين، ومفيش قائمة select/option خالص"
    },
    {
      "file": "time-select-ui.test.cjs",
      "name": "stepMinutes بتتحول لثواني على الـstep بتاع الحقل"
    },
    {
      "file": "time-select-ui.test.cjs",
      "name": "وقت برّه الشبكة (09:07) يتقبل ويتعرض زي ما هو من غير تقريب ولا رفض"
    },
    {
      "file": "time-select-ui.test.cjs",
      "name": "عقد القيمة 'HH:MM': المتصفح لو رجّع ثواني بنقصّها، والمسح بيرجّع نص فاضي"
    },
    {
      "file": "time-select-ui.test.cjs",
      "name": "تلميح ص/م حيّ تحت الحقل، ومفيش تلميح وهو فاضي"
    },
    {
      "file": "time-select-ui.test.cjs",
      "name": "timeLabel و normalizeTime زي ما هما (كود واختبارات تانية بتعتمد عليهم)"
    },
    {
      "file": "time-select-ui.test.cjs",
      "name": "timeOptions فاضلة مُصدّرة بنفس السلوك حتى لو الحقل مابقاش بيستخدمها"
    },
    {
      "file": "time-select-ui.test.cjs",
      "name": "مدة الإذن في الشاشة: عادية ونص الليل ووقت ناقص"
    },
    {
      "file": "time-select-ui.test.cjs",
      "name": "نموذج الطلبات: من/إلى ووقت البصمة كلهم على TimeSelect، ومفيش حقل نصي HH:MM بالإيد"
    },
    {
      "file": "timesheets.test.cjs",
      "name": "TSU-01: المشروع — عميل واسم وفرع اختياري ومهام من غير تكرار"
    },
    {
      "file": "timesheets.test.cjs",
      "name": "TSU-02: سطر الساعات والقرار وفترة التقرير وأيام الأسبوع"
    },
    {
      "file": "timesheets.test.cjs",
      "name": "TSU-03: أجر الساعة والتكلفة — إجمالي مكونات الشهر ÷ أيام الشهر ÷ ساعات اليوم، والتكلفة بالقروش، ومقسوم مش صالح = من غير تسعير"
    },
    {
      "file": "timesheets.test.cjs",
      "name": "TSU-04: سجل الموديولات — موديول timesheets مقفول افتراضيًا في الباقة الكاملة، وميزة التكلفة مقفولة"
    },
    {
      "file": "timesheets.test.cjs",
      "name": "TSU-05: مصدر الكود — كتابات ساعات الموظف تحت قفل صف ملفه ثم صف الأسبوع، قرار المدير بيتحكم بعد القفل، والتكلفة ورا ميزتها وصلاحية الرواتب ومن مصدر تسعير الإضافي"
    },
    {
      "file": "timesheets.test.cjs",
      "name": "TSU-06: الواجهة — الشاشتين بعنوانهم في القايمة، والساعات بتتبعت دقايق، والتكلفة من رد الخادم"
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-01: the RFC 6238 vectors, base32, the clock window, a code only once, and the app link"
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-02: the stored secret opens only with the server secret, and any change to it is caught"
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-03: an enrolled account is asked for the app code before the mail gate; the code is judged under the account row lock; the session gate; the application clock"
    },
    {
      "file": "totp.test.cjs",
      "name": "TT-04: the login step for the app code, the «turn it on first» screen, the security card, the roles setting and the reset action"
    },
    {
      "file": "training.test.cjs",
      "name": "TU-01: course and session values, the enrollment marks, the rating and the certificate expiry"
    },
    {
      "file": "training.test.cjs",
      "name": "TU-02: a new closed module with its permission, enrolling under the session row lock, marking under the enrollment row lock, the certificate as an employee document, and the routes"
    },
    {
      "file": "training.test.cjs",
      "name": "TU-03: the training request destination — a selectable handler owned by the module, the session staged by the server, enrollment at final approval under the session row lock, and the real screens"
    },
    {
      "file": "training.test.cjs",
      "name": "TU-04: the department budget written once per department and year under a range lock, the report within the branch scope, and mandatory training judged by scope"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FG1 — المفتاح الغايب أو الفاضي أو غير true = مقفول (قيمة مقروءة بنجاح، مش فشل قراءة)"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FG2 — فشل القراءة = UNKNOWN، مش DISABLED (الحالتان ممنوع يتلخبطوا)"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FF1 — فشل قراءة الإعداد: مسار حساب الشركة مرفوض 503 برسالة عربية بالسبب، ومفيش جلسة ولا بريد"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FF2 — ونفس الشيء لمسار البريد وكلمة المرور (نفس الدالة المشتركة)"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FF3 — حالة الأمان بتقول «مش معروف» صراحةً ومابتقولش مقفول، وبلا أي سر"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FF4 — المصدر: الرفض قبل أي إصدار جلسة، وقراءة الحالة مرة واحدة في مسار الدخول"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FA1 — 12 رمز غلط في نفس اللحظة: العدّاد بيوصل الحد بالظبط والحالة تتقفل، والرمز الصح يُرفض"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FA2 — رمزان صحيحان متوازيان: استهلاك واحد بالظبط وجلسة واحدة"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FR1 — المتتابع زي ما هو: القفل عند المحاولة الخامسة والعدّاد بيوصلها بالظبط"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FS1 — إعادة الإرسال بتُبطل الرمز القديم حتى لتحقق جارٍ، والحالة مابتُستهلكش"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FRS1 — 4 إعادات إرسال في نفس اللحظة: رسالة واحدة لكل خانة، والعدّاد بيطابق عدد الرسايل"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FRS2 — المصدر: الخانة تُحجز بتحديث مشروط قبل الإرسال، مش بتعيين محسوب في JS بعده"
    },
    {
      "file": "two-factor-hardening.test.cjs",
      "name": "2FS2 — المصدر: الاستهلاك مشروط بالـhash اللي قورن، والمقارنة حرفية في JS كمان"
    },
    {
      "file": "typeorm-output-precision-guard.test.cjs",
      "name": "OP-G1: كل ملف بيعمل اتصال TypeORM (new DataSource أو TypeOrmModule.forRoot) محمّل تصليح دقة الأعمدة العشرية"
    },
    {
      "file": "typeorm-output-precision-guard.test.cjs",
      "name": "OP-G2: السكربتات بتحمّل التصليح فعلًا — اتصال الاستيراد والترحيل والمزامنة بيعرّف جدول الإخراج بدقة العمود"
    },
    {
      "file": "ui-session-calendar.test.cjs",
      "name": "week has seven local calendar dates across year and leap-month boundaries"
    },
    {
      "file": "ui-session-calendar.test.cjs",
      "name": "monthly ghost cells do not widen its export/statistics range and clipping is inclusive"
    },
    {
      "file": "ui-session-calendar.test.cjs",
      "name": "employee drafts retain entered text, qualifications and uploaded references only for their user"
    },
    {
      "file": "ui-session-calendar.test.cjs",
      "name": "logout removes every employee draft version while leaving unrelated storage alone; corrupt schema fails visibly"
    },
    {
      "file": "upcoming-birthdays.test.cjs",
      "name": "birthday window includes today and its final date, handles year rollover and excludes dates beyond it"
    },
    {
      "file": "upcoming-birthdays.test.cjs",
      "name": "February 29 stays in leap years and is explicitly observed on February 28 otherwise, including century rules"
    },
    {
      "file": "upcoming-birthdays.test.cjs",
      "name": "only current active/probation employees from the supplied authorized list produce events, without birth year or age"
    },
    {
      "file": "upcoming-birthdays.test.cjs",
      "name": "missing, malformed, impossible and future birth dates are ignored instead of rolling into another day"
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-01: a readable device name from the User-Agent header, and the limits"
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-02: the session number is random and rides in the token; the guard checks it before CSRF; ending is a conditional write by the row's owner"
    },
    {
      "file": "user-sessions.test.cjs",
      "name": "UT-03: the security screen — my sessions, ending one, and its link and title"
    },
    {
      "file": "work-schedule-exceptions.test.cjs",
      "name": "WSE-01: last Saturday of the payroll month (cycle 23) is the last Saturday on or before the 22nd"
    },
    {
      "file": "work-schedule-exceptions.test.cjs",
      "name": "WSE-02: calendar-month basis keeps the old meaning (26 September is the last Saturday of September)"
    },
    {
      "file": "work-schedule-exceptions.test.cjs",
      "name": "WSE-03: nth occurrences count from the start of the payroll month"
    },
    {
      "file": "work-schedule-exceptions.test.cjs",
      "name": "WSE-04: the calendar evaluation applies schedule exceptions after company/branch rules; a public holiday still wins"
    },
    {
      "file": "work-schedule-exceptions.test.cjs",
      "name": "WSE-05: input normalization pins the company cycle start and rejects meaningless or duplicate exceptions"
    },
    {
      "file": "work-schedule-exceptions.test.cjs",
      "name": "WSE-06: stored values are parsed strictly — a corrupt value is never read as \"no exceptions\""
    },
    {
      "file": "work-schedule-exceptions.test.cjs",
      "name": "EMP-01: the service window ends at the last working day from offboarding, else the archive date"
    },
    {
      "file": "work-schedule-exceptions.test.cjs",
      "name": "EMP-02: an ended employee with no documented last day is outside service for assignment only"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 primary protocol checksum examples and MakeKey vectors"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 Comm Key accepts 0..999999 only and never exposes invalid input"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 TCP authentication succeeds with fragmented frames; existing node-zklib decoder reads local device times"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 terminal that answers UNAUTH with Comm Key 0 connects by authenticating with key 0 (like pyzk)"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 unprotected terminal remains compatible and never receives CMD_AUTH"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 bulk transfer validates coalesced PREPARE/DATA/ACK frames and multiple 65472-byte chunks"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 missing key stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 wrong key stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 explicit device rejection stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 corrupt connect checksum stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 corrupt auth checksum stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 wrong negotiated session stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 wrong auth reply id stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 wrong connect reply id stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 authentication timeout stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 connect response timeout stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 connection closed during auth stops before reading any data and closes the socket"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 truncated record rejects the whole pull instead of reporting partial success"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 corrupt attendance checksum rejects the whole pull instead of reporting partial success"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 corrupt chunk checksum rejects the whole pull instead of reporting partial success"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 missing final chunk ACK rejects the whole pull instead of reporting partial success"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 read connection lost rejects the whole pull instead of reporting partial success"
    },
    {
      "file": "zk-tcp-auth.test.cjs",
      "name": "ATT24 missing disconnect acknowledgement is bounded and closes the socket"
    }
  ]
}