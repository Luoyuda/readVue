import MyVue from './source/MyVue'

const vm = window.vm = new MyVue({
  el: '#app',
  template: `
    <p>name: {{name}}</p>
    <p>name: {{computedName}}</p>
    <p>name: {{watchName}}</p>
    <p>inner.name: {{inner.name}}</p>
    <p>dataList[0].name: {{dataList[0].name}}</p>
    <p>list: {{list.join(',')}}</p>
  `,
  data(){
    return {
      name: 'xy',
      inner: {
        name: 'inner-xy'
      },
      list: [0, 1],
      dataList: [{ name: 'deep-xy'}],
      watchName: '',
    }
  },
  computed: {
    computedName(){
      return `computed ${this.name} ${this.name}`
    }
  },
  watch:{
    name(val){
      this.watchName = `watch ${val}`
    }
  }
});
document.getElementById('value').addEventListener('input', (e) => {
  const value = e.target.value
  vm.name = vm.inner.name = vm.dataList[0].name = value
})
document.getElementById('push').addEventListener('click', () => {
  vm.list.push(vm.list.length)
})
document.getElementById('pop').addEventListener('click', () => {
  vm.list.pop()
})