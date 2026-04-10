'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Campaign } from '@/types'

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')

  useEffect(() => {
    loadCampaign()
  }, [campaignId])

  const loadCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`)
      if (!response.ok) {
        throw new Error('Error al cargar campaña')
      }
      const data = await response.json()
      setCampaign(data.campaign)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleStartAgent = (agentType: string) => {
    router.push(`/campaigns/${campaignId}/agent/${agentType}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error || 'Campaña no encontrada'}
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Vista general', icon: '📊' },
    { id: 'strategy', label: 'Estrategia', icon: '🎯' },
    { id: 'research', label: 'Investigación', icon: '🔍' },
    { id: 'copy', label: 'Copywriting', icon: '✍️' },
    { id: 'dna', label: 'ADN', icon: '🧬' },
  ]

  const agentStages = [
    {
      id: 'strategist',
      name: 'Estratega',
      icon: '🎯',
      description: 'Define la estrategia de marketing',
      status: campaign.status === 'intake' ? 'pending' : 'completed',
    },
    {
      id: 'researcher',
      name: 'Investigador',
      icon: '🔍',
      description: 'Investiga mercado y competencia',
      status: 'pending',
    },
    {
      id: 'copywriter',
      name: 'Copywriter',
      icon: '✍️',
      description: 'Crea los mensajes y contenido',
      status: 'pending',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          <span>←</span> Volver a campañas
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-600 mt-1">
              Creada el{' '}
              {new Date(campaign.created_at).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                campaign.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : ['strategist', 'researcher', 'copywriter'].includes(campaign.status)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {campaign.status === 'completed'
                ? 'Completada'
                : ['strategist', 'researcher', 'copywriter'].includes(campaign.status)
                ? 'En progreso'
                : 'Pendiente'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Información inicial</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    Idea de negocio
                  </h3>
                  <p className="text-gray-900">
                    {campaign.intake_data?.businessIdea || 'No especificada'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    Audiencia objetivo
                  </h3>
                  <p className="text-gray-900">
                    {campaign.intake_data?.targetAudience || 'No especificada'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    Objetivos
                  </h3>
                  <p className="text-gray-900">
                    {campaign.intake_data?.goals || 'No especificados'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Progreso de agentes</h2>
              <div className="space-y-4">
                {agentStages.map((agent, index) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                          agent.status === 'completed'
                            ? 'bg-green-100'
                            : agent.status === 'pending'
                            ? 'bg-gray-100'
                            : 'bg-blue-100'
                        }`}
                      >
                        {agent.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {agent.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleStartAgent(agent.id)}
                      variant={
                        agent.status === 'completed' ? 'secondary' : 'primary'
                      }
                      disabled={index > 0 && agentStages[index - 1].status !== 'completed'}
                    >
                      {agent.status === 'completed' ? 'Ver resultado' : 'Iniciar'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'strategy' && (
        <Card>
          <div className="p-6 text-center py-12">
            <span className="text-6xl mb-4 block">🎯</span>
            <h3 className="text-xl font-semibold mb-2">Estrategia</h3>
            <p className="text-gray-600 mb-4">
              Completá el trabajo con el Agente Estratega para ver los
              resultados aquí
            </p>
            <Button onClick={() => handleStartAgent('strategist')} variant="primary">
              Iniciar Estratega
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'research' && (
        <Card>
          <div className="p-6 text-center py-12">
            <span className="text-6xl mb-4 block">🔍</span>
            <h3 className="text-xl font-semibold mb-2">Investigación</h3>
            <p className="text-gray-600 mb-4">
              Completá el trabajo con el Agente Investigador para ver los
              resultados aquí
            </p>
            <Button onClick={() => handleStartAgent('researcher')} variant="primary">
              Iniciar Investigador
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'copy' && (
        <Card>
          <div className="p-6 text-center py-12">
            <span className="text-6xl mb-4 block">✍️</span>
            <h3 className="text-xl font-semibold mb-2">Copywriting</h3>
            <p className="text-gray-600 mb-4">
              Completá el trabajo con el Agente Copywriter para ver los
              resultados aquí
            </p>
            <Button onClick={() => handleStartAgent('copywriter')} variant="primary">
              Iniciar Copywriter
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'dna' && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">ADN de campaña</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 overflow-x-auto">
                {JSON.stringify(campaign.campaign_dna, null, 2)}
              </pre>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
