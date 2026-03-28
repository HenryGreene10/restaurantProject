type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'

type OrderStatusDataAccess = {
  orders: {
    findById(orderId: string): Promise<{ status: OrderStatus } | null>
    updateStatus(
      orderId: string,
      nextStatus: OrderStatus,
      actorAdminId?: string | null
    ): Promise<unknown | null>
  }
}

const allowedTransitions: Record<OrderStatus, ReadonlyArray<OrderStatus>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export function isValidOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
) {
  return allowedTransitions[currentStatus].includes(nextStatus)
}

export async function transitionOrderStatus(
  dataAccess: OrderStatusDataAccess,
  input: {
    orderId: string
    nextStatus: OrderStatus
    actorAdminId?: string | null
  }
): Promise<
  | { kind: 'not_found' }
  | { kind: 'invalid_transition'; currentStatus: OrderStatus; nextStatus: OrderStatus }
  | { kind: 'updated'; order: unknown }
> {
  const currentOrder = await dataAccess.orders.findById(input.orderId)

  if (!currentOrder) {
    return { kind: 'not_found' }
  }

  if (!isValidOrderStatusTransition(currentOrder.status, input.nextStatus)) {
    return {
      kind: 'invalid_transition',
      currentStatus: currentOrder.status,
      nextStatus: input.nextStatus,
    }
  }

  const updatedOrder = await dataAccess.orders.updateStatus(
    input.orderId,
    input.nextStatus,
    input.actorAdminId ?? null
  )

  if (!updatedOrder) {
    return { kind: 'not_found' }
  }

  return {
    kind: 'updated',
    order: updatedOrder,
  }
}
