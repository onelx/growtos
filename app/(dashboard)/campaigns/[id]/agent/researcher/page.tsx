'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ResearchOutput {
  marketSize: string
  mainCompetitors: string[]
  competitiveAdvantage: string
  audiencePainPoints: string[]
  marketTrends: string[]
  opportunities: string[]
  risks: string[]
}

const EMPTY_RESEARCH: ResearchOutput = {
  marketSize: '',
  mainCompetitors: [],
  competitiveAdvantage: '',
  audiencePainPoints: [],
  marketTrends: [],
  opportunities: [],
  risks: [],
}

type FieldKey = keyof ResearchOutput

interface CardConfig {
  key: FieldKey
  label: string
  icon: string
  type: 'text' | 'tags'
  refinePlaceholder: string
  description: string
  helpText: string   // didactic explanation
  helpExample: string // concrete example
}

const CARDS: CardConfig[] = [
  {
    key: 'marketSize',
    label: 'Tamaño de mercado',
    icon: '📊',
    type: 'text',
    description: 'Tamaño del mercado objetivo y oportunidad real',
    refinePlaceholder: 'Ej: Operamos en Argentina, principalmente CABA y GBA. Nuestro ticket promedio es $50 USD...',
    helpText: 'Cuántas personas o empresas son potenciales clientes tuyos y qué valor económico representa ese mercado. Sirve para saber si vale la pena invertir en una campaña y qué tan grande puede ser el retorno.',
    helpExample: 'En Argentina hay 2.3M de PyMEs. Si tu producto apunta al 10% digital = 230K clientes potenciales. Con un ticket de $50 USD/mes = mercado de $138M USD anuales.',
  },
  {
    key: 'competitiveAdvantage',
    label: 'Ventaja competitiva',
    icon: '⚡',
    type: 'text',
    description: 'En qué superamos concretamente a la competencia',
    refinePlaceholder: 'Ej: Somos 30% más baratos que el líder y entregamos en 24hs cuando todos tardan 72hs...',
    helpText: 'La razón concreta y específica por la que alguien elegiría tu producto sobre la competencia. No "somos mejores" — sino QUÉ hacés diferente y POR QUÉ importa para tu cliente.',
    helpExample: 'Somos la única plataforma que enseña marketing mientras lo ejecuta en tu negocio real. La competencia vende cursos O servicios — nosotros hacemos los dos al mismo tiempo.',
  },
  {
    key: 'mainCompetitors',
    label: 'Competidores principales',
    icon: '🏁',
    type: 'tags',
    description: 'Los 3-5 competidores más relevantes',
    refinePlaceholder: 'Ej: Los principales son X e Y. X tiene más market share pero peor soporte...',
    helpText: 'Las opciones reales que evalúa tu cliente antes de comprarte. Incluí competidores directos (hacen lo mismo) e indirectos (resuelven el mismo problema de otra manera, incluso con hojas de cálculo o YouTube).',
    helpExample: 'HubSpot (directo, muy caro y complejo) · Agencias locales (alternativa humana, sin educación) · Excel + tutoriales de YouTube (sustituto gratuito)',
  },
  {
    key: 'opportunities',
    label: 'Oportunidades detectadas',
    icon: '🚀',
    type: 'tags',
    description: 'Oportunidades concretas para aprovechar en la campaña',
    refinePlaceholder: 'Ej: Hay mucho interés en el segmento PyMEs que nadie está atacando...',
    helpText: 'Espacios en el mercado donde la demanda existe pero la oferta actual no la cubre bien. Son los huecos donde tu campaña puede entrar con menor resistencia y mayor impacto.',
    helpExample: 'Las PyMEs B2B no tienen herramientas de marketing pensadas para ellas — todas apuntan a B2C. Eso es un hueco enorme sin explotar.',
  },
  {
    key: 'audiencePainPoints',
    label: 'Dolores de la audiencia',
    icon: '💢',
    type: 'tags',
    description: 'Los dolores más profundos, en palabras del cliente',
    refinePlaceholder: 'Ej: Nuestros clientes se quejan de la falta de soporte post-venta y tiempos de respuesta...',
    helpText: 'Los problemas reales que mantienen despierto a tu cliente. No los que vos creés que tienen — los que ellos mismos expresarían. Estos son la base de todo el copy de la campaña.',
    helpExample: '"No sé si lo que hago funciona" · "Pagué una agencia y no vi resultados" · "Aprendo marketing pero no sé cómo aplicarlo a mi negocio específico"',
  },
  {
    key: 'marketTrends',
    label: 'Tendencias del mercado',
    icon: '📈',
    type: 'tags',
    description: 'Tendencias clave que impactan la estrategia',
    refinePlaceholder: 'Ej: Vemos una migración fuerte hacia canales mobile y compra por WhatsApp...',
    helpText: 'Cambios en el comportamiento del mercado, tecnología o contexto que están modificando cómo la gente compra o qué espera. Afectan el tono, el canal y el timing de tu campaña.',
    helpExample: 'Crecimiento de ventas por WhatsApp Business entre PyMEs · Caída de confianza en ads pagos, sube el contenido orgánico · IA democratiza herramientas que antes eran solo para grandes empresas',
  },
  {
    key: 'risks',
    label: 'Riesgos',
    icon: '⚠️',
    type: 'tags',
    description: 'Riesgos que hay que contemplar',
    refinePlaceholder: 'Ej: Un competidor acaba de bajar precios 40%. También el tipo de cambio nos afecta...',
    helpText: 'Factores externos o del mercado que podrían complicar tu campaña o reducir su efectividad. No es para paralizarse — es para anticiparse y tener un plan B antes de invertir.',
    helpExample: 'Competidor principal bajó precios 40% en Q3 · Inflación reduce presupuesto disponible de PyMEs para herramientas SaaS · Cambios en el algoritmo de Meta afectan el alcance orgánico',
  },
]

// First 4 go left, last 3 go right
const LEFT_CARDS = CARDS.slice(0, 4)
const RIGHT_CARDS = CARDS.slice(4)

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseResearchOutput(text: string): ResearchOutput | null {
  const match = text.match(/```research-output\s*([\s\S]*?)\s*```/)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as ResearchOutput
  } catch {
    return null
  }
}

// ── InfoPanel ─────────────────────────────────────────────────────────────────

function InfoPanel({ helpText, helpExample }: { helpText: string; helpExample: string }) {
  return (
    <div className="mx-4 mb-0 -mt-1 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs space-y-2">
      <p className="text-amber-800 leading-relaxed">{helpText}</p>
      <div className="border-t border-amber-100 pt-2">
        <p className="text-amber-500 font-bold uppercase tracking-widest text-[10px] mb-1">Ejemplo</p>
        <p className="text-amber-700 leading-relaxed italic">{helpExample}</p>
      </div>
    </div>
  )
}

// ── TagEditor ─────────────────────────────────────────────────────────────────

function TagEditor({
  tags,
  onChange,
  disabled,
}: {
  tags: string[]
  onChange: (t: string[]) => void
  disabled?: boolean
}) {
  const [inputVal, setInputVal] = useState('')

  const addTag = () => {
    const v = inputVal.trim()
    if (!v || tags.includes(v)) return
    onChange([...tags, v])
    setInputVal('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium"
          >
            {t}
            {!disabled && (
              <button
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                className="hover:text-blue-900 ml-0.5 leading-none"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-gray-400 italic">Sin datos aún</span>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-1.5">
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="Agregar... (Enter para confirmar)"
            className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white placeholder-gray-400"
            maxLength={100}
          />
          <button
            onClick={addTag}
            disabled={!inputVal.trim()}
            className="px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}

// ── RefinePanel ───────────────────────────────────────────────────────────────

function RefinePanel({
  onRefine,
  isRefining,
  placeholder,
}: {
  onRefine: (ctx: string) => Promise<void>
  isRefining: boolean
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [ctx, setCtx] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!ctx.trim() || isRefining) return
    await onRefine(ctx.trim())
    setCtx('')
    setOpen(false)
    setDone(true)
    setTimeout(() => setDone(false), 2500)
  }

  return (
    <div className="border-t border-gray-100 mt-3 pt-3">
      {done ? (
        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
          <span>✓</span> Sección actualizada con tu contexto
        </p>
      ) : (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={isRefining}
            className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 font-medium"
          >
            {isRefining ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Refinando...
              </>
            ) : (
              <>
                <span className="text-blue-400">✨</span>
                {open ? 'Cerrar' : 'Refinar con tu contexto'}
              </>
            )}
          </button>
          {open && !isRefining && (
            <div className="mt-2 space-y-2">
              <textarea
                value={ctx}
                onChange={(e) => setCtx(e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400 resize-none bg-white placeholder-gray-400 text-gray-700"
              />
              <button
                onClick={handleSubmit}
                disabled={!ctx.trim()}
                className="text-xs font-semibold px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Actualizar esta sección →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── ResearchCard ──────────────────────────────────────────────────────────────

function ResearchCard({
  config,
  value,
  isLoading,
  isRefining,
  onChange,
  onRefine,
}: {
  config: CardConfig
  value: string | string[] | undefined
  isLoading: boolean
  isRefining: boolean
  onChange: (v: string | string[]) => void
  onRefine: (ctx: string) => Promise<void>
}) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-base">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight">{config.label}</p>
          <p className="text-xs text-gray-400">{config.description}</p>
        </div>
        {/* Info toggle */}
        <button
          onClick={() => setShowInfo((v) => !v)}
          title={showInfo ? 'Cerrar ayuda' : 'Ver explicación y ejemplo'}
          className={`w-6 h-6 flex items-center justify-center rounded-full border text-xs font-bold transition-colors flex-shrink-0 ${
            showInfo
              ? 'bg-amber-100 border-amber-300 text-amber-700'
              : 'border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50'
          }`}
        >
          ?
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <InfoPanel helpText={config.helpText} helpExample={config.helpExample} />
      )}

      {/* Card body */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-4/5" />
            <div className="h-3 bg-gray-100 rounded w-3/5" />
            {config.type === 'tags' && (
              <div className="flex gap-1.5 mt-2">
                <div className="h-6 bg-gray-100 rounded-full w-20" />
                <div className="h-6 bg-gray-100 rounded-full w-28" />
                <div className="h-6 bg-gray-100 rounded-full w-16" />
              </div>
            )}
          </div>
        ) : config.type === 'text' ? (
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Sin datos aún — generá el análisis o escribí directamente..."
            rows={3}
            className="w-full text-sm text-gray-700 leading-relaxed resize-none outline-none placeholder-gray-300 bg-transparent"
            style={{ minHeight: '64px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
          />
        ) : (
          <TagEditor
            tags={(value as string[]) ?? []}
            onChange={(t) => onChange(t)}
          />
        )}

        <RefinePanel
          onRefine={onRefine}
          isRefining={isRefining}
          placeholder={config.refinePlaceholder}
        />
      </div>
    </div>
  )
}

// ── ThinkingBanner ────────────────────────────────────────────────────────────

function ThinkingBanner({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <svg className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm font-medium text-blue-700 flex-1">
          Analizando el mercado, la competencia y la audiencia…
        </p>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-blue-500 hover:text-blue-700 transition-colors font-medium"
        >
          {expanded ? 'Ocultar razonamiento' : 'Ver razonamiento'}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-3">
          <div className="bg-white rounded-xl p-3 max-h-40 overflow-y-auto border border-blue-100">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-mono">
              {text || '…'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResearcherPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [research, setResearch] = useState<ResearchOutput>(EMPTY_RESEARCH)
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'done'>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [refiningField, setRefiningField] = useState<FieldKey | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [regenerateConfirm, setRegenerateConfirm] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  // Keep a ref to current dna for PATCH merging
  const campaignDnaRef = useRef<Record<string, unknown>>({})

  // ── Stream helper ───────────────────────────────────────────────────────────
  const streamResearch = useCallback(async (
    messages: { role: string; content: string }[],
    onParsed: (data: ResearchOutput) => void,
    onTextChunk?: (chunk: string) => void
  ) => {
    const res = await fetch(`/api/agents/researcher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, messages }),
    })
    if (!res.ok) throw new Error(`Error ${res.status}`)

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
          const p = JSON.parse(d) as { text?: string; error?: string }
          if (p.error) throw new Error(p.error)
          if (p.text) {
            acc += p.text
            onTextChunk?.(acc)
          }
        } catch (e) {
          if (e instanceof Error && !e.message.startsWith('Unexpected token')) throw e
        }
      }
    }

    const parsed = parseResearchOutput(acc)
    if (parsed) onParsed(parsed)
    return parsed
  }, [campaignId])

  // ── Load campaign ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then(({ campaign, error }) => {
        if (error || !campaign) { setLoadError('Campaña no encontrada'); return }
        setCampaignName(campaign.name || '')
        campaignDnaRef.current = (campaign.campaign_dna ?? {}) as Record<string, unknown>

        const existing = campaign.campaign_dna?.research as ResearchOutput | undefined
        if (existing && (existing.marketSize || existing.mainCompetitors?.length)) {
          setResearch({ ...EMPTY_RESEARCH, ...existing })
          setGenerationState('done')
        } else {
          // Auto-generate on first visit
          handleGenerate()
        }
      })
      .catch(() => setLoadError('Error al cargar la campaña'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  // ── Auto-save to DB (silent, no navigation) ──────────────────────────────────
  const autoSave = useCallback(async (data: ResearchOutput) => {
    const updatedDna = { ...campaignDnaRef.current, research: data }
    try {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_dna: updatedDna, status: 'researcher' }),
      })
      campaignDnaRef.current = updatedDna
      setHasChanges(false)
    } catch { /* silent */ }
  }, [campaignId])

  // ── Generate all sections ────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerationState('generating')
    setStreamingText('')
    setRegenerateConfirm(false)
    try {
      await streamResearch(
        [], // empty → researcher auto-starts with full analysis
        async (parsed) => {
          const full = { ...EMPTY_RESEARCH, ...parsed }
          setResearch(full)
          setGenerationState('done')
          // Auto-save immediately so a page refresh doesn't lose the data
          await autoSave(full)
        },
        (accText) => setStreamingText(accText)
      )
    } catch (e) {
      setGenerationState('done')
      setLoadError(e instanceof Error ? e.message : 'Error al generar')
    }
  }, [streamResearch, autoSave])

  // ── Refine single field ──────────────────────────────────────────────────────
  const handleRefine = useCallback(async (fieldKey: FieldKey, userContext: string) => {
    setRefiningField(fieldKey)
    try {
      // Pass the current value so the AI enriches it instead of replacing it
      const currentValue = research[fieldKey]
      const currentStr = Array.isArray(currentValue)
        ? currentValue.length > 0 ? currentValue.join(' | ') : '(vacío)'
        : (currentValue as string) || '(vacío)'

      const targetMsg = `El análisis actual del campo '${fieldKey}' es:\n"${currentStr}"\n\nEl usuario agrega este contexto adicional: "${userContext}".\n\nMantené lo que ya estaba bien, incorporá la nueva información y enriquecé ese campo. Incluí el bloque research-output completo al final.`
      await streamResearch(
        [{ role: 'user', content: targetMsg }],
        async (parsed) => {
          const updated = { ...research, [fieldKey]: parsed[fieldKey] }
          setResearch(updated)
          // Auto-save after each refine too
          await autoSave(updated)
        }
      )
    } finally {
      setRefiningField(null)
    }
  }, [streamResearch, research, autoSave])

  // ── Save & navigate ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await autoSave(research)
      router.push(`/campaigns/${campaignId}/agent/copywriter`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }, [campaignId, research, router, autoSave])

  const updateField = useCallback((key: FieldKey, value: string | string[]) => {
    setResearch((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{loadError}</div>
      </div>
    )
  }

  const isGenerating = generationState === 'generating'
  const isDone = generationState === 'done'

  const renderCard = (cfg: CardConfig) => (
    <ResearchCard
      key={cfg.key}
      config={cfg}
      value={research[cfg.key]}
      isLoading={isGenerating}
      isRefining={refiningField === cfg.key}
      onChange={(v) => updateField(cfg.key, v)}
      onRefine={(ctx) => handleRefine(cfg.key, ctx)}
    />
  )

  return (
    <div className="max-w-6xl mx-auto pb-12">

      {/* ── Top bar ── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/campaigns/${campaignId}`)}
            className="text-gray-400 hover:text-gray-700 transition-colors text-sm flex items-center gap-1"
          >
            ← Volver
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-base">🔍</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Agente Investigador</p>
              <p className="text-xs text-gray-400">{campaignName}</p>
            </div>
          </div>
          {/* Step breadcrumb */}
          <div className="hidden sm:flex items-center gap-1.5 ml-4">
            {[
              { label: 'Estrategia', done: true },
              { label: 'Investigación', active: true },
              { label: 'Copy', done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300 text-xs">→</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  step.active ? 'bg-blue-100 text-blue-700' :
                  step.done ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-400'
                }`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Regenerar */}
          {isDone && (
            regenerateConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600 font-medium">¿Perdés el análisis actual?</span>
                <button
                  onClick={handleGenerate}
                  className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                >
                  Sí, regenerar
                </button>
                <button
                  onClick={() => setRegenerateConfirm(false)}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setRegenerateConfirm(true)}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                🔄 Regenerar todo
              </button>
            )
          )}

          {/* Save & continue */}
          <button
            onClick={handleSave}
            disabled={!isDone || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              isDone
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:opacity-90 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                {hasChanges && isDone && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 inline-block" />}
                💾 Guardar y continuar →
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Thinking banner ── */}
      {isGenerating && <ThinkingBanner text={streamingText} />}

      {/* ── Initial loading (before first generation starts) ── */}
      {generationState === 'idle' && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Iniciando análisis de mercado…</p>
          </div>
        </div>
      )}

      {/* ── Cards grid ── */}
      {generationState !== 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
          {/* Left column */}
          <div className="space-y-4">
            {LEFT_CARDS.map(renderCard)}
          </div>
          {/* Right column */}
          <div className="space-y-4">
            {RIGHT_CARDS.map(renderCard)}

            {/* Tip card */}
            {isDone && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">💡 Tips para el análisis</p>
                <ul className="space-y-1.5 text-xs text-blue-700 leading-relaxed">
                  <li>• <strong>Editá directamente</strong> cualquier sección — el análisis es tuyo</li>
                  <li>• Usá <strong>"Refinar con tu contexto"</strong> para agregar info que solo vos sabés</li>
                  <li>• Sumá o quitá tags en las secciones de lista</li>
                  <li>• Cuando estés conforme, <strong>guardá y pasá al Copywriter</strong></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
