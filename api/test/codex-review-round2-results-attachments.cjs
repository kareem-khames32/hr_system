module.exports = {
  "selected": [
    "leave-attachment-with-request",
    "leave-sick-pay-attachment"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 8,
      "failed": 0,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 67892.8563
  },
  "results": [
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل",
      "ms": 18013.5456,
      "pass": true
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع",
      "ms": 2345.803,
      "pass": true
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف",
      "ms": 3046.087,
      "pass": true
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط",
      "ms": 2627.6112,
      "pass": true
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب",
      "ms": 3920.0846,
      "pass": true
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll",
      "ms": 25583.1688,
      "pass": true
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: days 31-40 of the year at 75% deduct 750 as their own line; an isUnpaid sick day is not charged twice",
      "ms": 13364.5483,
      "pass": true
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: crossing day 90 splits into 75% and 0% lines; fully paid sick days add nothing",
      "ms": 25785.7449,
      "pass": true
    }
  ],
  "failures": [],
  "diagnostics": [
    "المرفق المطلوب مع الطلب: رفض بلا ملف، قبول معه، ونفس الحقل في الطلب وسجل الإجازة.",
    "مسار «بعد الرجوع» كما هو: تذكير يوم الموعد، رفع بنفس الحقل، وتحويل بدون راتب بعد انقضاء المهلة.",
    "Cleanup verified: hr_leave_attach_test_e04a3d2a7e550cca is absent from sys.databases.",
    "Manual: 9000 − 3 × 300 (MISSED sick days now unpaid) = 8100; no tier deduction on top.",
    "Manual: day rate 300; 10 days × 300 × 25% = 750 (sick) + 2 unpaid days × 300 = 600; net 9000 − 1350 = 7650.",
    "Manual: 2 × 300 × 25% = 150 + 2 × 300 × 100% = 600 → 750; five fully paid days → 0.",
    "Cleanup verified: hr_leave_sick_pay_test_09211beb7e922aff is absent from sys.databases.",
    "tests 8",
    "suites 0",
    "pass 8",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 67892.8563"
  ],
  "stdout": [
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n"
  ]
}
