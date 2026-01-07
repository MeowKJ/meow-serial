<script setup>
import { ref } from 'vue'
import { useSerialStore } from '../stores/serial'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()
const isPressed = ref(false)

// 点击发送命令
const handleClick = async () => {
  isPressed.value = true
  
  if (props.widget.command && store.connected) {
    await store.send(props.widget.command, {
      appendCR: false,
      appendLF: true,
      isHex: props.widget.isHex || false
    })
  }
  
  setTimeout(() => {
    isPressed.value = false
  }, 150)
}

// 按钮样式
const buttonStyle = props.widget.style || 'primary'
const styles = {
  primary: 'from-cat-primary to-cat-secondary',
  success: 'from-green-500 to-emerald-500',
  warning: 'from-amber-500 to-orange-500',
  danger: 'from-red-500 to-rose-500'
}
</script>

<template>
  <div class="w-full h-full flex items-center justify-center p-2">
    <button
      @click="handleClick"
      :disabled="!store.connected"
      :class="[
        'w-full h-full max-h-[60px] rounded-xl font-medium text-white transition-all duration-150',
        'bg-gradient-to-r shadow-lg flex items-center justify-center gap-2',
        styles[buttonStyle] || styles.primary,
        isPressed ? 'scale-95 opacity-90' : 'hover:scale-[1.02] hover:shadow-xl',
        !store.connected ? 'opacity-50 cursor-not-allowed' : ''
      ]"
    >
      <span>{{ widget.label || '发送喵' }}</span>
      <span>🐾</span>
    </button>
  </div>
</template>
