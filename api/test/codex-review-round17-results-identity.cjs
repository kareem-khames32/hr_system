module.exports = {
  "selected": [
    "codex-review-round17-identity"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 2,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 7869.6238
  },
  "results": [
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized passport",
      "ms": 5067.7564,
      "pass": false,
      "error": "Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "cause": "Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:13:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized national ID",
      "ms": 58.6778,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: legacy passport accepted by old DTO remains editable when form resends it unchanged",
      "ms": 47.9463,
      "pass": false,
      "error": "Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n",
      "cause": "Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: SQL and JS normalization agree across every stripped character and both Arabic digit sets",
      "ms": 20.5845,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized passport",
      "ms": 5067.7564,
      "pass": false,
      "error": "Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "cause": "Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:13:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: legacy passport accepted by old DTO remains editable when form resends it unchanged",
      "ms": 47.9463,
      "pass": false,
      "error": "Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n",
      "cause": "Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"passport-race\",\"statuses\":[200,200],\"persisted\":[{\"id\":1,\"passportNo\":\"RACEP123\"},{\"id\":2,\"passportNo\":\"RACEP123\"}]}",
    "{\"case\":\"national-id-race\",\"statuses\":[200,409],\"persisted\":[{\"id\":3,\"nationalId\":\"RACEI123\"}]}",
    "{\"case\":\"legacy-form\",\"sharedValidationIssues\":0,\"partialPatch\":200,\"formPatch\":400,\"message\":[\"رقم جواز السفر: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 40)\"],\"phone\":\"0550001111\"}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7869.6238"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r17_identity_test_396ed50f3fd4e910\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r17_identity_test_396ed50f3fd4e910\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r17_identity_test_396ed50f3fd4e910\"}\n"
  ]
}
