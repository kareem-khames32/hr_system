module.exports = {
  "selected": [
    "codex-review-p8b-payroll",
    "codex-review-p8b-evaluator",
    "codex-review-p8b-position-gate",
    "codex-review-p8b-meeting-races"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 13,
      "failed": 1,
      "passed": 12,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 13,
      "suites": 0
    },
    "duration_ms": 36920.1403
  },
  "results": [
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F00: off payroll calculation, policy fingerprint and slip match approved baseline",
      "ms": 13438.6303,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F01: late pending correction versus final payroll approval",
      "ms": 1165.1543,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F02: exemption preview omits missing-punch amount that execution later drops",
      "ms": 961.8532,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F03: global lateness waiver also removes missing punch with exact slip sum",
      "ms": 850.8303,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F04: missing punch respects the net floor and exact payslip cents",
      "ms": 706.1747,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F05: enabled penalty does not waive an unrelated attendance review reason",
      "ms": 781.7597,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-evaluator.integration.cjs",
      "name": "P8B-R01: employee transferred after scope judgment before evaluator write",
      "ms": 11559.6748,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n1 !== undefined\n",
      "cause": "Expected values to be strictly equal:\n\n1 !== undefined\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== undefined\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8b-evaluator.integration.cjs:77:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p8b-position-gate.integration.cjs",
      "name": "P8B-J01: vacancy route bypasses recruitment module audience",
      "ms": 11451.661,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M01: call closed before locked token issuance is refused",
      "ms": 11734.2565,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M02: meeting ended before locked token issuance is refused",
      "ms": 101.059,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M03: removal blocks the API but leaves the issued room bearer valid",
      "ms": 98.8742,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M04: hangup blocks new issuance but does not revoke the issued bearer",
      "ms": 91.0614,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M05: ten simultaneous admissions serialize with one attendance row",
      "ms": 171.0193,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p8b-evaluator.integration.cjs",
      "name": "P8B-R01: employee transferred after scope judgment before evaluator write",
      "ms": 11559.6748,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n1 !== undefined\n",
      "cause": "Expected values to be strictly equal:\n\n1 !== undefined\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== undefined\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8b-evaluator.integration.cjs:77:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_31af974e9524565b is absent from sys.databases.",
    "Cleanup verified: hr_review_evaluator_test_8a4ff9878a095284 is absent from sys.databases.",
    "Cleanup verified: hr_p8b_positions_test_857bcefbb9b3fb8c is absent from sys.databases.",
    "Cleanup verified: hr_meet_calls_test_b278d6c68da1dfbb is absent from sys.databases.",
    "tests 13",
    "suites 0",
    "pass 12",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 36920.1403"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_31af974e9524565b\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F00\",\"baseline\":\"cfd56bd4\",\"items\":2,\"snapshotAndHashEqual\":true,\"breakdownAndSlipEqual\":true}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F01\",\"approval\":409,\"code\":\"PAYRUN-MISSING-PUNCH-STALE\",\"pendingCorrection\":5,\"deduction\":75}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F02\",\"before\":93.75,\"estimated\":\"93.75\",\"after\":0,\"actualDropped\":93.75}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_31af974e9524565b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_8a4ff9878a095284\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-R01-transfer\",\"status\":200}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-R01\",\"status\":404,\"branch\":2,\"hrBranch\":1,\"manager\":1,\"chosen\":3}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_8a4ff9878a095284\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_p8b_positions_test_857bcefbb9b3fb8c\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-J01\",\"original\":404,\"alternate\":400}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_p8b_positions_test_857bcefbb9b3fb8c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_meet_calls_test_b278d6c68da1dfbb\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-M01\",\"ended\":true,\"status\":410,\"noToken\":true,\"freshStatus\":410}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-M02\",\"ended\":true,\"status\":410,\"noToken\":true,\"freshStatus\":410}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-M03\",\"removed\":200,\"fresh\":403,\"oldSignatureValid\":true,\"remainingSeconds\":600,\"canSubscribe\":true,\"realMediaTested\":false}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-M04\",\"ended\":true,\"oldSignatureValid\":true,\"remainingSeconds\":600,\"realMediaTested\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_meet_calls_test_b278d6c68da1dfbb\"}\n"
  ]
}
