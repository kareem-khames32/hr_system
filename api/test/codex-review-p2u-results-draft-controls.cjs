module.exports = {
  "selected": [
    "codex-review-p2u-draft-controls"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 8833.5681
  },
  "results": [
    {
      "file": "codex-review-p2u-draft-controls.integration.cjs",
      "name": "P2U draft cannot use an unsupported edit route, resubmission or caller-supplied bypass flags to evade first-submission audience",
      "ms": 5826.2672,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2u-draft-controls.integration.cjs",
      "name": "P2U real returned request continues after loss of audience while another never-submitted draft is denied",
      "ms": 236.4585,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8833.5681"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2u_draft_controls_test_031357b104e4363c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2u_draft_controls_test_031357b104e4363c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2u_draft_controls_test_031357b104e4363c\"}\n"
  ]
}
