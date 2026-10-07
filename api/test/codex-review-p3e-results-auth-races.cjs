module.exports = {
  "selected": [
    "codex-review-p3e-auth-races",
    "document-expiry"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 11,
      "failed": 3,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 11,
      "suites": 0
    },
    "duration_ms": 11419.5224
  },
  "results": [
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 5465.0722,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 602.9285,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-direct: reset cannot pass a concurrent privilege promotion through direct",
      "ms": 406.1309,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-mail-1: activation while email verification is at factor check 1",
      "ms": 423.3313,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-mail-2: activation while email verification is at factor check 2",
      "ms": 446.5026,
      "pass": false,
      "error": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "cause": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "stack": "AssertionError [ERR_ASSERTION]: activation completed before the old email verification issued its session\n\n200 !== 401\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:52:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-disabled: a pending TOTP challenge is rejected after disable",
      "ms": 296.771,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-01: a document type carries its expiry settings; a type that expires makes the date required",
      "ms": 7065.9442,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-02: a document reaching an alert day raises one event, notifies its owner and opens one renewal task on the responsible role",
      "ms": 713.076,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-03: the expiring and expired report follows the branch scope, and renewing a document closes its renewal task",
      "ms": 166.5618,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-04: an approved renewal request moves the expiry date of the requester's document and closes its renewal task",
      "ms": 534.8004,
      "pass": true,
      "skip": false
    },
    {
      "file": "document-expiry.integration.cjs",
      "name": "DX-05 (CRP3D-N01): an alert for a document that a newer one already replaced is neither dispatched nor mailed",
      "ms": 195.5888,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-role: reset cannot pass a concurrent privilege promotion through role",
      "ms": 5465.0722,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-override: reset cannot pass a concurrent privilege promotion through override",
      "ms": 602.9285,
      "pass": false,
      "error": "promotion must invalidate the earlier reset judgement",
      "cause": "promotion must invalidate the earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: promotion must invalidate the earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:34:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3e-auth-races.integration.cjs",
      "name": "P3E-R-mail-2: activation while email verification is at factor check 2",
      "ms": 446.5026,
      "pass": false,
      "error": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "cause": "activation completed before the old email verification issued its session\n\n200 !== 401\n",
      "stack": "AssertionError [ERR_ASSERTION]: activation completed before the old email verification issued its session\n\n200 !== 401\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3e-auth-races.integration.cjs:52:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_document_expiry_test_5e8afc39b097c6c0",
    "tests 11",
    "suites 0",
    "pass 8",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11419.5224"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3e_auth_races_test_744194a22aa18104\"}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-role\",\"currentDecision\":403,\"racingReset\":200,\"enabledAfter\":false,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-override\",\"currentDecision\":403,\"racingReset\":200,\"enabledAfter\":false,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"reset-promotion-direct\",\"currentDecision\":403,\"racingReset\":409,\"enabledAfter\":true,\"versionChanged\":true}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":1,\"activation\":200,\"verification\":401,\"fullSession\":null}\n",
    "REVIEW_MEASURE {\"case\":\"email-activation-race\",\"factorCheck\":2,\"activation\":200,\"verification\":200,\"fullSession\":200}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3e_auth_races_test_744194a22aa18104\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3e_auth_races_test_744194a22aa18104\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_document_expiry_test_5e8afc39b097c6c0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_document_expiry_test_5e8afc39b097c6c0\"}\n"
  ]
}
