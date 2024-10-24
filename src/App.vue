<script setup lang="ts">
import Phonetic from '@/components/Phonetic.vue'
import { useMouse } from '@vueuse/core'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'

const mouse = useMouse()

function spaNavigate() {
  // Fallback for browsers that don't support this API:
  if (!document.startViewTransition) {
    document.documentElement.classList.toggle('dark')
    if (document.documentElement.classList.contains('dark')) {
      localStorage.setItem('scheme', 'dark')
    }
    else {
      localStorage.setItem('scheme', 'light')
    }
    return
  }

  // Get the click position, or fallback to the middle of the screen
  const x = mouse.x.value ?? innerWidth / 2
  const y = mouse.y.value ?? innerHeight / 2
  // Get the distance to the furthest corner
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  )

  // Create a transition:
  const transition = document.startViewTransition(() => {
    document.documentElement.classList.toggle('dark')
    if (document.documentElement.classList.contains('dark')) {
      localStorage.setItem('scheme', 'dark')
    }
    else {
      localStorage.setItem('scheme', 'light')
    }
  })

  // Wait for the pseudo-elements to be created:
  transition.ready.then(() => {
    // Animate the root's new view
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0 at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 500,
        easing: 'ease-in',
        // Specify which pseudo-element to animate
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })
}

function onSchemeChange() {
  spaNavigate()
}

const openaiApiKey = useLocalStorage('openaiApiKey', '')
const client = computed(() => new OpenAI({
  apiKey: openaiApiKey.value,
  dangerouslyAllowBrowser: true,
}))

const PhoneticResponse = z.object({ phonetic: z.array(
  z.object({
    ruby: z.optional(z.string()),
    text: z.string(),
  }),
) })

const text = ref('')
const loading = ref(false)
function containsJapanese(text: string): boolean {
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/
  return japaneseRegex.test(text)
}
async function readClipboard() {
  try {
    const clipboard = await navigator.clipboard.readText()
    if (containsJapanese(clipboard)) {
      text.value = clipboard
    }
    else {
      text.value = ''
    }

    text.value = clipboard
  }
  catch (err) {
    console.error('Failed to read clipboard contents: ', err)
  }
}

const data = asyncComputed(async () => {
  if (openaiApiKey.value === '') {
    text.value = 'OpenAI API key is not set.'
  }
  loading.value = true
  const chatCompletion = await client.value.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: `これから入力する日本語に読み仮名を付けます。漢字一つ一つに独立して読み仮名を付ける必要があります。`,
      },
      {
        role: 'user',
        content: `振り仮名`,
      },
      {
        role: 'assistant',
        content: `"{\"phonetic\":[{\"ruby\":\"ふ\",\"text\":\"振\"},{\"ruby\":\"り\",\"text\":\"り\"},{\"ruby\":\"が\",\"text\":\"仮\"},{\"ruby\":\"な\",\"text\":\"名\"}]}"`,
      },
      {
        role: 'user',
        content: text.value,
      },
    ],
    model: 'gpt-4o',
    response_format: zodResponseFormat(PhoneticResponse, 'phonetic'),
  })
  loading.value = false
  const phoneticStr = chatCompletion.choices[0].message.content!
  const phonetic = PhoneticResponse.parse(JSON.parse(phoneticStr)).phonetic
  return phonetic
}, [])
</script>

<template>
  <div class="roboto-regular pointer-events-none absolute inset-4 children:pointer-events-auto">
    <button
      class="absolute inline-block h-10 w-10 flex cursor-pointer select-none items-center justify-center rounded-xl transition-all hover:bg-gray/25"
      @pointerup="onSchemeChange"
    >
      <i class="dark:i-line-md-moon-loop i-line-md-sunny-loop block h-6 w-6 dark:h-6 dark:w-6" />
    </button>
    <div class="absolute right-0 h-10 w-10 flex cursor-pointer items-center gap-2 overflow-hidden rounded-2xl px-2 transition-all duration-500 hover:w-64 hover:bg-gray/25">
      <i class="i-lucide-key block h-6 w-6 shrink-0 dark:h-6 dark:w-6" />
      <input
        v-model="openaiApiKey"
        type="text"
        placeholder="OpenAI API key"
        class="h-full w-full bg-transparent outline-none"
      >
    </div>
  </div>

  <div
    class="noto-serif-jp-400 h-100vh flex flex-col cursor-pointer items-center justify-center gap-10 text-4xl lg:text-7xl md:text-6xl xl:text-8xl"
    @pointerup="readClipboard"
  >
    <Transition
      appear
      enter-active-class="transition-all duration-500 ease-in-out"
      enter-from-class="opacity-0 blur-100"
      enter-to-class="opacity-100 blur-0"
      leave-active-class="transition-all duration-500 ease-in-out"
      leave-from-class="opacity-100 blur-0"
      leave-to-class="opacity-0 blur-100"
    >
      <div
        v-if="text !== ''"
        class="absolute flex items-center justify-center"
      >
        <Transition
          mode="out-in"
          appear
          enter-active-class="transition-all duration-500 ease-in-out"
          enter-from-class="opacity-0 blur-100"
          enter-to-class="opacity-100 blur-0"
          leave-active-class="transition-all duration-500 ease-in-out"
          leave-from-class="opacity-100 blur-0"
          leave-to-class="opacity-0 blur-100"
        >
          <span v-if="loading">
            <i class="i-line-md-spin i-svg-spinners-pulse-ring block h-50 w-50" />
          </span>
          <Phonetic
            v-else-if="data"
            :data="data"
            class="inset-0 select-none"
          />
        </Transition>
      </div>
      <div
        v-else
        class="absolute flex flex-col items-center gap-10"
      >
        <Phonetic
          :data="[
            { text: '振', ruby: 'ふ' },
            { text: 'り' },
            { text: '仮', ruby: 'が' },
            { text: '名', ruby: 'な' },
          ]"
          class="select-none"
        />
        <Transition
          appear
          enter-active-class="transition-opacity duration-500 delay-500 ease-in-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-25"
          leave-active-class="transition-opacity duration-500 delay-500 ease-in-out"
          leave-from-class="opacity-25"
          leave-to-class="opacity-0"
        >
          <Phonetic
            :data="[
              { text: '振', ruby: 'ふ' },
              { text: 'り' },
              { text: '仮', ruby: 'が' },
              { text: '名', ruby: 'な' },
            ]"
            class="absolute select-none op-50 blur-50"
          />
        </Transition>
        <Transition
          appear
          enter-active-class="transition-all delay-500 duration-1000 ease-in-out"
          enter-from-class="opacity-0 blur-100"
          enter-to-class="opacity-50 blur-0"
          leave-active-class="transition-all delay-500 duration-1000 ease-in-out"
          leave-from-class="opacity-50 blur-0"
          leave-to-class="opacity-0 blur-100"
        >
          <div class="text-base op-50">
            調べたいテキストをコピーし、クリックすると読み方がわかります。
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@200..900&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');
:root {
  color-scheme: light;
}

.dark {
  color-scheme: dark;
}

::view-transition-image-pair(root) {
  isolation: auto;
}

::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
  display: block;
}

.noto-serif-jp-400 {
  font-family: "Noto Serif JP", serif;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
}

.hina-mincho-regular {
  font-family: "Hina Mincho", serif;
  font-weight: 400;
  font-style: normal;
}

.zen-antique-regular {
  font-family: "Zen Antique", serif;
  font-weight: 400;
  font-style: normal;
}

.rubik-lines-regular {
  font-family: "Rubik Lines", serif;
  font-weight: 400;
  font-style: normal;
}

.roboto-thin {
  font-family: "Roboto", sans-serif;
  font-weight: 100;
  font-style: normal;
}

.roboto-light {
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-style: normal;
}

.roboto-regular {
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-style: normal;
}

.roboto-medium {
  font-family: "Roboto", sans-serif;
  font-weight: 500;
  font-style: normal;
}

.roboto-bold {
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-style: normal;
}

.roboto-black {
  font-family: "Roboto", sans-serif;
  font-weight: 900;
  font-style: normal;
}

.roboto-thin-italic {
  font-family: "Roboto", sans-serif;
  font-weight: 100;
  font-style: italic;
}

.roboto-light-italic {
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-style: italic;
}

.roboto-regular-italic {
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-style: italic;
}

.roboto-medium-italic {
  font-family: "Roboto", sans-serif;
  font-weight: 500;
  font-style: italic;
}

.roboto-bold-italic {
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-style: italic;
}

.roboto-black-italic {
  font-family: "Roboto", sans-serif;
  font-weight: 900;
  font-style: italic;
}

ruby {
  text-align: center;
}
</style>
