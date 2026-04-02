import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Customize item
                </div>
                <h2 className="mt-2 text-2xl text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  {item.name}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 space-y-6 px-6 py-6">
              {item.description ? (
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{item.description}</p>
              ) : null}

              {item.variants.length > 0 ? (
                <section className="space-y-4">
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                      Choose size
                    </Badge>
                    <div className="text-sm text-muted-foreground">Pick the size that fits this order.</div>
                  </div>
                  <div className="grid gap-3">
                    {item.variants.map((variant) => {
                      const active = selectedVariant?.id === variant.id
                      return (
                        <Button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id)}
                          variant="outline"
                          className={[
                            "h-auto w-full items-start justify-between gap-4 px-4 py-4 text-left",
                            active
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card text-foreground",
                          ].join(" ")}
                        >
                          <span>
                            <span className="block font-semibold">{variant.name}</span>
                            {variant.isDefault ? (
                              <span className="mt-1 block text-sm text-muted-foreground">Default</span>
                            ) : null}
                          </span>
                          <span className="font-semibold">{formatPrice(variant.priceCents)}</span>
                        </Button>
                      )
                    })}
                  </div>
                </section>
              ) : null}

              {item.itemModifierGroups.map((itemGroup) => (
                <section key={itemGroup.id} className="space-y-4">
                  <div>
                    <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                      {itemGroup.group.name}
                    </Badge>
                    <p className="mt-2 text-sm text-muted-foreground">
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
                        <Button
                          key={option.id}
                          type="button"
                          variant="outline"
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
                            "h-auto w-full items-start justify-between gap-4 px-4 py-4 text-left",
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card text-foreground",
                          ].join(" ")}
                        >
                          <span className="font-medium">{option.name}</span>
                          <span className="text-sm text-muted-foreground">
                            +{formatPrice(option.priceDeltaCents)}
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                </section>
              ))}

              <section className="space-y-3">
                <div className="space-y-2">
                  <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                    Notes
                  </Badge>
                  <Label htmlFor="item-notes">Special instructions</Label>
                </div>
                <textarea
                  id="item-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Add any special instructions for the kitchen"
                  className="min-h-24 w-full rounded-[var(--radius)] border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
              </section>

              <section className="space-y-3">
                <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                  Quantity
                </Badge>
                <div className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-background px-2 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-8 text-center text-sm font-semibold text-foreground">{quantity}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setQuantity((current) => current + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </section>

              {validationErrors.length > 0 ? (
                <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                  {validationErrors.map((error) => (
                    <div key={error}>{error}</div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="border-t border-border bg-card px-6 py-5">
              <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total</span>
                <span className="text-lg font-semibold text-foreground">
                  {formatPrice(unitPriceCents * quantity)}
                </span>
              </div>
              <Separator />
              <Button
                className="w-full justify-center"
                disabled={!canSubmit}
                onClick={handleAdd}
              >
                Add to cart
              </Button>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
