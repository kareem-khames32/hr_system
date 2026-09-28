module.exports = {
  "selected": [
    "national-id-or-passport",
    "overtime-auto-approve-period",
    "employee-bulk-update",
    "employee-suspension",
    "user-branch-scopes"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 44,
      "failed": 0,
      "passed": 44,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 44,
      "suites": 0
    },
    "duration_ms": 91905.2276
  },
  "results": [
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-01: الإنشاء بالجواز لوحده، أو بهوية بأي صيغة لوحدها (حروف وشرطة وطول أجنبي) — والمحفوظ مطبّع",
      "ms": 8725.3101,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-02: الاتنين فاضيين = 400 برسالة واحدة، والشكل الغلط 400 برسالته",
      "ms": 41.3191,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-03: التكرار على القيمة المطبّعة — «a 123» و«A123» نفس الجواز (409)، والمحفوظ القديم بمسافات وأرقام عربية بيتطابق",
      "ms": 532.7934,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-04: التعديل — مسح واحد والتاني موجود مسموح، مسح الاتنين 400، ونفس الرقم بشكل تاني مش تغيير",
      "ms": 353.1186,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-05: ملف قديم من غير هوية ولا جواز يفتح ويحفظ باقي حقوله، وقيمة مكررة من قبل القرار مابتمنعش الحفظ",
      "ms": 246.6731,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-06: التحديث الجماعي من ملف — الجواز عمود جديد، الهوية بأي صيغة، واحد منهم لكل صف، والتكرار (موظف تاني وجوه الملف)",
      "ms": 346.3145,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-07: إخفاء اسم صاحب الرقم المكرر لحساب فرع تاني زي ما هو — في الإضافة والتعديل والملف",
      "ms": 91.6307,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-08: التصدير لموظف بالجواز بس — عمود الهوية فاضي وعمود الجواز بقيمته",
      "ms": 231.9493,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 9950.7233,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 904.6058,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 2235.381,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 1215.0505,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 1084.2973,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 2102.8176,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 864.356,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 726.4973,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 940.9491,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 536.0682,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.7152,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 2.2784,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1661.6562,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 5420.9286,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "القالب: CSV بعناوين الحقول المختارة ومملي بموظفين النطاق بس، وأعمدة الراتب محتاجة اعتماد المسير",
      "ms": 7643.8722,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "المعاينة مابتحفظش: التغيير القديم ← الجديد والأخطاء، وقاعدة البيانات زي ما هي",
      "ms": 67.4991,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "تغيير الراتب من الملف: مراجعة جديدة في سجل الأجر المؤرخ + سجل تغييرات، والسبب والمرجع إجباريين",
      "ms": 235.9604,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "رقم بصمة مكرر مرفوض (مع موظف تاني أو صفين في الملف)، والصفوف السليمة بتتحفظ",
      "ms": 156.5299,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "عزل الفرع: موظف فرع تاني صف خطأ، والنقل لفرع تاني مرفوض لحساب الفرع",
      "ms": 63.4082,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "نقل الفرع من الملف: بتاريخ سريان وسبب، يتسجل في سجل فرع الموظف وسجل التغييرات",
      "ms": 195.4771,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-bulk-update.integration.cjs",
      "name": "Excel: القالب المملي يتنزل ويتعدل ويترفع، والتطبيق على دفعات بأرقام الصفوف",
      "ms": 330.6101,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية أو الجواز بأي صيغة وفريدة، ورقم البصمة فريد",
      "ms": 10370.3886,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو «موقوف» بلا تواريخ مرفوض، وتغيير الجنسية مابيعيدش فحص الهوية",
      "ms": 176.5715,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 430.9131,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 559.5766,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 1229.0889,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
      "ms": 13036.9235,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
      "ms": 399.9142,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
      "ms": 357.1672,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
      "ms": 524.9929,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
      "ms": 644.3605,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
      "ms": 502.6269,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
      "ms": 364.0355,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
      "ms": 280.8167,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
      "ms": 162.7747,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
      "ms": 233.7614,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_identity_test_0351bb15ef12ef6f is absent from sys.databases.",
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "Cleanup verified: hr_ot_auto_approve_test_2147ca540a40b668 is absent from sys.databases.",
    "Cleanup verified: hr_bulk_update_test_2ffb0d847c26a15c is absent from sys.databases.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_bb53af1422a95bac is absent from sys.databases.",
    "Cleanup verified: hr_user_branch_scopes_test_257df64ac1731c68 removed.",
    "tests 44",
    "suites 0",
    "pass 44",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 91905.2276"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_identity_test_0351bb15ef12ef6f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_identity_test_0351bb15ef12ef6f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_2147ca540a40b668\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_2147ca540a40b668\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_bulk_update_test_2ffb0d847c26a15c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_bulk_update_test_2ffb0d847c26a15c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_suspension_test_bb53af1422a95bac\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_suspension_test_bb53af1422a95bac\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_branch_scopes_test_257df64ac1731c68\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_branch_scopes_test_257df64ac1731c68\"}\n"
  ]
}
