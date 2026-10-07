module.exports = {
  "target": "0f6f37ed6116d80f3f91de2440ffa8e4992bda1a",
  "trackedFilesUnchanged": 3683,
  "databasesAbsent": 14,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p3e_auth_races_test_744194a22aa18104",
    "hr_document_expiry_test_5e8afc39b097c6c0",
    "hr_codex_p3e_auth_test_d4df56e7bbe3ebd3",
    "hr_codex_p3e_data_test_1503b158af8a317a",
    "hr_codex_p3e_docs_test_fe2217425a409dbc",
    "hr_codex_p3e_auth_races_test_151e844620d6c246",
    "hr_codex_p3e_reports_test_26bca264af14cc98",
    "hr_totp_test_c7dc24d16168e93b",
    "hr_session_cookie_test_5f4c1b35b85f6700",
    "hr_user_sessions_test_aab8883df54e0126",
    "hr_2fa_race_test_a9c55c0b137eeda0",
    "hr_document_expiry_test_67ac09b63dc326af",
    "hr_team_dashboard_test_023b7f2bddd3c2c7",
    "hr_codex_p3e_reports_test_7f68c1c57cced1f9"
  ],
  "results": [
    {
      "file": "codex-review-p3e-results-auth-races.cjs",
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
      "failures": [
        {
          "name": "P3E-R-role: reset cannot pass a concurrent privilege promotion through role",
          "error": "promotion must invalidate the earlier reset judgement"
        },
        {
          "name": "P3E-R-override: reset cannot pass a concurrent privilege promotion through override",
          "error": "promotion must invalidate the earlier reset judgement"
        },
        {
          "name": "P3E-R-mail-2: activation while email verification is at factor check 2",
          "error": "activation completed before the old email verification issued its session\n\n200 !== 401\n"
        }
      ]
    },
    {
      "file": "codex-review-p3e-results-closure.cjs",
      "counts": {
        "tests": 9,
        "failed": 0,
        "passed": 9,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 9,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3e-results-final-races.cjs",
      "counts": {
        "tests": 9,
        "failed": 6,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 9,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3E-R-role: reset cannot pass a concurrent privilege promotion through role",
          "error": "promotion must invalidate the earlier reset judgement"
        },
        {
          "name": "P3E-R-override: reset cannot pass a concurrent privilege promotion through override",
          "error": "promotion must invalidate the earlier reset judgement"
        },
        {
          "name": "P3E-R-mail-2: activation while email verification is at factor check 2",
          "error": "activation completed before the old email verification issued its session\n\n200 !== 401\n"
        },
        {
          "name": "P3E-S-permission: final report identity rejects permission after real rendering",
          "error": "failed running before hook"
        },
        {
          "name": "P3E-S-disabled: final report identity rejects disabled after real rendering",
          "error": "failed running before hook"
        },
        {
          "name": "P3E-S-churn: final report identity rejects churn after real rendering",
          "error": "failed running before hook"
        }
      ]
    },
    {
      "file": "codex-review-p3e-results-regression.cjs",
      "counts": {
        "tests": 75,
        "failed": 5,
        "passed": 70,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 75,
        "suites": 0
      },
      "failures": [
        {
          "name": "DX-01: a document type carries its expiry settings; a type that expires makes the date required",
          "error": "failed running before hook"
        },
        {
          "name": "DX-02: a document reaching an alert day raises one event, notifies its owner and opens one renewal task on the responsible role",
          "error": "failed running before hook"
        },
        {
          "name": "DX-03: the expiring and expired report follows the branch scope, and renewing a document closes its renewal task",
          "error": "failed running before hook"
        },
        {
          "name": "DX-04: an approved renewal request moves the expiry date of the requester's document and closes its renewal task",
          "error": "failed running before hook"
        },
        {
          "name": "DX-05 (CRP3D-N01): an alert for a document that a newer one already replaced is neither dispatched nor mailed",
          "error": "failed running before hook"
        }
      ]
    },
    {
      "file": "codex-review-p3e-results-reports-final.cjs",
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
    }
  ]
}
