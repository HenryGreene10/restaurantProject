import React, { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Bot, CheckCircle2, Sparkles, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

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

type ChatMessage = {
  id: string
  role: "assistant" | "user" | "confirmation"
  content: string
  options?: Array<{
    id: string
    label: string
  }>
}

const WELCOME_MESSAGE =
  "Hi! I'm your restaurant assistant. Tell me what you'd like to change — I can update your menu, mark items as sold out, reorder categories, change your hero headline, and more."

function storageKey(tenantSlug: string) {
  return `restaurant-assistant:${tenantSlug}`
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  options?: ChatMessage["options"],
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    options,
  }
}

export const AssistantPanel: React.FC<{
  className?: string
  tenantSlug: string
  onRefreshTargets?: (targets: AssistantRefreshTarget[]) => void | Promise<void>
}> = ({ className, tenantSlug, onRefreshTargets }) => {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const lastMessageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const saved = window.sessionStorage.getItem(storageKey(tenantSlug))
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          setIsInitialized(true)
          return
        }
      } catch {
        // Fall through to the welcome message.
      }
    }

    setMessages([createMessage("assistant", WELCOME_MESSAGE)])
    setIsInitialized(true)
  }, [tenantSlug])

  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return
    window.sessionStorage.setItem(storageKey(tenantSlug), JSON.stringify(messages))
  }, [isInitialized, messages, tenantSlug])

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isSending])

  const placeholder = useMemo(
    () => "Ask to update your menu or storefront settings",
    [],
  )

  async function send() {
    const message = input.trim()
    if (!message || isSending) return

    const userMessage = createMessage("user", message)
    setMessages((current) => [...current, userMessage])
    setInput("")
    setIsSending(true)

    try {
      const response = await fetch("/api/v1/assistant/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenantSlug,
        },
        body: JSON.stringify({ message }),
      })
      const data = (await response.json()) as AssistantCommandResponse & { error?: string }

      if (!response.ok) {
        throw new Error(data.error || `Command failed (${response.status})`)
      }

      const nextMessages: ChatMessage[] = [
        createMessage("assistant", data.reply || "Done.", data.options),
      ]

      if (!data.needsClarification && data.refresh.length > 0) {
        await onRefreshTargets?.(data.refresh)
        nextMessages.push(createMessage("confirmation", `✓ ${data.reply || "Change applied."}`))
      }

      setMessages((current) => [...current, ...nextMessages])
    } catch (error) {
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          error instanceof Error ? error.message : "Request failed.",
        ),
      ])
    } finally {
      setIsSending(false)
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <Card className={cn("flex h-full min-h-0 flex-col gap-0 border border-border/80 bg-card py-0 shadow-sm", className)}>
      <CardHeader className="gap-4 border-b border-border/70 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-2">
            <Badge variant="outline" className="w-fit border-border bg-background text-muted-foreground">
              AI Assistant
            </Badge>
            <div className="grid gap-1">
              <CardTitle className="text-xl">Live restaurant assistant</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Natural-language storefront control with immediate menu refresh.
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">{tenantSlug}</div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col px-0 py-0">
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-4">
            {messages.map((message, index) => {
              const isUser = message.role === "user"
              const isConfirmation = message.role === "confirmation"

              return (
                <div
                  key={message.id}
                  ref={index === messages.length - 1 ? lastMessageRef : null}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  {isConfirmation ? (
                    <div className="w-full rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
                      <div className="flex items-center gap-3 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>{message.content}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex max-w-[88%] items-start gap-3",
                        isUser ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border",
                          isUser ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground",
                        )}
                      >
                        {isUser ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div
                        className={cn(
                          "grid gap-3 rounded-[var(--radius)] border px-4 py-4 text-sm leading-6 shadow-sm",
                          isUser
                            ? "border-primary/20 bg-primary/10 text-foreground"
                            : "border-border/70 bg-card text-foreground",
                        )}
                      >
                        <div>{message.content}</div>
                        {message.options?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {message.options.map((option) => (
                              <Badge
                                key={option.id}
                                variant="outline"
                                className="border-border bg-background text-muted-foreground"
                              >
                                {option.label}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <AnimatePresence>
              {isSending ? (
                <motion.div
                  key="assistant-loading"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex justify-start"
                >
                  <div className="flex max-w-[88%] items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="rounded-[var(--radius)] border border-border/70 bg-card px-4 py-4 shadow-sm">
                      <LoadingDots />
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <Separator />

        <div className="px-5 py-5">
          <div className="grid gap-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={placeholder}
              rows={4}
              className="min-h-28 w-full resize-none rounded-[var(--radius)] border border-input bg-background px-4 py-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">Press Enter to send. Shift+Enter adds a new line.</p>
              <Button className="min-h-11" disabled={isSending || !input.trim()} onClick={() => void send()}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-2 w-2 rounded-full bg-current"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
          transition={{
            duration: 0.9,
            repeat: Number.POSITIVE_INFINITY,
            delay: index * 0.14,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
