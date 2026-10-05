'use strict'
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),temporary=path.join(__dirname,'codex-review-p2c-tmp');fs.mkdirSync(temporary,{recursive:true});os.tmpdir=()=>temporary
const ref=process.env.REVIEW_REF||'523c50d';assert.ok(['523c50d','f38d8c4'].includes(ref))
if(ref!=='523c50d'){
 const tree=execFileSync('git',['ls-tree','-r',ref,'--','api/src'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean).map(l=>{const [meta,file]=l.split('\t');return{oid:meta.split(' ')[2],file}})
 const packed=execFileSync('git',['cat-file','--batch'],{cwd:root,input:tree.map(e=>e.oid).join('\n')+'\n',maxBuffer:60*1024*1024}),map=new Map();let at=0
 for(const entry of tree){const end=packed.indexOf(10,at),head=packed.toString('utf8',at,end).split(' '),length=Number(head[2]);assert.equal(head[0],entry.oid);assert.equal(head[1],'blob');at=end+1;map.set(path.resolve(root,entry.file).toLowerCase(),packed.subarray(at,at+length));at+=length+1}
 const original=fs.readFileSync;fs.readFileSync=function(file,options){const key=typeof file==='string'?path.resolve(file).toLowerCase():null,bytes=key&&map.get(key);if(bytes){const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes)}return original.apply(this,arguments)}
 console.log('REVIEW_PROGRESS '+JSON.stringify({inMemoryProductRef:ref,sourceFiles:tree.length}))
}
