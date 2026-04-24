import { AnimatePresence, motion } from "framer-motion"
import { Check, Minus, Plus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { MenuItem } from "../lib/menu"
import type { CartItem } from "./cartStore"
import { useTheme } from "../theme/ThemeProvider"

type SelectionMap = Record<string, string[]>

type DrawerProps = {
  item: MenuItem | null
  editingItem?: CartItem | null
  open: boolean
  onClose: () => void
  onAddToCart: (payload: {
    itemId: string
    name: string
    variantId: string | null
    variantName: string | null
    unitPriceCents: number
    quantity: number
    notes: string | null
    modifiers: Array<{
      groupId: string
      groupName: string
      optionId: string
      optionName: string
      priceDeltaCents: number
    }>
  }) => void
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

function defaultVariant(item: MenuItem | null) {
  if (!item) return null
  return item.variants.find((variant) => variant.isDefault) ?? item.variants[0] ?? null
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "").trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized

  const value = Number.parseInt(expanded, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function ItemCustomizationDrawer({
  item,
  editingItem = null,
  open,
  onClose,
  onAddToCart,
}: DrawerProps) {
  const { theme } = useTheme()
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<SelectionMap>({})
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!item || !open) return

    const nextSelections: SelectionMap = {}
    for (const group of item.itemModifierGroups) {
      if (editingItem) {
        nextSelections[group.group.id] = editingItem.modifiers
          .filter((modifier) => modifier.groupId === group.group.id)
          .map((modifier) => modifier.optionId)
      } else if (group.isRequired && group.minSelections > 0 && group.group.options[0]) {
        nextSelections[group.group.id] = [group.group.options[0].id]
      }
    }

    setSelectedVariantId(editingItem?.variantId ?? defaultVariant(item)?.id ?? null)
    setSelectedOptions(nextSelections)
    setQuantity(editingItem?.quantity ?? 1)
    setNotes(editingItem?.notes ?? "")
  }, [editingItem, item, open])

  useEffect(() => {
    if (!open || typeof document === "undefined") return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const selectedVariant = useMemo(
    () =>
      item?.variants.find((variant) => variant.id === selectedVariantId) ??
      defaultVariant(item),
    [item, selectedVariantId],
  )

  const selectedModifierPayload = useMemo(() => {
    if (!item) return []

    return item.itemModifierGroups.flatMap((itemGroup) => {
      const optionIds = selectedOptions[itemGroup.group.id] ?? []

      return itemGroup.group.options
        .filter((option) => optionIds.includes(option.id))
        .map((option) => ({
          groupId: itemGroup.group.id,
          groupName: itemGroup.group.name,
          optionId: option.id,
          optionName: option.name,
          priceDeltaCents: option.priceDeltaCents,
        }))
    })
  }, [item, selectedOptions])

  const validationErrors = useMemo(() => {
    if (!item) return []

    return item.itemModifierGroups.flatMap((itemGroup) => {
      const currentCount = selectedOptions[itemGroup.group.id]?.length ?? 0

      if (itemGroup.isRequired && currentCount < itemGroup.minSelections) {
        return [
          `Select at least ${itemGroup.minSelections} option(s) for ${itemGroup.group.name}.`,
        ]
      }

      return []
    })
  }, [item, selectedOptions])

  const unitPriceCents = useMemo(() => {
    if (!item) return 0
    return (
      (selectedVariant?.priceCents ?? item.basePriceCents) +
      selectedModifierPayload.reduce((sum, option) => sum + option.priceDeltaCents, 0)
    )
  }, [item, selectedModifierPayload, selectedVariant])

  const canSubmit = !!item && validationErrors.length === 0 && item.visibility !== "SOLD_OUT"
  const heroImageBackground = item?.photoUrl
    ? `url(${item.photoUrl}) center/cover`
    : `linear-gradient(135deg, ${hexToRgba(theme.palette.primary, 0.18)}, ${hexToRgba(theme.palette.accent, 0.14)})`

  function toggleMultiSelect(groupId: string, optionId: string, maxSelections: number | null) {
    setSelectedOptions((current) => {
      const existing = current[groupId] ?? []
      const next = existing.includes(optionId)
        ? existing.filter((value) => value !== optionId)
        : maxSelections && existing.length >= maxSelections
          ? [...existing.slice(1), optionId]
          : [...existing, optionId]

      return {
        ...current,
        [groupId]: next,
      }
    })
  }

  function selectSingle(groupId: string, optionId: string) {
    setSelectedOptions((current) => ({
      ...current,
      [groupId]: [optionId],
    }))
  }

  function handleAdd() {
    if (!item || !canSubmit) return

    onAddToCart({
      itemId: item.id,
      name: item.name,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      unitPriceCents,
      quantity,
      notes: notes.trim() ? notes.trim() : null,
      modifiers: selectedModifierPayload,
    })
    onClose()
  }

  const modal = (
    <AnimatePresence>
      {open && item ? (
        <>
          <motion.div
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed right-0 top-0 z-[9999] flex h-full w-full max-w-[520px] flex-col overflow-hidden"
            style={{
              backgroundColor: theme.palette.surface,
              boxShadow: `0 0 40px ${hexToRgba(theme.palette.text, 0.14)}`,
            }}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-72 shrink-0 overflow-hidden">
              <div
                className="h-full w-full"
                style={{
                  background: heroImageBackground,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

              <button
                type="button"
                className="absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-lg"
                style={{
                  backgroundColor: hexToRgba(theme.palette.surface, 0.92),
                  borderColor: hexToRgba(theme.palette.border, 0.75),
                  color: theme.palette.text,
                }}
                onClick={onClose}
                aria-label="Close customization drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 pb-40">
              <div className="grid gap-8">
                <section className="grid gap-4">
                  <div>
                    <h2
                      className="text-4xl font-bold leading-tight text-foreground"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {item.name}
                    </h2>
                    {item.description ? (
                      <p className="mt-4 text-lg leading-9 text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  {item.tags.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                      {item.tags.slice(0, 2).map((tag, index) => (
                        <div key={tag} className="flex items-center gap-3">
                          <span style={{ color: index === 0 ? theme.palette.primary : "#16A34A" }}>
                            {tag.toUpperCase()}
                          </span>
                          {index < Math.min(item.tags.length, 2) - 1 ? (
                            <span style={{ color: hexToRgba(theme.palette.muted, 0.5) }}>•</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>

                {item.variants.length > 0 ? (
                  <DrawerSection
                    title="Choose a Size"
                    hint="Required"
                    themeBorder={theme.palette.border}
                    themeMuted={theme.palette.muted}
                  >
                    <div className="grid gap-3">
                      {item.variants.map((variant) => {
                        const selected = selectedVariant?.id === variant.id
                        return (
                          <SelectableRow
                            key={variant.id}
                            selected={selected}
                            multi={false}
                            label={variant.name}
                            detail={variant.isDefault ? "Included" : formatPrice(variant.priceCents)}
                            onClick={() => setSelectedVariantId(variant.id)}
                          />
                        )
                      })}
                    </div>
                  </DrawerSection>
                ) : null}

                {item.itemModifierGroups.map((itemGroup) => (
                  <DrawerSection
                    key={itemGroup.id}
                    title={itemGroup.group.name}
                    hint={itemGroup.isRequired ? "Required" : "Optional"}
                    themeBorder={theme.palette.border}
                    themeMuted={theme.palette.muted}
                  >
                    <div className="grid gap-3">
                      {itemGroup.group.options.map((option) => {
                        const selected =
                          selectedOptions[itemGroup.group.id]?.includes(option.id) ?? false

                        return (
                          <SelectableRow
                            key={option.id}
                            selected={selected}
                            multi={itemGroup.group.selection !== "SINGLE"}
                            label={option.name}
                            detail={
                              option.priceDeltaCents > 0
                                ? `+ ${formatPrice(option.priceDeltaCents)}`
                                : "Included"
                            }
                            onClick={() =>
                              itemGroup.group.selection === "SINGLE"
                                ? selectSingle(itemGroup.group.id, option.id)
                                : toggleMultiSelect(
                                    itemGroup.group.id,
                                    option.id,
                                    itemGroup.maxSelections,
                                  )
                            }
                          />
                        )
                      })}
                    </div>
                  </DrawerSection>
                ))}

                <section className="grid gap-3">
                  <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: hexToRgba(theme.palette.border, 0.7) }}>
                    <h3 className="text-lg font-medium text-foreground">Notes</h3>
                  </div>
                  <Label htmlFor="item-notes" className="text-sm text-muted-foreground">
                    Special instructions
                  </Label>
                  <textarea
                    id="item-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Add any special instructions for the kitchen"
                    className="min-h-28 w-full rounded-[18px] border px-4 py-4 text-sm outline-none placeholder:text-muted-foreground"
                    style={{
                      borderColor: hexToRgba(theme.palette.border, 0.9),
                      backgroundColor: hexToRgba(theme.palette.surface, 0.92),
                      color: theme.palette.text,
                    }}
                  />
                </section>
              </div>
            </div>

            <div
              className="shrink-0 border-t px-6 py-5"
              style={{
                backgroundColor: hexToRgba(theme.palette.surface, 0.98),
                borderColor: hexToRgba(theme.palette.border, 0.75),
              }}
            >
              <div className="grid gap-4">
                {validationErrors.length > 0 ? (
                  <div
                    className="rounded-[16px] border px-4 py-3 text-sm"
                    style={{
                      borderColor: hexToRgba("#B91C1C", 0.25),
                      backgroundColor: hexToRgba("#B91C1C", 0.08),
                      color: "#8F1D1D",
                    }}
                  >
                    {validationErrors.map((error) => (
                      <div key={error}>{error}</div>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-center gap-4">
                  <div
                    className="inline-flex items-center gap-5 rounded-full border px-5 py-4"
                    style={{
                      borderColor: hexToRgba(theme.palette.primary, 0.24),
                      backgroundColor: hexToRgba(theme.palette.surface, 0.9),
                    }}
                  >
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-5 text-center text-xl font-semibold text-foreground">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center"
                      onClick={() => setQuantity((current) => current + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="flex min-h-[72px] flex-1 items-center justify-center rounded-full px-6 text-xl font-semibold shadow-[0_14px_30px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})`,
                      color: theme.palette.primaryForeground,
                    }}
                    disabled={!canSubmit}
                    onClick={handleAdd}
                  >
                    {editingItem ? "Update Cart" : "Add to Cart"}{" "}
                    <span className="mx-2 opacity-60">•</span>
                    {formatPrice(unitPriceCents * quantity)}
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )

  if (typeof document === "undefined") {
    return null
  }

  return createPortal(modal, document.body)
}

function DrawerSection({
  title,
  hint,
  themeBorder,
  themeMuted,
  children,
}: {
  title: string
  hint: string
  themeBorder: string
  themeMuted: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-5">
      <div
        className="flex items-center justify-between border-b pb-3"
        style={{ borderColor: hexToRgba(themeBorder, 0.7) }}
      >
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <span
          className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            backgroundColor: hexToRgba(themeBorder, 0.32),
            color: themeMuted,
          }}
        >
          {hint}
        </span>
      </div>
      {children}
    </section>
  )
}

function SelectableRow({
  selected,
  multi,
  label,
  detail,
  onClick,
}: {
  selected: boolean
  multi: boolean
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-between gap-4 rounded-[18px] border px-5 py-5 text-left transition-colors"
      style={{
        borderColor: selected ? "rgb(var(--color-brand-primary) / 0.32)" : "rgb(var(--color-brand-border) / 0.8)",
        backgroundColor: selected
          ? "rgb(var(--color-brand-primary) / 0.06)"
          : "rgb(var(--color-brand-surface) / 0.92)",
      }}
      onClick={onClick}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center border"
          style={{
            borderRadius: multi ? "10px" : "9999px",
            borderColor: selected
              ? "rgb(var(--color-brand-primary))"
              : "rgb(var(--color-brand-border) / 0.9)",
            backgroundColor: selected
              ? "rgb(var(--color-brand-primary))"
              : "transparent",
            color: selected
              ? "rgb(var(--color-brand-primary-foreground))"
              : "transparent",
          }}
        >
          <Check className="h-4 w-4" />
        </div>
        <span className="text-lg font-medium text-foreground">{label}</span>
      </div>
      <span
        className="shrink-0 text-lg"
        style={{
          color: detail === "Included" ? "rgb(var(--color-brand-muted))" : "rgb(var(--color-brand-primary))",
        }}
      >
        {detail}
      </span>
    </button>
  )
}
