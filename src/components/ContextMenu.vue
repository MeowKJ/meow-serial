<script setup>
defineProps({
  x: Number,
  y: Number,
  items: Array
})
const emit = defineEmits(['close'])

const handleClick = (item) => {
  if (item.action) item.action()
  emit('close')
}
</script>

<template>
  <div 
    class="context-menu fixed z-50" 
    :style="{left: x + 'px', top: y + 'px'}"
    @click="emit('close')"
  >
    <template v-for="item in items" :key="item.label">
      <div v-if="item.divider" class="h-px bg-cat-border my-1"></div>
      <button 
        v-else 
        @click="handleClick(item)"
        :class="[
          'w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-cat-surface',
          item.danger ? 'text-red-400' : 'text-cat-text'
        ]"
      >
        <span>{{ item.icon }}</span>
        {{ item.label }}
      </button>
    </template>
  </div>
</template>
