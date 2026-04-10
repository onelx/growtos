'use client'

import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ProfilePage() {
  const { user } = useAuth()
  const { balance: credits, isLoading: loading } = useCredits()

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Tu perfil</h1>

      <div className="space-y-6">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Información de cuenta</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Plan actual</label>
                <p className="font-medium">Free</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Créditos</h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-purple-600">
                  {loading ? '...' : credits}
                </p>
                <p className="text-sm text-gray-600">Créditos disponibles</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Cada interacción con los agentes consume créditos según el uso de tokens.
            </p>
            <Button variant="primary">Comprar más créditos</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
