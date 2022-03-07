/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */
// /src/core/observer/array.js
import { def } from '../util/index'
// 复制一份原型对象
const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)
// 被监听方法数组
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * 拦截变异方法并发出事件
 */
methodsToPatch.forEach(function (method) {
  // 缓存原方法
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    // 原型上重新定义方法
    const result = original.apply(this, args)
    // 取到实例
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 如果新增项，接着监听
    if (inserted) ob.observeArray(inserted)
    // 通知！
    ob.dep.notify()
    return result
  })
})
