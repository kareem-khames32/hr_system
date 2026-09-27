module.exports = {
  "selected": [
    "codex-review-round12-termination-adapted"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 15014.2577
  },
  "results": [
    {
      "file": "codex-review-round12-termination-adapted.integration.cjs",
      "name": "TR-M1: ترحيل 073 عبر المُرحّل المجمّع من الشكل القديم nvarchar(500) NOT NULL بصفوف قائمة — توسيع بس، القيم زي ما هي، فرق المخطط صفر، آمن للتكرار، والشكل الغلط يوقف بكوده",
      "ms": 12374.3052,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_termination_reasons_test_a9366e29b1ab8726 is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15014.2577"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_termination_reasons_test_a9366e29b1ab8726\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_termination_reasons_test_a9366e29b1ab8726\"}\n"
  ]
}
