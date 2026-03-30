<script setup>
import { computed } from 'vue'
import { getFluentEmojiMeta, getFluentEmojiUrl } from '../../lib/fluentEmoji'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 20
  },
  alt: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  }
})

const emojiMeta = computed(() => getFluentEmojiMeta(props.name))
const imageSize = computed(() => {
  const numeric = Number(props.size)
  return Number.isFinite(numeric) ? `${numeric}px` : props.size
})
const imageSrc = computed(() => getFluentEmojiUrl(props.name))
const fallbackGlyph = computed(() => emojiMeta.value?.fallback || '')
const accessibleLabel = computed(() => props.alt || emojiMeta.value?.assetName || props.name)
</script>

<template>
  <img
    v-if="imageSrc"
    :src="imageSrc"
    :alt="accessibleLabel"
    :title="title || accessibleLabel"
    :style="{ width: imageSize, height: imageSize }"
    class="inline-block align-middle object-contain shrink-0"
    loading="lazy"
    decoding="async"
  >
  <span v-else class="inline-block align-middle">{{ fallbackGlyph }}</span>
</template>
