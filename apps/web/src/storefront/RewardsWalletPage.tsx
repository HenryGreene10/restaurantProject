import { ArrowLeft, Gift, History } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '../components/Button'
import { fetchCustomerLoyaltyAccount, type CustomerLoyaltyAccount } from '../lib/loyalty'
import { useTheme } from '../theme/ThemeProvider'
import type { CustomerSessionController } from './useCustomerSession'

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-border/40">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: 'rgb(var(--color-brand-primary))',
        }}
      />
    </div>
  )
}

function WalletContent({
  account,
  tenantSlug,
  onBackToMenu,
}: {
  account: CustomerLoyaltyAccount
  tenantSlug: string
  onBackToMenu: () => void
}) {
  const { theme } = useTheme()
  const [tab, setTab] = useState<'rewards' | 'history'>('rewards')

  const nextTier = account.allTiers
    .sort((a, b) => a.pointsCost - b.pointsCost)
    .find((t) => t.pointsCost > account.balance)

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-brand-muted hover:text-brand-text"
            onClick={onBackToMenu}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to menu
          </button>
        </div>

        <div className="mb-6 rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-8 shadow-brand">
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
            {theme.appTitle || tenantSlug} Rewards
          </div>
          <div
            className="mt-2 text-6xl font-bold"
            style={{ color: 'rgb(var(--color-brand-primary))', fontFamily: 'var(--font-heading)' }}
          >
            {account.balance.toLocaleString()}
          </div>
          <div className="mt-1 text-sm text-brand-muted">points balance</div>

          {nextTier ? (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-brand-muted">
                <span>
                  {(nextTier.pointsCost - account.balance).toLocaleString()} pts to{' '}
                  <span className="font-medium text-brand-text">{nextTier.name}</span>
                </span>
                <span className="font-medium text-brand-text">
                  {formatPrice(nextTier.discountCents)} reward
                </span>
              </div>
              <ProgressBar value={account.balance} max={nextTier.pointsCost} />
            </div>
          ) : account.allTiers.length > 0 ? (
            <div className="mt-6 text-sm font-medium text-brand-text">
              You've unlocked all rewards tiers!
            </div>
          ) : null}
        </div>

        <div className="flex gap-1 rounded-[var(--radius)] border border-brand-border/50 bg-brand-surface p-1 mb-6">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius)-2px)] py-2.5 text-sm font-medium transition-colors"
            style={
              tab === 'rewards'
                ? {
                    background: 'rgb(var(--color-brand-primary))',
                    color: 'rgb(var(--color-brand-primary-foreground))',
                  }
                : { color: 'var(--color-brand-muted)' }
            }
            onClick={() => setTab('rewards')}
          >
            <Gift className="h-4 w-4" />
            Rewards
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius)-2px)] py-2.5 text-sm font-medium transition-colors"
            style={
              tab === 'history'
                ? {
                    background: 'rgb(var(--color-brand-primary))',
                    color: 'rgb(var(--color-brand-primary-foreground))',
                  }
                : { color: 'var(--color-brand-muted)' }
            }
            onClick={() => setTab('history')}
          >
            <History className="h-4 w-4" />
            History
          </button>
        </div>

        {tab === 'rewards' ? (
          <div className="space-y-3">
            {account.allTiers.length === 0 ? (
              <div className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-8 text-center text-sm text-brand-muted shadow-brand">
                No rewards tiers configured yet.
              </div>
            ) : (
              account.allTiers
                .sort((a, b) => a.pointsCost - b.pointsCost)
                .map((tier) => {
                  const unlocked = account.balance >= tier.pointsCost
                  const progress = Math.min(
                    100,
                    Math.round((account.balance / tier.pointsCost) * 100)
                  )
                  return (
                    <div
                      key={tier.id}
                      className="rounded-[var(--radius-brand)] border p-4 transition-all"
                      style={{
                        background: unlocked
                          ? 'rgb(var(--color-brand-primary) / 0.08)'
                          : 'rgb(var(--color-brand-surface))',
                        borderColor: unlocked
                          ? 'rgb(var(--color-brand-primary) / 0.3)'
                          : 'rgb(var(--color-brand-border))',
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-brand-text">{tier.name}</p>
                          <p className="text-xs text-brand-muted">
                            {tier.pointsCost.toLocaleString()} pts · saves{' '}
                            {formatPrice(tier.discountCents)}
                          </p>
                        </div>
                        {unlocked ? (
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-bold"
                            style={{
                              background: 'rgb(var(--color-brand-primary))',
                              color: 'rgb(var(--color-brand-primary-foreground))',
                            }}
                          >
                            Unlocked ✓
                          </span>
                        ) : (
                          <span className="text-xs text-brand-muted">
                            {(tier.pointsCost - account.balance).toLocaleString()} pts away
                          </span>
                        )}
                      </div>

                      {!unlocked ? (
                        <div>
                          <div
                            className="h-1.5 w-full overflow-hidden rounded-full"
                            style={{ background: 'rgb(var(--color-brand-border))' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                background: 'rgb(var(--color-brand-primary))',
                              }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-brand-muted">
                            {account.balance.toLocaleString()} / {tier.pointsCost.toLocaleString()}{' '}
                            pts
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="mt-3 w-full rounded-[var(--radius-brand)] py-2 text-sm font-semibold transition-all"
                          style={{
                            background: 'rgb(var(--color-brand-primary))',
                            color: 'rgb(var(--color-brand-primary-foreground))',
                          }}
                          onClick={onBackToMenu}
                        >
                          Apply to next order
                        </button>
                      )}
                    </div>
                  )
                })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {account.history.length === 0 ? (
              <div className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-8 text-center text-sm text-brand-muted shadow-brand">
                No points activity yet.
              </div>
            ) : (
              account.history.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 rounded-[20px] border border-brand-border/70 bg-brand-surface px-5 py-4 shadow-brand"
                >
                  <div>
                    <div className="font-medium text-brand-text">
                      {event.description ?? event.type.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-1 text-xs text-brand-muted">
                      {formatDate(event.createdAt)}
                    </div>
                  </div>
                  <div
                    className="text-base font-semibold"
                    style={{
                      color: event.delta >= 0 ? 'rgb(var(--color-brand-primary))' : 'inherit',
                    }}
                  >
                    {event.delta >= 0 ? '+' : ''}
                    {event.delta.toLocaleString()} pts
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export function RewardsWalletPage({
  tenantSlug,
  customerSession,
  onBackToMenu,
}: {
  tenantSlug: string
  customerSession: CustomerSessionController
  onBackToMenu: () => void
}) {
  const accountQuery = useQuery({
    queryKey: ['customer-loyalty-wallet', tenantSlug, customerSession.customerId],
    queryFn: () =>
      fetchCustomerLoyaltyAccount({
        tenantSlug,
        accessToken: customerSession.accessToken as string,
      }),
    enabled: Boolean(customerSession.accessToken),
    staleTime: 30_000,
  })

  if (!customerSession.isAuthenticated && !customerSession.isRestoring) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <div className="mb-6">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-brand-muted hover:text-brand-text"
              onClick={onBackToMenu}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to menu
            </button>
          </div>
          <div className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-12 text-center shadow-brand">
            <div
              className="text-lg font-semibold text-brand-text"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Sign in to view your rewards
            </div>
            <p className="mt-2 text-sm text-brand-muted">
              Place an order to earn points and join the rewards program.
            </p>
            <div className="mt-6">
              <Button type="button" onClick={onBackToMenu}>
                Browse menu
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (customerSession.isRestoring || accountQuery.isLoading) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <div className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-8 shadow-brand">
            <div className="text-sm text-brand-muted">Loading your rewards…</div>
          </div>
        </div>
      </main>
    )
  }

  if (accountQuery.error || !accountQuery.data) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <div className="mb-6">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-brand-muted hover:text-brand-text"
              onClick={onBackToMenu}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to menu
            </button>
          </div>
          <div className="rounded-[32px] border border-red-200 bg-red-50 px-6 py-8 shadow-brand">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-red-700">
              Unable to load rewards
            </div>
            <div className="mt-2 text-sm text-red-800">
              {accountQuery.error instanceof Error
                ? accountQuery.error.message
                : 'Could not load your rewards account.'}
            </div>
            <div className="mt-4">
              <Button type="button" onClick={() => void accountQuery.refetch()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <WalletContent
      account={accountQuery.data}
      tenantSlug={tenantSlug}
      onBackToMenu={onBackToMenu}
    />
  )
}
