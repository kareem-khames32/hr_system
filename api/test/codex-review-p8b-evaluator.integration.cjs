'use strict'
// B-ADD.10: تغيير مقيِّم تكليف في دورة تقييم، على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_review_evaluator_test_<16 hex>)، عبر HTTP
// بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  RE-01) الموظف من غير مدير بياخد مقيِّم: التكليف بيظهر عند المقيِّم الجديد في «تقييم فريقي» وبيسلّم؛ والمقيِّم القديم بيخرج (404).
//  RE-02) القواعد: بصلاحية إدارة الأداء وفي نطاقها (تكليف أو مقيِّم برّه النطاق = مش موجود)، مش نفسه، على رأس العمل، مش بعد تسليم
//         تقييم المدير، والدورة شغالة؛ وسطر تدقيق لكل تغيير فعلي بس.
// Run (من api/): node --test test/review-evaluator.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const t = disposableApp('review_evaluator')
const org = {}, emps = {}, users = {}, state = {}
const R = '/performance/reviews'
let number = 0
const employee = (extra = {}) => t.repo('Employee').save({ employeeCode: `RE${String(++number).padStart(3, '0')}`, fullName: `موظف ${number}`, branchId: org.a.id, joinDate: '2020-01-01',
  basicSalary: 6000, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (permissions, extra = {}) => t.user({ role: 'employee', branchId: org.a.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const setEvaluator = (user, assignmentId, evaluatorEmployeeId) => t.request(user, 'POST', `${R}/${assignmentId}/evaluator`, { evaluatorEmployeeId })
const answer = response => [response.status, response.body?.message]
const rows = async () => t.expectStatus(await t.request(users.hr, 'GET', `${R}/cycles/${state.cycle}/assignments`), 200).assignments
const rowOf = async person => (await rows()).find(row => row.employeeId === person.id)
const audits = () => t.repo('AuditLog').countBy({ action: 'REVIEW_EVALUATOR_CHANGED' })

before(async () => {
  await t.start()
  await moduleTools(t.app).enable('performance')
  org.a = await t.repo('Branch').save({ code: 'RE_A', name: 'فرع أ', country: 'SA' })
  org.b = await t.repo('Branch').save({ code: 'RE_B', name: 'فرع ب', country: 'SA' })
  org.sales = await t.repo('Department').save({ name: 'المبيعات', code: 'RE_S', branchId: org.a.id })
  emps.boss = await employee({ fullName: 'مدير المبيعات', departmentId: org.sales.id })
  emps.rep = await employee({ fullName: 'مندوب', departmentId: org.sales.id, managerEmployeeId: emps.boss.id })
  emps.senior = await employee({ fullName: 'مشرف قديم', departmentId: org.sales.id, managerEmployeeId: emps.boss.id })
  emps.gone = await employee({ fullName: 'موظف منتهي', status: 'terminated', isActive: false })
  emps.other = await employee({ fullName: 'موظف فرع ب', branchId: org.b.id })
  users.admin = await t.user({ scopeAllBranches: true })
  users.hr = await account(['performance.manage'])
  users.hrB = await account(['performance.manage'], { branchId: org.b.id })
  users.boss = await account([], { employeeId: emps.boss.id })
  users.rep = await account([], { employeeId: emps.rep.id })
  users.senior = await account([], { employeeId: emps.senior.id })
  const template = t.expectStatus(await t.request(users.hr, 'POST', `${R}/templates`, { name: 'نموذج قصير', ratingMax: 5,
    sections: [{ title: 'الجدارات', kind: 'COMPETENCIES', weight: 100, items: [{ label: 'التعاون', type: 'rating' }] }] }), 201)
  const cycle = t.expectStatus(await t.request(users.hr, 'POST', `${R}/cycles`, { name: 'تقييم الربع', kind: 'ANNUAL', templateId: template.id, periodStart: '2026-10-01', periodEnd: '2026-12-31',
    selfDueDate: '2027-01-10', managerDueDate: '2027-01-20', audienceMode: 'DEPARTMENTS', audienceIds: [org.sales.id] }), 201)
  state.cycle = cycle.id
  state.itemKey = template.sections[0].items[0].key; state.sectionKey = template.sections[0].key
  t.expectStatus(await t.request(users.hr, 'POST', `${R}/cycles/${cycle.id}/launch`), 200)
}, { timeout: 120000 })
after(context => t.stop(context))


test('P8B-R01: employee transferred after scope judgment before evaluator write', async () => {
  const row=await rowOf(emps.rep)
  const before=await t.repo('ReviewAssignment').findOneByOrFail({id:row.id})
  const otherDepartment=await t.repo('Department').save({name:'P8B moved department',code:'P8B_MOVED',branchId:org.b.id})
  const calendar=t.expectStatus(await t.request(users.admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+emps.rep.id),200)
  const calendarChange={effectiveFrom:'2026-10-01',reason:'P8B branch transfer',expectedRevision:calendar.revision,expectedCurrentSourceHash:calendar.currentSourceHash}
  const {Repository}=require('typeorm'), original=Repository.prototype.findOne
  let hit=false
  Repository.prototype.findOne=async function(options) {
    if(!hit && this.metadata.name==='Employee' && [emps.rep.id,emps.senior.id].includes(options?.where?.id) && options?.lock?.mode==='pessimistic_write') {
      hit=true
      const moved=await t.request(users.admin,'PATCH','/employees/'+emps.rep.id,{branchId:org.b.id,departmentId:otherDepartment.id,calendarChange})
      console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8B-R01-transfer',status:moved.status,error:moved.status!==200?moved.body:undefined}))
      t.expectStatus(moved,200)
    }
    return original.call(this,options)
  }
  let result
  try { result=await setEvaluator(users.hr,row.id,emps.senior.id) } finally { Repository.prototype.findOne=original }
  assert.equal(hit,true)
  const saved=await t.repo('ReviewAssignment').findOneBy({id:row.id})
  const subject=await t.repo('Employee').findOneBy({id:emps.rep.id})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8B-R01',status:result.status,branch:subject.branchId,hrBranch:org.a.id,manager:saved.managerEmployeeId,chosen:emps.senior.id}))
  assert.equal(subject.branchId,org.b.id)
  assert.equal(result.status,404,'Judgment must see the completed transfer')
  assert.equal(saved.managerEmployeeId,before.managerEmployeeId)
  assert.equal((await setEvaluator(users.hr,row.id,emps.boss.id)).status,404,'fresh request correctly denied')
})

test('P8B-R02: a real transfer waits for the evaluator transaction employee lock',async()=>{
  const row=await rowOf(emps.senior)
  const candidate=await employee({fullName:'P8B replacement',departmentId:org.sales.id})
  const department=await t.repo('Department').save({name:'P8B R02 destination',branchId:org.b.id})
  const calendar=t.expectStatus(await t.request(users.admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+emps.senior.id),200)
  const calendarChange={effectiveFrom:'2026-10-01',reason:'P8B transfer after lock',expectedRevision:calendar.revision,expectedCurrentSourceHash:calendar.currentSourceHash}
  const {Repository}=require('typeorm'),original=Repository.prototype.findOne
  let hit=false,done=false,movePromise
  Repository.prototype.findOne=async function(options){
    const result=await original.call(this,options)
    if(!hit&&this.metadata.name==='Employee'&&options?.where?.id===emps.senior.id&&options?.lock?.mode==='pessimistic_write'){
      hit=true
      movePromise=t.request(users.admin,'PATCH','/employees/'+emps.senior.id,{branchId:org.b.id,departmentId:department.id,calendarChange}).then(r=>{done=true;return r})
      await new Promise(resolve=>setTimeout(resolve,150));assert.equal(done,false,'Transfer must be waiting for employee lock')
    }
    return result
  }
  let saved
  try{saved=await setEvaluator(users.hr,row.id,candidate.id)}finally{Repository.prototype.findOne=original}
  assert.equal(hit,true);assert.equal(saved.status,200,JSON.stringify(saved.body))
  const moved=await movePromise;assert.equal(moved.status,200,JSON.stringify(moved.body))
  assert.equal((await t.repo('ReviewAssignment').findOneByOrFail({id:row.id})).managerEmployeeId,candidate.id)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8B-R02',transferWaited:true,evaluator:saved.status,transfer:moved.status}))
})

test('P8B-R03: crossed evaluator assignments use the same employee lock order',async()=>{
  const a=await t.repo('ReviewAssignment').findOneByOrFail({cycleId:state.cycle,employeeId:emps.rep.id})
  const b=await t.repo('ReviewAssignment').findOneByOrFail({cycleId:state.cycle,employeeId:emps.senior.id})
  const replies=await Promise.all([setEvaluator(users.admin,a.id,emps.senior.id),setEvaluator(users.admin,b.id,emps.rep.id)])
  assert.deepEqual(replies.map(r=>r.status),[200,200],JSON.stringify(replies.map(r=>r.body)))
})
