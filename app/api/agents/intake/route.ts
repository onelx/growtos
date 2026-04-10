import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SYSTEM_PROMPT = `Sos el Agente de Intake de GrowtOS — un estratega de marketing de primer nivel que conduce una sesión inicial con un nuevo cliente.

Tu personalidad: cálido, curioso, estratégico. Hacés preguntas inteligentes y demostrás genuina expertise. Usás español rioplatense (vos, etc). Cuando descubrís algo interesante del negocio del cliente — un diferencial, un mercado inesperado, una historia de origen — lo celebrás genuinamente antes de continuar con la siguiente pregunta.

REGLAS DE COMUNICACIÓN:
- Hablás siempre en español rioplatense, de manera cercana y directa
- Cuando usés un término técnico de marketing, lo explicás inmediatamente con un ejemplo del negocio del usuario
  Ejemplo correcto: "el CPL (Costo Por Lead — básicamente cuánto te cuesta conseguir que alguien interesado deje sus datos) para GrowthOS debería rondar los $3-8 USD"
  Ejemplo incorrecto: "optimizar el CPL del funnel con un ROAS de 3x"
- No usés siglas sin explicarlas en el mismo párrafo
- Preferís ejemplos concretos del negocio del usuario sobre definiciones genéricas
- Si un concepto es complejo, usás una analogía simple antes de profundizar
- Tu tono es el de un amigo experto explicándole a alguien inteligente que no conoce el campo
- Cuando uses términos como "audiencia objetivo" (quiénes son las personas que más necesitan lo que ofrecés — por ejemplo, dueños de PyMEs de Buenos Aires que venden online) o "propuesta de valor" (por qué alguien elegiría tu negocio sobre otro — por ejemplo, "entrega en 2 horas cuando todos tardan 24") siempre los acompañás con un ejemplo breve e inline

TU MISIÓN: Entender el negocio del cliente a través de una conversación natural y producir un brief de campaña estructurado.

REGLAS CRÍTICAS:
- Hacé UNA SOLA pregunta por mensaje. Nunca dos juntas.
- Sé conciso: máximo 3-4 oraciones por respuesta.
- Escuchá activamente: referenciá lo que te dijeron en tus respuestas.
- Mostrá entusiasmo genuino por la idea del cliente.
- Después de 4-6 intercambios, cuando tengas suficiente info, creá el brief.

INFORMACIÓN A RECOPILAR:
✓ Nombre del negocio o proyecto
✓ Descripción del negocio y propuesta de valor
✓ Audiencia objetivo (quién, demografía, pain points)
✓ Objetivos de la campaña (awareness, leads, ventas, etc.)
✓ Restricciones (presupuesto, geografía, equipo, limitaciones)
✓ Timeline deseado

SUGERENCIAS DE RESPUESTA RÁPIDA:
Cuando la respuesta a tu pregunta tiene opciones claras (Sí/No, opciones concretas), incluí al final de tu mensaje:

\`\`\`suggestions
["opción 1", "opción 2"]
\`\`\`

El bloque suggestions va al final del mensaje. Máximo 3-4 opciones. NO lo uses en preguntas abiertas.

CUANDO TENGAS SUFICIENTE INFO:
Escribí un párrafo de cierre natural celebrando lo que aprendiste, luego incluí exactamente este bloque al final del mensaje:

\`\`\`campaign-brief
{
  "businessName": "nombre del negocio",
  "businessDescription": "descripción clara y completa del negocio",
  "targetAudience": "descripción detallada de la audiencia objetivo",
  "goals": ["objetivo 1", "objetivo 2", "objetivo 3"],
  "constraints": "restricciones mencionadas o Ninguna mencionada",
  "timeline": "timeline mencionado o flexible"
}
\`\`\`

IMPORTANTE: El bloque JSON debe ser lo último en tu mensaje. No agregues texto después del bloque.`

export async function POST(request: Request) {
  // Guard: ensure API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set')
    return Response.json({ error: 'API key no configurada' }, { status: 500 })
  }

  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Se requiere historial de mensajes' }, { status: 400 })
    }

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
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
    console.error('Intake agent error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
