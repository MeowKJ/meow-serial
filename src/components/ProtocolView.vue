<script setup>
// ProtocolView.vue
import { ref } from 'vue'
import { useSerialStore } from '../stores/serial'

const store = useSerialStore()

const currentProtocol = ref('firewater')
const protocols = [
  { id: 'raw', name: 'RawData', icon: '📝', desc: '原始数据不解析' },
  { id: 'firewater', name: 'FireWater', icon: '🔥', desc: 'CSV字符串协议' },
  { id: 'justfloat', name: 'JustFloat', icon: '🔢', desc: '二进制浮点协议' },
  { id: 'json', name: 'JSON', icon: '📋', desc: 'JSON格式' },
  { id: 'custom', name: '自定义', icon: '✨', desc: '自定义解析' }
]

const customProtocol = ref({ separator: ',', endMark: '\\n', parser: '' })
const protocolTestInput = ref('25.5,60.2,101.3')
const protocolTestResult = ref('')

const testProtocol = () => {
  try {
    const values = protocolTestInput.value.split(',').map(Number)
    protocolTestResult.value = JSON.stringify(values)
  } catch (e) {
    protocolTestResult.value = 'Error: ' + e.message
  }
}
</script>

<template>
  <div class="h-full overflow-auto p-6">
    <div class="max-w-3xl mx-auto space-y-6">
      
      <div class="flex items-center gap-3 mb-6">
        <span class="text-2xl">📋</span>
        <div>
          <h2 class="text-xl font-semibold">数据协议配置</h2>
          <p class="text-sm text-cat-muted">定义数据解析规则喵~</p>
        </div>
      </div>

      <!-- 协议选择 -->
      <div class="grid grid-cols-2 gap-4">
        <button 
          v-for="p in protocols" 
          :key="p.id" 
          @click="currentProtocol = p.id"
          :class="[
            'p-4 rounded-xl border text-left transition-all',
            currentProtocol === p.id 
              ? 'bg-cat-primary/10 border-cat-primary' 
              : 'bg-cat-card border-cat-border hover:border-cat-muted'
          ]"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ p.icon }}</span>
            <div>
              <div class="font-medium">{{ p.name }}</div>
              <div class="text-xs text-cat-muted mt-0.5">{{ p.desc }}</div>
            </div>
          </div>
        </button>
      </div>

      <!-- 自定义协议 -->
      <div v-if="currentProtocol === 'custom'" class="bg-cat-card rounded-xl p-4 space-y-4">
        <div class="font-medium">自定义解析规则</div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-cat-muted block mb-1">分隔符</label>
            <input v-model="customProtocol.separator" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2">
          </div>
          <div>
            <label class="text-xs text-cat-muted block mb-1">结束符</label>
            <input v-model="customProtocol.endMark" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2">
          </div>
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">解析表达式 (JavaScript)</label>
          <textarea 
            v-model="customProtocol.parser" 
            rows="4"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 font-mono text-sm"
            placeholder="// data 为接收的字符串&#10;return data.split(',').map(Number)"
          ></textarea>
        </div>
      </div>

      <!-- 测试区 -->
      <div class="bg-cat-card rounded-xl p-4 space-y-4">
        <div class="font-medium">协议测试</div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-cat-muted block mb-1">测试数据</label>
            <textarea v-model="protocolTestInput" rows="3" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 font-mono text-sm"></textarea>
          </div>
          <div>
            <label class="text-xs text-cat-muted block mb-1">解析结果</label>
            <div class="h-20 bg-cat-surface border border-cat-border rounded-lg px-3 py-2 font-mono text-sm text-green-400 overflow-auto">
              {{ protocolTestResult }}
            </div>
          </div>
        </div>
        <button @click="testProtocol" class="cat-btn px-4 py-2 rounded-lg text-white text-sm">
          🧪 测试解析
        </button>
      </div>
    </div>
  </div>
</template>
