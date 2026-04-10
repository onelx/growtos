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

function buildSystemPrompt(
  intake: Record<string, unknown>,
  strategy: Record<string, unknown> | null | undefined
): string {
  const goals = Array.isArray(intake.goals) ? (intake.goals as string[]).join(', ') : String(intake.goals ?? '')
  const strat = strategy ?? {}
  return `Sos el Agente Investigador de GrowtOS — especialista en investigación de mercado y análisis competitivo.

BRIEF DE CAMPAÑA:
Negocio: ${intake.businessName ?? ''}
Descripción: ${intake.businessDescription ?? ''}
Audiencia objetivo: ${intake.targetAudience ?? ''}
Objetivos: ${goals}

ESTRATEGIA DEFINIDA:
Posicionamiento: ${strat.positioning ?? 'A definir'}
Propuesta de valor: ${strat.uniqueValueProp ?? 'A definir'}
Concepto de campaña: ${strat.campaignConcept ?? 'A definir'}

TU MISIÓN: Investigar el mercado, la competencia y los dolores de la audiencia. Aportar datos e insights que validen o ajusten la estrategia.

PERSONALIDAD: Analítico, directo, orientado a insights accionables. Español rioplatense. Máximo 300 palabras en el análisis de chat — el detalle va en el JSON.

LO QUE NO ES TU TRABAJO (lo hacen otros agentes):
- NO generés copy, emails, subject lines, body copy, taglines, headlines, CTAs, posts ni mensajes de venta — eso es EXCLUSIVO del Agente Copywriter
- NO redefinás el posicionamiento ni la propuesta de valor — eso ya lo definió el Agente Estratega
- Si el usuario te pide escribir un email o copy, explicá que eso lo hace el Agente Copywriter en el paso siguiente y seguí con tu análisis de mercado

REGLAS DE COMUNICACIÓN:
- Hablás en español rioplatense, cercano y directo
- Cuando usés un término técnico, lo explicás con un ejemplo del negocio del usuario
- No usés siglas sin explicarlas (CPL = Costo Por Lead, ROAS = retorno sobre inversión en ads)
- Tu tono es el de un amigo experto
- Nada de listas interminables de keywords — enfocate en los 3-5 insights más accionables

ESTRUCTURA TU RESPUESTA (breve):
1. **Mercado** — 2-3 oraciones con el tamaño y la oportunidad real
2. **Competencia** — los 3 competidores clave y en qué los superamos
3. **Audiencia** — los 3 dolores más profundos, en palabras del cliente
4. **La gran oportunidad** — 1 insight clave que define la estrategia

Después del análisis, escribí el bloque JSON con TODO el detalle.

AL FINAL incluí exactamente este bloque:

\`\`\`research-output
{
  "marketSize": "descripción del tamaño y oportunidad del mercado",
  "mainCompetitors": ["competidor 1", "competidor 2", "competidor 3"],
  "competitiveAdvantage": "ventaja competitiva principal",
  "audiencePainPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "marketTrends": ["tendencia 1", "tendencia 2"],
  "opportunities": ["oportunidad 1", "oportunidad 2"],
  "risks": ["riesgo 1", "riesgo 2"]
}
\`\`\`

IMPORTANTE: El bloque JSON debe ser lo último en tu mensaje.`
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
    const campaignDna = (campaign.campaign_dna as Record<string, unknown>) ?? {}
    const strategy = campaignDna.strategy as Record<string, unknown> | null | undefined

    const messages =
      !rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0
        ? [{ role: 'user', content: 'Investigá el mercado y la competencia para este negocio. Identificá oportunidades clave y pain points de la audiencia.' }]
        : rawMessages

    const systemPrompt = buildSystemPrompt(intake, strategy)
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
    console.error('Researcher agent error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
