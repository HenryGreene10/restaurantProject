import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "../components/Button"
import type { MenuItem } from "../lib/menu"

type SelectionMap = Record<string, string[]>

type DrawerProps = {
  item: MenuItem | null
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

export function ItemCustomizationDrawer({
  item,
  open,
  onClose,
  onAddToCart,
}: DrawerProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<SelectionMap>({})
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!item || !open) return

    const nextSelections: SelectionMap = {}
    for (const group of item.itemModifierGroups) {
      if (group.isRequired && group.minSelections > 0 && group.group.options[0]) {
        nextSelections[group.group.id] = [group.group.options[0].id]
      }
    }

    setSelectedVariantId(defaultVariant(item)?.id ?? null)
    setSelectedOptions(nextSelections)
    setQuantity(1)
    setNotes("")
  }, [item, open])

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
        return [`Select at least ${itemGroup.minSelections} option(s) for ${itemGroup.group.name}.`]
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

  return (
    <AnimatePresence>
      {open && item ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto border-l border-brand-border bg-brand-surface shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                  Customize item
                </div>
                <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
                  {item.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-brand-border p-2 text-brand-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 px-5 py-5">
              {item.description ? (
                <p className="text-sm leading-6 text-brand-muted">{item.description}</p>
              ) : null}

              {item.variants.length > 0 ? (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                    Choose size
                  </h3>
                  <div className="grid gap-3">
                    {item.variants.map((variant) => {
                      const active = selectedVariant?.id === variant.id
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={[
                            "flex items-center justify-between rounded-brand border px-4 py-3 text-left",
                            active
                              ? "border-brand-primary bg-brand-primary/10"
                              : "border-brand-border bg-brand-background",
                          ].join(" ")}
                        >
                          <span>
                            <span className="block font-semibold">{variant.name}</span>
                            {variant.isDefault ? (
                              <span className="block text-sm text-brand-muted">Default</span>
                            ) : null}
                          </span>
                          <span className="font-semibold">{formatPrice(variant.priceCents)}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ) : null}

              {item.itemModifierGroups.map((itemGroup) => (
                <section key={itemGroup.id} className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                      {itemGroup.group.name}
                    </h3>
                    <p className="mt-1 text-sm text-brand-muted">
                      {itemGroup.group.selection === "SINGLE"
                        ? "Choose one option"
                        : `Choose up to ${itemGroup.maxSelections ?? itemGroup.group.options.length}`}
                      {itemGroup.isRequired ? " · Required" : " · Optional"}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {itemGroup.group.options.map((option) => {
                      const selected =
                        selectedOptions[itemGroup.group.id]?.includes(option.id) ?? false

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            itemGroup.group.selection === "SINGLE"
                              ? selectSingle(itemGroup.group.id, option.id)
                              : toggleMultiSelect(
                                  itemGroup.group.id,
                                  option.id,
                                  itemGroup.maxSelections,
                                )
                          }
                          className={[
                            "flex items-center justify-between rounded-brand border px-4 py-3 text-left",
                            selected
                              ? "border-brand-primary bg-brand-primary/10"
                              : "border-brand-border bg-brand-background",
                          ].join(" ")}
                        >
                          <span className="font-medium">{option.name}</span>
                          <span className="text-sm text-brand-muted">
                            +{formatPrice(option.priceDeltaCents)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                  Notes
                </h3>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Add any special instructions for the kitchen"
                  className="w-full rounded-brand border border-brand-border bg-brand-background px-4 py-3 text-sm text-brand-text outline-none"
                />
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                  Quantity
                </h3>
                <div className="inline-flex items-center gap-3 rounded-full border border-brand-border bg-brand-background px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="rounded-full border border-brand-border p-2"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-8 text-center font-semibold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => current + 1)}
                    className="rounded-full border border-brand-border p-2"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </section>

              {validationErrors.length > 0 ? (
                <div className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {validationErrors.map((error) => (
                    <div key={error}>{error}</div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="border-t border-brand-border bg-brand-surface px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm text-brand-muted">
                <span>Total</span>
                <span className="text-lg font-semibold text-brand-text">
                  {formatPrice(unitPriceCents * quantity)}
                </span>
              </div>
              <Button
                className="w-full justify-center"
                disabled={!canSubmit}
                onClick={handleAdd}
              >
                Add to cart
              </Button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
