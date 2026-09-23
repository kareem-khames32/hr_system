'use strict'
// Independent second review: real SQL, in-process Nest routing, NO listening API.
// Preload only for explicitly inspected disposable/synchronize integration fixtures.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), net = require('node:net')
const root = path.resolve(__dirname, '..')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(root, '.env')))
const disposable = /^hr_[a-z0-9_]+_test_[a-f0-9]{16}$/
const forbidden = new Set(['hr_system', 'hr_review_pre_payroll', env.DB_DATABASE])
const safeDatabase = name => { assert.match(name, disposable); assert.ok(!forbidden.has(name)) }
// Do not allow an accidental listener, SMTP/LDAP/device call or remote connection.
net.Server.prototype.listen = function () { throw new Error('REVIEW_NO_LISTEN') }
const connect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  let o = Array.isArray(args[0]) ? args[0][0] : args[0]
  if (typeof o === 'number') o = { port: o, host: args[1] }
  assert.ok(o && typeof o === 'object' && Number(o.port) === 1433 &&
    ['localhost', '127.0.0.1', '::1'].includes(o.host || 'localhost'), 'REVIEW_NETWORK_SQL_LOCAL_ONLY')
  return connect.apply(this, args)
}
require('../node_modules/ts-node').register({ project: path.join(root, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { DataSource } = require('../node_modules/typeorm')
const initialize = DataSource.prototype.initialize
DataSource.prototype.initialize = async function (...args) {
  safeDatabase(this.options.database)
  assert.notEqual(this.options.migrationsRun, true, 'REVIEW_NO_MIGRATIONS')
  const result = await initialize.apply(this, args)
  await this.query(`ALTER DATABASE [${this.options.database}] SET COMPATIBILITY_LEVEL = 150`)
  return result
}
const { Logger } = require('../node_modules/@nestjs/common')
Logger.overrideLogger(false)
const { SchedulerOrchestrator } = require('../node_modules/@nestjs/schedule/dist/scheduler.orchestrator')
SchedulerOrchestrator.prototype.onApplicationBootstrap = function () {}
require('../src/attendance/attendance-scheduler.service').AttendanceScheduler.prototype.onApplicationBootstrap = function () {}
require('../src/requests/requests-scheduler.service').RequestsScheduler.prototype.onApplicationBootstrap = function () {}
require('../src/auth/directory.service').DirectoryService.prototype.client = function () { throw new Error('REVIEW_NO_LDAP') }
require('../src/auth/mail.service').MailService.prototype.transporter = function () { throw new Error('REVIEW_NO_SMTP') }
const { NestFactory } = require('../node_modules/@nestjs/core')
const { NestApplication } = require('../node_modules/@nestjs/core/nest-application')
NestApplication.prototype.listen = async function () { await this.init(); return this.getHttpServer() }
const create = NestFactory.create.bind(NestFactory)
let application
NestFactory.create = async (...args) => {
  args[1] = { ...(args[1] || {}), logger: false, abortOnError: false }
  const app = await create(...args)
  application = app
  app.getHttpServer().address = () => ({ address: '127.0.0.1', port: 1 })
  return app
}
// Actual Express -> Nest guards/pipes/controllers/filters. Only TCP transport is replaced.
const { IncomingMessage, ServerResponse } = require('node:http')
const { Duplex } = require('node:stream')
global.fetch = async (url, options = {}) => {
  const u = new URL(url)
  assert.equal(u.origin, 'http://127.0.0.1:1', 'REVIEW_FETCH_LOCAL_FIXTURE_ONLY')
  assert.ok(application)
  const socket = new Duplex({ read() {}, write(_chunk, _enc, done) { done() } })
  Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' })
  const req = new IncomingMessage(socket)
  req.method = options.method || 'GET'; req.url = u.pathname + u.search
  const encoded = new Request(u, { method: req.method, headers: options.headers || {}, ...(options.body == null ? {} : {body: options.body}) })
  req.headers = Object.fromEntries(encoded.headers)
  const body = options.body == null ? null : Buffer.from(await encoded.arrayBuffer())
  if (body) req.headers['content-length'] = String(body.length)
  req.httpVersion = '1.1'; req.httpVersionMajor = 1; req.httpVersionMinor = 1
  const res = new ServerResponse(req), chunks = []
  return new Promise((resolve, reject) => {
    req.on('error', reject); res.on('error', reject)
    res.write = (chunk, encoding, callback) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined))
      if (typeof encoding === 'function') encoding()
      if (typeof callback === 'function') callback()
      return true
    }
    res.end = (chunk, encoding, callback) => {
      if (chunk) res.write(chunk, encoding)
      res.finished = true
      const status = res.statusCode
      const output = [204, 205, 304].includes(status) || req.method === 'HEAD' ? null : Buffer.concat(chunks)
      resolve(new Response(output, { status, headers: res.getHeaders() }))
      res.emit('finish')
      if (typeof callback === 'function') callback()
      return res
    }
    application.getHttpAdapter().getInstance().handle(req, res, error => {
      if (error) reject(error)
      else { res.statusCode = 404; res.end() }
    })
    if (body) req.push(body)
    req.push(null)
  })
}
module.exports = { safeDatabase, getApp: () => application }
