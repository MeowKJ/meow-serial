import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_LOCALE, getSavedLocale, normalizeLocale, persistLocale, translateWithLocale } from '../i18n'

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref(getSavedLocale())

  const localeOptions = computed(() => [
    { value: DEFAULT_LOCALE, shortLabel: '中', label: translateWithLocale(locale.value, 'theme.locales.zh-CN') },
    { value: 'en', shortLabel: 'EN', label: translateWithLocale(locale.value, 'theme.locales.en') }
  ])

  const setLocale = (nextLocale) => {
    locale.value = normalizeLocale(nextLocale)
  }

  const toggleLocale = () => {
    locale.value = locale.value === 'en' ? DEFAULT_LOCALE : 'en'
  }

  const t = (key, params = {}) => translateWithLocale(locale.value, key, params)

  watch(locale, (nextLocale) => {
    persistLocale(nextLocale)
  }, { immediate: true })

  return {
    locale,
    localeOptions,
    setLocale,
    toggleLocale,
    t
  }
})
