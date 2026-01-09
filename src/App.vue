<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useSerialStore } from './stores/serial'

// Components
import HeaderBar from './components/HeaderBar.vue'
import Sidebar from './components/Sidebar.vue'
import CanvasView from './components/CanvasView.vue'
import TerminalView from './components/TerminalView.vue'
import ProtocolView from './components/ProtocolView.vue'
import ReplayView from './components/ReplayView.vue'
import WidgetPanel from './components/WidgetPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import TerminalSettingsPanel from './components/TerminalSettingsPanel.vue'
import ContextMenu from './components/ContextMenu.vue'
import CatMascot from './components/CatMascot.vue'

const store = useSerialStore()

// 界面状态
const activeTab = ref('canvas')
const tabs = [
  { id: 'canvas', name: '画布喵', icon: '🎨' },
  { id: 'terminal', name: '终端喵', icon: '🖥️' },
  { id: 'protocol', name: '协议喵', icon: '📋' },
  { id: 'replay', name: '回放喵', icon: '🎬' }
]

const isPaused = ref(false)
const isRecording = ref(false)
const showWidgetPanel = ref(false)
const showSettingsPanel = ref(true)
const showTerminalSettings = ref(true)
const selectedWidgetId = ref(null)

// 右键菜单
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  items: []
})

// 计算属性
const selectedWidget = computed(() => {
  return store.widgets.find(w => w.id === selectedWidgetId.value)
})

// 方法
const clearAll = () => {
  store.clearAll()
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

// 导出日志
const handleExportLog = ({ format }) => {
  const logs = store.terminalLogs
  let content = ''
  let filename = `serial_log_${new Date().toISOString().slice(0,19).replace(/[:-]/g, '')}`

  if (format === 'json') {
    content = JSON.stringify(logs.map(l => ({
      time: l.time,
      dir: l.dir,
      data: l.data,
      type: l.type
    })), null, 2)
    filename += '.json'
  } else if (format === 'csv') {
    content = 'Time,Direction,Data\n' + logs.map(l => {
      const dir = l.dir === 'rx' ? 'RX' : (l.dir === 'tx' ? 'TX' : 'SYS')
      return `"${l.time}","${dir}","${l.data.replace(/"/g, '""')}"`
    }).join('\n')
    filename += '.csv'
  } else {
    content = logs.map(l => {
      const dir = l.dir === 'rx' ? 'RX' : (l.dir === 'tx' ? 'TX' : 'SYS')
      return `[${l.time}] [${dir}] ${l.data}`
    }).join('\n')
    filename += '.txt'
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 全局点击关闭菜单
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- 顶部栏 -->
    <HeaderBar 
      :is-recording="isRecording"
      @toggle-recording="isRecording = !isRecording"
      @show-widget-panel="showWidgetPanel = true"
    />

    <!-- 主体区域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧边栏 -->
      <Sidebar />

      <!-- 中间内容区 -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- 标签页 -->
        <div class="h-10 bg-cat-card border-b border-cat-border flex items-center px-2 shrink-0">
          <button 
            v-for="tab in tabs" 
            :key="tab.id" 
            @click="activeTab = tab.id"
            :class="[
              'px-4 py-2 text-sm rounded-lg mr-1 flex items-center gap-2 smooth-transition',
              activeTab === tab.id 
                ? 'bg-cat-surface text-cat-text' 
                : 'text-cat-muted hover:text-cat-text hover:bg-cat-surface/50'
            ]"
          >
            <span>{{ tab.icon }}</span>
            {{ tab.name }}
          </button>
          
          <!-- 运行控制 -->
          <div class="ml-auto flex items-center gap-2">
            <button 
              @click="isPaused = !isPaused" 
              :class="[
                'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1', 
                isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'cat-btn-secondary'
              ]"
            >
              {{ isPaused ? '▶️ 继续' : '⏸️ 暂停' }}
            </button>
            <button @click="clearAll" class="cat-btn-secondary px-3 py-1.5 rounded-lg text-sm">
              🗑️ 清空
            </button>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-hidden">
          <CanvasView 
            v-show="activeTab === 'canvas'" 
            v-model:selected-widget="selectedWidgetId"
            @show-settings="showSettingsPanel = true"
          />
          <TerminalView v-show="activeTab === 'terminal'" />
          <ProtocolView v-show="activeTab === 'protocol'" />
          <ReplayView v-show="activeTab === 'replay'" />
        </div>
      </main>

      <!-- 右侧设置面板 - 根据标签页显示不同面板 -->
      <SettingsPanel
        v-if="showSettingsPanel && activeTab === 'canvas'"
        :widget="selectedWidget"
        @close="showSettingsPanel = false"
        @delete="selectedWidgetId = null"
      />
      <TerminalSettingsPanel
        v-if="showTerminalSettings && activeTab === 'terminal'"
        @close="showTerminalSettings = false"
        @export-log="handleExportLog"
      />
    </div>

    <!-- 控件面板弹窗 -->
    <WidgetPanel 
      v-if="showWidgetPanel" 
      @close="showWidgetPanel = false"
    />

    <!-- 右键菜单 -->
    <ContextMenu 
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenu.items"
      @close="closeContextMenu"
    />

    <!-- 猫咪助手 -->
    <CatMascot :connected="store.connected" />
  </div>
</template>
