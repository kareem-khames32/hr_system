'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const fixture=require('./codex-review-p2d-fixture.cjs')
let f,A,B
before(async()=>{f=await fixture('p2d_a_closure');A=await f.repo('Branch').save({code:'P2A-A',name:'P2A visible'});B=await f.repo('Branch').save({code:'P2A-B',name:'P2A hidden'})},{timeout:120000})
after(async()=>{if(f)await f.close()})
const actor=(label,permissions=[],branch=A,extra={})=>f.repo('User').save({email:label+'@p2a.invalid',displayName:label,passwordHash:'review-fixture-only',role:'employee',branchId:branch?.id??null,scopeAllBranches:!branch,permissions:JSON.stringify(permissions),...extra})

test('P2A audit and queue reject unauthenticated or out of scope viewers; allowed reads retain audit values',async()=>{
 const ordinary=await actor('ordinary'),auditor=await actor('auditor',['audit.view']),branchSettings=await actor('settings',['settings.manage']),company=await actor('company',['settings.manage'],null)
 const {recordAudit}=require('../src/audit/audit')
 for(const branch of [A,B])await f.ds.transaction(em=>recordAudit(em,{category:'BANK_PAYROLL',action:'P2A_SCOPED',branchId:branch.id,entityId:'synthetic-'+branch.id,after:{amount:137.25}}))
 assert.equal((await f.request('GET','/audit',null,null)).status,401)
 assert.equal((await f.request('GET','/audit',null,ordinary)).status,403)
 const view=await f.ok('GET','/audit?action=P2A_SCOPED',null,auditor)
 assert.deepEqual(view.rows.map(r=>[r.branchId,r.after.amount]),[[A.id,137.25]])
 assert.equal((await f.request('GET','/queue',null,branchSettings)).status,403)
 assert.equal((await f.request('POST','/queue/jobs/1/retry',{},branchSettings)).status,403)
 assert.equal((await f.request('GET','/queue',null,ordinary)).status,403)
 assert.equal((await f.ok('GET','/queue',null,company)).available,true)
})

test('P2A audit failure must not leave a permission grant committed behind HTTP 500',async t=>{
 const u=await actor('atomic-permission-target')
 await f.ds.query(`CREATE TRIGGER [codex_p2a_fail_permission_audit] ON [audit_log] AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE [action]=N'USER_PERMISSIONS_SET') THROW 59001,N'P2A deliberate audit failure',1; END`)
 let result
 try{result=await f.request('PUT',`/users/${u.id}/permissions`,{grants:['payroll.view'],revokes:[]})}
 finally{await f.ds.query('DROP TRIGGER [codex_p2a_fail_permission_audit]')}
 assert.equal(result.status,500,'audit failure reached the public operation')
 const saved=await f.ok('GET',`/users/${u.id}/permissions`)
 const [count]=await f.ds.query(`SELECT COUNT(*) AS n FROM [audit_log] WHERE [action]=N'USER_PERMISSIONS_SET' AND [entityId]=@0`,[String(u.id)])
 t.diagnostic(JSON.stringify({case:'permission-audit-atomicity',httpStatus:result.status,grants:saved.grants,effectivePayrollView:saved.effective.includes('payroll.view'),auditRows:count.n}))
 assert.deepEqual(saved.grants,[],'A failed audited grant must roll back permissions with its audit row')
})

test('P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml',async t=>{
 await f.setting('files.allowed_types','docx')
 const zip=new(require('../node_modules/jszip'))();zip.file('readme.txt','Harmless non-Office archive; no document part.');zip.comment='word/document.xml'
 const bytes=await zip.generateAsync({type:'nodebuffer'}),parsed=await require('../node_modules/jszip').loadAsync(bytes)
 assert.equal(parsed.file('word/document.xml'),null)
 const jwt=new(require('../node_modules/@nestjs/jwt').JwtService)({secret:process.env.JWT_SECRET})
 const u=await actor('file-owner'),token=jwt.sign({sub:u.id,email:u.email,role:u.role,branchId:u.branchId,employeeId:null,tokenVersion:0,permissions:[]})
 const form=new FormData();form.append('file',new Blob([bytes],{type:'application/zip'}),'not-word.docx')
 const res=await fetch('http://127.0.0.1:1/api/files/upload?entityType=document',{method:'POST',headers:{Authorization:'Bearer '+token},body:form}),body=await res.json()
 const stored=await f.ds.query('SELECT [id],[mime],[storedName],[sha256] FROM [stored_files] WHERE [uploadedBy]=@0',[u.id])
 t.diagnostic(JSON.stringify({case:'zip-comment-file-type',status:res.status,mime:body.mime,storedRows:stored.length,containsOfficePart:false,shaMatches:stored.length?stored[0].sha256===require('node:crypto').createHash('sha256').update(bytes).digest('hex'):null}))
 assert.equal(res.status,400,'Allowed DOCX must be identified from an actual archive entry, not arbitrary comment bytes')
})

test('P2A concurrent repeated outbox keys and two workers produce one event and one job effect',async()=>{
 const {recordOutboxEvent}=require('../src/queue/outbox'),{QueueService}=require('../src/queue/queue.service')
 const q=f.app.get(QueueService),other=new QueueService(f.ds,f.app.get(require('../src/modules-registry/modules.service').ModulesService))
 Object.defineProperty(other,'host',{value:'p2a-independent-second-worker'})
 const inserted=await Promise.all(Array.from({length:8},()=>f.ds.transaction(em=>recordOutboxEvent(em,{type:'EMPLOYEE_HIRED',entityId:900001,key:'p2a:repeated',payload:{employeeId:900001}}))))
 assert.equal(inserted.filter(Boolean).length,1)
 let effects=0
 for(const worker of[q,other]){worker.registerHandler('p2a.once',async()=>{effects++});worker.subscribe('EMPLOYEE_HIRED','p2a.once')}
 await Promise.all([q.dispatchOutbox(),other.dispatchOutbox()]);await Promise.all([q.runOnce(),other.runOnce()])
 assert.equal(effects,1)
 const rows=await f.ds.query(`SELECT [status],[attempts] FROM [jobs_queue] WHERE [jobType]=N'p2a.once'`)
 assert.deepEqual(rows,[{status:'DONE',attempts:1}])
 await assert.rejects(f.ds.transaction(async em=>{await recordOutboxEvent(em,{type:'REQUEST_APPROVED',entityId:900002,key:'p2a:rollback'});throw Error('intentional rollback')}),/intentional rollback/)
 assert.equal((await f.ds.query(`SELECT COUNT(*) AS n FROM [outbox_events] WHERE [eventKey]=N'p2a:rollback'`))[0].n,0)
})

test('P2A a failed file hash update leaves neither a database row nor a new disk file',async()=>{
 await f.setting('files.allowed_types','pdf')
 const files=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]).sort():[]
 const root=process.env.UPLOADS_ROOT,beforeFiles=files(root),beforeRows=await f.ds.query('SELECT id,storedName FROM stored_files ORDER BY id')
 const jwt=new(require('../node_modules/@nestjs/jwt').JwtService)({secret:process.env.JWT_SECRET}),u=await actor('file-failure-owner')
 const token=jwt.sign({sub:u.id,email:u.email,role:u.role,branchId:u.branchId,employeeId:null,tokenVersion:0,permissions:[]})
 await f.ds.query(`CREATE TRIGGER [codex_p2a_fail_hash] ON [stored_files] AFTER UPDATE AS BEGIN SET NOCOUNT ON; THROW 59003,N'P2A deliberate hash persistence failure',1; END`)
 let response
 try{const form=new FormData();form.append('file',new Blob([Buffer.from('%PDF-1.4\n%%EOF\n')]),'rollback.pdf');response=await fetch('http://127.0.0.1:1/api/files/upload?entityType=document',{method:'POST',headers:{Authorization:'Bearer '+token},body:form})}
 finally{await f.ds.query('DROP TRIGGER [codex_p2a_fail_hash]')}
 assert.equal(response.status,500);assert.deepEqual(await f.ds.query('SELECT id,storedName FROM stored_files ORDER BY id'),beforeRows);assert.deepEqual(files(root),beforeFiles)
})
