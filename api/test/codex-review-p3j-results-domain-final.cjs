module.exports = {
  "selected": [
    "codex-review-p3j-domain-creation"
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
    "duration_ms": 27572.7612
  },
  "results": [
    {
      "file": "codex-review-p3j-domain-creation.integration.cjs",
      "name": "P3J-D-sequential: the established GUID prevents a second directory identity from claiming the same employee",
      "ms": 19819.1541,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-domain-creation.integration.cjs",
      "name": "P3J-D-create-same-guid: two simultaneous first domain logins do not create duplicate employee accounts",
      "ms": 340.6307,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-domain-creation.integration.cjs",
      "name": "P3J-D-create-two-guids: two simultaneous first domain logins do not create duplicate employee accounts",
      "ms": 238.5439,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-domain-creation.integration.cjs",
      "name": "P3J-D-created-account: an existing disabled account appearing after matching is not bypassed by a stale first-login creation",
      "ms": 256.9245,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 27572.7612"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_domain_creation_test_ef3ac802da88f153\"}\n",
    "REVIEW_MEASURE {\"case\":\"sequential-domain-control\",\"statuses\":[201,401],\"accounts\":1}\n",
    "REVIEW_MEASURE {\"case\":\"concurrent-domain-creation\",\"sameGuid\":true,\"statuses\":[201,201],\"accounts\":1,\"protectedSessions\":2}\n",
    "REVIEW_MEASURE {\"case\":\"concurrent-domain-creation\",\"sameGuid\":false,\"statuses\":[201,401],\"accounts\":1,\"protectedSessions\":1}\n",
    "REVIEW_MEASURE {\"case\":\"domain-creation-after-disabled-account\",\"freshLogin\":401,\"pendingLogin\":401,\"accounts\":1,\"employeeMatches\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_domain_creation_test_ef3ac802da88f153\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_domain_creation_test_ef3ac802da88f153\"}\n"
  ]
}
