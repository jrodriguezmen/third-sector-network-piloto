import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import checkout from '../api/checkout.js';
import generate from '../api/generate.js';
import preview from '../api/preview.js';
import { cleanForm, formHash } from '../lib/form.js';
import { setStripeClient } from '../lib/stripe.js';
import { fakeRes, fakeStripe, FORM, FULL_MATRIX, PREVIEW_MATRIX } from './helpers.js';

process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.SITE_URL = 'https://3sn.test';
const realFetch = globalThis.fetch;
const HASH = formHash(cleanForm(FORM));

function mockClaude(texts) {
  const queue = [...texts];
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    const text = queue.shift();
    return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text }] }) };
  };
  return () => calls;
}

afterEach(() => { globalThis.fetch = realFetch; setStripeClient(null); });

test('preview: devuelve la vista previa y rechaza bots y métodos no POST', async () => {
  mockClaude([JSON.stringify(PREVIEW_MATRIX)]);
  const res = fakeRes();
  await preview({ method: 'POST', body: { form: FORM } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.matrix.objetivo_general.descripcion, 'OG');

  const bot = fakeRes();
  await preview({ method: 'POST', body: { form: FORM, web: 'spam' } }, bot);
  assert.equal(bot.statusCode, 400);

  const get = fakeRes();
  await preview({ method: 'GET' }, get);
  assert.equal(get.statusCode, 405);

  const invalid = fakeRes();
  await preview({ method: 'POST', body: { form: { ...FORM, problema: '' } } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.match(invalid.payload.error, /problema/i);
});

test('checkout: crea la sesión ligada al proyecto, con factura y URLs correctas', async () => {
  const stripe = fakeStripe();
  setStripeClient(stripe);
  const res = fakeRes();
  await checkout({ method: 'POST', headers: {}, body: { form: FORM } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.url, 'https://checkout.stripe.test/abc');
  const p = stripe.state.created[0];
  assert.equal(p.metadata.form_hash, HASH);
  assert.equal(p.line_items[0].price_data.unit_amount, 4900);
  assert.equal(p.line_items[0].price_data.currency, 'eur');
  assert.equal(p.invoice_creation.enabled, true);
  assert.equal(p.success_url, 'https://3sn.test/gracias.html?session_id={CHECKOUT_SESSION_ID}');
});

test('generate: con pago válido genera matriz y Word, y cuenta la versión', async () => {
  const stripe = fakeStripe({ hash: HASH });
  setStripeClient(stripe);
  mockClaude([JSON.stringify(FULL_MATRIX)]);
  const res = fakeRes();
  await generate({ method: 'POST', body: { session_id: 'cs_test_abc', form: FORM } }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.payload.docx.length > 1000);
  assert.equal(res.payload.remaining, 2);
  assert.deepEqual(stripe.state.updates, ['1']);
});

test('generate: rechaza pagos no completados, de otro proyecto o ids inválidos', async () => {
  const cases = [
    [{ paid: false, hash: HASH }, 'cs_test_abc', 402],
    [{ hash: 'otro' }, 'cs_test_abc', 403],
    [{ hash: HASH }, 'no-es-un-id', 400],
  ];
  for (const [opts, id, status] of cases) {
    setStripeClient(fakeStripe(opts));
    const getCalls = mockClaude([JSON.stringify(FULL_MATRIX)]);
    const res = fakeRes();
    await generate({ method: 'POST', body: { session_id: id, form: FORM } }, res);
    assert.equal(res.statusCode, status, `esperaba ${status}`);
    assert.equal(getCalls(), 0, 'no debe llamar a la IA');
  }
});

test('generate: bloquea al superar el máximo de versiones', async () => {
  setStripeClient(fakeStripe({ hash: HASH, genCount: '3' }));
  const getCalls = mockClaude([JSON.stringify(FULL_MATRIX)]);
  const res = fakeRes();
  await generate({ method: 'POST', body: { session_id: 'cs_test_abc', form: FORM } }, res);
  assert.equal(res.statusCode, 429);
  assert.equal(getCalls(), 0);
});

test('generate: si la IA falla, devuelve la versión reservada', async () => {
  const stripe = fakeStripe({ hash: HASH, genCount: '1' });
  setStripeClient(stripe);
  mockClaude(['roto', 'roto']);
  const res = fakeRes();
  await generate({ method: 'POST', body: { session_id: 'cs_test_abc', form: FORM } }, res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(stripe.state.updates, ['2', '1']);
  assert.doesNotMatch(res.payload.error, /roto/);
});

test('generate: con código de piloto válido genera sin Stripe; inválido o sin códigos, 403', async () => {
  const stripe = fakeStripe({ hash: 'x' });
  setStripeClient(stripe);
  process.env.PILOT_CODES = 'ONG-ACOGE, ong-verde';
  mockClaude([JSON.stringify(FULL_MATRIX)]);
  const ok = fakeRes();
  await generate({ method: 'POST', body: { pilot_code: ' ong-acoge ', form: FORM } }, ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.payload.pilot, true);
  assert.ok(ok.payload.docx.length > 1000);
  assert.deepEqual(stripe.state.updates, [], 'no toca Stripe');

  const getCalls = mockClaude([JSON.stringify(FULL_MATRIX)]);
  const bad = fakeRes();
  await generate({ method: 'POST', body: { pilot_code: 'OTRO', form: FORM } }, bad);
  assert.equal(bad.statusCode, 403);
  process.env.PILOT_CODES = '';
  const none = fakeRes();
  await generate({ method: 'POST', body: { pilot_code: 'ONG-ACOGE', form: FORM } }, none);
  assert.equal(none.statusCode, 403);
  assert.equal(getCalls(), 0, 'no llama a la IA con códigos no válidos');
  delete process.env.PILOT_CODES;
});
