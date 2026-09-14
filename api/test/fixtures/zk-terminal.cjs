// Independent loopback TCP terminal fixture, not a mocked adapter. Its packet
// encoder/checksum do not call implementation helpers under test.
const net = require('node:net')
const assert = require('node:assert/strict')
function checksum(buffer) {
  let sum = 0
  for (let i = 0; i < buffer.length; i += 2) sum += buffer[i] + 256 * (buffer[i + 1] || 0)
  while (sum > 65535) sum = (sum & 65535) + Math.floor(sum / 65536)
  return 65535 - sum
}
function frame(command, session, reply, bytes = Buffer.alloc(0)) {
  const packet = Buffer.alloc(bytes.length + 16)
  packet.writeUInt32LE(0x7d825050)
  packet.writeUInt32LE(bytes.length + 8, 4)
  packet.writeUInt16LE(command, 8)
  packet.writeUInt16LE(session, 12)
  packet.writeUInt16LE(reply, 14)
  bytes.copy(packet, 16)
  packet.writeUInt16LE(checksum(packet.subarray(8)), 10)
  return packet
}
function attendanceData(count = 1) {
  const data = Buffer.alloc(4 + 40 * count)
  data.writeUInt32LE(40 * count)
  // 2026-09-01 08:15:30 local device time.
  const stamp = ((26 * 12 * 31 + 8 * 31) * 24 + 8) * 3600 + 15 * 60 + 30
  for (let i = 0; i < count; i++) {
    const start = 4 + i * 40
    data.writeUInt16LE(i + 1, start)
    data.write(String(i + 1).padStart(4, '0'), start + 2, 9, 'ascii')
    data.writeUInt32LE(stamp, start + 27)
  }
  return data
}
async function terminal(options = {}) {
  const sockets = new Set(), errors = [], commands = [], reads = []
  const session = 0x4567
  const data = options.data ?? attendanceData(options.count ?? 1)
  let connections = 0, closed = 0
  const server = net.createServer((socket) => {
    connections++; sockets.add(socket)
    socket.on('error', () => {})
    socket.on('close', () => { closed++; sockets.delete(socket) })
    let buffer = Buffer.alloc(0), authorized = options.open === true, expectedReply = 0
    const send = (packet, stage) => {
      if (options.silent === stage) return
      if (options.close === stage) { socket.destroy(); return }
      if (options.corrupt === stage) packet[10] ^= 1
      if (options.fragment) {
        socket.write(packet.subarray(0, 3))
        setTimeout(() => { if (!socket.destroyed) socket.write(packet.subarray(3, 11)) }, 2)
        setTimeout(() => { if (!socket.destroyed) socket.write(packet.subarray(11)) }, 4)
      } else socket.write(packet)
    }
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk])
      while (buffer.length >= 8 && buffer.length >= buffer.readUInt32LE(4) + 8) {
        const length = buffer.readUInt32LE(4), packet = buffer.subarray(0, length + 8)
        buffer = buffer.subarray(length + 8)
        try {
          assert.equal(packet.readUInt32LE(0), 0x7d825050)
          assert.equal(checksum(packet.subarray(8)), 0, 'client checksum')
          const command = packet.readUInt16LE(8), reply = packet.readUInt16LE(14)
          commands.push(command)
          assert.equal(reply, expectedReply, 'client reply sequence')
          expectedReply = (expectedReply + 1) % 65535
          assert.equal(packet.readUInt16LE(12), command === 1000 ? 0 : session, 'client session')
          if (command === 1000) {
            const response = frame(authorized ? 2000 : 2005, session,
              options.wrongReply === 'connect' ? reply + 1 : reply)
            send(response, 'connect')
          } else if (command === 1102) {
            // Fixed MakeKey vector: key=123456, negotiated session=0x4567.
            authorized = packet.subarray(16).equals(Buffer.from(options.authHex || '267f32bc', 'hex')) && !options.reject
            send(frame(authorized ? 2000 : 2005, options.wrongSession ? session + 1 : session,
              options.wrongReply === 'auth' ? reply + 1 : reply), 'auth')
          } else {
            assert.ok(authorized, 'no data commands before successful authentication')
            if (command === 1503) {
              assert.equal(packet.subarray(16).toString('hex'), '010d000000000000000000')
              if (options.bulk) {
                const stat = Buffer.alloc(13)
                stat.writeUInt32LE(data.length, 1); stat.writeUInt32LE(data.length, 5)
                send(frame(2000, session, reply, stat), 'read')
              } else send(frame(1501, session, reply, data), 'read')
            } else if (command === 1504) {
              const offset = packet.readUInt32LE(16), size = packet.readUInt32LE(20)
              reads.push([offset, size])
              assert.ok(size > 0 && size <= 0xffc0)
              assert.ok(offset + size <= data.length)
              const prep = Buffer.alloc(8)
              prep.writeUInt32LE(size); prep.writeUInt32LE(4096, 4)
              const mid = Math.floor(size / 2)
              const payload = data.subarray(offset, offset + size)
              const pieces = [frame(1500, session, reply, prep),
                frame(1501, session, reply, payload.subarray(0, mid)),
                frame(1501, session, reply, payload.subarray(mid))]
              if (!options.missingAck) pieces.push(frame(2000, session, reply))
              send(Buffer.concat(pieces), 'chunk')
            } else if ([1502, 1001].includes(command)) {
              send(frame(2000, session, reply), command === 1001 ? 'exit' : 'free')
            } else assert.fail('unexpected command: ' + command)
          }
        } catch (error) { errors.push(error); socket.destroy() }
      }
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { port: server.address().port, commands, reads, errors,
    get connections() { return connections }, get closed() { return closed },
    async stop() {
      for (const socket of sockets) socket.destroy()
      await new Promise((resolve) => server.close(resolve))
      assert.deepEqual(errors, [], 'terminal received valid client protocol packets')
    } }
}
module.exports = { terminal, attendanceData, frame, checksum }
