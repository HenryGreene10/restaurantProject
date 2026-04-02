import { useCallback, useEffect, useState } from "react"

import {
  refreshCustomerSession,
  requestCustomerOtp,
  verifyCustomerOtp,
} from "../lib/customerAuth"

type CustomerSessionData = {
  accessToken: string | null
  customerId: string | null
  customerPhone: string | null
}

type SessionResult = {
  accessToken: string
  customerId: string
  customerPhone: string
}

const emptySession: CustomerSessionData = {
  accessToken: null,
  customerId: null,
  customerPhone: null,
}

export function useCustomerSession(tenantSlug: string) {
  const [session, setSession] = useState<CustomerSessionData>(emptySession)
  const [isRestoring, setIsRestoring] = useState(true)

  const applySession = useCallback((next: SessionResult) => {
    setSession({
      accessToken: next.accessToken,
      customerId: next.customerId,
      customerPhone: next.customerPhone,
    })
  }, [])

  const clearSession = useCallback(() => {
    setSession(emptySession)
  }, [])

  const restoreSession = useCallback(async () => {
    setIsRestoring(true)

    try {
      const result = await refreshCustomerSession(tenantSlug)
      applySession({
        accessToken: result.accessToken,
        customerId: result.payload.customerId,
        customerPhone: result.payload.phone,
      })
      return {
        accessToken: result.accessToken,
        customerId: result.payload.customerId,
        customerPhone: result.payload.phone,
      }
    } catch {
      clearSession()
      return null
    } finally {
      setIsRestoring(false)
    }
  }, [applySession, clearSession, tenantSlug])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  const sendCode = useCallback(
    async (phone: string) => {
      await requestCustomerOtp(tenantSlug, phone)
    },
    [tenantSlug],
  )

  const verifyCode = useCallback(
    async (phone: string, code: string) => {
      const result = await verifyCustomerOtp(tenantSlug, phone, code)
      const next = {
        accessToken: result.accessToken,
        customerId: result.payload.customerId,
        customerPhone: result.payload.phone,
      }
      applySession(next)
      return next
    },
    [applySession, tenantSlug],
  )

  const isVerifiedPhone = useCallback(
    (phone: string) =>
      phone.trim().length > 0 &&
      Boolean(session.accessToken) &&
      session.customerPhone === phone.trim(),
    [session.accessToken, session.customerPhone],
  )

  return {
    accessToken: session.accessToken,
    customerId: session.customerId,
    customerPhone: session.customerPhone,
    isAuthenticated: Boolean(session.accessToken),
    isRestoring,
    clearSession,
    restoreSession,
    sendCode,
    verifyCode,
    isVerifiedPhone,
  }
}

export type CustomerSessionController = ReturnType<typeof useCustomerSession>
