import React, { useEffect, useMemo, useState } from 'react'
import type { ClerkTokenGetter } from '@/lib/api'
import {
  checkSlugAvailability,
  fetchOnboardingMe,
  registerRestaurantOnboarding,
  type SlugAvailability,
} from '@/lib/onboarding'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

function suggestedSlug(name: string) {
  return normalizeSlug(name)
}

function validateSlug(slug: string) {
  if (!slug) {
    return 'Choose a slug for your restaurant URL'
  }

  if (slug.length < 3 || slug.length > 63) {
    return 'Slug must be between 3 and 63 characters'
  }

  if (!slugPattern.test(slug)) {
    return 'Use lowercase letters, numbers, and single hyphens only'
  }

  return null
}

export const OnboardingPage: React.FC<{
  clerkUserId: string
  email: string
  getToken: ClerkTokenGetter
  onCompleted: () => Promise<void> | void
}> = ({ clerkUserId, email, getToken, onCompleted }) => {
  const [isResolvingExistingAccess, setIsResolvingExistingAccess] = useState(true)
  const [restaurantName, setRestaurantName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugState, setSlugState] = useState<SlugAvailability | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const normalizedSlug = useMemo(() => normalizeSlug(slug), [slug])

  useEffect(() => {
    let cancelled = false

    async function loadOnboardingState() {
      setIsResolvingExistingAccess(true)
      setFormError(null)
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Missing Clerk token')
        }

        const onboardingState = await fetchOnboardingMe(token)
        if (cancelled) {
          return
        }

        if (onboardingState.matched && onboardingState.tenantSlug) {
          setSuccessMessage('Found your restaurant setup. Redirecting to the dashboard…')
          await onCompleted()
          return
        }
      } catch (error) {
        if (!cancelled) {
          setFormError(error instanceof Error ? error.message : 'Failed to load onboarding state')
        }
      } finally {
        if (!cancelled) {
          setIsResolvingExistingAccess(false)
        }
      }
    }

    loadOnboardingState()
    return () => {
      cancelled = true
    }
  }, [getToken, onCompleted])

  useEffect(() => {
    if (isResolvingExistingAccess) {
      return
    }

    setSlugState(null)
    setSlugError(null)

    if (!normalizedSlug) {
      return
    }

    const localError = validateSlug(normalizedSlug)
    if (localError) {
      setSlugError(localError)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setIsCheckingSlug(true)
      try {
        const nextState = await checkSlugAvailability(normalizedSlug)
        setSlugState(nextState)
      } catch (error) {
        setSlugError(error instanceof Error ? error.message : 'Failed to validate slug')
      } finally {
        setIsCheckingSlug(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [isResolvingExistingAccess, normalizedSlug])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const trimmedName = restaurantName.trim()
    if (!trimmedName) {
      setFormError('Restaurant name is required')
      return
    }

    const nextSlug = normalizeSlug(normalizedSlug || suggestedSlug(trimmedName))
    const validationError = validateSlug(nextSlug)
    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Missing Clerk token')
      }

      const availability = await checkSlugAvailability(nextSlug)
      if (!availability.available) {
        throw new Error(availability.error ?? 'Slug is unavailable')
      }

      await registerRestaurantOnboarding({
        clerkUserId,
        email,
        restaurantName: trimmedName,
        slug: nextSlug,
        token,
      })

      setSuccessMessage('Restaurant setup created. Redirecting to your dashboard…')
      await onCompleted()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create restaurant')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[960px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-3">
        <Badge
          variant="outline"
          className="w-fit border-border bg-background text-muted-foreground"
        >
          Restaurant setup
        </Badge>
        <div className="grid gap-2">
          <h1 className="font-heading text-4xl text-foreground sm:text-5xl">
            Set up your restaurant
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">
            We&apos;ll use this to create your ordering page and admin access. Start with your
            restaurant name and the web address you want to use.
          </p>
        </div>
      </header>

      <Card className="border border-border/80 bg-card shadow-sm">
        <CardHeader className="gap-1">
          <CardTitle>Business details</CardTitle>
          <CardDescription>
            This account will become the owner login for your restaurant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isResolvingExistingAccess ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                Checking whether this Clerk account already belongs to an existing restaurant…
              </p>
            </div>
          ) : (
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="restaurant-name">Restaurant name</Label>
                <Input
                  id="restaurant-name"
                  value={restaurantName}
                  onChange={(event) => {
                    const nextName = event.target.value
                    setRestaurantName(nextName)
                    if (!slug) {
                      setSlug(suggestedSlug(nextName))
                    }
                  }}
                  placeholder="Joe's Pizza"
                  autoComplete="organization"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tenant-slug">Ordering page URL</Label>
                <Input
                  id="tenant-slug"
                  value={slug}
                  onChange={(event) => setSlug(normalizeSlug(event.target.value))}
                  placeholder="joes-pizza"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="text-sm text-muted-foreground">
                  This becomes your online ordering link, for example{' '}
                  <code>joes-pizza.easymenu.website</code>.
                </p>
                {isCheckingSlug ? (
                  <p className="text-sm text-muted-foreground">Checking availability…</p>
                ) : slugError ? (
                  <p className="text-sm text-destructive">{slugError}</p>
                ) : slugState ? (
                  <p
                    className={
                      slugState.available ? 'text-sm text-emerald-600' : 'text-sm text-destructive'
                    }
                  >
                    {slugState.available
                      ? 'Slug is available'
                      : (slugState.error ?? 'Slug is unavailable')}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="owner-email">Owner email</Label>
                <Input id="owner-email" value={email} readOnly disabled />
              </div>

              {formError ? (
                <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
              {successMessage ? (
                <div className="rounded-[var(--radius)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || isCheckingSlug}>
                  {isSubmitting ? 'Creating workspace…' : 'Create restaurant'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
