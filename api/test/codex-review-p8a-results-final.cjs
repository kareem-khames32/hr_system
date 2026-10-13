module.exports = {
  "selected": [
    "codex-review-p8a-payroll",
    "codex-review-p8a-evaluator",
    "codex-review-p8a-position-gate",
    "codex-review-p8a-meeting-races"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 10,
      "failed": 0,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 53688.2811
  },
  "results": [
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F00: off payroll calculation, policy fingerprint and slip match approved baseline",
      "ms": 20216.4397,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F01: late pending correction versus final payroll approval",
      "ms": 1464.6608,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F02: exemption preview omits missing-punch amount that execution later drops",
      "ms": 1192.0837,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F03: global lateness waiver also removes missing punch with exact slip sum",
      "ms": 1018.0177,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F04: missing punch respects the net floor and exact payslip cents",
      "ms": 839.9469,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F05: enabled penalty does not waive an unrelated attendance review reason",
      "ms": 918.6102,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-evaluator.integration.cjs",
      "name": "P8A-R01: employee transferred after scope judgment before evaluator write",
      "ms": 17933.6586,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-position-gate.integration.cjs",
      "name": "P8A-J01: vacancy route bypasses recruitment module audience",
      "ms": 18202.4026,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-meeting-races.integration.cjs",
      "name": "P8A-M01: call closed before token issuance still yields a signed join grant",
      "ms": 18495.7638,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-meeting-races.integration.cjs",
      "name": "P8A-M02: meeting ended before token issuance still yields a signed join grant",
      "ms": 129.76,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_7ba8c245a3207da3 is absent from sys.databases.",
    "Cleanup verified: hr_review_evaluator_test_5469c20e1dcd645b is absent from sys.databases.",
    "Cleanup verified: hr_p8a_positions_test_8cd2feab96254ab8 is absent from sys.databases.",
    "Cleanup verified: hr_meet_calls_test_3d22d10b07177174 is absent from sys.databases.",
    "tests 10",
    "suites 0",
    "pass 10",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 53688.2811"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_7ba8c245a3207da3\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F00\",\"baseline\":\"cfd56bd4\",\"items\":2,\"snapshotAndHashEqual\":true,\"breakdownAndSlipEqual\":true}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F01\",\"approval\":201,\"pendingCorrection\":5,\"deduction\":75}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F02\",\"before\":93.75,\"estimated\":\"18.75\",\"after\":0,\"actualDropped\":93.75}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_7ba8c245a3207da3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_5469c20e1dcd645b\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R01-transfer\",\"status\":200}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R01\",\"status\":200,\"branch\":2,\"hrBranch\":1,\"manager\":3,\"chosen\":3}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_5469c20e1dcd645b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_p8a_positions_test_8cd2feab96254ab8\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-J01\",\"original\":404,\"alternate\":201,\"jobId\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_p8a_positions_test_8cd2feab96254ab8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_meet_calls_test_3d22d10b07177174\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-M01\",\"ended\":true,\"status\":200,\"roomJoin\":true,\"ttl\":7200,\"freshStatus\":410}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-M02\",\"ended\":true,\"status\":200,\"roomJoin\":true,\"freshStatus\":410}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_meet_calls_test_3d22d10b07177174\"}\n"
  ]
}
