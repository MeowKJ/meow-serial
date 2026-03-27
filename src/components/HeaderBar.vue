<script setup>
import { useSerialStore } from '../stores/serial'
import { notify } from '../utils/notification'
import ThemeSwitcher from './ThemeSwitcher.vue'

const store = useSerialStore()

defineProps({
  isRecording: Boolean
})

defineEmits(['toggle-recording', 'show-widget-panel'])

// 保存布局
const saveLayout = () => {
  const layoutName = prompt('请输入布局名称:', `布局_${Date.now()}`)
  if (layoutName?.trim()) {
    const saved = store.saveNamedLayout(layoutName.trim())
    if (saved) {
      store.saveWorkspaceState()
      notify.success(`布局已保存到本地: ${layoutName.trim()}`)
      return
    }

    notify.error('布局保存失败')
  }
}

const loadLayout = () => {
  const layouts = store.listSavedLayouts()

  if (!layouts.length) {
    notify.info('本地还没有可加载的布局')
    return
  }

  const layoutList = layouts
    .map((layout, index) => `${index + 1}. ${layout.name} (${layout.widgetCount} 个控件)`)
    .join('\n')

  const selected = prompt(`请输入要加载的布局名称:\n${layoutList}`, layouts[0].name)
  if (!selected?.trim()) {
    return
  }

  const loaded = store.loadNamedLayout(selected.trim())
  if (loaded) {
    store.saveWorkspaceState()
    notify.success(`已加载本地布局: ${selected.trim()}`)
    return
  }

  notify.error(`未找到布局: ${selected.trim()}`)
}

// 截图
const takeScreenshot = () => {
  // 简单实现：截取整个页面
  notify.info('截图功能开发中喵~')
}
</script>

<template>
  <header class="h-12 bg-cat-card border-b border-cat-border flex items-center px-4 gap-4 shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-2">
      <div
        class="w-8 h-8 rounded-lg bg-gradient-to-br from-cat-primary to-cat-secondary flex items-center justify-center text-lg">
        🐱
      </div>
      <span class="font-semibold text-cat-text">喵喵的串口工具</span>
      <span class="text-xs px-2 py-0.5 bg-cat-surface rounded-full text-cat-muted">v2.0</span>
    </div>

    <!-- 工具栏 -->
    <div class="flex items-center gap-1 ml-6">
      <button @click="$emit('show-widget-panel')"
        class="cat-btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
        <span>🧩</span> 控件喵盒
      </button>
      <button @click="saveLayout" class="cat-btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
        <span>💾</span> 保存布局
      </button>
      <button @click="loadLayout" class="cat-btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
        <span>📁</span> 加载布局
      </button>
      <div class="w-px h-6 bg-cat-border mx-2"></div>
      <button @click="$emit('toggle-recording')"
        :class="['px-3 py-1.5 rounded-lg text-sm flex items-center gap-2', isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'cat-btn-secondary']">
        <span>{{ isRecording ? '⏹️' : '⏺️' }}</span> {{ isRecording ? '停止录制' : '录制喵' }}
      </button>
      <button @click="takeScreenshot" class="cat-btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
        <span>📸</span> 截图
      </button>
    </div>

    <!-- 主题切换器 -->
    <div class="ml-auto mr-4">
      <ThemeSwitcher />
    </div>

    <!-- 状态栏 -->
    <div class="flex items-center gap-4 text-sm">
      <!-- 连接状态 -->
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full transition-colors"
          :class="store.connected ? 'bg-green-400 animate-pulse' : (store.connecting ? 'bg-yellow-400 animate-pulse' : 'bg-cat-muted')"></span>
        <span :class="store.connected ? 'text-green-400' : 'text-cat-muted'">
          {{ store.connecting ? '连接中...' : (store.connected ? store.selectedPortName : '未连接') }}
        </span>
        <span v-if="store.connected" class="text-cat-muted">
          @ {{ store.baudRate }}
        </span>
      </div>
      
      <!-- 数据速率 -->
      <div class="text-cat-muted" v-if="store.connected">
        <span class="text-green-400">↓{{ (store.rxRate / 1000).toFixed(1) }}K/s</span>
        <span class="mx-1">|</span>
        <span class="text-blue-400">↑{{ (store.txRate / 1000).toFixed(1) }}K/s</span>
      </div>
      
      <!-- 浏览器兼容提示 -->
      <div v-if="!store.isSupported" class="flex items-center gap-1 text-yellow-400">
        <span>⚠️</span>
        <span class="text-xs">不支持 Web Serial</span>
      </div>
    </div>
  </header>
</template>
