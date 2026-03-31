import "@fontsource/inter/400.css"
import "@fontsource/inter/600.css"
import "@fontsource/bree-serif/400.css"
import "./index.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { App } from "./app/App"
import { ThemeProvider } from "./theme/ThemeProvider"

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
