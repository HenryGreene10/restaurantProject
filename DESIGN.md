---
version: alpha
name: EasyMenu Warm Hospitality
description: "A warm, restaurant-first design system that pairs soft editorial storytelling with polished ordering and admin surfaces."
colors:
  background: "#FAF7F2"
  surface: "#FFFCF7"
  surface-muted: "#F3EDE4"
  surface-elevated: "#FFFFFF"
  hero-surface: "#1C1410"
  hero-surface-alt: "#2A1F18"
  on-hero: "#FFF7ED"
  text: "#271C17"
  text-strong: "#1C1410"
  muted: "#745E54"
  border: "#E8DCD1"
  border-subtle: "#E4DBD2"
  primary: "#C25325"
  primary-strong: "#B42318"
  on-primary: "#FFF7F1"
  accent: "#ECAA34"
  accent-soft: "#F4A29A"
  success: "#16A34A"
  danger: "#B91C1C"
  danger-surface: "#FEF2F2"
  danger-border: "#FECACA"
typography:
  display-editorial:
    fontFamily: "DM Serif Display"
    fontSize: 72px
    fontWeight: 400
    lineHeight: 76px
    letterSpacing: -0.03em
  display-product:
    fontFamily: "Bree Serif"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 54px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: "Bree Serif"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: "Bree Serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.02em
  title-lg:
    fontFamily: "Inter"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
  body-lg:
    fontFamily: "Inter"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 30px
  body-md:
    fontFamily: "Inter"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  body-sm:
    fontFamily: "Inter"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 22px
  label-md:
    fontFamily: "Inter"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0.12em
  label-sm:
    fontFamily: "Inter"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.12em
  nav-md:
    fontFamily: "DM Sans"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
rounded:
  xs: 8px
  sm: 10px
  md: 12px
  lg: 18px
  xl: 24px
  2xl: 32px
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  section: 96px
  container-padding: 24px
  card-padding: 24px
  card-padding-compact: 16px
  category-gap: 48px
backgrounds:
  page-wash: "radial-gradient(circle at top left, rgba(236, 170, 52, 0.16), transparent 28%), linear-gradient(180deg, #FFFCF7 0%, #FAF7F2 100%)"
  hero-warm: "linear-gradient(135deg, rgba(194, 83, 37, 0.15), rgba(236, 170, 52, 0.25))"
  hero-dark: "radial-gradient(circle, rgba(180, 35, 24, 0.18) 0%, transparent 70%)"
shadows:
  soft: "0 10px 24px rgba(39, 28, 23, 0.08)"
  brand: "0 18px 48px rgba(39, 28, 23, 0.12)"
  modal: "0 25px 50px rgba(0, 0, 0, 0.30)"
  ring: "0 0 0 1px rgba(39, 28, 23, 0.05)"
elevation:
  flat:
    shadow: none
  raised:
    shadow: "{shadows.soft}"
  prominent:
    shadow: "{shadows.brand}"
  overlay:
    shadow: "{shadows.modal}"
motion:
  page-enter-duration: "240ms"
  page-enter-easing: "ease-out"
  panel-enter-duration: "180ms"
  panel-enter-easing: "ease-out"
  tap-duration: "120ms"
  tap-easing: "ease-out"
  reveal-duration: "650ms"
  reveal-easing: "ease"
  reveal-stagger-1: "100ms"
  reveal-stagger-2: "200ms"
  reveal-stagger-3: "300ms"
  reveal-stagger-4: "400ms"
  drawer-spring: "spring(280, 28)"
layout:
  content-max-width: 1160px
  content-narrow-width: 780px
  nav-height: 64px
  hero-min-height: 320px
  menu-card-min-height: 11.25rem
components:
  page-shell:
    background: "{backgrounds.page-wash}"
    textColor: "{colors.text}"
  hero-surface:
    background: "{backgrounds.hero-warm}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  hero-surface-dark:
    backgroundColor: "{colors.hero-surface}"
    textColor: "{colors.on-hero}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card-padding}"
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  card-surface-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding-compact}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 0 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
  button-gradient:
    background: "linear-gradient(135deg, #C25325, #ECAA34)"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 0 20px
  button-outline-light:
    backgroundColor: transparent
    textColor: "{colors.on-hero}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    height: 44px
    padding: 0 20px
  category-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 0 16px
  category-chip-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-primary}"
  badge-quiet:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.muted}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 6px 12px
  input-field:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 12px
  drawer-panel:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
    padding: "{spacing.card-padding}"
  status-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: 12px 16px
---

## Brand & Style
This system is built for independent restaurants that want to feel polished, warm, and unmistakably owned by the restaurant rather than by a generic marketplace. The overall tone is hospitable and premium without becoming luxurious or cold. It should feel like a clean dining room with good lighting, natural materials, and a confident host.

There are two closely related modes inside the same identity. The product mode, used for storefront, rewards, carts, and admin panels, is light, warm, rounded, and practical. The marketing mode, used for the public landing experience, becomes darker and more editorial, with charcoal hero fields, glow overlays, and stronger serif drama. Both modes must still feel like the same brand family.

The UI should never feel sterile. Warm neutrals, terracotta actions, and amber highlights are the anchors. Depth is soft, not glossy. Interaction feels smooth and modern, but the emotional reference point is hospitality, not fintech or enterprise SaaS.

## Colors
The palette is driven by warm neutrals first, then by a restrained red-orange and amber pairing for emphasis.

- **Background (`#FAF7F2`)** is the default canvas. It should read as parchment or stonewashed paper rather than plain white.
- **Surface (`#FFFCF7`)** is used for cards, admin panels, menu modules, and drawer shells. Surfaces stay slightly lighter than the page so the interface feels layered but soft.
- **Text (`#271C17`)** and **Text Strong (`#1C1410`)** are deep roasted-brown inks, not pure black. This keeps the system warm even at high contrast.
- **Muted (`#745E54`)** handles descriptions, helper text, metadata, and secondary labels.
- **Primary (`#C25325`)** is the main action color for buttons, key highlights, and calls to action. **Primary Strong (`#B42318`)** is the darker marketing variant used when the interface needs a more assertive campaign tone.
- **Accent (`#ECAA34`)** is used sparingly for active category chips, soft glows, and celebratory emphasis. It should support the primary color, not compete with it.
- **Hero Surface (`#1C1410`)** and **Hero Surface Alt (`#2A1F18`)** create the dark landing-page shell. On these backgrounds, text shifts to **On Hero (`#FFF7ED`)**.

Use bright color economically. Most screens should feel neutral first, then activated by a small number of warm accents.

## Typography
Typography uses a deliberate split between product clarity and editorial warmth.

- **Inter** is the operational typeface. It handles body copy, labels, form inputs, prices, metadata, and most admin text. It should feel stable, readable, and contemporary.
- **Bree Serif** is the product headline voice. Use it for menu section titles, storefront hero headlines, rewards balances, and other moments where the interface needs character without losing legibility.
- **DM Serif Display** appears only in the marketing layer, especially the public landing hero. It is more theatrical and should be reserved for large statements.
- **DM Sans** supports the marketing layer for navigation and supporting copy, where a slightly more designed tone is useful.

Headline copy is bold, compact, and visibly serifed. Body copy is generous and calm. Small uppercase labels use wide tracking and semibold weight; they should feel like quiet signage, not loud badges.

## Layout & Spacing
The system runs on an 8px rhythm with generous outer gutters and roomy card interiors.

- Standard horizontal padding is 24px.
- Long-form sections on marketing pages breathe with 96px vertical spacing.
- Product cards and admin panels generally use 24px internal padding, with 16px reserved for denser utility modules.
- Menu and dashboard content prefer clearly separated stacked groups instead of dense, border-heavy tables.

The storefront layout is airy and modular. Category sections are broken apart with large vertical gaps. Menu items use two-column composition on larger screens, balancing text and imagery. The landing page uses fixed-width content rails around 1160px, with a narrower 780px column for explanatory copy.

Whitespace is part of the identity. Leave room around major headings, hero copy, and key actions. Do not collapse the layout into crowded grids unless the screen is explicitly a dense operations view.

## Elevation & Depth
Depth is soft and warm. Most surfaces use rounded cards with light borders and restrained shadows instead of heavy contrast jumps.

- Everyday cards use the `soft` shadow, which separates surfaces without making them feel detached from the page.
- Premium shells such as major storefront panels and larger admin surfaces use the `brand` shadow.
- Overlays and modal drawers use the `modal` shadow and should feel clearly above the page.

The marketing hero is the one place where depth becomes more atmospheric. Dark charcoal surfaces, glow gradients, subtle blur, and translucent borders are appropriate there. Elsewhere, the product should stay grounded and readable.

## Shapes
The shape language is rounded and friendly, but still structured.

- Primary shells and large cards use 24px to 32px corners.
- Inputs and standard utility surfaces use 12px corners.
- Menu photos and compact cards often sit around 18px corners.
- Chips, badges, and primary buttons are usually full-pill shapes.

The system should feel tactile, not geometric. Avoid sharp-cornered blocks unless there is a very specific functional reason.

## Components
Buttons are bold, compact, and easy to hit. The default product button is a warm solid terracotta pill. The storefront add-to-cart button is allowed to use a terracotta-to-amber gradient for extra appetite and energy. Outline buttons inside dark hero areas should stay translucent and understated.

Cards are the dominant structural primitive. They should be light surfaces with quiet borders, warm shadows, and clear internal hierarchy. Menu cards are image-aware and should preserve generous breathing room between title, description, metadata, price, and action.

Category chips are sticky, scrollable, and pill-shaped. Inactive chips should blend into the card layer. Active chips can turn amber and pick up a subtle warm glow.

Inputs and drawers should remain clean and utility-focused. Keep them bright, high-contrast, and operational. The overlay drawer for item customization is the sharpest and most neutral panel in the system; it intentionally feels more focused and task-oriented than the softer outer page.

Status banners and error states should use tinted surfaces rather than harsh fills. Even alerts should stay visually consistent with the warm product shell.

## Do's and Don'ts
- Do let warm neutrals carry most of the page.
- Do use serif typography for high-importance headings and branded statements.
- Do keep major interactive elements rounded and comfortably sized.
- Do use amber as a supporting highlight, not as a second primary brand color.
- Do allow the landing experience to become darker and more editorial than the product shell.
- Don't default to pure white backgrounds and pure black text.
- Don't mix cold blues or generic SaaS gradients into the core experience.
- Don't use hard shadows, hard borders, or tiny radii that make the UI feel severe.
- Don't flood screens with primary color; reserve it for the actions and highlights that matter.
