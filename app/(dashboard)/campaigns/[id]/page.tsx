'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Campaign } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function Tag({ text }: { text: string }) {
  return (
    <span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium">
      {text}
    </span>
  )
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1.5">
          {(value as string[]).map((v, i) => <Tag key={i} text={v} />)}
        </div>
      ) : (
        <p className="text-gray-800 text-sm leading-relaxed">{String(value)}</p>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
      {children}
    </div>
  )
}

function EmptyState({
  icon, title, description, buttonLabel, onClick,
}: { icon: string; title: string; description: string; buttonLabel: string; onClick: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <span className="text-5xl mb-4 block">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">{description}</p>
      <button
        onClick={onClick}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm"
      >
        {buttonLabel}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(data => setCampaign(data.campaign))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [campaignId])

  const goToAgent = (agentType: string) => router.push(`/campaigns/${campaignId}/agent/${agentType}`)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          {error || 'Campaña no encontrada'}
        </div>
      </div>
    )
  }

  const dna = (campaign.campaign_dna ?? {}) as Record<string, unknown>
  const strategy = dna.strategy as Record<string, unknown> | undefined
  const research  = dna.research  as Record<string, unknown> | undefined
  const copy      = dna.copy      as Record<string, unknown> | undefined
  const intake    = ((campaign.intake_data ?? {}) as unknown) as Record<string, unknown>

  const tabs = [
    { id: 'overview',  label: 'Vista general', icon: '📊' },
    { id: 'strategy',  label: 'Estrategia',    icon: '🎯', done: !!strategy },
    { id: 'research',  label: 'Investigación', icon: '🔍', done: !!research },
    { id: 'copy',      label: 'Copywriting',   icon: '✍️', done: !!copy },
    { id: 'dna',       label: 'ADN',           icon: '🧬' },
  ]

  const biases = dna.biases as Record<string, unknown> | undefined

  const agentStages = [
    { id: 'strategist', name: 'Agente Estratega',          icon: '🎯', color: 'from-purple-500 to-indigo-600', done: !!strategy },
    { id: 'researcher', name: 'Agente Investigador',        icon: '🔍', color: 'from-blue-500 to-cyan-600',    done: !!research },
    { id: 'copywriter', name: 'Agente Copywriter',          icon: '✍️', color: 'from-pink-500 to-rose-600',   done: !!copy },
    { id: 'biases',     name: 'Sesgos Cognitivos',          icon: '🧠', color: 'from-indigo-500 to-purple-600', done: !!biases },
  ]

  return (
    <div className="max-w-5xl mx-auto pb-12">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-500 hover:text-gray-800 mb-4 flex items-center gap-1.5 text-sm transition-colors"
        >
          ← Volver a campañas
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Creada el {new Date(campaign.created_at).toLocaleDateString('es-AR')}
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            campaign.status === 'completed' ? 'bg-green-100 text-green-700' :
            ['strategist','researcher','copywriter'].includes(campaign.status) ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {campaign.status === 'completed' ? 'Completada' :
             ['strategist','researcher','copywriter'].includes(campaign.status) ? 'En progreso' : 'Pendiente'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {'done' in tab && tab.done && (
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Brief */}
          <Section title="Brief de campaña">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Negocio" value={intake.businessName} />
              <Field label="Audiencia" value={intake.targetAudience} />
              <div className="sm:col-span-2">
                <Field label="Descripción" value={intake.businessDescription} />
              </div>
              <Field label="Objetivos" value={intake.goals} />
              <Field label="Timeline" value={intake.timeline} />
            </div>
          </Section>

          {/* Agent progress */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 text-base mb-4">Agentes de trabajo</h3>
            <div className="space-y-3">
              {agentStages.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${agent.color} rounded-full flex items-center justify-center shadow-sm`}>
                      <span className="text-lg">{agent.icon}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{agent.name}</p>
                      <p className="text-xs text-gray-500">
                        {agent.done ? '✓ Completado — datos guardados' : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => goToAgent(agent.id)}
                    className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
                      agent.done
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90'
                    }`}
                  >
                    {agent.done ? 'Continuar →' : 'Iniciar →'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Estrategia ── */}
      {activeTab === 'strategy' && (
        strategy ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Estrategia de campaña</h2>
              <button onClick={() => goToAgent('strategist')} className="text-xs font-semibold px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Seguir trabajando →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section title="Posicionamiento">
                <Field label="" value={strategy.positioning} />
              </Section>
              <Section title="Propuesta de valor única">
                <Field label="" value={strategy.uniqueValueProp} />
              </Section>
              <Section title="Concepto de campaña">
                <Field label="" value={strategy.campaignConcept} />
              </Section>
              <Section title="Canales recomendados">
                <Field label="" value={strategy.recommendedChannels} />
              </Section>
              <Section title="Mensajes clave">
                <Field label="" value={strategy.keyMessages} />
              </Section>
              <Section title="Pilares de messaging">
                <Field label="" value={strategy.messagingPillars} />
              </Section>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="🎯"
            title="Estrategia pendiente"
            description="El Agente Estratega define el posicionamiento, propuesta de valor y concepto de campaña."
            buttonLabel="Iniciar Agente Estratega →"
            onClick={() => goToAgent('strategist')}
          />
        )
      )}

      {/* ── Investigación ── */}
      {activeTab === 'research' && (
        research ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Investigación de mercado</h2>
              <button onClick={() => goToAgent('researcher')} className="text-xs font-semibold px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Seguir investigando →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section title="Tamaño y oportunidad del mercado">
                <Field label="" value={research.marketSize} />
              </Section>
              <Section title="Ventaja competitiva">
                <Field label="" value={research.competitiveAdvantage} />
              </Section>
              <Section title="Competidores principales">
                <Field label="" value={research.mainCompetitors} />
              </Section>
              <Section title="Pain points de la audiencia">
                <Field label="" value={research.audiencePainPoints} />
              </Section>
              <Section title="Oportunidades detectadas">
                <Field label="" value={research.opportunities} />
              </Section>
              <Section title="Tendencias del mercado">
                <Field label="" value={research.marketTrends} />
              </Section>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="🔍"
            title="Investigación pendiente"
            description="El Agente Investigador analiza el mercado, la competencia y los dolores de la audiencia."
            buttonLabel="Iniciar Agente Investigador →"
            onClick={() => goToAgent('researcher')}
          />
        )
      )}

      {/* ── Copywriting ── */}
      {activeTab === 'copy' && (
        copy ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Copy de campaña</h2>
              <button onClick={() => goToAgent('copywriter')} className="text-xs font-semibold px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Seguir con el copy →
              </button>
            </div>

            {/* Tagline destacado */}
            {copy.tagline != null && (
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-center">
                <p className="text-xs font-bold text-purple-200 uppercase tracking-widest mb-2">Tagline principal</p>
                <p className="text-white text-2xl font-bold">"{String(copy.tagline)}"</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section title="Headlines para ads">
                <Field label="" value={copy.headlines} />
              </Section>
              <Section title="CTAs">
                <Field label="" value={copy.ctas} />
              </Section>
              <Section title="Email subjects">
                <Field label="" value={copy.emailSubjects} />
              </Section>
              <Section title="Tono y voz">
                <Field label="" value={copy.tone} />
              </Section>
            </div>

            {/* Social posts */}
            {Array.isArray(copy.socialPosts) && (copy.socialPosts as string[]).length > 0 && (
              <Section title="Posts para redes sociales">
                <div className="space-y-3">
                  {(copy.socialPosts as string[]).map((post, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
                      {post}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        ) : (
          <EmptyState
            icon="✍️"
            title="Copy pendiente"
            description="El Agente Copywriter genera tagline, headlines, CTAs y posts listos para ejecutar."
            buttonLabel="Iniciar Agente Copywriter →"
            onClick={() => goToAgent('copywriter')}
          />
        )
      )}

      {/* ── ADN ── */}
      {activeTab === 'dna' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ADN completo de la campaña</h2>
          <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs text-gray-600 leading-relaxed">
              {JSON.stringify(campaign.campaign_dna, null, 2)}
            </pre>
          </div>
        </div>
      )}

    </div>
  )
}
