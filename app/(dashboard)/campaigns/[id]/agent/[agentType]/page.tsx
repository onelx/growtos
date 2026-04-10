'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CampaignMemoryPanel, { type CampaignDNA } from '@/components/CampaignMemoryPanel'
import CampaignQualityPanel from '@/components/CampaignQualityPanel'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  displayContent: string
  outputData?: Record<string, unknown>
  isStreaming: boolean
}

// ── Agent config ───────────────────────────────────────────────────────────────

type AgentKey = 'strategist' | 'researcher' | 'copywriter'

const AGENT_CONFIG: Record<
  AgentKey,
  {
    name: string
    icon: string
    color: string
    outputKey: string
    outputRegex: RegExp
    nextAgent: AgentKey | null
    nextLabel: string | null
    nextStatus: string | null
    doneStatus: string
    outputCard: (data: Record<string, unknown>) => React.ReactNode
  }
> = {
  strategist: {
    name: 'Agente Estratega',
    icon: '🎯',
    color: 'from-purple-500 to-indigo-600',
    outputKey: 'strategy',
    outputRegex: /```strategy-output\s*([\s\S]*?)\s*```/,
    nextAgent: 'researcher',
    nextLabel: 'Continuar con Investigador →',
    nextStatus: 'researcher',
    doneStatus: 'strategist',
    outputCard: (data) => <StrategyCard data={data} />,
  },
  researcher: {
    name: 'Agente Investigador',
    icon: '🔍',
    color: 'from-blue-500 to-cyan-600',
    outputKey: 'research',
    outputRegex: /```research-output\s*([\s\S]*?)\s*```/,
    nextAgent: 'copywriter',
    nextLabel: 'Continuar con Copywriter →',
    nextStatus: 'copywriter',
    doneStatus: 'researcher',
    outputCard: (data) => <ResearchCard data={data} />,
  },
  copywriter: {
    name: 'Agente Copywriter',
    icon: '✍️',
    color: 'from-pink-500 to-rose-600',
    outputKey: 'copy',
    outputRegex: /```copy-output\s*([\s\S]*?)\s*```/,
    nextAgent: null,
    nextLabel: null,
    nextStatus: 'completed',
    doneStatus: 'copywriter',
    outputCard: (data) => <CopyCard data={data} />,
  },
}

// ── Module-level helpers (stable, no closure issues) ──────────────────────────

function parseBlock(content: string, regex: RegExp): Record<string, unknown> | null {
  const match = content.match(regex)
  if (!match) return null
  try { return JSON.parse(match[1]) } catch { return null }
}

function stripBlock(content: string, regex: RegExp): string {
  return content.replace(regex, '').trim()
}

// ── Output cards ───────────────────────────────────────────────────────────────

function TagList({ items }: { items: unknown }) {
  const arr = Array.isArray(items) ? items : []
  return (
    <div className="flex flex-wrap gap-1.5">
      {arr.map((item, i) => (
        <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium">
          {String(item)}
        </span>
      ))}
    </div>
  )
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">{label}</p>
      {Array.isArray(value)
        ? <TagList items={value} />
        : <p className="text-gray-700 text-sm leading-relaxed">{String(value)}</p>
      }
    </div>
  )
}

function StrategyCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="mt-3 rounded-xl border border-indigo-200 overflow-hidden shadow-md">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">🎯</span>
        <p className="text-white font-bold text-sm tracking-wide">ESTRATEGIA DE CAMPAÑA</p>
      </div>
      <div className="bg-white p-4 space-y-3">
        <Field label="Posicionamiento" value={data.positioning} />
        <Field label="Propuesta de valor" value={data.uniqueValueProp} />
        <Field label="Concepto de campaña" value={data.campaignConcept} />
        <Field label="Canales recomendados" value={data.recommendedChannels} />
        <Field label="Pilares de messaging" value={data.messagingPillars} />
        <Field label="Mensajes clave" value={data.keyMessages} />
      </div>
    </div>
  )
}

function ResearchCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="mt-3 rounded-xl border border-blue-200 overflow-hidden shadow-md">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <p className="text-white font-bold text-sm tracking-wide">INVESTIGACIÓN DE MERCADO</p>
      </div>
      <div className="bg-white p-4 space-y-3">
        <Field label="Tamaño de mercado" value={data.marketSize} />
        <Field label="Ventaja competitiva" value={data.competitiveAdvantage} />
        <Field label="Competidores clave" value={data.mainCompetitors} />
        <Field label="Pain points de audiencia" value={data.audiencePainPoints} />
        <Field label="Tendencias" value={data.marketTrends} />
        <Field label="Oportunidades" value={data.opportunities} />
        <Field label="Riesgos" value={data.risks} />
      </div>
    </div>
  )
}

function CopyCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="mt-3 rounded-xl border border-pink-200 overflow-hidden shadow-md">
      <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">✍️</span>
        <p className="text-white font-bold text-sm tracking-wide">COPY DE CAMPAÑA</p>
      </div>
      <div className="bg-white p-4 space-y-3">
        <Field label="Tagline" value={data.tagline} />
        <Field label="Tono y voz" value={data.tone} />
        <Field label="Headlines" value={data.headlines} />
        <Field label="CTAs" value={data.ctas} />
        <Field label="Email subjects" value={data.emailSubjects} />
        {Array.isArray(data.socialPosts) && data.socialPosts.length > 0 && (
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">Posts para redes</p>
            <div className="space-y-2">
              {(data.socialPosts as string[]).map((post, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed border border-gray-100">
                  {post}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5 px-1">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </div>
  )
}

function StreamingCursor() {
  return <span className="inline-block w-0.5 h-4 bg-gray-500 animate-pulse ml-0.5 align-middle" />
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AgentPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const agentType = params.agentType as string

  const config = AGENT_CONFIG[agentType as AgentKey]

  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveOutput, setLiveOutput] = useState<Record<string, unknown> | null>(null)
  const [intakeData, setIntakeData] = useState<Record<string, unknown> | undefined>()
  const [campaignDna, setCampaignDna] = useState<CampaignDNA | undefined>()
  // Memory persistence
  const [conversationLoaded, setConversationLoaded] = useState(false)
  const [hasSavedHistory, setHasSavedHistory] = useState(false)
  // Right panel tab
  const [rightTab, setRightTab] = useState<'quality' | 'memory'>('quality')

  const conversationHistoryRef = useRef<ConversationMessage[]>([])
  const accumulatedTextRef = useRef<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Stream agent response ─────────────────────────────────────────────────
  const streamAgentResponse = useCallback(async (msgs: ConversationMessage[]) => {
    if (!config) return
    setIsStreaming(true)
    setError(null)

    const msgId = crypto.randomUUID()
    accumulatedTextRef.current = ''

    setMessages((prev) => [
      ...prev,
      { id: msgId, role: 'assistant', displayContent: '', isStreaming: true },
    ])

    try {
      const res = await fetch(`/api/agents/${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, messages: msgs }),
      })

      if (!res.ok) throw new Error(`Error ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data) as { text?: string; error?: string }
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              accumulatedTextRef.current += parsed.text
              const visible = stripBlock(accumulatedTextRef.current, config.outputRegex)
              setMessages((prev) =>
                prev.map((m) => m.id === msgId ? { ...m, displayContent: visible } : m)
              )
              const partial = parseBlock(accumulatedTextRef.current, config.outputRegex)
              if (partial) setLiveOutput(partial)
            }
          } catch (e) {
            if (e instanceof Error && !e.message.startsWith('Unexpected token')) throw e
          }
        }
      }

      // Finalize
      const fullText = accumulatedTextRef.current
      const parsed = parseBlock(fullText, config.outputRegex)
      const visible = stripBlock(fullText, config.outputRegex)
      const newHistory: ConversationMessage[] = [...msgs, { role: 'assistant', content: fullText }]
      conversationHistoryRef.current = newHistory

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, displayContent: visible, outputData: parsed ?? undefined, isStreaming: false }
            : m
        )
      )

      if (parsed) await saveOutput(parsed)

      // Save conversation history to Supabase
      await saveConversation(newHistory)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
    } finally {
      setIsStreaming(false)
    }
  }, [agentType, campaignId, config])

  // ── Save structured output ────────────────────────────────────────────────
  const saveOutput = useCallback(async (data: Record<string, unknown>) => {
    if (!config) return
    setIsSaving(true)
    try {
      setCampaignDna((prev) => {
        const updated = { ...prev, [config.outputKey]: data }
        // Fire-and-forget PATCH with the merged DNA
        fetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_dna: updated,
            status: config.doneStatus,
          }),
        }).catch(() => {})
        return updated
      })
      setIsSaved(true)
    } finally {
      setIsSaving(false)
    }
  }, [campaignId, config])

  // ── Save conversation history ─────────────────────────────────────────────
  const saveConversation = useCallback(async (history: ConversationMessage[]) => {
    setCampaignDna((prev) => {
      const conversations = { ...(prev as any)?.conversations, [agentType]: history }
      const updated = { ...prev, conversations }
      fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_dna: updated }),
      }).catch(() => {})
      return updated as CampaignDNA
    })
  }, [agentType, campaignId])

  // ── Fetch campaign + restore conversation ────────────────────────────────
  useEffect(() => {
    if (!config) return
    fetch(`/api/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then(({ campaign }) => {
        if (!campaign) return
        setIntakeData(campaign.intake_data)
        setCampaignDna(campaign.campaign_dna)

        const savedHistory: ConversationMessage[] | undefined =
          campaign.campaign_dna?.conversations?.[agentType]

        if (savedHistory && savedHistory.length > 0) {
          conversationHistoryRef.current = savedHistory
          // Reconstruct display messages from saved history
          const restored: DisplayMessage[] = savedHistory.map((msg) => {
            if (msg.role === 'user') {
              return { id: crypto.randomUUID(), role: 'user' as const, displayContent: msg.content, isStreaming: false }
            }
            const outputData = parseBlock(msg.content, config.outputRegex)
            return {
              id: crypto.randomUUID(),
              role: 'assistant' as const,
              displayContent: stripBlock(msg.content, config.outputRegex),
              outputData: outputData ?? undefined,
              isStreaming: false,
            }
          })
          setMessages(restored)
          setHasSavedHistory(true)
        }
        setConversationLoaded(true)
      })
      .catch(() => setConversationLoaded(true))
  }, [campaignId, agentType, config])

  // ── Auto-start (only when no saved history) ───────────────────────────────
  useEffect(() => {
    if (!conversationLoaded || hasSavedHistory) return
    streamAgentResponse([])
  }, [conversationLoaded, hasSavedHistory, streamAgentResponse])

  // ── Send follow-up ────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const newHistory: ConversationMessage[] = [
      ...conversationHistoryRef.current,
      { role: 'user', content: text },
    ]
    conversationHistoryRef.current = newHistory

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', displayContent: text, isStreaming: false },
    ])

    await streamAgentResponse(newHistory)
  }, [input, isStreaming, streamAgentResponse])

  // ── Direct send from quality panel buttons ───────────────────────────────
  const handleDirectSend = useCallback(async (text: string) => {
    if (!text || isStreaming) return
    const newHistory: ConversationMessage[] = [
      ...conversationHistoryRef.current,
      { role: 'user', content: text },
    ]
    conversationHistoryRef.current = newHistory
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', displayContent: text, isStreaming: false },
    ])
    await streamAgentResponse(newHistory)
  }, [isStreaming, streamAgentResponse])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const handleContinue = async () => {
    if (!config) return
    if (config.nextAgent) {
      router.push(`/campaigns/${campaignId}/agent/${config.nextAgent}`)
    } else {
      // Completed — mark as completed and go to campaign
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      router.push(`/campaigns/${campaignId}`)
    }
  }

  if (!config) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-gray-500">Tipo de agente no válido.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4" style={{ height: 'calc(100vh - 140px)' }}>

    {/* ── Left: Chat ── */}
    <div className="flex flex-col min-h-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button
          onClick={() => router.push(`/campaigns/${campaignId}`)}
          className="text-gray-400 hover:text-gray-700 transition-colors text-sm flex items-center gap-1"
        >
          ← Volver
        </button>
        <div className="flex items-center gap-2 ml-2">
          <div className={`w-9 h-9 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center shadow-sm`}>
            <span className="text-base">{config.icon}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{config.name}</p>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
              <p className="text-xs text-gray-400">
                {isStreaming ? 'Analizando...' : isSaving ? 'Guardando...' : isSaved ? 'Guardado ✓' : 'En línea'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => {
            const isLast = index === messages.length - 1

            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[78%] bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
                    {msg.displayContent}
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className="flex gap-3">
                <div className={`w-8 h-8 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm`}>
                  <span className="text-sm">{config.icon}</span>
                </div>
                <div className="flex-1 max-w-[88%]">
                  <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed">
                    {msg.isStreaming && !msg.displayContent ? (
                      <TypingDots />
                    ) : (
                      <span className="whitespace-pre-wrap">
                        {msg.displayContent}
                        {msg.isStreaming && isLast && <StreamingCursor />}
                      </span>
                    )}
                  </div>

                  {/* Saved indicator — no inline cards, results live in the right panel */}
                  {msg.outputData && !msg.isStreaming && (
                    <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                      ✓ Resultado guardado en el panel →
                    </p>
                  )}

                  {/* Continue button — only on last assistant message with output */}
                  {msg.outputData && isLast && !isStreaming && (
                    <div className="mt-4">
                      <button
                        onClick={handleContinue}
                        className={`w-full py-3 bg-gradient-to-r ${config.color} text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm text-sm`}
                      >
                        {config.nextLabel ?? '🏁 Ver campaña completa →'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input — always visible for follow-up questions */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/50 p-3">
          <div className="flex gap-2 items-end bg-white rounded-xl border border-gray-200 px-3 py-2 focus-within:border-purple-400 transition-colors shadow-sm">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? 'El agente está trabajando...' : 'Hacé una pregunta o pedí ajustes...'}
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 text-sm leading-relaxed disabled:text-gray-400"
              style={{ minHeight: '24px', maxHeight: '160px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-30 hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 ml-1">
            Podés pedir cambios o refinamientos · Enter para enviar
          </p>
        </div>
      </div>
    </div> {/* end left chat column */}

    {/* ── Right: Quality + Memory panel (desktop only) ── */}
    <div className="hidden lg:flex flex-col min-h-0">
      {/* Tabs */}
      <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1 flex-shrink-0">
        {(['quality', 'memory'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setRightTab(tab)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              rightTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'quality' ? '📊 Calidad' : '🧠 Memoria'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {rightTab === 'quality' ? (
          <CampaignQualityPanel
            intakeData={intakeData as any}
            campaignDna={campaignDna as any}
            onSendPrompt={handleDirectSend}
          />
        ) : (
          <CampaignMemoryPanel
            intakeData={intakeData as any}
            campaignDna={campaignDna}
            currentAgentType={agentType as 'strategist' | 'researcher' | 'copywriter'}
            liveOutput={liveOutput ?? undefined}
          />
        )}
      </div>
    </div>

    </div>
  )
}
