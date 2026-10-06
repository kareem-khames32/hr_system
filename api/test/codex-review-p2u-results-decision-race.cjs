module.exports = {
  "selected": [
    "codex-review-p2u-decision-race"
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
    "duration_ms": 8973.6148
  },
  "results": [
    {
      "file": "codex-review-p2u-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 6092.4769,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 82.7454,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 58.2399,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 70.8505,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 69.0982,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 71.96,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 50.9553,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 51.3367,
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
    "duration_ms 8973.6148"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_decision_race_test_e95f7e28faff21c6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_decision_race_test_e95f7e28faff21c6\"}\n"
  ]
}
