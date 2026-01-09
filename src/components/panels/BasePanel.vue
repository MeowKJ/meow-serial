<script setup>
/**
 * 基础面板组件
 * 提供统一的面板布局和折叠功能
 */
import { ref, provide } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  width: {
    type: String,
    default: 'w-80'
  },
  closable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])

// 折叠状态管理
const collapsedSections = ref({})

const toggleSection = (section) => {
  collapsedSections.value[section] = !collapsedSections.value[section]
}

const isCollapsed = (section) => {
  return collapsedSections.value[section] ?? true // 默认折叠
}

const setCollapsed = (section, collapsed) => {
  collapsedSections.value[section] = collapsed
}

// 提供给子组件使用
provide('panelCollapse', {
  toggle: toggleSection,
  isCollapsed,
  setCollapsed
})

defineExpose({
  toggleSection,
  isCollapsed,
  setCollapsed
})
</script>

<template>
  <aside :class="[width, 'bg-cat-card border-l border-cat-border flex flex-col shrink-0 overflow-hidden']">
    <!-- 标题栏 -->
    <div class="h-12 px-4 flex items-center justify-between border-b border-cat-border shrink-0">
      <span class="font-medium flex items-center gap-2">
        <span v-if="icon">{{ icon }}</span>
        {{ title }}
      </span>
      <button v-if="closable" @click="$emit('close')" class="text-cat-muted hover:text-cat-text p-1">
        ✕
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-y-auto">
      <slot></slot>
    </div>

    <!-- 底部插槽 -->
    <div v-if="$slots.footer" class="border-t border-cat-border">
      <slot name="footer"></slot>
    </div>
  </aside>
</template>
