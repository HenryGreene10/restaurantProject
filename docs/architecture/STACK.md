# Tech Stack (Locked)

| Layer          | Choice                                      |
|----------------|---------------------------------------------|
| Runtime        | Node.js + TypeScript                        |
| Backend        | Fastify                                     |
| Database       | PostgreSQL + Prisma                         |
| Frontend       | React + Vite PWA                            |
| Styling        | Tailwind CSS + CSS variables (per tenant)   |
| Auth           | Custom JWT + Twilio Verify (phone OTP)      |
| SMS            | Twilio Verify (OTP), Twilio Messaging (SMS) |
| Payments       | Stripe Connect Standard + Stripe Billing    |
| Hosting        | Railway/Render (API), Vercel (web)          |
| Monorepo       | Turborepo                                   |

Notes:
- Stripe Connect starts in Standard mode.
- Automated SSL for custom domains (ACME) via Vercel/Cloudflare patterns.
