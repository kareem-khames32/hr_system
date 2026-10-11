module.exports = {
  "target": "92f7427946905cd7a4034fdc5d758a7f5d346223",
  "typecheck": [
    {
      "command": "api/node_modules/.bin/tsc.cmd --noEmit --incremental false -p api/tsconfig.json",
      "exitCode": 0
    },
    {
      "command": "node_modules/.bin/tsc.cmd --noEmit --incremental false -p tsconfig.json",
      "exitCode": 0
    }
  ],
  "review": {
    "B01": "Closed: new audiences bypass cached subjects; dependency and enabled catalog checks recurse into the same fresh subject path; transaction-bound reader retains its EntityManager.",
    "B08": "Open: a real blocked NotificationDelivery skip update occurs after reading event rules and before calling mail.send. Admin disables the previously open event successfully during the wait; the event is then sent.",
    "boundary": "Final event authorization must not precede another asynchronous DB wait before mail submission; already submitted mail is not expected to be recalled."
  },
  "evidenceRuns": [
    "closures",
    "module-extended",
    "digest-extended",
    "regression"
  ],
  "limitations": [
    "No full project test suite",
    "No browser",
    "No product mutation",
    "Fake mail and WhatsApp only"
  ]
}
