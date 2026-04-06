import { create } from "zustand"

import { getTenantSlug } from "../lib/tenant"
import type { ThemeSource } from "./types"

type ThemePlaygroundState = {
  source: ThemeSource
  tenantSlug: string
  setSource: (source: ThemeSource) => void
  setTenantSlug: (tenantSlug: string) => void
}

export const useThemePlaygroundStore = create<ThemePlaygroundState>((set) => ({
  source: "api",
  tenantSlug: getTenantSlug() ?? "",
  setSource: (source) => set({ source }),
  setTenantSlug: (tenantSlug) => set({ tenantSlug }),
}))
