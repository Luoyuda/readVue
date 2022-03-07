# 看Vue如何合并配置

合并选项的代码

```js
// 合并全局的 options 到组件 $options 中
vm.$options = mergeOptions(
    resolveConstructorOptions(vm.constructor),
    options || {},
    vm
)
```

这里有两个方法 `resolveConstructorOptions`和`mergeOptions`

先看第一个

```js
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

// 一般两种方式创建 Vue 组件
new Vue(options)
// 通过继承Vue和注入options创建一个新的类，此时就需要执行此方法
const NewVue = Vue.extend(options)
new NewVue()
```

第二个

```js
/**
  确保所有 props 选项语法都标准化为
  基于对象的格式。
 */
function normalizeProps (options: Object, vm: ?Component) {
  const props = options.props
  if (!props) return
  // 初始化对象
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    // ['name'] => { name: { type: null } }
    // 使用数组语法时，props 必须是字符串
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val) // font-size => fontSize
        res[name] = { type: null } // 字符串默认 type = null
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    // { name: { type: string } } -> val = 纯对象不做处理
    // { name: ['string'] || string } -> { name: { type: ["string"] || string } }
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}

/**
 * 确保inject为对象格式 { key: { from: '' } }
 */
function normalizeInject (options: Object, vm: ?Component) {
  const inject = options.inject
  if (!inject) return
  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

/**
 * 如果指令是一个函数，处理为对象模式 { bind: function, update: function }
 */
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

/**
  将两个options合并为一个新的options
  用于实例化和继承的核心
 */
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  // 忽略
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child)
  }

  // 如果child函数的话，取函数.options
  if (typeof child === 'function') {
    child = child.options
  }

  // 合并props 统一格式为 { key: { type: type || type[] } }
  normalizeProps(child, vm)
  // 处理Inject  { key: { from: '' } }
  normalizeInject(child, vm)
  // 处理指令 如果指令是一个函数，处理为对象模式 { bind: function, update: function }.
  normalizeDirectives(child)

  // 合并 extends 和 mixins
  if (!child._base) {
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }

  const options = {}
  let key
  // 这里开始进行合并，根据strats上的规则来进行合并，如果没有特殊要求，则默认子类覆盖父类
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  function mergeField (key) {
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}
```

总结起来就是

	1. 如果存在父类，将父类上的`options`先合并到当前的`options`中
	1. 接下去归一化处理`props` `inject` `directive`
	1. 合并`extends` `mixins`
	1. 根据`strats[name]`上的函数进行合并操作，默认子类覆盖父类