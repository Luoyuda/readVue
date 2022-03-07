import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'

// 绑定全局方法到 Vue 构造函数中
initGlobalAPI(Vue)

// SSR 相关

Vue.version = '__VERSION__'

export default Vue
