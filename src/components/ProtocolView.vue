<script setup>
import { computed, ref, watch } from 'vue'
import { useSerialStore } from '../stores/serial'
import { usePortsStore } from '../stores/ports'
import { getAllParsers, getParser } from '../utils/parserRegistry'
import { notify } from '../utils/notification'
import {
  createEmptyProtocolProfile,
  createProtocolProfileId,
  deleteUserProtocolProfile,
  loadUserProtocolProfiles,
  normalizeUserProtocolProfile,
  upsertUserProtocolProfile,
  getProtocolIdFromParserId
} from '../utils/protocolProfiles'
import { createProtocolParserDefinition } from '../parsers/profileParserFactory'
import { syncRegisteredParsers } from '../parsers'

const portsStore = usePortsStore()
const serialStore = useSerialStore()

const selectedPortId = ref(portsStore.ports[0]?.id || '')
const protocolProfiles = ref(loadUserProtocolProfiles())
const draftProfile = ref(createEmptyProtocolProfile('tlv'))
const editingProfileId = ref('')
const protocolTestInput = ref('')
const protocolTestResult = ref('等待测试')
const importFileInput = ref(null)

const selectedPort = computed(() => portsStore.getPort(selectedPortId.value))
const parserOptions = computed(() => getAllParsers())
const selectedParser = computed(() => getParser(selectedPort.value?.parserId))

const parserKindLabelMap = {
  raw: 'Raw',
  'line-values': '文本数值',
  'json-lines': 'JSON',
  tlv: 'TLV'
}

const availableProtocolCards = computed(() => parserOptions.value.map(parser => ({
  id: parser.id,
  name: parser.name,
  description: parser.description,
  builtin: parser.builtin !== false,
  kind: parser.profileKind || 'raw',
  profileId: parser.profileId || getProtocolIdFromParserId(parser.id)
})))

const kindDescription = computed(() => {
  switch (draftProfile.value.kind) {
    case 'line-values':
      return '适合 CSV / 空格分隔 / 逐行数值数据。'
    case 'json-lines':
      return '适合每行一个 JSON 对象，按键名提取数值。'
    case 'tlv':
      return '适合二进制协议。你可以按 magic word、包长、TLV 类型和偏移精确配置。'
    default:
      return ''
  }
})

const testInputPlaceholder = computed(() => {
  switch (draftProfile.value.kind) {
    case 'line-values':
      return '例如: 12.4, 98.1, 0.53'
    case 'json-lines':
      return '例如: {"bpm":16.8,"conf":2.74}'
    case 'tlv':
      return '输入十六进制字节，例如: 02 01 04 03 ...'
    default:
      return ''
  }
})

const blankMapping = () => ({
  id: `mapping-${Date.now()}-${Math.random()}`,
  label: '',
  tlvType: 1001,
  valueOffset: 0,
  valueType: 'f32',
  endian: 'little',
  scale: 1,
  unit: ''
})

const reloadProfiles = () => {
  protocolProfiles.value = loadUserProtocolProfiles()
}

const createNewProfile = (kind = 'tlv') => {
  draftProfile.value = createEmptyProtocolProfile(kind)
  if (kind === 'tlv') {
    draftProfile.value.tlv.mappings = [blankMapping()]
  }
  editingProfileId.value = ''
  protocolTestInput.value = ''
  protocolTestResult.value = '等待测试'
}

const startEditingProfile = (profileId) => {
  const profile = protocolProfiles.value.find(item => item.id === profileId)
  if (!profile) return
  draftProfile.value = normalizeUserProtocolProfile(JSON.parse(JSON.stringify(profile)))
  editingProfileId.value = profile.id
  protocolTestResult.value = `正在编辑: ${profile.name}`
}

const saveDraftProfile = ({ applyToPort = false } = {}) => {
  const normalized = normalizeUserProtocolProfile({
    ...draftProfile.value,
    id: editingProfileId.value || draftProfile.value.id || createProtocolProfileId()
  })

  if (!normalized.name) {
    notify.warning('先给协议起个名字再保存')
    return
  }

  try {
    const savedProfile = upsertUserProtocolProfile(normalized)
    syncRegisteredParsers()
    portsStore.refreshParserBindings()
    reloadProfiles()

    draftProfile.value = normalizeUserProtocolProfile(JSON.parse(JSON.stringify(savedProfile)))
    editingProfileId.value = savedProfile.id

    if (applyToPort && selectedPort.value) {
      serialStore.removeAutoChannelsForPort(selectedPort.value.id)
      portsStore.setPortParser(selectedPort.value.id, `profile:${savedProfile.id}`)
      serialStore.syncAutoChannelsForPort(selectedPort.value.id)
    }

    serialStore.saveWorkspaceState()

    notify.success(applyToPort ? `协议已保存并应用: ${savedProfile.name}` : `协议已保存: ${savedProfile.name}`)
  } catch (error) {
    notify.error(error.message || '协议保存失败')
  }
}

const removeProfile = (profileId) => {
  const profile = protocolProfiles.value.find(item => item.id === profileId)
  if (!profile) return

  if (!confirm(`删除协议「${profile.name}」？`)) return

  deleteUserProtocolProfile(profileId)
  syncRegisteredParsers()
  portsStore.refreshParserBindings()
  reloadProfiles()

  if (editingProfileId.value === profileId) {
    createNewProfile('tlv')
  }

  serialStore.saveWorkspaceState()

  notify.success(`已删除协议: ${profile.name}`)
}

const applyParser = (parserId) => {
  if (!selectedPort.value) return
  serialStore.removeAutoChannelsForPort(selectedPort.value.id)
  portsStore.setPortParser(selectedPort.value.id, parserId)
  serialStore.syncAutoChannelsForPort(selectedPort.value.id)
  serialStore.saveWorkspaceState()
}

const addTlvMapping = () => {
  draftProfile.value.tlv.mappings.push(blankMapping())
}

const removeTlvMapping = (mappingId) => {
  draftProfile.value.tlv.mappings = draftProfile.value.tlv.mappings.filter(mapping => mapping.id !== mappingId)
}

const downloadProfileJson = (profile, fallbackName = 'protocol') => {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${fallbackName || 'protocol'}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const exportDraftProfile = () => {
  const normalized = normalizeUserProtocolProfile({
    ...draftProfile.value,
    id: editingProfileId.value || draftProfile.value.id || createProtocolProfileId()
  })
  downloadProfileJson(normalized, normalized.name || 'protocol')
  notify.success('协议 JSON 已导出')
}

const exportSavedProfile = (profileId) => {
  const profile = protocolProfiles.value.find(item => item.id === profileId)
  if (!profile) return
  downloadProfileJson(profile, profile.name || 'protocol')
  notify.success(`已导出协议 JSON: ${profile.name}`)
}

const triggerImportProfile = () => {
  importFileInput.value?.click()
}

const importProfileFromFile = async (event) => {
  const file = event.target?.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const imported = normalizeUserProtocolProfile(JSON.parse(text))

    draftProfile.value = normalizeUserProtocolProfile({
      ...draftProfile.value,
      ...imported
    })

    if (draftProfile.value.kind === 'tlv' && draftProfile.value.tlv.mappings.length === 0) {
      draftProfile.value.tlv.mappings = [blankMapping()]
    }

    editingProfileId.value = imported.id || ''
    protocolTestResult.value = `已导入 JSON: ${file.name}`
    notify.success(`协议 JSON 已导入: ${file.name}`)
  } catch (error) {
    notify.error(error.message || '协议 JSON 导入失败')
  } finally {
    event.target.value = ''
  }
}

const testDraftProfile = () => {
  try {
    const parserDef = createProtocolParserDefinition({
      ...draftProfile.value,
      id: draftProfile.value.id || 'preview-profile'
    }, '__preview__')

    const instance = parserDef.createInstance()
    let bytes
    if (draftProfile.value.kind === 'tlv') {
      const compact = protocolTestInput.value.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '')
      if (!compact || compact.length % 2 !== 0) {
        protocolTestResult.value = '请输入完整的十六进制字节串'
        return
      }

      bytes = new Uint8Array(compact.length / 2)
      for (let index = 0; index < bytes.length; index++) {
        bytes[index] = parseInt(compact.slice(index * 2, index * 2 + 2), 16)
      }
    } else {
      bytes = new TextEncoder().encode(protocolTestInput.value)
    }

    const snapshots = instance.feed(bytes)
    protocolTestResult.value = snapshots.length > 0
      ? JSON.stringify(snapshots, null, 2)
      : '(无解析结果，可能是输入还不完整，或者字段映射尚未命中)'
  } catch (error) {
    protocolTestResult.value = `Error: ${error.message}`
  }
}

watch(() => portsStore.ports.length, () => {
  if (!selectedPort.value && portsStore.ports.length > 0) {
    selectedPortId.value = portsStore.ports[0].id
  }
})

watch(() => draftProfile.value.kind, (kind) => {
  if (kind !== 'tlv') {
    protocolTestInput.value = ''
  }

  if (kind === 'tlv' && draftProfile.value.tlv.mappings.length === 0) {
    draftProfile.value.tlv.mappings = [blankMapping()]
  }
})

if (!draftProfile.value.tlv.mappings.length) {
  draftProfile.value.tlv.mappings = [blankMapping()]
}
</script>

<template>
  <div class="h-full overflow-auto p-6">
    <div class="max-w-6xl mx-auto space-y-6">

      <div class="flex items-center gap-3">
        <span class="text-2xl">📋</span>
        <div>
          <h2 class="text-xl font-semibold">协议喵</h2>
          <p class="text-sm text-cat-muted">
            默认只有 Raw。这里才是玩家自己创建、测试、保存协议解析器的地方。
          </p>
        </div>
      </div>

      <div class="bg-cat-card rounded-2xl border border-cat-border p-4 space-y-3">
        <div class="flex flex-wrap items-center gap-3">
          <div class="text-sm text-cat-muted">当前端口</div>
          <div v-if="portsStore.ports.length > 0" class="flex flex-wrap gap-2">
            <button
              v-for="port in portsStore.ports"
              :key="port.id"
              @click="selectedPortId = port.id"
              :class="[
                'px-3 py-2 rounded-lg text-sm border transition-colors',
                selectedPortId === port.id
                  ? 'border-cat-primary bg-cat-primary/10 text-cat-primary'
                  : 'border-cat-border bg-cat-surface text-cat-muted hover:text-cat-text'
              ]"
            >
              {{ port.label }}
              <span class="ml-2 text-[11px] opacity-70">{{ port.parserId }}</span>
            </button>
          </div>
          <div v-else class="text-sm text-cat-muted">请先去左侧添加串口。</div>
        </div>

        <div v-if="selectedPort" class="grid md:grid-cols-3 gap-3 text-sm">
          <div class="bg-cat-surface rounded-xl px-3 py-2">
            <div class="text-cat-muted text-xs mb-1">端口</div>
            <div>{{ selectedPort.label }}</div>
          </div>
          <div class="bg-cat-surface rounded-xl px-3 py-2">
            <div class="text-cat-muted text-xs mb-1">当前解析器</div>
            <div>{{ selectedParser?.name || selectedPort.parserId }}</div>
          </div>
          <div class="bg-cat-surface rounded-xl px-3 py-2">
            <div class="text-cat-muted text-xs mb-1">波特率</div>
            <div>{{ selectedPort.baudRate }}</div>
          </div>
        </div>
      </div>

      <div class="grid xl:grid-cols-[1.1fr_1.4fr] gap-6">
        <section class="bg-cat-card rounded-2xl border border-cat-border p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium">协议库</h3>
              <p class="text-xs text-cat-muted mt-1">选一个现有协议应用到当前端口，或者继续编辑右侧草稿。</p>
            </div>
            <div class="flex gap-2">
              <button @click="createNewProfile('line-values')" class="cat-btn-secondary px-3 py-1.5 rounded-lg text-xs">新建文本协议</button>
              <button @click="createNewProfile('tlv')" class="cat-btn px-3 py-1.5 rounded-lg text-xs text-white">新建 TLV 协议</button>
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="parser in availableProtocolCards"
              :key="parser.id"
              class="rounded-xl border border-cat-border bg-cat-surface/70 p-3"
            >
              <div class="flex items-start gap-3">
                <div class="text-lg">{{ parser.kind === 'tlv' ? '📦' : parser.kind === 'json-lines' ? '🧾' : parser.kind === 'line-values' ? '📈' : '🧱' }}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <div class="font-medium">{{ parser.name }}</div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-cat-dark text-cat-muted">{{ parserKindLabelMap[parser.kind] || parser.kind }}</span>
                    <span v-if="parser.builtin" class="text-[10px] px-2 py-0.5 rounded-full bg-cat-primary/15 text-cat-primary">内置</span>
                  </div>
                  <div class="text-xs text-cat-muted mt-1">{{ parser.description }}</div>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-if="selectedPort"
                  @click="applyParser(parser.id)"
                  class="cat-btn-secondary px-3 py-1.5 rounded-lg text-xs"
                >
                  应用到当前端口
                </button>
                <button
                  v-if="!parser.builtin && parser.profileId"
                  @click="startEditingProfile(parser.profileId)"
                  class="cat-btn-secondary px-3 py-1.5 rounded-lg text-xs"
                >
                  编辑
                </button>
                <button
                  v-if="!parser.builtin && parser.profileId"
                  @click="exportSavedProfile(parser.profileId)"
                  class="cat-btn-secondary px-3 py-1.5 rounded-lg text-xs"
                >
                  导出 JSON
                </button>
                <button
                  v-if="!parser.builtin && parser.profileId"
                  @click="removeProfile(parser.profileId)"
                  class="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="bg-cat-card rounded-2xl border border-cat-border p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium">{{ editingProfileId ? '编辑协议' : '新建协议' }}</h3>
              <p class="text-xs text-cat-muted mt-1">{{ kindDescription }}</p>
            </div>
            <div class="text-xs text-cat-muted">
              {{ editingProfileId ? '协议会保存到本地浏览器' : '保存后才会进入协议库' }}
            </div>
          </div>

          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-cat-muted block mb-1">协议名称</label>
              <input v-model="draftProfile.name" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm" placeholder="例如：6843 TLV 呼吸协议">
            </div>
            <div>
              <label class="text-xs text-cat-muted block mb-1">协议类型</label>
              <select v-model="draftProfile.kind" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                <option value="line-values">文本数值行</option>
                <option value="json-lines">JSON 行</option>
                <option value="tlv">TLV 二进制</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-cat-muted block mb-1">推荐波特率</label>
              <input v-model.number="draftProfile.defaultBaudRate" type="number" min="1" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-xs text-cat-muted block mb-1">Value Hold 窗口（ms）</label>
              <input v-model.number="draftProfile.heldWindowMs" type="number" min="0" step="100" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
            </div>
          </div>

          <div>
            <label class="text-xs text-cat-muted block mb-1">描述</label>
            <textarea v-model="draftProfile.description" rows="2" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm" placeholder="写一点协议说明，方便以后辨认"></textarea>
          </div>

          <div>
            <label class="text-xs text-cat-muted block mb-1">需要保持的通道名（逗号分隔，可选）</label>
            <input
              :value="draftProfile.heldChannels.join(', ')"
              @input="draftProfile.heldChannels = $event.target.value.split(',').map(item => item.trim()).filter(Boolean)"
              class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
              placeholder="例如：BPM, 置信度"
            >
          </div>

          <div v-if="draftProfile.kind === 'line-values'" class="space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-cat-muted block mb-1">分隔正则</label>
                <input v-model="draftProfile.line.separatorPattern" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm" placeholder="例如：[,\t; ]+">
              </div>
              <div>
                <label class="text-xs text-cat-muted block mb-1">通道名（逗号分隔，可选）</label>
                <input
                  :value="draftProfile.line.channelNames.join(', ')"
                  @input="draftProfile.line.channelNames = $event.target.value.split(',').map(item => item.trim()).filter(Boolean)"
                  class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
                  placeholder="例如：温度, 湿度, 气压"
                >
              </div>
            </div>
          </div>

          <div v-if="draftProfile.kind === 'json-lines'" class="space-y-4">
            <div>
              <label class="text-xs text-cat-muted block mb-1">字段路径（逗号分隔，可留空）</label>
              <input
                :value="draftProfile.json.fieldPaths.join(', ')"
                @input="draftProfile.json.fieldPaths = $event.target.value.split(',').map(item => item.trim()).filter(Boolean)"
                class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
                placeholder="例如：bpm, conf, data.temp"
              >
            </div>
          </div>

          <div v-if="draftProfile.kind === 'tlv'" class="space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-cat-muted block mb-1">Magic Word（十六进制，可空）</label>
                <input v-model="draftProfile.tlv.magicWordHex" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm" placeholder="例如：02 01 04 03 06 05 08 07">
              </div>
              <div>
                <label class="text-xs text-cat-muted block mb-1">Header 长度</label>
                <input v-model.number="draftProfile.tlv.headerSize" type="number" min="8" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
              </div>
              <div>
                <label class="text-xs text-cat-muted block mb-1">包长偏移</label>
                <input v-model.number="draftProfile.tlv.packetLengthOffset" type="number" min="0" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-cat-muted block mb-1">包长类型</label>
                  <select v-model="draftProfile.tlv.packetLengthType" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                    <option value="u16">u16</option>
                    <option value="u32">u32</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-cat-muted block mb-1">包长字节序</label>
                  <select v-model="draftProfile.tlv.packetLengthEndian" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                    <option value="little">Little</option>
                    <option value="big">Big</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="text-xs text-cat-muted block mb-1">TLV 数量偏移（填 -1 表示不用）</label>
                <input v-model.number="draftProfile.tlv.tlvCountOffset" type="number" min="-1" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-cat-muted block mb-1">TLV 数量类型</label>
                  <select v-model="draftProfile.tlv.tlvCountType" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                    <option value="u16">u16</option>
                    <option value="u32">u32</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-cat-muted block mb-1">TLV 数量字节序</label>
                  <select v-model="draftProfile.tlv.tlvCountEndian" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                    <option value="little">Little</option>
                    <option value="big">Big</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="text-xs text-cat-muted block mb-1">TLV Header 长度</label>
                <input v-model.number="draftProfile.tlv.tlvHeaderSize" type="number" min="4" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="text-xs text-cat-muted block mb-1">Type 偏移</label>
                  <input v-model.number="draftProfile.tlv.tlvTypeOffset" type="number" min="0" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                </div>
                <div>
                  <label class="text-xs text-cat-muted block mb-1">Length 偏移</label>
                  <input v-model.number="draftProfile.tlv.tlvLengthOffset" type="number" min="0" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                </div>
                <div>
                  <label class="text-xs text-cat-muted block mb-1">TLV 字节序</label>
                  <select v-model="draftProfile.tlv.tlvHeaderEndian" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                    <option value="little">Little</option>
                    <option value="big">Big</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-cat-muted block mb-1">Type 类型</label>
                  <select v-model="draftProfile.tlv.tlvTypeType" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                    <option value="u16">u16</option>
                    <option value="u32">u32</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-cat-muted block mb-1">Length 类型</label>
                  <select v-model="draftProfile.tlv.tlvLengthType" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
                    <option value="u16">u16</option>
                    <option value="u32">u32</option>
                  </select>
                </div>
              </div>
            </div>

            <label class="flex items-center gap-2 text-sm text-cat-muted">
              <input v-model="draftProfile.tlv.tlvLengthIncludesHeader" type="checkbox" class="accent-cat-primary">
              TLV 的 length 字段包含 TLV Header 自身
            </label>

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium text-sm">字段映射</h4>
                  <p class="text-xs text-cat-muted mt-1">按 TLV 类型和 payload 偏移提取值，决定最终显示的通道。</p>
                </div>
                <button @click="addTlvMapping" class="cat-btn-secondary px-3 py-1.5 rounded-lg text-xs">添加字段</button>
              </div>

              <div
                v-for="mapping in draftProfile.tlv.mappings"
                :key="mapping.id"
                class="rounded-xl border border-cat-border bg-cat-surface/70 p-3 space-y-3"
              >
                <div class="grid md:grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-cat-muted block mb-1">标签名</label>
                    <input v-model="mapping.label" class="w-full bg-cat-dark border border-cat-border rounded-lg px-3 py-2 text-sm" placeholder="例如：BPM">
                  </div>
                  <div>
                    <label class="text-xs text-cat-muted block mb-1">TLV 类型号</label>
                    <input v-model.number="mapping.tlvType" type="number" min="0" class="w-full bg-cat-dark border border-cat-border rounded-lg px-3 py-2 text-sm">
                  </div>
                </div>
                <div class="grid md:grid-cols-4 gap-3">
                  <div>
                    <label class="text-xs text-cat-muted block mb-1">值偏移</label>
                    <input v-model.number="mapping.valueOffset" type="number" min="0" class="w-full bg-cat-dark border border-cat-border rounded-lg px-3 py-2 text-sm">
                  </div>
                  <div>
                    <label class="text-xs text-cat-muted block mb-1">值类型</label>
                    <select v-model="mapping.valueType" class="w-full bg-cat-dark border border-cat-border rounded-lg px-3 py-2 text-sm">
                      <option value="u8">u8</option>
                      <option value="i8">i8</option>
                      <option value="u16">u16</option>
                      <option value="i16">i16</option>
                      <option value="u32">u32</option>
                      <option value="i32">i32</option>
                      <option value="f32">f32</option>
                      <option value="f64">f64</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-xs text-cat-muted block mb-1">字节序</label>
                    <select v-model="mapping.endian" class="w-full bg-cat-dark border border-cat-border rounded-lg px-3 py-2 text-sm">
                      <option value="little">Little</option>
                      <option value="big">Big</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-xs text-cat-muted block mb-1">缩放倍率</label>
                    <input v-model.number="mapping.scale" type="number" step="0.01" class="w-full bg-cat-dark border border-cat-border rounded-lg px-3 py-2 text-sm">
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <input v-model="mapping.unit" class="flex-1 bg-cat-dark border border-cat-border rounded-lg px-3 py-2 text-sm" placeholder="单位（可选），例如 bpm / °C">
                  <button @click="removeTlvMapping(mapping.id)" class="ml-3 px-3 py-2 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    删除字段
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button @click="saveDraftProfile()" class="cat-btn px-4 py-2 rounded-lg text-white text-sm">保存协议</button>
            <button v-if="selectedPort" @click="saveDraftProfile({ applyToPort: true })" class="cat-btn-secondary px-4 py-2 rounded-lg text-sm">保存并应用到当前端口</button>
            <button @click="testDraftProfile" class="cat-btn-secondary px-4 py-2 rounded-lg text-sm">测试解析</button>
            <button @click="exportDraftProfile" class="cat-btn-secondary px-4 py-2 rounded-lg text-sm">导出 JSON</button>
            <button @click="triggerImportProfile" class="cat-btn-secondary px-4 py-2 rounded-lg text-sm">导入 JSON</button>
            <button @click="createNewProfile(draftProfile.kind)" class="cat-btn-secondary px-4 py-2 rounded-lg text-sm">清空草稿</button>
            <input
              ref="importFileInput"
              type="file"
              accept="application/json,.json"
              class="hidden"
              @change="importProfileFromFile"
            >
          </div>

          <div class="grid lg:grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-cat-muted block mb-1">测试输入</label>
              <textarea
                v-model="protocolTestInput"
                rows="7"
                class="w-full bg-cat-surface border border-cat-border rounded-xl px-3 py-2 font-mono text-sm"
                :placeholder="testInputPlaceholder"
              ></textarea>
            </div>
            <div>
              <label class="text-xs text-cat-muted block mb-1">解析结果</label>
              <div class="h-full min-h-[170px] bg-cat-surface border border-cat-border rounded-xl px-3 py-2 font-mono text-sm text-green-400 overflow-auto whitespace-pre-wrap">
                {{ protocolTestResult }}
              </div>
            </div>
          </div>

        </section>
      </div>
    </div>
  </div>
</template>
