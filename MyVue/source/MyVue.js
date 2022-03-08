import { pushTarget, popTarget, Dep } from './Dep';
import { observe } from './Observer';
import { Watcher } from './Watcher';
import { compiler } from './Compiler'

export default function MyVue(options){
  // vm 指向自己
  const vm = this.vm  = this
  // 使用$options存下入参
  vm.$options = options
  // 初始化 data
  initState(vm)
  // 初始化计算属性
  initComputed(vm)
  // 初始化观察属性
  initWatch(vm)
  // 挂载
  if(vm.$options.el){
    vm.$mount()
  }
}

// 初始化数据
function initState(vm){
  // 这里取出 fn
  const fn = vm.$options.data
  const data = vm._data = getData(fn, vm)

  // 代理
  for (const key of Object.keys(data)) {
    proxy(vm, '_data', key)
  }

  // 观测数据
  observe(data)
  return vm
  // 获取 data
  function getData(data, vm){
    if(typeof data !== 'function') return {}
    // 这里是清空 Dep.target 令其为 null
    pushTarget()
    try {
      return data.call(vm, vm)
    } catch (error) {
      console.log(error)
    } finally {
      // 弹出 null 值
      popTarget()
    }
  }
  // 代理 
  // vm._data.name => vm.name 
  // vm.name = vm._data.name = val
  function proxy(target, sourceKey, key){
    Object.defineProperty(target, key, {
      get(){
        return this[sourceKey][key]
      },
      set(val){
        this[sourceKey][key] = val
      },
      enumerable: true,
      configurable: true
    })
  }
}

// mount
MyVue.prototype.$mount = function(){
  const vm = this
  vm.$el = query(vm.$options.el)
  // 创建实例
  new Watcher(vm, () => {
    console.log('渲染')
    vm._update()
  })
  return vm
  // 获取el进行挂载
  function query(el) {
    if (typeof el === 'string'){
        return document.querySelector(el)
    }
    return el
  }
}
MyVue.prototype._update = function(){
  const vm = this
  const el = vm.$el
  // 实际上这里会去patch vNode 这里直接简单点替换模板了
  el.innerHTML = compiler(vm)
}

// 计算属性相关
function initComputed(vm){
  // 获取计算属性
  const computed = vm.$options.computed || Object.create(null)
  // 初始化watcher实例的容器
  let watcher = vm._watcherComputed = Object.create(null)
  for (const [key, userDef] of Object.entries(computed)) {
    // 创建 watcher 实例
    watcher[key] = new Watcher(vm, userDef, () => {}, { lazy: true })
    // 在 vm 实例创建对应属性和取值函数，进行依赖收集和数据更新
    Object.defineProperty(vm, key, {
      // 这里用了个闭包保存了引用
      get:((vm, key) => {
        let watcher = vm._watcherComputed[key]
        return function(){
          if(watcher){
            if(watcher.dirty){
              // 如果有需要更新再进行更新操作
              watcher.evalValue()
            }
            if(Dep.target){
              // 依赖收集
              watcher.depend()
            }
            // 返回值
            return watcher.value
          }
        }
      })(vm, key)
    })
  }
}

// 观察方法
MyVue.prototype.$watch = function(key, handler){
  let vm = this
  // 直接创建一个 watcher 实例
  const watcher = new Watcher(vm, key, handler)
  // immediate
  handler.call(vm, watcher.value);
  return
}

function initWatch(vm){
  const watch = vm.$options.watch || Object.create(null)
  // 监听每一项
  for (const [key, handler] of Object.entries(watch)){
    vm.$watch(key, handler)
  }
}
