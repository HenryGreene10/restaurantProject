import { useEffect } from 'react'
import './landing.css'

const CHECK = (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round">
    <path d="M1.5 4.5l2 2 4-4"/>
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
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' },
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
              <img src="/landing/logo.png" alt="EasyMenu" style={{width:28,height:28,objectFit:'contain'}} />
            </div>
            <span>EasyMenu</span>
          </a>
          <div className="nav-center">
            <a href="#product">Product</a>
            <a href="#pricing">Pricing</a>
            <a href="#comparison">Compare</a>
          </div>
          <div className="nav-right">
            <a href="https://admin.easymenu.website" className="btn-ghost">Sign in</a>
            <a href="https://admin.easymenu.website/signup" className="btn-sm">
              Get started
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 6h8M6 2l4 4-4 4"/>
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero-wrap">
        <div className="hero-text">
          <div className="eyebrow r"><div className="eyebrow-dot" /> No commission. Ever.</div>
          <h1 className="r rd1">
            Online ordering<br /><span className="dim">built for restaurants,</span><br />not platforms.
          </h1>
          <p className="hero-sub r rd2">
            EasyMenu gives independent restaurants a fully branded direct-ordering system.
            Keep every dollar. Own your customers. $79/month flat.
          </p>
          <div className="hero-actions r rd3">
            <a href="https://admin.easymenu.website/signup" className="btn-primary">
              Start free trial
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 7h8M7 3l4 4-4 4"/>
              </svg>
            </a>
            <a href="#product" className="btn-outline">See how it works</a>
          </div>
          <div className="hero-note r rd4">14-day free trial · No credit card required</div>
        </div>

        <div className="hero-ss-wrap r rd2">
          <div className="ss-frame">
            <div className="ss-chrome">
              <div className="ss-dot" style={{background:'#ff5f57'}} />
              <div className="ss-dot" style={{background:'#febc2e'}} />
              <div className="ss-dot" style={{background:'#28c840'}} />
              <div className="ss-url">admin.easymenu.website — Loyalty Program</div>
            </div>
            <img src="/landing/hero-admin.png" alt="EasyMenu admin dashboard showing loyalty analytics and live storefront preview" />
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
            {['Stripe Connect','Apple Pay','Google Pay','Klarna','Cash App Pay','Twilio SMS','Cloudflare R2'].map((t) => (
              <div className="trust-item" key={t}>{t}</div>
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
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="1" y="2" width="10" height="8" rx="1.5"/><path d="M4 5h4M4 7h2.5"/>
                </svg>
                Storefront
              </div>
              <h2>Your brand.<br />Your ordering page.</h2>
              <p className="feat-body">
                Every restaurant gets a fully custom storefront — logo, colors, fonts, hero images, and menu layout.
                Customers see your brand, not a marketplace. Share your link on Instagram, Google Maps, or anywhere.
              </p>
              <div className="feat-points">
                <div className="feat-point"><div className="feat-point-dot">✓</div>Full brand color &amp; font control</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>Category chips, featured items, promo banners</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>Mobile-optimized with sticky cart</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>Live preview updates as you edit in admin</div>
              </div>
            </div>
            <div className="feat-ss">
              <div className="ss-frame r rd2">
                <div className="ss-chrome">
                  <div className="ss-dot" style={{background:'#ff5f57'}} />
                  <div className="ss-dot" style={{background:'#febc2e'}} />
                  <div className="ss-dot" style={{background:'#28c840'}} />
                  <div className="ss-url">your-restaurant.easymenu.website</div>
                </div>
                <img src="/landing/feat-storefront.png" alt="Customer-facing storefront for Wa Jeal Sichuan Chili House" />
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
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="1" y="3" width="10" height="7" rx="1.5"/><path d="M4 1h4M6 3v7"/>
                </svg>
                AI Assistant
              </div>
              <h2>Update your menu<br />by just saying so.</h2>
              <p className="feat-body">
                The AI assistant lets you manage your entire menu and storefront in plain English — no dashboard
                navigation, no forms. Changes are reflected in the live storefront preview instantly.
              </p>
              <div className="feat-points">
                <div className="feat-point"><div className="feat-point-dot">✓</div>"Mark the soup sold out"</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>"Add a lunch special at $12, featured"</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>"Update the hero headline to say Open Late"</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>Multi-action commands, fuzzy name matching</div>
              </div>
            </div>
            <div className="feat-ss">
              <div className="ss-frame r rd2">
                <div className="ss-chrome">
                  <div className="ss-dot" style={{background:'#ff5f57'}} />
                  <div className="ss-dot" style={{background:'#febc2e'}} />
                  <div className="ss-dot" style={{background:'#28c840'}} />
                  <div className="ss-url">admin.easymenu.website — Assistant</div>
                </div>
                <img src="/landing/feat-ai.png" alt="AI restaurant assistant with live storefront preview" />
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
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="1" y="2.5" width="10" height="7" rx="1.5"/><path d="M1 5h10"/>
                </svg>
                Payments
              </div>
              <h2>Real checkout.<br />Every payment method.</h2>
              <p className="feat-body">
                Built on Stripe Connect — customers pay with Apple Pay, Google Pay, Klarna, Cash App, bank transfer,
                or card. You get paid directly into your Stripe account, same day. Zero commission taken by EasyMenu.
              </p>
              <div className="feat-points">
                <div className="feat-point"><div className="feat-point-dot">✓</div>Apple Pay &amp; Google Pay one-tap checkout</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>Klarna buy-now-pay-later built in</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>Stripe Link for returning customers</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>Direct payouts to your bank, not ours</div>
              </div>
            </div>
            <div className="feat-ss">
              <div className="ss-mobile r rd2">
                <img src="/landing/feat-payments.png" alt="Stripe checkout drawer showing Card, Bank, Cash App Pay, and Klarna" />
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
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 1l1.3 2.7 3 .4-2.2 2.1.5 3L6 7.8l-2.7 1.4.5-3L1.7 4.1l3-.4z"/>
                </svg>
                Loyalty
              </div>
              <h2>Built-in rewards.<br />No third-party app.</h2>
              <p className="feat-body">
                Customers earn points on every order and redeem for discounts — automatically enrolled at checkout
                with their phone number. A 10% welcome discount brings them back. Stripe coupons handle the
                discount mechanics cleanly.
              </p>
              <div className="feat-points">
                <div className="feat-point"><div className="feat-point-dot">✓</div>Points earned on every order automatically</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>10% new-member first-order discount</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>Configurable earn rate, tiers, and expiry</div>
                <div className="feat-point"><div className="feat-point-dot">✓</div>Stripe coupon per redemption — full audit trail</div>
              </div>
            </div>
            <div className="feat-ss">
              <div className="ss-mobile r rd2">
                <img src="/landing/feat-loyalty.png" alt="Customer rewards wallet showing points balance and redemption tiers" />
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
            <p>Everything a modern restaurant needs to take orders directly — no add-ons, no surprise charges.</p>
          </div>
          <div className="feats-grid">
            {[
              {
                icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1a6b38" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="3" width="12" height="10" rx="2"/><path d="M2 6h12M6 9h4M6 11h2"/></svg>,
                title: 'Kitchen display system',
                body: 'Tablet-first kitchen dashboard with real-time order management, sound alerts, status progression, and elapsed time on every ticket.',
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1a6b38" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="5" r="2.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>,
                title: 'Own your customer data',
                body: "Every customer who orders is yours — their contact info, order history, and loyalty points. No marketplace owns your relationship.",
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1a6b38" strokeWidth="1.6" strokeLinecap="round"><path d="M3 8h10M3 5h10M3 11h6"/></svg>,
                title: 'Menu drag & drop',
                body: 'Reorder categories and items by dragging. Toggle visibility, featured status, and sold-out state with one click — no page reload.',
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1a6b38" strokeWidth="1.6" strokeLinecap="round"><path d="M8 2v4l2.5 2.5"/><circle cx="8" cy="8" r="6"/></svg>,
                title: 'SMS order notifications',
                body: 'Customers get SMS updates when orders are confirmed, ready, or cancelled — via Twilio, no app install required.',
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1a6b38" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="4" width="12" height="8" rx="1.5"/><path d="M2 7h12"/></svg>,
                title: 'Stripe direct payouts',
                body: 'Connect your Stripe account in minutes. Revenue lands directly in your bank — not held by a platform. Apple Pay domain registration included.',
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1a6b38" strokeWidth="1.6" strokeLinecap="round"><path d="M2 12V5l4-3 4 3v7"/><path d="M6 12V8h4v4"/></svg>,
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
            <h2>One price. No fine print.</h2>
            <p>No commission tiers, no usage limits, no per-location fees. One flat subscription — everything included.</p>
          </div>
          <div className="pricing-card r">
            <div className="pricing-top">
              <div className="pricing-badge">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="#22c55e"><circle cx="4" cy="4" r="4"/></svg>
                14-day free trial
              </div>
              <div className="pricing-price">
                <div className="pricing-dollar">$79</div>
                <div className="pricing-period">&thinsp;/ month</div>
              </div>
              <div className="pricing-desc">Everything included. No setup fee. Cancel anytime.</div>
            </div>
            <div className="pricing-feats">
              {[
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
                Start free trial — $79/mo after
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2.5 6.5h8M6.5 2.5l4 4-4 4"/>
                </svg>
              </a>
              <div className="pricing-note">
                No credit card for trial · Cancel anytime · Stripe processing fees apply separately (2.9% + 30¢)
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
            <h2>What commission costs you.</h2>
            <p>On a restaurant doing $8,000/month in delivery, Grubhub takes $2,400. EasyMenu costs $79.</p>
          </div>
          <div className="comp-table r">
            <div className="comp-head">
              <div className="ch" />
              <div className="ch ours">EasyMenu</div>
              <div className="ch">Grubhub</div>
              <div className="ch">Toast</div>
              <div className="ch">Square</div>
            </div>
            {[
              { label: 'Monthly cost',              us: <span className="hl">$79 flat</span>,          a: <span className="sm">$0 + 15–30% commission</span>, b: <span className="sm">$110–$165+/mo</span>, c: <span className="sm">$60–$155+/mo</span> },
              { label: 'Order commission',           us: <span className="yes">✓ 0%</span>,             a: <span style={{color:'#e4402f',fontWeight:600}}>15–30% per order</span>,   b: <span className="sm">2.49–3.5%</span>,      c: <span className="sm">2.5–2.6%</span> },
              { label: 'You own customer data',      us: <span className="yes">✓ Always</span>,         a: <span className="no">✗ They do</span>,              b: <span className="yes">✓</span>,             c: <span className="yes">✓</span> },
              { label: 'Custom branded storefront',  us: <span className="yes">✓ Full control</span>,   a: <span className="no">✗ Grubhub brand</span>,        b: <span className="yes">✓</span>,             c: <span className="yes">✓</span> },
              { label: 'AI menu management',         us: <span className="yes">✓ Included</span>,       a: <span className="no">✗</span>,                      b: <span className="no">✗</span>,              c: <span className="no">✗</span> },
              { label: 'Built-in loyalty program',   us: <span className="yes">✓ Included</span>,       a: <span className="sm">Limited</span>,                 b: <span className="sm">Add-on cost</span>,    c: <span className="sm">Add-on cost</span> },
              { label: 'Kitchen display included',   us: <span className="yes">✓ Included</span>,       a: <span className="no">✗</span>,                      b: <span className="sm">Add-on cost</span>,    c: <span className="sm">Add-on cost</span> },
              { label: 'Setup to live',              us: <span className="hl">Under 1 hour</span>,      a: <span className="sm">Days–weeks</span>,              b: <span className="sm">Days–weeks</span>,     c: <span className="sm">1–2 days</span> },
            ].map((row) => (
              <div className="comp-row" key={row.label}>
                <div className="cc">{row.label}</div>
                <div className="cc ours">{row.us}</div>
                <div className="cc">{row.a}</div>
                <div className="cc">{row.b}</div>
                <div className="cc">{row.c}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="testimonials-section">
        <div className="wrap">
          <div className="sh r">
            <div className="eyebrow">Testimonials</div>
            <h2>Restaurants love it.</h2>
          </div>
          <div className="test-grid">
            {[
              { stars: '★★★★★', quote: 'We were paying Grubhub almost $2,000 a month in commissions. EasyMenu cut that to $79. The margin difference is night and day.', name: 'Joe Martinez', role: "Owner, Joe's Pizza · Chicago, IL", av: 'J', delay: '' },
              { stars: '★★★★★', quote: 'The AI assistant is genuinely useful — I just type what I want and it updates the menu immediately. The live preview makes it foolproof.', name: 'Sunita Patel', role: 'Owner, Sunrise Café · Austin, TX', av: 'S', delay: 'rd1' },
              { stars: '★★★★★', quote: 'Setup took 45 minutes. The loyalty program got customers coming back weekly. Apple Pay checkout just works — customers love it.', name: 'Marcus Chen', role: 'Owner, Dragon Palace · Seattle, WA', av: 'M', delay: 'rd2' },
            ].map((t) => (
              <div className={`test-card r ${t.delay}`} key={t.name}>
                <div className="test-stars">{t.stars}</div>
                <div className="test-q">"{t.quote}"</div>
                <div className="test-author">
                  <div className="test-av">{t.av}</div>
                  <div>
                    <div className="test-name">{t.name}</div>
                    <div className="test-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="cta-section">
        <div className="wrap">
          <div className="cta-inner r">
            <h2 className="cta-h">Stop sharing your margin.<br />Start ordering direct.</h2>
            <p className="cta-sub">
              Join independent restaurants taking back their orders, their customers, and their revenue — for $79/month flat.
            </p>
            <div className="cta-actions">
              <a href="https://admin.easymenu.website/signup" className="btn-primary" style={{fontSize:15,padding:'14px 24px'}}>
                Start your free trial
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 7h8M7 3l4 4-4 4"/>
                </svg>
              </a>
              <a href="mailto:hello@easymenu.website" className="btn-outline" style={{fontSize:15}}>Talk to us</a>
            </div>
            <div className="cta-note">14-day free trial · No credit card required · Cancel anytime</div>
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
                  <img src="/landing/logo.png" alt="EasyMenu" style={{width:26,height:26,objectFit:'contain'}} />
                </div>
                <span>EasyMenu</span>
              </div>
              <div className="footer-tagline">Direct ordering for independent restaurants. No commission, no middlemen.</div>
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
                <a href="https://admin.easymenu.website/signup">Get started</a>
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
