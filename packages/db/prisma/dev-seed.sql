INSERT INTO "Restaurant" (id, slug, name) VALUES
  (gen_random_uuid(), 'demo', 'Demo Deli')
ON CONFLICT (slug) DO NOTHING;

-- Map domain demo.localhost to the demo restaurant
INSERT INTO "Domain" (id, hostname, "restaurantId")
SELECT gen_random_uuid(), 'demo.localhost', r.id FROM "Restaurant" r WHERE r.slug = 'demo'
ON CONFLICT (hostname) DO NOTHING;

-- Default brand theme
INSERT INTO "BrandTheme" (id, "restaurantId", config)
SELECT gen_random_uuid(), r.id, '{"primaryColor":"#0ea5e9","onPrimary":"#ffffff","appTitle":"Demo Deli"}'::jsonb
FROM "Restaurant" r WHERE r.slug = 'demo'
ON CONFLICT ("restaurantId") DO NOTHING;

-- Sample menu
INSERT INTO "MenuCategory" (id, name, position, "restaurantId")
SELECT gen_random_uuid(), 'Pizzas', 1, r.id FROM "Restaurant" r WHERE r.slug = 'demo';

INSERT INTO "MenuItem" (id, name, description, "basePrice", availability, "restaurantId", "categoryId")
SELECT gen_random_uuid(), 'Margherita', 'Tomato, mozzarella, basil', 1299, 'available', r.id, c.id
FROM "Restaurant" r JOIN "MenuCategory" c ON c."restaurantId" = r.id AND c.name = 'Pizzas'
WHERE r.slug = 'demo'
ON CONFLICT DO NOTHING;
