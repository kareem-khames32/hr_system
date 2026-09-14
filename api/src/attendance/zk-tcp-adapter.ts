import { Socket } from 'node:net'

// node-zklib 1.3.0 supplies the existing 40-byte attendance decoder. Its TCP
// transport does not implement CMD_AUTH and treats ACK_UNAUTH as connected.
// Keep the decoder; replace transport locally, never patch node_modules.
// Protocol/authentication sources and compatibility limits: docs/ATT24_DEVICE_AUTH_COMPLETION.md.
const { decodeRecordData40 } = require('node-zklib/utils')
const MAGIC = Buffer.from([0x50, 0x50, 0x82, 0x7d])
const CMD = { CONNECT: 1000, EXIT: 1001, AUTH: 1102, PREPARE: 1500, DATA: 1501,
  FREE: 1502, READ: 1503, CHUNK: 1504, OK: 2000, UNAUTH: 2005 } as const
const MAX_CHUNK = 0xffc0
const MAX_DATA = 64 * 1024 * 1024

export class ZkTcpError extends Error {
  constructor(public readonly code: 'AUTH_REQUIRED' | 'AUTH_FAILED' | 'INVALID_KEY' |
    'TIMEOUT' | 'CONNECTION' | 'PROTOCOL' | 'DEVICE_REJECTED') {
    super({ AUTH_REQUIRED: 'الجهاز يتطلب مفتاح اتصال — سجّله في إعدادات الجهاز',
      AUTH_FAILED: 'رفض الجهاز مفتاح الاتصال — تحقق من تطابقه مع Comm Key في الجهاز',
      INVALID_KEY: 'مفتاح الاتصال يجب أن يكون من 1 إلى 6 أرقام (0 بلا كلمة مرور)',
      TIMEOUT: 'انتهت مهلة استجابة جهاز البصمة', CONNECTION: 'انقطع الاتصال بجهاز البصمة أو تعذر الوصول إليه',
      PROTOCOL: 'رد جهاز البصمة غير صالح أو غير مكتمل', DEVICE_REJECTED: 'رفض جهاز البصمة أمر قراءة السجلات' }[code])
    this.name = 'ZkTcpError'
  }
}

export function commKeyNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0
  if (!['string', 'number'].includes(typeof value) || !/^\d{1,6}$/.test(String(value))) {
    throw new ZkTcpError('INVALID_KEY')
  }
  return Number(value)
}

// ZK MakeKey: reverse 32 bits, add negotiated session, XOR ZKSO, swap words,
// mix the 8-bit tick (50, as in pyzk). The plaintext key never goes on the wire.
export function makeCommKey(key: number, session: number): Buffer {
  commKeyNumber(key)
  let reversed = 0
  for (let bit = 0; bit < 32; bit++) reversed = ((reversed << 1) | ((key >>> bit) & 1)) >>> 0
  const raw = Buffer.alloc(4)
  raw.writeUInt32LE((reversed + session) >>> 0)
  const mixed = [raw[0] ^ 0x5a, raw[1] ^ 0x4b, raw[2] ^ 0x53, raw[3] ^ 0x4f]
  return Buffer.from([mixed[2] ^ 50, mixed[3] ^ 50, 50, mixed[1] ^ 50])
}

// Little-endian one's-complement checksum over the actual transmitted reply ID.
export function zkChecksum(bytes: Buffer): number {
  let sum = 0
  for (let i = 0; i < bytes.length; i += 2) {
    sum += bytes[i] | ((bytes[i + 1] ?? 0) << 8)
    sum = (sum & 0xffff) + (sum >>> 16)
  }
  return (~((sum & 0xffff) + (sum >>> 16))) & 0xffff
}

export function zkFrame(command: number, session: number, reply: number, data: Buffer = Buffer.alloc(0)): Buffer {
  const packet = Buffer.alloc(16 + data.length)
  MAGIC.copy(packet)
  packet.writeUInt32LE(8 + data.length, 4)
  packet.writeUInt16LE(command, 8)
  packet.writeUInt16LE(session, 12)
  packet.writeUInt16LE(reply, 14)
  data.copy(packet, 16)
  packet.writeUInt16LE(zkChecksum(packet.subarray(8)), 10)
  return packet
}

type Reply = { command: number; session: number; reply: number; data: Buffer }
type Waiter = { resolve: (packet: Reply) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }

export class ZkTcpAdapter {
  private socket?: Socket
  private buffered: Buffer = Buffer.alloc(0)
  private packets: Reply[] = []
  private waiter?: Waiter
  private failure?: ZkTcpError
  private session = 0
  private reply = 0
  private authenticated = false
  // ECMAScript private field avoids accidental serialization of the secret.
  #key: number

  constructor(private readonly ip: string, private readonly port: number, key: unknown,
    private readonly timeout = 8000) {
    this.#key = commKeyNumber(key)
  }

  async createSocket(): Promise<void> {
    if (this.socket) throw new ZkTcpError('PROTOCOL')
    const socket = this.socket = new Socket()
    socket.on('data', (chunk) => this.receive(chunk))
    socket.on('error', () => this.fail(new ZkTcpError('CONNECTION')))
    socket.on('close', () => this.fail(new ZkTcpError('CONNECTION')))
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => finish(new ZkTcpError('TIMEOUT')), this.timeout)
        const error = () => finish(new ZkTcpError('CONNECTION'))
        const connected = () => finish()
        const finish = (err?: Error) => {
          clearTimeout(timer)
          socket.removeListener('connect', connected)
          socket.removeListener('error', error)
          socket.removeListener('close', error)
          if (err) reject(err); else resolve()
        }
        socket.once('connect', connected)
        socket.once('error', error)
        socket.once('close', error)
        socket.connect(this.port, this.ip)
      })
      let reply = await this.command(CMD.CONNECT)
      this.session = reply.session
      if (reply.command === CMD.UNAUTH) {
        if (!this.#key) throw new ZkTcpError('AUTH_REQUIRED')
        reply = await this.command(CMD.AUTH, makeCommKey(this.#key, this.session))
        if (reply.command !== CMD.OK) throw new ZkTcpError('AUTH_FAILED')
      } else if (reply.command !== CMD.OK) throw new ZkTcpError('DEVICE_REJECTED')
      this.authenticated = true
    } catch (error) {
      await this.disconnect()
      throw error
    } finally {
      this.#key = 0
    }
  }

  private fail(error: ZkTcpError) {
    this.failure ??= error
    if (this.waiter) {
      clearTimeout(this.waiter.timer)
      this.waiter.reject(this.failure)
      this.waiter = undefined
    }
    this.socket?.destroy()
  }

  private receive(chunk: Buffer) {
    if (this.failure) return
    this.buffered = Buffer.concat([this.buffered, chunk])
    while (this.buffered.length >= 8) {
      const size = this.buffered.readUInt32LE(4)
      if (!this.buffered.subarray(0, 4).equals(MAGIC) || size < 8 || size > MAX_DATA + 8) {
        this.fail(new ZkTcpError('PROTOCOL')); return
      }
      if (this.buffered.length < size + 8) return
      const body = this.buffered.subarray(8, size + 8)
      this.buffered = this.buffered.subarray(size + 8)
      if (zkChecksum(body) !== 0) { this.fail(new ZkTcpError('PROTOCOL')); return }
      // Real-time events use the session field for an event code; this adapter
      // never subscribes to them, and they must not satisfy a pending command.
      if (body.readUInt16LE(0) === 500) continue
      const packet = { command: body.readUInt16LE(0), session: body.readUInt16LE(4),
        reply: body.readUInt16LE(6), data: Buffer.from(body.subarray(8)) }
      if (this.waiter) {
        const waiter = this.waiter
        this.waiter = undefined
        clearTimeout(waiter.timer)
        waiter.resolve(packet)
      } else if (this.packets.length < 128) this.packets.push(packet)
      else { this.fail(new ZkTcpError('PROTOCOL')); return }
    }
  }

  private async next(expectedReply: number, connecting = false, deadline = Date.now() + this.timeout): Promise<Reply> {
    if (this.failure) throw this.failure
    if (Date.now() >= deadline) {
      this.fail(new ZkTcpError('TIMEOUT'))
      throw this.failure
    }
    const packet = this.packets.shift() ?? await new Promise<Reply>((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new ZkTcpError('TIMEOUT')), deadline - Date.now())
      this.waiter = { resolve, reject, timer }
    })
    if (packet.reply !== expectedReply || (!connecting && packet.session !== this.session)) {
      this.fail(new ZkTcpError('PROTOCOL'))
      throw this.failure
    }
    return packet
  }

  private async command(command: number, data: Buffer = Buffer.alloc(0)): Promise<Reply> {
    if (this.failure) throw this.failure
    if (!this.socket || this.socket.destroyed) throw new ZkTcpError('CONNECTION')
    const reply = this.reply
    this.reply = (this.reply + 1) % 0xffff
    this.socket.write(zkFrame(command, this.session, reply, data))
    return this.next(reply, command === CMD.CONNECT)
  }

  private requireOk(reply: Reply) {
    if (reply.command !== CMD.OK) throw new ZkTcpError(reply.command === CMD.UNAUTH ? 'AUTH_FAILED' : 'DEVICE_REJECTED')
  }

  private async readAttendanceBuffer(): Promise<Buffer> {
    const first = await this.command(CMD.READ, Buffer.from([1, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    if (first.command === CMD.DATA) return first.data
    this.requireOk(first)
    if (first.data.length < 5) throw new ZkTcpError('PROTOCOL')
    const size = first.data.readUInt32LE(1)
    if (size > MAX_DATA) throw new ZkTcpError('PROTOCOL')
    const chunks: Buffer[] = []
    for (let offset = 0; offset < size; offset += MAX_CHUNK) {
      const length = Math.min(MAX_CHUNK, size - offset)
      const args = Buffer.alloc(8)
      args.writeUInt32LE(offset); args.writeUInt32LE(length, 4)
      const deadline = Date.now() + this.timeout
      let part = await this.command(CMD.CHUNK, args)
      if (part.command === CMD.DATA) {
        if (part.data.length !== length) throw new ZkTcpError('PROTOCOL')
        chunks.push(part.data)
        continue
      }
      if (part.command !== CMD.PREPARE || part.data.length < 4 || part.data.readUInt32LE(0) !== length) {
        throw new ZkTcpError('PROTOCOL')
      }
      const reply = part.reply
      let received = 0
      while (received < length) {
        part = await this.next(reply, false, deadline)
        if (part.command !== CMD.DATA || part.data.length === 0 || received + part.data.length > length) {
          throw new ZkTcpError('PROTOCOL')
        }
        chunks.push(part.data)
        received += part.data.length
      }
      this.requireOk(await this.next(reply, false, deadline))
    }
    return Buffer.concat(chunks, size)
  }

  async getAttendances(): Promise<{ data: Array<{ deviceUserId: string; recordTime: Date }> }> {
    if (!this.authenticated) throw new ZkTcpError('AUTH_REQUIRED')
    try {
      this.requireOk(await this.command(CMD.FREE))
      const bytes = await this.readAttendanceBuffer()
      // Empty buffers are valid on empty terminals. Reject truncated records;
      // node-zklib would otherwise silently discard the incomplete last record.
      if (bytes.length !== 0 && (bytes.length < 4 || (bytes.length - 4) % 40 !== 0)) {
        throw new ZkTcpError('PROTOCOL')
      }
      this.requireOk(await this.command(CMD.FREE))
      const data = []
      for (let offset = 4; offset < bytes.length; offset += 40) {
        data.push(decodeRecordData40(bytes.subarray(offset, offset + 40)))
      }
      return { data }
    } catch (error) {
      await this.disconnect()
      throw error
    }
  }

  async disconnect(): Promise<void> {
    const socket = this.socket
    if (!socket) return
    if (this.authenticated && !socket.destroyed && !this.failure) {
      try { this.requireOk(await this.command(CMD.EXIT)) } catch { /* bounded best effort */ }
    }
    this.authenticated = false
    this.#key = 0
    socket.destroy()
    this.socket = undefined
    this.buffered = Buffer.alloc(0)
    this.packets = []
  }
}
