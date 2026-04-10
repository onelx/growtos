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

interface StrategyData {
  positioning?: string
  uniqueValueProp?: string
  campaignConcept?: string
  recommendedChannels?: string[]
  messagingPillars?: string[]
  keyMessages?: string[]
  targetSegments?: string[]
}

interface ResearchData {
  marketSize?: string
  competitiveAdvantage?: string
  mainCompetitors?: string[]
  audiencePainPoints?: string[]
  marketTrends?: string[]
  opportunities?: string[]
  risks?: string[]
}

interface CopyData {
  tagline?: string
  tone?: string
  headlines?: string[]
  ctas?: string[]
  emailSubjects?: string[]
  socialPosts?: string[]
}

export interface CampaignDNA {
  strategy?: StrategyData
  research?: ResearchData
  copy?: CopyData
}

export interface MemoryPanelProps {
  intakeData?: IntakeData
  campaignDna?: CampaignDNA
  currentAgentType?: 'intake' | 'strategist' | 'researcher' | 'copywriter'
  // Live data being streamed right now
  liveOutput?: Record<string, unknown>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false
  if (Array.isArray(v)) return v.length > 0
  return true
}

function displayValue(v: unknown): string | null {
  if (!hasValue(v)) return null
  if (Array.isArray(v)) return v.slice(0, 3).join(' · ') + (v.length > 3 ? '...' : '')
  return String(v)
}

// ── Section component ─────────────────────────────────────────────────────────

function MemorySection({
  icon,
  title,
  color,
  isActive,
  isLocked,
  fields,
}: {
  icon: string
  title: string
  color: string
  isActive: boolean
  isLocked: boolean
  fields: { label: string; value: unknown }[]
}) {
  const filled = fields.filter((f) => hasValue(f.value)).length
  const total = fields.length

  return (
    <div
      className={`rounded-xl border transition-all duration-300 ${
        isLocked
          ? 'border-gray-100 opacity-40'
          : isActive
          ? 'border-purple-200 shadow-sm'
          : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${
        isActive ? 'bg-gradient-to-r ' + color + ' bg-opacity-10' : 'bg-gray-50'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className={`text-xs font-bold tracking-wide ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
          <span className="text-xs text-gray-400 tabular-nums">{filled}/{total}</span>
        </div>
      </div>

      {/* Fields */}
      {!isLocked && (
        <div className="px-3 py-2 space-y-2">
          {fields.map((field) => {
            const val = displayValue(field.value)
            return (
              <div key={field.label}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                  {field.label}
                </p>
                {val ? (
                  <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{val}</p>
                ) : (
                  <div className="h-3 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {isLocked && (
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-gray-400">🔒 Disponible en siguiente etapa</p>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CampaignMemoryPanel({
  intakeData,
  campaignDna,
  currentAgentType = 'intake',
  liveOutput,
}: MemoryPanelProps) {
  // Merge live output into the appropriate section
  const strategy: StrategyData = useMemo(() => ({
    ...(campaignDna?.strategy ?? {}),
    ...(currentAgentType === 'strategist' && liveOutput ? liveOutput : {}),
  }), [campaignDna?.strategy, currentAgentType, liveOutput])

  const research: ResearchData = useMemo(() => ({
    ...(campaignDna?.research ?? {}),
    ...(currentAgentType === 'researcher' && liveOutput ? liveOutput : {}),
  }), [campaignDna?.research, currentAgentType, liveOutput])

  const copy: CopyData = useMemo(() => ({
    ...(campaignDna?.copy ?? {}),
    ...(currentAgentType === 'copywriter' && liveOutput ? liveOutput : {}),
  }), [campaignDna?.copy, currentAgentType, liveOutput])

  // ── Completion score ────────────────────────────────────────────────────
  const scoreData = useMemo(() => {
    const checks = [
      // Brief (weight 1 each)
      { v: intakeData?.businessName, w: 1 },
      { v: intakeData?.businessDescription, w: 1 },
      { v: intakeData?.targetAudience, w: 2 },
      { v: intakeData?.goals, w: 2 },
      // Strategy (weight 2 each)
      { v: strategy.positioning, w: 2 },
      { v: strategy.uniqueValueProp, w: 3 },
      { v: strategy.campaignConcept, w: 2 },
      { v: strategy.recommendedChannels, w: 1 },
      // Research (weight 2 each)
      { v: research.competitiveAdvantage, w: 2 },
      { v: research.audiencePainPoints, w: 3 },
      { v: research.opportunities, w: 1 },
      // Copy (weight 3 each)
      { v: copy.tagline, w: 3 },
      { v: copy.headlines, w: 2 },
      { v: copy.ctas, w: 2 },
    ]
    const total = checks.reduce((sum, c) => sum + c.w, 0)
    const earned = checks.filter((c) => hasValue(c.v)).reduce((sum, c) => sum + c.w, 0)
    return Math.round((earned / total) * 100)
  }, [intakeData, strategy, research, copy])

  const stageOrder = ['intake', 'strategist', 'researcher', 'copywriter']
  const currentIdx = stageOrder.indexOf(currentAgentType)

  const sections = [
    {
      key: 'intake',
      icon: '📋',
      title: 'BRIEF',
      color: 'from-purple-500 to-indigo-500',
      fields: [
        { label: 'Negocio', value: intakeData?.businessName },
        { label: 'Descripción', value: intakeData?.businessDescription },
        { label: 'Audiencia', value: intakeData?.targetAudience },
        { label: 'Objetivos', value: intakeData?.goals },
        { label: 'Restricciones', value: intakeData?.constraints },
        { label: 'Timeline', value: intakeData?.timeline },
      ],
    },
    {
      key: 'strategist',
      icon: '🎯',
      title: 'ESTRATEGIA',
      color: 'from-indigo-500 to-blue-500',
      fields: [
        { label: 'Posicionamiento', value: strategy.positioning },
        { label: 'Propuesta de valor', value: strategy.uniqueValueProp },
        { label: 'Concepto de campaña', value: strategy.campaignConcept },
        { label: 'Canales', value: strategy.recommendedChannels },
        { label: 'Mensajes clave', value: strategy.keyMessages },
      ],
    },
    {
      key: 'researcher',
      icon: '🔍',
      title: 'INVESTIGACIÓN',
      color: 'from-blue-500 to-cyan-500',
      fields: [
        { label: 'Mercado', value: research.marketSize },
        { label: 'Ventaja competitiva', value: research.competitiveAdvantage },
        { label: 'Pain points', value: research.audiencePainPoints },
        { label: 'Oportunidades', value: research.opportunities },
        { label: 'Competidores', value: research.mainCompetitors },
      ],
    },
    {
      key: 'copywriter',
      icon: '✍️',
      title: 'COPY',
      color: 'from-pink-500 to-rose-500',
      fields: [
        { label: 'Tagline', value: copy.tagline },
        { label: 'Tono', value: copy.tone },
        { label: 'Headlines', value: copy.headlines },
        { label: 'CTAs', value: copy.ctas },
        { label: 'Email subjects', value: copy.emailSubjects },
      ],
    },
  ]

  // Score color
  const scoreColor =
    scoreData >= 75 ? 'text-green-600' :
    scoreData >= 40 ? 'text-yellow-600' :
    'text-gray-400'

  const barColor =
    scoreData >= 75 ? 'from-green-400 to-emerald-500' :
    scoreData >= 40 ? 'from-yellow-400 to-orange-400' :
    'from-purple-400 to-indigo-500'

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pb-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Memoria de campaña
          </p>
          <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
            {scoreData}%
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${scoreData}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          {scoreData < 25 && 'Campaña en definición inicial'}
          {scoreData >= 25 && scoreData < 50 && 'Estrategia en construcción'}
          {scoreData >= 50 && scoreData < 75 && 'Campaña tomando forma'}
          {scoreData >= 75 && scoreData < 100 && 'Campaña casi lista'}
          {scoreData === 100 && '🎉 Campaña completa'}
        </p>
      </div>

      {/* Sections */}
      {sections.map((section, idx) => (
        <MemorySection
          key={section.key}
          icon={section.icon}
          title={section.title}
          color={section.color}
          isActive={currentAgentType === section.key || (section.key === 'intake' && currentAgentType === 'intake')}
          isLocked={idx > currentIdx + 1}
          fields={section.fields}
        />
      ))}
    </div>
  )
}
