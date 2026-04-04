import React from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider, Show, SignIn } from "@clerk/react"

import "./styles.css"
import { App } from "./pages/App"

const ClerkProviderWithEnv = ClerkProvider as unknown as React.ComponentType<
  React.PropsWithChildren<{ afterSignOutUrl?: string }>
>

function Root() {
  return (
    <>
      <Show when="signed-out">
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
          <SignIn />
        </main>
      </Show>
      <Show when="signed-in">
        <App />
      </Show>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProviderWithEnv afterSignOutUrl="/">
      <Root />
    </ClerkProviderWithEnv>
  </React.StrictMode>
)
