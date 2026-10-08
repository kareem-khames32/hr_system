module.exports = {
  "selected": [
    "codex-review-p3j-slot-races"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 7,
      "failed": 0,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 8369.6671
  },
  "results": [
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-create: manual writer rejects a directory account that won the employee slot",
      "ms": 4969.3838,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-rebind: manual writer rejects a directory account that won the employee slot",
      "ms": 159.1765,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-archive-first: a first login waiting on an archive sees the committed closed employee",
      "ms": 143.7237,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-slot-first-archive: employee mutation waits behind account creation and updates that new account",
      "ms": 153.393,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-slot-first-transfer: employee mutation waits behind account creation and updates that new account",
      "ms": 192.4349,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-transfer-first: stale directory match creates in the employee current branch",
      "ms": 193.688,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-rebind-archive: linking an existing account and archiving its new employee follow one order",
      "ms": 99.9897,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8369.6671"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_slot_races_test_ee454c01276b1008\"}\n",
    "REVIEW_MEASURE {\"case\":\"manual-after-domain\",\"kind\":\"create\",\"status\":409,\"accounts\":1}\n",
    "REVIEW_MEASURE {\"case\":\"manual-after-domain\",\"kind\":\"rebind\",\"status\":409,\"accounts\":1}\n",
    "REVIEW_MEASURE {\"case\":\"archive-before-slot\",\"sqlWait\":true,\"archive\":201,\"login\":401,\"accounts\":0}\n",
    "REVIEW_MEASURE {\"case\":\"slot-before-employee-mutation\",\"mutation\":\"archive\",\"sqlWait\":true,\"change\":201,\"login\":201,\"version\":1,\"active\":false,\"branchUpdated\":false}\n",
    "REVIEW_MEASURE {\"case\":\"slot-before-employee-mutation\",\"mutation\":\"transfer\",\"sqlWait\":true,\"change\":200,\"login\":201,\"version\":1,\"active\":true,\"branchUpdated\":true}\n",
    "REVIEW_MEASURE {\"case\":\"transfer-before-slot\",\"login\":201,\"currentBranchUsed\":true}\n",
    "REVIEW_MEASURE {\"case\":\"rebind-before-archive\",\"sqlWait\":true,\"statuses\":[200,201],\"version\":2}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_slot_races_test_ee454c01276b1008\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_slot_races_test_ee454c01276b1008\"}\n"
  ]
}
