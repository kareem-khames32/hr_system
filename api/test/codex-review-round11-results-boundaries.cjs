module.exports = {
  "selected": [
    "codex-review-round11-boundaries"
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
    "duration_ms": 7523.2632
  },
  "results": [
    {
      "file": "codex-review-round11-boundaries.integration.cjs",
      "name": "CR11 six recorded managers in a cycle: reject without state change; repair and resubmit the same draft",
      "ms": 4603.4511,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round11-boundaries.integration.cjs",
      "name": "CR11 natural department and branch fallback loop: submit and complete both named approvals",
      "ms": 231.0107,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round11-boundaries.integration.cjs",
      "name": "CR11 fallback first two hops cannot hide a recorded return from the selected approver to the requester",
      "ms": 180.3659,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round11-boundaries.integration.cjs",
      "name": "CR11 recorded traversal stops at its actual end instead of following a department fallback back to the requester",
      "ms": 261.1869,
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
    "duration_ms 7523.2632"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r11boundaries_test_5f10552978a846dd\"}\n",
    "CR11_EVIDENCE {\"case\":\"six-person-cycle-and-repair\",\"rejected\":400,\"stateAfterRejection\":\"DRAFT\",\"resubmitted\":201,\"finalStatus\":\"COMPLETED\",\"approvalCount\":1}\n",
    "CR11_EVIDENCE {\"case\":\"natural-fallback-loop\",\"submission\":201,\"resolved\":[8,7],\"finalStatus\":\"COMPLETED\",\"approvalCount\":2}\n",
    "CR11_EVIDENCE {\"case\":\"fallback-then-recorded-return\",\"submission\":400,\"state\":\"DRAFT\",\"approvalCount\":0}\n",
    "CR11_EVIDENCE {\"case\":\"explicit-chain-with-unrelated-organizational-return\",\"submission\":201,\"finalStatus\":\"COMPLETED\",\"expectedApprover\":15}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r11boundaries_test_5f10552978a846dd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r11boundaries_test_5f10552978a846dd\"}\n"
  ]
}
