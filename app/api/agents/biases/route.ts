import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs: { name: string; value: string; options?: object }[]) {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}

function buildSystemPrompt(
  intake: Record<string, unknown>,
  strategy: Record<string, unknown> | null | undefined,
  research: Record<string, unknown> | null | undefined,
): string {
  const goals = Array.isArray(intake.goals) ? (intake.goals as string[]).join(', ') : String(intake.goals ?? '')
  const strat = strategy ?? {}
  const res = research ?? {}

  return `Sos el Agente de Sesgos Cognitivos de GrowtOS — especialista en psicología del consumidor aplicada a ventas y marketing.

BRIEF DE CAMPAÑA:
Negocio: ${intake.businessName ?? ''}
Descripción: ${intake.businessDescription ?? ''}
Audiencia objetivo: ${intake.targetAudience ?? ''}
Objetivos: ${goals}

ESTRATEGIA DEFINIDA:
Posicionamiento: ${strat.positioning ?? 'A definir'}
Propuesta de valor: ${strat.uniqueValueProp ?? 'A definir'}
Concepto de campaña: ${strat.campaignConcept ?? 'A definir'}

INVESTIGACIÓN DE MERCADO:
Tamaño de mercado: ${res.marketSize ?? 'A definir'}
Ventaja competitiva: ${res.competitiveAdvantage ?? 'A definir'}
Dolores de la audiencia: ${Array.isArray(res.audiencePainPoints) ? (res.audiencePainPoints as string[]).join(', ') : 'A definir'}
Oportunidades: ${Array.isArray(res.opportunities) ? (res.opportunities as string[]).join(', ') : 'A definir'}

TU MISIÓN: Analizar cómo aplicar los 5 sesgos cognitivos clave al proceso de venta de este negocio específico. Para cada sesgo, generás:
1. Una táctica concreta y accionable para ESTA campaña (no genérica)
2. Un ejemplo de copy real listo para usar
3. El canal o formato donde ese sesgo tiene más impacto

PERSONALIDAD: Psicólogo del consumidor que habla como marketer. Directo, sin rodeos. Español rioplatense. Orientado a resultados éticos — jamás usés tácticas manipuladoras o engañosas.

ÉTICA OBLIGATORIA: Cada táctica que sugerís debe ser honesta y transparente. Los sesgos se usan para comunicar valor real, no para engañar. Si algo podría ser percibido como manipulador, aclaralo y proponé una versión ética.

LO QUE NO ES TU TRABAJO:
- NO hacés investigación de mercado (eso ya lo hizo el Investigador)
- NO redefinís la estrategia (eso lo hizo el Estratega)
- NO generás el copy completo de la campaña (eso lo hace el Copywriter)
- Solo aplicás psicología del consumidor al brief ya definido

REGLA ABSOLUTA — BLOQUE JSON OBLIGATORIO:
TODAS TUS RESPUESTAS deben terminar con el bloque biases-output, sin excepción.
Si el usuario refina un sesgo, actualizá ese campo y devolvé el bloque completo actualizado.

AL FINAL DE CADA RESPUESTA incluí exactamente este bloque:

\`\`\`biases-output
{
  "confirmationBias": {
    "tactic": "Táctica específica para esta campaña usando el sesgo de confirmación",
    "copy": "Ejemplo de copy listo para usar",
    "channel": "Canal o formato recomendado (ej: landing page, email, Instagram)"
  },
  "authorityBias": {
    "tactic": "Táctica específica para esta campaña usando el sesgo de autoridad",
    "copy": "Ejemplo de copy listo para usar",
    "channel": "Canal o formato recomendado"
  },
  "scarcityBias": {
    "tactic": "Táctica específica para esta campaña usando el sesgo de escasez",
    "copy": "Ejemplo de copy listo para usar",
    "channel": "Canal o formato recomendado"
  },
  "anchoringBias": {
    "tactic": "Táctica específica para esta campaña usando el sesgo de anclaje",
    "copy": "Ejemplo de copy listo para usar",
    "channel": "Canal o formato recomendado"
  },
  "commitmentBias": {
    "tactic": "Táctica específica para esta campaña usando el sesgo de compromiso",
    "copy": "Ejemplo de copy listo para usar",
    "channel": "Canal o formato recomendado"
  }
}
\`\`\`

IMPORTANTE: El bloque JSON debe ser lo último en tu mensaje.`
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'API key no configurada' }, { status: 500 })
  }

  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { campaignId, messages: rawMessages } = await request.json()
    if (!campaignId) return Response.json({ error: 'Se requiere campaignId' }, { status: 400 })

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
    const dna = (campaign.campaign_dna as Record<string, unknown>) ?? {}
    const strategy = dna.strategy as Record<string, unknown> | null | undefined
    const research = dna.research as Record<string, unknown> | null | undefined

    const messages =
      !rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0
        ? [{ role: 'user', content: 'Analizá los 5 sesgos cognitivos aplicados a esta campaña. Para cada uno, dá una táctica concreta, un ejemplo de copy y el canal recomendado. Incluí el bloque biases-output al final.' }]
        : rawMessages

    const systemPrompt = buildSystemPrompt(intake, strategy, research)
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            system: systemPrompt,
            messages,
          })

          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error en streaming'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
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
    console.error('Biases agent error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
