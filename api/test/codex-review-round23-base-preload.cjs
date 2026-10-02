'use strict'
// Read-only baseline comparison. The tests remain in b01s-fix; all product modules resolve to base-162d50e.
// Load before the safety/ts-node harness so no target product module is already cached.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),{execFileSync}=require('node:child_process')
const current=path.resolve(__dirname,'../..'),baseline=path.resolve(current,'../base-162d50e')
const git=args=>execFileSync('git',['-c',`safe.directory=${baseline.replaceAll('\\','/')}`,...args],{cwd:baseline,encoding:'utf8'}).trim()
const head=git(['rev-parse','HEAD'])
if(!head.startsWith('162d50e'))throw Error('Incorrect baseline')
if(git(['diff','--name-only',head,'--','api/src','src']))throw Error('Baseline product changed')
const mappings=[['api/src','api/src'],['src','src']].map(([a,b])=>[path.join(current,a)+path.sep,path.join(baseline,b)+path.sep])
const resolve=Module._resolveFilename,loaded=new Set()
Module._resolveFilename=function(...args){
  const found=resolve.apply(this,args)
  if(typeof found==='string')for(const [from,to] of mappings)if(found.toLowerCase().startsWith(from.toLowerCase())){
    const target=to+found.slice(from.length)
    if(!fs.existsSync(target))throw Error('Missing baseline module')
    loaded.add(path.relative(baseline,target));return target
  }
  return found
}
process.on('exit',()=>console.log('CR23_BASELINE '+JSON.stringify({head,mappedProductModules:loaded.size,baselineReadOnly:true,
  baselineModules:Object.keys(require.cache).filter(p=>p.startsWith(path.join(baseline,'api/src')+path.sep)).length,
  currentProductModules:Object.keys(require.cache).filter(p=>p.startsWith(path.join(current,'api/src')+path.sep)).length})))
