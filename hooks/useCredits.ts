'use client'

import { useState, useEffect, useCallback } from 'react'

interface CreditInfo {
  balance: number
  plan: string
  monthly_limit: number
  used_this_month: number
}

interface UseCreditsReturn {
  balance: number
  plan: string
  monthlyLimit: number
  usedThisMonth: number
  isLoading: boolean
  error: string | null
  hasCredits: boolean
  canAfford: (estimatedCost: number) => boolean
  fetchCredits: () => Promise<void>
  deductCredits: (amount: number, reason: string, metadata?: Record<string, unknown>) => Promise<void>
}

export function useCredits(): UseCreditsReturn {
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    balance: 0,
    plan: 'free',
    monthly_limit: 100,
    used_this_month: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCredits = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/credits')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar créditos')
      }

      const data = await response.json()
      setCreditInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar créditos')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deductCredits = useCallback(async (
    amount: number,
    reason: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          reason,
          metadata
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al deducir créditos')
      }

      const data = await response.json()
      setCreditInfo(prev => ({
        ...prev,
        balance: data.balance_after,
        used_this_month: prev.used_this_month + amount
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al deducir créditos')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const canAfford = useCallback((estimatedCost: number): boolean => {
    return creditInfo.balance >= estimatedCost
  }, [creditInfo.balance])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  return {
    balance: creditInfo.balance,
    plan: creditInfo.plan,
    monthlyLimit: creditInfo.monthly_limit,
    usedThisMonth: creditInfo.used_this_month,
    isLoading,
    error,
    hasCredits: creditInfo.balance > 0,
    canAfford,
    fetchCredits,
    deductCredits
  }
}
