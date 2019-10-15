// 动态加载yml实例
// 当作为项目运行时，在 server 中引用此文件进行项目初始化。
// 当作为Plugin运行时，@steedos/core 自动引用此文件作为插件初始化。

import {getObject, addRouter, addObjects, addApps, addMethod, addTrigger} from '@steedos/objectql';

const express = require('express');

// 加载 objects 到指定数据源
addObjects('default', './objects/*.object.yml')

// 加载 app
addApps('./objects/*.app.yml')

// 给 object 动态添加 methods
addMethod('devhub_users', 'getUser', (res, rep) => {
    console.log('METHOD: getUser')
    res.end(getObject("devhub_users").findOne("me"))
})

// 给 object 动态添加 trigger
addTrigger('devhub_users', 'beforeInsert', () =>{
    console.log('TRIGGER: beforeInsert')
})

// 给 object 动态添加 action
addAction('devhub_users', 'helloAction', {
    label: 'Hello',
    visible: true,
    on: 'server',
    todo: () => {
        console.log('TRIGGER: beforeInsert')
    }
})

const router = express.Router();
// 在 server 中通过 objectql.setApp(app) 初始化 express 。
// 如果 express 还未初始化，则缓存所有router。如果已初始化，则直接调用 app.use
addRouter('/customRouter', router);