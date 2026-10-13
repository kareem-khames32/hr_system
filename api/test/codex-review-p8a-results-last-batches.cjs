module.exports = {
  "selected": [
    "raise-percent",
    "hiring-suggestions"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 22360.8729
  },
  "results": [
    {
      "file": "raise-percent.integration.cjs",
      "name": "RP-01: النسبة العامة ← نسبة مختلفة لقسم ← صفر لموظف: آخر تطبيق بيسري، بالقرش، ومن الإجمالي لما يتطلب، واللي من غير أساسي بيتساب",
      "ms": 17156.5272,
      "pass": true,
      "skip": false
    },
    {
      "file": "raise-percent.integration.cjs",
      "name": "RP-02: الصلاحيتين وحالة الدورة والقيم الصح ونطاق الفروع، وورقة المدير مابتعرضش مبلغ سطر النسبة، وسطر تدقيق لكل تطبيق",
      "ms": 604.9802,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-suggestions.integration.cjs",
      "name": "HS-01: الاقتراح — الشاغر ناقص وظايف التوظيف المفتوحة، واللي خرج بيزوّد الشاغر لوحده، والمجمّدة والمغطّاة برّه، وبنطاق الفروع",
      "ms": 17302.2963,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-suggestions.integration.cjs",
      "name": "HS-02: فتح وظيفة من الشاغر — مسودة بعدد الناقص، مرة واحدة، بصلاحية إدارة التوظيف، وطلبين مع بعض مايفتحوش أكتر من الشاغر",
      "ms": 411.0385,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_raise_percent_test_de69243bd7eba903 is absent from sys.databases.",
    "Cleanup verified: hr_hiring_suggest_test_780bfc7a2a1ca0ef is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 22360.8729"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_raise_percent_test_de69243bd7eba903\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_raise_percent_test_de69243bd7eba903\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_hiring_suggest_test_780bfc7a2a1ca0ef\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_hiring_suggest_test_780bfc7a2a1ca0ef\"}\n"
  ]
}
