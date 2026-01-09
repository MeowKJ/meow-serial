<script setup>
/**
 * 面板折叠区块组件
 */
import { inject, computed } from 'vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  defaultOpen: {
    type: Boolean,
    default: false
  },
  badge: {
    type: [String, Number],
    default: ''
  },
  badgeColor: {
    type: String,
    default: 'bg-cat-primary'
  },
  showIndicator: {
    type: Boolean,
    default: false
  },
  indicatorColor: {
    type: String,
    default: 'bg-green-400'
  }
})

// 从父面板注入折叠控制
const panelCollapse = inject('panelCollapse', null)

// 本地折叠状态（如果没有父面板提供）
import { ref } from 'vue'
const localCollapsed = ref(!props.defaultOpen)

const isCollapsed = computed(() => {
  if (panelCollapse) {
    const collapsed = panelCollapse.isCollapsed(props.id)
    // 如果是第一次访问，使用 defaultOpen
    if (collapsed === undefined) {
      panelCollapse.setCollapsed(props.id, !props.defaultOpen)
      return !props.defaultOpen
    }
    return collapsed
  }
  return localCollapsed.value
})

const toggle = () => {
  if (panelCollapse) {
    panelCollapse.toggle(props.id)
  } else {
    localCollapsed.value = !localCollapsed.value
  }
}
</script>

<template>
  <div class="border-b border-cat-border">
    <!-- 标题按钮 -->
    <button
      @click="toggle"
      class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors"
    >
      <div class="flex items-center gap-2">
        <span v-if="icon" class="text-cat-primary">{{ icon }}</span>
        <span class="font-medium text-sm">{{ title }}</span>
        <!-- 状态指示器 -->
        <span
          v-if="showIndicator"
          :class="[indicatorColor, 'w-2 h-2 rounded-full animate-pulse']"
        ></span>
        <!-- 徽章 -->
        <span
          v-if="badge"
          :class="[badgeColor, 'text-white text-[10px] px-1.5 py-0.5 rounded-full']"
        >
          {{ badge }}
        </span>
      </div>
      <span
        class="text-cat-muted text-xs transition-transform duration-200"
        :class="isCollapsed ? '' : 'rotate-180'"
      >
        ▼
      </span>
    </button>

    <!-- 内容区域 -->
    <div
      v-show="!isCollapsed"
      class="px-3 pb-3 space-y-2"
    >
      <slot></slot>
    </div>
  </div>
</template>
