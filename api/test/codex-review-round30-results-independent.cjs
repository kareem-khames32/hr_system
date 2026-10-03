module.exports = {
  "selected": [
    "codex-review-round30-independent"
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
    "duration_ms": 11520.0752
  },
  "results": [
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation create holds employee lock until save, transfer waits",
      "ms": 4990.7139,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation cancel holds employee lock until save, transfer waits",
      "ms": 430.3144,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 cancellation rereads APPLIED after a real payroll is paid during its early scope check",
      "ms": 2331.259,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 employees allowance targets are reread after actual transfer; named group is atomic",
      "ms": 301.0731,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 teams allowance targets are reread after actual transfer; named group is atomic",
      "ms": 373.3213,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 waiver named target rejects real transfer without any partial save",
      "ms": 146.2462,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-create named target rejects real transfer without any partial save",
      "ms": 151.0547,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-update named target rejects real transfer without any partial save",
      "ms": 222.5876,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"financial-write-first\",\"action\":\"create\",\"exclusiveLock\":true,\"write\":201,\"transfer\":200,\"afterTransfer\":403,\"amount\":321.09}",
    "{\"case\":\"financial-write-first\",\"action\":\"cancel\",\"exclusiveLock\":true,\"write\":201,\"transfer\":200,\"afterTransfer\":403,\"amount\":321.09}",
    "{\"case\":\"paid-state-recheck\",\"cancelStatus\":400,\"ledger\":\"APPLIED\",\"net\":9321.09,\"expected\":9321.09}",
    "{\"case\":\"allowance-target-recheck\",\"level\":\"employees\",\"transfer\":200,\"status\":400,\"employees\":[],\"remainingExpected\":0,\"total\":0}",
    "{\"case\":\"allowance-target-recheck\",\"level\":\"teams\",\"transfer\":200,\"status\":201,\"employees\":[7],\"remainingExpected\":1,\"total\":150.25}",
    "{\"case\":\"named-target-recheck\",\"kind\":\"waiver\",\"transfer\":200,\"status\":400,\"noPartialSave\":true}",
    "{\"case\":\"named-target-recheck\",\"kind\":\"holiday-create\",\"transfer\":200,\"status\":400,\"noPartialSave\":true}",
    "{\"case\":\"named-target-recheck\",\"kind\":\"holiday-update\",\"transfer\":200,\"status\":400,\"noPartialSave\":true}",
    "tests 8",
    "suites 0",
    "pass 8",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11520.0752"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r30_independent_test_a2af8da71514d819\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r30_independent_test_a2af8da71514d819\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r30_independent_test_a2af8da71514d819\"}\n"
  ]
}
