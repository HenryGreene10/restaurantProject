import React from 'react'
import { AssistantPanel } from '../assistant/AssistantPanel'

export const App: React.FC = () => {
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <h1>Admin Dashboard</h1>
      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div>
          <h2>Today</h2>
          <ul>
            <li>Revenue: —</li>
            <li>Orders: —</li>
            <li>GrubHub savings: —</li>
          </ul>
          <h2>Menu</h2>
          <p>Menu builder goes here (drag & drop).</p>
        </div>
        <AssistantPanel />
      </section>
    </div>
  )
}
