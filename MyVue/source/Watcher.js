import { pushTarget, popTarget } from './Dep';
import { util } from './Compiler';
// 唯一id
let id = 0
export class Watcher{
  constructor(vm, expOrFn, cb, opts = {}) {
    // watcher.vm 指向 vm 实例
    this.vm = vm
    this.id = ++id
    // 是否惰性 computed
    this.lazy = !!opts.lazy
    this.dirty = this.lazy
    // 数据变化后触发钩子 watch
    this.cb = cb || (() => {})
    // 取值函数
    this.getter = typeof expOrFn === 'function' ? expOrFn : () => {
      return util.getValue(vm, expOrFn)
    }
    this.depIds = new Set()
    this.newDepIds = new Set() // 避免求值过程中的重复依赖
    this.deps = []
    this.newDeps = []
    // 求值
    this.value = this.lazy ? undefined : this.get()
  }
  get(){
    // 触发依赖收集
    pushTarget(this)
    // 将自身作为全局Dep.target的watcher实例
    let value
    const vm = this.vm
    try {
      // 执行求值函数进行求值
      value = this.getter.call(vm, vm)
    } catch (error) { 
      console.log(error)
    } finally {
      // 清除 deps
      this.cleanupDeps()
      // 弹出
      popTarget()
    }
    return value
  }
  run(){
    // 执行求值
    let value = this.get()
    if(this.value !== value){
      // 如果值发生变动，触发 watch
      this.cb.call(this.vm, value, this.value)
      this.value = value
    }
  }
  addDep(dep){
    let id = dep.id
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
  update(){
    // 更新方法
    if(this.lazy){
      // computed 只有在 dirty 为真的时候去求值
      this.dirty = true
    }else{
      // 进入队列等待一起执行
      queueWatcher(this)
    }
  }
  evalValue(){
    // computed 的求值方法
    this.value = this.get()
    this.dirty = false
  }
  depend(){
    // computed 收集依赖触发
    let i = this.deps.length
    while(i--){
      this.deps[i].depend()
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
}

let has = {} // 去重
let queue = [] // 执行队列
function queueWatcher(watcher){
  let id = watcher.id
  if(!has[id]){
    has[id] = true
    // 收集watcher实例
    queue.push(watcher)
  }
  // 下一个微任务循环统一执行
  nextTick(flushQueue)
}
function flushQueue(){
  // 这里watch可能存在异步加入的情况
  for (let i = 0; i < queue.length; i++) {
    let watcher = queue[i]
    let id = watcher.id
    has[id] = null
    // 依次触发
    watcher.run()
  }
  // 重置
  queue = []
  has = {}
}

// 回调队列
let callbacks = []
function flushCallbacks(){
  callbacks.forEach(cb => cb())
  callbacks = []
}
function nextTick(flushQueue){
  callbacks.push(flushQueue)
  // Promise.resolve().then 创建一个微任务
  return Promise.resolve().then(flushCallbacks)
}