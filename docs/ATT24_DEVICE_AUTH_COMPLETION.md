# ATT-24 — ZKTeco TCP Comm Key

Date: 2026-09-11. Scope: pre-payroll device synchronization only. Original database, installed `node_modules`, and real devices were not modified or contacted.

## Result

**IMPLEMENTED_AND_VERIFIED — software and loopback integration.** An actual hardware acceptance run remains to confirm the customer's particular terminal model/firmware and network. This is no longer an unimplemented authentication path.

The installed `node-zklib` 1.3.0 constructor has no Comm Key parameter. Its TCP `connect()` accepts a response without checking for `ACK_UNAUTH`, and does not send `CMD_AUTH`. The local adapter fixes this transport and continues using the installed library's 40-byte attendance-record decoder. It does not patch the package or depend on undocumented mutation of its instances.

## Implementation

- `api/src/attendance/zk-tcp-adapter.ts`: `CMD_CONNECT` negotiates the session; `ACK_UNAUTH` requires a configured key and sends `CMD_AUTH` with the session-derived MakeKey value. Only `ACK_OK` authorizes record reads. An unprotected device continues to work without an AUTH command.
- TCP reads assemble complete frames using the magic and 32-bit little-endian length. They verify checksum, session and reply ID; support fragmented/coalesced replies and the PREPARE/DATA/ACK sequence for chunked reads. Events do not satisfy pending commands. Read buffers are capped at 64 MiB; chunks retain the upstream 65,472-byte size. A truncated record or missing final acknowledgment fails the pull before ingestion.
- Connect, command and whole-chunk deadlines are eight seconds in production. Failed authentication/transport destroys the socket. Successful pulls use bounded best-effort EXIT and guaranteed cleanup. The adapter neither disables the terminal nor deletes attendance records, matching the prior synchronization behavior.
- `api/src/attendance/device-sync.service.ts`: explicitly selects the secret only for a scoped synchronization, passes it to the adapter, and removes it from the local device entity. Status persistence updates only sync fields. Errors use fixed safe messages; packet bodies, secrets and arbitrary error objects are not logged. Existing ingest and deduplication remain in use.
- `api/src/attendance/attendance.controller.ts`: both sync routes now pass the actor. Sync-one and sync-all enforce the actor's branch before network access. Scheduled internal synchronization retains access to configured active devices.
- `api/src/assets/catalogs.controller.ts`: validates one to six decimal digits, normalizes leading zeroes, treats zero as no password, and rejects negative/fractional/nondecimal/out-of-range keys. An omitted or blank key preserves the existing value; explicit null clears it. The normal entity column remains `select:false`. Replies expose `hasAuthKey` only, never `authKey`. Presence queries use SQL CASE/conditions without selecting the secret into response objects. Device-save errors do not expose SQL parameters.
- `src/app/attendance/devices/page.tsx`: password field in create/edit, masked saved-key indicator, blank-to-keep guidance and an explicit clear checkbox. It sends the same create/update contracts described above.

The existing database column is reused, so no migration is required. This change does not introduce a new secret-storage encryption scheme. Comm Key is the legacy terminal authentication mechanism; no TLS claim is made.

## Verification

Commands run successfully:

```text
node node_modules/typescript/bin/tsc -p api/tsconfig.json --noEmit --incremental false --pretty false
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
node --test api/test/zk-tcp-auth.test.cjs
node --test api/test/device-auth.integration.cjs
```

`zk-tcp-auth.test.cjs`: **22/22 passed**. A real `net.Server` on `127.0.0.1` validates client packets with its own encoder/checksum. Tests cover published checksum vectors, independently calculated MakeKey vectors, numeric limits, secret serialization, fragmented authentication, open devices, 1,800 decoded records across two chunks, wrong/missing/rejected keys, corrupt checksums, incorrect session/reply IDs, timeout/early close, truncated records, absent final ACK and bounded disconnect. The fixture's expected AUTH token for key 123456/session 17767 is fixed; it does not derive expected tokens with the adapter under test.

`device-auth.integration.cjs`: **4/4 passed** against a random isolated SQL Server database and real HTTP endpoints. Tests verify catalog validation, secret exclusion on create/update/list, keep/replace/clear persistence, authenticated synchronization into actual attendance ingestion, deduplication on a second pull, safe persisted failure/log output, and branch denial before opening a socket. The test database is removed on completion; it is never the configured database.

The frontend passed TypeScript; no claim of a browser screenshot or physical terminal test is made by this lane.

## Primary sources

1. Manufacturer: [ZKTeco G3 Pro User Manual, section 6.3, printed page 25](https://zkteco.eu/sites/default/files/content/downloads/g3-pro-user-manual-v1.0-20200218.pdf). Documents matching PC/device Comm Key, default zero for no password and the range 0–999999. Verified through the official-domain indexed document on 2026-09-11.
2. Package upstream: [node-zklib TCP implementation](https://github.com/caobo171/node-zklib/blob/master/zklibtcp.js), compared with installed version 1.3.0. This is the source of the existing decoder and the confirmed missing authentication handling.
3. Authentication implementation source: [pyzk MakeKey and connect sequence](https://github.com/fananimi/pyzk/blob/master/zk/base.py). Used to implement the legacy session-derived authentication algorithm. This is upstream implementation evidence, not manufacturer certification.
4. Protocol research source: [ZK packet structure/checksum/session/reply](https://github.com/adrobinoga/zk-protocol/blob/master/protocol.md) and [bulk exchange sequence](https://github.com/adrobinoga/zk-protocol/blob/master/sections/ex_data.md). The checksum examples and shared reply ID of PREPARE/DATA/ACK anchor the independent fixture.

Acceptance boundary: classic ZKTeco TCP pull protocol with the existing 40-byte record layout, not every ZKTeco product family, UDP/RS485, PUSH/ADMS or an undocumented newer encrypted protocol. A customer-designated test terminal can verify physical compatibility without broadening this software implementation task.
