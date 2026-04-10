'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAgent } from '@/hooks/useAgent'
import { useCredits } from '@/hooks/useCredits'
import { AgentType } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AgentChatPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const agentType = params.agentType as string

  const { balance: credits, isLoading: creditsLoading, deductCredits } = useCredits()
  const { sendMessage, isStreaming: streaming, messages: agentMessages } = useAgent()

  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const messages = localMessages

  const agentConfig: Record<string, { name: string; icon: string; intro: string }> = {
    strategist: {
      name: 'Agente Estratega',
      icon: '🎯',
      intro: 'Hola! Soy tu Agente Estratega. Voy a ayudarte a definir la estrategia de marketing para tu campaña. Empecemos analizando tu idea de negocio...',
    },
    researcher: {
      name: 'Agente Investigador',
      icon: '🔍',
      intro: 'Hola! Soy tu Agente Investigador. Voy a analizar el mercado, la competencia y las oportunidades para tu negocio. Preparate para insights profundos...',
    },
    copywriter: {
      name: 'Agente Copywriter',
      icon: '✍️',
      intro: 'Hola! Soy tu Agente Copywriter. Voy a crear los mensajes y el contenido que conecte con tu audiencia. Creemos algo memorable...',
    },
  }

  const agent = agentConfig[agentType] || {
    name: 'Agente',
    icon: '🤖',
    intro: 'Hola! ¿En qué puedo ayudarte?',
  }

  useEffect(() => {
    setLocalMessages([
      {
        id: '1',
        role: 'assistant',
        content: agent.intro,
        timestamp: new Date(),
      },
    ])
  }, [agentType])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim() || streaming) return

    if (credits < 10) {
      alert('No tenés suficientes créditos. Necesitás al menos 10 créditos.')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setLocalMessages((prev) => [...prev, userMessage])
    const currentInput = input.trim()
    setInput('')

    try {
      await sendMessage(currentInput, agentType as AgentType, campaignId)

      // Sync the last assistant message from the hook
      const lastAgentMsg = agentMessages[agentMessages.length - 1]
      if (lastAgentMsg?.role === 'assistant') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: lastAgentMsg.content,
          timestamp: new Date(),
        }
        setLocalMessages((prev) => [...prev, assistantMessage])
      }

      await deductCredits(10, 'agent_message')
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intentá de nuevo.',
        timestamp: new Date(),
      }
      setLocalMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-200px)] flex flex-col">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/campaigns/${campaignId}`)}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          <span>←</span> Volver a campaña
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-3xl">
            {agent.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
            <p className="text-gray-600">Trabajando en tu campaña</p>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}

          {(streaming) && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribí tu mensaje..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
              rows={2}
              disabled={streaming}
            />
            <Button
              onClick={handleSend}
              variant="primary"
              disabled={!input.trim() || streaming || credits < 10}
              className="self-end"
            >
              Enviar
            </Button>
          </div>
          {credits < 10 && (
            <p className="text-sm text-red-600 mt-2">
              No tenés suficientes créditos para continuar
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
