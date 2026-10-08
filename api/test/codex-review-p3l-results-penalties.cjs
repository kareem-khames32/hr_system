module.exports = {
  "selected": [
    "codex-review-p3l-penalties"
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
    "duration_ms": 10014.3614
  },
  "results": [
    {
      "file": "codex-review-p3l-penalties.integration.cjs",
      "name": "P3L-P01 control: changed penalty rejects old fingerprint",
      "ms": 6824.9931,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-penalties.integration.cjs",
      "name": "P3L-P02 control: pending failure cannot increase concurrent recurrence",
      "ms": 186.7171,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-penalties.integration.cjs",
      "name": "P3L-P03: expired pending reservation is deleted while its writer can still create a deduction",
      "ms": 182.5393,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-penalties.integration.cjs",
      "name": "P3L-P04: manual financial reason for same actor is accepted as an unrelated penalty request",
      "ms": 93.1516,
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
    "duration_ms 10014.3614"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_edeb1e1c6e39bccc\"}\n",
    "REVIEW_MEASURE {\"case\":\"P01\",\"staleFingerprint\":409,\"penalties\":0}\n",
    "REVIEW_MEASURE {\"case\":\"P02\",\"concurrent\":409,\"failedFirst\":403,\"finalOccurrence\":1,\"days\":1}\n",
    "REVIEW_MEASURE {\"case\":\"P03\",\"firstStatus\":201,\"secondStatus\":201,\"remainingPenalties\":1,\"financialRequests\":2,\"oldReservationDeleted\":true}\n",
    "REVIEW_MEASURE {\"case\":\"P04\",\"status\":201,\"penaltyDays\":1,\"linkedFixedAmount\":7,\"wrongFinancialType\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_edeb1e1c6e39bccc\"}\n"
  ]
}
