import React from 'react'
import { useBrand } from '../brand/BrandProvider'

export const MenuPage: React.FC = () => {
  const { categories } = useBrand()

  return (
    <main style={{ padding: 12 }}>
      {categories.map((cat) => (
        <section key={cat.id} style={{ marginBottom: 24 }}>
          <h2>{cat.name}</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {cat.categoryItems.map(({ item }) => (
              <article
                key={item.id}
                style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}
              >
                {item.photoUrl && (
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }}
                  />
                )}
                <h3>{item.name}</h3>
                {item.description && <p style={{ color: '#6b7280' }}>{item.description}</p>}
                <p style={{ fontWeight: 600 }}>
                  ${((item.variants[0]?.priceCents ?? item.basePriceCents) / 100).toFixed(2)}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
