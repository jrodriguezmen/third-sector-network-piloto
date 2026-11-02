// Generación completa. Dos formas de acceso:
// 1) Pago: comprueba en Stripe que la sesión está pagada, que corresponde a este proyecto y que no
//    se ha superado el número de versiones (el contador vive en los metadatos del PaymentIntent).
// 2) Código de piloto (PILOT_CODES): genera sin pago, para las ONG del piloto.
import { generateMatrix } from '../lib/anthropic.js';
import { matrixToDocxBase64 } from '../lib/docx.js';
import { cleanForm, formHash } from '../lib/form.js';
import { body, fail, onlyPost } from '../lib/http.js';
import { isValidPilotCode, normalizeCode } from '../lib/pilot.js';
import { getStripe, MAX_GENERATIONS } from '../lib/stripe.js';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function buildResponse(form) {
  const matrix = await generateMatrix(form, 'full');
  const docx = await matrixToDocxBase64(matrix, { organizacion: form.organizacion });
  return { matrix, docx };
}

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  try {
    const data = body(req);

    if (data.pilot_code !== undefined) {
      if (!isValidPilotCode(data.pilot_code)) throw new HttpError(403, 'El código de acceso no es válido o ya no está activo.');
      const form = cleanForm(data.form);
      console.log(`[piloto] generación con código ${normalizeCode(data.pilot_code)}: ${form.titulo}`);
      const out = await buildResponse(form);
      return res.status(200).json({ ...out, remaining: null, pilot: true });
    }

    const sessionId = typeof data.session_id === 'string' ? data.session_id : '';
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) throw new HttpError(400, 'Falta el identificador del pago.');
    const form = cleanForm(data.form);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
    if (session.payment_status !== 'paid') throw new HttpError(402, 'El pago no está completado.');
    if (session.metadata?.form_hash !== formHash(form)) {
      throw new HttpError(403, 'Este pago corresponde a otro proyecto. Usa los mismos datos con los que pagaste.');
    }

    const pi = session.payment_intent;
    const piId = typeof pi === 'string' ? pi : pi.id;
    const count = Number((typeof pi === 'object' && pi.metadata?.gen_count) || 0);
    if (count >= MAX_GENERATIONS) {
      throw new HttpError(429, `Ya has generado esta matriz ${MAX_GENERATIONS} veces. Escríbenos si necesitas otra versión.`);
    }
    // Reservamos la generación antes de llamar a la IA; si falla, la devolvemos.
    await stripe.paymentIntents.update(piId, { metadata: { gen_count: String(count + 1) } });

    let out;
    try {
      out = await buildResponse(form);
    } catch (err) {
      await stripe.paymentIntents.update(piId, { metadata: { gen_count: String(count) } }).catch(() => {});
      throw err;
    }
    res.status(200).json({ ...out, remaining: MAX_GENERATIONS - (count + 1) });
  } catch (err) {
    fail(res, err);
  }
}
