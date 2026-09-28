module.exports = {
  "selected": [
    "codex-review-round18-locks",
    "codex-review-round18-overtime"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 9,
      "failed": 0,
      "passed": 9,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 16966.4722
  },
  "results": [
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 four unique fields reject create/update collision after both real preflights pass",
      "ms": 4580.6469,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 existing identity lock does not prevent unrelated phone save",
      "ms": 55.2515,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 real finance wait followed by simultaneous creation identity update schedule assignment and ordinary save completes without deadlock",
      "ms": 273.6733,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 concurrent clearing of the two identity fields must preserve at least one on fresh state",
      "ms": 183.0467,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 legacy unchanged values allowed but newly invalid values types and lengths still rejected",
      "ms": 133.1266,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 all overtime read surfaces hide historical foreign window names and governing IDs without modifying stored evidence",
      "ms": 7177.053,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 foreign period ID must also be absent from automatic approval marker in monthly response",
      "ms": 0.144,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 redaction must preserve automatic pending status for branch reader",
      "ms": 0.0673,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 recursive projection preserves input and handles mixed scopes deleted periods and nested review evidence",
      "ms": 0.9098,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"four-unique-fields-create-update\",\"evidence\":[{\"field\":\"passportNo\",\"statuses\":[409,200],\"persisted\":1},{\"field\":\"nationalId\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"email\",\"statuses\":[409,200],\"persisted\":1},{\"field\":\"fingerprintCode\",\"statuses\":[201,409],\"persisted\":1}]}",
    "{\"case\":\"ordinary-save-with-identity-lock-held\",\"status\":200}",
    "{\"case\":\"lock-order\",\"waitObserved\":true,\"statuses\":[200,201,201,200],\"identityPaths\":[[\"attendance\",\"finance\",\"identity\"],[\"attendance\",\"finance\",\"identity\"]]}",
    "{\"case\":\"concurrent-clear-pair\",\"realSqlWaiters\":2,\"statuses\":[400,200],\"nationalId\":\"ID-13\",\"passportNo\":null}",
    "{\"case\":\"all-window-surfaces\",\"checked\":[\"pending\",\"monthly-detected\",\"preview\",\"request-detail\",\"monthly-approved\"],\"storedSnapshotsUnchanged\":true,\"amount\":140.62,\"waitingFlags\":{\"branch\":true,\"company\":true,\"status\":\"DETECTED\"},\"marker\":{\"periodId\":1,\"shownMarker\":{\"periodIds\":[]},\"storedMarker\":{\"periodIds\":[1]}}}",
    "{\"case\":\"foreign-approval-marker\",\"periodId\":1,\"shownMarker\":{\"periodIds\":[]},\"storedMarker\":{\"periodIds\":[1]}}",
    "{\"case\":\"pending-status\",\"branch\":true,\"company\":true,\"status\":\"DETECTED\"}",
    "Cleanup verified: hr_ot_auto_approve_test_933ca24dcb4ef702 is absent from sys.databases.",
    "tests 9",
    "suites 0",
    "pass 9",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16966.4722"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r18_locks_test_4d782b4ea35811a6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r18_locks_test_4d782b4ea35811a6\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r18_locks_test_4d782b4ea35811a6\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_933ca24dcb4ef702\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_933ca24dcb4ef702\"}\n"
  ]
}
