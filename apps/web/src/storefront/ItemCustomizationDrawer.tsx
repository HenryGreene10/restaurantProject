import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { MenuItem } from "../lib/menu"
import type { CartItem } from "./cartStore"

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

export function ItemCustomizationDrawer({
  item,
  editingItem = null,
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

  const modal = (
    <AnimatePresence>
      {open && item ? (
        <>
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="relative z-[10000] flex w-[90%] max-w-[560px] flex-col overflow-hidden rounded-[12px] bg-white text-black shadow-[0_25px_50px_rgba(0,0,0,0.3)]"
              style={{ maxHeight: "85vh" }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                      Customize item
                    </div>
                    <h2 className="mt-2 text-2xl text-black" style={{ fontFamily: "var(--font-heading)" }}>
                      {item.name}
                    </h2>
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-6">
                <div className="grid gap-6 bg-white">
                {item.description ? (
                  <p className="max-w-2xl text-sm leading-6 text-neutral-600">{item.description}</p>
                ) : null}

                {item.variants.length > 0 ? (
                  <section className="space-y-4">
                    <div className="space-y-2">
                      <Badge variant="outline" className="border-neutral-200 bg-white text-neutral-600">
                        Choose size
                      </Badge>
                      <div className="text-sm text-neutral-600">Pick the size that fits this order.</div>
                    </div>
                    <div className="grid gap-4">
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
                                ? "border-primary bg-primary/10 text-black"
                                : "border-neutral-200 bg-white text-black",
                            ].join(" ")}
                          >
                            <span>
                              <span className="block font-semibold">{variant.name}</span>
                              {variant.isDefault ? (
                                <span className="mt-2 block text-sm text-neutral-500">Default</span>
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
                      <Badge variant="outline" className="border-neutral-200 bg-white text-neutral-600">
                        {itemGroup.group.name}
                      </Badge>
                      <p className="mt-2 text-sm text-neutral-600">
                        {itemGroup.group.selection === "SINGLE"
                          ? "Choose one option"
                          : `Choose up to ${itemGroup.maxSelections ?? itemGroup.group.options.length}`}
                        {itemGroup.isRequired ? " · Required" : " · Optional"}
                      </p>
                    </div>

                    <div className="grid gap-4">
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
                                ? "border-primary bg-primary/10 text-black"
                                : "border-neutral-200 bg-white text-black",
                            ].join(" ")}
                          >
                            <span className="font-medium">{option.name}</span>
                            <span className="text-sm text-neutral-500">
                              +{formatPrice(option.priceDeltaCents)}
                            </span>
                          </Button>
                        )
                      })}
                    </div>
                  </section>
                ))}

                <section className="space-y-4">
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-neutral-200 bg-white text-neutral-600">
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
                    className="min-h-24 w-full rounded-[12px] border border-neutral-200 bg-white px-4 py-4 text-sm text-black shadow-sm outline-none placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-0"
                  />
                </section>

                <section className="space-y-4">
                  <Badge variant="outline" className="border-neutral-200 bg-white text-neutral-600">
                    Quantity
                  </Badge>
                  <div className="inline-flex items-center gap-2 rounded-[12px] border border-neutral-200 bg-white px-2 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-8 text-center text-sm font-semibold text-black">{quantity}</span>
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
                </div>
              </div>

              <div className="shrink-0 border-t border-[#eee] bg-white px-4 py-4 sm:px-6">
                <div className="grid gap-4 bg-white">
                  {validationErrors.length > 0 ? (
                    <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                      {validationErrors.map((error) => (
                        <div key={error}>{error}</div>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between text-sm text-neutral-600">
                    <span>Total</span>
                    <span className="text-lg font-semibold text-black">
                      {formatPrice(unitPriceCents * quantity)}
                    </span>
                  </div>

                  <Button className="min-h-11 w-full justify-center" disabled={!canSubmit} onClick={handleAdd}>
                    {editingItem ? "Update cart" : "Add to cart"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )

  if (typeof document === "undefined") {
    return null
  }

  return createPortal(modal, document.body)
}
