module.exports = {
  "selected": [
    "codex-review-round10-login"
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
    "duration_ms": 8290.2581
  },
  "results": [
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 login handlers preserve password, remembered session and forced password-change redirect",
      "ms": 80.9536,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 login handlers preserve domain switching and clear the old password",
      "ms": 66.571,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 two-factor handlers withhold the session, filter the code, recover from a wrong code and allow resend then verification",
      "ms": 49.8368,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 change-password handlers validate confirmation and retain session persistence after success",
      "ms": 24.1476,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-login.integration.cjs",
      "name": "CR10 expired session during password change clears it and returns to expired-login state",
      "ms": 19.2959,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8290.2581"
  ],
  "stdout": []
}
