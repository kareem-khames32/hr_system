module.exports = {
  "selected": [
    "codex-review-round21-org-filter-ui",
    "codex-review-round21-org-filter-wiring-ui",
    "codex-review-round21-financial-report-ui",
    "codex-review-round21-payroll-roster-ui",
    "codex-review-round21-currency-follows-branch-ui",
    "codex-review-round21-hiring-documents-ui",
    "codex-review-round21-org-target-picker-ui",
    "codex-review-round21-inline-row-actions-ui",
    "codex-review-round21-payroll-allowances-ui",
    "codex-review-round21-payroll-approval-chain-disbursement-ui",
    "codex-review-round21-report-day-range-ui"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 73,
      "failed": 0,
      "passed": 73,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 73,
      "suites": 0
    },
    "duration_ms": 26956.6514
  },
  "results": [
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-01: الإدارة والقسم بأقسامهم الفرعية جوه فرعهم بس، والفريق بالظبط، والمش معروف مش مطابق",
      "ms": 1.3694,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-02: الاختيارات مترابطة، واختيار مستوى أعلى بيشيل اللي تحته اللي مابقاش يصلح",
      "ms": 1.466,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-03: شريط الفلتر — أربع قوائم بـ«الكل»، والفرع المقفول، و«مسح الفلتر» لما يشتغل، وبيلف على الموبايل",
      "ms": 3.6087,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-04: الشجرة مرة للجلسة — طلب واحد مشترك، والنسخة الجديدة من غير طلب، والتحديث بالطلب",
      "ms": 0.4756,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-05: الخادم — قراءة المعاملات والشروط بمعاملات، وفلاتر المسير والصرف بأقسام الإدارة/القسم",
      "ms": 1.1531,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-06: الإجماليات بعد الفلتر بنفس حساب الخادم — كشف البنوك والبدلات وإقفال السنة والتأمينات",
      "ms": 0.5629,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-wiring-ui.test.cjs",
      "name": "OFW-01: كل شاشة فيها موظفين متوصل فيها الفلتر الموحد، والقوائم القديمة للفرع/القسم/الفريق اتشالت",
      "ms": 20.3071,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-wiring-ui.test.cjs",
      "name": "OFW-02: الشريط نفسه — أربع قوائم مترابطة بـ«الكل»، والفرع المقفول، و«مسح الفلتر»، وبيلف على الموبايل، والتحميل مرة للجلسة",
      "ms": 0.3807,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-wiring-ui.test.cjs",
      "name": "OFW-03: الخادم — النداء بصلاحيات الشاشات، والمعاملات في اللي بيترقّم أو بيتجمّع هناك، والنداءات الجديدة في ملفات مستقلة",
      "ms": 8.3121,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report-ui.test.cjs",
      "name": "every financial report has its own screen with the shared filters, Excel export and print, titled like its link",
      "ms": 4.313,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report-ui.test.cjs",
      "name": "the reports hub and the payroll reports page link all financial reports, and the cost-center report stays linked",
      "ms": 1.3687,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "بناء الاستعلام: الفلاتر الفاضية ما بتتبعتش، والمملوءة بتروح للخادم بأسمائها",
      "ms": 0.9461,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "نداءات الفلاتر والجدول الموحد ووجهات النقل — كلها apiFetch بمسارات الخادم",
      "ms": 1.1219,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "شريط الفلاتر: بحث وفرع وقسم وفريق ومسمى وحالة ومدى تعيين، وعدّاد الفلاتر و«مسح الفلاتر» وعدد الصفوف",
      "ms": 0.9246,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "التبويبات: الفلترة في الخادم لكل التبويبات الثلاثة، والشهر المختار محفوظ، والعدد بيعكس الفلتر",
      "ms": 0.6746,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "الجدول الموحد: منظور «الكل / المدرجين في مسير / بلا مسير»، عمود «المسير»، واختيار الكل وعدد المختار",
      "ms": 1.2657,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "نافذة النقل الواحدة: قائمة مسيرات بالبحث بفترتها ومعادلتها، شهر البداية، السبب، ونتيجة لكل موظف",
      "ms": 0.7902,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-roster-ui.test.cjs",
      "name": "نقل موظف واحد من صف المسير ومن ملفه بنفس النافذة",
      "ms": 1.1098,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "currency.ts: مفيش بوابة settings.manage ولا قراءة إعدادات ولا «ر.س» افتراضي — السياق من /settings/currency-context",
      "ms": 1.7941,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "القاعدة المشتركة مع الخادم: مصر جنيه، السعودية ريال، ومن غير دولة (أو رمز قديم) عملة النظام",
      "ms": 1.1866,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "عملة الشاشة: الفرع المحدد بعملته؛ من غير فرع — الموظف بعملة فرعه، والإداري بفرعه الوحيد أو العملة المشتركة وإلا عملة النظام",
      "ms": 0.3024,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "السياق بيتقري لموظف من غير أي صلاحية، ويتخزن للجلسة بحسابه، ويتمسح بـ invalidateCurrency",
      "ms": 0.8026,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "نموذج الموظف: من غير اختيار عملة — سطر قراءة «العملة: … (حسب الفرع)» والعملة مابتتبعتش في الإضافة",
      "ms": 2.0065,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "معادلات الرواتب: من غير اختيار عملة — الخادم بيحطها عند الحفظ",
      "ms": 107.2713,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "شاشة الفروع: «دولة الفرع» مصر/السعودية بعملتها، وتأمينات دولتها بس، وتنبيه للفرع المختلف، ومسح كاش العملة بعد الحفظ",
      "ms": 1.2439,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "الشاشات الخاصة بموظف بتاخد عملة فرعه (مش العمود المحفوظ في ملفه)",
      "ms": 5.5937,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents-ui.test.cjs",
      "name": "HD-UI-01: «نواقص مسوغات التعيين» في القائمة بعد «مستندات الموظفين» بصلاحيتها، وعنوانها في الهيدر، وحارس المسار",
      "ms": 2.2791,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents-ui.test.cjs",
      "name": "HD-UI-02: النداءات في hiring-documents-api.ts (مش api.ts)، ونصوص الشاشات، ورابط «ارفع الناقص» ذهابًا وإيابًا",
      "ms": 2.6199,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents-ui.test.cjs",
      "name": "HD-UI-03: الشاشات متوصلة — أنواع المستندات، ونواقص مسوغات التعيين، وتهيئة الموظفين الجدد، ومستنداتي",
      "ms": 2.5227,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "الاستهداف بالترتيب: الشركة ← الفرع ← أقسامه ← موظفينه، ومن ساب الشغل مايتستهدفش",
      "ms": 0.9984,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "قيمة البداية والوصف: مستخدم الفرع يبدأ من فرعه، والوصف بالعربي",
      "ms": 0.204,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "المكوّن: اختيار الفرع يعرض أقسامه وموظفينه بس، والمستويات والقفل على الفرع شغالين",
      "ms": 5.4223,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "المكوّن بالفرق: فرق الفرع بس، متفلترة بالأقسام المختارة، وفلتر الفريق في الموظفين",
      "ms": 2.1379,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "الشاشات: الجدول الأسبوعي بيعيّن لمدة بالمنتقي، وفترات الإضافي في شاشة الإضافي، وأيام العمل فيها رابط بس",
      "ms": 4.9561,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "المقفول بيقول سبب القفل: خلية الوردية في وضع «عرض»، و«نشط» في الجدول الافتراضي",
      "ms": 1.6049,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-target-picker-ui.test.cjs",
      "name": "أيام العمل: إسناد الجدول بالمنتقي الموحد (فرع ← قسم ← فريق ← موظفين)، والجدول الخاص بفرع مقفول على فرعه",
      "ms": 0.9787,
      "pass": true,
      "skip": false
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "طلب الخطاب يُرسل من ملف الموظف نفسه: لا كارت يوجّه إلى «طلباتي»",
      "ms": 1.7968,
      "pass": true,
      "skip": false
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "الخطاب يمر بنفس نقطة الإنشاء وبوابة النيابة اللي في شاشة «طلباتي»",
      "ms": 1.5069,
      "pass": true,
      "skip": false
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "«بصم رغم الإجازة» بتفتح سجل الإجازات على الموظف ويومه، مش على قائمة كل الإجازات",
      "ms": 0.8242,
      "pass": true,
      "skip": false
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "سجل الإجازات بيقرأ employee/date ويحطهم في فلاتره القائمة (بحث + مدى التاريخ) بلا فلتر جديد",
      "ms": 0.6692,
      "pass": true,
      "skip": false
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "القرار على الإذن من صفّه: اعتماد ورفض بسبب بنفس actOnRequest وقاعدة صندوق الموافقات",
      "ms": 1.03,
      "pass": true,
      "skip": false
    },
    {
      "file": "inline-row-actions-ui.test.cjs",
      "name": "نافذة قرار الإذن بنفس مكونات «رفض بسبب» في شاشة الإضافي",
      "ms": 1.2002,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances-ui.test.cjs",
      "name": "تابة «البدلات» آخر تابة في شاشة المسير وبتفتح المسير من الجدول",
      "ms": 1.7481,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances-ui.test.cjs",
      "name": "التابة: الشهر والبحث، والمنتقي الموحد، والإجماليات، والإلغاء",
      "ms": 0.9795,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances-ui.test.cjs",
      "name": "القسيمة: البدل سطر باسمه والباقي «إضافات أخرى»، والمجموع هو عمود الإضافات",
      "ms": 0.8848,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-01: الشريط يقول مين اعتمد ومين عليه الدور، ومسير بلا سلسلة مايعرضش حاجة",
      "ms": 5.9407,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-02: صاحب الخطوة يشوف «اعتمد خطوتي» و«ارفض بسبب»؛ الممنوع بفصل المهام يشوف السبب والأزرار مقفولة",
      "ms": 3.2039,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-03: سبب الرفض ظاهر لمسؤول الرواتب، وبعد إعادة الحساب يفضل آخر رفض ظاهر كتاريخ",
      "ms": 1.1883,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-04: محرر السلسلة — الخطوات بالترتيب باسم الشخص، بحث بالاسم أو الكود، ودور كبديل؛ والحفظ بيبعت الشخص أو الدور فقط",
      "ms": 2.5619,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-05: شاشة المسير — الشريط محمّل مع المسير، وزرار الاعتماد بخطوة واحدة مابيظهرش لمسير تحكمه سلسلة، وباقي الشاشة كما هي",
      "ms": 5.606,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "DISB-UI-01: «صرف الرواتب» — الفلاتر والعلامة والتعليم الجماعي والإجماليات من الخادم، والتصدير بنفس الصفوف، وبلا حساب فلوس في المتصفح",
      "ms": 2.9122,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "DISB-UI-02: جدول الصرف بالبيانات — خانة «تم الصرف» للصف القابل للتعليم لحامل payroll.disburse فقط، وصف التصفية والمقفول شارة بلا خانة، والإجماليات كما جت من الخادم",
      "ms": 3.3363,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "CHAIN-UI-06: مراجعة المعتمد — إجماليات المسير وموظفوه ببنودهم، والصافي السالب ظاهر قبل الاعتماد النهائي",
      "ms": 0.8203,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement-ui.test.cjs",
      "name": "NAV-01: الشاشات التلاتة ليها اسم واحد في القائمة والهيدر والجسم، ومفتوحة لأصحابها حتى بلا payroll.view",
      "ms": 1.6074,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "payroll month: cycle 23 → «راتب سبتمبر» = 23 أغسطس → 22 سبتمبر، ويوم 23 يبدأ شهر أكتوبر",
      "ms": 1.2106,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "the web payroll-month math matches the payroll engine for every cycle day and month (2024–2027)",
      "ms": 4.095,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "day range editing, validation, overlap and labels",
      "ms": 1.3707,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "month quick-pick helpers: options around the current payroll month, labels, optional max length",
      "ms": 1.3139,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "DayRangeFilter renders the month quick-pick + «من تاريخ / إلى تاريخ» and the payroll-month navigation",
      "ms": 14.9304,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "DayRangeFilter keeps a partially typed date (year typed digit by digit) instead of resetting the input",
      "ms": 1.0003,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "PayrollPeriodSelect: a payroll run stays chosen by period but shows its exact days",
      "ms": 4.1865,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API range helper: from/to wins, month stays backward compatible, bad ranges are 400",
      "ms": 0.842,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API «تاريخ الطلب» filter: local days → UTC bounds [start, end) for a SYSUTCDATETIME column, both-or-none",
      "ms": 0.5752,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API: deductions and bonuses lists filter «من تاريخ / إلى تاريخ» on the server inside every page (before the 500 cap)",
      "ms": 2.7569,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "API: /attendance/payroll-month, and the attendance reports/sheet/overtime/punches accept from/to (parameterised, month still works)",
      "ms": 2.0334,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "attendance screens open on the payroll month with «من تاريخ / إلى تاريخ» (no month picker left)",
      "ms": 6.0289,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "payroll screens: day range on deductions/bonuses/runs report; run period stays a month but shows its exact dates",
      "ms": 4.1364,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "loans screen: filter by request date or by instalment month, with the month quick-pick and exact days",
      "ms": 0.8723,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "reports dashboard: attendance and overtime summaries follow the range filter, not the calendar month",
      "ms": 1.2943,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "attendance fixes: permissions has no unused Calendar import, exemption counters follow the chosen range",
      "ms": 1.0253,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "payroll-period pickers (GOSI, cost centers, financial reports, leave settlement) open on the payroll month and show its days",
      "ms": 3.4539,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "no month-only date filter is left in src/: every remaining month input is a form field or a payroll-run period that shows its days",
      "ms": 180.9275,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-day-range-ui.test.cjs",
      "name": "employee-code search, a readable payroll-month placeholder, and every closable leave year",
      "ms": 7.855,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 73",
    "suites 0",
    "pass 73",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 26956.6514"
  ],
  "stdout": []
}
