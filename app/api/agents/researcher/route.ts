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

TU MISIÓN: Investigar el mercado, la competencia y la audiencia para validar y enriquecer la estrategia.

PERSONALIDAD: Analítico, detallista, orientado a datos. Usás español rioplatense. Citás tendencias y comportamientos reales. Máximo 600 palabras.

REGLAS DE COMUNICACIÓN:
- Hablás siempre en español rioplatense, de manera cercana y directa
- Cuando usés un término técnico de marketing, lo explicás inmediatamente con un ejemplo del negocio del usuario
  Ejemplo correcto: "el CPL (Costo Por Lead — básicamente cuánto te cuesta conseguir que alguien interesado deje sus datos) para GrowthOS debería rondar los $3-8 USD"
  Ejemplo incorrecto: "optimizar el CPL del funnel con un ROAS de 3x"
- No usés siglas sin explicarlas en el mismo párrafo
- Preferís ejemplos concretos del negocio del usuario sobre definiciones genéricas
- Si un concepto es complejo, usás una analogía simple antes de profundizar
- Tu tono es el de un amigo experto explicándole a alguien inteligente que no conoce el campo
- Cuando hablés de tamaño de mercado (market size), análisis competitivo o pain points de la audiencia, los explicás siempre en lenguaje llano y los anclás al negocio del usuario
  Ejemplo de market size: "El mercado de software de gestión para gimnasios en LATAM mueve alrededor de $200M por año — básicamente cuánta plata se gasta en soluciones como la que vos querés construir"
  Ejemplo de pain point: "El dolor principal de tu cliente no es 'falta de digitalización', es que pierde una hora por día en tareas manuales que le quitan tiempo para atender a sus clientes"

ESTRUCTURA TU RESPUESTA:
1. Análisis del mercado y tendencias
2. Competidores clave y diferenciación
3. Pain points profundos de la audiencia
4. Oportunidades detectadas
5. Insights accionables

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
