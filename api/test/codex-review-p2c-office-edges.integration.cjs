'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const containers=require('./fixtures/office-containers.cjs'),ft=require('../src/files/file-type')
let f,token
before(async()=>{f=await require('./codex-review-p2c-fixture.cjs')('p2c_office_edges');token=new(require('../node_modules/@nestjs/jwt').JwtService)({secret:process.env.JWT_SECRET}).sign({sub:f.admin.id,role:'super_admin',permissions:['*'],tokenVersion:0})},{timeout:120000})
after(async()=>{if(f)await f.close()})
async function upload(bytes,name,type){await f.setting('files.allowed_types',type);const form=new FormData();form.append('file',new Blob([bytes]),name);const reply=await fetch('http://127.0.0.1:1/api/files/upload?entityType=document',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});return{status:reply.status,body:await reply.json()}}
test('P2C A real relationships: actual macro with commented normal type is rejected, renamed main Word and Excel are accepted',async t=>{
 const part='word/document2.xml',macro='application/vnd.ms-word.document.macroEnabled.main+xml',actual=containers.contentTypes([part,macro])
 const attacked=actual.replace('</Types>',`<!-- <Override PartName="/${part}" ContentType="${containers.WORD_MAIN}"/> --></Types>`)
 const bad=await upload(containers.officePackage(part,macro,{types:attacked,deflate:true}),'macro.docx','docx');assert.equal(bad.status,400)
 const controls=[]
 for(const [declared,type] of [[containers.WORD_MAIN,'docx'],[containers.EXCEL_MAIN,'xlsx']]){
  const bytes=containers.officePackage(part,declared,{deflate:true}),r=await upload(bytes,'renamed.'+type,type);assert.equal(r.status,201,JSON.stringify(r.body));assert.equal(r.body.mime,ft.FILE_TYPE_MIME[type]);controls.push(type)
  const [saved]=await f.ds.query('SELECT sha256 FROM stored_files WHERE id=@0',[r.body.id]);assert.equal(saved.sha256,crypto.createHash('sha256').update(bytes).digest('hex'))
 }
 t.diagnostic(JSON.stringify({case:'relationships-controls',macroStatus:bad.status,accepted:controls}))
})
test('P2C A OLE mini-stream must exist, not merely fit declared root size',async t=>{
 const good=containers.ole([{name:'WordDocument',size:300}]),at=containers.oleEntryOffset(1),root=containers.oleEntryOffset(0)
 assert.equal((await upload(good,'valid-small.doc','doc')).status,201)
 const noStart=Buffer.from(good);noStart.writeUInt32LE(0xfffffffe,at+116)
 const absentMiniFat=Buffer.from(good);absentMiniFat.writeUInt32LE(0xfffffffe,60);absentMiniFat.writeUInt32LE(0,64)
 const absentRoot=Buffer.from(good);absentRoot.writeUInt32LE(0xfffffffe,root+116)
 const outside=Buffer.from(good);outside.writeUInt32LE(123456,at+116)
 const outcomes=[]
 for(const [label,bytes] of [['stream-has-no-start',noStart],['mini-fat-absent',absentMiniFat],['root-data-absent',absentRoot],['stream-start-outside-root',outside]]){
  const reply=await upload(bytes,label+'.doc','doc');outcomes.push({label,detected:ft.detectFileType(bytes),status:reply.status,storedMime:reply.body.mime})
 }
 t.diagnostic(JSON.stringify({case:'missing-mini-stream-data',outcomes}))
 assert.ok(outcomes.every(o=>o.status===400),'A directory entry without addressable stream bytes must not upload as Word')
})
test('P2C A normal OLE stream FAT loop cannot substitute for the declared data chain',async t=>{
 const bytes=containers.ole(['WordDocument']),entry=containers.oleEntryOffset(1),start=bytes.readUInt32LE(entry+116)
 // The declared 4096 bytes now point to one 512-byte sector looping into itself.
 bytes.writeUInt32LE(start,512+start*4)
 const reply=await upload(bytes,'looping-data.doc','doc')
 t.diagnostic(JSON.stringify({case:'fat-stream-loop',start,declaredBytes:bytes.readUInt32LE(entry+120),distinctReachableDataSectors:1,status:reply.status}))
 assert.equal(reply.status,400,'A repeated sector is not a complete 4096-byte stream')
})
test('P2C A XML validator must reject a mismatched closing root and non-XML suffix',async t=>{
 const outcomes=[]
 for(const [label,xml] of [['mismatched-root',containers.contentTypes(['word/document.xml',containers.WORD_MAIN]).replace('</Types>','</NotTypes>')],['trailing-content',containers.contentTypes(['word/document.xml',containers.WORD_MAIN])+'THIS IS NOT XML']]){
  const reply=await upload(containers.wordPackage({types:xml}),label+'.docx','docx');outcomes.push({label,status:reply.status})
 }
 t.diagnostic(JSON.stringify({case:'not-well-formed-package-xml',outcomes}))
 assert.ok(outcomes.every(o=>o.status===400),'Strict package metadata parser should reject malformed XML')
})
