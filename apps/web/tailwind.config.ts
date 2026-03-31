import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          background: "rgb(var(--color-brand-background) / <alpha-value>)",
          surface: "rgb(var(--color-brand-surface) / <alpha-value>)",
          text: "rgb(var(--color-brand-text) / <alpha-value>)",
          muted: "rgb(var(--color-brand-muted) / <alpha-value>)",
          border: "rgb(var(--color-brand-border) / <alpha-value>)",
          primary: "rgb(var(--color-brand-primary) / <alpha-value>)",
          accent: "rgb(var(--color-brand-accent) / <alpha-value>)",
          "primary-foreground": "rgb(var(--color-brand-primary-foreground) / <alpha-value>)",
        },
      },
      borderRadius: {
        brand: "var(--radius-brand)",
      },
      boxShadow: {
        brand: "var(--shadow-brand)",
      },
      fontFamily: {
        body: ["var(--font-body)"],
        heading: ["var(--font-heading)"],
      },
      backgroundImage: {
        "brand-hero": "var(--gradient-brand-hero)",
      },
    },
  },
  plugins: [],
}

export default config
