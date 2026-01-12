<script setup>
/**
 * 进制转换输入框组件
 * 支持二进制、八进制、十进制、十六进制之间的相互转换
 * 根据选择的进制自动验证输入
 */
import { ref, computed, watch } from 'vue'
import { notify } from '../../utils/notification'

// 支持的进制
const bases = [
  { value: 2, name: '二进制', prefix: '0b', pattern: /^[01]*$/, placeholder: '只能输入 0 或 1' },
  { value: 8, name: '八进制', prefix: '0o', pattern: /^[0-7]*$/, placeholder: '只能输入 0-7' },
  { value: 10, name: '十进制', prefix: '', pattern: /^[0-9]*$/, placeholder: '只能输入 0-9' },
  { value: 16, name: '十六进制', prefix: '0x', pattern: /^[0-9A-Fa-f]*$/, placeholder: '只能输入 0-9 和 A-F' }
]

// 当前选择的进制
const selectedBase = ref(10)

// 输入值
const inputValue = ref('')

// 输入错误信息
const errorMsg = ref('')

// 获取当前进制配置
const currentBase = computed(() => {
  return bases.find(b => b.value === selectedBase.value) || bases[2]
})

// 验证输入
const validateInput = (value) => {
  if (!value) {
    errorMsg.value = ''
    return true
  }

  const base = currentBase.value
  if (!base.pattern.test(value)) {
    errorMsg.value = `${base.name}${base.placeholder}`
    return false
  }

  errorMsg.value = ''
  return true
}

// 处理输入变化
const handleInput = (e) => {
  const value = e.target.value.toUpperCase()

  // 验证输入
  if (validateInput(value)) {
    inputValue.value = value
  } else {
    // 过滤无效字符
    const base = currentBase.value
    const filtered = value.split('').filter(char => base.pattern.test(char)).join('')
    inputValue.value = filtered
    e.target.value = filtered
  }
}

// 切换进制时转换值
watch(selectedBase, (newBase, oldBase) => {
  if (!inputValue.value) return

  try {
    // 先转换为十进制
    const decimal = parseInt(inputValue.value, oldBase)
    if (isNaN(decimal)) {
      inputValue.value = ''
      return
    }
    // 再转换为新进制
    inputValue.value = decimal.toString(newBase).toUpperCase()
    errorMsg.value = ''
  } catch (e) {
    inputValue.value = ''
  }
})

// 计算转换结果
const conversions = computed(() => {
  if (!inputValue.value) return []

  try {
    const decimal = parseInt(inputValue.value, selectedBase.value)
    if (isNaN(decimal) || decimal < 0) return []

    return bases
      .filter(b => b.value !== selectedBase.value)
      .map(b => ({
        ...b,
        result: b.prefix + decimal.toString(b.value).toUpperCase()
      }))
  } catch (e) {
    return []
  }
})

// 十进制值（用于显示）
const decimalValue = computed(() => {
  if (!inputValue.value) return null
  try {
    const val = parseInt(inputValue.value, selectedBase.value)
    return isNaN(val) ? null : val
  } catch (e) {
    return null
  }
})

// 复制结果
const copyResult = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    notify.success('已复制到剪贴板喵~')
  } catch (e) {
    notify.error('复制失败喵~')
  }
}

// 清空输入
const clearInput = () => {
  inputValue.value = ''
  errorMsg.value = ''
}
</script>

<template>
  <div class="base-converter bg-cat-card rounded-lg border border-cat-border p-3">
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-3">
      <div class="text-sm font-medium text-cat-text flex items-center gap-2">
        <span>进制转换</span>
        <span class="text-xs text-cat-muted">(数值计算器)</span>
      </div>
      <button v-if="inputValue" @click="clearInput"
        class="text-xs text-cat-muted hover:text-cat-text transition-colors">
        清空
      </button>
    </div>

    <!-- 输入区 -->
    <div class="flex gap-2 mb-3">
      <!-- 进制选择 -->
      <select v-model="selectedBase"
        class="bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm text-cat-text focus:border-cat-primary outline-none transition-colors">
        <option v-for="base in bases" :key="base.value" :value="base.value">
          {{ base.name }}
        </option>
      </select>

      <!-- 输入框 -->
      <div class="flex-1 relative">
        <input
          :value="inputValue"
          @input="handleInput"
          :placeholder="currentBase.placeholder"
          class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm font-mono text-cat-text focus:border-cat-primary outline-none transition-colors"
          :class="{ 'border-red-500': errorMsg }"
        >
        <!-- 前缀标识 -->
        <span v-if="inputValue && currentBase.prefix"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-cat-muted text-xs pointer-events-none opacity-0">
          {{ currentBase.prefix }}
        </span>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="text-xs text-red-400 mb-2">
      {{ errorMsg }}
    </div>

    <!-- 转换结果 -->
    <div v-if="conversions.length > 0" class="space-y-2">
      <div class="text-xs text-cat-muted mb-1">转换结果:</div>
      <div class="grid grid-cols-1 gap-2">
        <div v-for="conv in conversions" :key="conv.value"
          class="flex items-center justify-between bg-cat-surface rounded-lg px-3 py-2 group hover:bg-cat-border/50 transition-colors">
          <div class="flex items-center gap-2">
            <span class="text-xs text-cat-muted w-16">{{ conv.name }}:</span>
            <span class="font-mono text-sm text-cat-terminal-accent">{{ conv.result }}</span>
          </div>
          <button @click="copyResult(conv.result)"
            class="text-xs text-cat-muted opacity-0 group-hover:opacity-100 hover:text-cat-primary transition-all">
            复制
          </button>
        </div>
      </div>

      <!-- 十进制值显示（如果当前不是十进制） -->
      <div v-if="selectedBase !== 10 && decimalValue !== null"
        class="text-xs text-cat-muted mt-2 pt-2 border-t border-cat-border">
        十进制值: <span class="text-cat-terminal-accent font-mono">{{ decimalValue }}</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!inputValue" class="text-xs text-cat-muted text-center py-2">
      输入数值即可实时转换
    </div>
  </div>
</template>

<style scoped>
.base-converter select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394A3B8' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}
</style>
