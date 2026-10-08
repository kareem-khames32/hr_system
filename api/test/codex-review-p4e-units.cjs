'use strict'
const path=require('node:path')
Object.assign(process.env,{NODE_ENV:'test',JWT_SECRET:require('node:crypto').randomBytes(48).toString('hex'),DB_SYNCHRONIZE:'false'})
require('../node_modules/ts-node').register({project:path.join(__dirname,'../tsconfig.json'),transpileOnly:true})
require('./employee-privacy.test.cjs')
