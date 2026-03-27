import React, { useEffect, useState } from 'react'

type Variant = { id: string; name: string; priceDelta: number }

type Item = {
  id: string
  name: string
  description?: string
  photoUrl?: string
  basePrice: number
  variants: Variant[]
}

type Category = { id: string; name: string; items: Item[] }

export const MenuPage: React.FC = () => {
  const [menu, setMenu] = useState<Category[]>([])
  useEffect(() => {
    fetch('/v1/menu').then(r => r.json()).then(data => setMenu(data.categories || [])).catch(() => {})
  }, [])
  return (
    <main style={{ padding: 12 }}>
      {menu.map(cat => (
        <section key={cat.id} style={{ marginBottom: 24 }}>
          <h2>{cat.name}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {cat.items.map(it => (
              <article key={it.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                {it.photoUrl && <img src={it.photoUrl} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }} />}
                <h3>{it.name}</h3>
                {it.description && <p style={{ color: '#6b7280' }}>{it.description}</p>}
                <p style={{ fontWeight: 600 }}>${(it.basePrice/100).toFixed(2)}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
