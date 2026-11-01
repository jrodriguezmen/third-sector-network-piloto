// Crea la sesión de pago de Stripe para un proyecto concreto.
import { cleanForm, formHash } from '../lib/form.js';
import { body, fail, onlyPost, siteUrl } from '../lib/http.js';
import { getStripe, PRICE_CENTS } from '../lib/stripe.js';

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  try {
    const form = cleanForm(body(req).form);
    const stripe = getStripe();
    const base = siteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'es',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: PRICE_CENTS,
          product_data: {
            name: 'Matriz de Marco Lógico completa',
            description: form.titulo.slice(0, 200),
          },
        },
      }],
      // Las ONG necesitan factura: Stripe la emite y la envía por email.
      invoice_creation: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'required',
      metadata: { form_hash: formHash(form), titulo: form.titulo.slice(0, 450) },
      payment_intent_data: { metadata: { gen_count: '0' } },
      success_url: `${base}/gracias.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#formulario`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    fail(res, err);
  }
}
