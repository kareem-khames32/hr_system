module.exports = {
  "target": "cfd56bd4bfd89103b1fa109c7e81b803b973a0ce",
  "productFiles": [
    "api/src/notifications/notifications.service.ts",
    "api/src/notifications/channels/notification-channels.service.ts"
  ],
  "lines": {
    "api/src/notifications/notifications.service.ts": [
      {
        "line": 966,
        "source": "const closed = await this.channels.emailClosedAmong(kept.map(item => item.eventCode))"
      },
      {
        "line": 972,
        "source": "if (!items.length) { await skipDropped(); continue }"
      },
      {
        "line": 978,
        "source": "try { await this.mail.send({ to: address, subject: `ملخص إشعاراتك (${items.length})`, text }) } catch (error) { failure = error }"
      },
      {
        "line": 979,
        "source": "await skipDropped()"
      }
    ],
    "api/src/notifications/channels/notification-channels.service.ts": [
      {
        "line": 146,
        "source": "async emailClosedAmong(codes: readonly string[]): Promise<Set<string>> {"
      }
    ]
  },
  "typescript": {
    "command": "node node_modules/typescript/bin/tsc --noEmit --incremental false",
    "cwd": "api",
    "exitCode": 0
  },
  "scope": "CRP7C only; no frontend changes"
}
