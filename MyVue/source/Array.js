// 取出原型方法
export const arrayMethods = Object.create(Array.prototype)
// 劫持变动方法
export const methods = ['push', 'shift', 'pop', 'unshift', 'reverse', 'sort', 'splice']
// 遍历实现劫持
methods.forEach(method => {
  arrayMethods[method] = function (...args) {
    // 原方法执行
    const res = Array.prototype[method].apply(this, args)
    // 取出当前的 ob 实例
    const ob = this.__ob__
    // 通过方法/ 参数判断是否变动
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
    }
    if(inserted) {
      // 变动接着监听数组增加的项
      ob.observeArray(inserted)
    }
    // 通知变化
    ob.dep.notify()
    return res
  }
})

export function dependArray(value){
  for (let i = 0; i < value.length; i++) {
    const e = value[i];
    // 如果存在，直接收集依赖
    if(e && e.__ob__ && e.__ob__.dep){
      e.__ob__.dep.depend()
    }
    if(Array.isArray(e)){
      // 如果数组，接着递归
      dependArray(e)
    }
  }
}
