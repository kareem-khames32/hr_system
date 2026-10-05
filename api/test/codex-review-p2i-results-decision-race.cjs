module.exports = {
  "selected": [
    "codex-review-p2i-decision-race"
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
    "duration_ms": 9034.3734
  },
  "results": [
    {
      "file": "codex-review-p2i-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 6178.521,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 91.8305,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 74.8645,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 65.8965,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 69.5921,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 66.9018,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 36.3546,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 35.4906,
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
    "duration_ms 9034.3734"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2i_decision_race_test_855b161a9902af6b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2i_decision_race_test_855b161a9902af6b\"}\n"
  ]
}
