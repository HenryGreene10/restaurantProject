import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Order = { id: string; name?: string; items: { name: string; quantity: number }[]; createdAt: string; status: string; pickupTime?: string }

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch('/v1/kitchen/orders')
        const data = await res.json()
        setOrders(data.orders || [])
      } catch {}
    }, 5000)
    return () => clearInterval(iv)
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui', padding: 16, background: '#111827', color: 'white', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 16 }}>Kitchen</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {orders.map(o => (
          <section key={o.id} style={{ background: '#1f2937', borderRadius: 8, padding: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Order #{o.id.slice(0,6)}</h2>
            <p style={{ margin: '4px 0', color: '#9ca3af' }}>{new Date(o.createdAt).toLocaleTimeString()}</p>
            <ul>
              {o.items.map((it, i) => <li key={i}>{it.quantity} × {it.name}</li>)}
            </ul>
            <p>Status: {o.status.replaceAll('_', ' ')}</p>
          </section>
        ))}
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
