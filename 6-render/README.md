# 模板编译

模板编译入口在`$mount`中

```JS
// src/platform/web/entry-runtime-with-compiler
const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  const options = this.$options
  if (!options.render) {
    // 解析模板
    let template = options.template
    // 将模板处理成字符串
    if (template) {
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        return this
      }
    } else if (el) {
      template = getOuterHTML(el)
    }
    if (template) {
      // 生成render函数
      const { render, staticRenderFns } = compileToFunctions(template, {
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns
    }
  }
  return mount.call(this, el, hydrating)
}

```

代码中可以看出编译模板之后才执行原来的`$mount`方法

接着看 `compileToFunctions` 函数

```JS
// /src/platforms/web/compiler/index.js
import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
```

顺着 `createCompiler` 接着找

```js
// src/compiler
import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

//`createCompilerCreator` 允许创建使用替代的编译器
// parser/optimizer/codegen，例如 SSR 优化编译器。
// 这里我们只是使用默认部分导出一个默认编译器。
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
```

`createCompilerCreator`

```js
// src/platforms/web/entry-runtime-with-compiler.js
import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'

export function createCompilerCreator (baseCompile: Function): Function {
  return function createCompiler (baseOptions: CompilerOptions) {
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      ...
      // 通过baseCompile进行模板编译 由之前的代码可以看出返回结果为
      /*
      {
        ast, // 抽象语法树
        render: code.render, // render字符串
        staticRenderFns: code.staticRenderFns // 编译辅助函数
      }
      */
      const compiled = baseCompile(template.trim(), finalOptions)
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
```

千辛万苦终于拿到`render`函数，这里之所以那么绕时因为在不同平台下都会有编译过程，编译过程中的 `baseOptions` 会有所不同，而编译过程会多次执行，但是在同一平台下的编译配置优势相同的，为了不让这些配置在每次编译过程中通过参数传入，这里使用了柯里化计数实现了`baseOptions`的保留，通过`createCompilerCreator(baseCompile)` 的方法把真正的编译过程和其他逻辑剥离开。

编译的入口其实为

```js
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 解析模板字符串生成 AST
  const ast = parse(template.trim(), options)
  // 优化语法树
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  // 生成目标代码
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
```

 ## parse 生成AST

```js


/**
 * 把HTML转化成AST抽象语法树.
 */
export function parse (
  template: string,
  options: CompilerOptions
): ASTElement | void {
  /* 这一段为获取平台配置跟定义方法 */ 
  ...
  // 这里开始解析HTML模板
  const stack = [] // 这个栈暂存对parseHTML返回的结果
  let root // 语法树的根节点
  // 通过 parseHTML 循环解析 template 用正则做各种匹配，直到整个 template 被解析完毕
  parseHTML(template, {
    // 上面是一些配置
    // 匹配到开始标签时触发
    start (tag, attrs, unary, start, end) {
      // ...往栈中放节点，生成结构
    },
    // 匹配到结束标签时触发
    end (tag, start, end) {
     // 闭合标签出栈
    },

    chars (text: string, start: number, end: number) {
     // 处理文本内容
    },
    // 匹配到注释节点触发
    comment (text: string, start, end) {
     // 处理注释节点
    }
  })
  return root
}
```

![img](README.assets/915af73efa81f87f9263c480f57ce6e7.png)

## optimize

模板生成为`AST`树后，会对树进行优化。主要是对于一些首次渲染后不会再变化的数据可以在`patch`中跳过比对

```js
// src/compiler/optimizer.js
/**
 * 优化器的目标：遍历生成的模板 AST 树
 * 并检测纯静态的子树，即
 * 永远不需要改变的 DOM。
 *一旦我们检测到这些子树，我们可以：
 *1. 将它们提升为常量，这样我们就不再需要在每次重新渲染时为它们创建新节点；
 *2.在补丁过程中完全跳过它们
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  isPlatformReservedTag = options.isReservedTag || no
  // 标记所有静态节点 递归调用
  // 静态节点：
  /*
  	1. 非表达式
  	2. 纯文本节点
  	3. 没有v-if 、v-for
  	4. 非内置组件
  	5. 是平台保留标签
  */
  markStatic(root)
  // 标记静态根 
  /*
  	1. 已经是静态节点，且有子节点
  */
  markStaticRoots(root, false)
}
```

整个 `AST 树`中的每一个元素节点标记了 `static` 和 `staticRoot`

## generate

`codegen` 是一个有限自动机DFA，他会从一个状态开始，根据条件向下一个状态转移。

```JS
export function generate (
  ast: ASTElement | void,
  options: CompilerOptions
): CodegenResult {
  const state = new CodegenState(options)
  // fix #11483, Root level <script> tags should not be rendered.
  const code = ast ? (ast.tag === 'script' ? 'null' : genElement(ast, state)) : '_c("div")'
  return {
    render: `with(this){return ${code}}`,
    staticRenderFns: state.staticRenderFns
  }
}

export function genElement (el: ASTElement, state: CodegenState): string {
  if (el.parent) {
    el.pre = el.pre || el.parent.pre
  }

  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state)
  } else if (el.once && !el.onceProcessed) {
    return genOnce(el, state)
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state)
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    return genChildren(el, state) || 'void 0'
  } else if (el.tag === 'slot') {
    return genSlot(el, state)
  } else {
    // component or element
    let code
    if (el.component) {
      code = genComponent(el.component, el, state)
    } else {
      let data
      if (!el.plain || (el.pre && state.maybeComponent(el))) {
        data = genData(el, state)
      }

      const children = el.inlineTemplate ? null : genChildren(el, state, true)
      code = `_c('${el.tag}'${
        data ? `,${data}` : '' // data
      }${
        children ? `,${children}` : '' // children
      })`
    }
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code)
    }
    return code
  }
}
```

