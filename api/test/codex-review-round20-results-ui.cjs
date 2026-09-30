module.exports = {
  "selected": [
    "codex-review-round20-currency-follows-branch-ui",
    "codex-review-round20-hiring-documents-ui",
    "codex-review-round20-loan-single-deduction-ui",
    "codex-review-round20-profile-self-service-ui",
    "codex-review-round20-mobile-shell-ui",
    "codex-review-round20-administration-level-ui"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 38,
      "failed": 0,
      "passed": 38,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 38,
      "suites": 0
    },
    "duration_ms": 15454.9506
  },
  "results": [
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "currency.ts: مفيش بوابة settings.manage ولا قراءة إعدادات ولا «ر.س» افتراضي — السياق من /settings/currency-context",
      "ms": 1.0259,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "القاعدة المشتركة مع الخادم: مصر جنيه، السعودية ريال، ومن غير دولة (أو رمز قديم) عملة النظام",
      "ms": 0.7932,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "عملة الشاشة: الفرع المحدد بعملته؛ من غير فرع — الموظف بعملة فرعه، والإداري بفرعه الوحيد أو العملة المشتركة وإلا عملة النظام",
      "ms": 0.2141,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "السياق بيتقري لموظف من غير أي صلاحية، ويتخزن للجلسة بحسابه، ويتمسح بـ invalidateCurrency",
      "ms": 0.6206,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "نموذج الموظف: من غير اختيار عملة — سطر قراءة «العملة: … (حسب الفرع)» والعملة مابتتبعتش في الإضافة",
      "ms": 1.4699,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "معادلات الرواتب: من غير اختيار عملة — الخادم بيحطها عند الحفظ",
      "ms": 79.0759,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "شاشة الفروع: «دولة الفرع» مصر/السعودية بعملتها، وتأمينات دولتها بس، وتنبيه للفرع المختلف، ومسح كاش العملة بعد الحفظ",
      "ms": 1.3364,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch-ui.test.cjs",
      "name": "الشاشات الخاصة بموظف بتاخد عملة فرعه (مش العمود المحفوظ في ملفه)",
      "ms": 4.1303,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents-ui.test.cjs",
      "name": "HD-UI-01: «نواقص مسوغات التعيين» في القائمة بعد «مستندات الموظفين» بصلاحيتها، وعنوانها في الهيدر، وحارس المسار",
      "ms": 2.5608,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents-ui.test.cjs",
      "name": "HD-UI-02: النداءات في hiring-documents-api.ts (مش api.ts)، ونصوص الشاشات، ورابط «ارفع الناقص» ذهابًا وإيابًا",
      "ms": 2.4638,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents-ui.test.cjs",
      "name": "HD-UI-03: الشاشات متوصلة — أنواع المستندات، ونواقص مسوغات التعيين، وتهيئة الموظفين الجدد، ومستنداتي",
      "ms": 3.1738,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "loan kind labels: «سلفة استثنائية — N قسط», «سلفة (مرة واحدة)», and an old regular loan keeps its installment count",
      "ms": 0.5423,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "resubmitting a returned loan: the server default month is dropped (re-stamped), a month an authorized user chose or an exceptional month is kept, and a month in the patch drops the old chooser",
      "ms": 0.4839,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "«سلفي»: no months input, the request is one month, the note is shown, and the list works at phone width (cards under md, the table from md)",
      "ms": 0.9368,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "«السلف والقروض»: the new-loan form has no months and sends one month; «سلفة استثنائية» is behind loans.exceptional, opens its modal and refreshes the list",
      "ms": 1.1963,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "the exceptional loan modal: the shared employee picker (not a select), no self-loan, and a payload the server accepts",
      "ms": 1.011,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "«طلباتي»: the regular loan form hides the months field, shows the note and always sends one month; a returned exceptional loan keeps its months",
      "ms": 2.3634,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "approvals and request details show the loan kind; the caps panel no longer asks for the max installment months but keeps the saved value",
      "ms": 1.2176,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "work-days warning: an «إجازة/راحة» rule on a day that is already a rest day, and the mirror «دوام» on a working day; unknown weekend = no warning",
      "ms": 0.2227,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction-ui.test.cjs",
      "name": "work-days wiring: the schedule exceptions list warns against the weekend on screen, and the rule modal against the branch or global weekend — warning only, saving stays enabled",
      "ms": 1.1324,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service-ui.test.cjs",
      "name": "the camera button is wired: it opens an image picker, uploads an employee photo and saves it through the self endpoint",
      "ms": 4.1389,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service-ui.test.cjs",
      "name": "«تعديل الملف» is wired: it opens the edit dialog prefilled with my data and submits only the changed fields as «تحديث بيانات شخصية»",
      "ms": 1.8191,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service-ui.test.cjs",
      "name": "request details and approvals show every personal field with an Arabic label and readable values",
      "ms": 1.859,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service-ui.test.cjs",
      "name": "phone layout: the header wraps, the tabs scroll inside their own strip and the grids stack at ~390px",
      "ms": 0.2462,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-01: زرار القائمة في الهيدر (أقل من lg بس) بـaria-label وaria-expanded وبيتحكم في القائمة، والعنوان سطر واحد على الموبايل",
      "ms": 5.0805,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-02: القائمة الجانبية درج تحت lg — مقفول برّه الشاشة ومخفي، مفتوح ظاهر، وكل كلاس جديد max-lg: بس",
      "ms": 2.7279,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-03: AppShell — المحتوى lg:mr-72 وp-4 lg:p-8، خلفية معتمة بتقفل، Esc والانتقال بيقفلوا، وقفل تمرير الصفحة",
      "ms": 0.6941,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-04: CSS المشروع — كل max-lg: جوّه (أقل من 1024px) بس، وlg:mr-72 من 1024 وفوق، وclip للهيدر الثابت على الموبايل بس",
      "ms": 258.4057,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-05: الـviewport: Next بيطلع width=device-width, initial-scale=1 افتراضيًا ومحدش بيغيّره",
      "ms": 50.1224,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-06: شاشات البوابة — مفيش mr-72 ثابت، ولا grid-cols-3+ من غير بديل للشاشة الصغيرة، ولا col-span بيعمل عمود ضمني",
      "ms": 23.7464,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-07: الجداول جوّه overflow-x-auto، والنوافذ جوّه الشاشة بهامش وmax-h وتمرير داخلي",
      "ms": 16.0045,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-08: لوحة الإشعارات جوّه الشاشة على الموبايل، ومنتقي الموظف قايمته مقصوصة على عرض الشاشة",
      "ms": 0.9899,
      "pass": true,
      "skip": false
    },
    {
      "file": "mobile-shell-ui.test.cjs",
      "name": "MOB-UI-09: الطباعة — زرار القائمة مابيتطبعش، وطباعة الهيكل التنظيمي بتلغي هامش القائمة الجديد (lg:mr-72)",
      "ms": 21.0274,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-01: «مدير الإدارة» في محرر السلاسل بعد «مدير القسم» بوصفه، ومش جهة تصعيد، وبتسميته في الصناديق التلاتة",
      "ms": 3.377,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-02: اختيارات الأب بقواعد الخادم، وتغيير النوع أو الفرع بيشيل الأب اللي مابقاش يصلح",
      "ms": 0.765,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-03: «الإدارة ← القسم» واختيارات القسم المجمّعة بالإدارة، وفلتر الإدارة بأقسامها جوه فرعها",
      "ms": 1.227,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-04: الهيكل التنظيمي بشارة «إدارة» من نوع الوحدة (والقديم زي الأول)، وبطاقة صاحب الطلب بـ«الإدارة» ومحجوبة مع orgHidden",
      "ms": 6.0686,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-05: الشاشات متوصلة — «الإدارات والأقسام» والنوع والأب والشجرة، ونموذج الموظف وقايمته وملفه وملفي",
      "ms": 5.8734,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 38",
    "suites 0",
    "pass 38",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15454.9506"
  ],
  "stdout": []
}
