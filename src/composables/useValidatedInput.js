/**
 * 验证输入的 Vue Composable
 * 提供实时输入验证和过滤功能
 */

import { ref, watch, computed } from 'vue'
import { filters, validators, converters, checksums } from '../utils/validators'

/**
 * 创建带验证的输入
 * @param {string} type - 输入类型: 'hex' | 'binary' | 'decimal' | 'positiveInt' | 'float' | 'timestamp' | 'datetime' | 'port' | 'interval'
 * @param {any} initialValue - 初始值
 * @param {Object} options - 配置选项
 */
export function useValidatedInput(type, initialValue = '', options = {}) {
  const value = ref(initialValue)
  const rawValue = ref(initialValue)
  const isValid = ref(true)
  const errorMessage = ref('')

  const {
    required = false,
    min = null,
    max = null,
    onChange = null
  } = options

  // 获取对应的过滤器
  const filter = filters[type] || ((v) => v)

  // 处理输入
  const handleInput = (event) => {
    const input = event.target?.value ?? event
    rawValue.value = input

    // 应用过滤器
    const filtered = filter(input.toString())
    value.value = filtered

    // 验证
    validate()

    // 触发 onChange
    if (onChange) {
      onChange(filtered)
    }

    // 如果过滤后的值不同，更新 input
    if (event.target && filtered !== input) {
      event.target.value = filtered
    }
  }

  // 验证
  const validate = () => {
    isValid.value = true
    errorMessage.value = ''

    const val = value.value

    // 必填验证
    if (required && !val) {
      isValid.value = false
      errorMessage.value = '此项为必填'
      return false
    }

    // 空值不进行其他验证
    if (!val) return true

    // 类型特定验证
    switch (type) {
      case 'hex':
        if (!/^[0-9A-Fa-f\s]*$/.test(val)) {
          isValid.value = false
          errorMessage.value = '只能输入十六进制字符'
        }
        break

      case 'binary':
        if (!/^[01\s]*$/.test(val)) {
          isValid.value = false
          errorMessage.value = '只能输入0和1'
        }
        break

      case 'decimal':
      case 'positiveInt':
        const num = parseInt(val)
        if (isNaN(num)) {
          isValid.value = false
          errorMessage.value = '请输入有效数字'
        } else {
          if (min !== null && num < min) {
            isValid.value = false
            errorMessage.value = `最小值为 ${min}`
          }
          if (max !== null && num > max) {
            isValid.value = false
            errorMessage.value = `最大值为 ${max}`
          }
        }
        break

      case 'port':
        const port = parseInt(val)
        if (isNaN(port) || port < 0 || port > 65535) {
          isValid.value = false
          errorMessage.value = '端口范围 0-65535'
        }
        break

      case 'interval':
        const interval = parseInt(val)
        if (isNaN(interval) || interval < 100) {
          isValid.value = false
          errorMessage.value = '最小间隔 100ms'
        }
        break

      case 'timestamp':
        if (!/^\d+$/.test(val)) {
          isValid.value = false
          errorMessage.value = '请输入有效时间戳'
        }
        break

      case 'datetime':
        const date = new Date(val)
        if (isNaN(date.getTime())) {
          isValid.value = false
          errorMessage.value = '请输入有效日期时间'
        }
        break
    }

    return isValid.value
  }

  // 设置值
  const setValue = (newValue) => {
    rawValue.value = newValue
    value.value = filter(newValue.toString())
    validate()
  }

  // 清空
  const clear = () => {
    value.value = ''
    rawValue.value = ''
    isValid.value = true
    errorMessage.value = ''
  }

  return {
    value,
    rawValue,
    isValid,
    errorMessage,
    handleInput,
    validate,
    setValue,
    clear
  }
}

/**
 * 创建进制转换器
 */
export function useBaseConverter() {
  const inputValue = ref('')
  const inputBase = ref('dec') // 'bin' | 'dec' | 'hex'

  const results = computed(() => {
    return converters.convert(inputValue.value, inputBase.value)
  })

  const setInput = (value, base) => {
    inputValue.value = value
    if (base) inputBase.value = base
  }

  const handleInput = (event) => {
    const input = event.target?.value ?? event
    let filtered = input

    // 根据当前进制过滤输入
    switch (inputBase.value) {
      case 'bin':
        filtered = filters.binary(input)
        break
      case 'hex':
        filtered = filters.hex(input)
        break
      case 'dec':
        filtered = filters.decimal(input)
        break
    }

    inputValue.value = filtered
    if (event.target && filtered !== input) {
      event.target.value = filtered
    }
  }

  return {
    inputValue,
    inputBase,
    results,
    setInput,
    handleInput
  }
}

/**
 * 创建校验和计算器
 */
export function useChecksumCalculator() {
  const input = ref('')
  const checksumType = ref('crc16')

  const result = computed(() => {
    return checksums.calculate(input.value, checksumType.value)
  })

  const setInput = (value) => {
    input.value = value
  }

  const setType = (type) => {
    checksumType.value = type
  }

  return {
    input,
    checksumType,
    result,
    setInput,
    setType
  }
}

/**
 * 创建时间戳转换器
 */
export function useTimestampConverter() {
  const input = ref('')
  const mode = ref('toDate') // 'toDate' | 'toUnix'

  const result = computed(() => {
    const val = input.value.trim()
    if (!val) return ''

    try {
      if (mode.value === 'toDate') {
        const ts = parseInt(val)
        if (isNaN(ts)) return 'Invalid'
        const date = new Date(val.length <= 10 ? ts * 1000 : ts)
        return date.toLocaleString('zh-CN')
      } else {
        const date = new Date(val)
        if (isNaN(date.getTime())) return 'Invalid'
        return Math.floor(date.getTime() / 1000).toString()
      }
    } catch {
      return 'Invalid'
    }
  })

  const insertNow = () => {
    if (mode.value === 'toDate') {
      input.value = Math.floor(Date.now() / 1000).toString()
    } else {
      input.value = new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
  }

  const handleInput = (event) => {
    const val = event.target?.value ?? event
    if (mode.value === 'toDate') {
      input.value = filters.unixTimestamp(val)
    } else {
      input.value = filters.datetime(val)
    }
    if (event.target && input.value !== val) {
      event.target.value = input.value
    }
  }

  return {
    input,
    mode,
    result,
    insertNow,
    handleInput
  }
}

export default {
  useValidatedInput,
  useBaseConverter,
  useChecksumCalculator,
  useTimestampConverter
}
