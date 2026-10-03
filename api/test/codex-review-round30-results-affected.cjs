module.exports = {
  "selected": [
    "payroll-allowances",
    "payroll-overview-filters",
    "holiday-work",
    "payroll-bonuses",
    "loan-completion",
    "loan-installment-deferral",
    "loan-single-deduction"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 58,
      "failed": 0,
      "passed": 58,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 58,
      "suites": 0
    },
    "duration_ms": 94510.0502
  },
  "results": [
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز",
      "ms": 6765.7339,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع",
      "ms": 3062.4872,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز",
      "ms": 1533.2267,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "بدل على الشركة كلها: حساب الفرع يشوف عدد سطور فرعه بس (مش عدد الشركة)، ومفيش «اتلغى منه» من سطور فروع تانية",
      "ms": 241.8164,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
      "ms": 7143.2651,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
      "ms": 1663.4524,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
      "ms": 916.3667,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
      "ms": 386.5976,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(هـ) فصل الفروع في شاشات الشهر: مسير كل أعضائه في فرع تاني مايتعرضش لحساب فرع، ومسير شهر لاحق بنفس الاسم برّه نطاقه مايتعدّلش، ورد إلغاء قيد على قد صلاحية القراءة",
      "ms": 1084.3645,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 5815.8594,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 6235.9279,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 1002.3447,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 139.4763,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 889.6975,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1170.6666,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 3782.2104,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR29-B01: أمر دوام العطلة لموظفين بالاسم بيتحفظ تحت قفلهم المالي — موظف اتنقل لفرع تاني قبل القفل بيرفض الأمر كله، وكمان تعديل أمر قائم ليه",
      "ms": 153.7904,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 6254.3919,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2404.7298,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 389.2953,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 165.1445,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 60.7496,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1453.1043,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 508.4817,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 149.1774,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 437.7963,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1168.8168,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
      "ms": 386.7452,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 5955.2585,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 374.1074,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 137.1491,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 238.8722,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 64.1864,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 68.5321,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 300.2547,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
      "ms": 371.3516,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP catalog exposes the effective LOAN branch chain seeded without changing its owner configuration",
      "ms": 5316.2566,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP create draft then submit freezes source amount and follows one actual branch approver below threshold",
      "ms": 235.9305,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP amount threshold adds Finance and cannot execute after only the manager approves",
      "ms": 164.8196,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP a one-cent difference at DEC18,2 maximum still includes the conditional financial approver",
      "ms": 166.4407,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP rejects forged client evidence and money on create without retaining a draft",
      "ms": 134.0561,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP ownership, employee-on-behalf privilege and cross-branch approval are enforced",
      "ms": 252.472,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "Owner 26-Sep: an installment deferral HR files on behalf is approved at once through the threshold chain and defers with HR as the ledger actor",
      "ms": 130.7087,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP RETURN then resubmit rebuilds source evidence and approval conditions while refusing forged evidence patches",
      "ms": 222.2488,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP changing amount without revision after submission is rejected atomically at final approval",
      "ms": 129.1675,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP two independent approvals cannot defer the same installment twice",
      "ms": 207.5079,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP explicit new loans conserve cents and reject sub-unit installments and excess schedule length before approval",
      "ms": 191.7441,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP custom early-settlement handler uses real approval and closes only the requesting employee loan",
      "ms": 127.5215,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP creation cannot push total open installments beyond the allocator limit at final approval",
      "ms": 125.4675,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP deferral and custom early settlement wait for Finance before locking the Request row",
      "ms": 348.2762,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "the employee: a regular loan with more than one month is refused (direct and draft submit, nothing left behind); one month or no month at all is one deduction",
      "ms": 5444.0476,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "HR on behalf: the same rule — more than one month refused, a missing month is approved at once as one installment",
      "ms": 166.231,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "an exceptional loan keeps its installments for loans.exceptional, and is refused without it (the employee and on-behalf without the permission)",
      "ms": 125.7784,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "the cap preview: more than one month only for loans.exceptional; one month or none works for everyone",
      "ms": 41.7699,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "a regular request submitted before the rule and still pending is approved with its stored months (existing loans untouched)",
      "ms": 63.8543,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "the loans list and the employee ledger carry the loan kind (exceptional flag and installment count)",
      "ms": 28.5426,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "resubmit: a returned regular loan resubmitted by the employee goes through and the month is re-stamped from today; the employee still cannot set or forge a month",
      "ms": 174.6662,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "resubmit: a month HR chose (loans.exceptional) survives unchanged — a regular loan filed on behalf, even when the employee resubmits, and an exceptional loan",
      "ms": 316.2967,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_payroll_allowances_test_3eb435c231fc5066 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_overview_filters_test_ffa9096d278545c7 is absent from sys.databases.",
    "Cleanup verified: hr_holiday_work_test_56bbf82f50904d4e is absent from sys.databases.",
    "Cleanup verified: hr_payroll_bonuses_test_937170b5e547573e is absent from sys.databases.",
    "tests 58",
    "suites 0",
    "pass 58",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 94510.0502"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_allowances_test_3eb435c231fc5066\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_allowances_test_3eb435c231fc5066\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_overview_filters_test_ffa9096d278545c7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_overview_filters_test_ffa9096d278545c7\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_work_test_56bbf82f50904d4e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_work_test_56bbf82f50904d4e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_bonuses_test_937170b5e547573e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_bonuses_test_937170b5e547573e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_completion_test_1ee05a0ba7bcea03\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_completion_test_1ee05a0ba7bcea03\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_deferral_test_12f04256eff71e43\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_deferral_test_12f04256eff71e43\"}\n",
    "{\"database\":\"hr_loan_deferral_test_12f04256eff71e43\",\"removed\":true}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_single_test_2f61a31c46fe12d8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_single_test_2f61a31c46fe12d8\"}\n"
  ]
}
