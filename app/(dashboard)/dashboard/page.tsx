'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { CampaignCard } from '@/components/CampaignCard'
import type { Campaign } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      if (!response.ok) {
        throw new Error('Error al cargar campañas')
      }
      const data = await response.json()
      setCampaigns(data.campaigns)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta campaña?')) return

    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar campaña')
      }

      setCampaigns(campaigns.filter((c) => c.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tus campañas</h1>
          <p className="text-gray-600 mt-1">
            Gestioná y seguí el progreso de tus campañas de marketing
          </p>
        </div>
        <Button onClick={() => router.push('/campaigns/new')} variant="primary">
          <span className="mr-2">➕</span>
          Nueva campaña
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-brand-orangeTint rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🚀</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Comenzá tu primera campaña
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Transformá tu idea en una campaña de marketing completa con la ayuda
            de nuestros agentes de IA especializados
          </p>
          <Button
            onClick={() => router.push('/campaigns/new')}
            variant="primary"
            className="px-8"
          >
            Crear primera campaña
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onView={(id) => router.push(`/campaigns/${id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
