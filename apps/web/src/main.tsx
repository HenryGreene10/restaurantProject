import "@fontsource/inter/400.css"
import "@fontsource/inter/600.css"
import "@fontsource/bree-serif/400.css"
import "./index.css"

import * as Sentry from "@sentry/react"
import React from "react"
import ReactDOM from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { App } from "./app/App"
import { ThemeProvider } from "./theme/ThemeProvider"

const queryClient = new QueryClient()
const sentryDsn = import.meta.env.VITE_SENTRY_DSN ?? ""

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
  })
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div>Something went wrong.</div>}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
