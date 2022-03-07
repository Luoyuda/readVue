# Vue 初始化

当我们创建一个`Vue`实例时

1. 创建`Vue`类：构造函数、原型方法、静态方法
2. 创建`Vue`实例：初始化数据、事件、模板

```js
import Vue form 'vue'
const vueInstance = new Vue(options)
```

## Vue 类

通过查看打包内容可知，`Vue` 构造函数在 `src/platforms/web/entry-runtime.js` 中

```js
import Vue from './runtime/index'
export default Vue
```

接着看 `/src/platforms/web/runtime/index.js`

```js
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

```

这里实际上是对`Vue`构造函数进行一些基于原型上的扩展、平台代码、`devtools`代码的处理

接着进入  `import Vue from 'core/index'`

```JS
import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'

// 绑定全局方法到 Vue 构造函数中
initGlobalAPI(Vue)

// SSR 相关

Vue.version = '__VERSION__'

export default Vue
```

居然也不在这个文件中，接着往里面读 `./instance/index`

```js
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 如果不是New操作符调用弹出警告
  this._init(options)
}
// 往 prototype 上增加属性和方法
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
```

1.  `initMixin` ：`src/core/instance/init.js` 添加了 `_init`

   ```js
   initMixin(Vue)
   // src/core/instance/init.js
   export function initMixin (Vue: Class<Component>) {
     Vue.prototype._init = function (options?: Object) {
      // ...
     }
   }
   ```

2. `stateMixin`： `src/core/instance/state.js` 添加了 `$data`、`$props` 、`$watch`、`$set` 、`$delete`

   ```js
   stateMixin(Vue)
   // src/core/instance/state.js
   export function stateMixin (Vue: Class<Component>) {
     Object.defineProperty(Vue.prototype, '$data', dataDef)
     Object.defineProperty(Vue.prototype, '$props', propsDef)
     Vue.prototype.$set = set
     Vue.prototype.$delete = del
     Vue.prototype.$watch = function (){}
   }
   ```

3.  `eventsMixin`： `src/core/instance/event.js` 添加了 `$on`、`$off` 、`$once`、`$emit` 

   ```js
   eventsMixin(Vue)
   // src/core/instance/event.js
   export function eventsMixin (Vue: Class<Component>) {
     Vue.prototype.$on = function(){}
     Vue.prototype.$once = function(){}
     Vue.prototype.$off = function(){}
     Vue.prototype.$emit = function(){}
   }
   ```

4.  `lifecycleMixin`： `src/core/instance/lifecycle.js` 添加了 `_update`、`$forceUpdate` 、`$destroy`

   ```js
   lifecycleMixin(Vue)
   // src/core/instance/lifecycle.js
   export function lifecycleMixin (Vue: Class<Component>) {
     Vue.prototype._update = function () {}
     Vue.prototype.$forceUpdate = function () {}
     Vue.prototype.$destroy = function () {}
     }
   }
   ```

5.  `renderMixin`： `src/core/instance/render.js` 添加了 `RenderHelpers` 、`$nextTick`、`_render`

   ```js
   renderMixin(Vue)
   // src/core/instance/render.js
   export function renderMixin (Vue: Class<Component>) {
     installRenderHelpers(Vue.prototype)
     Vue.prototype.$nextTick = function () {}
     Vue.prototype._render = function () {}
   }
   ```

再回到 `initGlobalAPI`: `src/core/global-api/index.js`

```js
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
```

以上就是 `Vue`  类中的基本内容

![Vue类](2-Vue初始化\Vue类.png)

## new Vue()

由上面可知，`new Vue()` 时构造函数执行的方法实际为 `_init`

```js

  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this // vm 指向 实例自己
    // a uid
    vm._uid = uid++ // 唯一id

    // 开发模式收集性能数据时使用，忽略
    let startTag, endTag
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // 避免重复观测
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // 内部优化使用
      initInternalComponent(vm, options)
    } else {
      // 走到这里
      // 合并全局的 options 到组件 $options 中
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* 忽略 */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // 暴露自己
    vm._self = vm

    // 初始化生命周期相关的变量  _watcher、_inactive、_directInactive、_isMounted、_isDestroyed、_isBeingDestroyed
    // 设置父子组件引用关系，设置 $root $parent(定位第一个非抽象父节点) $children $refs
    initLifecycle(vm)

    // 注册事件 将父组件的监听器注册到子组件身上
    initEvents(vm)

    // 做一些 render 的准备工作
    initRender(vm)
    
    // 准备工作完成, 触发 beforeCreate 并进入 create 阶段
    callHook(vm, 'beforeCreate')

    // 在初始化 data/props 之前 处理依赖注入 provide / inject
    initInjections(vm)

    // data, props, computed 在这里初始化, Vue是如何实现数据响应化
    initState(vm)

    // 处理当前组件的 provide 选项
    initProvide(vm)

    // 完成create阶段, 触发 created 钩子
    callHook(vm, 'created')
    
    /* 忽略 */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    // 如果存在el自动挂载
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
```