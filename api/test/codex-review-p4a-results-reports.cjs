module.exports = {
  "selected": [
    "financial-report",
    "cost-center-report",
    "gosi-tracks",
    "leave-year-end",
    "leave-contract",
    "payroll-daily-accrual"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 36,
      "failed": 0,
      "passed": 36,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 36,
      "suites": 0
    },
    "duration_ms": 56982.4954
  },
  "results": [
    {
      "file": "financial-report.integration.cjs",
      "name": "كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا",
      "ms": 10333.8214,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "ملخص التكلفة والخصومات والإضافي من نفس البنود",
      "ms": 48.7751,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير",
      "ms": 58.7012,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 44.9004,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
      "ms": 10242.3042,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 19.9292,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
      "ms": 69.3715,
      "pass": true,
      "skip": false
    },
    {
      "file": "gosi-tracks.integration.cjs",
      "name": "GT-1: المسير بالمسارين وبالقيمة السارية في آخر يوم في الفترة، وحدود مصر المؤرخة، والمسير المعتمد مابيتغيرش لما يتفتح",
      "ms": 14069.8069,
      "pass": true,
      "skip": false
    },
    {
      "file": "gosi-tracks.integration.cjs",
      "name": "GT-2: خانة «تاريخ أول تسجيل في التأمينات» — الحفظ والمسح والتحقق وسجل التغييرات، ومخفية عن غير المالية",
      "ms": 350.5722,
      "pass": true,
      "skip": false
    },
    {
      "file": "gosi-tracks.integration.cjs",
      "name": "GT-3: الإعدادات — «الأساسي + السكن»، والقيم المؤرخة في الشاشة، وتاريخ قرار حدود مصر",
      "ms": 337.2789,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 11129.944,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 95.2245,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 166.6094,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 254.1732,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 102.9264,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 10288.1869,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 676.1825,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 72.808,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 232.3474,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 286.7446,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 138.3405,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 205.8843,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 206.8453,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 189.4638,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 47.5578,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 556.8351,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 220.6528,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 273.5328,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 35.1055,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 100.3949,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-01: المسير المحسوب من الأيام المتراكمة يطابق المحسوب من الصفر بندًا ببند",
      "ms": 15274.797,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-02: تغيير بأثر رجعي يعلّم يومه «متسخ» فقط، والنتيجة تفضل مطابقة لإعادة الحساب الكاملة",
      "ms": 1920.297,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-03: بصمة المدخلات تمسك التغيير حتى لو محدش علّم اليوم متسخ",
      "ms": 1049.4203,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-04: الجار الليلي آمن لإعادة التشغيل ولا يلمس مسيرًا معتمدًا",
      "ms": 1291.8376,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-06: مفتاح الإيقاف يرجّع الحساب لمساره القديم بنفس الأرقام بالحرف",
      "ms": 3293.9553,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-05: شاشة المسير تعرض «آخر يوم محسوب» وزرار «حدّث الحساب» يشتغل",
      "ms": 824.193,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_financial_report_test_ef0f86b3cf6a0e66 is absent from sys.databases.",
    "Cleanup verified: hr_cost_center_test_db832bb34ba26b11 is absent from sys.databases.",
    "Cleanup verified: hr_gosi_tracks_test_12d0377f29a49ef0 is absent from sys.databases.",
    "Cleanup: hr_leave_year_end_test_9e5e4ae1f1986727 dropped.",
    "نفس totalNet ونفس كل بند وتفصيله في المسارين",
    "Cleanup verified: hr_payroll_accrual_test_8b80810f724a7c95 no longer exists in sys.databases.",
    "tests 36",
    "suites 0",
    "pass 36",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 56982.4954"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_financial_report_test_ef0f86b3cf6a0e66\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_financial_report_test_ef0f86b3cf6a0e66\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_cost_center_test_db832bb34ba26b11\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_cost_center_test_db832bb34ba26b11\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_gosi_tracks_test_12d0377f29a49ef0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_gosi_tracks_test_12d0377f29a49ef0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_year_end_test_9e5e4ae1f1986727\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_year_end_test_9e5e4ae1f1986727\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_1f3007a77abdecde\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_1f3007a77abdecde\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_accrual_test_8b80810f724a7c95\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_accrual_test_8b80810f724a7c95\"}\n"
  ]
}
