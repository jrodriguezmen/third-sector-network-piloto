// Generación completa tras el pago: comprueba en Stripe que la sesión está pagada,
// que corresponde a este proyecto y que no se ha superado el número de regeneraciones.
// El contador vive en los metadatos del PaymentIntent, así que no hace falta base de datos.
import { generateMatrix } from '../lib/anthropic.js';
import { matrixToDocxBase64 } from '../lib/docx.js';
import { cleanForm, formHash } from '../lib/form.js';
import { body, fail, onlyPost } from '../lib/http.js';
import { getStripe, MAX_GENERATIONS } from '../lib/stripe.js';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  let stripe; let piId; let count;
  try {
    const data = body(req);
    const sessionId = typeof data.session_id === 'string' ? data.session_id : '';
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) throw new HttpError(400, 'Falta el identificador del pago.');
    const form = cleanForm(data.form);

    stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
    if (session.payment_status !== 'paid') throw new HttpError(402, 'El pago no está completado.');
    if (session.metadata?.form_hash !== formHash(form)) {
      throw new HttpError(403, 'Este pago corresponde a otro proyecto. Usa los mismos datos con los que pagaste.');
    }

    const pi = session.payment_intent;
    piId = typeof pi === 'string' ? pi : pi.id;
    count = Number((typeof pi === 'object' && pi.metadata?.gen_count) || 0);
    if (count >= MAX_GENERATIONS) {
      throw new HttpError(429, `Ya has generado esta matriz ${MAX_GENERATIONS} veces. Escríbenos si necesitas otra versión.`);
    }
    // Reservamos la generación antes de llamar a la IA; si falla, la devolvemos.
    await stripe.paymentIntents.update(piId, { metadata: { gen_count: String(count + 1) } });

    let matrix;
    try {
      matrix = await generateMatrix(form, 'full');
    } catch (err) {
      await stripe.paymentIntents.update(piId, { metadata: { gen_count: String(count) } }).catch(() => {});
      throw err;
    }
    const docx = await matrixToDocxBase64(matrix, { organizacion: form.organizacion });
    res.status(200).json({ matrix, docx, remaining: MAX_GENERATIONS - (count + 1) });
  } catch (err) {
    fail(res, err);
  }
}
