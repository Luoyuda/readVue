function MyVue(options){
  const vm = this
  this.vm = vm
  vm.$options = options
  initState(vm)
  new Watcher(vm, vm => vm.name)
  function initState(vm){
    initData(vm)

    function initData(vm){
      let data = vm.$options.data
      data = vm._data = getData(data, vm)
      const keys = Object.keys(data)
      let i = keys.length
      while (i--){
        const key = keys[i]
        proxy(vm, '_data', key)
      }
      observe(data)
    }

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

    function getData(data, vm){
      pushTarget()
      try {
        return data.call(vm, vm)
      } catch (error) {
        console.log(error)
      } finally {
        popTarget()
      }
    }
  }
}


function observe(value){
  let ob = new Observer(value);
  return ob
}

class Observer{
  value;
  dep;
  constructor(value){
    this.value = value
    this.dep = new Dep()
    Object.defineProperty(value, '__ob__', {
      value: this,
      enumerable: false,
      writable: true,
      configurable: true
    })
    this.walk(value)
  }
  walk(obj){
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      console.log(keys[i])
      defineReactive(obj, keys[i])
    }
  }
}

function defineReactive(obj, key){
  const dep = new Dep()
  const property = Object.getOwnPropertyDescriptor(obj, key)
  const getter = property && property.get
  const setter = property && property.set
  let val = obj[key]

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get(){
      const value = getter ? getter.call(obj) : val
      if(Dep.target){
        dep.depend()
      }
      return value
    },
    set(newVal){
      const value = getter ? getter.call(obj) : val
      if(value === newVal) return
      if(setter){
        setter.call(obj, newVal)
      }else{
        val = newVal
      }
      dep.notify()
    }
  })
}

class Watcher{
  constructor(vm, expOrFn){
    this.vm = vm
    this.getter = expOrFn
    this.deps = []
    this.get()
  }
  get(){
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (error) { 
      
    } finally {
      popTarget()
    }
    return value
  }
  addDep(dep){
    dep.addSub(this)
  }
  update(){
    console.log('update')
  }
}

let uid = 0
class Dep {
  constructor(){
    this.id = uid++
    this.subs = []
  }
  addSub(watcher){
    this.subs.push(watcher)
  }
  removeSub(watcher){
    this.subs = this.subs.filter(w => w !== watcher)
  }
  depend(){
    if(Dep.target){
      Dep.target.addDep(this)
    }
  }
  notify(){
    this.subs.forEach(sub => sub.update())
  }
}
Dep.target = null
const targetStack = []
function pushTarget(target){
  targetStack.push(target)
  Dep.target = target
}
function popTarget(){
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}


window.vm = new MyVue({
  data(){
    return {
      name: 'xy'
    }
  }
});
console.log(vm.name)
vm.name = 'xy-2'
console.log(vm.name)
