module.exports = {
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
}
