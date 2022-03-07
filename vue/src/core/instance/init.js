/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
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
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
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
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    // 这里递归的去取出所有父类的options, 并合并到当前
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    // 如果存在缓存,则直接返回
    if (superOptions !== cachedSuperOptions) {
      // 如果父类的选项发生变化,需要重新合并父类options
      Ctor.superOptions = superOptions
      // 检查是否有任何后期修改/附加的选项 (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // 更新配置
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 将父类上的options都合并到当前options
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        // 如果指定了'name'在组件容器中注册下自己
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}
// 检查是否需要修改
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
/*
一般两种方式创建 Vue 组件
  new Vue(options)
通过继承Vue和注入options创建一个新的类，此时就需要执行此方法
  const NewVue = Vue.extend(options)
  new NewVue()
*/ 