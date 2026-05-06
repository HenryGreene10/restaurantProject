import React from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, Show, SignIn, SignUp } from '@clerk/react'

import './styles.css'
import { App } from './pages/App'
import { createSignupPaymentSession, readSetupSessionId } from './lib/onboarding'

const ClerkProviderWithEnv = ClerkProvider as unknown as React.ComponentType<
  React.PropsWithChildren<{ afterSignOutUrl?: string }>
>

function Root() {
  const isSignUp = window.location.pathname === '/signup'
  const setupSessionId = isSignUp ? readSetupSessionId() : null
  return (
    <>
      <Show when="signed-out">
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
          {isSignUp && !setupSessionId ? <SignupPaymentGate /> : isSignUp ? <SignUp /> : <SignIn />}
        </main>
      </Show>
      <Show when="signed-in">
        <App />
      </Show>
    </>
  )
}

function SignupPaymentGate() {
  const [error, setError] = React.useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = React.useState(false)

  async function startPayment() {
    setError(null)
    setIsRedirecting(true)
    try {
      const url = await createSignupPaymentSession()
      window.location.assign(url)
    } catch (nextError) {
      setIsRedirecting(false)
      setError(nextError instanceof Error ? nextError.message : 'Failed to start setup payment')
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Start with payment</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Complete the $279 setup payment first. After Stripe confirms payment, you can create your
          owner login and restaurant workspace.
        </p>
      </div>
      <button
        type="button"
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isRedirecting}
        onClick={startPayment}
      >
        {isRedirecting ? 'Redirecting...' : 'Continue to payment'}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        Already paid? Use the Stripe success link to continue signup.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProviderWithEnv afterSignOutUrl="/">
      <Root />
    </ClerkProviderWithEnv>
  </React.StrictMode>
)
