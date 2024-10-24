// uno.config.ts
import presetIcons from '@unocss/preset-icons'
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetIcons(),
    presetUno(),
  ],
})
