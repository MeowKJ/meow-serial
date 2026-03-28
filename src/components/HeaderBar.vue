<script setup>
import { computed } from 'vue'
import { useSerialStore } from '../stores/serial'
import { usePortsStore } from '../stores/ports'
import { notify } from '../utils/notification'
import ThemeSwitcher from './ThemeSwitcher.vue'

const store = useSerialStore()
const portsStore = usePortsStore()

const connectedCount = computed(() => portsStore.ports.filter(port => port.connected).length)
const connectedPorts = computed(() => portsStore.ports.filter(port => port.connected))
const totalRateLabel = computed(() => {
  if (!portsStore.anyConnected) return ''
  return `↓${(portsStore.totalStats.rxRate / 1000).toFixed(1)}K/s · ↑${(portsStore.totalStats.txRate / 1000).toFixed(1)}K/s`
})

defineProps({
  tabs: {
    type: Array,
    default: () => []
  },
  activeTab: {
    type: String,
    default: 'canvas'
  },
  isPaused: Boolean,
  isRecording: Boolean
})

const emit = defineEmits(['set-tab', 'clear-all', 'show-widget-panel'])

const saveLayout = () => {
  const layoutName = prompt('请输入全局配置名称:', `工作区_${Date.now()}`)
  if (layoutName?.trim()) {
    const saved = store.saveNamedLayout(layoutName.trim())
    if (saved) {
      store.saveWorkspaceState()
      notify.success(`全局配置已保存到本地: ${layoutName.trim()}`)
      return
    }
    notify.error('全局配置保存失败')
  }
}

const loadLayout = () => {
  const layouts = store.listSavedLayouts()
  if (!layouts.length) {
    notify.info('本地还没有可加载的全局配置')
    return
  }
  const layoutList = layouts
    .map((layout, index) => `${index + 1}. ${layout.name} (${layout.widgetCount} 个控件)`)
    .join('\n')
  const selected = prompt(`请输入要加载的全局配置名称:\n${layoutList}`, layouts[0].name)
  if (!selected?.trim()) return
  const loaded = store.loadNamedLayout(selected.trim())
  if (loaded) {
    store.saveWorkspaceState()
    notify.success(`已加载全局配置: ${selected.trim()}`)
    return
  }
  notify.error(`未找到全局配置: ${selected.trim()}`)
}

const confirmClearAll = () => {
  const confirmed = confirm('确定要全局清空吗？这会清掉当前所有端口日志和界面数据。')
  if (!confirmed) return
  emit('clear-all')
  notify.success('已全局清空当前数据')
}
</script>

<template>
  <header class="bg-cat-card/92 backdrop-blur-xl border-b border-cat-border/45 px-2 py-1 shrink-0 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
    <div class="flex items-center gap-2.5">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-cat-primary to-cat-secondary flex items-center justify-center text-sm shadow-sm shrink-0">
          🐱
        </div>
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="font-semibold text-sm text-cat-text truncate">喵喵的串口工具</span>
          <span class="text-[10px] px-1.5 py-0.5 bg-cat-surface rounded-full text-cat-muted shrink-0">v2.0</span>
        </div>
      </div>

      <div class="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto">
        <div class="header-group shrink-0">
          <button @click="$emit('show-widget-panel')" class="header-action">
            <span>🧩</span> 控件
          </button>
          <button
            @click="saveLayout"
            title="保存当前全局配置：串口管理、协议库、控件和相关设置"
            class="header-action"
          >
            <span>💾</span> 保存
          </button>
          <button
            @click="loadLayout"
            title="加载一整套全局配置：串口管理、协议库、控件和相关设置"
            class="header-action"
          >
            <span>📁</span> 加载
          </button>
          <button @click="confirmClearAll" class="header-action header-action-danger">
            <span>🗑️</span> 全局清空
          </button>
        </div>

        <div class="header-group shrink-0">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="$emit('set-tab', tab.id)"
            :class="[
              'header-tab',
              activeTab === tab.id
                ? 'header-tab-active'
                : 'header-tab-idle'
            ]"
          >
            <span>{{ tab.icon }}</span>
            {{ tab.name }}
          </button>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <div class="header-status-pill">
          {{ connectedCount }} / {{ portsStore.ports.length }} 端口在线
        </div>

        <div
          v-if="portsStore.anyConnected"
          class="header-status-pill text-cat-primary"
        >
          {{ totalRateLabel }}
        </div>

        <div
          v-if="connectedPorts.length > 0"
          class="flex items-center gap-1 max-w-[18rem] overflow-x-auto rounded-full bg-cat-surface/42 px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          <template v-for="portState in connectedPorts" :key="portState.id">
            <div
              class="rounded-full bg-cat-card/92 px-2 py-0.5 text-[10px] flex items-center gap-1 shrink-0 leading-none shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
              :title="`${portState.label} · ${portState.baudRate}`"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <span class="text-cat-text">{{ portState.label }}</span>
              <span class="text-cat-muted">{{ portState.baudRate }}</span>
            </div>
          </template>
        </div>

        <ThemeSwitcher />

        <div v-if="!portsStore.serialSupported" class="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-yellow-400 shrink-0 shadow-[inset_0_1px_0_rgba(250,204,21,0.15)]">
          <span>⚠️</span>
          <span class="text-[10px]">仅可用 WebSocket</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--cat-surface) 48%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.header-action,
.header-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.38rem 0.68rem;
  border-radius: 9999px;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  color: var(--cat-muted);
  transition: all 0.2s ease;
}

.header-action:hover,
.header-tab-idle:hover {
  color: var(--cat-text);
  background: color-mix(in srgb, var(--cat-card) 90%, transparent);
}

.header-action-danger {
  color: #f87171;
}

.header-action-danger:hover {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
}

.header-tab-active {
  color: white;
  background: linear-gradient(135deg, var(--cat-primary) 0%, var(--cat-secondary) 100%);
  box-shadow: 0 6px 14px rgba(14, 165, 233, 0.24);
}

.header-tab-idle {
  color: var(--cat-muted);
}

.header-status-pill {
  display: flex;
  align-items: center;
  height: 1.75rem;
  padding: 0 0.7rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--cat-surface) 44%, transparent);
  color: var(--cat-muted);
  font-size: 10px;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
</style>
