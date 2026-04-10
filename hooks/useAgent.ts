'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AgentType, ChatMessage, AgentOutput } from '@/types'

interface UseAgentReturn {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  sendMessage: (content: string, agentType: AgentType, campaignId: string) => Promise<void>
  executeAgent: (agentType: AgentType, campaignId: string, inputContext: Record<string, unknown>) => Promise<AgentOutput>
  sendFeedback: (agentType: AgentType, outputId: string, feedback: string) => Promise<void>
  clearMessages: () => void
}

export function useAgent(): UseAgentReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const sendMessage = useCallback(async (
    content: string,
    agentType: AgentType,
    campaignId: string
  ): Promise<void> => {
    try {
      setIsLoading(true)
      setIsStreaming(true)
      setError(null)

      // Agregar mensaje del usuario
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        agent_output_id: '',
        role: 'user',
        content,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])

      // Crear mensaje vacío para el asistente
      const assistantMessageId = crypto.randomUUID()
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        agent_output_id: '',
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Iniciar streaming
      abortControllerRef.current = new AbortController()

      const response = await fetch(`/api/agents/${agentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          message: content
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al comunicarse con el agente')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No se pudo iniciar el streaming')
      }

      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === 'content') {
                accumulatedContent += parsed.content
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                )
              } else if (parsed.type === 'complete') {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, agent_output_id: parsed.output_id }
                      : msg
                  )
                )
              }
            } catch (parseError) {
              console.error('Error al parsear chunk:', parseError)
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Solicitud cancelada')
      } else {
        setError(err instanceof Error ? err.message : 'Error al enviar mensaje')
      }
      throw err
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [])

  const executeAgent = useCallback(async (
    agentType: AgentType,
    campaignId: string,
    inputContext: Record<string, unknown>
  ): Promise<AgentOutput> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/agents/${agentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          input_context: inputContext
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al ejecutar agente')
      }

      const output: AgentOutput = await response.json()
      return output
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar agente')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sendFeedback = useCallback(async (
    agentType: AgentType,
    outputId: string,
    feedback: string
  ): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/agents/${agentType}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          output_id: outputId,
          feedback
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar feedback')
      }

      // Agregar mensaje de feedback a la conversación
      const feedbackMessage: ChatMessage = {
        id: crypto.randomUUID(),
        agent_output_id: outputId,
        role: 'user',
        content: feedback,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, feedbackMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar feedback')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    executeAgent,
    sendFeedback,
    clearMessages
  }
}
