import { motion } from "framer-motion"
import { Check, MonitorSmartphone, Palette, Store } from "lucide-react"

import { Button } from "../components/Button"
import { useTheme } from "../theme/ThemeProvider"
import { useThemePlaygroundStore } from "../theme/store"

const themeOptions = [
  {
    id: "api" as const,
    label: "Live API theme",
    description: "Loads the current tenant brand config from the backend.",
  },
  {
    id: "joesPizza" as const,
    label: "Joe's Pizza preset",
    description: "Warm casual preset for a neighborhood pizza shop.",
  },
  {
    id: "cleanMinimal" as const,
    label: "Clean minimal preset",
    description: "Neutral productized theme for a modern storefront.",
  },
]

export function ThemePlaygroundPage() {
  const { theme, isLoading, isLiveTheme, errorMessage } = useTheme()
  const { source, tenantSlug, setSource, setTenantSlug } = useThemePlaygroundStore()

  return (
    <main className="min-h-screen bg-brand-background px-4 py-8 text-brand-text sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-6 shadow-brand sm:px-8">
          <div className="flex items-center gap-3 text-sm font-semibold text-brand-muted">
            <Palette className="h-4 w-4" />
            Theme foundation playground
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1
                className="text-4xl tracking-tight sm:text-5xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {theme.appTitle}
              </h1>
              <p className="max-w-2xl text-base text-brand-muted sm:text-lg">
                {theme.description}
              </p>
            </div>
            <div className="rounded-brand border border-brand-border/60 bg-brand-background/80 px-4 py-3 text-sm text-brand-muted">
              <div>Tenant slug: {tenantSlug}</div>
              <div>Source: {isLiveTheme ? "API" : "Preset"}</div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-brand-border/70 bg-brand-surface p-5 shadow-brand">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-muted">
              <Store className="h-4 w-4" />
              Theme sources
            </div>

            <div className="space-y-3">
              {themeOptions.map((option) => {
                const active = source === option.id

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSource(option.id)}
                    className={[
                      "flex w-full items-start gap-3 rounded-brand border px-4 py-4 text-left transition-colors",
                      active
                        ? "border-brand-primary bg-brand-primary/10"
                        : "border-brand-border bg-brand-background hover:bg-brand-background/70",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "mt-0.5 rounded-full border p-1",
                        active
                          ? "border-brand-primary bg-brand-primary text-brand-primary-foreground"
                          : "border-brand-border text-brand-muted",
                      ].join(" ")}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="block text-sm text-brand-muted">{option.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <label className="mt-5 flex flex-col gap-2 text-sm text-brand-muted">
              Tenant slug for live API
              <input
                value={tenantSlug}
                onChange={(event) => setTenantSlug(event.target.value)}
                className="rounded-brand border border-brand-border bg-brand-background px-3 py-2 text-brand-text outline-none ring-0"
                placeholder="joes-pizza"
              />
            </label>

            <div className="mt-4 rounded-brand border border-dashed border-brand-border px-4 py-3 text-sm text-brand-muted">
              {isLoading ? "Loading live brand config…" : null}
              {!isLoading && errorMessage ? errorMessage : null}
              {!isLoading && !errorMessage && isLiveTheme
                ? "Live tenant theme loaded successfully."
                : null}
              {!isLiveTheme ? "Preset preview mode." : null}
            </div>
          </aside>

          <motion.section
            key={`${source}-${theme.name}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="grid gap-6"
          >
            <div className="overflow-hidden rounded-[32px] border border-brand-border/70 bg-brand-surface shadow-brand">
              <div className="bg-brand-hero px-6 py-8 sm:px-8 sm:py-10">
                <div className="max-w-xl space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-border/80 bg-brand-surface/70 px-3 py-1 text-sm text-brand-muted">
                    <MonitorSmartphone className="h-4 w-4" />
                    PWA theme preview
                  </div>
                  <h2
                    className="text-3xl leading-tight sm:text-4xl"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    ThemeProvider injects CSS variables at the document root.
                  </h2>
                  <p className="max-w-lg text-base text-brand-muted">
                    This preview is the theme system foundation only. The next step is building real
                    storefront pages on top of these variables.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button>Start order</Button>
                    <Button className="bg-brand-surface text-brand-text">
                      View menu
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Primary action",
                  value: theme.palette.primary,
                  hint: "Used for CTA buttons and active states.",
                },
                {
                  title: "Surface + border",
                  value: `${theme.palette.surface} / ${theme.palette.border}`,
                  hint: "Cards, inputs, and secondary chrome.",
                },
                {
                  title: "Typography",
                  value: `${theme.typography.headingFont} / ${theme.typography.bodyFont}`,
                  hint: "Heading and body font pairing.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-[28px] border border-brand-border/70 bg-brand-surface p-5 shadow-brand"
                >
                  <div className="text-sm font-semibold text-brand-muted">{card.title}</div>
                  <div className="mt-3 text-lg font-semibold">{card.value}</div>
                  <div className="mt-2 text-sm text-brand-muted">{card.hint}</div>
                </div>
              ))}
            </div>
          </motion.section>
        </section>
      </div>
    </main>
  )
}
