import React, { useState } from 'react'

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
  const [input, setInput] = useState('')
  const [log, setLog] = useState<string[]>([])

  async function send() {
    const msg = input.trim()
    if (!msg) return
    setLog(l => [...l, `You: ${msg}`])
    setInput('')
    try {
      const res = await fetch('/api/v1/assistant/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({ message: msg }),
      })
      const data = (await res.json()) as AssistantCommandResponse & { error?: string }

      if (!res.ok) {
        throw new Error(data.error || `Command failed (${res.status})`)
      }

      setLog(l => {
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
      setLog(l => [
        ...l,
        `Assistant: ${error instanceof Error ? error.message : 'Request failed.'}`,
      ])
    }
  }

  return (
    <aside style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
      <h3>AI Assistant</h3>
      <div style={{ height: 240, overflow: 'auto', background: '#f9fafb', padding: 8, marginBottom: 8 }}>
        {log.map((l, i) => <div key={i} style={{ marginBottom: 4 }}>{l}</div>)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask to update menu, pause orders, etc." style={{ flex: 1, padding: 8 }} />
        <button onClick={send}>Send</button>
      </div>
    </aside>
  )
}
