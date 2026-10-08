module.exports = {
  "selected": [
    "data-protection"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 10632.486
  },
  "results": [
    {
      "file": "data-protection.integration.cjs",
      "name": "DP-01: قبل ترحيل 139 الشاشة بتقول إن السجل ناقص ومدد الاحتفاظ شغالة؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان",
      "ms": 7549.4414,
      "pass": true,
      "skip": false
    },
    {
      "file": "data-protection.integration.cjs",
      "name": "DP-02: حادثة تسريب — موعد الإخطار = الاكتشاف + 72 ساعة، والعدّاد والتأخير، وخطوتي «اتبلّغت» و«اتقفلت» تحت القفل وبسطر تدقيق، ولحساب بكل الفروع",
      "ms": 217.172,
      "pass": true,
      "skip": false
    },
    {
      "file": "data-protection.integration.cjs",
      "name": "DP-03: مدد الاحتفاظ — فاضية افتراضيًا (مفيش مهام)، وبالمدة بيتعدّ اللي عدّاها وبتتعمل مهمة مراجعة لكل فرع مرة واحدة، ومن غير أي مسح",
      "ms": 343.3457,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_data_protection_test_23055c59134b2472 is absent from sys.databases.",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10632.486"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_data_protection_test_23055c59134b2472\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_data_protection_test_23055c59134b2472\"}\n"
  ]
}
