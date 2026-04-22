import { CheckCircle2, MessageCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

const RESEND_SECONDS = 42

const AFTER_VERIFY_BULLETS = [
  "10% new-member discount applied instantly",
  "Auto-enrolled in rewards",
  "200 welcome bonus points after verification",
]

type CustomerOtpStepProps = {
  phone: string
  sending: boolean
  verifying: boolean
  errorMessage: string | null
  brandColors?: {
    primary: string
    accent: string
    primaryForeground: string
  }
  onCodeChange: (code: string) => void
  onEditPhone: () => void
  onResend: () => void
  onVerify: () => void
}

export function CustomerOtpStep({
  phone,
  sending,
  verifying,
  errorMessage,
  brandColors,
  onCodeChange,
  onEditPhone,
  onResend,
  onVerify,
}: CustomerOtpStepProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""])
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null, null, null])

  useEffect(() => {
    setDigits(["", "", "", "", "", ""])
    setCountdown(RESEND_SECONDS)
    inputRefs.current[0]?.focus()
  }, [phone])

  useEffect(() => {
    if (countdown <= 0) return
    const id = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [countdown])

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    onCodeChange(next.join(""))
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleDigitKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (event.key === "Enter") {
      onVerify()
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault()
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "")
    setDigits(next)
    onCodeChange(next.join(""))
    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()
  }

  function handleResend() {
    setCountdown(RESEND_SECONDS)
    onResend()
  }

  const code = digits.join("")
  const canVerify = code.length === 6 && !verifying && !sending

  return (
    <div className="space-y-8 px-1 py-2">
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: brandColors
              ? `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.accent})`
              : "var(--primary)",
          }}
        >
          <MessageCircle
            className="h-7 w-7"
            style={{ color: brandColors?.primaryForeground ?? "var(--primary-foreground)" }}
          />
        </div>
        <h2 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Check your texts
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{phone}</span>
        </p>
      </div>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleDigitKeyDown(i, e)}
            className="h-14 w-11 rounded-[var(--radius)] border border-input bg-background text-center text-xl font-semibold text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            style={digit ? { borderColor: brandColors?.primary } : undefined}
          />
        ))}
      </div>

      {errorMessage ? (
        <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-[var(--radius)] border border-border/60 bg-muted/30 px-4 py-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          After you verify:
        </div>
        <ul className="space-y-2">
          {AFTER_VERIFY_BULLETS.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: brandColors?.primary ?? "var(--primary)" }}
              />
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          className="min-h-12 w-full justify-center text-base"
          disabled={!canVerify}
          style={
            brandColors && canVerify
              ? {
                  background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.accent})`,
                  color: brandColors.primaryForeground,
                  border: "none",
                }
              : undefined
          }
          onClick={onVerify}
        >
          {verifying ? "Verifying…" : "Verify & place order"}
        </Button>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {countdown > 0 ? (
            <span>
              Resend code in 0:{String(countdown).padStart(2, "0")}
            </span>
          ) : (
            <button
              type="button"
              className="font-medium underline"
              disabled={sending}
              onClick={handleResend}
            >
              {sending ? "Sending…" : "Resend code"}
            </button>
          )}

          <button
            type="button"
            className="underline"
            onClick={onEditPhone}
          >
            Wrong number? Go back
          </button>
        </div>
      </div>
    </div>
  )
}
