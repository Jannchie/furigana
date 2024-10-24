<script setup lang="ts">
defineProps<{
  data: {
    text: string
    ruby?: string
  }[]
}>()

function isNotKana(text: string): boolean {
  const kanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/
  return !kanaRegex.test(text)
}
</script>

<template>
  <ruby>
    <template
      v-for="({ text, ruby }, index) in data"
      :key="index"
    >
      {{ text }}
      <template v-if="ruby && isNotKana(text)">
        <rp>(</rp>
        <rt>{{ ruby }}</rt>
        <rp>)</rp>
      </template>
      <rt v-else />
    </template>
  </ruby>
</template>
