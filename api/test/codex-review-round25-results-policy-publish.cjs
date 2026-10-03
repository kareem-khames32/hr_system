module.exports = {
  "selected": [
    "payroll-policy-publish"
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
    "duration_ms": 11037.5073
  },
  "results": [
    {
      "file": "payroll-policy-publish.integration.cjs",
      "name": "Acceptance: HR creates «مجموعة القاهرة» with cycle 23 → 22 and publishes it; the version freezes; a payroll.calculate-only user cannot",
      "ms": 6824.0984,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-publish.integration.cjs",
      "name": "Publishing checks cycle alignment, closes the previous published version at a cycle end and refuses approved periods",
      "ms": 727.4043,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-publish.integration.cjs",
      "name": "Reviewer defect: a fixed end day that breaks contiguity cannot be created, saved or published; start − 1 equals the derived cycle; codes are generated",
      "ms": 331.6507,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-publish.integration.cjs",
      "name": "Migration 022 triggers keep a published version, its definition rows and its seal frozen; direct tampering shows as a seal mismatch",
      "ms": 239.1221,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_policy_publish_test_7a3701291c022a6a is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11037.5073"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policy_publish_test_7a3701291c022a6a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policy_publish_test_7a3701291c022a6a\"}\n"
  ]
}
