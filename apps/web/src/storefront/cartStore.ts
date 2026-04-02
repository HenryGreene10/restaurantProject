import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type CartModifierSelection = {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceDeltaCents: number
}

export type CartItem = {
  lineId: string
  itemId: string
  name: string
  variantId: string | null
  variantName: string | null
  unitPriceCents: number
  quantity: number
  notes: string | null
  modifiers: CartModifierSelection[]
}

type AddCartItemInput = Omit<CartItem, "lineId">

type CartStore = {
  items: CartItem[]
  addItem: (item: AddCartItemInput) => void
  removeItem: (lineId: string) => void
  incrementQuantity: (lineId: string) => void
  decrementQuantity: (lineId: string) => void
  clear: () => void
}

export function cartLineTotal(item: CartItem) {
  return item.unitPriceCents * item.quantity
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + cartLineTotal(item), 0)
}

export function cartItemCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              lineId: crypto.randomUUID(),
            },
          ],
        })),
      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((item) => item.lineId !== lineId),
        })),
      incrementQuantity: (lineId) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.lineId === lineId ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        })),
      decrementQuantity: (lineId) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.lineId === lineId ? { ...item, quantity: item.quantity - 1 } : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "storefront-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
