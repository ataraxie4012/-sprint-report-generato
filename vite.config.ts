import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { minutesApi } from './server/minutesApi.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      minutesApi(
        process.env.OPENAI_API_KEY || env.OPENAI_API_KEY || '',
        process.env.OPENAI_MODEL || env.OPENAI_MODEL || 'gpt-4.1-mini',
      ),
    ],
  }
})
