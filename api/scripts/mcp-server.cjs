#!/usr/bin/env node
'use strict'
// B6.9: خادم MCP للقراءة بس فوق الـAPI العام (`/public/v1` — B6.3). stdio، JSON-RPC 2.0، رسالة في كل سطر. من غير مكتبات.
// بيشتغل بمفتاح تكامل من البيئة: نطاقات القراءة وفروع المفتاح هي اللي بتحكم اللي بيتقري (الخادم نفسه مابيقررش حاجة).
//   HR_PUBLIC_API_URL   عنوان الـAPI العام، مثال: https://hr.example.com/api/public/v1
//   HR_INTEGRATION_KEY  مفتاح التكامل (بيتعمل من «الإعدادات ← التكاملات») — مابيتطبعش في أي رسالة
// التشغيل: node api/scripts/mcp-server.cjs   (العميل بيشغّله ويكلمه على stdin/stdout؛ السجل على stderr)

const PROTOCOL_VERSION = '2024-11-05'
const MAX_RESULT_CHARS = 200000
const page = { page: { type: 'integer', minimum: 1, description: 'رقم الصفحة (الافتراضي 1)' }, pageSize: { type: 'integer', minimum: 1, maximum: 200, description: 'عدد الصفوف في الصفحة (الافتراضي 50)' } }
const range = { from: { type: 'string', description: 'من تاريخ YYYY-MM-DD' }, to: { type: 'string', description: 'إلى تاريخ YYYY-MM-DD' }, employeeId: { type: 'integer', minimum: 1, description: 'موظف واحد (اختياري)' } }
const schema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false })

// كل أداة = مسار قراءة واحد (GET). المعاملات المسموحة مكتوبة بالاسم؛ أي معامل تاني بيتجاهل.
const TOOLS = [
  { name: 'hr_employees', description: 'قايمة الموظفين (البيانات الوظيفية) في فروع المفتاح. نطاق employees.read.', path: () => '/employees', query: ['page', 'pageSize', 'status', 'branchId'],
    inputSchema: schema({ ...page, status: { type: 'string', description: 'active أو probation أو notice_period أو suspended أو terminated أو archived' }, branchId: { type: 'integer', minimum: 1 } }) },
  { name: 'hr_employee', description: 'موظف واحد برقمه. نطاق employees.read.', path: args => `/employees/${positiveId(args.id)}`, query: [],
    inputSchema: schema({ id: { type: 'integer', minimum: 1 } }, ['id']) },
  { name: 'hr_structure', description: 'الهيكل: الفروع والإدارات والأقسام والفرق. نطاق structure.read.', path: () => '/structure', query: [], inputSchema: schema({}) },
  { name: 'hr_attendance', description: 'أيام الحضور في مدى تواريخ (31 يوم بالكتير). نطاق attendance.read.', path: () => '/attendance', query: ['from', 'to', 'employeeId', 'page', 'pageSize'],
    inputSchema: schema({ ...range, ...page }, ['from', 'to']) },
  { name: 'hr_leaves', description: 'الإجازات المعتمدة في مدى تواريخ (سنة بالكتير). نطاق leaves.read.', path: () => '/leaves', query: ['from', 'to', 'employeeId', 'page', 'pageSize'],
    inputSchema: schema({ ...range, ...page }, ['from', 'to']) },
  { name: 'hr_payroll_runs', description: 'مسيرات شهر بإجمالياتها (من غير بنود الموظفين). نطاق payroll.read.', path: () => '/payroll/runs', query: ['period'],
    inputSchema: schema({ period: { type: 'string', description: 'الشهر YYYY-MM' } }, ['period']) },
]

function positiveId(value) {
  const id = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  if (!Number.isSafeInteger(id) || id < 1) throw invalid('id رقم صحيح موجب')
  return id
}
const invalid = message => Object.assign(new Error(message), { code: -32602 })

/** الإعداد من البيئة — null لو ناقص */
function config(env = process.env) {
  const base = String(env.HR_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, ''), key = String(env.HR_INTEGRATION_KEY ?? '').trim()
  return /^https?:\/\/[^\s]+$/.test(base) && key ? { base, key } : null
}

/** عنوان طلب القراءة: مسار الأداة + المعاملات المسموحة بس (نص أو رقم) */
function requestUrl(tool, args, base) {
  const params = new URLSearchParams()
  for (const name of tool.query) {
    const value = args?.[name]
    if (value === undefined || value === null || value === '') continue
    if (typeof value !== 'string' && typeof value !== 'number') throw invalid(`${name} نص أو رقم`)
    params.set(name, String(value))
  }
  const text = params.toString()
  return base + tool.path(args ?? {}) + (text ? `?${text}` : '')
}

async function callTool(name, args, settings, fetchImpl) {
  const tool = TOOLS.find(candidate => candidate.name === name)
  if (!tool) throw invalid('أداة مش معروفة')
  if (!settings) return { isError: true, content: [{ type: 'text', text: 'الخادم مش مضبوط: HR_PUBLIC_API_URL و HR_INTEGRATION_KEY مطلوبين في البيئة' }] }
  const response = await fetchImpl(requestUrl(tool, args, settings.base), { method: 'GET', redirect: 'manual', headers: { 'X-API-Key': settings.key, Accept: 'application/json' } })
  const body = String(await response.text())
  return { isError: response.status < 200 || response.status > 299, content: [{ type: 'text', text: body.length > MAX_RESULT_CHARS ? body.slice(0, MAX_RESULT_CHARS) + '…' : body }] }
}

/** رسالة JSON-RPC واحدة ← الرد (أو null للإشعار) */
async function handle(message, settings, fetchImpl = fetch) {
  const id = message && Object.prototype.hasOwnProperty.call(message, 'id') ? message.id : undefined
  const reply = result => (id === undefined ? null : { jsonrpc: '2.0', id, result })
  const fail = (code, text) => (id === undefined ? null : { jsonrpc: '2.0', id, error: { code, message: text } })
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return { jsonrpc: '2.0', id: id ?? null, error: { code: -32600, message: 'Invalid Request' } }
  try {
    switch (message.method) {
      case 'initialize': return reply({ protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'hr-public-api', version: '1.0.0' } })
      case 'ping': return reply({})
      case 'tools/list': return reply({ tools: TOOLS.map(tool => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema })) })
      case 'tools/call': return reply(await callTool(message.params?.name, message.params?.arguments ?? {}, settings, fetchImpl))
      default: return message.method.startsWith('notifications/') ? null : fail(-32601, 'Method not found')
    }
  } catch (error) {
    // خطأ في المدخلات بيرجع بكوده؛ وأي عطل تاني (شبكة…) نتيجة أداة بخطأ — من غير تفاصيل داخلية ومن غير المفتاح
    if (error && error.code === -32602) return fail(-32602, error.message)
    return reply({ isError: true, content: [{ type: 'text', text: 'تعذّر الوصول للـAPI العام' }] })
  }
}

function main() {
  const settings = config()
  if (!settings) process.stderr.write('hr-mcp: HR_PUBLIC_API_URL و HR_INTEGRATION_KEY مش مضبوطين — الأدوات هترد بخطأ\n')
  let buffer = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', chunk => {
    buffer += chunk
    let at
    while ((at = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, at).trim()
      buffer = buffer.slice(at + 1)
      if (!line) continue
      let message
      try { message = JSON.parse(line) } catch { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n'); continue }
      handle(message, settings).then(response => { if (response) process.stdout.write(JSON.stringify(response) + '\n') })
    }
  })
  process.stdin.on('end', () => process.exit(0))
}

module.exports = { TOOLS, PROTOCOL_VERSION, config, requestUrl, handle }
if (require.main === module) main()
