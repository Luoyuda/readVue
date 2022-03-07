/* @flow */

import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// 初始化平台相关的配置
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// 注册内置指令和组件
extend(Vue.options.directives, platformDirectives) // v-show v-model
extend(Vue.options.components, platformComponents) // transition transitionGroup

// 如果不是浏览器，patch不进行任何操作
Vue.prototype.__patch__ = inBrowser ? patch : noop

// 如果有 el 且浏览器环境，进行挂载操作
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

if (inBrowser) {
  // devtools 代码 忽略 ...
}

export default Vue
