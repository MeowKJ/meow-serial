<script setup>
/**
 * 按钮组组件
 * 用于切换选项
 */
const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  options: {
    type: Array,
    required: true
    // 格式: [{ id: 'xxx', name: 'XXX' }] 或 ['a', 'b', 'c']
  },
  size: {
    type: String,
    default: 'sm',
    validator: (v) => ['xs', 'sm', 'md'].includes(v)
  },
  fullWidth: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const normalizedOptions = computed(() => {
  return props.options.map(opt => {
    if (typeof opt === 'object') {
      return { id: opt.id, name: opt.name || opt.id }
    }
    return { id: opt, name: opt }
  })
})

const sizeClass = computed(() => {
  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  }
  return sizes[props.size]
})

import { computed } from 'vue'

const select = (id) => {
  emit('update:modelValue', id)
  emit('change', id)
}
</script>

<template>
  <div :class="['flex gap-1', fullWidth ? '' : 'inline-flex']">
    <button
      v-for="opt in normalizedOptions"
      :key="opt.id"
      @click="select(opt.id)"
      :class="[
        'rounded transition-colors',
        sizeClass,
        fullWidth ? 'flex-1' : '',
        modelValue === opt.id
          ? 'bg-cat-primary text-white'
          : 'bg-cat-surface text-cat-muted hover:text-cat-text'
      ]"
    >
      {{ opt.name }}
    </button>
  </div>
</template>
