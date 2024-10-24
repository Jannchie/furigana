<script setup lang="ts">
const hello = useHelloWorld()
</script>

<template>
  <div class="h-100vh w-100vw flex items-center justify-center bg-[#090909] text-[#E9994C]">
    <div class="relative">
      <div class="pointer-events-none absolute top-0 select-none text-nowrap text-[#cc4c19] font-bold blur-20">
        {{ hello }}
      </div>
      <div>
        {{ hello }}
      </div>
    </div>
  </div>
</template>
