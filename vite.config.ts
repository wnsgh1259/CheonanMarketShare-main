import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function readIdolEleven(root: string) {
  try {
    const raw = fs.readFileSync(path.join(root, 'idol-eleven.json'), 'utf8')
    const parsed = JSON.parse(raw) as { apiKey?: string; voiceId?: string }
    return {
      apiKey: (parsed.apiKey || '').trim(),
      voiceId: (parsed.voiceId || '').trim(),
    }
  } catch {
    return { apiKey: '', voiceId: '' }
  }
}

function attachIdolTts(middlewares: { use: Function }, root: string) {
  middlewares.use('/api/idol-tts', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end('Method Not Allowed')
      return
    }
    const { apiKey, voiceId } = readIdolEleven(root)
    if (!apiKey || !voiceId) {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'idol-eleven.json 에 apiKey / voiceId 를 넣어 주세요' }))
      return
    }

    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(Buffer.from(c)))
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as { text?: string }
        const text = typeof body.text === 'string' ? body.text.trim() : ''
        if (!text) {
          res.statusCode = 400
          res.end('text required')
          return
        }
        const upstream = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
              Accept: 'audio/mpeg',
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.45,
                similarity_boost: 0.8,
                style: 0.35,
                use_speaker_boost: true,
              },
            }),
          },
        )
        if (!upstream.ok) {
          res.statusCode = upstream.status
          res.end(await upstream.text())
          return
        }
        const buf = Buffer.from(await upstream.arrayBuffer())
        res.statusCode = 200
        res.setHeader('Content-Type', 'audio/mpeg')
        res.setHeader('Cache-Control', 'no-store')
        res.end(buf)
      } catch (err) {
        res.statusCode = 500
        res.end(err instanceof Error ? err.message : 'tts failed')
      }
    })
    req.on('error', () => next())
  })
}

/** idol-eleven.json 의 키로 개발/미리보기 서버에서 TTS */
function idolElevenTtsPlugin(): Plugin {
  return {
    name: 'idol-eleven-tts',
    configureServer(server) {
      attachIdolTts(server.middlewares, server.config.root)
    },
    configurePreviewServer(server) {
      attachIdolTts(server.middlewares, server.config.root)
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    idolElevenTtsPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
