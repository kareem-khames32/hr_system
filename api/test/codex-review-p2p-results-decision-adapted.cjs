module.exports = {
  "selected": [
    "codex-review-p2p-decision-race"
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
    "duration_ms": 14544.8969
  },
  "results": [
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 11565.5372,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 77.2829,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 89.7091,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 71.1939,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 68.6659,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 67.1962,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 40.2081,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 38.1524,
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
    "duration_ms 14544.8969"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2p_decision_race_test_ce2c30ac9f6e7fe6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2p_decision_race_test_ce2c30ac9f6e7fe6\"}\n"
  ]
}
