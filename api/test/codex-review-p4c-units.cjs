'use strict'
const path=require('node:path')
require('../node_modules/ts-node').register({project:path.join(__dirname,'../tsconfig.json'),transpileOnly:true})
require('./employee-privacy.test.cjs')
