// الخطوة 22 (B5): فصل المهام — من احتسب نسخة المسير لا يعتمدها (PAYRUN-STATE-003) إلا برخصة الشركة الصغيرة الموثقة
// (payroll.approval_self_approval_allowed، مبذورة مقفلة). مجموعات الاختبار التي تختبر ميزات أخرى يحتسب فيها ويعتمد المستخدم نفسه،
// فتفعّل هذه الرخصة الموثقة في قاعدتها المؤقتة مرة واحدة عند الإعداد، قبل أي لقطة عدّ صفوف. لا يتغير أي تأكيد فيها.
// فصل المهام نفسه (الرفض، والرخصة وتسجيل استخدامها في حدث الاعتماد) مختبر في payroll-run-screen.integration.cjs.
const SELF_APPROVAL_KEY = 'payroll.approval_self_approval_allowed'

async function allowSmallCompanyApproval(repo) {
  const config = repo('RequestsConfig')
  const existing = await config.findOneBy({ key: SELF_APPROVAL_KEY })
  if (existing) await config.update({ key: SELF_APPROVAL_KEY }, { value: 'true' })
  else await config.save({ key: SELF_APPROVAL_KEY, value: 'true' })
}

module.exports = { allowSmallCompanyApproval, SELF_APPROVAL_KEY }
