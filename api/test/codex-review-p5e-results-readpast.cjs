module.exports = {
  "selected": [
    "codex-review-p5e-readpast"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 13785.7132
  },
  "results": [
    {
      "file": "codex-review-p5e-readpast.integration.cjs",
      "name": "P5E-Q01: runtime audit allows transaction queries and detects an actual extra connection",
      "ms": 9373.2421,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-readpast.integration.cjs",
      "name": "P5E-Q02: pending RETURN holds the request lock; resubmission cannot skip the round boundary",
      "ms": 1521.2168,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5E-Q01\",\"guardPositiveControl\":true,\"sameConnectionAllowed\":true}",
    "{\"id\":\"P5E-Q02\",\"waited\":true,\"resubmit\":400,\"ledgerRows\":0}",
    "Cleanup verified: hr_expense_reports_test_b22f9c6b71ae4399 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13785.7132"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_b22f9c6b71ae4399\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_b22f9c6b71ae4399\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":6,\"probes\":1,\"unexpected\":[]}}\n"
  ]
}
