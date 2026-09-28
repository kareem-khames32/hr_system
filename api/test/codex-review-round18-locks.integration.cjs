'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-round18-fixture.cjs')
let f,b,d,n=0,service
before(async()=>{f=await fixture('r18_locks');service=f.app.get(require('../src/employees/employees.service').EmployeesService);b=await f.repo('Branch').save({code:'R18',name:'فرع المراجعة'});d=await f.repo('Department').save({branchId:b.id,name:'قسم المراجعة'});await f.setting('payroll.salary_evidence_mode','MONTHLY_HISTORY_OR_CURRENT_FILE')},{timeout:180000})
after(async()=>{if(f)await f.close()})
const pause=ms=>new Promise(r=>setTimeout(r,ms))
async function person(extra={}){n++;return f.repo('Employee').save({employeeCode:`R18-${n}`,fullName:'أحمد علي محمد',branchId:b.id,departmentId:d.id,joinDate:'2020-01-01',basicSalary:5000,payMethod:'cash',status:'active',isActive:true,nationalId:`ID-${n}`,passportNo:`PASS-${n}`,fingerprintCode:`R18-FP-${n}`,...extra})}
function complete(extra={}){n++;return {fullName:'أحمد علي محمد',branchId:b.id,departmentId:d.id,joinDate:'2026-01-01',basicSalary:5000,payMethod:'cash',fingerprintCode:`R18-NEW-FP-${n}`,nationalId:`R18-NEW-ID-${n}`,phone:'0551234567',birthDate:'1990-01-01',gender:'male',nationality:'هندي',jobTitle:'محاسب',currency:'SAR',...extra}}
async function preflightPair(actions){
  const original=service.assertUnique;let count=0,release,timer
  const gate=new Promise((resolve,reject)=>{release=resolve;timer=setTimeout(()=>reject(Error('Preflight pair did not arrive')),10000)})
  service.assertUnique=async function(...args){await original.apply(this,args);if(!args[3]){if(++count===2)release();await gate}}
  try{return await Promise.all(actions.map(fn=>fn()))}finally{service.assertUnique=original;clearTimeout(timer);release()}
}
async function lock(runner,resource){const rows=await runner.query("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource=@0,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000; SELECT @r AS result",[resource]);assert.ok(rows[0].result>=0)}

test('CR18 four unique fields reject create/update collision after both real preflights pass',async t=>{
  const evidence=[]
  for(const [field,value] of [['passportNo','R18-SHARED-P'],['nationalId','R18-SHARED-I'],['email','shared@r18.invalid'],['fingerprintCode','R18-SHARED-FP']]){
    const existing=await person(),body=complete({[field]:value})
    const responses=await preflightPair([()=>f.request('POST','/employees',body),()=>f.request('PATCH',`/employees/${existing.id}`,{[field]:value})])
    const rows=await f.repo('Employee').findBy({[field]:value})
    assert.equal(rows.length,1);assert.equal(responses.filter(r=>r.status===409).length,1)
    assert.ok(responses.every(r=>[200,201,409].includes(r.status)),JSON.stringify(responses))
    evidence.push({field,statuses:responses.map(r=>r.status),persisted:rows.length})
  }
  t.diagnostic(JSON.stringify({case:'four-unique-fields-create-update',evidence}))
})

test('CR18 existing identity lock does not prevent unrelated phone save',async t=>{
  const e=await person(),runner=f.ds.createQueryRunner();await runner.connect();await runner.startTransaction()
  let result
  try{await lock(runner,'hr:employees:identity');result=await f.request('PATCH',`/employees/${e.id}`,{phone:'0551112233'});assert.equal(result.status,200,JSON.stringify(result.body))}
  finally{await runner.rollbackTransaction();await runner.release()}
  assert.equal((await f.repo('Employee').findOneByOrFail({id:e.id})).phone,'0551112233')
  t.diagnostic(JSON.stringify({case:'ordinary-save-with-identity-lock-held',status:result.status}))
})

test('CR18 real finance wait followed by simultaneous creation identity update schedule assignment and ordinary save completes without deadlock',async t=>{
  const a=await person(),c=await person(),runner=f.ds.createQueryRunner()
  const shift=await f.ok('POST','/catalogs/shifts',{name:'وردية اختبار الأقفال',startTime:'08:00',endTime:'17:00',shiftMode:'fixed',requiredWorkMinutes:540,effectiveFrom:'2026-09-01',changeReason:'اختبار ترتيب الأقفال'})
  const logger=f.ds.logger,original=logger.logQuery,byRunner=new Map()
  logger.logQuery=function(query,params,qr){
    if(query.includes('sp_getapplock')){
      const resource=query.includes('hr:attendance-rule-mutations')?'attendance':query.includes('hr:employees:identity')?'identity':(params||[]).some(p=>String(p?.value??p).startsWith('hr:employee-finance:'))?'finance':null
      if(resource){if(!byRunner.has(qr))byRunner.set(qr,[]);byRunner.get(qr).push(resource)}
    }
    return original.call(this,query,params,qr)
  }
  let pending=[],waitObserved=false
  try{
    await runner.connect();await runner.startTransaction();await lock(runner,`hr:employee-finance:${a.id}`)
    pending=[f.request('PATCH',`/employees/${a.id}`,{passportNo:'R18-ORDER-P'}),f.request('POST','/employees',complete()),
      f.request('POST','/attendance/schedule/day',{employeeId:c.id,date:'2026-09-23',shiftId:shift.id}),f.request('PATCH',`/employees/${c.id}`,{phone:'0552223344'})]
    for(let i=0;i<100;i++){
      const rows=await runner.query("SELECT COUNT(*) AS n FROM sys.dm_tran_locks WHERE resource_database_id=DB_ID() AND resource_type='APPLICATION' AND request_status='WAIT'")
      if(rows[0].n>0){waitObserved=true;break}await pause(25)
    }
    assert.equal(waitObserved,true,'Actual database wait must be observed')
    await runner.commitTransaction()
    const responses=await Promise.all(pending)
    assert.deepEqual(responses.map(r=>r.status),[200,201,201,200],JSON.stringify(responses))
    const identityPaths=[...byRunner.values()].filter(x=>x.includes('identity'))
    assert.equal(identityPaths.length,2)
    for(const events of identityPaths){assert.ok(events.indexOf('attendance')<events.indexOf('identity'));assert.ok(events.indexOf('finance')>=0&&events.indexOf('finance')<events.indexOf('identity'))}
    assert.equal((await f.repo('Employee').findOneByOrFail({id:a.id})).passportNo,'R18-ORDER-P')
    assert.equal((await f.repo('Employee').findOneByOrFail({id:c.id})).phone,'0552223344')
    t.diagnostic(JSON.stringify({case:'lock-order',waitObserved,statuses:responses.map(r=>r.status),identityPaths:identityPaths.map(x=>[...new Set(x)])}))
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await Promise.allSettled(pending);await runner.release();logger.logQuery=original}
})

test('CR18 concurrent clearing of the two identity fields must preserve at least one on fresh state',async t=>{
  const e=await person(),runner=f.ds.createQueryRunner();let pending=[],responses,waiters=0
  try{
    await runner.connect();await runner.startTransaction();await lock(runner,`hr:employee-finance:${e.id}`)
    pending=[f.request('PATCH',`/employees/${e.id}`,{nationalId:null}),f.request('PATCH',`/employees/${e.id}`,{passportNo:null})]
    for(let i=0;i<100;i++){
      const rows=await runner.query("SELECT COUNT(*) AS n FROM sys.dm_tran_locks WHERE resource_database_id=DB_ID() AND resource_type='APPLICATION' AND request_status='WAIT'")
      waiters=Number(rows[0].n);if(waiters>=2)break;await pause(25)
    }
    assert.ok(waiters>=2,'Both HTTP requests must be waiting on real SQL locks after their early validation')
    await runner.commitTransaction();responses=await Promise.all(pending)
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await Promise.allSettled(pending);await runner.release()}
  const fresh=await f.repo('Employee').findOneByOrFail({id:e.id})
  t.diagnostic(JSON.stringify({case:'concurrent-clear-pair',realSqlWaiters:waiters,statuses:responses.map(r=>r.status),nationalId:fresh.nationalId,passportNo:fresh.passportNo}))
  assert.ok(fresh.nationalId||fresh.passportNo,'Two accepted partial clears must not erase both identities')
})

test('CR18 legacy unchanged values allowed but newly invalid values types and lengths still rejected',async()=>{
  const e=await person({passportNo:'AB/123',nationalId:'X/456'})
  await f.ok('PATCH',`/employees/${e.id}`,{passportNo:' ab/١٢٣ ',nationalId:'x/456',phone:'0551112222'})
  for(const [key,value] of [['passportNo','AB/124'],['nationalId','X/457'],['passportNo','x'],['passportNo',55],['nationalId',{}],['passportNo','X'.repeat(41)],['nationalId','X'.repeat(51)]]){
    const res=await f.request('PATCH',`/employees/${e.id}`,{[key]:value});assert.equal(res.status,400,JSON.stringify({key,value,response:res}))
  }
  const fresh=await f.repo('Employee').findOneByOrFail({id:e.id});assert.equal(fresh.passportNo,'AB/123');assert.equal(fresh.nationalId,'X/456')
})
