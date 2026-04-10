'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BiasEntry {
  tactic: string
  copy: string
  channel: string
}

interface BiasesOutput {
  confirmationBias: BiasEntry
  authorityBias: BiasEntry
  scarcityBias: BiasEntry
  anchoringBias: BiasEntry
  commitmentBias: BiasEntry
  haloBias: BiasEntry
  bandwagonBias: BiasEntry
  contrastBias: BiasEntry
  sunkCostBias: BiasEntry
}

type BiasKey = keyof BiasesOutput

const EMPTY_BIAS: BiasEntry = { tactic: '', copy: '', channel: '' }

const EMPTY_BIASES: BiasesOutput = {
  confirmationBias: { ...EMPTY_BIAS },
  authorityBias:    { ...EMPTY_BIAS },
  scarcityBias:     { ...EMPTY_BIAS },
  anchoringBias:    { ...EMPTY_BIAS },
  commitmentBias:   { ...EMPTY_BIAS },
  haloBias:         { ...EMPTY_BIAS },
  bandwagonBias:    { ...EMPTY_BIAS },
  contrastBias:     { ...EMPTY_BIAS },
  sunkCostBias:     { ...EMPTY_BIAS },
}

interface BiasConfig {
  key: BiasKey
  label: string
  icon: string
  tagColor: string
  description: string
  helpText: string
  helpExample: string
  refinePlaceholder: string
}

const BIASES: BiasConfig[] = [
  {
    key: 'confirmationBias',
    label: 'Sesgo de Confirmación',
    icon: '🔍',
    tagColor: 'purple',
    description: 'Presentá info que refuerce lo que el cliente ya cree',
    helpText: 'Las personas buscan información que confirme sus creencias previas y la ponderan más que la que las contradice. En ventas, esto significa que si tu cliente ya cree que "las agencias son caras y no rinden", podés confirmar esa creencia y posicionarte como la alternativa que siempre supieron que existía.',
    helpExample: 'Si tu audiencia ya desconfía de las agencias, un copy como "Lo que siempre sospechaste de las agencias es verdad — por eso creamos GrowthOS" activa este sesgo con fuerza.',
    refinePlaceholder: 'Ej: Nuestros clientes ya probaron otras herramientas y quedaron frustrados. La creencia más común es que "el marketing digital es complicado"...',
  },
  {
    key: 'authorityBias',
    label: 'Sesgo de Autoridad',
    icon: '🏆',
    tagColor: 'blue',
    description: 'Usá expertos, datos y credenciales para generar confianza',
    helpText: 'Las personas aceptamos más fácilmente opiniones y recomendaciones de quienes percibimos como autoridades. Esto incluye expertos reconocidos, datos estadísticos, casos de éxito con nombres reales, premios, cobertura mediática o incluso el tamaño de tu base de clientes.',
    helpExample: '"Más de 1.200 emprendedores ya usan GrowthOS" o "Recomendado por los principales referentes de marketing digital de Argentina" activan autoridad por volumen social y por asociación de expertos.',
    refinePlaceholder: 'Ej: Tenemos testimonios de Fulano (10K seguidores) y estadísticas propias. También salimos en una nota de Infobae...',
  },
  {
    key: 'scarcityBias',
    label: 'Sesgo de Escasez',
    icon: '⏳',
    tagColor: 'red',
    description: 'Creá urgencia real — limitá acceso, tiempo o cupos',
    helpText: 'Valoramos más lo que percibimos como escaso o que podemos perder. El truco está en que la escasez tiene que ser REAL — la escasez falsa destruye la confianza cuando el cliente la detecta. Podés usar limitación de tiempo (oferta de lanzamiento), de cupos (grupos con límite) o de acceso (versión beta, lista de espera).',
    helpExample: '"Abrimos solo 30 lugares en la próxima cohorte — quedan 8 disponibles" es más poderoso que "oferta por tiempo limitado" porque combina escasez numérica con exclusividad.',
    refinePlaceholder: 'Ej: Nuestro servicio tiene capacidad real para 50 clientes por mes. También lanzamos en cohortes de 20 personas cada 6 semanas...',
  },
  {
    key: 'anchoringBias',
    label: 'Sesgo de Anclaje',
    icon: '⚓',
    tagColor: 'cyan',
    description: 'Establecé el precio de referencia antes de revelar tu oferta',
    helpText: 'La primera cifra que vemos se convierte en el "ancla" con la que comparamos todo lo que viene después. En precios, esto significa que si primero mostrás el costo de la alternativa (una agencia: $2.000 USD/mes), tu precio ($97/mes) parece extraordinariamente bajo, aunque no lo compares directamente.',
    helpExample: '"Una agencia de marketing en Argentina cobra entre $800 y $2.000 USD por mes — sin garantías. GrowthOS te da las mismas herramientas por $97/mes, con vos al volante."',
    refinePlaceholder: 'Ej: El precio de referencia de la competencia es $X. Nuestro precio es $Y. También vendemos planes anuales vs mensuales...',
  },
  {
    key: 'commitmentBias',
    label: 'Sesgo de Compromiso',
    icon: '🤝',
    tagColor: 'green',
    description: 'Llevá al cliente a pequeños "síes" antes del gran sí',
    helpText: 'Una vez que alguien toma una decisión pequeña, tiene una tendencia fuerte a ser consistente con ella. En ventas, esto se llama "pie en la puerta": primero pedís un microcompromiso (suscribirse gratis, responder una pregunta, probar 7 días), y ese acto genera identidad — la persona empieza a verse como alguien que usa tu producto.',
    helpExample: '"Empezá gratis hoy — sin tarjeta, sin compromiso. Solo respondé 3 preguntas sobre tu negocio y te mostramos qué podés mejorar esta semana." El cuestionario crea compromiso antes de cualquier venta.',
    refinePlaceholder: 'Ej: Tenemos una prueba gratis de 14 días. También hacemos onboarding con una sesión de diagnóstico gratis para validar si somos una buena opción...',
  },
  {
    key: 'haloBias',
    label: 'Efecto Halo',
    icon: '✨',
    tagColor: 'amber',
    description: 'Una característica estelar irradia al producto entero',
    helpText: 'Tendemos a juzgar el total de algo basándonos en una sola característica sobresaliente. Si destacás UN atributo muy positivo y concreto, el consumidor asume que todo lo demás también es excelente. El truco es elegir la característica que más le importa a tu audiencia específica.',
    helpExample: 'Apple presenta el iPhone como "el más rápido del mercado" y la gente asume que también es el mejor en diseño, cámara y durabilidad, aunque no lo haya comprobado. Tu producto necesita su "el más rápido".',
    refinePlaceholder: 'Ej: Nuestra característica más fuerte es el soporte 24/7 en español. Los clientes también destacan mucho la facilidad de uso en las reseñas...',
  },
  {
    key: 'bandwagonBias',
    label: 'Sesgo de Bandwagon',
    icon: '🚂',
    tagColor: 'orange',
    description: 'Si todos lo usan, debe ser bueno — la prueba social escala',
    helpText: 'La gente tiende a adoptar creencias y comportamientos que percibe como mayoritarios. No es necesario tener miles de clientes — basta con mostrar evidencia de que "muchos ya eligieron esto". Números, nombres, comunidades, testimonios y logos de clientes activan este sesgo.',
    helpExample: '"Más de 1.200 emprendedores de Argentina ya usan GrowthOS" o "Usada por emprendedores de Mercado Libre, Tienda Nube y PedidosYa" activan bandwagon por volumen y por asociación de marca.',
    refinePlaceholder: 'Ej: Tenemos 340 clientes activos, 90% renueva. Algunos son de marcas conocidas como X e Y. También tenemos un grupo de WhatsApp con 600 miembros...',
  },
  {
    key: 'contrastBias',
    label: 'Sesgo de Contraste',
    icon: '⚖️',
    tagColor: 'teal',
    description: 'Al lado de la peor opción, tu producto brilla solo',
    helpText: 'Percibimos el valor de algo en relación a con qué lo comparamos, no en términos absolutos. Si presentás tu producto junto a una alternativa claramente inferior (o al costo del problema sin resolver), tu oferta parece extraordinariamente valiosa. La clave es elegir el contraste correcto.',
    helpExample: '"Una agencia te cobra $2.000 USD/mes sin garantías. GrowthOS te da las mismas herramientas por $97/mes, vos al volante." El contraste hace que $97 parezca ridículamente barato, aunque en absoluto no lo sea.',
    refinePlaceholder: 'Ej: El alternativa más cara es X a $Y/mes. También hay una versión manual (hojas de cálculo + freelancers) que les cuesta mucho tiempo...',
  },
  {
    key: 'sunkCostBias',
    label: 'Costo Hundido',
    icon: '💸',
    tagColor: 'rose',
    description: 'Lo invertido genera compromiso — usalo para retener y upgradear',
    helpText: 'Las personas tendemos a continuar invirtiendo en algo porque ya invertimos antes, aunque racionalmente no tenga sentido. En marketing, esto se usa éticamente para aumentar retención, reducir churn y motivar upgrades: el cliente ya invirtió tiempo/datos/dinero, cancelar se siente como "perder todo eso".',
    helpExample: 'Cuando un usuario completó su perfil, cargó su historial y configuró sus campañas, cancelar GrowthOS significa perder todo ese trabajo. Un recordatorio de "ya tenés X campañas configuradas" activa este sesgo antes de que cancele.',
    refinePlaceholder: 'Ej: Nuestros usuarios invierten tiempo en configurar su cuenta los primeros 7 días. También cargamos datos históricos de sus campañas anteriores...',
  },
]

// 5 left, 4 right (with tip card on right)
const LEFT_BIASES = BIASES.slice(0, 5)
const RIGHT_BIASES = BIASES.slice(5)

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseBiasesOutput(text: string): BiasesOutput | null {
  const match = text.match(/```biases-output\s*([\s\S]*?)\s*```/)
  if (!match) return null
  try { return JSON.parse(match[1]) as BiasesOutput } catch { return null }
}

const TAG_COLORS: Record<string, string> = {
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  blue:   'bg-blue-50 text-blue-700 border-blue-100',
  red:    'bg-red-50 text-red-600 border-red-100',
  cyan:   'bg-cyan-50 text-cyan-700 border-cyan-100',
  green:  'bg-green-50 text-green-700 border-green-100',
  amber:  'bg-amber-50 text-amber-700 border-amber-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
  teal:   'bg-teal-50 text-teal-700 border-teal-100',
  rose:   'bg-rose-50 text-rose-700 border-rose-100',
}

const ACCENT_COLORS: Record<string, string> = {
  purple: 'from-purple-500 to-indigo-600',
  blue:   'from-blue-500 to-sky-600',
  red:    'from-red-500 to-orange-500',
  cyan:   'from-cyan-500 to-teal-600',
  green:  'from-green-500 to-emerald-600',
  amber:  'from-amber-400 to-yellow-500',
  orange: 'from-orange-500 to-amber-600',
  teal:   'from-teal-500 to-cyan-600',
  rose:   'from-rose-500 to-pink-600',
}

const COPY_BG: Record<string, string> = {
  purple: 'bg-purple-50 border-purple-100',
  blue:   'bg-blue-50 border-blue-100',
  red:    'bg-red-50 border-red-100',
  cyan:   'bg-cyan-50 border-cyan-100',
  green:  'bg-green-50 border-green-100',
  amber:  'bg-amber-50 border-amber-100',
  orange: 'bg-orange-50 border-orange-100',
  teal:   'bg-teal-50 border-teal-100',
  rose:   'bg-rose-50 border-rose-100',
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
        <p className="text-xs text-green-600 font-medium flex items-center gap-1">✓ Sección actualizada</p>
      ) : (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={isRefining}
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium"
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
              <><span className="text-indigo-400">✨</span>{open ? 'Cerrar' : 'Refinar con tu contexto'}</>
            )}
          </button>
          {open && !isRefining && (
            <div className="mt-2 space-y-2">
              <textarea
                value={ctx}
                onChange={(e) => setCtx(e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 resize-none bg-white placeholder-gray-400 text-gray-700"
              />
              <button
                onClick={handleSubmit}
                disabled={!ctx.trim()}
                className="text-xs font-semibold px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Actualizar este sesgo →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── BiasCard ──────────────────────────────────────────────────────────────────

function BiasCard({
  config,
  entry,
  isLoading,
  isRefining,
  onChange,
  onRefine,
}: {
  config: BiasConfig
  entry: BiasEntry
  isLoading: boolean
  isRefining: boolean
  onChange: (field: keyof BiasEntry, value: string) => void
  onRefine: (ctx: string) => Promise<void>
}) {
  const [showInfo, setShowInfo] = useState(false)
  const tagCls = TAG_COLORS[config.tagColor] ?? TAG_COLORS.purple
  const copyBgCls = COPY_BG[config.tagColor] ?? COPY_BG.purple
  const accentCls = ACCENT_COLORS[config.tagColor] ?? ACCENT_COLORS.purple

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${accentCls} flex items-center gap-2`}>
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm leading-tight">{config.label}</p>
          <p className="text-xs text-white/70">{config.description}</p>
        </div>
        <button
          onClick={() => setShowInfo((v) => !v)}
          title={showInfo ? 'Cerrar ayuda' : 'Ver explicación y ejemplo'}
          className={`w-6 h-6 flex items-center justify-center rounded-full border text-xs font-bold transition-colors flex-shrink-0 ${
            showInfo
              ? 'bg-white/30 border-white/50 text-white'
              : 'border-white/40 text-white/70 hover:bg-white/20 hover:text-white'
          }`}
        >
          ?
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <InfoPanel helpText={config.helpText} helpExample={config.helpExample} />
      )}

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="space-y-1.5">
              <div className="h-2.5 bg-gray-100 rounded w-16" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-4/5" />
            </div>
            <div className="h-14 bg-gray-100 rounded-xl" />
            <div className="h-6 bg-gray-100 rounded-full w-24" />
          </div>
        ) : (
          <>
            {/* Tactic */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Táctica</p>
              <textarea
                value={entry.tactic}
                onChange={(e) => onChange('tactic', e.target.value)}
                placeholder="La IA generará una táctica específica para esta campaña..."
                rows={2}
                className="w-full text-sm text-gray-700 leading-relaxed resize-none outline-none placeholder-gray-300 bg-transparent"
                onInput={(e) => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = el.scrollHeight + 'px'
                }}
              />
            </div>

            {/* Copy example */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Copy de ejemplo</p>
              <div className={`rounded-xl border p-3 ${copyBgCls}`}>
                <textarea
                  value={entry.copy}
                  onChange={(e) => onChange('copy', e.target.value)}
                  placeholder="Ejemplo de copy listo para usar..."
                  rows={2}
                  className="w-full text-sm text-gray-700 leading-relaxed resize-none outline-none placeholder-gray-400 bg-transparent italic"
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = el.scrollHeight + 'px'
                  }}
                />
              </div>
            </div>

            {/* Channel */}
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Canal</p>
              {entry.channel ? (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${tagCls}`}>
                  {entry.channel}
                </span>
              ) : (
                <input
                  value={entry.channel}
                  onChange={(e) => onChange('channel', e.target.value)}
                  placeholder="Ej: Landing page, email, Instagram"
                  className="flex-1 text-xs px-2.5 py-1 border border-gray-200 rounded-lg outline-none focus:border-indigo-300 bg-white placeholder-gray-300"
                />
              )}
              {entry.channel && (
                <button
                  onClick={() => onChange('channel', '')}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✏️
                </button>
              )}
            </div>
          </>
        )}

        <RefinePanel onRefine={onRefine} isRefining={isRefining} placeholder={config.refinePlaceholder} />
      </div>
    </div>
  )
}

// ── ThinkingBanner ────────────────────────────────────────────────────────────

function ThinkingBanner({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <svg className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm font-medium text-indigo-700 flex-1">Analizando sesgos cognitivos para esta campaña…</p>
        <button onClick={() => setExpanded((e) => !e)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
          {expanded ? 'Ocultar' : 'Ver razonamiento'}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-3">
          <div className="bg-white rounded-xl p-3 max-h-40 overflow-y-auto border border-indigo-100">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-mono">{text || '…'}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BiasesPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [biases, setBiases] = useState<BiasesOutput>(EMPTY_BIASES)
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'done'>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [refiningKey, setRefiningKey] = useState<BiasKey | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [regenerateConfirm, setRegenerateConfirm] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  const campaignDnaRef = useRef<Record<string, unknown>>({})

  // ── Stream helper ─────────────────────────────────────────────────────────
  const streamBiases = useCallback(async (
    messages: { role: string; content: string }[],
    onParsed: (data: BiasesOutput) => void,
    onTextChunk?: (text: string) => void
  ) => {
    const res = await fetch('/api/agents/biases', {
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
          if (p.text) { acc += p.text; onTextChunk?.(acc) }
        } catch (e) {
          if (e instanceof Error && !e.message.startsWith('Unexpected token')) throw e
        }
      }
    }

    const parsed = parseBiasesOutput(acc)
    if (parsed) onParsed(parsed)
    return parsed
  }, [campaignId])

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const autoSave = useCallback(async (data: BiasesOutput) => {
    const updatedDna = { ...campaignDnaRef.current, biases: data }
    try {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_dna: updatedDna }),
      })
      campaignDnaRef.current = updatedDna
      setHasChanges(false)
    } catch { /* silent */ }
  }, [campaignId])

  // ── Load campaign ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then(({ campaign, error }) => {
        if (error || !campaign) { setLoadError('Campaña no encontrada'); return }
        setCampaignName(campaign.name || '')
        campaignDnaRef.current = (campaign.campaign_dna ?? {}) as Record<string, unknown>

        const existing = campaign.campaign_dna?.biases as BiasesOutput | undefined
        if (existing?.confirmationBias?.tactic) {
          setBiases({ ...EMPTY_BIASES, ...existing })
          setGenerationState('done')
        } else {
          handleGenerate()
        }
      })
      .catch(() => setLoadError('Error al cargar la campaña'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerationState('generating')
    setStreamingText('')
    setRegenerateConfirm(false)
    try {
      await streamBiases(
        [],
        async (parsed) => {
          const full = { ...EMPTY_BIASES, ...parsed }
          setBiases(full)
          setGenerationState('done')
          await autoSave(full)
        },
        (text) => setStreamingText(text)
      )
    } catch (e) {
      setGenerationState('done')
      setLoadError(e instanceof Error ? e.message : 'Error al generar')
    }
  }, [streamBiases, autoSave])

  // ── Refine single bias ────────────────────────────────────────────────────
  const handleRefine = useCallback(async (biasKey: BiasKey, userContext: string) => {
    setRefiningKey(biasKey)
    try {
      const current = biases[biasKey]
      const targetMsg = `El análisis actual del sesgo '${biasKey}' es:
Táctica: "${current.tactic}"
Copy: "${current.copy}"
Canal: "${current.channel}"

El usuario agrega este contexto: "${userContext}".
Mantené lo que estaba bien, enriquecé con la nueva información. Incluí el bloque biases-output completo al final.`

      await streamBiases(
        [{ role: 'user', content: targetMsg }],
        async (parsed) => {
          const updated = { ...biases, [biasKey]: parsed[biasKey] }
          setBiases(updated)
          await autoSave(updated)
        }
      )
    } finally {
      setRefiningKey(null)
    }
  }, [streamBiases, biases, autoSave])

  // ── Field edit ────────────────────────────────────────────────────────────
  const updateField = useCallback((biasKey: BiasKey, field: keyof BiasEntry, value: string) => {
    setBiases((prev) => ({ ...prev, [biasKey]: { ...prev[biasKey], [field]: value } }))
    setHasChanges(true)
  }, [])

  // ── Save & navigate ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await autoSave(biases)
      router.push(`/campaigns/${campaignId}`)
    } finally {
      setIsSaving(false)
    }
  }, [autoSave, biases, campaignId, router])

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{loadError}</div>
      </div>
    )
  }

  const isGenerating = generationState === 'generating'
  const isDone = generationState === 'done'

  const renderCard = (cfg: BiasConfig) => (
    <BiasCard
      key={cfg.key}
      config={cfg}
      entry={biases[cfg.key]}
      isLoading={isGenerating}
      isRefining={refiningKey === cfg.key}
      onChange={(field, val) => updateField(cfg.key, field, val)}
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
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-base">🧠</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Agente de Sesgos Cognitivos</p>
              <p className="text-xs text-gray-400">{campaignName}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDone && (
            regenerateConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600 font-medium">¿Regenerar y perder cambios?</span>
                <button onClick={handleGenerate} className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600">Sí, regenerar</button>
                <button onClick={() => setRegenerateConfirm(false)} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setRegenerateConfirm(true)} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">
                🔄 Regenerar todo
              </button>
            )
          )}

          <button
            onClick={handleSave}
            disabled={!isDone || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              isDone ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Guardando...</>
            ) : (
              <>{hasChanges && isDone && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 inline-block" />}💾 Guardar análisis</>
            )}
          </button>
        </div>
      </div>

      {/* Intro banner */}
      {isDone && (
        <div className="mb-5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <p className="font-semibold text-indigo-900 text-sm">Análisis de sesgos cognitivos aplicados a ventas</p>
            <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
              Cada sesgo tiene una táctica específica para esta campaña, un ejemplo de copy listo para usar y el canal donde tiene más impacto.
              Podés editar cada campo directamente o usar "Refinar" para agregar contexto propio.
            </p>
          </div>
        </div>
      )}

      {/* Thinking banner */}
      {isGenerating && <ThinkingBanner text={streamingText} />}

      {/* Initial loading */}
      {generationState === 'idle' && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Iniciando análisis de sesgos cognitivos…</p>
          </div>
        </div>
      )}

      {/* Cards grid */}
      {generationState !== 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: 3 cards */}
          <div className="space-y-4">
            {LEFT_BIASES.map(renderCard)}
          </div>
          {/* Right: 2 cards + tip */}
          <div className="space-y-4">
            {RIGHT_BIASES.map(renderCard)}

            {isDone && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">⚠️ Uso ético de sesgos</p>
                <ul className="space-y-2 text-xs text-indigo-700 leading-relaxed">
                  <li>• Los sesgos funcionan mejor cuando <strong>refuerzan valor real</strong>, no cuando lo exageran</li>
                  <li>• La escasez falsa se detecta fácilmente y destruye confianza</li>
                  <li>• La autoridad se construye — necesitás pruebas reales, no afirmaciones vacías</li>
                  <li>• El compromiso debe ser un proceso genuino, no una trampa de ventas</li>
                  <li>• Usá el copy generado como base — ajustalo a tu voz y contexto real</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
