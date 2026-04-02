import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CustomerOtpStepProps = {
  code: string
  errorMessage: string | null
  phone: string
  sending: boolean
  verifying: boolean
  onCodeChange: (value: string) => void
  onEditPhone: () => void
  onResend: () => void
}

export function CustomerOtpStep({
  code,
  errorMessage,
  phone,
  sending,
  verifying,
  onCodeChange,
  onEditPhone,
  onResend,
}: CustomerOtpStepProps) {
  return (
    <Card size="sm" className="gap-4 border border-border/80 bg-card shadow-sm">
      <CardHeader className="gap-3">
        <Badge variant="outline" className="border-border bg-background text-muted-foreground">
          Verify phone
        </Badge>
        <div className="space-y-1">
          <CardTitle style={{ fontFamily: "var(--font-heading)" }}>Enter your code</CardTitle>
          <p className="text-sm text-muted-foreground">
            Code sent to <span className="font-medium text-foreground">{phone}</span>.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="checkout-otp-code">Verification code</Label>
          <Input
            id="checkout-otp-code"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            inputMode="numeric"
            placeholder="123456"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={sending || verifying}
            onClick={onResend}
          >
            {sending ? "Resending…" : "Resend code"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={sending || verifying}
            onClick={onEditPhone}
          >
            Edit phone number
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
