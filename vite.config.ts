import { defineConfig, loadEnv, type Plugin } from 'vite'
import path from 'path'
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

/** ElevenLabs 보이스 ID로 대사를 바로 읽기 — API 키는 서버(개발 서버)에만 둠 */
function idolElevenTtsPlugin(): Plugin {
  return {
    name: 'idol-eleven-tts',
    configureServer(server) {
      server.middlewares.use('/api/idol-tts', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        const env = loadEnv(server.config.mode, server.config.root, '')
        const apiKey = env.ELEVEN_API_KEY || process.env.ELEVEN_API_KEY
        const voiceId = env.ELEVEN_VOICE_ID || process.env.ELEVEN_VOICE_ID
        if (!apiKey || !voiceId) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'ELEVEN_API_KEY / ELEVEN_VOICE_ID missing in .env' }))
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(Buffer.from(c)))
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

