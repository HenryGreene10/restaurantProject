import { createClerkClient } from '@clerk/backend'
import { env } from '../config/env.js'

export function getClerkClient() {
  return createClerkClient({
    secretKey: env().CLERK_SECRET_KEY,
  })
}

export async function getClerkPrimaryEmail(clerkUserId: string) {
  const user = await getClerkClient().users.getUser(clerkUserId)
  if (!user.primaryEmailAddressId) {
    return null
  }

  return (
    user.emailAddresses.find(
      (emailAddress) => emailAddress.id === user.primaryEmailAddressId,
    )?.emailAddress ?? null
  )
}

export async function mergeClerkPublicMetadata(
  clerkUserId: string,
  nextMetadata: Record<string, unknown>,
) {
  const client = getClerkClient()
  const user = await client.users.getUser(clerkUserId)
  return client.users.updateUser(clerkUserId, {
    publicMetadata: {
      ...(user.publicMetadata ?? {}),
      ...nextMetadata,
    },
  })
}
