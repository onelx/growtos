import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}

function buildSystemPrompt(intake: Record<string, unknown>): string {
  const goals = Array.isArray(intake.goals) ? (intake.goals as string[]).join(', ') : String(intake.goals ?? '')
  return `Sos el Agente Estratega de GrowtOS — experto en estrategia de marketing con 20 años de experiencia trabajando con startups y empresas de alto crecimiento.

BRIEF DE CAMPAÑA:
Negocio: ${intake.businessName ?? ''}
Descripción: ${intake.businessDescription ?? ''}
Audiencia objetivo: ${intake.targetAudience ?? ''}
Objetivos: ${goals}
Restricciones: ${intake.constraints || 'Ninguna mencionada'}
Timeline: ${intake.timeline || 'Flexible'}

TU MISIÓN: Desarrollar una estrategia de marketing completa, accionable y diferenciada para este negocio.

PERSONALIDAD: Estratégico, directo, con entusiasmo genuino. Usás español rioplatense. Mostrás expertise real con ejemplos concretos. Máximo 600 palabras en tu análisis.

ESTRUCTURA TU RESPUESTA:
1. Análisis de posicionamiento
2. Propuesta de valor única
3. Canales recomendados
4. Concepto central de campaña
5. Mensajes clave

CUANDO TERMINES TU ANÁLISIS, incluí exactamente este bloque al final:

\`\`\`strategy-output
{
  "positioning": "descripción del posicionamiento",
  "uniqueValueProp": "propuesta de valor única y memorable en una oración",
  "targetSegments": ["segmento 1", "segmento 2"],
  "messagingPillars": ["pilar 1", "pilar 2", "pilar 3"],
  "recommendedChannels": ["canal 1", "canal 2", "canal 3"],
  "campaignConcept": "concepto central de la campaña en 2-3 oraciones",
  "keyMessages": ["mensaje clave 1", "mensaje clave 2", "mensaje clave 3"]
}
\`\`\`

IMPORTANTE: El bloque JSON debe ser lo último en tu mensaje. No agregues texto después del bloque.`
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set')
    return Response.json({ error: 'API key no configurada' }, { status: 500 })
  }

  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { campaignId, messages: rawMessages } = await request.json()

    if (!campaignId) {
      return Response.json({ error: 'Se requiere campaignId' }, { status: 400 })
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', session.user.id)
      .single()

    if (campaignError || !campaign) {
      return Response.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    const intake = (campaign.intake_data as Record<string, unknown>) ?? {}

    const messages =
      !rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0
        ? [{ role: 'user', content: 'Analizá este negocio y desarrollá la estrategia de marketing completa.' }]
        : rawMessages

    const systemPrompt = buildSystemPrompt(intake)
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            system: systemPrompt,
            messages,
          })

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          console.error('Streaming error:', err)
          const message = err instanceof Error ? err.message : 'Error en streaming'
          const data = `data: ${JSON.stringify({ error: message })}\n\n`
          controller.enqueue(encoder.encode(data))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Strategist agent error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
