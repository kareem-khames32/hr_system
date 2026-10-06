'use strict'
// Read-only commit snapshot: evaluate Part A's four changed server modules at a66d0c9 in memory.
// Runtime, database guard and fixtures remain identical. No checkout or tracked-file write.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),Module=require('node:module'),ts=require('../node_modules/typescript')
require('./codex-review-p2t-regression-preload.cjs')
const root=path.resolve(__dirname,'../..'),files=['api/src/requests/request-audience.ts','api/src/requests/requests.service.ts','api/src/settings/settings.controller.ts','api/src/payroll/typed-deductions.service.ts']
const sources=new Map(files.map(file=>[path.resolve(root,file).toLowerCase(),ts.transpileModule(cp.execFileSync('git',['show','a66d0c9:'+file],{cwd:root,encoding:'utf8'}),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,emitDecoratorMetadata:true,esModuleInterop:true}}).outputText]))
const compile=Module.prototype._compile
Module.prototype._compile=function(source,filename){return compile.call(this,sources.get(path.resolve(filename).toLowerCase())??source,filename)}
console.log('REVIEW_PROGRESS Part A server modules read from a66d0c9; evaluated only in memory')
