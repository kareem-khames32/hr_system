module.exports = {
  "selected": [
    "codex-review-round12-money"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 1,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 10914.5834
  },
  "results": [
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 custom EOS uses full seven-year benefit and six salary components with literal cent expectations",
      "ms": 6528.8281,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 factor edits require recalculation before approval; disabled used reasons and settled money stay stable",
      "ms": 827.6107,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 concurrent revision edits have one winner and deleted codes are not reused",
      "ms": 120.3022,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 open-versus-delete race cannot leave an offboarding case with a removed reason",
      "ms": 76.7488,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 unknown inherited object key must fail closed and preserve previously generated EOS",
      "ms": 165.9892,
      "pass": false,
      "error": "Every nonconfigured code must be rejected, including Object.prototype property names\n\n201 !== 409\n",
      "cause": "Every nonconfigured code must be rejected, including Object.prototype property names\n\n201 !== 409\n",
      "stack": "AssertionError [ERR_ASSERTION]: Every nonconfigured code must be rejected, including Object.prototype property names\n\n201 !== 409\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round12-money.integration.cjs:90:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 unknown inherited object key must fail closed and preserve previously generated EOS",
      "ms": 165.9892,
      "pass": false,
      "error": "Every nonconfigured code must be rejected, including Object.prototype property names\n\n201 !== 409\n",
      "cause": "Every nonconfigured code must be rejected, including Object.prototype property names\n\n201 !== 409\n",
      "stack": "AssertionError [ERR_ASSERTION]: Every nonconfigured code must be rejected, including Object.prototype property names\n\n201 !== 409\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round12-money.integration.cjs:90:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 4",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10914.5834"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r12money_test_897fde664cd2e3dd\"}\n",
    "CR12_EVIDENCE {\"case\":\"manual-seven-year-EOS\",\"gross\":12000.03,\"excludedPressure\":9999,\"months\":4.5,\"full\":54000.13,\"oneThird\":18000.04,\"builtinAndDefaultAmounts\":{\"resignation\":36000.08,\"termination\":54000.13,\"dismissal\":0,\"contract_end\":54000.13,\"retirement\":54000.13,\"death\":54000.13,\"disability\":54000.13,\"force_majeure\":54000.13,\"absence\":0}}\n",
    "CR12_EVIDENCE {\"case\":\"EOS-recalc-approval-freeze\",\"before\":18000.04,\"staleApproval\":409,\"recalculated\":27000.06,\"repeatedEOSCount\":1,\"finalStatus\":\"CLOSED\",\"approvedLinesUnchanged\":true,\"usedReasonDelete\":409}\n",
    "CR12_EVIDENCE {\"case\":\"concurrent-reason-edit\",\"statuses\":[200,409],\"deletedCode\":\"custom_2\",\"newCode\":\"custom_3\"}\n",
    "CR12_EVIDENCE {\"case\":\"open-versus-delete\",\"statuses\":[400,200],\"cases\":0,\"reasonRemains\":false}\n",
    "CR12_EVIDENCE {\"case\":\"unknown-prototype-key\",\"ordinaryUnknown\":409,\"constructorStatus\":201,\"EOSBefore\":54000.13,\"EOSAfter\":[],\"normalCreateBlocked\":true,\"requiresCorruptStoredCode\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r12money_test_897fde664cd2e3dd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r12money_test_897fde664cd2e3dd\"}\n"
  ]
}
