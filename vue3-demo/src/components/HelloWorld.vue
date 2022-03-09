<script>
import { useCount } from "./count"
import { defineComponent } from 'vue'
export default defineComponent({
  setup(){
    return useCount()
  }
})
</script>
<template>
  <button type="button" @click="add">{{ msg }}</button>
</template>