import { useQuery } from "@tanstack/react-query"

import { fetchCustomerOrder } from "../lib/orders"

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED"])

export function useOrderStatusPoll(input: {
  tenantSlug: string
  orderId: string
  accessToken: string | null
}) {
  return useQuery({
    queryKey: ["customer-order", input.tenantSlug, input.orderId],
    queryFn: () =>
      fetchCustomerOrder({
        tenantSlug: input.tenantSlug,
        orderId: input.orderId,
        accessToken: input.accessToken ?? "",
      }),
    enabled: Boolean(input.accessToken && input.orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || TERMINAL_STATUSES.has(status)) {
        return false
      }

      return 5000
    },
  })
}
