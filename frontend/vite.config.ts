import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const shareCopyPath = path.resolve(__dirname, 'src/config/share-copy.json')

type ShareCopy = {
  og: {
    title: string
    description: string
    siteName: string
    url: string
    image: string
    imageAlt: string
  }
}

function loadShareCopy(): ShareCopy {
  return JSON.parse(fs.readFileSync(shareCopyPath, 'utf-8')) as ShareCopy
}

function injectOgMeta(): Plugin {
  const apply = (html: string) => {
    const { og } = loadShareCopy()
    return html
      .replaceAll('%OG_TITLE%', og.title)
      .replaceAll('%OG_DESCRIPTION%', og.description)
      .replaceAll('%OG_SITE_NAME%', og.siteName)
      .replaceAll('%OG_URL%', og.url)
      .replaceAll('%OG_IMAGE%', og.image)
      .replaceAll('%OG_IMAGE_ALT%', og.imageAlt)
  }

  return {
    name: 'inject-og-meta',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return apply(html)
      },
    },
    configureServer(server) {
      server.watcher.add(shareCopyPath)
      server.watcher.on('change', (file) => {
        if (path.resolve(file) === shareCopyPath) {
          server.ws.send({ type: 'full-reload' })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [injectOgMeta(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
