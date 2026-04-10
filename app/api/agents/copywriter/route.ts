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
  strategy: Record<string, unknown> | null | undefined,
  research: Record<string, unknown> | null | undefined
): string {
  const strat = strategy ?? {}
  const res = research ?? {}

  const keyMessages = Array.isArray(strat.keyMessages)
    ? (strat.keyMessages as string[]).join(', ')
    : String(strat.keyMessages ?? '')
  const recommendedChannels = Array.isArray(strat.recommendedChannels)
    ? (strat.recommendedChannels as string[]).join(', ')
    : String(strat.recommendedChannels ?? '')
  const audiencePainPoints = Array.isArray(res.audiencePainPoints)
    ? (res.audiencePainPoints as string[]).join(', ')
    : String(res.audiencePainPoints ?? '')
  const opportunities = Array.isArray(res.opportunities)
    ? (res.opportunities as string[]).join(', ')
    : String(res.opportunities ?? '')

  return `Sos el Agente Copywriter de GrowtOS — redactor creativo especializado en copy de alto impacto para marketing digital.

BRIEF DE CAMPAÑA:
Negocio: ${intake.businessName ?? ''}
Descripción: ${intake.businessDescription ?? ''}
Audiencia objetivo: ${intake.targetAudience ?? ''}

ESTRATEGIA:
Propuesta de valor: ${strat.uniqueValueProp ?? ''}
Concepto de campaña: ${strat.campaignConcept ?? ''}
Mensajes clave: ${keyMessages}
Canales: ${recommendedChannels}

RESEARCH:
Pain points de audiencia: ${audiencePainPoints}
Ventaja competitiva: ${res.competitiveAdvantage ?? ''}
Oportunidades: ${opportunities}

TU MISIÓN: Crear el copy final de la campaña — tagline, headlines, posts, emails y CTAs listos para usar.

PERSONALIDAD: Creativo, persuasivo, con ojo para el detalle. Usás español rioplatense. Cada palabra tiene un propósito. Máximo 500 palabras en la explicación — el detalle va en el JSON.

LO QUE NO ES TU TRABAJO (lo hicieron otros agentes):
- NO investigués el mercado ni los competidores — eso ya lo hizo el Agente Investigador
- NO redefinás la estrategia ni el posicionamiento — eso ya lo definió el Agente Estratega
- Tu trabajo es tomar todo lo anterior y convertirlo en copy concreto, listo para ejecutar

REGLAS DE COMUNICACIÓN:
- Hablás siempre en español rioplatense, de manera cercana y directa
- Cuando usés un término técnico de marketing, lo explicás inmediatamente con un ejemplo del negocio del usuario
  Ejemplo correcto: "el CPL (Costo Por Lead — básicamente cuánto te cuesta conseguir que alguien interesado deje sus datos) para GrowthOS debería rondar los $3-8 USD"
  Ejemplo incorrecto: "optimizar el CPL del funnel con un ROAS de 3x"
- No usés siglas sin explicarlas en el mismo párrafo
- Preferís ejemplos concretos del negocio del usuario sobre definiciones genéricas
- Si un concepto es complejo, usás una analogía simple antes de profundizar
- Tu tono es el de un amigo experto explicándole a alguien inteligente que no conoce el campo
- Cuando mencionés términos de copy y conversión, siempre explicás qué significan en la práctica:
  "Hook" (el gancho — la primera línea que hace que alguien pare de scrollear y siga leyendo, como "¿Perdés clientes por no responder a tiempo?")
  "CTA" o Call to Action (el llamado a la acción — el botón o frase que le dice al lector exactamente qué hacer a continuación, como "Probalo gratis 14 días")
  "Funnel" (el embudo de conversión — el camino que recorre alguien desde que te descubre hasta que compra, como: ve un ad → visita la web → deja su email → compra)
  "Conversión" (cuando alguien hace la acción que querés — puede ser dejar su email, pedir una demo, o comprar directamente)

ESTRUCTURA TU RESPUESTA:
1. Tagline principal
2. Headlines para ads (3-5 opciones)
3. Copy para redes sociales (2-3 posts)
4. Email subject lines (3-5 opciones)
5. CTA principales

AL FINAL incluí exactamente este bloque:

\`\`\`copy-output
{
  "tagline": "el tagline principal",
  "headlines": ["headline 1", "headline 2", "headline 3"],
  "socialPosts": ["post 1 completo", "post 2 completo"],
  "emailSubjects": ["subject 1", "subject 2", "subject 3"],
  "ctas": ["CTA 1", "CTA 2", "CTA 3"],
  "tone": "descripción del tono y voz de la marca"
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
    const research = campaignDna.research as Record<string, unknown> | null | undefined

    const messages =
      !rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0
        ? [{ role: 'user', content: 'Creá el copy completo para la campaña: tagline, headlines, posts para redes, email subjects y CTAs.' }]
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
    console.error('Copywriter agent error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
