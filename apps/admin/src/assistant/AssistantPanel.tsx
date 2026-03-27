import React, { useState } from 'react'

export const AssistantPanel: React.FC = () => {
  const [input, setInput] = useState('')
  const [log, setLog] = useState<string[]>([])

  async function send() {
    const msg = input.trim()
    if (!msg) return
    setLog(l => [...l, `You: ${msg}`])
    setInput('')
    try {
      const res = await fetch('/v1/assistant/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) })
      const data = await res.json()
      setLog(l => [...l, `Assistant: ${data.reply || 'ok'}`])
    } catch {
      setLog(l => [...l, 'Assistant: (stubbed) I will handle that soon.'])
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
