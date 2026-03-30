<script setup>
import { computed, ref } from 'vue'
import { usePortsStore } from '../stores/ports'

const props = defineProps({
  widget: Object
})

const portsStore = usePortsStore()
const isPressed = ref(false)

// 点击发送命令到第一个已连接端口
const handleClick = async () => {
  isPressed.value = true

  if (props.widget.command && portsStore.anyConnected) {
    const target = portsStore.ports.find(p => p.connected)
    if (target) {
      await portsStore.sendToPort(target.id, props.widget.command, {
        appendCR: props.widget.appendCR === true,
        appendLF: props.widget.appendLF !== false,
        isHex: props.widget.isHex || false
      })
    }
  }

  setTimeout(() => {
    isPressed.value = false
  }, 150)
}

// 按钮样式
const buttonStyle = computed(() => props.widget.style || 'primary')
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
      :disabled="!portsStore.anyConnected"
      :class="[
        'w-full h-full max-h-[60px] rounded-xl font-medium text-white transition-all duration-150',
        'bg-gradient-to-r shadow-lg flex items-center justify-center gap-2',
        styles[buttonStyle] || styles.primary,
        isPressed ? 'scale-95 opacity-90' : 'hover:scale-[1.02] hover:shadow-xl',
        !portsStore.anyConnected ? 'opacity-50 cursor-not-allowed' : ''
      ]"
    >
      <span>{{ widget.label || '发送喵' }}</span>
      <span>🐾</span>
    </button>
  </div>
</template>
