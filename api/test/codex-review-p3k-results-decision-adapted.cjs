module.exports = {
  "selected": [
    "codex-review-p3k-decision"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 8,
      "failed": 0,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 10294.4339
  },
  "results": [
    {
      "file": "codex-review-p3k-decision.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 7257.2472,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-decision.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 75.3699,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-decision.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 76.2376,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-decision.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 70.1876,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-decision.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 63.0487,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-decision.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 56.4384,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-decision.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 37.6026,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-decision.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 40.0372,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 8",
    "suites 0",
    "pass 8",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10294.4339"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3k_decision_test_f5c1abe6adeef8ea\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3k_decision_test_f5c1abe6adeef8ea\"}\n"
  ]
}
