module.exports = {
  "selected": [
    "codex-review-p4b-tax",
    "codex-review-p4b-tiers-race",
    "codex-review-p4b-export"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 3,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 25500.8963
  },
  "results": [
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
      "ms": 7888.6739,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'CALCULATOR_UNVERIFIED'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'CALCULATOR_UNVERIFIED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'CALCULATOR_UNVERIFIED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:129:42)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation",
      "ms": 1407.1404,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'egTax')",
      "cause": "Cannot read properties of undefined (reading 'egTax')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'egTax')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:140:93)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F03: missing source IDs in a legacy snapshot force recalculation",
      "ms": 573.5621,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'egTax')",
      "cause": "Cannot read properties of undefined (reading 'egTax')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'egTax')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:155:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p4b-tiers-race.integration.cjs",
      "name": "P4B-L01: stale employee tier facts survive employee lock and inflate historic row and carry",
      "ms": 10495.8992,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-export.integration.cjs",
      "name": "P4B-D01: canonical confidential request and requestId-linked rows stay out",
      "ms": 9104.2112,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-export.integration.cjs",
      "name": "P4B-D02: export holds employee scope until final read, so a branch transfer waits",
      "ms": 863.6738,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
      "ms": 7888.6739,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'CALCULATOR_UNVERIFIED'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'CALCULATOR_UNVERIFIED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'CALCULATOR_UNVERIFIED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:129:42)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation",
      "ms": 1407.1404,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'egTax')",
      "cause": "Cannot read properties of undefined (reading 'egTax')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'egTax')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:140:93)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F03: missing source IDs in a legacy snapshot force recalculation",
      "ms": 573.5621,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'egTax')",
      "cause": "Cannot read properties of undefined (reading 'egTax')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'egTax')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:155:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_payroll_statutory_test_bddc2a6712e3344f is absent from sys.databases.",
    "{\"currentCountry\":\"SA\",\"staleHistoricEntitlement\":15,\"referenceEntitlement\":15,\"carry\":15,\"referenceCarry\":15}",
    "Cleanup verified: hr_leave_tiers_test_fa5cee571c6b575f is absent from sys.databases.",
    "{\"confidentialRequestOmitted\":true}",
    "{\"transferWaited\":true,\"exportBranch\":1,\"nextRead\":404}",
    "Cleanup verified: hr_employee_privacy_test_131fd8ae1fca86a2 is absent from sys.databases.",
    "tests 6",
    "suites 0",
    "pass 3",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 25500.8963"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_bddc2a6712e3344f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_bddc2a6712e3344f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_fa5cee571c6b575f\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_fa5cee571c6b575f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_131fd8ae1fca86a2\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_131fd8ae1fca86a2\"}\n"
  ]
}
