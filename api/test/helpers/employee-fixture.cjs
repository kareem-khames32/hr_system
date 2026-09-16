'use strict'
// إضافة موظف (قرار المالك 16 سبتمبر) تتطلب: الاسم الكامل بالعربي، الجنسية، الجنس، تاريخ الميلاد، الجوال، رقم الهوية / الإقامة
// (فريد وبشكل الجنسية)، رقم البصمة (فريد)، القسم، والمسمى الوظيفي — بجانب الفرع وتاريخ التعيين والراتب اللي الاختبارات بتبعتها.
// القيم هنا صالحة وفريدة لكل استدعاء (ختم التشغيل + عداد)، وقيم الاختبار نفسه تكسبها عند الدمج.

let sequence = 0
const runStamp = String(Date.now()).slice(-5)
// 9 أرقام: 5 من ختم التشغيل + 4 من العداد
const nextDigits = () => runStamp + String(++sequence % 10000).padStart(4, '0')

/** الحقول الإجبارية بقيم صالحة: سعودي برقم هوية 10 أرقام يبدأ بـ1، ورقم بصمة رقمي فريد. القسم يمرره المستدعي. */
function requiredEmployeeFields(overrides = {}) {
  const digits = nextDigits()
  return {
    fullName: 'موظف اختبار', nationality: 'سعودي', gender: 'male', birthDate: '1990-01-01', phone: '0501234567',
    nationalId: `1${digits}`, fingerprintCode: `8${digits}`, jobTitle: 'موظف',
    ...overrides,
  }
}

/** قسم اختبار داخل الفرع (يُنشأ مرة لكل فرع). ds = DataSource قاعدة الاختبار المؤقتة. */
async function fixtureDepartmentId(ds, branchId) {
  const departments = ds.getRepository('Department')
  const name = 'قسم الاختبار'
  const found = await departments.findOneBy({ branchId, name })
  return (found ?? await departments.save({ branchId, name })).id
}

/** الحقول الإجبارية + قسم الفرع — تُفرد قبل مدخلات الاختبار: { ...(await employeeRequiredFields(ds, branch.id)), employeeCode, ... } */
async function employeeRequiredFields(ds, branchId, overrides = {}) {
  return requiredEmployeeFields({ departmentId: await fixtureDepartmentId(ds, branchId), ...overrides })
}

module.exports = { requiredEmployeeFields, fixtureDepartmentId, employeeRequiredFields }
