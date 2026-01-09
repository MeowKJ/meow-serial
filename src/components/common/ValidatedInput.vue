<script setup>
/**
 * 带验证的输入组件
 * 自动根据类型过滤和验证输入
 */
import { ref, computed, watch, onMounted } from 'vue'
import { filters } from '../../utils/validators'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'hex', 'binary', 'decimal', 'positiveInt', 'float', 'timestamp', 'datetime', 'port', 'interval', 'hexBytes'].includes(v)
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  mono: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  min: {
    type: Number,
    default: null
  },
  max: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'input', 'change', 'blur', 'focus'])

const inputRef = ref(null)
const localError = ref('')

// 计算类型对应的占位符
const computedPlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder

  const placeholders = {
    hex: '输入十六进制 (0-9, A-F)...',
    binary: '输入二进制 (0-1)...',
    decimal: '输入十进制数字...',
    positiveInt: '输入正整数...',
    float: '输入数字...',
    timestamp: 'Unix 时间戳...',
    datetime: 'YYYY-MM-DD HH:MM:SS',
    port: '端口 (0-65535)',
    interval: '间隔 (ms)',
    hexBytes: '如: 01 02 03 FF'
  }
  return placeholders[props.type] || ''
})

// 尺寸类
const sizeClass = computed(() => {
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }
  return sizes[props.size]
})

// 获取过滤器
const getFilter = () => {
  return filters[props.type] || ((v) => v)
}

// 处理输入
const handleInput = (event) => {
  const input = event.target.value
  const filter = getFilter()
  let filtered = filter(input)

  // 额外的范围检查
  if (props.type === 'positiveInt' || props.type === 'decimal') {
    const num = parseInt(filtered)
    if (!isNaN(num)) {
      if (props.min !== null && num < props.min) {
        localError.value = `最小值 ${props.min}`
      } else if (props.max !== null && num > props.max) {
        localError.value = `最大值 ${props.max}`
        filtered = props.max.toString()
      } else {
        localError.value = ''
      }
    }
  }

  // 更新输入框值
  if (filtered !== input) {
    event.target.value = filtered
  }

  emit('update:modelValue', filtered)
  emit('input', filtered)
}

const handleChange = (event) => {
  emit('change', event.target.value)
}

const handleBlur = (event) => {
  emit('blur', event.target.value)
}

const handleFocus = (event) => {
  emit('focus', event.target.value)
}

// 错误信息
const errorMessage = computed(() => props.error || localError.value)

// 暴露方法
const focus = () => inputRef.value?.focus()
const blur = () => inputRef.value?.blur()
const select = () => inputRef.value?.select()

defineExpose({ focus, blur, select })
</script>

<template>
  <div class="relative">
    <input
      ref="inputRef"
      :value="modelValue"
      @input="handleInput"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
      :placeholder="computedPlaceholder"
      :disabled="disabled"
      :readonly="readonly"
      :class="[
        'w-full bg-cat-surface border rounded transition-colors',
        sizeClass,
        mono ? 'font-mono' : '',
        errorMessage
          ? 'border-red-500 focus:border-red-500'
          : 'border-cat-border focus:border-cat-primary',
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
    />
    <!-- 类型标签 -->
    <span
      v-if="type !== 'text'"
      class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-cat-muted pointer-events-none"
    >
      {{ type.toUpperCase() }}
    </span>
    <!-- 错误提示 -->
    <div v-if="errorMessage" class="text-red-400 text-xs mt-1">
      {{ errorMessage }}
    </div>
  </div>
</template>
