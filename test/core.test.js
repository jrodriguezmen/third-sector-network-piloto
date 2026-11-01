import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import { generateMatrix } from '../lib/anthropic.js';
import { matrixToDocxBase64 } from '../lib/docx.js';
import { cleanForm, formHash, ValidationError } from '../lib/form.js';
import { buildPrompt, parseMatrix } from '../lib/prompt.js';
import { fakeFetch, FORM, FULL_MATRIX, PREVIEW_MATRIX } from './helpers.js';

process.env.ANTHROPIC_API_KEY = 'test-key';

test('cleanForm valida obligatorios y longitudes, y descarta campos desconocidos', () => {
  const clean = cleanForm({ ...FORM, extra: 'x' });
  assert.equal(clean.titulo, FORM.titulo);
  assert.equal('extra' in clean, false);
  assert.throws(() => cleanForm({ ...FORM, problema: '' }), ValidationError);
  assert.throws(() => cleanForm({ ...FORM, titulo: 'x'.repeat(151) }), /demasiado largo/);
  assert.throws(() => cleanForm(null), ValidationError);
});

test('formHash cambia si cambia el proyecto e ignora espacios exteriores', () => {
  const a = formHash(cleanForm(FORM));
  assert.equal(a, formHash(cleanForm({ ...FORM, titulo: `  ${FORM.titulo}  ` })));
  assert.notEqual(a, formHash(cleanForm({ ...FORM, titulo: 'Otro proyecto distinto' })));
});

test('buildPrompt incluye los datos y el esquema correcto según el modo', () => {
  const full = buildPrompt(cleanForm(FORM), 'full');
  assert.match(full.user, /Usera, Madrid/);
  assert.match(full.user, /actividades/);
  const preview = buildPrompt(cleanForm(FORM), 'preview');
  assert.doesNotMatch(preview.user, /"actividades"/);
});

test('parseMatrix acepta JSON con texto alrededor y normaliza', () => {
  const m = parseMatrix(`Aquí tienes:\n${JSON.stringify(FULL_MATRIX)}\nFin`, 'full');
  assert.equal(m.resultados.length, 2);
  assert.equal(m.resultados[0].actividades[0].codigo, 'A1.1');
  assert.deepEqual(parseMatrix(JSON.stringify(PREVIEW_MATRIX), 'preview').resultados[0].indicadores, []);
});

test('parseMatrix rechaza matrices completas sin indicadores o actividades', () => {
  const bad = structuredClone(FULL_MATRIX);
  bad.resultados[0].actividades = [];
  assert.throws(() => parseMatrix(JSON.stringify(bad), 'full'), /incompleta/);
  assert.throws(() => parseMatrix('sin json', 'full'), /no contiene JSON/);
});

test('generateMatrix usa el modelo de cada modo y reintenta una vez si el JSON falla', async () => {
  const fetchImpl = fakeFetch(['esto no es json', JSON.stringify(FULL_MATRIX)]);
  const m = await generateMatrix(cleanForm(FORM), 'full', { fetchImpl });
  assert.equal(m.titulo, FORM.titulo);
  assert.equal(fetchImpl.calls.length, 2);
  assert.equal(fetchImpl.calls[0].body.model, 'claude-sonnet-5-5');
  assert.equal(fetchImpl.calls[0].headers['x-api-key'], 'test-key');

  const fetchPrev = fakeFetch([JSON.stringify(PREVIEW_MATRIX)]);
  await generateMatrix(cleanForm(FORM), 'preview', { fetchImpl: fetchPrev });
  assert.equal(fetchPrev.calls[0].body.model, 'claude-haiku-5-5');

  await assert.rejects(generateMatrix(cleanForm(FORM), 'full', { fetchImpl: fakeFetch(['x', 'y']) }), /No se pudo generar/);
});

test('matrixToDocxBase64 produce un .docx válido con la matriz', async () => {
  const b64 = await matrixToDocxBase64(parseMatrix(JSON.stringify(FULL_MATRIX), 'full'), { organizacion: 'Asociación Ejemplo' });
  const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const xml = await zip.file('word/document.xml').async('string');
  assert.match(xml, /Talleres de alfabetización digital/);
  assert.match(xml, /Indicadores objetivamente verificables/);
  assert.match(xml, /Asociación Ejemplo/);
});
