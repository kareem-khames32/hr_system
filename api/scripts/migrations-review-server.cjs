'use strict'
const os = require('node:os')
const { spawn, execFileSync } = require('node:child_process')
const { fs, path, crypto, apiRoot, env, reviewGuard, artifactPath } = require('./migrations-lib.cjs')
const manifest = JSON.parse(fs.readFileSync(artifactPath('review-database.json'), 'utf8'))
reviewGuard(manifest.database)
const runtimeRoot = path.resolve(process.env.LOCALAPPDATA || os.tmpdir(), 'hr-system-reviews', manifest.database)
const uploads = path.join(runtimeRoot, 'uploads')
const statePath = artifactPath('review-server-state.json')
const port = Number(process.env.HR_REVIEW_API_PORT || '4001')
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid review API port')
const frontendUrl = process.env.HR_REVIEW_FRONTEND_URL || 'http://localhost:3001'
if (!/^http:\/\/(localhost|127\.0\.0\.1):300[01]$/.test(frontendUrl)) throw new Error('Invalid local review frontend URL')
function state() { try { return JSON.parse(fs.readFileSync(statePath, 'utf8')) } catch { return null } }
function copyUploads() {
  const marker = path.join(runtimeRoot, 'uploads-copy.json')
  if (fs.existsSync(marker)) return
  const source = path.resolve(apiRoot, env.UPLOADS_ROOT || 'uploads')
  if (uploads === source || uploads.startsWith(source + path.sep)) throw new Error('Review uploads must be separate from original uploads')
  fs.mkdirSync(runtimeRoot, { recursive: true })
  let files = 0
  if (fs.existsSync(source)) fs.cpSync(source, uploads, { recursive: true, force: false, errorOnExist: true,
    filter: file => { const stat = fs.lstatSync(file); if (stat.isSymbolicLink()) throw new Error('Upload symlink requires manual review'); if (stat.isFile()) files++; return true } })
  else fs.mkdirSync(uploads, { recursive: true })
  fs.writeFileSync(marker, JSON.stringify({ copiedAt: new Date().toISOString(), files, sourceExisted: fs.existsSync(source) }))
}
function verify() {
  execFileSync(process.execPath, [path.join(__dirname, 'migrations-run.cjs'), 'verify', manifest.database], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  if (!fs.existsSync(path.join(apiRoot, 'dist/app.module.js'))) throw new Error('Build API first: npm --prefix api run build')
}
async function serve(bootstrapOnly = false) {
  verify()
  copyUploads()
  Object.assign(process.env, env, { DB_DATABASE: manifest.database, DB_SYNCHRONIZE: 'false',
    NODE_ENV: 'development', JWT_SECRET: crypto.randomBytes(48).toString('hex'), UPLOADS_ROOT: uploads,
    TZ: env.TZ || 'Africa/Cairo', PORT: String(port), FRONTEND_URL: frontendUrl })
  process.chdir(apiRoot)
  const { NestFactory } = require('../node_modules/@nestjs/core')
  const { ValidationPipe } = require('../node_modules/@nestjs/common')
  const { DataSource } = require('../node_modules/typeorm')
  const app = await NestFactory.create(require('../dist/app.module').AppModule, { logger: false, abortOnError: false })
  let timer, stopping = false
  async function stop() {
    if (stopping) return
    stopping = true
    if (timer) clearInterval(timer)
    await app.close()
    const current = state()
    if (current?.pid === process.pid) fs.writeFileSync(statePath, JSON.stringify({ ...current, running: false, stoppedAt: new Date().toISOString() }, null, 2))
  }
  try {
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    app.enableCors({ origin: [
      'http://localhost:3000', 'http://127.0.0.1:3000',
      'http://localhost:3001', 'http://127.0.0.1:3001',
    ], credentials: true })
    await app.init()
    const ds = app.get(DataSource)
    if (ds.options.synchronize !== false || ds.options.database !== manifest.database) throw new Error('Review bootstrap database/synchronize guard failed')
    if (bootstrapOnly) {
      fs.writeFileSync(artifactPath('bootstrap-result.json'), JSON.stringify({ database: manifest.database, synchronize: false,
        builtApi: true, bootstrapPassed: true, checkedAt: new Date().toISOString(), uploadsCopiedSeparately: true }, null, 2))
      await stop()
      console.log(JSON.stringify({ bootstrapPassed: true, synchronize: false, database: manifest.database }))
      return
    }
    const stopFile = path.join(runtimeRoot, 'stop-' + crypto.randomUUID())
    await app.listen(port, '127.0.0.1')
    fs.writeFileSync(statePath, JSON.stringify({ database: manifest.database, pid: process.pid, running: true,
      apiUrl: `http://localhost:${port}/api`, frontendUrl, uploads, stopFile,
      synchronize: false, startedAt: new Date().toISOString() }, null, 2))
    timer = setInterval(() => { if (fs.existsSync(stopFile)) void stop() }, 500)
    process.once('SIGINT', () => void stop()); process.once('SIGTERM', () => void stop())
  } catch (err) { await stop(); throw err }
}
async function main() {
  const command = process.argv[2]
  if (command === 'bootstrap') return serve(true)
  if (command === 'serve') return serve(false)
  if (command === 'status') { console.log(JSON.stringify(state() || { running: false })); return }
  if (command === 'stop') {
    const current = state()
    if (!current?.running) { console.log('Review API already stopped'); return }
    reviewGuard(current.database)
    if (current.database !== manifest.database || path.dirname(current.stopFile) !== runtimeRoot) throw new Error('Review process identity mismatch')
    fs.writeFileSync(current.stopFile, 'stop')
    console.log('Stop requested. Review database, backup and copied uploads are retained.')
    return
  }
  if (command !== 'start') throw new Error('Use bootstrap, start, stop or status')
  const current = state()
  if (current?.running) {
    try { process.kill(current.pid, 0); throw new Error('Review API is already running; stop it before restarting') }
    catch (err) { if (err.code !== 'ESRCH') throw err }
  }
  verify(); copyUploads()
  const log = fs.openSync(path.join(runtimeRoot, 'api.log'), 'a')
  const child = spawn(process.execPath, [__filename, 'serve'], { cwd: apiRoot, windowsHide: true,
    detached: true, stdio: ['ignore', log, log] })
  child.unref(); fs.closeSync(log)
  console.log(JSON.stringify({ startRequested: true, pid: child.pid, stateFile: statePath, log: path.join(runtimeRoot, 'api.log') }))
}
main().catch(err => { console.error(err.name + ': ' + err.message); process.exitCode = 1 })
