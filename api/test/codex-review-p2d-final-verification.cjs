module.exports = {
  "target": "f8d8c1bf447bc37587da0911ba4545966459f0a0",
  "trackedFilesUnchanged": 2718,
  "databasesAbsent": 13,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 7,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2d_independent_test_b412aca24ad00b7a",
    "hr_codex_p2d_independent_test_52eb48e5738dff1c",
    "hr_codex_p2d_live_locks_test_9d74b0b39f436c90",
    "hr_codex_p2d_script_test_b1e9b51a5b3c5352",
    "hr_payroll_live_test_11ddb5064f0b4f49",
    "hr_payroll_live_rcsi_test_2effc6f1a71a0f91",
    "hr_payroll_accrual_test_562e61fbb001b164",
    "hr_decimal_precision_test_d6b0d7fa46196d07",
    "hr_codex_p2d_office_edges_test_8374ff4936bf2f99",
    "hr_file_upload_test_6ec5133ed53210c9",
    "hr_codex_p2d_a_closure_test_07486effecf723ce",
    "hr_audit_log_test_9a1e40074195f55e",
    "hr_queue_outbox_test_fffa75b47886ec42"
  ],
  "results": [
    {
      "file": "codex-review-p2d-results-baseline-independent.cjs",
      "counts": {
        "tests": 7,
        "failed": 6,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2D independent regular OLE chains: 512/4096 sectors, physical permutation, exact last byte",
          "error": "Expected values to be strictly equal:\n\n'doc' !== null\n"
        },
        {
          "name": "P2D mini streams: chained data crosses root sectors, later link loss is refused",
          "error": "mini chain cut at 65\n\n'doc' !== null\n"
        },
        {
          "name": "P2D declared classification limit: root signature required; remaining body is not a document validator",
          "error": "Expected values to be strictly equal:\n\n'doc' !== null\n"
        },
        {
          "name": "P2D XML metadata: namespace aliases and character references cannot hide duplicate definitions",
          "error": "Expected values to be strictly equal:\n\n'docx' !== null\n"
        },
        {
          "name": "P2D OOXML main type is relationship plus namespace, independent of path and compression",
          "error": "Expected values to be strictly equal:\n\n'docx' !== null\n"
        },
        {
          "name": "P2D ZIP missing main bytes and encrypted main parts cannot upload as Office",
          "error": "Expected values to be strictly equal:\n\n'docx' !== null\n"
        }
      ]
    },
    {
      "file": "codex-review-p2d-results-independent.cjs",
      "counts": {
        "tests": 7,
        "failed": 0,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2d-results-notes.cjs",
      "counts": {
        "tests": 29,
        "failed": 0,
        "passed": 29,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 29,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2d-results-office-closure.cjs",
      "counts": {
        "tests": 40,
        "failed": 0,
        "passed": 40,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 40,
        "suites": 0
      },
      "failures": []
    }
  ]
}
