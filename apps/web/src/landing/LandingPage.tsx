import { useEffect } from 'react'
import './landing.css'

const CHECK = (
  <svg
    width="9"
    height="9"
    viewBox="0 0 9 9"
    fill="none"
    stroke="#22c55e"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <path d="M1.5 4.5l2 2 4-4" />
  </svg>
)

export function LandingPage() {
  useEffect(() => {
    document.title = 'EasyMenu — Direct ordering for independent restaurants'

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('v')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    )
    document.querySelectorAll('.lp-root .r').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="lp-root">
      {/* ── NAV ── */}
      <nav>
        <div className="nav-wrap">
          <a href="#" className="nav-logo">
            <div className="nav-logo-mark">
              <img
                src="/landing/logo.png"
                alt="EasyMenu"
                style={{ width: 28, height: 28, objectFit: 'contain' }}
              />
            </div>
            <span>EasyMenu</span>
          </a>
          <div className="nav-center">
            <a href="#product">Product</a>
            <a href="#pricing">Pricing</a>
            <a href="#comparison">Compare</a>
          </div>
          <div className="nav-right">
            <a href="https://admin.easymenu.website" className="btn-ghost">
              Sign in
            </a>
            <a href="https://admin.easymenu.website/signup" className="btn-sm">
              Start for $279
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M2 6h8M6 2l4 4-4 4" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero-wrap">
        <div className="hero-text">
          <div className="eyebrow r">
            <div className="eyebrow-dot" /> No commission. Guided launch included.
          </div>
          <h1 className="r rd1">
            Online ordering
            <br />
            <span className="dim">built for restaurants,</span>
            <br />
            not platforms.
          </h1>
          <p className="hero-sub r rd2">
            EasyMenu gives independent restaurants a fully branded direct-ordering system. We help
            you get live with menu setup, Stripe connection, and website linking. $279 to launch,
            then $79/month flat.
          </p>
          <div className="hero-actions r rd3">
            <a href="https://admin.easymenu.website/signup" className="btn-primary">
              Let&apos;s get started for $279
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 7h8M7 3l4 4-4 4" />
              </svg>
            </a>
            <a href="#product" className="btn-outline">
              See how it works
            </a>
          </div>
          <div className="hero-note r rd4">
            Includes initial menu setup, Stripe connection, and help linking from your website
          </div>
        </div>

        <div className="hero-ss-wrap r rd2">
          <div className="ss-frame">
            <div className="ss-chrome">
              <div className="ss-dot" style={{ background: '#ff5f57' }} />
              <div className="ss-dot" style={{ background: '#febc2e' }} />
              <div className="ss-dot" style={{ background: '#28c840' }} />
              <div className="ss-url">admin.easymenu.website — Loyalty Program</div>
            </div>
            <img
              src="/landing/hero-admin.png"
              alt="EasyMenu admin dashboard showing loyalty analytics and live storefront preview"
            />
          </div>
          <div className="hero-glow" />
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <div className="trust">
        <div className="trust-inner">
          <div className="trust-label">Payments &amp; infrastructure</div>
          <div className="trust-sep" />
          <div className="trust-items">
            {[
              'Stripe Connect',
              'Apple Pay',
              'Google Pay',
              'Klarna',
              'Cash App Pay',
              'Twilio SMS',
              'Cloudflare R2',
            ].map((t) => (
              <div className="trust-item" key={t}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PRODUCT TOUR ── */}
      <div id="product" />

      {/* Feature 1: Branded storefront */}
      <section>
        <div className="wrap">
          <div className="feat-row r">
            <div>
              <div className="feat-tag">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <rect x="1" y="2" width="10" height="8" rx="1.5" />
                  <path d="M4 5h4M4 7h2.5" />
                </svg>
                Storefront
              </div>
              <h2>
                Your brand.
                <br />
                Your ordering page.
              </h2>
              <p className="feat-body">
                Every restaurant gets a fully custom storefront — logo, colors, fonts, hero images,
                and menu layout. Customers see your brand, not a marketplace. Share your link on
                Instagram, Google Maps, or anywhere.
              </p>
              <div className="feat-points">
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Full brand color &amp; font control
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Category chips, featured items, promo
                  banners
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Mobile-optimized with sticky cart
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Live preview updates as you edit in admin
                </div>
              </div>
            </div>
            <div className="feat-ss">
              <div className="ss-frame r rd2">
                <div className="ss-chrome">
                  <div className="ss-dot" style={{ background: '#ff5f57' }} />
                  <div className="ss-dot" style={{ background: '#febc2e' }} />
                  <div className="ss-dot" style={{ background: '#28c840' }} />
                  <div className="ss-url">your-restaurant.easymenu.website</div>
                </div>
                <img
                  src="/landing/feat-storefront.png"
                  alt="Customer-facing storefront for Wa Jeal Sichuan Chili House"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Feature 2: AI assistant */}
      <section>
        <div className="wrap">
          <div className="feat-row flip r">
            <div>
              <div className="feat-tag">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <rect x="1" y="3" width="10" height="7" rx="1.5" />
                  <path d="M4 1h4M6 3v7" />
                </svg>
                AI Assistant
              </div>
              <h2>
                Update your menu
                <br />
                by just saying so.
              </h2>
              <p className="feat-body">
                The AI assistant lets you manage your entire menu and storefront in plain English —
                no dashboard navigation, no forms. Changes are reflected in the live storefront
                preview instantly.
              </p>
              <div className="feat-points">
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>"Mark the soup sold out"
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>"Add a lunch special at $12, featured"
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>"Update the hero headline to say Open Late"
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Multi-action commands, fuzzy name matching
                </div>
              </div>
            </div>
            <div className="feat-ss">
              <div className="ss-frame r rd2">
                <div className="ss-chrome">
                  <div className="ss-dot" style={{ background: '#ff5f57' }} />
                  <div className="ss-dot" style={{ background: '#febc2e' }} />
                  <div className="ss-dot" style={{ background: '#28c840' }} />
                  <div className="ss-url">admin.easymenu.website — Assistant</div>
                </div>
                <img
                  src="/landing/feat-ai.png"
                  alt="AI restaurant assistant with live storefront preview"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Feature 3: Payments */}
      <section>
        <div className="wrap">
          <div className="feat-row r">
            <div>
              <div className="feat-tag">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <rect x="1" y="2.5" width="10" height="7" rx="1.5" />
                  <path d="M1 5h10" />
                </svg>
                Payments
              </div>
              <h2>
                Real checkout.
                <br />
                Every payment method.
              </h2>
              <p className="feat-body">
                Built on Stripe Connect — customers pay with Apple Pay, Google Pay, Klarna, Cash
                App, bank transfer, or card. You get paid directly into your Stripe account, same
                day. Zero commission taken by EasyMenu.
              </p>
              <div className="feat-points">
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Apple Pay &amp; Google Pay one-tap checkout
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Klarna buy-now-pay-later built in
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Stripe Link for returning customers
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Direct payouts to your bank, not ours
                </div>
              </div>
            </div>
            <div className="feat-ss">
              <div className="ss-mobile r rd2">
                <img
                  src="/landing/feat-payments.png"
                  alt="Stripe checkout drawer showing Card, Bank, Cash App Pay, and Klarna"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Feature 4: Loyalty */}
      <section>
        <div className="wrap">
          <div className="feat-row flip r">
            <div>
              <div className="feat-tag">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M6 1l1.3 2.7 3 .4-2.2 2.1.5 3L6 7.8l-2.7 1.4.5-3L1.7 4.1l3-.4z" />
                </svg>
                Loyalty
              </div>
              <h2>
                Built-in rewards.
                <br />
                No third-party app.
              </h2>
              <p className="feat-body">
                Customers earn points on every order and redeem for discounts — automatically
                enrolled at checkout with their phone number. A 10% welcome discount brings them
                back. Stripe coupons handle the discount mechanics cleanly.
              </p>
              <div className="feat-points">
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Points earned on every order automatically
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>10% new-member first-order discount
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Configurable earn rate, tiers, and expiry
                </div>
                <div className="feat-point">
                  <div className="feat-point-dot">✓</div>Stripe coupon per redemption — full audit
                  trail
                </div>
              </div>
            </div>
            <div className="feat-ss">
              <div className="ss-mobile r rd2">
                <img
                  src="/landing/feat-loyalty.png"
                  alt="Customer rewards wallet showing points balance and redemption tiers"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Feature 5: Everything included grid */}
      <section id="features">
        <div className="wrap">
          <div className="sh r">
            <div className="eyebrow">Everything included</div>
            <h2>All the tools. One flat price.</h2>
            <p>
              Everything a modern restaurant needs to take orders directly — no add-ons, no surprise
              charges.
            </p>
          </div>
          <div className="feats-grid">
            {[
              {
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#1a6b38"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <rect x="2" y="3" width="12" height="10" rx="2" />
                    <path d="M2 6h12M6 9h4M6 11h2" />
                  </svg>
                ),
                title: 'Kitchen display system',
                body: 'Tablet-first kitchen dashboard with real-time order management, sound alerts, status progression, and elapsed time on every ticket.',
              },
              {
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#1a6b38"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <circle cx="8" cy="5" r="2.5" />
                    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  </svg>
                ),
                title: 'Own your customer data',
                body: 'Every customer who orders is yours — their contact info, order history, and loyalty points. No marketplace owns your relationship.',
              },
              {
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#1a6b38"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <path d="M3 8h10M3 5h10M3 11h6" />
                  </svg>
                ),
                title: 'Menu drag & drop',
                body: 'Reorder categories and items by dragging. Toggle visibility, featured status, and sold-out state with one click — no page reload.',
              },
              {
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#1a6b38"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <path d="M8 2v4l2.5 2.5" />
                    <circle cx="8" cy="8" r="6" />
                  </svg>
                ),
                title: 'SMS order notifications',
                body: 'Customers get SMS updates when orders are confirmed, ready, or cancelled — via Twilio, no app install required.',
              },
              {
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#1a6b38"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <rect x="2" y="4" width="12" height="8" rx="1.5" />
                    <path d="M2 7h12" />
                  </svg>
                ),
                title: 'Stripe direct payouts',
                body: 'Connect your Stripe account in minutes. Revenue lands directly in your bank — not held by a platform. Apple Pay domain registration included.',
              },
              {
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#1a6b38"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <path d="M2 12V5l4-3 4 3v7" />
                    <path d="M6 12V8h4v4" />
                  </svg>
                ),
                title: 'Insights dashboard',
                body: 'Track revenue, top items, peak hours, repeat customers, and loyalty redemption rates from one screen — no spreadsheets required.',
              },
            ].map((card, i) => (
              <div className={`feat-card r${i % 3 !== 0 ? ` rd${i % 3}` : ''}`} key={card.title}>
                <div className="feat-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="pricing-section">
        <div className="wrap-narrow">
          <div className="sh r">
            <div className="eyebrow">Pricing</div>
            <h2>Guided launch, then one flat monthly price.</h2>
            <p>
              We help you get set up properly the first time, then you stay on a simple flat
              subscription with no commission.
            </p>
          </div>
          <div className="pricing-card r">
            <div className="pricing-top">
              <div className="pricing-badge">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="#22c55e">
                  <circle cx="4" cy="4" r="4" />
                </svg>
                Launch support included
              </div>
              <div className="pricing-label">Initial setup</div>
              <div className="pricing-price">
                <div className="pricing-dollar">$279</div>
                <div className="pricing-period">&thinsp;one time</div>
              </div>
              <div className="pricing-subprice">$79/month after launch</div>
              <div className="pricing-desc">
                We help connect your Stripe account, link your ordering page from your website, and
                set up your initial menu.
              </div>
            </div>
            <div className="pricing-feats">
              {[
                'Initial menu setup included',
                'Website linking support',
                '0% commission, unlimited orders',
                'Full branded storefront',
                'AI menu assistant',
                'Kitchen display system',
                'Apple Pay & Google Pay',
                'Klarna & Cash App Pay',
                'Loyalty & rewards program',
                'SMS notifications via Twilio',
                'Stripe direct payouts',
                'Insights dashboard',
                'Customer data ownership',
              ].map((feat) => (
                <div className="pricing-feat" key={feat}>
                  <div className="p-check">{CHECK}</div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
            <div className="pricing-cta">
              <a href="https://admin.easymenu.website/signup" className="btn-full">
                Let&apos;s get started for $279
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M2.5 6.5h8M6.5 2.5l4 4-4 4" />
                </svg>
              </a>
              <div className="pricing-note">
                Guided launch support included. Stripe processing fees apply separately (2.9% +
                30¢).
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section id="comparison">
        <div className="wrap">
          <div className="sh r">
            <div className="eyebrow">Compare</div>
            <h2>Flat direct ordering beats percentage fees.</h2>
            <p>
              On $8,000/month in repeat orders, a 20% marketplace fee is $1,600 before delivery
              add-ons, promos, or processing. EasyMenu is $279 to launch, then $79/month.
            </p>
          </div>
          <div className="comp-table r">
            <div className="comp-head">
              <div className="ch" />
              <div className="ch ours">EasyMenu</div>
              <div className="ch">DoorDash</div>
              <div className="ch">Grubhub</div>
              <div className="ch">Toast</div>
              <div className="ch">Square</div>
            </div>
            {[
              {
                label: 'Direct-order software cost',
                us: <span className="hl">$279 setup, then $79/mo</span>,
                a: <span className="sm">Commission-free Online Ordering available</span>,
                b: <span className="sm">Grubhub Direct says $0 setup / hosting</span>,
                d: <span className="sm">Hardware and implementation vary</span>,
                c: <span className="sm">$0 / $49 / $149 per location</span>,
              },
              {
                label: 'Marketplace delivery commission',
                us: <span className="yes">0%</span>,
                a: <span className="bad">15% / 25% / 30%</span>,
                b: <span className="bad">5% / 15% / 20% marketing + delivery from 10%</span>,
                d: <span className="sm">Not a marketplace fee model</span>,
                c: <span className="sm">Not a marketplace fee model</span>,
              },
              {
                label: 'Pickup marketplace commission',
                us: <span className="yes">0%</span>,
                a: <span className="bad">6%</span>,
                b: <span className="sm">Marketing commission applies on app orders</span>,
                d: <span className="sm">N/A</span>,
                c: <span className="sm">N/A</span>,
              },
              {
                label: 'Card processing on direct online orders',
                us: <span className="sm">Stripe processing, typically 2.9% + 30¢</span>,
                a: <span className="sm">Processing fees for Online Ordering orders</span>,
                b: <span className="sm">Order processing fees apply</span>,
                d: <span className="sm">Toast payment facilitator; rates vary</span>,
                c: <span className="sm">2.9% + 30¢ API, online 2.9%-3.3% + 30¢</span>,
              },
              {
                label: 'Kitchen display cost',
                us: <span className="yes">Included</span>,
                a: (
                  <span className="sm">
                    DoorDash tablet may carry weekly fee after intro period
                  </span>
                ),
                b: <span className="sm">Marketplace tablet / workflow</span>,
                d: <span className="sm">Quote / hardware dependent</span>,
                c: <span className="sm">$20-$30/mo per KDS device</span>,
              },
              {
                label: 'Hardware lock-in',
                us: <span className="yes">Use browser/tablet</span>,
                a: <span className="sm">Tablet, POS integration, email, or fax</span>,
                b: <span className="sm">Marketplace workflow</span>,
                d: <span className="bad">Toast-approved hardware only</span>,
                c: <span className="yes">Hardware optional for payments</span>,
              },
              {
                label: 'Initial menu and website setup',
                us: <span className="yes">Included in launch</span>,
                a: <span className="sm">Merchant signup flow</span>,
                b: <span className="sm">Free photoshoot on marketplace plans</span>,
                d: <span className="sm">Implementation varies</span>,
                c: <span className="sm">Self-serve or paid ecosystem support</span>,
              },
              {
                label: 'Customer relationship',
                us: <span className="yes">Direct ordering and loyalty</span>,
                a: <span className="sm">Marketplace plus direct tools</span>,
                b: <span className="sm">Marketplace plus Grubhub Direct</span>,
                d: <span className="sm">POS customer tools</span>,
                c: <span className="sm">POS customer tools</span>,
              },
            ].map((row) => (
              <div className="comp-row" key={row.label}>
                <div className="cc">{row.label}</div>
                <div className="cc ours">{row.us}</div>
                <div className="cc">{row.a}</div>
                <div className="cc">{row.b}</div>
                <div className="cc">{row.d}</div>
                <div className="cc">{row.c}</div>
              </div>
            ))}
          </div>
          <p className="comp-source r">
            Competitor figures are based on public pricing pages checked May 2026. DoorDash and
            Grubhub rates vary by plan, market, introductory offer, and selected services; Toast
            pricing varies by hardware and implementation; Square varies by plan and device count.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="cta-section">
        <div className="wrap">
          <div className="cta-inner r">
            <h2 className="cta-h">
              Stop sharing your margin.
              <br />
              Launch direct ordering the right way.
            </h2>
            <p className="cta-sub">
              We&apos;ll help you connect your site, set up your menu, and get your direct ordering
              flow live for $279 upfront, then $79/month.
            </p>
            <div className="cta-actions">
              <a
                href="https://admin.easymenu.website/signup"
                className="btn-primary"
                style={{ fontSize: 15, padding: '14px 24px' }}
              >
                Let&apos;s get started for $279
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 7h8M7 3l4 4-4 4" />
                </svg>
              </a>
              <a
                href="mailto:hello@easymenu.website"
                className="btn-outline"
                style={{ fontSize: 15 }}
              >
                Talk to us
              </a>
            </div>
            <div className="cta-note">
              Setup help included from day one. No commission. Stripe fees separate.
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-wrap">
          <div className="footer-top">
            <div>
              <div className="footer-logo-row">
                <div className="footer-logo-mark">
                  <img
                    src="/landing/logo.png"
                    alt="EasyMenu"
                    style={{ width: 26, height: 26, objectFit: 'contain' }}
                  />
                </div>
                <span>EasyMenu</span>
              </div>
              <div className="footer-tagline">
                Direct ordering for independent restaurants. No commission, no middlemen.
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h4>Product</h4>
                <a href="#product">Storefront</a>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#comparison">Compare</a>
              </div>
              <div className="footer-col">
                <h4>Restaurant</h4>
                <a href="https://admin.easymenu.website/signup">Get started for $279</a>
                <a href="https://admin.easymenu.website">Admin login</a>
                <a href="mailto:hello@easymenu.website">Contact us</a>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <a href="/privacy">Privacy Policy</a>
                <a href="/sms-policy/">SMS Policy</a>
                <a href="/terms">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 EasyMenu. All rights reserved.</div>
            <div className="footer-legal">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="mailto:hello@easymenu.website">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
