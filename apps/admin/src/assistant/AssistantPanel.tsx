import React, { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type AssistantRefreshTarget = "menu"

type AssistantCommandResponse = {
  reply: string
  refresh: AssistantRefreshTarget[]
  needsClarification?: boolean
  options?: Array<{
    id: string
    label: string
  }>
}

export const AssistantPanel: React.FC<{
  tenantSlug: string
  onRefreshTargets?: (targets: AssistantRefreshTarget[]) => void
}> = ({ tenantSlug, onRefreshTargets }) => {
  const [input, setInput] = useState("")
  const [log, setLog] = useState<string[]>([])

  async function send() {
    const msg = input.trim()
    if (!msg) return
    setLog((l) => [...l, `You: ${msg}`])
    setInput("")
    try {
      const res = await fetch("/api/v1/assistant/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenantSlug,
        },
        body: JSON.stringify({ message: msg }),
      })
      const data = (await res.json()) as AssistantCommandResponse & { error?: string }

      if (!res.ok) {
        throw new Error(data.error || `Command failed (${res.status})`)
      }

      setLog((l) => {
        const next = [...l, `Assistant: ${data.reply || 'ok'}`]
        if (data.needsClarification && data.options?.length) {
          next.push(`Options: ${data.options.map((option) => option.label).join(' | ')}`)
        }
        return next
      })

      if (data.refresh.length) {
        onRefreshTargets?.(data.refresh)
      }
    } catch (error) {
      setLog((l) => [
        ...l,
        `Assistant: ${error instanceof Error ? error.message : "Request failed."}`,
      ])
    }
  }

  return (
    <Card className="gap-0 border border-border/80 bg-card py-0 shadow-sm">
      <CardHeader className="gap-3 border-b border-border/70 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <Badge variant="outline" className="border-border bg-background text-muted-foreground">
              AI Assistant
            </Badge>
            <CardTitle>Natural-language storefront control</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">{tenantSlug}</div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 px-5 py-5">
        <div className="rounded-[var(--radius)] border border-border/70 bg-background p-4 text-sm text-muted-foreground">
          Ask for menu visibility or featured changes in plain English.
        </div>

        <div className="max-h-72 overflow-y-auto rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
          {log.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Try “mark Margherita as sold out” or “hide the apps category”.
            </div>
          ) : (
            <div className="space-y-3">
              {log.map((entry, index) => {
                const isUser = entry.startsWith("You:")
                return (
                  <div key={`${entry}-${index}`} className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {isUser ? "You" : "Assistant"}
                    </div>
                    <div className="rounded-[var(--radius)] border border-border/70 bg-card px-4 py-3 text-sm text-foreground">
                      {entry.replace(/^You:\s|^Assistant:\s/, "")}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask to update menu visibility or featured state"
            className="flex-1"
          />
          <Button onClick={() => void send()} className="sm:self-start">
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
