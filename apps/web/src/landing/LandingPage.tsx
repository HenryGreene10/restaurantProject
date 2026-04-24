import { useEffect } from 'react'
import './landing.css'

export function LandingPage() {
  useEffect(() => {
    // Scroll reveal
    const revealEls = document.querySelectorAll('.lp-root .reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    revealEls.forEach((el) => observer.observe(el))

    // Active nav link on scroll
    const sections = document.querySelectorAll<HTMLElement>('.lp-root section[id]')
    const navLinks = document.querySelectorAll<HTMLAnchorElement>('.lp-nav-links a[href^="#"]')
    const onScroll = () => {
      let current = ''
      sections.forEach((sec) => {
        if (window.scrollY >= sec.offsetTop - 100) current = sec.id
      })
      navLinks.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === `#${current}`)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="lp-root">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <a href="#" className="lp-nav-logo">
            <div className="lp-nav-logo-mark">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
                <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="9" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            EasyMenu
          </a>
          <div className="lp-nav-links">
            <a href="#how" className="hide-mobile">How it works</a>
            <a href="#features" className="hide-mobile">Features</a>
            <a href="#pricing" className="hide-mobile">Pricing</a>
            <a href="#compare" className="hide-mobile">Compare</a>
            <a href="https://admin.easymenu.website" className="lp-nav-cta">Get started</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero" id="hero">
        <div className="lp-hero-noise" />
        <div className="lp-hero-glow" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              Now with Loyalty &amp; Rewards
            </div>
            <h1 className="lp-hero-headline">
              Your menu.<br /><em>Your margins.</em><br />Zero commissions.
            </h1>
            <p className="lp-hero-sub">
              Launch a branded online ordering experience in minutes. Keep 100% of every order —
              no marketplace fees, no middlemen, no surprises.
            </p>
            <div className="lp-hero-actions">
              <a href="https://admin.easymenu.website/signup" className="lp-btn-primary">
                Start free
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <a href="#how" className="lp-btn-outline-light">See how it works</a>
            </div>
            <div className="lp-hero-stat-row">
              <div>
                <div className="lp-hero-stat-num">0%</div>
                <div className="lp-hero-stat-label">Commission taken</div>
              </div>
              <div>
                <div className="lp-hero-stat-num">5 min</div>
                <div className="lp-hero-stat-label">To go live</div>
              </div>
              <div>
                <div className="lp-hero-stat-num">$49</div>
                <div className="lp-hero-stat-label">Flat monthly fee</div>
              </div>
            </div>
          </div>

          <div className="lp-hero-visual">
            <div className="lp-hero-mockup">
              <div className="lp-mockup-bar">
                <div className="lp-mockup-dot" style={{background:'#ff5f57'}} />
                <div className="lp-mockup-dot" style={{background:'#ffbd2e'}} />
                <div className="lp-mockup-dot" style={{background:'#28c840'}} />
                <div className="lp-mockup-url">order.yourbistro.com</div>
              </div>
              <div className="lp-mockup-hero-card">
                <div className="lp-mockup-h">Bella Cucina</div>
                <div className="lp-mockup-sub">Italian · Open now · Pickup &amp; Delivery</div>
              </div>
              <div className="lp-mockup-items">
                {[
                  { name: 'Margherita Pizza', price: '$14.00' },
                  { name: 'Penne Arrabbiata', price: '$12.50' },
                  { name: 'Tiramisu', price: '$7.00' },
                ].map((item) => (
                  <div className="lp-mockup-item" key={item.name}>
                    <div className="lp-mockup-item-left">
                      <span className="lp-mockup-item-name">{item.name}</span>
                      <span className="lp-mockup-item-price">{item.price}</span>
                    </div>
                    <div className="lp-mockup-add">+</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="lp-trust">
        <div className="lp-trust-inner">
          <span className="lp-trust-label">Trusted by restaurants using</span>
          <div className="lp-trust-divider" />
          <div className="lp-trust-logos">
            {['Stripe', 'Twilio', 'SendGrid', 'Vercel', 'PostgreSQL'].map((logo) => (
              <span className="lp-trust-logo" key={logo}>{logo}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="lp-section lp-how" id="how">
        <div className="lp-container-narrow">
          <div className="reveal">
            <div className="lp-section-tag">How it works</div>
            <h2 className="lp-section-headline">Live in three steps</h2>
            <p className="lp-section-sub">
              No developers needed. Set up your menu, connect payments, and share your link —
              orders start flowing straight to your kitchen.
            </p>
          </div>
        </div>
        <div className="lp-container">
          <div className="lp-steps-grid">
            {[
              {
                num: '01',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="3" y="5" width="16" height="12" rx="2" stroke="var(--lp-primary)" strokeWidth="1.5"/>
                    <path d="M7 9h8M7 13h5" stroke="var(--lp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Build your menu',
                body: 'Add items, categories, modifiers, and photos from the admin dashboard. Set prices, descriptions, and availability in seconds.',
                delay: 'reveal-delay-1',
              },
              {
                num: '02',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="4" y="3" width="14" height="10" rx="2" stroke="var(--lp-primary)" strokeWidth="1.5"/>
                    <path d="M8 17h6M11 13v4" stroke="var(--lp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Connect Stripe',
                body: 'Link your Stripe account in one click. Payments land directly in your bank — we never touch your money.',
                delay: 'reveal-delay-2',
              },
              {
                num: '03',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="var(--lp-primary)" strokeWidth="1.5"/>
                    <path d="M11 7v4l3 2" stroke="var(--lp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Share &amp; earn',
                body: 'Drop your ordering link in your bio, Google listing, or table cards. Watch orders come in — commission-free.',
                delay: 'reveal-delay-3',
              },
            ].map((step) => (
              <div className={`lp-step reveal ${step.delay}`} key={step.num}>
                <div className="lp-step-num">{step.num}</div>
                <div className="lp-step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p dangerouslySetInnerHTML={{ __html: step.body }} />
                <div className="lp-step-connector" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section lp-features" id="features">
        <div className="lp-container">
          <div className="reveal">
            <div className="lp-section-tag">Features</div>
            <h2 className="lp-section-headline">Everything you need, nothing you don't</h2>
            <p className="lp-section-sub">
              Built for independent restaurants that want a professional online presence without the
              enterprise price tag.
            </p>
          </div>
          <div className="lp-features-grid">
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 10h14M10 3v14" stroke="var(--lp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Menu management',
                body: 'Drag-and-drop categories, bulk edits, modifier groups, item photos, and instant publish.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="5" width="14" height="10" rx="2" stroke="var(--lp-primary)" strokeWidth="1.5"/>
                    <path d="M7 10h6" stroke="var(--lp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Stripe payments',
                body: 'Accept cards, Apple Pay, and Google Pay. Stripe handles PCI compliance — payouts go straight to you.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7" stroke="var(--lp-primary)" strokeWidth="1.5"/>
                    <path d="M10 7v3l2.5 1.5" stroke="var(--lp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Real-time orders',
                body: 'Orders appear instantly in your admin. Print to kitchen via Star CloudPRNT or use the browser dashboard.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2l2.4 4.8 5.3.8-3.85 3.75.9 5.3L10 14.1l-4.75 2.55.9-5.3L2.3 7.6l5.3-.8z" stroke="var(--lp-primary)" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                ),
                title: 'Loyalty & rewards',
                body: 'Auto-enroll customers, award points on every order, and let them redeem for discounts — all configurable.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="var(--lp-primary)" strokeWidth="1.5"/>
                    <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="var(--lp-primary)" strokeWidth="1.5"/>
                    <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="var(--lp-primary)" strokeWidth="1.5"/>
                    <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="var(--lp-primary)" strokeWidth="1.5"/>
                  </svg>
                ),
                title: 'Custom branding',
                body: 'Upload your logo, pick your colors, and set your accent theme. Your brand, not ours.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10a6 6 0 1 1 12 0" stroke="var(--lp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 16v-6" stroke="var(--lp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Analytics',
                body: 'Revenue, top items, order volume, and loyalty KPIs — all in one clean dashboard.',
              },
            ].map((f, i) => (
              <div className={`lp-feature reveal reveal-delay-${(i % 3) + 1}`} key={f.title}>
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="lp-section lp-pricing" id="pricing">
        <div className="lp-container-narrow" style={{textAlign:'center'}}>
          <div className="reveal">
            <div className="lp-section-tag">Pricing</div>
            <h2 className="lp-section-headline">Simple, honest pricing</h2>
            <p className="lp-section-sub" style={{margin:'0 auto'}}>
              One plan, everything included. No per-order fees. No upsells.
            </p>
          </div>
          <div className="lp-pricing-card reveal reveal-delay-1">
            <div className="lp-pricing-header">
              <div className="lp-pricing-badge">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="#4ade80">
                  <circle cx="5" cy="5" r="5"/>
                </svg>
                No commission on orders
              </div>
              <div className="lp-pricing-price">
                <span className="lp-pricing-dollar">$49</span>
                <span className="lp-pricing-period">/ month</span>
              </div>
              <p className="lp-pricing-desc">
                Everything you need to run commission-free online ordering for your restaurant.
                Cancel any time.
              </p>
            </div>
            <div className="lp-pricing-features">
              {[
                'Unlimited menu items',
                'Unlimited orders',
                'Custom domain support',
                'Stripe payments (0% fee)',
                'Kitchen printer support',
                'Loyalty & rewards',
                'Custom branding',
                'Analytics dashboard',
                'SMS OTP customer auth',
                'Priority support',
              ].map((feat) => (
                <div className="lp-pricing-feature" key={feat}>
                  <div className="lp-pricing-check">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="lp-pricing-feature-text">{feat}</span>
                </div>
              ))}
            </div>
            <div className="lp-pricing-footer">
              <a href="https://admin.easymenu.website/signup" className="lp-btn-primary-lg">
                Start your free trial
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <p className="lp-pricing-note">14-day free trial · No credit card required · Cancel any time</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="lp-section lp-comparison" id="compare">
        <div className="lp-container">
          <div className="reveal">
            <div className="lp-section-tag">Comparison</div>
            <h2 className="lp-section-headline">How we stack up</h2>
            <p className="lp-section-sub">
              Stop paying 15–30% to marketplaces. Keep your customers, your data, and your margin.
            </p>
          </div>
          <div className="lp-comparison-table reveal reveal-delay-1">
            <div className="lp-comp-head">
              <div className="lp-comp-head-cell">Feature</div>
              <div className="lp-comp-head-cell ours">EasyMenu</div>
              <div className="lp-comp-head-cell">DoorDash</div>
              <div className="lp-comp-head-cell">Uber Eats</div>
              <div className="lp-comp-head-cell">Square</div>
            </div>
            {[
              { feature: 'Commission on orders', us: <span className="lp-comp-highlight">0%</span>, dd: <span className="lp-comp-note">15–30%</span>, ub: <span className="lp-comp-note">15–30%</span>, sq: <span className="lp-comp-note">2.6% + 10¢</span> },
              { feature: 'Custom branded storefront', us: <span className="lp-comp-yes">✓</span>, dd: <span className="lp-comp-no">✗</span>, ub: <span className="lp-comp-no">✗</span>, sq: <span className="lp-comp-yes">✓</span> },
              { feature: 'Loyalty & rewards built-in', us: <span className="lp-comp-yes">✓</span>, dd: <span className="lp-comp-no">✗</span>, ub: <span className="lp-comp-no">✗</span>, sq: <span className="lp-comp-note">Add-on</span> },
              { feature: 'You own the customer data', us: <span className="lp-comp-yes">✓</span>, dd: <span className="lp-comp-no">✗</span>, ub: <span className="lp-comp-no">✗</span>, sq: <span className="lp-comp-yes">✓</span> },
              { feature: 'Kitchen printer (CloudPRNT)', us: <span className="lp-comp-yes">✓</span>, dd: <span className="lp-comp-no">✗</span>, ub: <span className="lp-comp-no">✗</span>, sq: <span className="lp-comp-yes">✓</span> },
              { feature: 'Flat monthly pricing', us: <span className="lp-comp-yes">✓</span>, dd: <span className="lp-comp-no">✗</span>, ub: <span className="lp-comp-no">✗</span>, sq: <span className="lp-comp-no">✗</span> },
            ].map((row) => (
              <div className="lp-comp-row" key={row.feature}>
                <div className="lp-comp-cell">{row.feature}</div>
                <div className="lp-comp-cell ours">{row.us}</div>
                <div className="lp-comp-cell">{row.dd}</div>
                <div className="lp-comp-cell">{row.ub}</div>
                <div className="lp-comp-cell">{row.sq}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="lp-section lp-testimonials" id="testimonials">
        <div className="lp-container">
          <div className="reveal">
            <div className="lp-section-tag">Testimonials</div>
            <h2 className="lp-section-headline">Restaurants love it</h2>
          </div>
          <div className="lp-testimonials-grid">
            {[
              {
                quote: 'We switched from DoorDash and instantly saved $800/month in fees. Setup took under an hour.',
                name: 'Maria G.',
                role: 'Owner, Bella Cucina',
                initial: 'M',
                delay: 'reveal-delay-1',
              },
              {
                quote: 'The loyalty program is a game-changer. Repeat orders are up 40% since we turned it on.',
                name: 'James K.',
                role: 'Manager, Harbor Grill',
                initial: 'J',
                delay: 'reveal-delay-2',
              },
              {
                quote: 'Finally, a system built for small restaurants. Printing to our Star printer just works.',
                name: 'Priya S.',
                role: 'Owner, Spice Route',
                initial: 'P',
                delay: 'reveal-delay-3',
              },
            ].map((t) => (
              <div className={`lp-testimonial reveal ${t.delay}`} key={t.name}>
                <div className="lp-testimonial-stars">★★★★★</div>
                <p className="lp-testimonial-quote">"{t.quote}"</p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar">{t.initial}</div>
                  <div>
                    <div className="lp-testimonial-name">{t.name}</div>
                    <div className="lp-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-cta">
        <div className="lp-container-narrow lp-cta-inner">
          <h2 className="lp-cta-headline reveal">
            Ready to keep <em>every dollar</em><br />you earn?
          </h2>
          <p className="lp-cta-sub reveal reveal-delay-1">
            Join hundreds of restaurants running commission-free ordering with EasyMenu.
            Set up in minutes, cancel any time.
          </p>
          <div className="lp-cta-actions reveal reveal-delay-2">
            <a href="https://admin.easymenu.website/signup" className="lp-btn-primary">
              Start free trial
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="https://admin.easymenu.website" className="lp-btn-outline-light">Open admin</a>
          </div>
          <p className="lp-cta-note reveal reveal-delay-3">14-day free trial · No credit card required</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <a href="#" className="lp-footer-logo">
                <div className="lp-footer-logo-mark">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="white" fillOpacity="0.9"/>
                    <rect x="8.5" y="1" width="4.5" height="4.5" rx="1" fill="white" fillOpacity="0.5"/>
                    <rect x="1" y="8.5" width="4.5" height="4.5" rx="1" fill="white" fillOpacity="0.5"/>
                    <rect x="8.5" y="8.5" width="4.5" height="4.5" rx="1" fill="white" fillOpacity="0.9"/>
                  </svg>
                </div>
                EasyMenu
              </a>
              <p className="lp-footer-tagline">
                Commission-free online ordering for independent restaurants.
              </p>
            </div>
            <div className="lp-footer-links">
              <div className="lp-footer-col">
                <h4>Product</h4>
                <a href="#how">How it works</a>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#compare">Compare</a>
              </div>
              <div className="lp-footer-col">
                <h4>Company</h4>
                <a href="#">About</a>
                <a href="#">Blog</a>
                <a href="#">Contact</a>
              </div>
              <div className="lp-footer-col">
                <h4>Get started</h4>
                <a href="https://admin.easymenu.website/signup">Sign up</a>
                <a href="https://admin.easymenu.website">Admin login</a>
              </div>
              <div className="lp-footer-col">
                <h4>Legal</h4>
                <a href="/sms-policy">SMS Policy</a>
              </div>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span className="lp-footer-copy">© 2026 EasyMenu. All rights reserved.</span>
            <div className="lp-footer-legal">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
