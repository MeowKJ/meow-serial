<script setup>
import { ref, computed } from 'vue'
import { useSerialStore } from '../stores/serial'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()

// 预设表达式
const presets = [
  { label: '求和', expr: 'ch0 + ch1 + ch2' },
  { label: '平均', expr: '(ch0 + ch1 + ch2) / 3' },
  { label: '差值', expr: 'ch0 - ch1' },
  { label: '比率', expr: 'ch0 / ch1 * 100' }
]

const FUNCTIONS = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil
}

const OPERATORS = {
  '+': { precedence: 1, apply: (left, right) => left + right },
  '-': { precedence: 1, apply: (left, right) => left - right },
  '*': { precedence: 2, apply: (left, right) => left * right },
  '/': { precedence: 2, apply: (left, right) => left / right },
  '%': { precedence: 2, apply: (left, right) => left % right },
  '^': { precedence: 3, right: true, apply: (left, right) => Math.pow(left, right) }
}

const tokenizeExpression = (expr) => {
  const tokens = []
  let index = 0

  while (index < expr.length) {
    const char = expr[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (/[0-9.]/.test(char)) {
      let end = index + 1
      while (end < expr.length && /[0-9.eE+-]/.test(expr[end])) {
        const previous = expr[end - 1]
        if ((expr[end] === '+' || expr[end] === '-') && previous !== 'e' && previous !== 'E') break
        end += 1
      }
      tokens.push({ type: 'number', value: Number(expr.slice(index, end)) })
      index = end
      continue
    }

    if (/[a-z_]/i.test(char)) {
      let end = index + 1
      while (end < expr.length && /[a-z0-9_]/i.test(expr[end])) end += 1
      tokens.push({ type: 'identifier', value: expr.slice(index, end).toLowerCase() })
      index = end
      continue
    }

    if ('+-*/%^(),'.includes(char)) {
      tokens.push({ type: char, value: char })
      index += 1
      continue
    }

    throw new Error('Unsupported token')
  }

  return tokens
}

const evaluateExpression = (expr, variables) => {
  const tokens = tokenizeExpression(expr)
  let index = 0

  const peek = () => tokens[index]
  const consume = (type = null) => {
    const token = tokens[index]
    if (!token || (type && token.type !== type)) throw new Error('Unexpected expression')
    index += 1
    return token
  }

  const parseArguments = () => {
    const args = []
    consume('(')
    if (peek()?.type === ')') {
      consume(')')
      return args
    }

    while (index < tokens.length) {
      args.push(parseExpression(0))
      if (peek()?.type === ',') {
        consume(',')
        continue
      }
      consume(')')
      return args
    }

    throw new Error('Unclosed function call')
  }

  const parsePrimary = () => {
    const token = peek()
    if (!token) throw new Error('Unexpected end')

    if (token.type === '+') {
      consume('+')
      return parsePrimary()
    }

    if (token.type === '-') {
      consume('-')
      return -parsePrimary()
    }

    if (token.type === 'number') {
      consume('number')
      if (!Number.isFinite(token.value)) throw new Error('Invalid number')
      return token.value
    }

    if (token.type === 'identifier') {
      consume('identifier')
      if (peek()?.type === '(') {
        const fn = FUNCTIONS[token.value]
        if (!fn) throw new Error('Unsupported function')
        return fn(...parseArguments())
      }
      if (!Object.prototype.hasOwnProperty.call(variables, token.value)) {
        throw new Error('Unknown variable')
      }
      return variables[token.value]
    }

    if (token.type === '(') {
      consume('(')
      const value = parseExpression(0)
      consume(')')
      return value
    }

    throw new Error('Unexpected token')
  }

  const parseExpression = (minPrecedence) => {
    let left = parsePrimary()

    while (true) {
      const operator = OPERATORS[peek()?.type]
      if (!operator || operator.precedence < minPrecedence) break

      const symbol = consume().type
      const nextMin = operator.right ? operator.precedence : operator.precedence + 1
      const right = parseExpression(nextMin)
      left = OPERATORS[symbol].apply(left, right)
    }

    return left
  }

  const value = parseExpression(0)
  if (index !== tokens.length) throw new Error('Unexpected trailing tokens')
  return value
}

// 计算结果
const result = computed(() => {
  const expr = props.widget.expression
  if (!expr) return '—'
  
  try {
    const variables = {}
    store.channels.forEach((ch, i) => {
      variables[`ch${i}`] = Number(ch.value)
    })
    
    const value = evaluateExpression(expr, variables)
    
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return 'NaN'
      if (!Number.isFinite(value)) return '∞'
      return value.toFixed(props.widget.precision || 2)
    }
    
    return String(value)
  } catch (e) {
    return 'Error'
  }
})

// 应用预设
const applyPreset = (preset) => {
  props.widget.expression = preset.expr
}
</script>

<template>
  <div class="w-full h-full flex flex-col gap-2 p-1">
    <!-- 表达式输入 -->
    <div class="flex gap-1">
      <input 
        v-model="widget.expression" 
        placeholder="表达式: ch0 + ch1 * 2"
        class="flex-1 bg-cat-surface border border-cat-border rounded px-2 py-1 text-xs font-mono"
      >
    </div>
    
    <!-- 快捷预设 -->
    <div class="flex gap-1 flex-wrap">
      <button 
        v-for="preset in presets" 
        :key="preset.label"
        @click="applyPreset(preset)"
        class="px-2 py-0.5 bg-cat-surface hover:bg-cat-border rounded text-[10px] text-cat-muted"
      >
        {{ preset.label }}
      </button>
    </div>
    
    <!-- 结果显示 -->
    <div class="flex-1 flex items-center justify-center">
      <div 
        class="text-2xl font-bold"
        :class="result === 'Error' || result === 'NaN' ? 'text-red-400' : 'text-cat-primary'"
      >
        {{ result }}
      </div>
    </div>
    
    <!-- 通道变量提示 -->
    <div class="text-[10px] text-cat-muted text-center">
      可用变量: 
      <span v-for="(ch, i) in store.channels" :key="ch.id" class="mx-0.5">
        ch{{ i }}={{ ch.value.toFixed(1) }}
      </span>
    </div>
  </div>
</template>
