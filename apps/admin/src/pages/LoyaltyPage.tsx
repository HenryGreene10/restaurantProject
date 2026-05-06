import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { CreditCard, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { adminFetchJson } from '../lib/api'

type LoyaltyConfig = {
  active: boolean
  earnRate: number
  redeemRate: number
  minRedeem: number
  expiryMonths: number
  welcomeBonus: number
  newMemberDiscountEnabled: boolean
  newMemberDiscountType: 'PERCENTAGE' | 'FIXED'
  newMemberDiscountValue: number
  tiers: Array<{
    id: string
    name: string
    pointsCost: number
    discountCents: number
    sortOrder: number
  }>
}

type LoyaltyAnalytics = {
  enrolledCount: number
  issued: number
  redeemed: number
  topAccounts: Array<{
    id: string
    points: number
    lifetimePts: number
    customer: { name: string | null; phone: string }
  }>
  recentRedemptions: Array<{
    id: string
    delta: number
    description: string | null
    createdAt: string
    stripeCouponId: string | null
    account: { customer: { name: string | null; phone: string } }
  }>
}

function LoyaltyNumInput({
  value,
  onChange,
  suffix,
  min = 0,
  max = 9999,
}: {
  value: number
  onChange: (v: number) => void
  suffix?: string
  min?: number
  max?: number
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border bg-background">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-20 flex-1 border-none bg-transparent px-3 py-2 text-sm text-foreground outline-none"
      />
      {suffix && (
        <span className="whitespace-nowrap border-l border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}

function LoyaltyFieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[1fr_220px] items-start gap-8 border-b border-border py-5 last:border-none">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

export function LoyaltyPage({ tenantSlug }: { tenantSlug: string }) {
  const [tab, setTab] = useState<'rules' | 'analytics'>('rules')
  const [config, setConfig] = useState<LoyaltyConfig | null>(null)
  const [analytics, setAnalytics] = useState<LoyaltyAnalytics | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const { getToken } = useAuth()

  const [newTierName, setNewTierName] = useState('')
  const [newTierPts, setNewTierPts] = useState(0)
  const [newTierCents, setNewTierCents] = useState(0)
  const [addingTier, setAddingTier] = useState(false)

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true)
    setConfigError(null)
    try {
      const nextConfig = await adminFetchJson<LoyaltyConfig>('/admin/loyalty', {
        tenantSlug,
        getToken,
      })
      setConfig(nextConfig)
    } catch (error) {
      setConfig(null)
      setConfigError(error instanceof Error ? error.message : 'Failed to load loyalty settings')
    } finally {
      setLoadingConfig(false)
    }
  }, [getToken, tenantSlug])

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true)
    setAnalyticsError(null)
    try {
      const nextAnalytics = await adminFetchJson<LoyaltyAnalytics>('/admin/loyalty/analytics', {
        tenantSlug,
        getToken,
      })
      setAnalytics(nextAnalytics)
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Failed to load loyalty analytics')
    } finally {
      setLoadingAnalytics(false)
    }
  }, [getToken, tenantSlug])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  useEffect(() => {
    if (tab !== 'analytics') return
    if (analytics) return
    void loadAnalytics()
  }, [tab, analytics, loadAnalytics])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setConfigError(null)
    try {
      const nextConfig = await adminFetchJson<LoyaltyConfig>('/admin/loyalty', {
        method: 'PATCH',
        tenantSlug,
        getToken,
        body: {
          active: config.active,
          earnRate: config.earnRate,
          redeemRate: config.redeemRate,
          minRedeem: config.minRedeem,
          expiryMonths: config.expiryMonths,
          welcomeBonus: config.welcomeBonus,
          newMemberDiscountEnabled: config.newMemberDiscountEnabled,
          newMemberDiscountType: config.newMemberDiscountType,
          newMemberDiscountValue: config.newMemberDiscountValue,
        },
      })
      setConfig(nextConfig)
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to update loyalty settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleProgramActive = async () => {
    if (!config || togglingActive) return
    const nextActive = !config.active
    setTogglingActive(true)
    setConfigError(null)
    setConfig((current) => (current ? { ...current, active: nextActive } : current))
    try {
      const nextConfig = await adminFetchJson<LoyaltyConfig>('/admin/loyalty', {
        method: 'PATCH',
        tenantSlug,
        getToken,
        body: { active: nextActive },
      })
      setConfig((current) => {
        const merged = nextConfig ?? current
        return merged ? { ...merged, active: nextActive } : merged
      })
    } catch (error) {
      setConfig((current) => (current ? { ...current, active: !nextActive } : current))
      setConfigError(error instanceof Error ? error.message : 'Failed to update loyalty status')
    } finally {
      setTogglingActive(false)
    }
  }

  const handleAddTier = async () => {
    if (!newTierName.trim() || newTierPts < 1 || newTierCents < 1) return
    setAddingTier(true)
    setConfigError(null)
    try {
      await adminFetchJson<{ id: string }>('/admin/loyalty/tiers', {
        method: 'POST',
        tenantSlug,
        getToken,
        body: { name: newTierName.trim(), pointsCost: newTierPts, discountCents: newTierCents },
      })
      await loadConfig()
      setNewTierName('')
      setNewTierPts(0)
      setNewTierCents(0)
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to create reward tier')
    } finally {
      setAddingTier(false)
    }
  }

  const handleDeleteTier = async (tierId: string) => {
    setConfigError(null)
    try {
      await adminFetchJson<void>(`/admin/loyalty/tiers/${tierId}`, {
        method: 'DELETE',
        tenantSlug,
        getToken,
      })
      await loadConfig()
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to delete reward tier')
    }
  }

  if (loadingConfig) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading loyalty settings…</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="grid gap-4">
        <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground">
          {configError ?? 'Failed to load loyalty settings'}
        </div>
        <div>
          <Button type="button" variant="outline" onClick={() => void loadConfig()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const previewEarned = 50 * config.earnRate
  const previewValue = (previewEarned / config.redeemRate).toFixed(2)
  const minDollarOff = (config.minRedeem / config.redeemRate).toFixed(2)

  return (
    <div className="grid gap-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Loyalty Program</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure how customers earn and redeem points
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleToggleProgramActive()}
              aria-pressed={config.active}
              disabled={togglingActive}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                config.active ? 'bg-primary' : 'bg-input',
                togglingActive && 'opacity-60'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all',
                  config.active ? 'right-1' : 'left-1'
                )}
              />
            </button>
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                config.active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {config.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn('min-w-[120px]', saved && 'bg-green-600 hover:bg-green-600')}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['rules', 'analytics'] as const).map((t) => (
          <Button
            key={t}
            type="button"
            variant={tab === t ? 'default' : 'outline'}
            className="rounded-full capitalize"
            onClick={() => setTab(t)}
          >
            {t === 'rules' ? 'Program Rules' : 'Analytics'}
          </Button>
        ))}
      </div>

      {configError ? (
        <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground">
          {configError}
        </div>
      ) : null}

      {tab === 'rules' && (
        <div className="grid gap-5">
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/60">
                  Earn on $50 order
                </p>
                <p className="mt-1 font-heading text-3xl font-bold">
                  {previewEarned.toLocaleString()} pts
                </p>
                <p className="mt-1 text-xs text-primary-foreground/60">
                  ≈ ${previewValue} in savings
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/60">
                  Redemption rate
                </p>
                <p className="mt-1 font-heading text-3xl font-bold">{config.redeemRate} pts</p>
                <p className="mt-1 text-xs text-primary-foreground/60">= $1.00 off</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/60">
                  Min to redeem
                </p>
                <p className="mt-1 font-heading text-3xl font-bold">{config.minRedeem} pts</p>
                <p className="mt-1 text-xs text-primary-foreground/60">= ${minDollarOff} off</p>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="px-6 py-1">
              <LoyaltyFieldRow
                label="Points per dollar spent"
                hint="How many points a customer earns for every $1 on a completed order."
              >
                <div className="grid gap-1.5">
                  <LoyaltyNumInput
                    value={config.earnRate}
                    onChange={(v) => setConfig((c) => (c ? { ...c, earnRate: v } : c))}
                    suffix="pts / $1"
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Customer earns {config.earnRate}× their spend in points
                  </p>
                </div>
              </LoyaltyFieldRow>
              <LoyaltyFieldRow
                label="Points to redeem $1"
                hint="How many points equal $1 off. Lower = more generous for customers."
              >
                <div className="grid gap-1.5">
                  <LoyaltyNumInput
                    value={config.redeemRate}
                    onChange={(v) => setConfig((c) => (c ? { ...c, redeemRate: v } : c))}
                    suffix="pts = $1"
                    min={1}
                    max={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Effective cash back: {((config.earnRate / config.redeemRate) * 100).toFixed(1)}%
                  </p>
                </div>
              </LoyaltyFieldRow>
              <LoyaltyFieldRow
                label="Minimum points to redeem"
                hint="Customers must reach this threshold before any rewards are available."
              >
                <LoyaltyNumInput
                  value={config.minRedeem}
                  onChange={(v) => setConfig((c) => (c ? { ...c, minRedeem: v } : c))}
                  suffix="pts minimum"
                  min={0}
                  max={10000}
                />
              </LoyaltyFieldRow>
              <LoyaltyFieldRow
                label="Points expiry"
                hint="Unused points expire after this many months of inactivity. 0 = no expiry."
              >
                <LoyaltyNumInput
                  value={config.expiryMonths}
                  onChange={(v) => setConfig((c) => (c ? { ...c, expiryMonths: v } : c))}
                  suffix="months"
                  min={0}
                  max={36}
                />
              </LoyaltyFieldRow>
              <LoyaltyFieldRow
                label="Welcome bonus"
                hint="Points awarded automatically when a customer joins on their first order."
              >
                <div className="grid gap-1.5">
                  <LoyaltyNumInput
                    value={config.welcomeBonus}
                    onChange={(v) => setConfig((c) => (c ? { ...c, welcomeBonus: v } : c))}
                    suffix="pts on join"
                    min={0}
                    max={5000}
                  />
                  <p className="text-xs text-muted-foreground">
                    = ${(config.welcomeBonus / config.redeemRate).toFixed(2)} in welcome savings
                  </p>
                </div>
              </LoyaltyFieldRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Reward tiers</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    The discount options customers can choose from when redeeming points
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Tier name', 'Points cost', 'Discount', ''].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.tiers.map((tier) => (
                    <tr key={tier.id} className="border-b border-border last:border-none">
                      <td className="py-2.5 pr-3">
                        <span className="text-sm text-foreground">{tier.name}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-sm text-muted-foreground">
                          {tier.pointsCost.toLocaleString()} pts
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-sm text-foreground">
                          ${(tier.discountCents / 100).toFixed(2)} off
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTier(tier.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 grid grid-cols-[1fr_120px_120px_auto] items-end gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Name
                  </label>
                  <input
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    placeholder="e.g. $5 off"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Points cost
                  </label>
                  <input
                    type="number"
                    value={newTierPts || ''}
                    onChange={(e) => setNewTierPts(Number(e.target.value))}
                    placeholder="500"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Discount (¢)
                  </label>
                  <input
                    type="number"
                    value={newTierCents || ''}
                    onChange={(e) => setNewTierCents(Number(e.target.value))}
                    placeholder="500"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTier}
                  disabled={addingTier || !newTierName.trim() || newTierPts < 1 || newTierCents < 1}
                  className="self-end"
                >
                  {addingTier ? 'Adding…' : '+ Add'}
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Changes apply to new redemptions only — existing issued rewards are not affected.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-4 px-6 py-5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  New member first-order discount
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Applied automatically when a new phone number places their first order
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((c) =>
                    c ? { ...c, newMemberDiscountEnabled: !c.newMemberDiscountEnabled } : c
                  )
                }
                className={cn(
                  'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
                  config.newMemberDiscountEnabled ? 'bg-primary' : 'bg-border'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all',
                    config.newMemberDiscountEnabled ? 'right-1' : 'left-1'
                  )}
                />
              </button>
            </CardContent>
            {config.newMemberDiscountEnabled && (
              <CardContent className="border-t border-border px-6 py-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Discount type
                    </label>
                    <select
                      value={config.newMemberDiscountType}
                      onChange={(e) =>
                        setConfig((c) =>
                          c
                            ? {
                                ...c,
                                newMemberDiscountType: e.target.value as 'PERCENTAGE' | 'FIXED',
                              }
                            : c
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="PERCENTAGE">Percentage off</option>
                      <option value="FIXED">Fixed amount off</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount {config.newMemberDiscountType === 'PERCENTAGE' ? '(%)' : '($)'}
                    </label>
                    <LoyaltyNumInput
                      value={config.newMemberDiscountValue}
                      onChange={(v) =>
                        setConfig((c) => (c ? { ...c, newMemberDiscountValue: v } : c))
                      }
                      suffix={config.newMemberDiscountType === 'PERCENTAGE' ? '%' : '$'}
                      min={0}
                      max={config.newMemberDiscountType === 'PERCENTAGE' ? 100 : 500}
                    />
                  </div>
                </div>
                <p className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  Discount is applied to the payment total automatically at checkout. One use per
                  phone number.
                </p>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardContent className="flex items-start gap-4 px-6 py-5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#635bff]/10">
                <CreditCard className="h-4 w-4 text-[#635bff]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Stripe discount integration</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Discounts are applied by reducing the payment intent amount before charge. The
                  discount amount and type are stored on the order for your records.
                </p>
              </div>
              <Badge
                variant="outline"
                className="flex-shrink-0 border-green-500/30 bg-green-500/10 text-green-700"
              >
                Connected
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid gap-5">
          {analyticsError ? (
            <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground">
              {analyticsError}
            </div>
          ) : null}
          {loadingAnalytics && (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading analytics…</p>
            </div>
          )}
          {analytics && (
            <>
              <div className="grid grid-cols-4 gap-4">
                {[
                  {
                    label: 'Enrolled members',
                    value: analytics.enrolledCount.toLocaleString(),
                    note: 'all time',
                  },
                  {
                    label: 'Points issued',
                    value: analytics.issued.toLocaleString(),
                    note: 'last 30 days',
                  },
                  {
                    label: 'Points redeemed',
                    value: analytics.redeemed.toLocaleString(),
                    note: 'last 30 days',
                  },
                  {
                    label: 'Redemption rate',
                    value:
                      analytics.issued > 0
                        ? `${((analytics.redeemed / analytics.issued) * 100).toFixed(1)}%`
                        : '—',
                    note: 'redeemed / issued',
                  },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="px-5 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {s.label}
                      </p>
                      <p className="mt-2 font-heading text-3xl font-bold text-foreground">
                        {s.value}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top earners</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.topAccounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members yet.</p>
                    ) : (
                      <div className="grid gap-3">
                        {analytics.topAccounts.map((acc, i) => (
                          <div key={acc.id} className="flex items-center gap-3">
                            <span className="w-4 text-right text-xs font-bold text-muted-foreground">
                              {i + 1}
                            </span>
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                              {(acc.customer.name ?? acc.customer.phone).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {acc.customer.name ?? 'Unknown'}{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                  •••{acc.customer.phone.slice(-4)}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {acc.lifetimePts.toLocaleString()} lifetime pts
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm font-bold text-primary">
                                {acc.points.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">balance</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Program summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total members</span>
                        <span className="font-medium text-foreground">
                          {analytics.enrolledCount}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Points issued (30d)</span>
                        <span className="font-medium text-foreground">
                          {analytics.issued.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Points redeemed (30d)</span>
                        <span className="font-medium text-foreground">
                          {analytics.redeemed.toLocaleString()}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Earn rate</span>
                        <span className="font-medium text-foreground">
                          {config.earnRate} pts / $1
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Redemption rate</span>
                        <span className="font-medium text-foreground">
                          {config.redeemRate} pts = $1
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Welcome bonus</span>
                        <span className="font-medium text-foreground">
                          {config.welcomeBonus} pts
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Redemption log</CardTitle>
                    <Badge
                      variant="outline"
                      className="border-[#635bff]/30 bg-[#635bff]/10 text-[10px] text-[#635bff]"
                    >
                      Stripe discounts applied at checkout
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {analytics.recentRedemptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No redemptions yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Customer', 'Description', 'Points used', 'Date'].map((h) => (
                            <th
                              key={h}
                              className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recentRedemptions.map((r) => (
                          <tr key={r.id} className="border-b border-border last:border-none">
                            <td className="py-2.5 pr-4 font-medium text-foreground">
                              {r.account.customer.name ?? '—'}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                •••{r.account.customer.phone.slice(-4)}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground">
                              {r.description ?? 'Redemption'}
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground">
                              {Math.abs(r.delta).toLocaleString()}
                            </td>
                            <td className="py-2.5 text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}
