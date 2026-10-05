'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixtures=require('./fixtures/office-containers.cjs')
let f,token
before(async()=>{f=await require('./codex-review-p2d-fixture.cjs')('p2d_office');token=new(require('../node_modules/@nestjs/jwt').JwtService)({secret:process.env.JWT_SECRET}).sign({sub:f.admin.id,role:'super_admin',permissions:['*'],tokenVersion:0})},{timeout:120000})
after(async()=>{if(f)await f.close()})
async function upload(bytes,name){const form=new FormData();form.append('file',new Blob([bytes]),name);const r=await fetch('http://127.0.0.1:1/api/files/upload?entityType=document',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});return{status:r.status,body:await r.json()}}
test('P2B A genuine Word and Excel fixtures still upload with content hashes',async()=>{
 for(const [type,bytes] of [['docx',fixtures.wordPackage({deflate:true})],['xlsx',fixtures.excelPackage({deflate:true})]]){
  await f.setting('files.allowed_types',type);const r=await upload(bytes,'allowed.'+type);assert.equal(r.status,201);const [row]=await f.ds.query('SELECT sha256 FROM stored_files WHERE id=@0',[r.body.id]);assert.equal(row.sha256,require('node:crypto').createHash('sha256').update(bytes).digest('hex'))
 }
})
test('P2B A an XML comment must not override an actual macro document content type',async t=>{
 await f.setting('files.allowed_types','docx')
 const macro='application/vnd.ms-word.document.macroEnabled.main+xml'
 const actual=fixtures.contentTypes(['word/document.xml',macro])
 const commented=actual.replace('</Types>',`<!-- <Override PartName="/word/document.xml" ContentType="${fixtures.WORD_MAIN}"/> --></Types>`)
 const parts=xml=>fixtures.zip([['[Content_Types].xml',xml],['word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>']],{deflate:true})
 const control=await upload(parts(actual),'macro-control.docx');assert.equal(control.status,400)
 const r=await upload(parts(commented),'commented-macro.docx')
 t.diagnostic(JSON.stringify({case:'xml-comment-office-type',actualContentType:macro,controlStatus:control.status,commentStatus:r.status,storedMime:r.body.mime}))
 assert.equal(r.status,400,'A commented Override is not a declared part type; the actual declaration remains macro-enabled')
})
test('P2B A an OLE storage named WordDocument is not a document stream',async t=>{
 await f.setting('files.allowed_types','doc')
 const bytes=fixtures.ole(['WordDocument']);bytes[1024+128+66]=1 // storage object, NOT a stream (2)
 // Give the directory a root child and explicit no-sibling/no-child pointers.
 bytes.writeUInt32LE(1,1024+76)
 for(const at of [1024,1152]){bytes.writeUInt32LE(0xffffffff,at+68);bytes.writeUInt32LE(0xffffffff,at+72);if(at===1152)bytes.writeUInt32LE(0xffffffff,at+76)}
 const r=await upload(bytes,'storage-only.doc')
 t.diagnostic(JSON.stringify({case:'ole-storage-not-stream',entryKind:bytes[1218],status:r.status,mime:r.body.mime}))
 assert.equal(r.status,400,'OLE storage names cannot establish the Word document stream')
})
