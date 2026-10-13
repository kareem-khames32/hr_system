module.exports = {
  "selected": [
    "codex-review-p8b-payroll",
    "codex-review-p8b-evaluator",
    "codex-review-p8b-position-gate",
    "codex-review-p8b-meeting-races"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 16,
      "failed": 0,
      "passed": 16,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 16,
      "suites": 0
    },
    "duration_ms": 37123.9969
  },
  "results": [
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F00: off payroll calculation, policy fingerprint and slip match approved baseline",
      "ms": 13235.1599,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F01: late pending correction versus final payroll approval",
      "ms": 1074.6847,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F02: exemption preview omits missing-punch amount that execution later drops",
      "ms": 982.0592,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F03: global lateness waiver also removes missing punch with exact slip sum",
      "ms": 834.4728,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F04: missing punch respects the net floor and exact payslip cents",
      "ms": 708.6639,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F05: enabled penalty does not waive an unrelated attendance review reason",
      "ms": 759.5808,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F06: request committed after the approval source check must not leave a stale approved charge",
      "ms": 868.1499,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-evaluator.integration.cjs",
      "name": "P8B-R01: employee transferred after scope judgment before evaluator write",
      "ms": 11560.1161,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-evaluator.integration.cjs",
      "name": "P8B-R02: a real transfer waits for the evaluator transaction employee lock",
      "ms": 285.7841,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-evaluator.integration.cjs",
      "name": "P8B-R03: crossed evaluator assignments use the same employee lock order",
      "ms": 48.9321,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-position-gate.integration.cjs",
      "name": "P8B-J01: vacancy route bypasses recruitment module audience",
      "ms": 11554.944,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M01: call closed before locked token issuance is refused",
      "ms": 11471.8497,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M02: meeting ended before locked token issuance is refused",
      "ms": 92.5289,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M03: removal blocks the API but leaves the issued room bearer valid",
      "ms": 86.4177,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M04: hangup blocks new issuance but does not revoke the issued bearer",
      "ms": 75.6051,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-meeting-races.integration.cjs",
      "name": "P8B-M05: ten simultaneous admissions serialize with one attendance row",
      "ms": 154.9401,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_d73c8dad6a658507 is absent from sys.databases.",
    "Cleanup verified: hr_review_evaluator_test_cb8dfabf4a468273 is absent from sys.databases.",
    "Cleanup verified: hr_p8b_positions_test_f6b588c81ad3d404 is absent from sys.databases.",
    "Cleanup verified: hr_meet_calls_test_8ed15eec88df6144 is absent from sys.databases.",
    "tests 16",
    "suites 0",
    "pass 16",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 37123.9969"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_d73c8dad6a658507\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F00\",\"baseline\":\"cfd56bd4\",\"items\":2,\"snapshotAndHashEqual\":true,\"breakdownAndSlipEqual\":true}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F01\",\"approval\":409,\"code\":\"PAYRUN-MISSING-PUNCH-STALE\",\"pendingCorrection\":5,\"deduction\":75}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F02\",\"before\":93.75,\"estimated\":\"93.75\",\"after\":0,\"actualDropped\":93.75}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F06\",\"request\":201,\"requestState\":\"UNDER_REVIEW\",\"approval\":201,\"runState\":\"APPROVED\",\"deduction\":75}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_d73c8dad6a658507\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_cb8dfabf4a468273\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-R01-transfer\",\"status\":200}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-R01\",\"status\":404,\"branch\":2,\"hrBranch\":1,\"manager\":1,\"chosen\":3}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-R02\",\"transferWaited\":true,\"evaluator\":200,\"transfer\":200}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_cb8dfabf4a468273\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_p8b_positions_test_f6b588c81ad3d404\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-J01\",\"original\":404,\"alternate\":400}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_p8b_positions_test_f6b588c81ad3d404\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_meet_calls_test_8ed15eec88df6144\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-M01\",\"ended\":true,\"status\":410,\"noToken\":true,\"freshStatus\":410}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-M02\",\"ended\":true,\"status\":410,\"noToken\":true,\"freshStatus\":410}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-M03\",\"removed\":200,\"fresh\":403,\"oldSignatureValid\":true,\"remainingSeconds\":600,\"canSubscribe\":true,\"realMediaTested\":false}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-M04\",\"ended\":true,\"oldSignatureValid\":true,\"remainingSeconds\":600,\"realMediaTested\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_meet_calls_test_8ed15eec88df6144\"}\n"
  ]
}
