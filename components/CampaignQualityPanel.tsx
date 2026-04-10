'use client'

import { useMemo } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface IntakeData {
  businessName?: string
  businessDescription?: string
  targetAudience?: string
  goals?: string[]
  constraints?: string
  timeline?: string
}

interface CampaignDNA {
  strategy?: {
    positioning?: string
    uniqueValueProp?: string
    campaignConcept?: string
    recommendedChannels?: string[]
    messagingPillars?: string[]
    keyMessages?: string[]
    targetSegments?: string[]
  }
  research?: {
    marketSize?: string
    competitiveAdvantage?: string
    mainCompetitors?: string[]
    audiencePainPoints?: string[]
    marketTrends?: string[]
    opportunities?: string[]
    risks?: string[]
  }
  copy?: {
    tagline?: string
    tone?: string
    headlines?: string[]
    ctas?: string[]
    emailSubjects?: string[]
    socialPosts?: string[]
  }
}

type AgentOwner = 'strategist' | 'researcher' | 'copywriter'

export interface QualityPanelProps {
  intakeData?: IntakeData
  campaignDna?: CampaignDNA
  currentAgentType?: AgentOwner
  onSendPrompt?: (text: string) => void
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

function strScore(v: unknown, weights = { present: 5, long: 3, veryLong: 2 }): number {
  if (!v || typeof v !== 'string' || v.trim().length === 0) return 0
  let s = weights.present
  if (v.length > 60) s += weights.long
  if (v.length > 150) s += weights.veryLong
  return Math.min(s, 10)
}

function arrScore(v: unknown, weights = { one: 4, two: 3, three: 3 }): number {
  if (!Array.isArray(v) || v.length === 0) return 0
  let s = weights.one
  if (v.length >= 2) s += weights.two
  if (v.length >= 3) s += weights.three
  return Math.min(s, 10)
}

function avg(...scores: number[]): number {
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}

// ── Quality computation ───────────────────────────────────────────────────────

interface QualityResult {
  level: 1 | 2 | 3 | 4
  levelName: string
  levelColor: string
  overallScore: number
  dims: { id: string; label: string; score: number }[]
  strengths: string[]
  gaps: { text: string; prompt: string; agentOwner: AgentOwner }[]
  consequence: string | null
  nextStep: { text: string; prompt: string } | null
}

function computeQuality(intakeData?: IntakeData, dna?: CampaignDNA): QualityResult {
  const s = dna?.strategy ?? {}
  const r = dna?.research ?? {}
  const c = dna?.copy ?? {}
  const i = intakeData ?? {}

  const negocio = avg(
    strScore(i.businessName, { present: 3, long: 3, veryLong: 4 }),
    strScore(i.businessDescription, { present: 3, long: 4, veryLong: 3 }),
    arrScore(i.goals),
  )

  const audiencia = avg(
    strScore(i.targetAudience, { present: 4, long: 3, veryLong: 3 }),
    arrScore(s.targetSegments, { one: 4, two: 3, three: 3 }),
    arrScore(r.audiencePainPoints, { one: 3, two: 4, three: 3 }),
  )

  const estrategia = avg(
    strScore(s.positioning, { present: 4, long: 3, veryLong: 3 }),
    strScore(s.uniqueValueProp, { present: 4, long: 3, veryLong: 3 }),
    strScore(s.campaignConcept, { present: 3, long: 4, veryLong: 3 }),
    arrScore(s.keyMessages),
  )

  const investigacion = avg(
    strScore(r.marketSize, { present: 4, long: 3, veryLong: 3 }),
    strScore(r.competitiveAdvantage, { present: 4, long: 3, veryLong: 3 }),
    arrScore(r.mainCompetitors),
    arrScore(r.opportunities),
  )

  const propuestaValor = avg(
    strScore(s.uniqueValueProp, { present: 4, long: 3, veryLong: 3 }),
    strScore(c.tagline, { present: 5, long: 3, veryLong: 2 }),
    arrScore(s.messagingPillars),
  )

  const copy = avg(
    strScore(c.tagline, { present: 4, long: 3, veryLong: 3 }),
    arrScore(c.headlines),
    arrScore(c.ctas),
    arrScore(c.socialPosts, { one: 3, two: 4, three: 3 }),
  )

  const canales = avg(
    arrScore(s.recommendedChannels),
    arrScore(c.emailSubjects),
    strScore(s.campaignConcept, { present: 3, long: 4, veryLong: 3 }),
  )

  const metricas = avg(
    arrScore(i.goals, { one: 4, two: 3, three: 3 }),
    strScore(i.timeline, { present: 5, long: 3, veryLong: 2 }),
    arrScore(r.marketTrends),
  )

  const dims = [
    { id: 'negocio', label: 'Negocio', score: negocio },
    { id: 'audiencia', label: 'Audiencia', score: audiencia },
    { id: 'estrategia', label: 'Estrategia', score: estrategia },
    { id: 'investigacion', label: 'Investigación', score: investigacion },
    { id: 'propuestaValor', label: 'Propuesta de valor', score: propuestaValor },
    { id: 'copy', label: 'Copy', score: copy },
    { id: 'canales', label: 'Canales', score: canales },
    { id: 'metricas', label: 'Métricas', score: metricas },
  ]

  const overallScore = Math.round((dims.reduce((a, d) => a + d.score, 0) / dims.length) * 10) / 10
  const criticalAvg = Math.round(((negocio + audiencia + estrategia) / 3) * 10) / 10

  const level: 1 | 2 | 3 | 4 =
    overallScore >= 7 && criticalAvg >= 6 ? 4 :
    overallScore >= 5 && criticalAvg >= 4 ? 3 :
    overallScore >= 2.5 ? 2 : 1

  const levelName =
    level === 4 ? 'Lista para ejecutar' :
    level === 3 ? 'Idea estructurada' :
    level === 2 ? 'Idea entendible' :
    'Idea vaga'

  const levelColor =
    level === 4 ? 'bg-green-100 text-green-700 border-green-200' :
    level === 3 ? 'bg-blue-100 text-blue-700 border-blue-200' :
    level === 2 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
    'bg-red-100 text-red-700 border-red-200'

  // ── Qué está bien hoy ────────────────────────────────────────────────────────
  const strengths: string[] = []
  if (negocio >= 6) strengths.push('El negocio y el problema que resuelve están bien definidos')
  if (audiencia >= 6) strengths.push('La audiencia objetivo y sus dolores están identificados')
  if (estrategia >= 6) strengths.push('Hay una estrategia y posicionamiento claros')
  if (investigacion >= 6) strengths.push('La investigación de mercado y competencia está completa')
  if (propuestaValor >= 6) strengths.push('La propuesta de valor está diferenciada')
  if (copy >= 6) strengths.push('El copy tiene fuerza para conectar con la audiencia')
  if (canales >= 6) strengths.push('Los canales de distribución están definidos')
  if (metricas >= 6) strengths.push('Hay métricas y objetivos concretos para medir el éxito')
  if (strengths.length === 0) {
    if (negocio > 0) strengths.push('El negocio está describiendo — hay material para trabajar')
    else strengths.push('Estás en el inicio — cada respuesta suma definición a la campaña')
  }

  // ── Qué falta resolver ───────────────────────────────────────────────────────
  const gaps: { text: string; prompt: string; agentOwner: AgentOwner }[] = []
  if (negocio < 4) {
    gaps.push({
      text: 'La descripción del negocio necesita más profundidad',
      prompt: 'Necesito que me hagas más preguntas sobre el negocio para entender mejor el problema que resuelve y para quién.',
      agentOwner: 'strategist',
    })
  }
  if (audiencia < 4) {
    gaps.push({
      text: 'La audiencia no está suficientemente definida',
      prompt: 'Profundizá sobre mi audiencia objetivo: quiénes son exactamente, qué los frustra y qué desean lograr.',
      agentOwner: 'strategist',
    })
  }
  if (estrategia < 4 && negocio >= 4) {
    gaps.push({
      text: 'Falta posicionamiento claro y mensajes clave',
      prompt: 'Trabajemos en el posicionamiento: ¿cómo queremos que nos perciba la audiencia vs la competencia? Dame 3 opciones de posicionamiento.',
      agentOwner: 'strategist',
    })
  }
  if (investigacion < 5 && negocio >= 4) {
    gaps.push({
      text: 'La investigación competitiva está incompleta',
      prompt: 'Generá el análisis completo: tamaño de mercado, los 3 principales competidores, pain points de la audiencia y la gran oportunidad. Incluí el bloque research-output al final.',
      agentOwner: 'researcher',
    })
  }
  if (propuestaValor < 5 && estrategia >= 4) {
    gaps.push({
      text: 'La propuesta de valor no está diferenciada todavía',
      prompt: 'Trabajemos en la propuesta de valor única: ¿qué hace que este negocio sea irremplazable para su audiencia? Dame opciones concretas.',
      agentOwner: 'strategist',
    })
  }
  if (copy < 4 && estrategia >= 5) {
    gaps.push({
      text: 'El copy no está desarrollado — falta tagline y mensajes',
      prompt: 'Generá el copy base: tagline principal, 5 headlines y 3 CTAs que conecten con los dolores de la audiencia. Incluí el bloque copy-output al final.',
      agentOwner: 'copywriter',
    })
  }
  if (canales < 4 && estrategia >= 4) {
    gaps.push({
      text: 'No están definidos los canales de distribución',
      prompt: 'Definamos los canales: ¿dónde está la audiencia y qué canales priorizar para llegar con el menor costo posible?',
      agentOwner: 'strategist',
    })
  }
  if (metricas < 3 && negocio >= 4) {
    gaps.push({
      text: 'Faltan métricas concretas de éxito',
      prompt: 'Definamos métricas concretas: ¿cuántos leads por mes es el objetivo? ¿Cuál sería un CPL aceptable para este negocio?',
      agentOwner: 'researcher',
    })
  }

  // ── Qué pasa si no se resuelve ───────────────────────────────────────────────
  let consequence: string | null = null
  const topGap = gaps[0]
  if (topGap) {
    if (negocio < 4) {
      consequence = 'Sin claridad sobre el negocio, todos los agentes van a trabajar sobre suposiciones — el copy y la estrategia van a fallar cuando se ejecuten.'
    } else if (audiencia < 4) {
      consequence = 'Sin audiencia definida, el mensaje va a hablarle a todos y no va a resonar con nadie. El presupuesto de ads se gasta sin conversiones.'
    } else if (estrategia < 4) {
      consequence = 'Sin posicionamiento claro, la campaña no va a diferenciarse de la competencia — va a parecer genérica y no va a generar confianza.'
    } else if (investigacion < 5) {
      consequence = 'Sin investigación, la estrategia se basa en suposiciones. Un competidor que conoce mejor a la audiencia te va a ganar sin esfuerzo.'
    } else if (propuestaValor < 5) {
      consequence = 'Sin propuesta de valor diferenciada, el cliente no entiende por qué elegirte a vos y no a otro. La tasa de conversión va a ser baja.'
    } else if (copy < 4) {
      consequence = 'Sin copy sólido, la campaña no puede ejecutarse. Los anuncios sin mensaje claro tienen CTR bajo y costo por clic alto.'
    } else if (canales < 4) {
      consequence = 'Sin canales definidos, no hay plan de distribución real. La campaña existe en papel pero no puede llegar a nadie.'
    } else {
      consequence = 'Sin métricas claras, no vas a saber si la campaña está funcionando hasta que sea tarde para ajustar.'
    }
  }

  // ── Próximo paso recomendado ─────────────────────────────────────────────────
  const lowestCritical = dims
    .filter((d) => ['negocio', 'audiencia', 'estrategia'].includes(d.id))
    .sort((a, b) => a.score - b.score)[0]

  const lowestOverall = [...dims].sort((a, b) => a.score - b.score)[0]

  let nextStep: { text: string; prompt: string } | null = null

  if (level === 1) {
    if (negocio < 3) {
      nextStep = {
        text: 'Contá más sobre el negocio y el problema que resuelve',
        prompt: 'Necesito que me hagas más preguntas sobre el negocio. Quiero entender mejor el problema que resuelve y para quién lo resuelve.',
      }
    } else if (audiencia < 3) {
      nextStep = {
        text: 'Definí la audiencia y su dolor principal',
        prompt: 'Profundizá sobre mi audiencia objetivo. Haceme preguntas para entender quiénes son exactamente, qué los frustra y qué desean lograr.',
      }
    } else {
      nextStep = {
        text: 'Desarrollá el concepto central de la campaña',
        prompt: 'Necesito desarrollar el concepto central de la campaña. ¿Cuál sería la gran idea que va a unificar todos los mensajes?',
      }
    }
  } else if (level === 2) {
    nextStep = {
      text: `Reforzá ${lowestCritical.label.toLowerCase()} — es el área más débil ahora`,
      prompt: `Quiero mejorar el área de ${lowestCritical.label.toLowerCase()}. Revisá lo que tenemos y proponé cómo fortalecerlo con ejemplos concretos.`,
    }
  } else if (level === 3) {
    nextStep = {
      text: `Completá ${lowestOverall.label.toLowerCase()} para llegar al nivel 4`,
      prompt: `Para subir la campaña al nivel 4, necesitamos completar ${lowestOverall.label.toLowerCase()}. ¿Qué le falta y cómo lo terminamos?`,
    }
  } else {
    nextStep = {
      text: 'La campaña está lista — generá el plan de medios y el copy final',
      prompt: 'La campaña está en nivel 4. Hacé un resumen ejecutivo con todo lo definido y las acciones concretas para los próximos 30 días.',
    }
  }

  return { level, levelName, levelColor, overallScore, dims, strengths, gaps, consequence, nextStep }
}

// ── Dimension bar ─────────────────────────────────────────────────────────────

function DimBar({ label, score }: { label: string; score: number }) {
  const pct = score * 10
  const color =
    score >= 7 ? 'from-green-400 to-emerald-500' :
    score >= 4 ? 'from-yellow-400 to-orange-400' :
    score > 0 ? 'from-red-400 to-pink-500' :
    'from-gray-200 to-gray-300'
  const textColor =
    score >= 7 ? 'text-green-600' :
    score >= 4 ? 'text-yellow-600' :
    score > 0 ? 'text-red-500' :
    'text-gray-400'

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-600 font-medium">{label}</span>
        <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>{score.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const AGENT_LABEL: Record<AgentOwner, string> = {
  strategist: 'Estratega',
  researcher: 'Investigador',
  copywriter: 'Copywriter',
}

export default function CampaignQualityPanel({
  intakeData,
  campaignDna,
  currentAgentType,
  onSendPrompt,
}: QualityPanelProps) {
  const q = useMemo(
    () => computeQuality(intakeData, campaignDna),
    [intakeData, campaignDna],
  )

  const levelDot =
    q.level === 4 ? 'bg-green-500' :
    q.level === 3 ? 'bg-blue-500' :
    q.level === 2 ? 'bg-yellow-500' :
    'bg-red-500'

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pb-4">

      {/* Level badge */}
      <div className={`rounded-xl border px-4 py-3 ${q.levelColor}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${levelDot}`} />
          <span className="text-xs font-bold uppercase tracking-widest">
            Nivel {q.level} — {q.levelName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-current rounded-full transition-all duration-700 opacity-60"
              style={{ width: `${q.overallScore * 10}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums opacity-80">{q.overallScore.toFixed(1)}/10</span>
        </div>
      </div>

      {/* Quick action — generate analysis now (researcher with no data) */}
      {currentAgentType === 'researcher' && !campaignDna?.research && onSendPrompt && (
        <div className="bg-blue-600 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-white">📊 Sin datos de investigación todavía</p>
          <p className="text-[11px] text-blue-100 leading-relaxed">
            El agente no guardó ningún análisis aún. Pedíselo ahora.
          </p>
          <button
            onClick={() => onSendPrompt('Generá el análisis completo ahora: mercado, competencia, audiencia y oportunidad. Incluí el bloque research-output al final.')}
            className="w-full text-xs font-bold text-blue-700 bg-white rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
          >
            Generar análisis ahora →
          </button>
        </div>
      )}

      {/* Quick action — generate copy (copywriter with no data) */}
      {currentAgentType === 'copywriter' && !campaignDna?.copy && onSendPrompt && (
        <div className="bg-pink-600 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-white">✍️ Sin copy generado todavía</p>
          <p className="text-[11px] text-pink-100 leading-relaxed">
            El agente no guardó ningún copy aún. Pedíselo ahora.
          </p>
          <button
            onClick={() => onSendPrompt('Generá el copy completo ahora: tagline, headlines, CTAs y posts. Incluí el bloque copy-output al final.')}
            className="w-full text-xs font-bold text-pink-700 bg-white rounded-lg px-3 py-2 hover:bg-pink-50 transition-colors"
          >
            Generar copy ahora →
          </button>
        </div>
      )}

      {/* Dimensions — compact */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Dimensiones
        </p>
        {q.dims.map((d) => (
          <DimBar key={d.id} label={d.label} score={d.score} />
        ))}
      </div>

      {/* ✅ Qué está bien hoy */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
        <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">
          ✅ Qué está bien hoy
        </p>
        <ul className="space-y-1.5">
          {q.strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 shrink-0">·</span>
              <span className="text-xs text-green-800 leading-relaxed">{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ⚠️ Qué falta resolver */}
      {q.gaps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
            ⚠️ Qué falta resolver
          </p>
          {q.gaps.slice(0, 4).map((g, i) => {
            const isCurrentAgent = !currentAgentType || g.agentOwner === currentAgentType
            return (
              <div key={i} className="space-y-1.5">
                <p className="text-xs text-amber-800 leading-relaxed">{g.text}</p>
                {isCurrentAgent && onSendPrompt ? (
                  <button
                    onClick={() => onSendPrompt(g.prompt)}
                    className="text-[11px] font-semibold text-amber-700 border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-100 transition-colors"
                  >
                    Resolver esto →
                  </button>
                ) : currentAgentType && !isCurrentAgent ? (
                  <p className="text-[11px] text-amber-500 italic">
                    Lo resuelve el Agente {AGENT_LABEL[g.agentOwner]}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* 🔥 Qué pasa si no se resuelve */}
      {q.consequence && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
            🔥 Qué pasa si no se resuelve
          </p>
          <p className="text-xs text-orange-800 leading-relaxed">{q.consequence}</p>
        </div>
      )}

      {/* → Próximo paso recomendado */}
      {q.nextStep && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            → Próximo paso recomendado
          </p>
          <p className="text-xs text-blue-800 leading-relaxed">{q.nextStep.text}</p>
          {onSendPrompt && (
            <button
              onClick={() => onSendPrompt(q.nextStep!.prompt)}
              className="w-full text-xs font-semibold text-white bg-blue-600 rounded-lg px-3 py-2 hover:bg-blue-700 transition-colors"
            >
              Trabajar en esto →
            </button>
          )}
        </div>
      )}

      {/* Nivel 4 unlock */}
      {q.level >= 3 && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3">
          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1.5">
            🔓 Desbloqueado
          </p>
          <p className="text-xs text-purple-700 leading-relaxed">
            La campaña tiene estructura sólida. Podés continuar con el Investigador y el Copywriter.
          </p>
        </div>
      )}
    </div>
  )
}
