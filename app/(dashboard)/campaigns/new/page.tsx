'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

interface FormData {
  businessIdea: string
  targetAudience: string
  uniqueValue: string
  goals: string
  constraints: string
  timeline: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FormData>({
    businessIdea: '',
    targetAudience: '',
    uniqueValue: '',
    goals: '',
    constraints: '',
    timeline: '',
  })

  const totalSteps = 3

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.businessIdea.slice(0, 50) || 'Nueva campaña',
          intake_data: {
            businessName: data.businessIdea.slice(0, 50) || 'Nueva campaña',
            businessDescription: data.businessIdea,
            targetAudience: data.targetAudience,
            goals: data.goals.split(',').map((g) => g.trim()).filter(Boolean),
            constraints: data.constraints,
            timeline: data.timeline,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear campaña')
      }

      const result = await response.json()
      router.push(`/campaigns/${result.campaign.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear campaña')
      setLoading(false)
    }
  }

  const isStepValid = () => {
    switch (step) {
      case 1:
        return data.businessIdea.length >= 10 && data.targetAudience.length >= 10
      case 2:
        return data.uniqueValue.length >= 10 && data.goals.length >= 10
      case 3:
        return data.timeline.length > 0
      default:
        return false
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          <span>←</span> Volver
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Nueva campaña</h1>
        <p className="text-gray-600 mt-1">
          Completá estos pasos para que nuestros agentes puedan crear tu
          campaña de marketing
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Paso {step} de {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((step / totalSteps) * 100)}% completado
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Contanos sobre tu negocio
                </h2>
                <p className="text-gray-600 mb-6">
                  Necesitamos entender tu idea para crear una campaña efectiva
                </p>
              </div>

              <Input
                label="¿Cuál es tu idea de negocio?"
                type="textarea"
                value={data.businessIdea}
                onChange={(e) =>
                  setData({ ...data, businessIdea: e.target.value })
                }
                placeholder="Ej: Una app para conectar dueños de perros con paseadores confiables..."
                rows={4}
                required
              />

              <Input
                label="¿Quién es tu audiencia objetivo?"
                type="textarea"
                value={data.targetAudience}
                onChange={(e) =>
                  setData({ ...data, targetAudience: e.target.value })
                }
                placeholder="Ej: Profesionales ocupados de 28-45 años con perros en áreas urbanas..."
                rows={3}
                required
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Valor y objetivos
                </h2>
                <p className="text-gray-600 mb-6">
                  ¿Qué te hace único y qué querés lograr?
                </p>
              </div>

              <Input
                label="¿Qué te diferencia de la competencia?"
                type="textarea"
                value={data.uniqueValue}
                onChange={(e) =>
                  setData({ ...data, uniqueValue: e.target.value })
                }
                placeholder="Ej: Verificación de identidad + GPS en tiempo real + seguro incluido..."
                rows={3}
                required
              />

              <Input
                label="¿Cuáles son tus objetivos principales?"
                type="textarea"
                value={data.goals}
                onChange={(e) => setData({ ...data, goals: e.target.value })}
                placeholder="Ej: Conseguir 100 usuarios beta, validar demanda, crear awareness..."
                rows={3}
                required
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Restricciones y tiempos
                </h2>
                <p className="text-gray-600 mb-6">
                  Últimos detalles para optimizar tu campaña
                </p>
              </div>

              <Input
                label="¿Tenés alguna restricción o limitación?"
                type="textarea"
                value={data.constraints}
                onChange={(e) =>
                  setData({ ...data, constraints: e.target.value })
                }
                placeholder="Ej: Presupuesto limitado, sin equipo técnico, operación en una sola ciudad..."
                rows={3}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Cuándo querés lanzar la campaña?
                </label>
                <select
                  value={data.timeline}
                  onChange={(e) => setData({ ...data, timeline: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  required
                >
                  <option value="">Seleccioná un plazo</option>
                  <option value="1-2-weeks">1-2 semanas</option>
                  <option value="3-4-weeks">3-4 semanas</option>
                  <option value="1-2-months">1-2 meses</option>
                  <option value="3-months">3+ meses</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={handleBack}
              variant="ghost"
              disabled={step === 1 || loading}
            >
              Anterior
            </Button>

            <Button
              onClick={handleNext}
              variant="primary"
              disabled={!isStepValid() || loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creando...
                </span>
              ) : step === totalSteps ? (
                'Crear campaña'
              ) : (
                'Siguiente'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
