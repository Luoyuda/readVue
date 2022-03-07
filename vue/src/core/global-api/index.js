/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // 忽略
  if (process.env.NODE_ENV !== 'production') {}
  // 添加一个config 对象
  const configDef = {}
  configDef.get = () => config
  Object.defineProperty(Vue, 'config', configDef)

  // 暴露一些 util 上的方法
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }
  // set、del、nextTick类方法
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 暴露 observable 方法
  Vue.observable = (obj) => {
    observe(obj)
    return obj
  }
  
  Vue.options = Object.create(null)
  // 这里初始化 components directives filters 的值为空对象、方便进行后续扩展
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  Vue.options._base = Vue
  // 添加内置组件 KeepAlive
  extend(Vue.options.components, builtInComponents)
  // 添加 Vue.use 注册插件
  initUse(Vue) 
  // 添加 Vue.mixin 混入
  initMixin(Vue)
  // 添加 Vue.extend 继承
  initExtend(Vue)
  // 注册 Vue.component Vue.directive Vue.filter 把注册的组件放入对应的 components directives filters 中
  initAssetRegisters(Vue)
}
