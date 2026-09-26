module.exports = {
  "selected": [
    "codex-review-round5-boundaries"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 1,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 13429.5007
  },
  "results": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 B01 canonicalization covers mixed case, trailing spaces and every later validator branch",
      "ms": 7104.0718,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 B02 and N02 transferred request detail preserves parties and masks all current organization fields",
      "ms": 461.5544,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N01 history matrix covers global, multi-branch, legacy, deleted and forbidden definitions",
      "ms": 535.8945,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N03 report uses inclusive start and end, ignores cancelled/pre-rehire cases and preserves real presence",
      "ms": 364.9253,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 N03 archive near local midnight must retain the same final day as employmentWindowOf",
      "ms": 43.4894,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 253.3463,
      "pass": false,
      "error": "Inbox disclosed current foreign title",
      "cause": "Inbox disclosed current foreign title",
      "stack": "AssertionError [ERR_ASSERTION]: Inbox disclosed current foreign title\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:180:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 253.3463,
      "pass": false,
      "error": "Inbox disclosed current foreign title",
      "cause": "Inbox disclosed current foreign title",
      "stack": "AssertionError [ERR_ASSERTION]: Inbox disclosed current foreign title\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:180:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"licenceAliases\":5,\"categoryAliases\":5,\"validatorRejections\":16,\"authorisedLicenceWorks\":true,\"ordinaryCanonicalWrite\":true,\"scopeWriteDenied\":3}",
    "{\"hiddenActors\":5,\"visibleActors\":3,\"insideUnprivileged\":403,\"foreignEqualsMissing\":true,\"foreignPartyAccess\":4,\"confidentialMasked\":true}",
    "{\"historyMatrix\":[{\"kind\":\"SHIFT\",\"expected\":[200,200,200,404],\"actual\":[200,200,200,404]},{\"kind\":\"SHIFT\",\"expected\":[200,200,404,404],\"actual\":[200,200,404,404]},{\"kind\":\"SHIFT\",\"expected\":[200,200,200,200],\"actual\":[200,200,200,200]},{\"kind\":\"SHIFT\",\"expected\":[403,403,403,403],\"actual\":[403,403,403,403]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[200,200,200,404],\"actual\":[200,200,200,404]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[200,200,404,404],\"actual\":[200,200,404,404]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[200,200,200,200],\"actual\":[200,200,200,200]},{\"kind\":\"WORK_SCHEDULE\",\"expected\":[403,403,403,403],\"actual\":[403,403,403,403]}],\"deletedCompanyOnly\":true}",
    "{\"employmentReportCases\":[{\"label\":\"actual-start\",\"expectedAbsent\":9,\"actualAbsent\":9,\"presencePreserved\":1},{\"label\":\"open-case\",\"expectedAbsent\":6,\"actualAbsent\":6,\"presencePreserved\":1},{\"label\":\"cancel-prehire-archive\",\"expectedAbsent\":6,\"actualAbsent\":6,\"presencePreserved\":1},{\"label\":\"case-wins-over-archive\",\"expectedAbsent\":9,\"actualAbsent\":9,\"presencePreserved\":1},{\"label\":\"earliest-case\",\"expectedAbsent\":6,\"actualAbsent\":6,\"presencePreserved\":1},{\"label\":\"ended-unknown\",\"expectedAbsent\":11,\"actualAbsent\":11,\"presencePreserved\":1}]}",
    "{\"probe\":\"archive-midnight\",\"zone\":\"Africa/Cairo\",\"instant\":\"2026-09-10T22:30:00.000Z\",\"employmentLastDay\":\"2026-09-11\",\"windowApi\":\"2026-09-11\",\"sqlDate\":\"2026-09-11\",\"expectedAbsent\":1,\"actualAbsent\":1}",
    "{\"probe\":\"inbox-after-transfer\",\"employeeStatus\":404,\"detailHidden\":true,\"detailTitle\":null,\"inboxTitle\":\"NEW FOREIGN JOB R5\",\"oldTitle\":\"OLD JOB R5\",\"newTitle\":\"NEW FOREIGN JOB R5\"}",
    "tests 6",
    "suites 0",
    "pass 5",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13429.5007"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r5boundaries_test_91eac597145907c0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r5boundaries_test_91eac597145907c0\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r5boundaries_test_91eac597145907c0\"}\n"
  ]
}
