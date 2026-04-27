<script setup>
import { computed, ref, watch } from 'vue'
import { useSerialStore } from '../stores/serial'
import { useI18nStore } from '../stores/i18n'
import { usePortsStore } from '../stores/ports'

const store = useSerialStore()
const i18n = useI18nStore()
const portsStore = usePortsStore()
const props = defineProps({
  widget: Object
})
const emit = defineEmits(['close', 'delete'])

const isFullHistoryWaveform = ref(false)

const normalizeWidgetChannels = (widget) => {
  if (!Array.isArray(widget?.channels)) return []
  return widget.channels.filter(value => Number.isInteger(value) && value >= 0)
}

const getPortLabel = (portId) => {
  if (!portId) return '未分组'
  return portsStore.getPort(portId)?.label || portId
}

const waveformChannelGroups = computed(() => {
  const groups = new Map()

  for (const channel of store.channels) {
    const key = channel.portId || '_unassigned'
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: getPortLabel(channel.portId),
        channels: []
      })
    }
    groups.get(key).channels.push(channel)
  }

  return Array.from(groups.values())
})

const selectedWaveformChannelIds = computed(() => normalizeWidgetChannels(props.widget))

watch(
  () => props.widget,
  (widget) => {
    if (widget?.type === 'waveform') {
      const channels = normalizeWidgetChannels(widget)
      isFullHistoryWaveform.value = Boolean(widget.fullHistory || widget.title === '温度曲线' || (channels.length === 1 && channels[0] === 18))
    }
  },
  { immediate: true, deep: true }
)

const syncWaveformChannels = (channelIds) => {
  if (!props.widget || props.widget.type !== 'waveform') return

  const validIds = store.channels
    .filter(channel => channelIds.includes(channel.id))
    .map(channel => channel.id)

  props.widget.channels = validIds
}

const toggleWaveformChannel = (channelId) => {
  const current = new Set(selectedWaveformChannelIds.value)
  if (current.has(channelId)) {
    current.delete(channelId)
  } else {
    current.add(channelId)
  }
  syncWaveformChannels(Array.from(current))
}

const selectAllWaveformChannels = () => {
  syncWaveformChannels(store.channels.map(channel => channel.id))
}

const clearWaveformChannels = () => {
  syncWaveformChannels([])
}

const normalizeFftChannel = (widget) => {
  if (!widget) return null
  if (Number.isInteger(widget.channel) && widget.channel >= 0) return widget.channel
  if (Array.isArray(widget.channels)) {
    const first = widget.channels.find(value => Number.isInteger(value) && value >= 0)
    if (Number.isInteger(first)) return first
  }
  return store.channels[0]?.id ?? null
}

const selectedFftChannelId = computed(() => normalizeFftChannel(props.widget))

const normalizeSparklineDrawMode = (widget) => {
  if (!widget || widget.type !== 'sparkline') return 'trend'
  if (widget.drawMode === 'window') return 'window'
  if (widget.drawMode === 'trend') return 'trend'
  return widget.fullHistory === false ? 'window' : 'trend'
}

const selectedSparklineDrawMode = computed({
  get: () => normalizeSparklineDrawMode(props.widget),
  set: (mode) => {
    if (!props.widget || props.widget.type !== 'sparkline') return
    const nextMode = mode === 'window' ? 'window' : 'trend'
    props.widget.drawMode = nextMode
    props.widget.fullHistory = nextMode === 'trend'
  }
})

const deleteWidget = () => {
  if (props.widget) {
    store.removeWidget(props.widget.id)
    emit('delete')
  }
}

const buttonStyleOptions = computed(() => ([
  { value: 'primary', label: i18n.t('settings.buttonStyles.primary') },
  { value: 'success', label: i18n.t('settings.buttonStyles.success') },
  { value: 'warning', label: i18n.t('settings.buttonStyles.warning') },
  { value: 'danger', label: i18n.t('settings.buttonStyles.danger') }
]))
</script>

<template>
  <aside class="w-[17rem] bg-cat-card border-l border-cat-border flex flex-col shrink-0" data-ai="settings-panel">
    <div class="px-3 py-3 border-b border-cat-border flex items-center justify-between">
      <span class="font-medium">🔧 {{ i18n.t('settings.title') }}</span>
      <button @click="emit('close')" data-ai="close-settings-panel" class="text-cat-muted hover:text-cat-text">✕</button>
    </div>
    
    <div v-if="widget" class="p-3 space-y-3 overflow-auto">
      <div v-if="widget.type !== 'sparkline'">
        <label class="text-xs text-cat-muted block mb-1">{{ i18n.t('settings.titleLabel') }}</label>
        <input v-model="widget.title" data-ai="settings-widget-title" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
      </div>
      
      <div v-if="['value', 'gauge'].includes(widget.type)">
        <label class="text-xs text-cat-muted block mb-1">{{ i18n.t('settings.channelLabel') }}</label>
        <select v-model="widget.channel" data-ai="settings-widget-channel" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
          <option v-for="ch in store.channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
        </select>
      </div>

      <div v-if="widget.type === 'sparkline'" class="space-y-3">
        <div class="text-[11px] text-cat-muted bg-cat-surface/70 rounded-lg px-3 py-2">
          标题会自动显示为当前绑定通道名。
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">绑定通道</label>
          <select v-model.number="widget.channel" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
            <option v-for="ch in store.channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">绘制模式</label>
          <select
            v-model="selectedSparklineDrawMode"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="trend">趋势绘制</option>
            <option value="window">窗口绘制</option>
          </select>
        </div>
        <div v-if="selectedSparklineDrawMode === 'window'">
          <label class="text-xs text-cat-muted block mb-1">历史长度</label>
          <input
            v-model.number="widget.historyLength"
            type="number"
            min="30"
            max="300"
            step="10"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
          >
        </div>
        <div v-else class="text-[11px] text-cat-muted bg-cat-surface/70 rounded-lg px-3 py-2">
          趋势绘制会显示当前会话中的全部历史，并按控件像素宽度自动抽稀。
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">单位</label>
          <input
            v-model="widget.unit"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            placeholder="例如: bpm"
          >
        </div>
      </div>

      <div v-if="widget.type === 'waveform'" class="space-y-3">
        <div>
          <label class="text-xs text-cat-muted block mb-1">波形通道</label>
          <div class="rounded-xl border border-cat-border bg-cat-surface/40 p-2.5 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div class="text-[11px] text-cat-muted">
                已选择 {{ selectedWaveformChannelIds.length }} 个通道
              </div>
              <div class="flex items-center gap-2">
                <button @click="selectAllWaveformChannels" class="text-[11px] text-cat-primary hover:underline">
                  全选
                </button>
                <button @click="clearWaveformChannels" class="text-[11px] text-cat-muted hover:text-cat-text">
                  清空
                </button>
              </div>
            </div>

            <div v-if="store.channels.length === 0" class="rounded-lg bg-cat-card/70 px-3 py-3 text-[11px] text-cat-muted">
              还没有可选通道。先去“协议喵”配置协议字段并开始收到数据。
            </div>

            <div v-for="group in waveformChannelGroups" :key="group.key" class="space-y-1.5">
              <div class="text-[11px] font-medium text-cat-muted">{{ group.label }}</div>
              <label
                v-for="channel in group.channels"
                :key="channel.id"
                class="flex items-center gap-2 rounded-lg border border-cat-border/60 bg-cat-card/70 px-2.5 py-2 cursor-pointer hover:border-cat-primary/50"
              >
                <input
                  type="checkbox"
                  :checked="selectedWaveformChannelIds.includes(channel.id)"
                  @change="toggleWaveformChannel(channel.id)"
                  class="accent-cat-primary"
                >
                <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: channel.color }"></span>
                <div class="min-w-0 flex-1">
                  <div class="text-sm text-cat-text truncate">{{ channel.name }}</div>
                  <div class="text-[10px] text-cat-muted">通道 {{ channel.id }}</div>
                </div>
              </label>
            </div>
          </div>
          <div class="text-[10px] text-cat-muted mt-1">按名称直接勾选即可，顺序会按当前通道列表自动保存。</div>
        </div>
        <div v-if="!isFullHistoryWaveform">
          <label class="text-xs text-cat-muted block mb-1">历史长度</label>
          <input
            v-model.number="widget.historyLength"
            type="number"
            min="60"
            max="500"
            step="10"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
          >
        </div>
        <div v-else class="text-[11px] text-cat-muted bg-cat-surface/70 rounded-lg px-3 py-2">
          该曲线保留全历史，显示时会自动抽稀，不受“历史长度”限制。
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">纵轴标题</label>
          <input
            v-model="widget.yAxisLabel"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            placeholder="例如: 呼吸相位"
          >
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">单位</label>
          <input
            v-model="widget.unit"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            placeholder="例如: rad"
          >
        </div>
      </div>

      <div v-if="widget.type === 'fft'" class="space-y-3">
        <div>
          <label class="text-xs text-cat-muted block mb-1">分析通道</label>
          <select
            v-model.number="widget.channel"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
          >
            <option v-for="ch in store.channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
          </select>
          <div v-if="store.channels.length === 0" class="text-[10px] text-cat-muted mt-1">
            还没有可选通道。先接收协议数据。
          </div>
        </div>

        <div>
          <label class="text-xs text-cat-muted block mb-1">FFT窗口长度</label>
          <input
            v-model.number="widget.fftSize"
            type="number"
            min="32"
            max="512"
            step="32"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
          >
          <div class="text-[10px] text-cat-muted mt-1">
            建议用 64 / 128 / 256。渲染时会自动取不超过它的 2 的幂。
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cat-muted block mb-1">最小频率</label>
            <input
              v-model.number="widget.minFreq"
              type="number"
              min="0"
              step="0.05"
              class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            >
          </div>
          <div>
            <label class="text-xs text-cat-muted block mb-1">最大频率</label>
            <input
              v-model.number="widget.maxFreq"
              type="number"
              min="0.1"
              step="0.05"
              class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            >
          </div>
        </div>

        <div>
          <label class="text-xs text-cat-muted block mb-1">采样率 Hz</label>
          <input
            v-model.number="widget.sampleRateHz"
            type="number"
            min="0"
            step="0.1"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            placeholder="0 = 自动从时间戳估算"
          >
          <div class="text-[10px] text-cat-muted mt-1">
            当前通道：{{ selectedFftChannelId === null ? '未选择' : `通道 ${selectedFftChannelId}` }}。填 0 时会自动按历史时间戳估算采样率。
          </div>
        </div>
      </div>

      <div v-if="widget.type === 'button'" class="space-y-3">
        <div class="text-[11px] text-cat-muted bg-cat-surface/70 rounded-lg px-3 py-2">
          {{ i18n.t('settings.buttonHelp') }}
        </div>

        <div>
          <label class="text-xs text-cat-muted block mb-1">{{ i18n.t('settings.buttonLabel') }}</label>
          <input
            v-model="widget.label"
            :placeholder="i18n.t('settings.buttonLabelPlaceholder')"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
          >
        </div>

        <div>
          <label class="text-xs text-cat-muted block mb-1">{{ i18n.t('settings.buttonCommand') }}</label>
          <input
            v-model="widget.command"
            :placeholder="i18n.t('settings.buttonCommandPlaceholder')"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm font-mono"
          >
        </div>

        <div>
          <label class="text-xs text-cat-muted block mb-1">{{ i18n.t('settings.buttonStyle') }}</label>
          <select v-model="widget.style" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
            <option v-for="option in buttonStyleOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="text-xs text-cat-muted block mb-1">{{ i18n.t('settings.buttonSendFormat') }}</label>
          <select v-model="widget.isHex" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
            <option :value="false">{{ i18n.t('settings.utf8') }}</option>
            <option :value="true">{{ i18n.t('settings.hex') }}</option>
          </select>
        </div>

        <div>
          <label class="text-xs text-cat-muted block mb-1">{{ i18n.t('settings.lineEnding') }}</label>
          <div class="rounded-lg border border-cat-border bg-cat-surface/40 px-3 py-2 space-y-2">
            <label class="flex items-center gap-2 text-sm text-cat-text">
              <input type="checkbox" v-model="widget.appendCR" class="accent-cat-primary">
              {{ i18n.t('settings.appendCR') }}
            </label>
            <label class="flex items-center gap-2 text-sm text-cat-text">
              <input type="checkbox" v-model="widget.appendLF" class="accent-cat-primary">
              {{ i18n.t('settings.appendLF') }}
            </label>
          </div>
          <div class="text-[10px] text-cat-muted mt-1">{{ i18n.t('settings.lineEndingHint') }}</div>
        </div>
      </div>

      <div v-if="['value', 'gauge'].includes(widget.type)">
        <label class="text-xs text-cat-muted block mb-1">单位</label>
        <input v-model="widget.unit" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-cat-muted block mb-1">{{ i18n.t('settings.width') }}</label>
          <input v-model.number="widget.w" type="number" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">{{ i18n.t('settings.height') }}</label>
          <input v-model.number="widget.h" type="number" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
        </div>
      </div>
      
      <button @click="deleteWidget" class="w-full py-2 rounded-lg bg-red-500/20 text-red-400 text-sm">
        🗑️ {{ i18n.t('settings.deleteWidget') }}
      </button>
    </div>
    
    <div v-else class="flex-1 flex items-center justify-center text-cat-muted text-sm">
      {{ i18n.t('settings.selectWidget') }}
    </div>
  </aside>
</template>
