# Watcher

那么现在万事俱备，会在哪里触发`getter`中的依赖收集 ?  `$mount` 的时候

```js
// 如果有 el 且浏览器环境，进行挂载操作
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}
```

`$mount` 实际上是执行`mountComponent`函数

```JS
// src/core/instance/lifecycle.js

export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  if (!vm.$options.render) {
    // 如果没有渲染函数 提供一个空的vnode节点渲染函数，开发模式下发出警告
    vm.$options.render = createEmptyVNode
  }
  // 触发beforeMount钩子
  callHook(vm, 'beforeMount')

  /* 忽略开发模式性能相关的埋点 */
  let updateComponent = () => {
    // vm._render() 返回一个 vnode
    vm._update(vm._render(), hydrating)
  }

  // 我们在观察者的构造函数中将它设置为 vm._watcher
  // 因为观察者的初始补丁可能会调用 $forceUpdate （例如在子
  // 组件的挂载钩子），它依赖于已定义的 vm._watcher
  // 在这里创建一个watcher对象进行观察
  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
    // 这里lazy = false 所以在Watcher中会调用this.get()求值
    // get 方法会执行 pushTarget(this) 则将 watcher 绑定到了 Dep.target 上
  }, true /* isRenderWatcher */)
  hydrating = false

  // 手动挂载实例，调用自身挂载 触发钩子
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}
```

现在通过`computed`深入看下 `Watcher`，我们知道计算属性一般是依赖于我们`data` 中的值做的惰性更新，在之前的代码中，我们知道是通过`initComputed`去初始化计算属性的，接着往下看

```js
// src/core/instance/state.js
function initComputed (vm: Component, computed: Object) {
  const watchers = vm._computedWatchers = Object.create(null)
  for (const key in computed) {
    const userDef = computed[key]
    // 求值函数
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    // 为每一个内部属性都创建一个观察者实例 { lazy: true }
    watchers[key] = new Watcher(
      vm,
      getter || noop,
      noop,
      computedWatcherOptions
    )
    // 这里把每个计算属性绑定到vm上
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    }
  }
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  // 处理设值函数
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  // 最后把属性绑定到vm上
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

接下来就要去看`Watcher`到底干了些什么啦

```js
/* /src/core/observer/watcher.js */
import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 *一个观察者解析一个表达式，收集依赖，
 *并在表达式值更改时触发回调。
 *这用于 $watch() api 和指令
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  // deep 是否深度观察
  deep: boolean;
  user: boolean;
  // lazy 设置为true的话。第一个get的时候才计算值，初始化时不计算
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function, // 表达式或方法
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    // 绑定传入的组件实例
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    // 把组件实例的watchers中添加当前实例
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      // 不传配置 默认为 false
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set() // 避免依赖更新时 求值产生重复依赖
    this.newDepIds = new Set() // 避免求值过程中的重复依赖
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * 求值函数，收集依赖
   */
  get () {
    // Dep.target = 当前实例
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 求值函数中 触发 this.name 时
      // 触发依赖收集，此时Dep.target = 当前实例 
      // name 属性上的 dep.depend() 当前 实例会调用 addDep(dep)
      // 
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      // 清空
      popTarget()
      this.cleanupDeps()
    }
    // 返回值
    return value
  }

  /**
   * 添加依赖
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      // 两次去重避免 this.name + this.name 这种情况
      if (!this.depIds.has(id)) {
        // 订阅变化
        dep.addSub(this)
      }
    }
  }

  /**
   * 清理依赖收集
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
    触发更新
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }
  ...
}

```

![image-20220307175640145](README.assets/image-20220307175640145.png)

配合着图再走一遍流程