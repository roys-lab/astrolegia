import { Router } from 'express';
import { InterpretRequestSchema } from '@astrolegia/contracts';
import { env } from '../../env';
import { asyncHandler, HttpError, parse, sendData } from '../../http';
import { computeLimiter } from '../../middleware/rate-limit';
import { generateText } from '../../services/ai-gateway';
import { retrieveContext } from '../../services/knowledge-retrieval';

export const astrologyRouter = Router();

/**
 * POST /v1/client/astrology/interpret — lectura de una carta con IA.
 * Portado de la route handler de Astrolegia v1; el RAG nunca rompe la lectura.
 */
astrologyRouter.post('/interpret', computeLimiter, asyncHandler(async (req, res) => {
    if (!env.GEMINI_API_KEY) {
        throw new HttpError(500, 'CONFIGURATION_ERROR', 'La interpretación con IA no está configurada (falta GEMINI_API_KEY)');
    }
    const { planets, aspects, userName } = parse(InterpretRequestSchema, req.body);

    let ragContext = '';
    try {
        const keyLines = planets
            .split('\n')
            .filter((l) => /\b(sol|luna|ascendente)\b/i.test(l))
            .slice(0, 3)
            .join(', ');
        const ragQuery = keyLines || planets.slice(0, 250);
        if (ragQuery.trim()) {
            ragContext = await retrieveContext(ragQuery, { k: 4, topic: 'astrologia' });
        }
    } catch (e) {
        console.warn(`[${req.requestId}] RAG omitido:`, e instanceof Error ? e.message : String(e));
    }

    const prompt = `Actuá como un motor de análisis astrológico avanzado. Analizá los siguientes datos y generá un reporte directo.

DATOS DE LA CARTA NATAL DE ${userName || 'USUARIO'}:
${planets}

ASPECTOS PRINCIPALES:
${aspects}
${ragContext ? `\n${ragContext}\n` : ''}
INSTRUCCIONES CRÍTICAS:
- DIRECTIVA PRINCIPAL: NO saludes. NO usés introducciones ("Hola", "Aquí está tu análisis", "Es un placer"). EMPEZÁ DIRECTAMENTE con el contenido.
- Basate EXCLUSIVAMENTE en las posiciones listadas; no inventes grados ni aspectos. Si un punto no aparece en los datos, no lo menciones.
- Los datos ahora incluyen Quirón, Nodo Norte, Nodo Sur y Lilith (cuando están presentes): integralos en la lectura — Quirón como herida/sanación, el eje nodal como dirección evolutiva, Lilith como lo instintivo reprimido — especialmente en la sección de Potencial Evolutivo.
- Tono: Profesional, directo, profundo. Usá español rioplatense (vos/tenés) pero serio.
- Formato: Markdown limpio con negritas para palabras clave.
- Estructura:
  ### 1. Núcleo de Identidad (Sol/Luna/Ascendente)
  ### 2. Dinámicas Afectivas (Venus/Marte)
  ### 3. Estructura y Expansión (Saturn/Júpiter)
  ### 4. Potencial Evolutivo (Transpersonales)
  ### 5. Síntesis Ejecutiva

Tu respuesta debe ser pura información de alto valor, sin relleno conversacional.`;

    let modelUsed = 'desconocido';
    const interpretation = await generateText(prompt, {
        model: 'primary',
        provider: 'claude',
        onServed: (m) => { modelUsed = m; },
    });

    sendData(req, res, { interpretation, modelUsed });
}));
