'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CampaignMemoryPanel, { type CampaignDNA } from '@/components/CampaignMemoryPanel'
import CampaignQualityPanel from '@/components/CampaignQualityPanel'

// ── Types ─────────────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

interface AttachedFile {
  name: string
  kind: 'image' | 'text'
  content: string       // base64 for images, plain text for .txt
  mimeType: string
  previewUrl?: string   // data URL shown in bubble
}

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  displayContent: string
  attachmentName?: string
  attachmentPreview?: string   // data URL for image thumbnail
  outputData?: Record<string, unknown>
  isStreaming: boolean
  suggestions?: string[]
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
  let result = content.replace(regex, '').trim()
  result = result.replace(/```(?:strategy|research|copy)-output[\s\S]*$/, '').trim()
  return result
}

const SUGGESTIONS_REGEX = /```suggestions\s*([\s\S]*?)\s*```/

/**
 * Silent extraction: if the agent responded without including the structured
 * JSON block, send one follow-up message to extract it without touching the UI.
 */
async function silentExtract(
  agentType: string,
  campaignId: string,
  outputKey: string,
  outputRegex: RegExp,
  history: ConversationMessage[],
  onExtracted: (data: Record<string, unknown>) => void
): Promise<void> {
  const blockName = `${outputKey}-output`
  try {
    // Trim history to last 10 exchanges to avoid context overflow
    const trimmedHistory = history.slice(-20)
    const forceHistory: ConversationMessage[] = [
      ...trimmedHistory,
      {
        role: 'user',
        content: `Perfecto. Ahora incluí el bloque \`\`\`${blockName}\`\`\` completo con todos los datos analizados hasta ahora. Solo el bloque JSON, sin texto adicional.`,
      },
    ]
    const res = await fetch(`/api/agents/${agentType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, messages: forceHistory }),
    })
    if (!res.ok) return
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let acc = ''
    loop: while (true) {
      const { value, done } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue
        const d = line.slice(6).trim()
        if (d === '[DONE]') break loop
        try {
          const p = JSON.parse(d) as { text?: string }
          if (p.text) acc += p.text
        } catch { /* ignore partial JSON */ }
      }
    }
    const extracted = parseBlock(acc, outputRegex)
    if (extracted) onExtracted(extracted)
  } catch { /* silent — don't surface errors to user */ }
}

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
  const [conversationLoaded, setConversationLoaded] = useState(false)
  const [hasSavedHistory, setHasSavedHistory] = useState(false)
  const [rightTab, setRightTab] = useState<'quality' | 'memory'>('quality')
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const conversationHistoryRef = useRef<ConversationMessage[]>([])
  const accumulatedTextRef = useRef<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Stop streaming ────────────────────────────────────────────────────────
  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  // ── File attachment handler ───────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFileError(null)

    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    if (file.size > 4 * 1024 * 1024) {
      setFileError('El archivo debe ser menor a 4 MB.')
      return
    }

    if (imageTypes.includes(file.type)) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1]
        setAttachedFile({ name: file.name, kind: 'image', content: base64, mimeType: file.type, previewUrl: dataUrl })
      }
      reader.readAsDataURL(file)
    } else if (file.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = () => {
        setAttachedFile({ name: file.name, kind: 'text', content: reader.result as string, mimeType: file.type })
      }
      reader.readAsText(file)
    } else {
      setFileError('PDF y DOC próximamente — por ahora copiá y pegá el texto.')
    }
  }, [])

  // ── Stream agent response ─────────────────────────────────────────────────
  const streamAgentResponse = useCallback(async (
    msgs: ConversationMessage[],
    onAbort?: () => void,
  ) => {
    if (!config) return
    setIsStreaming(true)
    setError(null)

    const msgId = crypto.randomUUID()
    accumulatedTextRef.current = ''

    setMessages((prev) => [
      ...prev,
      { id: msgId, role: 'assistant', displayContent: '', isStreaming: true },
    ])

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      // Trim to last 20 messages to prevent context overflow in long conversations
      const trimmedMsgs = msgs.length > 20 ? msgs.slice(-20) : msgs
      const res = await fetch(`/api/agents/${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, messages: trimmedMsgs }),
        signal: abortController.signal,
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
              const visible = stripSuggestions(stripBlock(accumulatedTextRef.current, config.outputRegex))
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
      const visible = stripSuggestions(stripBlock(fullText, config.outputRegex))
      const newHistory: ConversationMessage[] = [...msgs, { role: 'assistant', content: fullText }]
      conversationHistoryRef.current = newHistory

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, displayContent: visible, outputData: parsed ?? undefined, isStreaming: false, suggestions: parseSuggestions(fullText) ?? undefined }
            : m
        )
      )

      if (parsed) {
        await saveOutput(parsed)
      } else {
        // Auto-extract: agent replied without the JSON block — silently retry
        await silentExtract(agentType, campaignId, config.outputKey, config.outputRegex, newHistory, async (data) => {
          await saveOutput(data)
          // Attach output card to the last assistant message
          setMessages((prev) => {
            const lastAssIdx = prev.map((m, i) => (m.role === 'assistant' ? i : -1)).filter((i) => i >= 0).pop()
            if (lastAssIdx === undefined) return prev
            return prev.map((m, i) => (i === lastAssIdx ? { ...m, outputData: data } : m))
          })
        })
      }
      await saveConversation(newHistory)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User stopped — remove the assistant bubble and revert the user message
        setMessages((prev) => prev.filter((m) => m.id !== msgId))
        onAbort?.()
      } else {
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setMessages((prev) => prev.filter((m) => m.id !== msgId))
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [agentType, campaignId, config])

  // ── Save structured output ────────────────────────────────────────────────
  const saveOutput = useCallback(async (data: Record<string, unknown>) => {
    if (!config) return
    setIsSaving(true)
    try {
      setCampaignDna((prev) => {
        const updated = { ...prev, [config.outputKey]: data }
        fetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_dna: updated, status: config.doneStatus }),
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
    // Serialize messages — strip base64 image data before saving to DB
    const safeHistory = history.map((m) => {
      if (Array.isArray(m.content)) {
        const textParts = m.content
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
        return { ...m, content: textParts }
      }
      return m
    })
    setCampaignDna((prev) => {
      const conversations = { ...(prev as any)?.conversations, [agentType]: safeHistory }
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
          const restored: DisplayMessage[] = savedHistory.map((msg) => {
            if (msg.role === 'user') {
              return { id: crypto.randomUUID(), role: 'user' as const, displayContent: msg.content as string, isStreaming: false }
            }
            const content = typeof msg.content === 'string' ? msg.content : ''
            const outputData = parseBlock(content, config.outputRegex)
            return {
              id: crypto.randomUUID(),
              role: 'assistant' as const,
              displayContent: stripBlock(content, config.outputRegex),
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
    if ((!text && !attachedFile) || isStreaming) return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setFileError(null)

    // Build message content for the API
    let apiContent: string | ContentBlock[]
    let displayContent: string
    let historyContent: string | ContentBlock[]

    if (attachedFile?.kind === 'image') {
      apiContent = [
        { type: 'image', source: { type: 'base64', media_type: attachedFile.mimeType, data: attachedFile.content } },
        { type: 'text', text: text || '(imagen adjunta)' },
      ]
      displayContent = text || ''
      historyContent = apiContent
    } else if (attachedFile?.kind === 'text') {
      const fileContext = `Archivo adjunto (${attachedFile.name}):\n\`\`\`\n${attachedFile.content}\n\`\`\`\n\n${text || ''}`
      apiContent = fileContext
      displayContent = text || ''
      historyContent = fileContext
    } else {
      apiContent = text
      displayContent = text
      historyContent = text
    }

    const fileToShow = attachedFile
    setAttachedFile(null)

    const historyBeforeSend = [...conversationHistoryRef.current]
    const userMsgId = crypto.randomUUID()

    const newHistory: ConversationMessage[] = [
      ...conversationHistoryRef.current,
      { role: 'user', content: historyContent },
    ]
    conversationHistoryRef.current = newHistory

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        displayContent,
        attachmentName: fileToShow?.name,
        attachmentPreview: fileToShow?.previewUrl,
        isStreaming: false,
      },
    ])

    const apiHistory: ConversationMessage[] = [
      ...historyBeforeSend,
      { role: 'user', content: apiContent },
    ]

    await streamAgentResponse(apiHistory, () => {
      // Revert: remove user bubble and restore history
      conversationHistoryRef.current = historyBeforeSend
      setMessages((prev) => prev.filter((m) => m.id !== userMsgId))
    })
  }, [input, attachedFile, isStreaming, streamAgentResponse])

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

  const canSend = (input.trim().length > 0 || attachedFile !== null) && !isStreaming
  // Show continue button whenever this agent has saved output (not just on last message)
  const hasSavedOutput = !!(campaignDna as Record<string, unknown> | undefined)?.[config.outputKey]

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
                  <div className="max-w-[78%] space-y-1.5">
                    {/* Image preview */}
                    {msg.attachmentPreview && (
                      <div className="flex justify-end">
                        <img
                          src={msg.attachmentPreview}
                          alt={msg.attachmentName}
                          className="max-h-40 max-w-full rounded-xl object-cover border border-gray-200 shadow-sm"
                        />
                      </div>
                    )}
                    {/* Text file chip */}
                    {msg.attachmentName && !msg.attachmentPreview && (
                      <div className="flex justify-end">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {msg.attachmentName}
                        </span>
                      </div>
                    )}
                    {/* Message text */}
                    {msg.displayContent && (
                      <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
                        {msg.displayContent}
                      </div>
                    )}
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

                  {msg.outputData && !msg.isStreaming && (
                    <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                      ✓ Resultado guardado en el panel →
                    </p>
                  )}

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

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/50 p-3">

          {/* File error */}
          {fileError && (
            <div className="mb-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">{fileError}</p>
              <button onClick={() => setFileError(null)} className="text-amber-500 hover:text-amber-700 ml-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Attached file chip */}
          {attachedFile && (
            <div className="mb-2 flex items-center gap-2">
              {attachedFile.previewUrl ? (
                <div className="relative">
                  <img src={attachedFile.previewUrl} alt={attachedFile.name} className="h-14 w-14 rounded-lg object-cover border border-gray-200" />
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-900"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-3 py-1.5 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {attachedFile.name}
                  <button onClick={() => setAttachedFile(null)} className="ml-1 hover:text-blue-900">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Guardar resultados: fallback banner when agent responded but no data saved */}
          {!hasSavedOutput && messages.length > 1 && !isStreaming && (
            <div className="mb-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <p className="text-xs text-amber-700 font-medium">⚠️ Resultados aún no guardados</p>
              <button
                onClick={() => handleDirectSend(`Perfecto. Incluí el bloque \`\`\`${config.outputKey}-output\`\`\` completo con todos los datos que analizamos.`)}
                className="text-xs font-semibold px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors ml-3 whitespace-nowrap"
              >
                💾 Guardar análisis
              </button>
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 items-end bg-white rounded-xl border border-gray-200 px-3 py-2 focus-within:border-purple-400 transition-colors shadow-sm">
            {/* Paperclip / attach */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors flex-shrink-0 mb-0.5"
              title="Adjuntar imagen o archivo de texto"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? 'El agente está trabajando...' : attachedFile ? 'Añadí un mensaje o enviá solo el archivo...' : 'Hacé una pregunta o pedí ajustes...'}
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 text-sm leading-relaxed disabled:text-gray-400"
              style={{ minHeight: '24px', maxHeight: '160px' }}
            />

            {/* Stop button (while streaming) */}
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                className="flex items-center gap-1.5 px-3 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Detener
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-30 hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-1.5 ml-1">
            {isStreaming ? 'Podés detener la respuesta en cualquier momento' : 'Enter para enviar · Shift+Enter para nueva línea · 📎 adjuntá imágenes o .txt'}
          </p>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,text/plain"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div> {/* end left chat column */}

    {/* ── Right: Quality + Memory panel (desktop only) ── */}
    <div className="hidden lg:flex flex-col min-h-0">

      {/* Continue button — always visible, style depends on whether output is saved */}
      {hasSavedOutput ? (
        <button
          onClick={handleContinue}
          disabled={isStreaming}
          className={`w-full mb-3 py-3 bg-gradient-to-r ${config.color} text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm text-sm flex-shrink-0 disabled:opacity-40`}
        >
          {config.nextLabel ?? '🏁 Ver campaña completa →'}
        </button>
      ) : (
        <div className="mb-3 flex-shrink-0 space-y-1.5">
          <button
            onClick={handleContinue}
            disabled={isStreaming}
            className="w-full py-2.5 bg-gray-100 border border-gray-300 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm disabled:opacity-40"
          >
            {config.nextLabel ? config.nextLabel.replace('→', '') + '(sin guardar) →' : '🏁 Ver campaña →'}
          </button>
          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            El agente no guardó datos aún — podés avanzar igual
          </p>
        </div>
      )}

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

      <div className="flex-1 min-h-0 overflow-y-auto">
        {rightTab === 'quality' ? (
          <CampaignQualityPanel
            intakeData={intakeData as any}
            campaignDna={campaignDna as any}
            currentAgentType={agentType as AgentKey}
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
