module.exports = {
  "selected": [
    "codex-review-p2l-independent"
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
    "duration_ms": 7827.7519
  },
  "results": [
    {
      "file": "codex-review-p2l-independent.integration.cjs",
      "name": "P2L bootstrap read failure must not open an overdue account after SQL recovers",
      "ms": 4767.9897,
      "pass": false,
      "error": "A failed bootstrap probe cannot mean no mandatory policies\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n",
      "cause": "A failed bootstrap probe cannot mean no mandatory policies\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A failed bootstrap probe cannot mean no mandatory policies\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2l-independent.integration.cjs:31:48)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2l-independent.integration.cjs",
      "name": "P2L clear cache must not cross account relinking and a new token version",
      "ms": 174.4427,
      "pass": false,
      "error": "The clear result belonged to another employee and session\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n",
      "cause": "The clear result belonged to another employee and session\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The clear result belonged to another employee and session\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2l-independent.integration.cjs:45:51)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2l-independent.integration.cjs",
      "name": "P2L branch views follow current audience; foreign identities and policy events stay hidden",
      "ms": 200.2897,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2l-independent.integration.cjs",
      "name": "P2L acknowledgement is self only, unique, preserves evidence and opens gate; material publication re-closes it",
      "ms": 216.4874,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2l-independent.integration.cjs",
      "name": "P2L bootstrap read failure must not open an overdue account after SQL recovers",
      "ms": 4767.9897,
      "pass": false,
      "error": "A failed bootstrap probe cannot mean no mandatory policies\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n",
      "cause": "A failed bootstrap probe cannot mean no mandatory policies\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A failed bootstrap probe cannot mean no mandatory policies\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2l-independent.integration.cjs:31:48)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2l-independent.integration.cjs",
      "name": "P2L clear cache must not cross account relinking and a new token version",
      "ms": 174.4427,
      "pass": false,
      "error": "The clear result belonged to another employee and session\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n",
      "cause": "The clear result belonged to another employee and session\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: The clear result belonged to another employee and session\n+ actual - expected\n\n+ undefined\n- 'POLICY_ACK_REQUIRED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2l-independent.integration.cjs:45:51)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"bootstrap-fail-open\",\"faultInjected\":true,\"pendingBlocked\":true,\"protectedStatus\":200,\"code\":null}",
    "{\"case\":\"identity-cache\",\"previousEmployeeId\":4,\"currentEmployeeId\":3,\"tokenVersionChanged\":true,\"pendingBlocked\":true,\"protectedStatus\":200,\"code\":null}",
    "{\"case\":\"branch-views\",\"listHidden\":true,\"detailReportContentUniform404\":true,\"auditHidden\":true,\"companyPreserved\":true}",
    "{\"case\":\"proof-control\",\"duplicates\":1,\"selfOnly\":true,\"hash\":true,\"device\":true,\"newMaterialReblocks\":true,\"oldEvidenceUnchanged\":true}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7827.7519"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2l_independent_test_add4db26f525d1f1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2l_independent_test_add4db26f525d1f1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2l_independent_test_add4db26f525d1f1\"}\n"
  ]
}
