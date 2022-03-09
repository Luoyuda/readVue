
import { ref, computed, watch, onUpdated, onMounted } from 'vue'
export function useCount(){
  const count = ref(0)
  const add = () => count.value++
  const msg = computed(() => `count is ${count.value}`)
  watch(count, (newValue, oldValue) => {
    console.log(`${newValue} - ${oldValue}`)
    console.log(`count is ${count.value}`)
  })
  onUpdated(() => {
    console.log(`onUpdated - ${count.value}`)
  })
  onMounted(() => {
    console.log(`onMounted - ${count.value}`)
  })
  return {
    count,
    add,
    msg
  }
}