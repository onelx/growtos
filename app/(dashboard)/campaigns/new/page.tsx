'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import CampaignMemoryPanel from '@/components/CampaignMemoryPanel'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CampaignBrief {
  businessName: string
  businessDescription: string
  targetAudience: string
  goals: string[]
  constraints: string
  timeline: string
}

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  displayContent: string
  brief?: CampaignBrief
  suggestions?: string[]
  isStreaming: boolean
  timestamp: Date
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRIEF_REGEX = /```campaign-brief\s*([\s\S]*?)\s*```/
const SUGGESTIONS_REGEX = /```suggestions\s*([\s\S]*?)\s*```/

function parseSuggestions(content: string): string[] | null {
  const match = content.match(SUGGESTIONS_REGEX)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : null
  } catch { return null }
}

function stripSuggestions(content: string): string {
  return content.replace(SUGGESTIONS_REGEX, '').replace(/```suggestions[\s\S]*$/, '').trim()
}

function parseCampaignBrief(content: string): CampaignBrief | null {
  const match = content.match(BRIEF_REGEX)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    if (
      typeof parsed.businessName === 'string' &&
      typeof parsed.businessDescription === 'string' &&
      typeof parsed.targetAudience === 'string' &&
      Array.isArray(parsed.goals)
    ) {
      return parsed as CampaignBrief
    }
    return null
  } catch {
    return null
  }
}

function stripBriefBlock(content: string): string {
  return content.replace(BRIEF_REGEX, '').trim()
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StreamingCursor() {
  return (
    <span className="inline-block w-0.5 h-4 bg-gray-500 animate-pulse ml-0.5 align-middle" />
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5 px-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

function BriefCard({
  brief,
  onCreateCampaign,
  isCreating,
}: {
  brief: CampaignBrief
  onCreateCampaign: (brief: CampaignBrief) => void
  isCreating: boolean
}) {
  return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-purple-200 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div>
            <p className="text-white font-bold text-sm tracking-wide">BRIEF DE CAMPAÑA</p>
            <p className="text-purple-200 text-xs mt-0.5">Listo para crear</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white p-5 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{brief.businessName}</h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">
              Negocio
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">
              {brief.businessDescription}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">
              Audiencia objetivo
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">
              {brief.targetAudience}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">
              Objetivos
            </p>
            <div className="flex flex-wrap gap-2">
              {brief.goals.map((goal, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium"
                >
                  {goal}
                </span>
              ))}
            </div>
          </div>

          {(brief.timeline || brief.constraints) && (
            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-gray-100">
              {brief.timeline && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                    Timeline
                  </p>
                  <p className="text-gray-700 text-sm">{brief.timeline}</p>
                </div>
              )}
              {brief.constraints && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                    Restricciones
                  </p>
                  <p className="text-gray-700 text-sm">{brief.constraints}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-50 border-t border-gray-100 px-5 py-4">
        <button
          onClick={() => onCreateCampaign(brief)}
          disabled={isCreating}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creando campaña...
            </>
          ) : (
            <>
              🚀 Crear campaña y empezar
              <span className="ml-1">→</span>
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Los agentes de IA van a trabajar en base a este brief
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router = useRouter()

  const [phase, setPhase] = useState<'welcome' | 'chat' | 'brief'>('welcome')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const conversationHistoryRef = useRef<ConversationMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const accumulatedTextRef = useRef<string>('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (phase === 'chat') {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [phase])

  // ── Stream assistant response ─────────────────────────────────────────────
  const streamAssistantResponse = useCallback(async () => {
    setIsStreaming(true)
    setError(null)

    const assistantId = crypto.randomUUID()
    accumulatedTextRef.current = ''

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        displayContent: '',
        isStreaming: true,
        timestamp: new Date(),
      },
    ])

    try {
      const response = await fetch('/api/agents/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistoryRef.current }),
      })

      if (!response.ok) {
        throw new Error('Error al contactar al agente')
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data) as { text?: string; error?: string }
            if (parsed.error) {
              throw new Error(parsed.error)
            }
            if (parsed.text) {
              accumulatedTextRef.current += parsed.text
              const visibleText = stripSuggestions(stripBriefBlock(accumulatedTextRef.current))
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, displayContent: visibleText } : m
                )
              )
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected token') {
              throw parseErr
            }
            // skip genuinely malformed chunks
          }
        }
      }

      // Finalize message
      const fullText = accumulatedTextRef.current
      const brief = parseCampaignBrief(fullText)
      const suggestions = parseSuggestions(fullText)
      const visibleText = stripSuggestions(stripBriefBlock(fullText))

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,
        { role: 'assistant', content: fullText },
      ]

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                displayContent: visibleText,
                brief: brief ?? undefined,
                suggestions: suggestions ?? undefined,
                isStreaming: false,
              }
            : m
        )
      )

      if (brief) setPhase('brief')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
    } finally {
      setIsStreaming(false)
    }
  }, [])

  // ── Start conversation ────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    setPhase('chat')

    const opener = 'Hola, quiero crear una nueva campaña de marketing.'
    conversationHistoryRef.current = [{ role: 'user', content: opener }]

    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'user',
        displayContent: opener,
        isStreaming: false,
        timestamp: new Date(),
      },
    ])

    await streamAssistantResponse()
  }, [streamAssistantResponse])

  // ── Send user message ─────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setInput('')

    conversationHistoryRef.current = [
      ...conversationHistoryRef.current,
      { role: 'user', content: text },
    ]

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        displayContent: text,
        isStreaming: false,
        timestamp: new Date(),
      },
    ])

    await streamAssistantResponse()
  }, [input, isStreaming, streamAssistantResponse])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
      const el = e.target
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    },
    []
  )

  // ── Send from chip click ──────────────────────────────────────────────────
  const handleDirectSend = useCallback(async (text: string) => {
    if (!text || isStreaming) return
    conversationHistoryRef.current = [
      ...conversationHistoryRef.current,
      { role: 'user', content: text },
    ]
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', displayContent: text, isStreaming: false, timestamp: new Date() },
    ])
    await streamAssistantResponse()
  }, [isStreaming, streamAssistantResponse])

  // ── Create campaign ───────────────────────────────────────────────────────
  const handleCreateCampaign = useCallback(
    async (brief: CampaignBrief) => {
      setIsCreating(true)
      try {
        const response = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: brief.businessName.slice(0, 50) || 'Nueva campaña',
            intake_data: {
              businessName: brief.businessName,
              businessDescription: brief.businessDescription,
              targetAudience: brief.targetAudience,
              goals: brief.goals,
              constraints: brief.constraints,
              timeline: brief.timeline,
            },
          }),
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || 'Error al crear campaña')
        }

        const result = await response.json()
        router.push(`/campaigns/${result.campaign.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear campaña')
        setIsCreating(false)
      }
    },
    [router]
  )

  // ── Render: Welcome ───────────────────────────────────────────────────────
  if (phase === 'welcome') {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
              <span className="text-5xl">✨</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white" />
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-gray-900">
              Nueva campaña
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              Chateá con nuestro agente de IA. Él va a entender tu negocio y armar el brief de campaña perfecto.
            </p>
          </div>

          {/* Features */}
          <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-left">
            {[
              { icon: '💬', text: 'Conversación natural, sin formularios' },
              { icon: '🧠', text: 'IA que entiende tu contexto' },
              { icon: '📋', text: 'Brief generado automáticamente' },
              { icon: '🚀', text: 'Agentes especializados toman el control' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-gray-700 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl text-lg font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Comenzar →
          </button>

          <p className="text-xs text-gray-400">
            ≈ 3-5 minutos · Sin límite de mensajes
          </p>
        </div>
      </div>
    )
  }

  // ── Render: Chat ──────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4" style={{ height: 'calc(100vh - 140px)' }}>
    <div className="flex flex-col min-h-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-700 transition-colors text-sm flex items-center gap-1"
        >
          ← Volver
        </button>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-base">✨</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">Agente de Intake</p>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
              <p className="text-xs text-gray-400">
                {isStreaming ? 'Pensando...' : 'En línea'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-0">
        {/* Messages */}
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
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <span className="text-xs text-white font-bold">AI</span>
                </div>
                <div className="flex-1 max-w-[85%]">
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

                  {/* Quick reply chips */}
                  {!msg.isStreaming && isLast && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 ml-1">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleDirectSend(s)}
                          disabled={isStreaming}
                          className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-full hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50 transition-all disabled:opacity-40 font-medium shadow-sm"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Brief card below the last assistant message */}
                  {msg.brief && (
                    <BriefCard
                      brief={msg.brief}
                      onCreateCampaign={handleCreateCampaign}
                      isCreating={isCreating}
                    />
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

        {/* Input bar — hidden once brief is generated */}
        {phase !== 'brief' && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/50 p-3">
            <div className="flex gap-2 items-end bg-white rounded-xl border border-gray-200 px-3 py-2 focus-within:border-purple-400 transition-colors shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isStreaming ? 'El agente está respondiendo...' : 'Escribí tu respuesta...'}
                rows={1}
                disabled={isStreaming}
                className="flex-1 bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 text-sm leading-relaxed disabled:text-gray-400"
                style={{ minHeight: '24px', maxHeight: '160px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-30 hover:opacity-90 transition-opacity flex-shrink-0"
                aria-label="Enviar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 ml-1">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        )}
      </div>
    </div> {/* end left chat column */}

    {/* ── Right: Memory panel (desktop only) ── */}
    <div className="hidden lg:flex flex-col min-h-0 overflow-y-auto">
      <CampaignMemoryPanel
        intakeData={messages.find(m => m.brief)?.brief as any}
        currentAgentType="intake"
      />
    </div>

    </div>
  )
}
