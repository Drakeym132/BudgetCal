import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig
      reducedMotion="never"
      transition={{ type: 'tween', duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <App />
    </MotionConfig>
  </StrictMode>,
)
