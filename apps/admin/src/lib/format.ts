export function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100)
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatSignedPercentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return { label: '0%', tone: 'neutral' as const }
    return { label: 'New', tone: 'positive' as const }
  }
  const delta = ((current - previous) / previous) * 100
  const prefix = delta > 0 ? '+' : ''
  return {
    label: `${prefix}${delta.toFixed(0)}%`,
    tone:
      delta > 0 ? ('positive' as const) : delta < 0 ? ('negative' as const) : ('neutral' as const),
  }
}

export function shortDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
