#!/usr/bin/env tsx
/**
 * Backfill AdminUser.clerkUserId for records that may still rely on the legacy
 * email bridge (claimLegacyAdminAccessByEmail in packages/data-access).
 *
 * HOW THE BRIDGE WORKS
 * When a Clerk user logs in and their clerkUserId does not match any AdminUser
 * row, the API falls back to matching by email and updates the row's clerkUserId
 * in place. This lets admin accounts survive Clerk user recreations, but it means
 * any Clerk account whose primary email matches an existing admin can silently
 * claim that restaurant.
 *
 * WHAT THIS SCRIPT DOES
 * For every AdminUser row it:
 *   1. Verifies the stored clerkUserId still exists in Clerk.
 *   2. If the stored ID is stale (user deleted/recreated), looks up Clerk by email.
 *   3. If exactly one Clerk user is found, updates the DB row to use that ID.
 *
 * Run this script against production, review the output, then remove the bridge.
 *
 * USAGE
 *   # Dry run (default — no DB writes):
 *   DATABASE_URL=... CLERK_SECRET_KEY=... tsx scripts/backfill-clerk-ids.ts
 *
 *   # Live run:
 *   DATABASE_URL=... CLERK_SECRET_KEY=... DRY_RUN=false tsx scripts/backfill-clerk-ids.ts
 */

import { createClerkClient } from '@clerk/backend'
import { PrismaClient } from '../packages/db/generated/client/index.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRY_RUN = process.env.DRY_RUN !== 'false'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AdminUserRow = {
  id: string
  clerkUserId: string
  email: string
  restaurantId: string
  role: string
}

function log(tag: string, msg: string) {
  console.log(`[${tag.padEnd(9)}] ${msg}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  if (!clerkSecretKey) {
    throw new Error('CLERK_SECRET_KEY environment variable is required')
  }

  const clerk = createClerkClient({ secretKey: clerkSecretKey })
  const prisma = new PrismaClient()

  console.log('='.repeat(60))
  console.log(
    `Mode: ${DRY_RUN ? 'DRY RUN — no changes will be written to the DB' : 'LIVE — DB writes are ENABLED'}`
  )
  console.log('='.repeat(60))
  console.log()

  const counters = {
    total: 0,
    verified: 0,
    stale: 0,
    updated: 0,
    notFound: 0,
    ambiguous: 0,
    errors: 0,
  }

  try {
    const adminUsers = await prisma.$queryRaw<AdminUserRow[]>`
      SELECT "id", "clerkUserId", "email", "restaurantId", "role"
      FROM "AdminUser"
      ORDER BY "createdAt" ASC
    `

    counters.total = adminUsers.length
    console.log(`Found ${adminUsers.length} AdminUser row(s).\n`)

    for (const row of adminUsers) {
      try {
        // Step 1: verify the stored clerkUserId still resolves to an active Clerk user.
        let storedUserExists = false
        try {
          await clerk.users.getUser(row.clerkUserId)
          storedUserExists = true
        } catch {
          // Clerk throws 404 when the user doesn't exist.
        }

        if (storedUserExists) {
          counters.verified++
          log('OK', `${row.email} — clerkUserId ${row.clerkUserId} verified`)
          continue
        }

        // Step 2: stored clerkUserId is stale; look up by email.
        counters.stale++
        log('STALE', `${row.email} — clerkUserId ${row.clerkUserId} not found in Clerk`)

        const { data: matches, totalCount } = await clerk.users.getUserList({
          emailAddress: [row.email.toLowerCase()],
          limit: 2,
        })

        if (totalCount === 0) {
          counters.notFound++
          log('MISSING', `${row.email} — no Clerk user found; manual resolution required`)
          continue
        }

        if (totalCount > 1) {
          counters.ambiguous++
          log('AMBIGUOUS', `${row.email} — ${totalCount} Clerk users share this email; skipping`)
          continue
        }

        const canonicalUser = matches[0]

        if (canonicalUser.id === row.clerkUserId) {
          // Edge case: user exists but lookup by ID failed transiently.
          counters.verified++
          log('OK', `${row.email} — clerkUserId already correct (transient Clerk error ignored)`)
          continue
        }

        log(
          DRY_RUN ? 'WOULD-UPD' : 'UPDATING',
          `${row.email} — ${row.clerkUserId} → ${canonicalUser.id}`
        )

        if (!DRY_RUN) {
          await prisma.$executeRaw`
            UPDATE "AdminUser"
            SET "clerkUserId" = ${canonicalUser.id}
            WHERE "id" = ${row.id}
          `
        }

        counters.updated++
      } catch (err) {
        counters.errors++
        log('ERROR', `${row.email} — ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } finally {
    await prisma.$disconnect()
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log()
  console.log('─'.repeat(60))
  console.log(' Summary')
  console.log('─'.repeat(60))
  console.log(`  Total AdminUser rows:          ${counters.total}`)
  console.log(`  Verified (no change needed):   ${counters.verified}`)
  console.log(`  Stale clerkUserId detected:    ${counters.stale}`)
  console.log(
    `  Updated:                       ${counters.updated}${DRY_RUN && counters.updated > 0 ? ' (dry run — not applied)' : ''}`
  )
  console.log(`  No Clerk user found:           ${counters.notFound}`)
  console.log(`  Ambiguous (multiple matches):  ${counters.ambiguous}`)
  console.log(`  Errors:                        ${counters.errors}`)
  console.log('─'.repeat(60))

  if (DRY_RUN && counters.stale > 0) {
    console.log()
    console.log('Re-run with DRY_RUN=false to apply updates.')
  }

  if (counters.notFound > 0) {
    console.log()
    console.log(`WARNING: ${counters.notFound} row(s) have no matching Clerk user.`)
    console.log('Resolve these manually before removing claimLegacyAdminAccessByEmail.')
  }

  if (counters.ambiguous > 0) {
    console.log()
    console.log(`WARNING: ${counters.ambiguous} row(s) matched multiple Clerk users by email.`)
    console.log('Resolve these manually before removing claimLegacyAdminAccessByEmail.')
  }

  const unresolved = counters.notFound + counters.ambiguous + counters.errors
  if (unresolved === 0 && !DRY_RUN) {
    console.log()
    console.log(
      'All rows resolved. The email bridge (claimLegacyAdminAccessByEmail) can now be removed.'
    )
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
