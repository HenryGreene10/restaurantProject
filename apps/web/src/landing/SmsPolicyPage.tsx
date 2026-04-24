import './landing.css'

export function SmsPolicyPage() {
  return (
    <div className="lp-root">
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <a href="/" className="lp-nav-logo">
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
            <a href="https://admin.easymenu.website" className="lp-nav-cta">Get started</a>
          </div>
        </div>
      </nav>

      <div style={{ background: 'var(--lp-cream)', minHeight: '80vh', padding: '64px 0 96px' }}>
        <div className="lp-container-narrow">
          <h1 style={{
            fontFamily: 'var(--lp-serif)',
            fontSize: 'clamp(28px, 4vw, 42px)',
            color: 'var(--lp-text)',
            lineHeight: 1.15,
            marginBottom: '12px',
          }}>
            SMS Messaging Policy
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--lp-muted)', marginBottom: '48px' }}>
            Last updated: April 2026
          </p>

          <div style={{ display: 'grid', gap: '36px' }}>
            <p style={{ fontSize: '16px', color: 'var(--lp-text)', lineHeight: 1.7 }}>
              EasyMenu is a white-label ordering platform used by independent restaurants. SMS messages
              are sent on behalf of individual restaurant businesses using the EasyMenu platform.
            </p>

            <PolicySection title="How customers opt in">
              <p>
                Customers opt in to receive SMS messages by voluntarily entering their phone number at
                checkout on their restaurant's ordering page. Opt-in language is displayed at the point
                of collection on every restaurant storefront powered by EasyMenu, which reads:
              </p>
              <blockquote style={{
                margin: '16px 0 0',
                paddingLeft: '16px',
                borderLeft: '3px solid var(--lp-primary)',
                color: 'var(--lp-text)',
                fontStyle: 'italic',
              }}>
                "By providing your phone number, you agree to receive order status updates via SMS.
                Reply STOP to opt out."
              </blockquote>
            </PolicySection>

            <PolicySection title="Message frequency">
              <p>
                Customers receive order confirmation and order status update messages per transaction.
                Message frequency depends on order activity.
              </p>
            </PolicySection>

            <PolicySection title="Sample messages">
              <ul style={{ paddingLeft: '20px', display: 'grid', gap: '8px', listStyleType: 'disc' }}>
                <li>"Your order #1234 has been confirmed and is being prepared."</li>
                <li>"Your order #1234 is ready for pickup!"</li>
                <li>"Your order #1234 is out for delivery."</li>
              </ul>
            </PolicySection>

            <PolicySection title="Opt-out">
              <p>
                Reply <strong>STOP</strong> at any time to unsubscribe. You will receive one
                confirmation message and no further messages.
              </p>
            </PolicySection>

            <PolicySection title="Help">
              <p>
                Reply <strong>HELP</strong> for support or email{' '}
                <a href="mailto:support@easymenu.website" style={{ color: 'var(--lp-primary)' }}>
                  support@easymenu.website
                </a>
              </p>
            </PolicySection>

            <PolicySection title="Rates">
              <p>Message and data rates may apply.</p>
            </PolicySection>
          </div>
        </div>
      </div>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-bottom" style={{ paddingTop: 0, borderTop: 'none' }}>
            <span className="lp-footer-copy">© 2026 EasyMenu. All rights reserved.</span>
            <div className="lp-footer-legal">
              <a href="/">Home</a>
              <a href="/sms-policy">SMS Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--lp-warm-white)',
      border: '1px solid var(--lp-border)',
      borderRadius: '12px',
      padding: '28px 32px',
    }}>
      <h2 style={{
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--lp-text)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '14px',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: '15px', color: 'var(--lp-muted)', lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  )
}
