import { authApi } from './server/authApi.js'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { minutesApi } from './server/minutesApi.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      fs: {
        deny: [
          '.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}',
          '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.data/**',
        ],
      },
    },
    plugins: [
      react(),
      authApi(process.cwd()),
      minutesApi(
        process.env.OPENAI_API_KEY || env.OPENAI_API_KEY || '',
        process.env.OPENAI_MODEL || env.OPENAI_MODEL || 'gpt-4.1-mini',
      ),
    ],
  }
})
