'use strict'
// Pin product reads to the committed snapshot; credentials remain in their original file and are never copied.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),snapshot=path.join(__dirname,'codex-review-round22-snapshot')
const virtualEnv=path.join(snapshot,'api/.env'),sourceEnv=path.join(root,'api/.env')
assert.equal(fs.existsSync(virtualEnv),false)
const read=fs.readFileSync
fs.readFileSync=function(file,...args){return read.call(this,typeof file==='string'&&path.resolve(file)===virtualEnv?sourceEnv:file,...args)}
const temp=path.join(__dirname,'codex-review-round22-tmp');fs.mkdirSync(temp,{recursive:true});os.tmpdir=()=>temp
