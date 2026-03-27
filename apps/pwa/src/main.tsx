import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrandProvider } from './brand/BrandProvider'
import { App } from './App'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrandProvider>
      <App />
    </BrandProvider>
  </React.StrictMode>
)
