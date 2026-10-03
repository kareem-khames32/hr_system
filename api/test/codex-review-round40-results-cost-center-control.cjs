module.exports = {
  "selected": [
    "codex-review-round40-scope-controls"
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
    "duration_ms": 17650.8646
  },
  "results": [
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 COST_CENTER: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 12884.5749,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"extended-scope-label-controls\",\"kind\":\"COST_CENTER\",\"branchLabel\":\"مركز تكلفة: CR40 company cost center\",\"companyLabel\":\"مركز تكلفة: CR40 company cost center\",\"multiLabel\":\"مركز تكلفة: CR40 company cost center\",\"localTotal\":\"6000.00\",\"companyTotal\":\"15000.00\",\"branchHeader\":[null,null],\"companyHeader\":[null,null],\"storedUnchanged\":true}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 17650.8646"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r40_scopes_test_823eb260bd20d011\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r40_scopes_test_823eb260bd20d011\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r40_scopes_test_823eb260bd20d011\"}\n"
  ]
}
