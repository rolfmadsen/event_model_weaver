import { defineConfig, PluginOption } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to exclude problematic modules like 'text-encoding' from the build,
// which is a known issue when bundling GUN.js's SEA module for the browser.
const moduleExclude = (match: string): PluginOption => {
  const m = (id: string) => id.includes(match)
  return {
    name: `exclude-${match}`,
    resolveId(id) {
      if (m(id)) return id
    },
    load(id) {
      if (m(id)) return `export default {}`
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), moduleExclude('text-encoding')],
  optimizeDeps: {
    include: [
      'gun',
      'gun/gun',
      'gun/sea',
      'gun/sea.js',
      'gun/lib/then',
      'gun/lib/webrtc',
      'gun/lib/radix',
      'gun/lib/radisk',
      'gun/lib/store',
      'gun/lib/rindexed',
    ],
  },
})