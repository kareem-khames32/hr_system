// الخطوة 20 (B4): اعتماد مسير الرواتب يتطلب تقرير تكافؤ SHADOW لنسخة الحساب الحالية، وسببًا مكتوبًا لكل فرق أو قيمة غائبة فيه.
// مجموعات الاختبار التي تختبر ميزات أخرى (لا التكافؤ نفسه) تستدعي هذه الدالة في أول مساعد الطلبات: قبل «اعتماد مسير» فقط تقرأ شروط الاعتماد
// من تفاصيل المسير وتكتب سببًا واحدًا لكل رمز سبب نظام بنفس المستخدم. أي رفض (صلاحية، حالة، لا تقرير) يُترك لطلب الاعتماد نفسه فيُفحص كما هو.
// شرط الاعتماد نفسه (الرفض قبل الأسباب، السبب الفردي والجماعي، القيمة الغائبة لا تسمح بـPOLICY) مختبر في payroll-policy-snapshot-engine.integration.cjs.
const APPROVE_ROUTE = /^\/payroll\/runs\/(\d+)\/approve$/

async function writeParityReasonsBeforeApproval(request, user, method, route) {
  const match = method === 'POST' && typeof route === 'string' ? APPROVE_ROUTE.exec(route) : null
  if (!match) return
  const detail = await request(user, 'GET', `/payroll/runs/${match[1]}`)
  const groups = detail.status === 200 && detail.body?.status === 'CALCULATED' ? detail.body.engine?.approvalPendingGroups ?? [] : []
  if (!groups.length) return
  await request(user, 'POST', `/payroll/runs/${match[1]}/parity-explanations`, { explanations: groups.map(group => ({ reasonCode: group.reasonCode,
    reason: `سبب مكتوب في بيئة الاختبار للرمز ${group.reasonCode}: هذه المجموعة لا تختبر تكافؤ محرك السياسة، والمصروف هو الحساب القديم` })) })
}

module.exports = { writeParityReasonsBeforeApproval }
