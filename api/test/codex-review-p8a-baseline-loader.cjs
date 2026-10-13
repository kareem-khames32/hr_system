'use strict'
const Module=require('node:module'),path=require('node:path'),ts=require('typescript')
const sources=require('./codex-review-p8a-baseline.cjs'), cache=new Map()
function baseline(file){
  if(cache.has(file)) return cache.get(file).exports
  const filename=path.resolve(__dirname,'../src',file), m=new Module(filename,module)
  m.filename=filename; m.paths=Module._nodeModulePaths(path.dirname(filename)); cache.set(file,m)
  const original=m.require.bind(m)
  m.require=function(id){
    if(id.startsWith('.')){
      const target=path.relative(path.resolve(__dirname,'../src'),path.resolve(path.dirname(filename),id+'.ts')).replaceAll('\\','/')
      if(Object.hasOwn(sources,target)) return baseline(target)
    }
    return original(id)
  }
  const js=ts.transpileModule(sources[file],{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.CommonJS,experimentalDecorators:true,emitDecoratorMetadata:true,esModuleInterop:true}}).outputText
  m._compile(js,filename); return m.exports
}
module.exports={baseline}
