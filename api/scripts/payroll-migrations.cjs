'use strict'
// مسار مستقل للرواتب: لا مزامنة تلقائية ولا تعديل لترحيلات ما قبل الرواتب.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const net = require('node:net')
const { pool, env, apiRoot } = require('./migrations-lib.cjs')
const { DataSource, getMetadataArgsStorage } = require('../node_modules/typeorm')
const root = path.resolve(apiRoot, '..')
const migrationDir = path.join(root, 'docs/migrations/payroll')
const artifactDir = path.join(root, 'docs/payrollmigration')
const manifestPath = path.join(root, 'docs/prepayrollmigration/review-database.json')
const statePath = path.join(root, 'docs/prepayrollmigration/review-server-state.json')
const ledgerTable = 'payroll_schema_migrations'
const appName = 'HR Payroll Migration Runner'
const managedPriorOwners = new Map([['payroll_policy_versions', '20260913_006_payroll_policy_drafts']])
const managedPriorForeignKeys = new Map([
  ['payroll_policy_components', 'FK_payroll_policy_component_version'],
  ['payroll_policy_parameters', 'FK_payroll_policy_parameter_version'],
  ['payroll_tier_sets', 'FK_payroll_tier_set_version'],
])
// استثناء011 المحصور: سجل أجر جديد يشير لهوية الموظف القائمة، دون إضافة قيد إلى جدول قديم.
function salaryEmployeeReference(table, foreignKey) {
  return table.toLowerCase() === 'employee_salary_history_versions' && foreignKey.name === 'FK_employee_salary_history_employee' &&
    foreignKey.referencedTable.toLowerCase() === 'employees' && JSON.stringify(foreignKey.columns) === '["employeeId"]' &&
    JSON.stringify(foreignKey.referencedColumns) === '["id"]'
}
function salaryEmployeeMetadata(table, foreignKey, entityMetadatas) {
  const target = entityMetadatas.find(entity => entity.tableName === 'employees')
  return salaryEmployeeReference(table, foreignKey) && foreignKeyMatchesMetadata(table, foreignKey, entityMetadatas) &&
    target?.primaryColumns?.length === 1 && target.primaryColumns[0].databaseName === 'id' &&
    ['int', Number].includes(target.primaryColumns[0].type) && target.primaryColumns[0].isNullable === false
}
async function assertSalaryEmployeeTarget(q, table, foreignKey, entityMetadatas) {
  if (!salaryEmployeeMetadata(table, foreignKey, entityMetadatas)) throw new Error('Salary history employee foreign key does not match exact entity metadata')
  const proof = await q.query(`SELECT c.name,ty.name AS typeName,c.is_nullable AS nullable,
    (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
      WHERE i.object_id=c.object_id AND i.is_primary_key=1 AND ic.key_ordinal>0) AS primaryColumnCount,
    (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
      WHERE i.object_id=c.object_id AND i.is_primary_key=1 AND ic.column_id=c.column_id AND ic.key_ordinal=1) AS primaryIdCount
    FROM sys.columns c JOIN sys.types ty ON ty.user_type_id=c.user_type_id
    WHERE c.object_id=OBJECT_ID(N'dbo.employees',N'U') AND c.name=N'id'`)
  if (proof.length !== 1 || proof[0].typeName !== 'int' || proof[0].nullable !== false || proof[0].primaryColumnCount !== 1 || proof[0].primaryIdCount !== 1) {
    throw new Error('Salary history requires the existing dbo.employees.id INT NOT NULL single-column primary key')
  }
}
// قيود مسماة بتعبيرات ثابتة على الجداول الجديدة المحددة فقط؛ لا لغة CHECK عامة أو دوال SQL.
const namedNewChecks = new Map([
  ['loan_installment_allocations.CK_loan_installment_allocation_amounts', '[deductedAmount] >= 0 AND [carriedAmount] >= 0'],
  ['loan_installment_allocations.CK_loan_installment_allocation_status', "[status] IN ('HELD','POSTED','RELEASED')"],
  ['payroll_policy_tiers.CK_payroll_policy_tier_bounds', '[sequence] > 0 AND [fromValue] >= 0 AND ([toValue] IS NULL OR [toValue] > [fromValue])'],
  ['payroll_policy_tiers.CK_payroll_policy_tier_method', "([method] IN ('NONE','RATE_1_1') AND [multiplier] IS NULL AND [dayFraction] IS NULL AND [fixedAmount] IS NULL AND [formula] IS NULL) OR ([method] = 'MULTIPLIER' AND [multiplier] IS NOT NULL AND [multiplier] > 0 AND [dayFraction] IS NULL AND [fixedAmount] IS NULL AND [formula] IS NULL) OR ([method] = 'DAY_FRACTION' AND [dayFraction] IS NOT NULL AND [dayFraction] > 0 AND [dayFraction] <= 1 AND [multiplier] IS NULL AND [fixedAmount] IS NULL AND [formula] IS NULL) OR ([method] = 'FIXED_AMOUNT' AND [fixedAmount] IS NOT NULL AND [fixedAmount] > 0 AND [multiplier] IS NULL AND [dayFraction] IS NULL AND [formula] IS NULL) OR ([method] = 'FORMULA' AND [formula] IS NOT NULL AND [formula] <> N'' AND [multiplier] IS NULL AND [dayFraction] IS NULL AND [fixedAmount] IS NULL)"],
])
const digest = value => crypto.createHash('sha256').update(value).digest('hex')
const ident = value => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error('Unsafe SQL identifier')
  return '[' + value + ']'
}

// نقرأ SQL إلى رموز ثم نبني الجمل المسموحة فقط؛ الكلمات داخل النصوص ليست أوامر.
function tokenize(input) {
  const tokens = []
  for (let i = 0; i < input.length;) {
    const rest = input.slice(i)
    if (/^\s/.test(rest)) { i++; continue }
    if (rest.startsWith('--')) { const end = input.indexOf('\n', i); i = end < 0 ? input.length : end + 1; continue }
    if (rest.startsWith('/*')) {
      let depth = 1; i += 2
      while (i < input.length && depth) {
        if (input.slice(i, i + 2) === '/*') { depth++; i += 2 }
        else if (input.slice(i, i + 2) === '*/') { depth--; i += 2 }
        else i++
      }
      if (depth) throw new Error('Unclosed SQL comment')
      continue
    }
    const literal = rest.match(/^(?:N)?'(?:''|[^'])*'/i)
    if (literal) { tokens.push({ kind: 'literal', raw: literal[0], value: literal[0] }); i += literal[0].length; continue }
    const quoted = rest.match(/^(?:\[([A-Za-z_][A-Za-z0-9_]*)\]|"([A-Za-z_][A-Za-z0-9_]*)")/)
    if (quoted) { tokens.push({ kind: 'identifier', raw: quoted[0], value: quoted[1] || quoted[2] }); i += quoted[0].length; continue }
    const word = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/)
    if (word) { tokens.push({ kind: 'word', raw: word[0], value: word[0].toUpperCase() }); i += word[0].length; continue }
    const number = rest.match(/^\d+(?:\.\d+)?/)
    if (number) { tokens.push({ kind: 'number', raw: number[0], value: number[0] }); i += number[0].length; continue }
    const comparison = rest.match(/^(?:<>|>=|<=|[=<>])/)
    if (comparison) { tokens.push({ kind: 'symbol', raw: comparison[0], value: comparison[0] }); i += comparison[0].length; continue }
    if ('(),.;+-'.includes(input[i])) { tokens.push({ kind: 'symbol', raw: input[i], value: input[i] }); i++; continue }
    throw new Error('Unsupported SQL token at offset ' + i)
  }
  return tokens
}
class Parser {
  constructor(tokens) { this.tokens = tokens; this.i = 0 }
  peek(word) { const t = this.tokens[this.i]; return t?.value === word && (t.kind === 'word' || t.kind === 'symbol') }
  take(word) { if (!this.peek(word)) throw new Error('Expected SQL ' + word); return this.tokens[this.i++] }
  optional(word) { if (!this.peek(word)) return false; this.i++; return true }
  name() { const t = this.tokens[this.i++]; if (!t || !['word', 'identifier'].includes(t.kind)) throw new Error('Expected identifier'); ident(t.raw.startsWith('[') || t.raw.startsWith('"') ? t.value : t.raw); return t.kind === 'word' ? t.raw : t.value }
  table() {
    const first = this.name()
    if (!this.optional('.')) return first
    if (first.toLowerCase() !== 'dbo') throw new Error('Only dbo tables in the selected database are allowed')
    const table = this.name()
    if (this.peek('.')) throw new Error('Cross-database SQL is forbidden')
    return table
  }
  integer() { const t = this.tokens[this.i++]; if (t?.kind !== 'number' || !/^\d+$/.test(t.raw)) throw new Error('Expected integer'); return t.raw }
  end() { if (this.i !== this.tokens.length) throw new Error('Unsupported trailing SQL: ' + this.tokens[this.i].raw) }
  columns() {
    this.take('('); const cols = []
    do { let text = ident(this.name()); if (this.optional('ASC')) text += ' ASC'; else if (this.optional('DESC')) text += ' DESC'; cols.push(text) } while (this.optional(','))
    this.take(')'); return '(' + cols.join(', ') + ')'
  }
  foreignKey(name) {
    const names = () => { this.take('('); const values = [this.name()]; while (this.optional(',')) values.push(this.name()); this.take(')'); return values }
    this.take('FOREIGN'); this.take('KEY'); const columns = names(); this.take('REFERENCES')
    const referencedTable = this.table(), referencedColumns = names()
    if (columns.length !== referencedColumns.length) throw new Error('Foreign-key column counts must match')
    // لا حذف متتابع أو تعديل متتابع، حتى بين الجداول الجديدة.
    this.take('ON'); this.take('DELETE'); this.take('NO'); this.take('ACTION')
    this.take('ON'); this.take('UPDATE'); this.take('NO'); this.take('ACTION'); this.end()
    return { name, columns, referencedTable, referencedColumns,
      sql: 'CONSTRAINT ' + ident(name) + ' FOREIGN KEY (' + columns.map(ident).join(', ') + ') REFERENCES dbo.' + ident(referencedTable) + ' (' + referencedColumns.map(ident).join(', ') + ') ON DELETE NO ACTION ON UPDATE NO ACTION' }
  }
  check(name, table) {
    this.take('CHECK'); this.take('(')
    if (this.tokens.at(-1)?.value !== ')') throw new Error('CHECK must end after its exact expression')
    const expression = namedNewChecks.get(table.toLowerCase() + '.' + name)
    if (!expression || normalizeCheckTokens(this.tokens.slice(this.i, -1)) !== normalizeCheckTokens(tokenize(expression))) {
      throw new Error('Only exact named CHECK expressions on explicitly allowed new tables are allowed')
    }
    this.i = this.tokens.length
    return { name, expression, sql: 'CONSTRAINT ' + ident(name) + ' CHECK (' + expression + ')' }
  }
  defaultValue(depth = 0) {
    if (depth > 8) throw new Error('Default expression too deeply nested')
    if (this.optional('(')) { const v = this.defaultValue(depth + 1); this.take(')'); return { sql: '(' + v.sql + ')', isNull: v.isNull } }
    const sign = this.optional('-') ? '-' : this.optional('+') ? '+' : ''
    const t = this.tokens[this.i++]
    if (!t) throw new Error('Missing default expression')
    if (t.kind === 'number') return { sql: sign + t.raw, isNull: false }
    if (sign) throw new Error('Only numeric defaults may have a sign')
    if (t.kind === 'literal') return { sql: t.raw, isNull: false }
    if (t.kind === 'word' && t.value === 'NULL') return { sql: 'NULL', isNull: true }
    if (t.kind === 'word' && ['GETDATE', 'GETUTCDATE', 'SYSDATETIME', 'SYSUTCDATETIME', 'NEWID'].includes(t.value)) {
      this.take('('); this.take(')'); return { sql: t.value + '()', isNull: false }
    }
    throw new Error('Only literal or approved built-in defaults are allowed')
  }
  column(existingTable) {
    const name = this.name(), type = this.tokens[this.i++]
    const types = ['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'BIT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'MONEY', 'SMALLMONEY', 'DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME', 'TIME', 'DATETIMEOFFSET', 'CHAR', 'NCHAR', 'VARCHAR', 'NVARCHAR', 'TEXT', 'NTEXT', 'BINARY', 'VARBINARY', 'UNIQUEIDENTIFIER']
    if (type?.kind !== 'word' || !types.includes(type.value)) throw new Error('Unsupported column type')
    let text = ident(name) + ' ' + type.value
    if (this.optional('(')) {
      const args = [this.optional('MAX') ? 'MAX' : this.integer()]
      if (this.optional(',')) args.push(this.integer())
      this.take(')'); text += '(' + args.join(',') + ')'
    }
    let nullable = null, hasDefault = false, defaultIsNull = false, identity = false
    while (this.i < this.tokens.length) {
      if (this.optional('NULL')) { if (nullable !== null) throw new Error('Duplicate nullability'); nullable = true; text += ' NULL' }
      else if (this.optional('NOT')) { this.take('NULL'); if (nullable !== null) throw new Error('Duplicate nullability'); nullable = false; text += ' NOT NULL' }
      else if (this.optional('IDENTITY')) {
        if (existingTable || identity) throw new Error('Identity addition to existing tables is forbidden')
        identity = true; this.take('('); const seed = this.integer(); this.take(','); const step = this.integer(); this.take(')'); text += ' IDENTITY(' + seed + ',' + step + ')'
      } else if (this.peek('CONSTRAINT') || this.peek('DEFAULT')) {
        if (hasDefault) throw new Error('Duplicate default')
        if (this.optional('CONSTRAINT')) text += ' CONSTRAINT ' + ident(this.name())
        this.take('DEFAULT'); const value = this.defaultValue(); hasDefault = true; defaultIsNull = value.isNull; text += ' DEFAULT ' + value.sql
      } else throw new Error('Unsupported column clause: ' + this.tokens[this.i].raw)
    }
    // نطلب NULL صريحة عند الإضافة؛ لا نعتمد على ANSI_NULL_DFLT الخاص بالجلسة.
    if (existingTable && nullable !== true && !(hasDefault && !defaultIsNull)) throw new Error('Existing-table additions must explicitly allow NULL or have a non-null DEFAULT')
    return text
  }
}
function separated(tokens, separator) {
  const groups = []; let start = 0, depth = 0
  tokens.forEach((t, i) => {
    if (t.kind === 'symbol' && t.value === '(') depth++
    if (t.kind === 'symbol' && t.value === ')') depth--
    if (depth < 0) throw new Error('Unbalanced SQL parentheses')
    if (depth === 0 && t.kind === 'symbol' && t.value === separator) { groups.push(tokens.slice(start, i)); start = i + 1 }
  })
  if (depth) throw new Error('Unbalanced SQL parentheses')
  groups.push(tokens.slice(start)); return groups.filter(group => group.length)
}
function normalizeCheckTokens(tokens) {
  return JSON.stringify(tokens.map(token => token.kind === 'word' || token.kind === 'identifier' ? token.value.toUpperCase() : token.raw))
}
function checkMatchesMetadata(table, check, entityMetadatas) {
  const metadata = entityMetadatas.find(entity => entity.tableName === table)
  return metadata?.checks?.some(value => value.name === check.name && normalizeCheckTokens(tokenize(value.expression)) === normalizeCheckTokens(tokenize(check.expression))) === true
}
function parseStatement(tokens) {
  const p = new Parser(tokens)
  if (p.optional('ALTER')) {
    p.take('TABLE'); const table = p.table(); p.take('ADD')
    const column = new Parser(tokens.slice(p.i)).column(true)
    return { kind: 'add-column', table, sql: 'ALTER TABLE dbo.' + ident(table) + ' ADD ' + column + ';' }
  }
  p.take('CREATE')
  if (p.optional('TABLE')) {
    const table = p.table(); p.take('(')
    if (tokens.at(-1)?.value !== ')') throw new Error('CREATE TABLE must end after its column definitions')
    const foreignKeys = [], checks = []
    const definitions = separated(tokens.slice(p.i, -1), ',').map(group => {
      const q = new Parser(group)
      if (!q.optional('CONSTRAINT')) return q.column(false)
      const name = q.name(); let type
      if (q.peek('FOREIGN')) { const foreignKey = q.foreignKey(name); foreignKeys.push(foreignKey); return foreignKey.sql }
      if (q.peek('CHECK')) { const check = q.check(name, table); checks.push(check); return check.sql }
      if (q.optional('PRIMARY')) { q.take('KEY'); type = 'PRIMARY KEY' }
      else { q.take('UNIQUE'); type = 'UNIQUE' }
      const columns = q.columns(); q.end(); return 'CONSTRAINT ' + ident(name) + ' ' + type + ' ' + columns
    })
    if (!definitions.length) throw new Error('Empty CREATE TABLE')
    return { kind: 'create-table', table, ...(foreignKeys.length ? { foreignKeys } : {}), ...(checks.length ? { checks } : {}), sql: 'CREATE TABLE dbo.' + ident(table) + ' (' + definitions.join(', ') + ');' }
  }
  const unique = p.optional('UNIQUE'); p.take('INDEX'); const index = p.name(); p.take('ON'); const table = p.table(); const columns = p.columns()
  let filter = ''
  if (p.optional('WHERE')) {
    filter = ' WHERE ' + ident(p.name()); p.take('IS'); const not = p.optional('NOT'); p.take('NULL')
    filter += not ? ' IS NOT NULL' : ' IS NULL'
  }
  p.end()
  return { kind: 'create-index', table, sql: 'CREATE ' + (unique ? 'UNIQUE ' : '') + 'INDEX ' + ident(index) + ' ON dbo.' + ident(table) + ' ' + columns + filter + ';' }
}
function managedPriorPayrollTables(versions, rows) {
  const tables = new Set()
  for (const [table, owner] of managedPriorOwners) {
    const version = versions.find(item => item.version === owner)
    if (version && version.operations.some(operation => operation.kind === 'create-table' && operation.table.toLowerCase() === table) &&
        (rows === undefined || rows.some(row => row.version === owner && row.checksum === version.checksum))) tables.add(table)
  }
  return tables
}
function managedPriorReference(table, foreignKey, managedPriorTables) {
  return managedPriorForeignKeys.get(table.toLowerCase()) === foreignKey.name && foreignKey.referencedTable.toLowerCase() === 'payroll_policy_versions' &&
    managedPriorTables.has('payroll_policy_versions') && foreignKey.columns.length === 1 && foreignKey.columns[0] === 'versionId' &&
    foreignKey.referencedColumns.length === 1 && foreignKey.referencedColumns[0] === 'id'
}
function foreignKeyMatchesMetadata(table, foreignKey, entityMetadatas) {
  const metadata = entityMetadatas.find(entity => entity.tableName === table)
  const exactColumns = (fields, names) => JSON.stringify(fields.map(field => field.databaseName)) === JSON.stringify(names)
  return metadata?.foreignKeys?.some(key => key.name === foreignKey.name && key.referencedEntityMetadata.tableName === foreignKey.referencedTable &&
    exactColumns(key.columns, foreignKey.columns) && exactColumns(key.referencedColumns, foreignKey.referencedColumns) && key.onDelete === 'NO ACTION' && key.onUpdate === 'NO ACTION') === true
}
function validateSql(content, managedPriorTables = new Set()) {
  const operations = separated(tokenize(content), ';').map(parseStatement)
  if (!operations.length) throw new Error('Empty payroll migration')
  if (operations.some(op => /^(?:payroll_schema_migrations|app_schema_migrations)$/i.test(op.table))) throw new Error('Migration ledgers are reserved')
  const created = new Set()
  for (const operation of operations) {
    if (operation.kind === 'create-table') created.add(operation.table.toLowerCase())
    for (const foreignKey of operation.foreignKeys || []) {
      if (!created.has(foreignKey.referencedTable.toLowerCase()) && !managedPriorReference(operation.table, foreignKey, managedPriorTables) && !salaryEmployeeReference(operation.table, foreignKey)) {
        throw new Error('Foreign keys require a new target, the explicitly managed prior policy-version table, or the exact salary-history employee reference')
      }
    }
  }
  return operations
}

function classifyMetadataQuery(query, entityMetadatas, newTables = new Set(), managedPriorTables = new Set()) {
  try {
    const operations = validateSql(query), created = new Set([...newTables].map(name => name.toLowerCase()))
    for (const operation of operations) for (const foreignKey of operation.foreignKeys || []) {
      if (salaryEmployeeReference(operation.table, foreignKey) && (!created.has(operation.table.toLowerCase()) || !salaryEmployeeMetadata(operation.table, foreignKey, entityMetadatas))) {
        throw new Error('Salary history foreign key requires exact new-table and employee metadata proof')
      }
    }
    return { safe: true }
  } catch (originalError) {
    // TypeORM يحذف كلمة NULL للعمود الاختياري. هذا إثبات لتصنيف الخطة فقط؛
    // ملفات SQL المكتوبة ما زالت تمر بالمحلل الصارم، ولا ننفذ SQL المولدة.
    try {
      const statements = separated(tokenize(query), ';')
      if (statements.length !== 1) throw originalError
      const parser = new Parser(statements[0])
      parser.take('ALTER'); parser.take('TABLE'); const table = parser.table(); parser.take('ADD')
      if (parser.optional('CONSTRAINT')) {
        const name = parser.name(), created = new Set([...newTables].map(name => name.toLowerCase()))
        if (parser.peek('CHECK')) {
          const check = parser.check(name, table)
          if (!created.has(table.toLowerCase()) || !checkMatchesMetadata(table, check, entityMetadatas)) throw originalError
          return { safe: true, newTableCheckEvidence: { table, name: check.name, expression: check.expression } }
        }
        const foreignKey = parser.foreignKey(name)
        const prior = managedPriorReference(table, foreignKey, managedPriorTables)
        const employee = salaryEmployeeMetadata(table, foreignKey, entityMetadatas)
        if (!created.has(table.toLowerCase()) || (!created.has(foreignKey.referencedTable.toLowerCase()) && !prior && !employee) || !foreignKeyMatchesMetadata(table, foreignKey, entityMetadatas)) throw originalError
        return { safe: true, newTableForeignKeyEvidence: { table, name: foreignKey.name, referencedTable: foreignKey.referencedTable,
          ...(employee ? { existingEmployeePrimaryKeyEvidence: 'dbo.employees.id INT NOT NULL PRIMARY KEY' } :
            !created.has(foreignKey.referencedTable.toLowerCase()) ? { referencedMigration: managedPriorOwners.get(foreignKey.referencedTable.toLowerCase()) } : {}) } }
      }
      const columnTokens = statements[0].slice(parser.i)
      const column = new Parser(columnTokens).name()
      const metadata = entityMetadatas.find(entity => entity.tableName === table)
      if (!metadata?.columns.some(field => field.databaseName === column && field.isNullable === true)) throw originalError
      const definition = new Parser(columnTokens).column(false)
      // إعادة التحليل تحظر NOT NULL الصريحة، وIDENTITY، وأي عملية إضافية مخفية.
      validateSql('ALTER TABLE dbo.' + ident(table) + ' ADD ' + definition + ' NULL;')
      return { safe: true, nullableMetadataEvidence: { table, column } }
    } catch { return { safe: false, reason: originalError.message } }
  }
}
function readMigrations(dir = migrationDir) {
  if (!fs.existsSync(dir)) return []
  const versions = []
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.sql')).sort()) {
    if (!/^\d{8}_\d{3}_[a-z_]+\.sql$/.test(name)) throw new Error('Invalid payroll migration filename: ' + name)
    const file = path.join(dir, name)
    if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) throw new Error('Migration must be a regular local file')
    const content = fs.readFileSync(file, 'utf8')
    versions.push({ version: name.slice(0, -4), checksum: digest(content), operations: validateSql(content, managedPriorPayrollTables(versions)) })
  }
  return versions
}
function assertTarget(manifest, database) {
  if (!/^hr_review_pre_payroll_\d{14}_[a-f0-9]{8}$/.test(database) || database === env.DB_DATABASE || database === manifest.sourceDatabase || database !== manifest.database || manifest.sourceDatabase !== env.DB_DATABASE || !manifest.copyOnly || !manifest.checksumVerified || !manifest.restored) {
    throw new Error('Only the retained, verified review clone is allowed; original and arbitrary databases are forbidden')
  }
}
function allEntities() {
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name)
      if (item.isDirectory()) walk(file)
      else if (/\.entit(?:y|ies)\.ts$/.test(item.name)) require(file)
    }
  }
  walk(path.join(apiRoot, 'src'))
  return [...new Set(getMetadataArgsStorage().tables.map(table => table.target))]
}
async function openDataSource(database, entities = allEntities()) {
  const ds = new DataSource({ type: 'mssql', host: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), username: env.DB_USERNAME, password: env.DB_PASSWORD,
    database, options: { encrypt: false, trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE !== 'false', appName },
    entities, synchronize: false, migrationsRun: false, logging: false, connectionTimeout: 10000, requestTimeout: 300000 })
  await ds.initialize(); return ds
}
async function ledger(q) {
  const exists = await q.query("SELECT OBJECT_ID(N'dbo.payroll_schema_migrations',N'U') AS id")
  return exists[0].id ? q.query('SELECT version,checksum FROM dbo.payroll_schema_migrations ORDER BY version') : []
}
function assertLedger(versions, rows) {
  if (new Set(versions.map(v => v.version)).size !== versions.length) throw new Error('Duplicate payroll migration version')
  for (const row of rows) {
    const version = versions.find(v => v.version === row.version)
    if (!version || version.checksum !== row.checksum) throw new Error('Applied payroll migration is missing or has changed: ' + row.version)
  }
}
async function schemaDiff(ds, runner) {
  if (!runner) return (await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query)
  // نفس مسار TypeORM log في وضع الذاكرة، وعلى اتصال المعاملة نفسها حتى يمكن التراجع قبل COMMIT.
  const builder = ds.driver.createSchemaBuilder(); builder.queryRunner = runner
  await runner.getTables(builder.entityToSyncMetadatas.map(m => builder.getTablePath(m)))
  await runner.getViews(builder.viewEntityToSyncMetadatas.map(m => builder.getTablePath(m)))
  runner.enableSqlMemory()
  try { await builder.executeSchemaSyncOperationsInProperOrder(); return runner.getMemorySql().upQueries.map(q => q.query) }
  finally { runner.disableSqlMemory() }
}
async function snapshot(q) {
  const columns = await q.query(`SELECT s.name AS schemaName,t.name AS tableName,c.name AS columnName,ty.name AS typeName,c.max_length AS maxLength,c.precision,c.scale,c.is_nullable AS nullable,c.is_identity AS isIdentity,dc.name AS defaultName,dc.definition AS defaultValue
    FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id WHERE t.is_ms_shipped=0 ORDER BY s.name,t.name,c.column_id`)
  const counts = await q.query('SELECT t.name AS tableName,SUM(p.rows) AS [rowCount] FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN(0,1) WHERE t.is_ms_shipped=0 GROUP BY t.name ORDER BY t.name')
  return { columns, counts }
}
function assertPreserved(before, after) {
  for (const column of before.columns) {
    const current = after.columns.find(c => c.schemaName === column.schemaName && c.tableName === column.tableName && c.columnName === column.columnName)
    if (JSON.stringify(column) !== JSON.stringify(current)) throw new Error('An existing column changed: ' + column.tableName + '.' + column.columnName)
  }
  for (const table of before.counts) {
    if (table.tableName !== ledgerTable && String(after.counts.find(t => t.tableName === table.tableName)?.rowCount) !== String(table.rowCount)) throw new Error('Existing row count changed: ' + table.tableName)
  }
}
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false
  try { process.kill(pid, 0); return true } catch (error) { if (error.code === 'ESRCH') return false; throw error }
}
async function portOpen(port, host) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }); let done = false
    const finish = value => { if (!done) { done = true; socket.destroy(); resolve(value) } }
    socket.setTimeout(1200, () => { socket.destroy(); reject(new Error('Cannot confirm API port is stopped: ' + port)) })
    socket.once('connect', () => finish(true))
    socket.once('error', error => { if (['ECONNREFUSED', 'EADDRNOTAVAIL', 'ENETUNREACH'].includes(error.code)) finish(false); else { socket.destroy(); reject(error) } })
  })
}
async function assertRuntimeStopped(database, ds) {
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null
  if (state?.database === database && pidAlive(state.pid)) throw new Error('Stop the recorded review API process before applying payroll migrations')
  const ports = new Set([4000, 4001, 4002])
  if (state?.apiUrl) { const port = Number(new URL(state.apiUrl).port); if (port) ports.add(port) }
  for (const port of ports) for (const host of ['127.0.0.1', '::1']) if (await portOpen(port, host)) throw new Error('API port ' + port + ' is listening; stop it before applying payroll migrations')
  const active = await ds.query('SELECT COUNT(*) AS n FROM sys.dm_exec_sessions WHERE is_user_process=1 AND database_id=DB_ID() AND session_id<>@@SPID AND program_name<>@0', [appName])
  if (Number(active[0].n)) throw new Error('Other sessions are connected to the review database; stop writers before applying')
}
async function checkpoint(database) {
  const p = await pool(database)
  try {
    const dir = (await p.request().query("SELECT SERVERPROPERTY('InstanceDefaultBackupPath') AS dir")).recordset[0].dir
    if (!dir) throw new Error('SQL Server backup directory unavailable')
    const suffix = new Date().toISOString().replace(/\D/g, '').slice(0, 14) + '_' + crypto.randomBytes(4).toString('hex')
    const backupPath = dir.replace(/[\\/]$/, '') + (dir.includes('\\') ? '\\' : '/') + 'hr_payroll_checkpoint_' + suffix + '.bak'
    await p.request().input('backupPath', backupPath).query('BACKUP DATABASE ' + ident(database) + ' TO DISK=@backupPath WITH COPY_ONLY,CHECKSUM')
    await p.request().input('backupPath', backupPath).query('RESTORE VERIFYONLY FROM DISK=@backupPath WITH CHECKSUM')
    const result = { database, backupPath, copyOnly: true, checksumVerified: true, createdAt: new Date().toISOString() }
    fs.mkdirSync(artifactDir, { recursive: true }); fs.writeFileSync(path.join(artifactDir, 'checkpoint-' + suffix + '.json'), JSON.stringify(result, null, 2))
    return result
  } finally { await p.close() }
}
async function applyTransaction(ds, versions) {
  const q = ds.createQueryRunner(); await q.connect(); await q.startTransaction()
  const applied = [], skipped = []
  try {
    await q.query("SET XACT_ABORT ON; DECLARE @lock int; EXEC @lock=sp_getapplock @Resource='hr:payroll:migrations',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @lock<0 THROW 50100,'Payroll migration lock unavailable',1;")
    const before = await snapshot(q), rows = await ledger(q); assertLedger(versions, rows)
    if (!rows.length && !(await q.query("SELECT OBJECT_ID(N'dbo.payroll_schema_migrations',N'U') AS id"))[0].id) {
      await q.query('CREATE TABLE dbo.payroll_schema_migrations(version nvarchar(150) NOT NULL PRIMARY KEY,checksum char(64) NOT NULL,appliedAt datetime2 NOT NULL DEFAULT SYSDATETIME())')
    }
    for (const version of versions) {
      if (rows.some(row => row.version === version.version)) { skipped.push(version.version); continue }
      // نعيد إثبات SQL على اتصال المعاملة؛ المراجع القديمة إما سياسة مدارة أو هوية الموظف المثبتة أدناه.
      const managedPriorTables = managedPriorPayrollTables(versions, [...rows, ...applied.map(version => ({ version, checksum: versions.find(item => item.version === version).checksum }))])
      const operations = validateSql(version.operations.map(operation => operation.sql).join('\n'), managedPriorTables), createdHere = new Set()
      for (const operation of operations) {
        if (operation.kind === 'create-table') createdHere.add(operation.table.toLowerCase())
        for (const check of operation.checks || []) {
          if (!checkMatchesMetadata(operation.table, check, ds.entityMetadatas)) throw new Error('Named CHECK does not match exact entity metadata: ' + check.name)
        }
        for (const foreignKey of operation.foreignKeys || []) {
          if (salaryEmployeeReference(operation.table, foreignKey)) await assertSalaryEmployeeTarget(q, operation.table, foreignKey, ds.entityMetadatas)
          if (!createdHere.has(foreignKey.referencedTable.toLowerCase()) && !foreignKeyMatchesMetadata(operation.table, foreignKey, ds.entityMetadatas)) {
            throw new Error('Managed prior foreign key does not match exact entity metadata: ' + foreignKey.name)
          }
        }
        await q.query(operation.sql)
      }
      await q.query('INSERT dbo.payroll_schema_migrations(version,checksum) VALUES(@0,@1)', [version.version, version.checksum]); applied.push(version.version)
    }
    const remaining = await schemaDiff(ds, q)
    if (remaining.length) throw new Error('Full metadata drift remains (' + remaining.length + ' queries); all pending payroll migrations rolled back')
    assertPreserved(before, await snapshot(q))
    await q.commitTransaction(); return { applied, skipped, schemaMatches: true, existingColumnsAndCountsPreserved: true }
  } catch (error) { if (q.isTransactionActive) try { await q.rollbackTransaction() } catch {} throw error }
  finally { await q.release() }
}
// الاختبار الوحيد الذي يمكنه تجاوز manifest مقيد باسم عشوائي، ولا يقبل المصدر أو نسخة المراجعة.
async function applyDisposableTest(ds, versions) {
  if (!process.env.NODE_TEST_CONTEXT || !/^hr_payroll_migration_test_[a-f0-9]{16}$/.test(ds.options.database) || ds.options.database === env.DB_DATABASE) throw new Error('Disposable test database required')
  return applyTransaction(ds, versions)
}
async function main() {
  const mode = process.argv[2] || 'plan'
  if (!['plan', 'verify', 'apply'].includes(mode)) throw new Error('Use plan, verify or apply [retained review database]')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')), database = process.argv[3] || manifest.database
  assertTarget(manifest, database)
  const versions = readMigrations(), ds = await openDataSource(database)
  try {
    const rows = await ledger(ds); assertLedger(versions, rows)
    const pending = await schemaDiff(ds), unsafeDrift = [], nullableMetadataEvidence = [], newTableForeignKeyEvidence = [], newTableCheckEvidence = []
    const unapplied = versions.filter(v => !rows.some(row => row.version === v.version))
    const managedPriorTables = managedPriorPayrollTables(versions, rows)
    // إثبات أن طرفي العلاقة سيُنشآن الآن: توافق ملف الترحيل مع CREATE TABLE الفعلية في فرق المخطط.
    const declaredNewTables = new Set(unapplied.flatMap(version => version.operations.filter(op => op.kind === 'create-table').map(op => op.table.toLowerCase())))
    const newTables = new Set(pending.flatMap(query => {
      try { return validateSql(query).filter(op => op.kind === 'create-table' && declaredNewTables.has(op.table.toLowerCase())).map(op => op.table) } catch { return [] }
    }))
    for (const query of pending) {
      const classification = classifyMetadataQuery(query, ds.entityMetadatas, newTables, managedPriorTables)
      if (!classification.safe) unsafeDrift.push({ query, reason: classification.reason })
      if (classification.nullableMetadataEvidence) nullableMetadataEvidence.push({ query, ...classification.nullableMetadataEvidence })
      if (classification.newTableForeignKeyEvidence) newTableForeignKeyEvidence.push({ query, ...classification.newTableForeignKeyEvidence })
      if (classification.newTableCheckEvidence) newTableCheckEvidence.push({ query, ...classification.newTableCheckEvidence })
    }
    const plan = { checkedAt: new Date().toISOString(), database, synchronize: false, scope: 'all entities including payroll', versions: versions.map(v => ({ version: v.version, checksum: v.checksum })), unapplied: unapplied.map(v => v.version), pending, unsafeDrift, nullableMetadataEvidence, newTableForeignKeyEvidence, newTableCheckEvidence }
    fs.mkdirSync(artifactDir, { recursive: true }); fs.writeFileSync(path.join(artifactDir, 'plan.json'), JSON.stringify(plan, null, 2))
    if (mode === 'plan') { console.log(JSON.stringify({ database, pendingQueries: pending.length, unsafeDrift: unsafeDrift.length, unapplied: plan.unapplied, plan: path.join(artifactDir, 'plan.json') })); return }
    if (unsafeDrift.length) throw new Error('Non-additive metadata drift requires review; no payroll migration applied')
    if (mode === 'verify') {
      if (pending.length || unapplied.length) throw new Error('Payroll schema or migration ledger is incomplete')
      console.log(JSON.stringify({ database, schemaMatches: true, allEntities: true, migrationCount: rows.length })); return
    }
    await assertRuntimeStopped(database, ds)
    if (!unapplied.length) {
      if (pending.length) throw new Error('Metadata drift has no unapplied payroll SQL')
      console.log(JSON.stringify({ database, applied: [], skipped: rows.map(r => r.version), schemaMatches: true })); return
    }
    const backup = await checkpoint(database)
    await assertRuntimeStopped(database, ds)
    const result = await applyTransaction(ds, versions)
    const finalDiff = await schemaDiff(ds)
    if (finalDiff.length) throw new Error('Metadata changed after transaction commit; inspect the saved checkpoint')
    const report = { database, ...result, checkpoint: backup, verifiedAt: new Date().toISOString() }
    fs.writeFileSync(path.join(artifactDir, 'result.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report))
  } finally { await ds.destroy() }
}
module.exports = { validateSql, classifyMetadataQuery, readMigrations, managedPriorPayrollTables, assertTarget, allEntities, openDataSource, schemaDiff, applyDisposableTest, assertLedger, digest }
if (require.main === module) main().catch(error => { console.error(error.name + ': ' + error.message); process.exitCode = 1 })
