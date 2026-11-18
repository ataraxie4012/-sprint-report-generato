import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Login from './Login.tsx'
import { initializeTheme } from './theme'
import './darkMode.css'
import './responsive.css'

initializeTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Login />
  </StrictMode>,
)
