'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
test('P2C A installed Office templates are read-only controls; in-memory document variants retain genuine package structure',async t=>{
 const root='C:/Program Files/Microsoft Office/root/Templates',files=[]
 const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isSymbolicLink())continue;if(entry.isDirectory())walk(p);else if(/\.(doc|dot|xls|dotx|xltx|pptx|potx)$/i.test(entry.name))files.push(p)}}
 walk(root)
 const ft=require('../src/files/file-type'),Zip=require('../node_modules/jszip'),count={}
 for(const ext of ['doc','dot','xls','dotx','xltx','pptx','potx']){
  const chosen=files.filter(n=>path.extname(n).toLowerCase()==='.'+ext).slice(0,5);count[ext]=chosen.length
  for(const filename of chosen){
   const bytes=fs.readFileSync(filename),expected=ext==='doc'||ext==='dot'?'doc':ext==='xls'?'xls':null;assert.equal(ft.detectFileType(bytes),expected,ext+' installed sample')
   if(ext==='dotx'||ext==='xltx'){
    const zip=await Zip.loadAsync(bytes),types=await zip.file('[Content_Types].xml').async('string')
    const from=ext==='dotx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml':'application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml'
    const to=ext==='dotx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'
    assert.ok(types.includes(from));zip.file('[Content_Types].xml',types.replace(from,to))
    assert.equal(ft.detectFileType(await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'})),ext==='dotx'?'docx':'xlsx')
   }
  }
 }
 assert.ok(count.dotx>0&&count.xltx>0)
 t.diagnostic(JSON.stringify({case:'installed-office-readonly',samples:count,sourceFilesUnmodified:true,templateTypeChangedOnlyInMemory:true}))
})
