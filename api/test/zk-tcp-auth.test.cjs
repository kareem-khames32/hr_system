const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true })
const { ZkTcpAdapter, makeCommKey, zkChecksum, zkFrame, commKeyNumber } = require('../src/attendance/zk-tcp-adapter')
const { terminal, attendanceData, checksum } = require('./fixtures/zk-terminal.cjs')

test('ATT24 primary protocol checksum examples and MakeKey vectors', () => {
  // Examples published in adrobinoga/zk-protocol/protocol.md (odd/even packet lengths).
  for (const hex of ['0b005a17f38d03005a4b4661636556657273696f6e00', 'd007296af38d0a0009']) {
    assert.equal(zkChecksum(Buffer.from(hex, 'hex')), 0)
  }
  for (const [key, session, hex] of [[0, 0, '617d3279'], [1, 1, '61fd3279'],
    [123456, 17767, '267f32bc'], [999999, 65534, '22813296'], [432198, 17767, '781f32dc']]) {
    assert.equal(makeCommKey(key, session).toString('hex'), hex)
  }
  const packet = zkFrame(1102, 17767, 1, makeCommKey(123456, 17767))
  assert.equal(checksum(packet.subarray(8)), 0, 'independent checksum matches wire packet')
  assert.equal(packet.readUInt32LE(4), 12)
})

test('ATT24 Comm Key accepts 0..999999 only and never exposes invalid input', () => {
  for (const [value, expected] of [[null, 0], [undefined, 0], ['', 0], ['000001', 1], [0, 0], [999999, 999999]]) {
    assert.equal(commKeyNumber(value), expected)
  }
  for (const invalid of [-1, 1000000, 1.1, true, {}, 'password', '0x12', '12 3', '+123', '1e5', '0000001']) {
    assert.throws(() => commKeyNumber(invalid), { code: 'INVALID_KEY' })
  }
  assert.throws(() => new ZkTcpAdapter('127.0.0.1', 1, 'private-password'), (e) => {
    assert.ok(!JSON.stringify(e).includes('private-password')); assert.ok(!e.message.includes('private-password')); return true
  })
})

test('ATT24 TCP authentication succeeds with fragmented frames; existing node-zklib decoder reads local device times', async () => {
  const device = await terminal({ fragment: true })
  const zk = new ZkTcpAdapter('127.0.0.1', device.port, '123456', 300)
  try {
    assert.ok(!JSON.stringify(zk).includes('123456'))
    await zk.createSocket()
    const logs = await zk.getAttendances()
    assert.equal(logs.data.length, 1)
    assert.equal(logs.data[0].deviceUserId, '0001')
    const at = logs.data[0].recordTime
    assert.deepEqual([at.getFullYear(), at.getMonth() + 1, at.getDate(), at.getHours(), at.getMinutes(), at.getSeconds()], [2026, 9, 1, 8, 15, 30])
    await zk.disconnect(); await zk.disconnect()
    assert.deepEqual(device.commands, [1000, 1102, 1502, 1503, 1502, 1001])
  } finally { await zk.disconnect(); await device.stop() }
})

test('ATT24 terminal that answers UNAUTH with Comm Key 0 connects by authenticating with key 0 (like pyzk)', async () => {
  // أجهزة الشركة الحقيقية (Comm Key = 0) بترد UNAUTH وبتستنى CMD_AUTH بالمفتاح 0
  const device = await terminal({ authHex: makeCommKey(0, 0x4567).toString('hex'), data: Buffer.alloc(0) })
  const zk = new ZkTcpAdapter('127.0.0.1', device.port, null, 300)
  try {
    await zk.createSocket()
    assert.deepEqual((await zk.getAttendances()).data, [])
    assert.ok(device.commands.includes(1102))
  } finally { await zk.disconnect(); await device.stop() }
})

test('ATT24 unprotected terminal remains compatible and never receives CMD_AUTH', async () => {
  const device = await terminal({ open: true, data: Buffer.alloc(0) })
  const zk = new ZkTcpAdapter('127.0.0.1', device.port, null, 300)
  try {
    await zk.createSocket()
    assert.deepEqual((await zk.getAttendances()).data, [])
    await zk.disconnect()
    assert.ok(!device.commands.includes(1102))
  } finally { await zk.disconnect(); await device.stop() }
})

test('ATT24 bulk transfer validates coalesced PREPARE/DATA/ACK frames and multiple 65472-byte chunks', async () => {
  const device = await terminal({ count: 1800, bulk: true, fragment: true })
  const zk = new ZkTcpAdapter('127.0.0.1', device.port, '123456', 300)
  try {
    await zk.createSocket()
    const logs = await zk.getAttendances()
    assert.equal(logs.data.length, 1800)
    assert.equal(logs.data[1799].deviceUserId, '1800')
    assert.deepEqual(device.reads, [[0, 65472], [65472, 6532]])
  } finally { await zk.disconnect(); await device.stop() }
})

for (const [name, options, key, code] of [
  ['missing key', {}, null, 'AUTH_REQUIRED'],
  ['wrong key', {}, '654321', 'AUTH_FAILED'],
  ['explicit device rejection', { reject: true }, '123456', 'AUTH_FAILED'],
  ['corrupt connect checksum', { corrupt: 'connect' }, '123456', 'PROTOCOL'],
  ['corrupt auth checksum', { corrupt: 'auth' }, '123456', 'PROTOCOL'],
  ['wrong negotiated session', { wrongSession: true }, '123456', 'PROTOCOL'],
  ['wrong auth reply id', { wrongReply: 'auth' }, '123456', 'PROTOCOL'],
  ['wrong connect reply id', { wrongReply: 'connect' }, '123456', 'PROTOCOL'],
  ['authentication timeout', { silent: 'auth' }, '123456', 'TIMEOUT'],
  ['connect response timeout', { silent: 'connect' }, '123456', 'TIMEOUT'],
  ['connection closed during auth', { close: 'auth' }, '123456', 'CONNECTION'],
]) test(`ATT24 ${name} stops before reading any data and closes the socket`, async () => {
  const device = await terminal(options)
  const zk = new ZkTcpAdapter('127.0.0.1', device.port, key, 150)
  try {
    await assert.rejects(zk.createSocket(), { code })
    assert.ok(!device.commands.includes(1503))
    await new Promise((resolve) => setTimeout(resolve, 10))
    assert.equal(device.closed, 1)
  } finally { await zk.disconnect(); await device.stop() }
})

for (const [name, options, code] of [
  ['truncated record', { data: attendanceData().subarray(0, 43) }, 'PROTOCOL'],
  ['corrupt attendance checksum', { corrupt: 'read' }, 'PROTOCOL'],
  ['corrupt chunk checksum', { bulk: true, corrupt: 'chunk' }, 'PROTOCOL'],
  ['missing final chunk ACK', { bulk: true, missingAck: true }, 'TIMEOUT'],
  ['read connection lost', { close: 'read' }, 'CONNECTION'],
]) test(`ATT24 ${name} rejects the whole pull instead of reporting partial success`, async () => {
  const device = await terminal(options)
  const zk = new ZkTcpAdapter('127.0.0.1', device.port, '123456', 150)
  try {
    await zk.createSocket()
    await assert.rejects(zk.getAttendances(), { code })
    await new Promise((resolve) => setTimeout(resolve, 10))
    assert.equal(device.closed, 1)
  } finally { await zk.disconnect(); await device.stop() }
})

test('ATT24 missing disconnect acknowledgement is bounded and closes the socket', async () => {
  const device = await terminal({ silent: 'exit' })
  const zk = new ZkTcpAdapter('127.0.0.1', device.port, '123456', 150)
  try {
    await zk.createSocket()
    const start = Date.now()
    await zk.disconnect()
    assert.ok(Date.now() - start < 1200)
    await new Promise((resolve) => setTimeout(resolve, 10))
    assert.equal(device.closed, 1)
  } finally { await zk.disconnect(); await device.stop() }
})
