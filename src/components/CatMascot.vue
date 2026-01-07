<script setup>
import { ref } from 'vue'

const props = defineProps({
  connected: Boolean
})

const message = ref('')
const messages = {
  idle: ['点击连接串口喵~', '有什么需要帮助的喵?', '试试添加控件喵!'],
  connected: ['连接成功喵!', '数据流动中喵~', '一切正常喵!']
}

const cycleCatMessage = () => {
  const msgs = props.connected ? messages.connected : messages.idle
  message.value = msgs[Math.floor(Math.random() * msgs.length)]
  setTimeout(() => message.value = '', 3000)
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-40">
    <div v-if="message"
      class="absolute bottom-full right-0 mb-2 px-4 py-2 bg-cat-card border border-cat-border rounded-2xl rounded-br-none text-sm max-w-[200px] shadow-lg">
      {{ message }}
    </div>
    <div @click="cycleCatMessage"
      class="w-14 h-14 rounded-2xl bg-cat-card border border-cat-border flex items-center justify-center text-3xl cursor-pointer hover:scale-105 transition-transform shadow-lg"
      :class="connected ? 'animate-bounce' : ''" style="animation-duration: 2s">
      {{ connected ? '😸' : '🐱' }}
    </div>
  </div>
</template>
