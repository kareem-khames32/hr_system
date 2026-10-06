module.exports = {
  "selected": [
    "codex-review-p2n-independent"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 5,
      "failed": 0,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 9650.4702
  },
  "results": [
    {
      "file": "codex-review-p2n-independent.integration.cjs",
      "name": "P2N identity: supported rebind and deactivation reject old sessions; current branch readers and owner remain correctly separated",
      "ms": 6384.7088,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2n-independent.integration.cjs",
      "name": "P2N concurrency: acknowledgement versus cancellation and two cancellations leave one consistent document/task outcome",
      "ms": 168.3917,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2n-independent.integration.cjs",
      "name": "P2N rollback: a task-link failure rolls back issuing, stored-file rows and actual bytes; task-close failure rolls back evidence",
      "ms": 111.3912,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2n-independent.integration.cjs",
      "name": "P2N issuance: transfer committed while issuing waits must reject the old branch without a document or task",
      "ms": 65.2499,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2n-independent.integration.cjs",
      "name": "P2N mail: immediate and digest delivery revalidate acknowledgement/cancellation; active control sends only through the instance mock",
      "ms": 460.7211,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"ack-cancel-consistency\",\"responses\":[404,201],\"twoCancels\":[400,201]}",
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9650.4702"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2n_independent_test_bccc802a39983d2e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2n_independent_test_bccc802a39983d2e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2n_independent_test_bccc802a39983d2e\"}\n"
  ]
}
