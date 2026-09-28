'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-round17-fixture.cjs')
let f,b,d,n=0
before(async()=>{f=await fixture('r17_identity');b=await f.repo('Branch').save({code:'R17I',name:'فرع الاختبار'});d=await f.repo('Department').save({name:'قسم الاختبار',branchId:b.id})},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function person(extra={}){n++;return f.repo('Employee').save({employeeCode:`R17I${n}`,fullName:`موظف اختبار ${n}`,branchId:b.id,departmentId:d.id,joinDate:'2020-01-01',nationalId:`R17-ID-${n}`,passportNo:null,basicSalary:5000,payMethod:'cash',status:'active',isActive:true,...extra})}
test('CR17 identity: two concurrent API updates cannot claim the same normalized passport',async t=>{
  const a=await person(),c=await person()
  const responses=await Promise.all([f.request('PATCH',`/employees/${a.id}`,{passportNo:'race p ١٢٣'}),f.request('PATCH',`/employees/${c.id}`,{passportNo:'RACEP123'})])
  const rows=await f.repo('Employee').findBy({passportNo:'RACEP123'})
  t.diagnostic(JSON.stringify({case:'passport-race',statuses:responses.map(r=>r.status),persisted:rows.map(r=>({id:r.id,passportNo:r.passportNo}))}))
  assert.equal(rows.length,1,'Normalized passport must belong to at most one employee after concurrent API saves')
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409])
})
test('CR17 identity: two concurrent API updates cannot claim the same normalized national ID',async t=>{
  const a=await person(),c=await person()
  const responses=await Promise.all([f.request('PATCH',`/employees/${a.id}`,{nationalId:'race i ١٢٣'}),f.request('PATCH',`/employees/${c.id}`,{nationalId:'RACEI123'})])
  const rows=await f.repo('Employee').findBy({nationalId:'RACEI123'})
  t.diagnostic(JSON.stringify({case:'national-id-race',statuses:responses.map(r=>r.status),persisted:rows.map(r=>({id:r.id,nationalId:r.nationalId}))}))
  assert.equal(rows.length,1,'Normalized identity must belong to at most one employee after concurrent API saves')
})
test('CR17 identity: legacy passport accepted by old DTO remains editable when form resends it unchanged',async t=>{
  const e=await person({passportNo:'AB/123'})
  const {employeeIdentityIssues}=require('../src/employees/employee-required-fields')
  assert.deepEqual(employeeIdentityIssues({nationalId:e.nationalId,passportNo:e.passportNo},{mode:'edit',initial:e}),[])
  const unrelated=await f.request('PATCH',`/employees/${e.id}`,{phone:'0550001111'})
  assert.equal(unrelated.status,200,JSON.stringify(unrelated.body))
  // EmployeeForm sends each nonempty identity field, including an unchanged passport.
  const res=await f.request('PATCH',`/employees/${e.id}`,{nationalId:e.nationalId,passportNo:e.passportNo,phone:'0550002222'})
  const saved=await f.repo('Employee').findOneByOrFail({id:e.id})
  t.diagnostic(JSON.stringify({case:'legacy-form',sharedValidationIssues:0,partialPatch:unrelated.status,formPatch:res.status,message:res.body.message,phone:saved.phone}))
  assert.equal(res.status,200,'Unchanged legacy passport must not block unrelated form changes')
})
test('CR17 identity: SQL and JS normalization agree across every stripped character and both Arabic digit sets',async()=>{
  const {identityKeySql}=require('../src/employees/employee-input-rules')
  const {normalizeIdentityNumber}=require('../src/employees/employee-required-fields')
  const chars=[];for(let i=0;i<=0xffff;i++)if(normalizeIdentityNumber(String.fromCharCode(i))==='')chars.push(String.fromCharCode(i))
  for(const input of ['a'+chars.join('')+'٠١٢٣٤٥٦٧٨٩-۰۱۲۳۴۵۶۷۸۹',' - a b C ١٢٣ ']){
    const rows=await f.ds.query(`SELECT ${identityKeySql('CAST(@0 AS nvarchar(4000))')} AS v`,[input])
    assert.equal(rows[0].v,normalizeIdentityNumber(input))
  }
})
test('CR17 identity: controlled concurrent interleaving after two real preflight checks cannot persist duplicates',async t=>{
  const service=f.app.get(require('../src/employees/employees.service').EmployeesService)
  for(const field of ['passportNo','nationalId']){
    const a=await person(),c=await person(),original=service.assertUnique
    let entered=0,release,timer
    const gate=new Promise((resolve,reject)=>{release=resolve;timer=setTimeout(()=>reject(Error('Preflight gate timed out')),10000)})
    // No fake return or SQL: pause only after each real uniqueness lookup has succeeded, before either save.
    service.assertUnique=async function(...args){await original.apply(this,args);if(++entered===2)release();await gate}
    let responses
    try{responses=await Promise.all([f.request('PATCH',`/employees/${a.id}`,{[field]:'barrier ٧٧٧'}),f.request('PATCH',`/employees/${c.id}`,{[field]:'BARRIER777'})])}
    finally{service.assertUnique=original;clearTimeout(timer);release()}
    const rows=await f.repo('Employee').findBy({[field]:'BARRIER777'})
    t.diagnostic(JSON.stringify({case:'controlled-identity-race',field,preflightPassed:entered,statuses:responses.map(r=>r.status),persisted:rows.length}))
    // Collect both columns before failing on the invariant.
    if(!t.raceResults)t.raceResults=[]
    t.raceResults.push({field,count:rows.length})
  }
  assert.deepEqual(t.raceResults,[{field:'passportNo',count:1},{field:'nationalId',count:1}])
})
