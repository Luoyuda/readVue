
import { Dep } from './Dep';
import { arrayMethods, dependArray } from './Array';

// 观测数据
export function observe(value){
  // 如果非对象类型 或者已经完成观测过的对象忽略
  if(!value || typeof value !== 'object' || value.__ob__) return
  // new 一个 Observer 实例返回
  let ob = new Observer(value);
  return ob
}

export class Observer{
  constructor(value){
    // value => 指向 vm 实例
    this.value = value
    // new 一个 dep 实例
    this.dep = new Dep()
    // 给 vm 实例生成 __ob__属性指向当前ob实例，且不能被遍历
    Object.defineProperty(value, '__ob__', {
      value: this,
      enumerable: false,
      writable: true,
      configurable: true
    })
    // 如果是数组，走数组的观测方法
    if(Array.isArray(value)){
      // 将数组原型对象上的方法劫持后替换数组实例上的__proto__属性
      value.__proto__ = arrayMethods
      // 开始数组的依赖收集
      this.observeArray(value)
    }else{
      // 开始对对象每一项进行get/set劫持
      this.walk(value)
    }
  }
  walk(obj){
    for (const [key, val] of Object.entries(obj)) {
      // 设置为响应式数据
      defineReactive(obj, key, val)
    }
  }
  observeArray (items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

export function defineReactive(obj, key, val){
  // 每一个属性都生成一个 dep 实例
  const dep = new Dep()
  // 递归解决多层监听的问题
  let childOb = observe(val)

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get(){
      if(Dep.target){
        // 如果存在值，让当前的watcher订阅这个 dep 实例
        dep.depend()
        if(childOb){
          // 如果 childOb 是一个 ob 实例需要接着往下监听
          childOb.dep.depend();
          if(Array.isArray(val)){
            // 如果当前值为数组，则需要遍历递归增加依赖
            dependArray(val);
          }
        }
      }
      return val
    },
    set(newVal){
      if(val === newVal) return
      val = newVal
      // 如果变成对象接着监听
      childOb = observe(newVal)
      // 值变动，发出通知
      dep.notify()
    }
  })
}