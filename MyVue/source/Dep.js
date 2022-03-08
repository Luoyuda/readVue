// 唯一id
let id = 0
export class Dep {
  constructor(){
    this.id = id++
    // 订阅数组
    this.subs = []
  }
  addSub(watcher){
    // 添加一个Watcher实例到订阅数组中
    this.subs.push(watcher)
  }
  removeSub(watcher){
    // 从订阅数组中删除某个Watcher实例
    this.subs = this.subs.filter(w => w !== watcher)
  }
  depend(){
    // 依赖收集
    if(Dep.target){
      // 在当前的Watcher实例中添加当前dep实例
      Dep.target.addDep(this)
    }
  }
  notify(){
    // 通知watcher更新
    this.subs.forEach(sub => sub.update())
  }
}
// 用于标识全局唯一的Watcher实例
Dep.target = null
// Dep.target栈 初始化父组件 -> 初始化子组件 -> 子组件完成观测，弹出 -> 父组件完成观测
const stack = []
// push Watcher 实例
export function pushTarget(target){
  stack.push(target)
  Dep.target = target
}
// pop Watcher实例
export function popTarget(){
  stack.pop()
  Dep.target = stack[stack.length - 1]
}
