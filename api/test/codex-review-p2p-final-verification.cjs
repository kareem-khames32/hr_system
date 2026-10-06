module.exports = {
  "target": "9236c5cd2c04a022924e5d51201c3a056b03a132",
  "trackedFilesUnchanged": 3092,
  "databasesAbsent": 18,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 14,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2p_boundaries_test_489e91d8ac3dca77",
    "hr_codex_p2p_boundaries_test_4c5a725229582528",
    "hr_codex_p2p_boundaries_test_8e36732c065c2830",
    "hr_codex_p2p_concurrency_test_da033ba0a8f67277",
    "hr_comments_test_ff355a62859f3b56",
    "hr_comments_migration_test_773b9a1f83b0c04f",
    "hr_codex_p2p_decision_race_test_ce2c30ac9f6e7fe6",
    "hr_codex_p2p_independent_test_6548f28b0e1ec08a",
    "hr_codex_p2p_concurrency_test_5f58d3797d8fb1e4",
    "hr_codex_p2p_independent_test_396a02bc5937c46c",
    "hr_notifications_test_9d7dbdc7acd1e807",
    "hr_notify_migration_test_c89b0500650057a9",
    "hr_tasks_test_bd94d15b913a98cf",
    "hr_reqexec_test_d46359e01f46638b",
    "hr_delegation_test_2321e09ffa212a48",
    "hr_policies_test_ecfcd3b83964e1a7",
    "hr_docack_test_30afa0e14ee6026b",
    "hr_recovery_test_9fe34c335e99d58b"
  ],
  "results": [
    {
      "file": "codex-review-p2p-results-boundaries-final.cjs",
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
          "error": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n"
        },
        {
          "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
          "error": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2p-results-boundaries-final2.cjs",
      "counts": {
        "tests": 39,
        "failed": 3,
        "passed": 36,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 39,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
          "error": "A bound internal attachment must be hidden just like its comment, even from an account that uploaded it before rebinding\n\n200 !== 404\n"
        },
        {
          "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
          "error": "An opaque generic alert must not retain the ID of a request the current account identity cannot see\n\ntrue !== false\n"
        },
        {
          "name": "P2P request made on behalf: unlinking its owner account must not reveal internal comments to that same account",
          "error": "The same account must not gain the internal side of its own existing request by losing its employee binding\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2p-results-boundaries.cjs",
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
          "error": "PATCH /users/8: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب 71b1a4bf-574e-4b1d-aa47-bcce06b6bfb6@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}"
        },
        {
          "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
          "error": "GET /portal/notifications: 404 {\"message\":\"Cannot GET /api/portal/notifications\",\"error\":\"Not Found\",\"statusCode\":404}"
        }
      ]
    },
    {
      "file": "codex-review-p2p-results-concurrency-rcsi.cjs",
      "counts": {
        "tests": 3,
        "failed": 0,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2p-results-core.cjs",
      "counts": {
        "tests": 12,
        "failed": 0,
        "passed": 12,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 12,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2p-results-decision-adapted.cjs",
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
      "failures": []
    },
    {
      "file": "codex-review-p2p-results-independent-final.cjs",
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
      "file": "codex-review-p2p-results-independent.cjs",
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
      "failures": [
        {
          "name": "P2P internal rows cannot alter public truncation, reply references or author identity after transfer",
          "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic Comment Employee 2'\n- 'Synthetic Comment Employee 5'\n                              ^\n"
        },
        {
          "name": "P2P all four comment endpoints and upload remain behind the policy acknowledgement gate",
          "error": "POST /policies/1/versions: 400 {\"message\":\"تاريخ السريان من النهارده أو بعده\",\"error\":\"Bad Request\",\"statusCode\":400}"
        }
      ]
    },
    {
      "file": "codex-review-p2p-results-regression.cjs",
      "counts": {
        "tests": 126,
        "failed": 8,
        "passed": 118,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 126,
        "suites": 0
      },
      "failures": [
        {
          "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
          "error": "failed running before hook"
        },
        {
          "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "failed running before hook"
        },
        {
          "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
          "error": "failed running before hook"
        },
        {
          "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "failed running before hook"
        },
        {
          "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
          "error": "failed running before hook"
        },
        {
          "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "failed running before hook"
        },
        {
          "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
          "error": "failed running before hook"
        },
        {
          "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
          "error": "failed running before hook"
        }
      ]
    }
  ]
}
