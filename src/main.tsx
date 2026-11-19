import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Login from './Login.tsx'
import AlertProvider from './AlertProvider'
import { initializeTheme } from './theme'
import './darkMode.css'
import './responsive.css'
import './uiRefinements.css'

initializeTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider><Login /></AlertProvider>
  </StrictMode>,
)
