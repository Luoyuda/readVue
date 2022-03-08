// 这里简单的做模板数据替换
const Reg = /\{\{((?:.|\r?\n)+?)\}\}/g

export const util = {
  getValue(vm, exp){
    let val
    eval(`val = vm.${exp}`)
    return val
  },
  compilerText(vm){
    return vm.$options.template.replace(Reg, (...args) => {
      return util.getValue(vm, args[1])
    })
  }
}
export function compiler(vm){
  return util.compilerText(vm)
}