// DEFERRED: This PWA app is a skeleton. The production customer ordering
// flow lives in apps/web/src/storefront/. Build this out once the web
// storefront is stable and there is demand for an installable PWA experience.
import React from 'react'
import { useBrand } from './brand/BrandProvider'
import { MenuPage } from './pages/MenuPage'

export const App: React.FC = () => {
  const { theme } = useBrand()
  return (
    <div style={{ fontFamily: theme.fontFamily || 'system-ui' }}>
      <header
        style={{
          background: theme.primaryColor || '#0ea5e9',
          color: theme.onPrimary || 'white',
          padding: 12,
        }}
      >
        <img src={theme.logoUrl || ''} alt="logo" style={{ height: 32, verticalAlign: 'middle' }} />
        <span style={{ marginLeft: 8, fontWeight: 600 }}>{theme.appTitle || 'Order Online'}</span>
      </header>
      <MenuPage />
    </div>
  )
}
