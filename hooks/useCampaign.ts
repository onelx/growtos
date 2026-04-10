'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useCampaignStore } from '@/lib/campaignStore'
import { Campaign, CampaignStatus, IntakeData, CampaignDNA } from '@/types'

interface UseCampaignReturn {
  campaigns: Campaign[]
  activeCampaign: Campaign | null
  total: number
  isLoading: boolean
  error: string | null
  fetchCampaigns: () => Promise<void>
  createCampaign: (name: string, intakeData: IntakeData) => Promise<Campaign>
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<Campaign>
  deleteCampaign: (id: string) => Promise<void>
  setActiveCampaign: (campaign: Campaign | null) => void
  updateCampaignDNA: (dna: Partial<CampaignDNA>) => void
}

export function useCampaign(): UseCampaignReturn {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { activeCampaign, setActiveCampaign, updateDNA } = useCampaignStore()

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/campaigns')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar campañas')
      }

      const data = await response.json()
      setCampaigns(data.campaigns)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar campañas')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createCampaign = useCallback(async (name: string, intakeData: IntakeData): Promise<Campaign> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          intake_data: intakeData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear campaña')
      }

      const campaign = await response.json()
      setCampaigns(prev => [campaign, ...prev])
      setTotal(prev => prev + 1)
      setActiveCampaign(campaign)
      
      return campaign
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear campaña')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [setActiveCampaign])

  const updateCampaign = useCallback(async (id: string, updates: Partial<Campaign>): Promise<Campaign> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar campaña')
      }

      const updatedCampaign = await response.json()
      
      setCampaigns(prev => 
        prev.map(c => c.id === id ? updatedCampaign : c)
      )
      
      if (activeCampaign?.id === id) {
        setActiveCampaign(updatedCampaign)
      }
      
      return updatedCampaign
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar campaña')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [activeCampaign, setActiveCampaign])

  const deleteCampaign = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar campaña')
      }

      setCampaigns(prev => prev.filter(c => c.id !== id))
      setTotal(prev => prev - 1)
      
      if (activeCampaign?.id === id) {
        setActiveCampaign(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar campaña')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [activeCampaign, setActiveCampaign])

  const updateCampaignDNA = useCallback((dna: Partial<CampaignDNA>) => {
    updateDNA(dna)
  }, [updateDNA])

  return {
    campaigns,
    activeCampaign,
    total,
    isLoading,
    error,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    setActiveCampaign,
    updateCampaignDNA
  }
}
