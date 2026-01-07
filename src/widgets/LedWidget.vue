<script setup>
import { computed } from 'vue'
import { useSerialStore } from '../stores/serial'
import { useThemeStore } from '../stores/theme'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()
const themeStore = useThemeStore()

// 默认LED配置 - 使用主题颜色
const defaultLeds = computed(() => {
  const colors = themeStore.colors
  return [
    { name: 'PWR', color: colors.success, threshold: 0, channel: 0 },
    { name: 'RUN', color: colors.info, threshold: 30, channel: 0 },
    { name: 'ERR', color: colors.error, threshold: 80, channel: 0 }
  ]
})

// 获取LED配置
const leds = computed(() => {
  return props.widget.leds || defaultLeds.value
})

// 判断LED是否亮起
const isLedOn = (led) => {
  const channel = store.channels[led.channel]
  if (!channel) return false
  return channel.value >= led.threshold
}
</script>

<template>
  <div class="w-full h-full flex items-center justify-center gap-5 px-2">
    <div 
      v-for="(led, index) in leds" 
      :key="index"
      class="flex flex-col items-center gap-1.5"
    >
      <!-- LED灯 -->
      <div 
        class="w-5 h-5 rounded-full transition-all duration-200"
        :style="{
          backgroundColor: isLedOn(led) ? led.color : 'var(--cat-surface)',
          boxShadow: isLedOn(led) ? `0 0 12px ${led.color}, 0 0 24px ${led.color}40` : 'none'
        }"
      ></div>
      
      <!-- 标签 -->
      <span class="text-[10px] text-cat-muted">{{ led.name }}</span>
    </div>
  </div>
</template>
