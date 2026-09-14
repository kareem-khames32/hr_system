'use strict'
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const { DataSource, getMetadataArgsStorage } = require('../node_modules/typeorm')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const excludedTables = ['payroll_runs', 'payroll_items', 'payroll_run_members', 'lateness_tiers']
function identifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_]+$/.test(value)) throw new Error('Unsafe SQL identifier')
  return '[' + value + ']'
}
function reviewGuard(database) {
  if (!/^hr_review_pre_payroll_\d{14}_[a-f0-9]{8}$/.test(database) || database === env.DB_DATABASE) {
    throw new Error('Writes require a separate hr_review_pre_payroll_<14-digit timestamp>_<8-hex> database; original database is forbidden')
  }
}
function connection(database = env.DB_DATABASE) {
  if ((env.DB_TYPE || 'mssql') !== 'mssql') throw new Error('This migration runner supports SQL Server only')
  return { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database, options: { encrypt: false, trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE !== 'false' },
    connectionTimeout: 10000, requestTimeout: 300000 }
}
async function pool(database) { return new sql.ConnectionPool(connection(database)).connect() }
function entityClasses() {
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name)
      if (item.isDirectory()) walk(file)
      else if (/\.entit(?:y|ies)\.ts$/.test(item.name)) require(file)
    }
  }
  walk(path.join(apiRoot, 'src'))
  return getMetadataArgsStorage().tables.filter(t => !excludedTables.includes(t.name)).map(t => t.target)
}
async function dataSource(database = env.DB_DATABASE) {
  const c = connection(database)
  const ds = new DataSource({ type: 'mssql', host: c.server, port: c.port, username: c.user, password: c.password,
    database, options: c.options, entities: entityClasses(), synchronize: false, migrationsRun: false, logging: false })
  await ds.initialize()
  return ds
}
async function schemaSnapshot(p) {
  const columns = (await p.request().query(`SELECT s.name AS [schema], t.name AS [table], c.name AS [column], ty.name AS [type],
    c.max_length AS maxLength, c.precision AS [precision], c.scale AS scale, c.is_nullable AS nullable,
    c.is_identity AS [identity], dc.name AS defaultName, dc.definition AS defaultValue
    FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.columns c ON c.object_id=t.object_id
    JOIN sys.types ty ON ty.user_type_id=c.user_type_id LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id
    WHERE t.is_ms_shipped=0 ORDER BY s.name,t.name,c.column_id`)).recordset
  const counts = (await p.request().query(`SELECT t.name AS [table], SUM(p.rows) AS [rows]
    FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN(0,1)
    WHERE t.is_ms_shipped=0 GROUP BY t.name ORDER BY t.name`)).recordset
  return { columns, counts }
}
function checksum(value) { return crypto.createHash('sha256').update(value).digest('hex') }
function artifactPath(name) {
  const dir = path.resolve(apiRoot, '../docs/prepayrollmigration')
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, name)
}
module.exports = { fs, path, crypto, sql, apiRoot, env, identifier, reviewGuard, pool, dataSource,
  entityClasses, excludedTables, schemaSnapshot, checksum, artifactPath }
