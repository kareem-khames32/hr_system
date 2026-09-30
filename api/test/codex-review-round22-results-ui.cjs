module.exports = {
  "selected": [
    "codex-review-round22-ui"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 28,
      "failed": 0,
      "passed": 28,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 28,
      "suites": 0
    },
    "duration_ms": 6228.8996
  },
  "results": [
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-01: الإدارة والقسم بأقسامهم الفرعية جوه فرعهم بس، والفريق بالظبط، والمش معروف مش مطابق",
      "ms": 2.796,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-02: الاختيارات مترابطة، واختيار مستوى أعلى بيشيل اللي تحته اللي مابقاش يصلح",
      "ms": 1.9791,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-03: شريط الفلتر — أربع قوائم بـ«الكل»، والفرع المقفول، و«مسح الفلتر» لما يشتغل، وبيلف على الموبايل",
      "ms": 6.3026,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-04: الشجرة مرة للجلسة — طلب واحد مشترك، والنسخة الجديدة من غير طلب، والتحديث بالطلب",
      "ms": 0.6409,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-05: الخادم — قراءة المعاملات والشروط بمعاملات، وفلاتر المسير والصرف بأقسام الإدارة/القسم",
      "ms": 3.5912,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-07: كشف البنوك — الفلتر في الخادم بمكان لقطة المسير، والإجماليات من الصفوف المفلترة",
      "ms": 2.2539,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-ui.test.cjs",
      "name": "OF-06: الإجماليات بعد الفلتر بنفس حساب الخادم — البدلات وإقفال السنة والتأمينات",
      "ms": 1.2257,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-wiring-ui.test.cjs",
      "name": "OFW-01: كل شاشة فيها موظفين متوصل فيها الفلتر الموحد، والقوائم القديمة للفرع/القسم/الفريق اتشالت",
      "ms": 36.8938,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-wiring-ui.test.cjs",
      "name": "OFW-02: الشريط نفسه — أربع قوائم مترابطة بـ«الكل»، والفرع المقفول، و«مسح الفلتر»، وبيلف على الموبايل، والتحميل مرة للجلسة",
      "ms": 1.3779,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-filter-wiring-ui.test.cjs",
      "name": "OFW-03: الخادم — النداء بصلاحيات الشاشات، والمعاملات في اللي بيترقّم أو بيتجمّع هناك، والنداءات الجديدة في ملفات مستقلة",
      "ms": 13.0687,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "تنبيه الصف: طريقة مجهولة، «نقدي + بنك» بلا مبلغ، بنك أو آيبان ناقص، وآيبان مش بالشكل الصحيح",
      "ms": 0.4765,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "كشف البنوك: التنبيهات مجمَّعة بمبلغها، والصف يفضل في الكشف بمبلغه، والتصفية برّه التنبيهات",
      "ms": 0.5079,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "مصادر الكشف: الهوية من لقطة العضوية، وبيانات الصرف من ملف الموظف الحالي، وفلترة الفرع، والتصفية",
      "ms": 0.3605,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "ملخص طرق الصرف = نفس صفوف كشف البنوك: بنك + نقدي لكل طريقة، ومجموعهما = الصافي المستحق",
      "ms": 0.4951,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "الصافي السالب: الصافي زي ما هو في التقرير (يطابق إجمالي المسير) والمصروف صفر — الحالة الوحيدة اللي التسوية فيها بتختلف",
      "ms": 0.1684,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "القاعدة بالقرش لكل حالة: بنك = أقل من (مبلغ البنك، الصافي) ونقدي = الباقي، بلا تقريب لأعلى",
      "ms": 0.2661,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-cash-split.test.cjs",
      "name": "الربط: تقرير طرق الصرف من نفس مصدر الكشف، والشاشة بتعرض التنبيه والتصفية والقالب بيصدّرهم",
      "ms": 4.9421,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-01: قاعدة الصرف المسجل — علامة «تم الصرف» ثم «لم يتم» ثم مسير مصروف بلا علامات ثم مسير لسه ما اتصرفش",
      "ms": 0.2761,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-02: كشف البنوك بعد تغيير طريقة الصرف — البند المصروف نقدي يفضل نقدي، واللي بلا علامة يتبع ملف الموظف",
      "ms": 0.7103,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-03: التلات شاشات بنفس الرقم — شاشة الصرف وكشف البنوك والتقرير المالي، والتسوية بنك + نقدي + تصفية = الصافي",
      "ms": 1.827,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-04: استعلام التقرير المالي بيقرأ علامة الصرف نفسها (مصدر واحد للتلات شاشات)",
      "ms": 5.1428,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-07: القسيمة على نفس القاعدة (قرار المالك 24 سبتمبر) — بلا لقطة هوية جديدة وبلا تقسيم تاني",
      "ms": 1.7081,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-05: تقرير الحضور الشهري بلا كاشف وجود — الموظف الموجود خارج النطاق وغير الموجود نفس الرد",
      "ms": 1.1171,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-06: أيام عمل الموظف ومعاينة الإضافي — نفس الرد للموظف خارج النطاق وغير الموجود",
      "ms": 0.8419,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-08: المثبت وقت الصرف يغلب لقطة الحساب، والعلامة تغلبه، والبند القديم بلا تثبيت يفضل على سلوكه",
      "ms": 1.0816,
      "pass": true,
      "skip": false
    },
    {
      "file": "disbursed-recorded-split.test.cjs",
      "name": "REC-09: الصرف بيثبّت التقسيم على البند قبل ما المسير يبقى PAID، وإقفال موظف بموظف مايثبّتش اللي ما اتصرفلوش",
      "ms": 2.608,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report-ui.test.cjs",
      "name": "every financial report has its own screen with the shared filters, Excel export and print, titled like its link",
      "ms": 4.3563,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report-ui.test.cjs",
      "name": "the reports hub and the payroll reports page link all financial reports, and the cost-center report stays linked",
      "ms": 1.5756,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 28",
    "suites 0",
    "pass 28",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6228.8996"
  ],
  "stdout": []
}
