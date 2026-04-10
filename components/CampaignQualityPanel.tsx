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

export interface QualityPanelProps {
  intakeData?: IntakeData
  campaignDna?: CampaignDNA
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
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

// ── Quality computation ───────────────────────────────────────────────────────

interface QualityResult {
  level: 1 | 2 | 3 | 4
  levelName: string
  levelColor: string
  overallScore: number
  dims: { id: string; label: string; score: number }[]
  blockers: string[]
  warnings: { text: string; prompt: string }[]
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

  const overallScore = Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length)
  const criticalAvg = Math.round((negocio + audiencia + estrategia) / 3)

  const level: 1 | 2 | 3 | 4 =
    overallScore >= 70 && criticalAvg >= 60 ? 4 :
    overallScore >= 50 && criticalAvg >= 40 ? 3 :
    overallScore >= 25 ? 2 : 1

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

  // Blockers
  const blockers: string[] = []
  if (negocio < 30) blockers.push('La descripción del negocio es muy vaga para trabajar')
  if (audiencia < 30) blockers.push('No está definida la audiencia ni su dolor principal')
  if (estrategia < 30 && (dna?.strategy)) blockers.push('La estrategia está incompleta — falta posicionamiento claro')

  // Warnings
  const warnings: { text: string; prompt: string }[] = []
  if (investigacion < 50 && investigacion > 0) {
    warnings.push({
      text: 'Falta profundidad en la investigación de mercado y competencia',
      prompt: 'Profundizá el análisis competitivo: ¿quiénes son los 3 principales competidores y cuál es nuestra ventaja real sobre ellos?',
    })
  }
  if (propuestaValor < 50) {
    warnings.push({
      text: 'La propuesta de valor no está suficientemente diferenciada',
      prompt: 'Trabajemos en la propuesta de valor única: ¿qué hace que este negocio sea iremplazable para su audiencia? Dame opciones concretas.',
    })
  }
  if (copy < 50 && copy > 0) {
    warnings.push({
      text: 'El copy necesita más desarrollo para conectar con la audiencia',
      prompt: 'El copy necesita más fuerza. Generá 3 variantes del tagline y 5 headlines que conecten emocionalmente con los dolores de la audiencia.',
    })
  }
  if (canales < 40) {
    warnings.push({
      text: 'Los canales de distribución no están claros',
      prompt: 'Definamos los canales: ¿dónde está nuestra audiencia exactamente y qué canales priorizan para llegar a ella con el menor costo?',
    })
  }
  if (metricas < 30) {
    warnings.push({
      text: 'Faltan métricas concretas para medir el éxito',
      prompt: 'Definamos métricas de éxito concretas: ¿cuántos leads por mes es el objetivo? ¿Cuál sería un CPL (costo por lead) aceptable para este negocio?',
    })
  }

  // Next step
  const lowestCritical = dims
    .filter((d) => ['negocio', 'audiencia', 'estrategia'].includes(d.id))
    .sort((a, b) => a.score - b.score)[0]

  const lowestOverall = [...dims].sort((a, b) => a.score - b.score)[0]

  let nextStep: { text: string; prompt: string } | null = null

  if (level === 1) {
    if (negocio < 30) {
      nextStep = {
        text: 'Describí tu negocio con más detalle: qué problema resuelve y para quién exactamente',
        prompt: 'Necesito que me hagas más preguntas sobre el negocio. Quiero entender mejor el problema que resuelve y para quién lo resuelve.',
      }
    } else if (audiencia < 30) {
      nextStep = {
        text: 'Definí tu audiencia exacta y cuál es su dolor principal',
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
      text: `Mejorá ${lowestCritical.label.toLowerCase()} — es el área más débil de la campaña`,
      prompt: `Quiero mejorar el área de ${lowestCritical.label.toLowerCase()}. Revisá lo que tenemos y proponé cómo fortalecerlo con ejemplos concretos.`,
    }
  } else if (level === 3) {
    nextStep = {
      text: `Reforzá ${lowestOverall.label.toLowerCase()} para llegar al nivel 4`,
      prompt: `Para subir la campaña al nivel 4, necesitamos reforzar ${lowestOverall.label.toLowerCase()}. ¿Qué le falta y cómo lo completamos?`,
    }
  } else {
    nextStep = {
      text: 'La campaña está lista — podés generar el plan de medios y el copy final',
      prompt: 'La campaña está en nivel 4. Hacé un resumen ejecutivo de todo lo que se definió y las acciones concretas para los próximos 30 días.',
    }
  }

  return { level, levelName, levelColor, overallScore, dims, blockers, warnings, nextStep }
}

// ── Dimension bar ─────────────────────────────────────────────────────────────

function DimBar({ label, score }: { label: string; score: number }) {
  const pct = score
  const color =
    score >= 70 ? 'from-green-400 to-emerald-500' :
    score >= 40 ? 'from-yellow-400 to-orange-400' :
    score > 0 ? 'from-red-400 to-pink-500' :
    'from-gray-200 to-gray-300'
  const textColor =
    score >= 70 ? 'text-green-600' :
    score >= 40 ? 'text-yellow-600' :
    score > 0 ? 'text-red-500' :
    'text-gray-400'

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-600 font-medium">{label}</span>
        <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>{score}</span>
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

export default function CampaignQualityPanel({
  intakeData,
  campaignDna,
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
              style={{ width: `${q.overallScore}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums opacity-80">{q.overallScore}/100</span>
        </div>
      </div>

      {/* Dimensions */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Dimensiones
        </p>
        {q.dims.map((d) => (
          <DimBar key={d.id} label={d.label} score={d.score} />
        ))}
      </div>

      {/* Blockers */}
      {q.blockers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
            🚫 Bloqueadores
          </p>
          {q.blockers.map((b, i) => (
            <p key={i} className="text-xs text-red-700 leading-relaxed">{b}</p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {q.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-3">
          <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-widest">
            ⚠️ Advertencias
          </p>
          {q.warnings.map((w, i) => (
            <div key={i} className="space-y-1.5">
              <p className="text-xs text-yellow-800 leading-relaxed">{w.text}</p>
              {onSendPrompt && (
                <button
                  onClick={() => onSendPrompt(w.prompt)}
                  className="text-[11px] font-semibold text-yellow-700 border border-yellow-300 rounded-lg px-2.5 py-1 hover:bg-yellow-100 transition-colors"
                >
                  ✦ Proponer solución
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Next step */}
      {q.nextStep && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            → Próximo paso
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

      {/* Level 3+ unlock message */}
      {q.level >= 3 && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3">
          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2">
            🔓 Desbloqueado
          </p>
          <p className="text-xs text-purple-700 leading-relaxed">
            La campaña tiene suficiente estructura. Podés continuar con el Investigador y el Copywriter para generar el copy y plan de medios final.
          </p>
        </div>
      )}
    </div>
  )
}
