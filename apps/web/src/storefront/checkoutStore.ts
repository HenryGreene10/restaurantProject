import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type CheckoutStore = {
  customerName: string
  customerPhone: string
  orderNotes: string
  setCustomerName: (value: string) => void
  setCustomerPhone: (value: string) => void
  setOrderNotes: (value: string) => void
  resetAfterOrder: () => void
}

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      customerName: "",
      customerPhone: "",
      orderNotes: "",
      setCustomerName: (value) => set({ customerName: value }),
      setCustomerPhone: (value) => set({ customerPhone: value }),
      setOrderNotes: (value) => set({ orderNotes: value }),
      resetAfterOrder: () => set({ orderNotes: "" }),
    }),
    {
      name: "storefront-checkout",
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
