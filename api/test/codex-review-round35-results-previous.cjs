module.exports = {
  "selected": [
    "codex-review-round34-independent",
    "codex-review-round34-boundaries",
    "codex-review-round34-exemption-events"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 28129.765
  },
  "results": [
    {
      "file": "codex-review-round34-independent.integration.cjs",
      "name": "CR34 bonus: private run references, deferred events, paid fields and employee self visibility preserve money",
      "ms": 6143.1049,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round34-independent.integration.cjs",
      "name": "CR34 deduction: private run references, deferred events, paid fields and employee self visibility preserve money",
      "ms": 1487.8464,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
      "ms": 6654.2941,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 both obligation reservation guards reject without foreign run numbers or writes",
      "ms": 206.5694,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
      "ms": 5405.0788,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
      "ms": 1239.9349,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"request-payroll-reference-lifecycle\",\"kind\":\"bonus\",\"foreignHidden\":true,\"companyVisible\":true,\"selfVisible\":true,\"reservedRefusal\":409,\"closedPeriod\":400,\"deferredEventRedacted\":true,\"storedEventsUnchanged\":true,\"amount\":123.45,\"net\":9123.45,\"reconciliation\":null}",
    "{\"case\":\"request-payroll-reference-lifecycle\",\"kind\":\"deduction\",\"foreignHidden\":true,\"companyVisible\":true,\"selfVisible\":true,\"reservedRefusal\":409,\"closedPeriod\":400,\"deferredEventRedacted\":true,\"storedEventsUnchanged\":true,\"amount\":67.89,\"net\":8932.11,\"reconciliation\":\"snapshot branch B only; difference 0\"}",
    "{\"case\":\"carry-event-run-reference\",\"directRunStatus\":403,\"requestDetailStatus\":200,\"branchEvents\":[{\"type\":\"CARRY_FORWARD\",\"runId\":null},{\"type\":\"CARRY_SUSPENDED\",\"runId\":null}],\"companyEvents\":[{\"type\":\"CARRY_FORWARD\",\"runId\":1},{\"type\":\"CARRY_SUSPENDED\",\"runId\":2}],\"actionResponseEvents\":[{\"type\":\"CARRY_FORWARD\",\"runId\":null},{\"type\":\"CARRY_SUSPENDED\",\"runId\":null}],\"ledgerReferencesHidden\":true,\"pastPeriodRejectedWithoutWrite\":true,\"paid\":2000,\"remaining\":500,\"storedEvidenceUnchangedByReads\":true}",
    "{\"case\":\"reservation-guards\",\"guardCount\":2,\"status\":409,\"code\":\"PAYRUN-OBLIGATION-RESERVED\",\"foreignRunReferenceAbsent\":true,\"ledgerUnchanged\":true}",
    "{\"case\":\"exemption-event-run-reference\",\"disposition\":\"DROP\",\"directRunStatus\":403,\"detailStatus\":200,\"branchEvents\":[{\"type\":\"EXEMPTION_GRANTED\",\"runId\":null},{\"type\":\"EXEMPTED\",\"runId\":null}],\"companyEvents\":[{\"type\":\"EXEMPTION_GRANTED\",\"runId\":1},{\"type\":\"EXEMPTED\",\"runId\":1}],\"exemptionAmount\":123.45,\"beforeNet\":8876.55,\"afterNet\":9000,\"storedEvidenceUnchangedByRead\":true}",
    "{\"case\":\"exemption-event-run-reference\",\"disposition\":\"DEFER_ONE_PERIOD\",\"directRunStatus\":403,\"detailStatus\":200,\"branchEvents\":[{\"type\":\"EXEMPTION_GRANTED\",\"runId\":null},{\"type\":\"DEFERRED_BY_EXEMPTION\",\"runId\":null}],\"companyEvents\":[{\"type\":\"EXEMPTION_GRANTED\",\"runId\":2},{\"type\":\"DEFERRED_BY_EXEMPTION\",\"runId\":2}],\"exemptionAmount\":123.45,\"beforeNet\":8876.55,\"afterNet\":9000,\"storedEvidenceUnchangedByRead\":true}",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 28129.765"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_independent_test_269b105ef134da04\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_independent_test_269b105ef134da04\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_independent_test_269b105ef134da04\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_boundaries_test_5f50ba78cc5f37ac\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_boundaries_test_5f50ba78cc5f37ac\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_boundaries_test_5f50ba78cc5f37ac\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_exemption_events_test_2bcfa93137dddd98\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_exemption_events_test_2bcfa93137dddd98\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_exemption_events_test_2bcfa93137dddd98\"}\n"
  ]
}
