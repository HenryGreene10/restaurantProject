import { useQuery } from "@tanstack/react-query"

import { fetchPublicOrderStatus } from "../lib/orders"

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED"])

export function useOrderStatusPoll(input: {
  tenantSlug: string
  orderId: string
}) {
  return useQuery({
    queryKey: ["customer-order", input.tenantSlug, input.orderId],
    queryFn: () =>
      fetchPublicOrderStatus({
        tenantSlug: input.tenantSlug,
        orderId: input.orderId,
      }),
    enabled: Boolean(input.orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || TERMINAL_STATUSES.has(status)) {
        return false
      }

      return 10000
    },
  })
}
