import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import { generateMatrix, interpret } from '../lib/anthropic.js';
import { matrixToDocxBase64 } from '../lib/docx.js';
import { cleanForm, formHash, ValidationError } from '../lib/form.js';
import { parseLines } from '../lib/lines.js';
import { buildPrompt, parseMatrix } from '../lib/prompt.js';
import { fakeFetch, FORM, FULL_LINES, FULL_MATRIX, PREVIEW_LINES, PREVIEW_MATRIX } from './helpers.js';

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

test('buildPrompt incluye los datos y el formato por líneas según el modo', () => {
  const full = buildPrompt(cleanForm(FORM), 'full');
  assert.match(full.user, /Usera, Madrid/);
  assert.match(full.user, /^A: A1\.1/m);
  assert.match(full.user, /^RIESGO:/m);
  const preview = buildPrompt(cleanForm(FORM), 'preview');
  assert.doesNotMatch(preview.user, /^A: /m);
  assert.doesNotMatch(preview.user, /^IND: /m);
});

test('parseLines monta la matriz completa: niveles, actividades, continuaciones y formato desordenado', () => {
  const m = parseLines(FULL_LINES);
  assert.equal(m.titulo, 'Telemedicina rural en Guatemala');
  assert.equal(m.arbol_problemas.causas.length, 2);
  assert.equal(m.objetivo_general.indicadores.length, 2);
  assert.equal(m.objetivo_especifico.fuentes[0], 'Registros del puesto de salud');
  assert.equal(m.resultados.length, 2);
  assert.equal(m.resultados[0].codigo, 'R1');
  assert.equal(m.resultados[0].actividades[1].recursos, 'Técnico, 4 tablets');
  assert.match(m.resultados[1].descripcion, /culturalmente adaptado y apropiado/, 'une las líneas de continuación');
  assert.equal(m.riesgos[0].mitigacion, 'Conexión satelital de respaldo');
  const parsed = parseMatrix(m, 'full');
  assert.equal(parsed.resultados[1].actividades[0].codigo, 'A2.1');
});

test('interpret acepta el formato por líneas y, como respaldo, JSON', () => {
  assert.equal(interpret(PREVIEW_LINES, 'preview').resultados.length, 2);
  assert.equal(interpret(JSON.stringify(FULL_MATRIX), 'full').resultados.length, 2);
  assert.throws(() => interpret('Lo siento, no puedo.', 'full'), /Falta el objetivo general/);
});

test('parseMatrix rechaza matrices completas sin indicadores o actividades', () => {
  const bad = structuredClone(FULL_MATRIX);
  bad.resultados[0].actividades = [];
  assert.throws(() => parseMatrix(JSON.stringify(bad), 'full'), /incompleta/);
  assert.throws(() => parseMatrix('sin json', 'full'), /no contiene JSON/);
});

test('parseMatrix tolera claves en camelCase, niveles como texto, envoltorios y JSON dentro de texto', () => {
  const raw = {
    matriz: JSON.stringify({
      tituloProyecto: 'Proyecto X',
      objetivoGeneral: 'Contribuir a la inclusión',
      'Objetivo específico': { enunciado: 'Mejorada la empleabilidad', IOV: ['70 %'], fuentesDeVerificacion: ['Encuesta'], hipotesis: ['Estabilidad'] },
      resultados: [{ codigo: 'R1', resultado: 'Adquiridas competencias', iov: ['80 %'], fuentes: ['Actas'], supuestos: ['Asistencia'], actividades: [{ codigo: 'A1.1', nombre: 'Talleres', recursos: 'Aula' }] }],
    }),
  };
  const m = parseMatrix(raw, 'preview');
  assert.equal(m.titulo, 'Proyecto X');
  assert.equal(m.objetivo_general.descripcion, 'Contribuir a la inclusión');
  assert.deepEqual(m.objetivo_especifico.indicadores, ['70 %']);
  assert.equal(m.resultados[0].actividades[0].descripcion, 'Talleres');
});

test('generateMatrix pide texto plano al modelo de cada modo y reintenta una vez', async () => {
  const fetchImpl = fakeFetch(['Respuesta sin etiquetas', FULL_LINES]);
  const m = await generateMatrix(cleanForm(FORM), 'full', { fetchImpl });
  assert.equal(m.resultados.length, 2);
  assert.equal(fetchImpl.calls.length, 2);
  assert.equal(fetchImpl.calls[0].body.model, 'claude-sonnet-5-5');
  assert.equal('tools' in fetchImpl.calls[0].body, false);
  assert.equal(fetchImpl.calls[0].headers['x-api-key'], 'test-key');

  const fetchPrev = fakeFetch([PREVIEW_LINES]);
  await generateMatrix(cleanForm(FORM), 'preview', { fetchImpl: fetchPrev });
  assert.equal(fetchPrev.calls[0].body.model, 'claude-haiku-5-5');

  await assert.rejects(generateMatrix(cleanForm(FORM), 'full', { fetchImpl: fakeFetch(['x', 'y']) }), /No se pudo generar/);
});

test('generateMatrix reintenta si se corta por longitud y no reintenta errores de la API', async () => {
  let n = 0;
  const cut = async () => { n++; return { ok: true, status: 200, json: async () => ({ stop_reason: 'max_tokens', content: [] }) }; };
  await assert.rejects(generateMatrix(cleanForm(FORM), 'preview', { fetchImpl: cut }), /se cortó/);
  assert.equal(n, 2);
  let m = 0;
  const apiErr = async () => { m++; return { ok: false, status: 400, text: async () => 'bad request' }; };
  await assert.rejects(generateMatrix(cleanForm(FORM), 'preview', { fetchImpl: apiErr }), /API de Claude \(400\)/);
  assert.equal(m, 1);
});

test('matrixToDocxBase64 produce un .docx válido con la matriz', async () => {
  const b64 = await matrixToDocxBase64(parseMatrix(JSON.stringify(FULL_MATRIX), 'full'), { organizacion: 'Asociación Ejemplo' });
  const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const xml = await zip.file('word/document.xml').async('string');
  assert.match(xml, /Talleres de alfabetización digital/);
  assert.match(xml, /Indicadores objetivamente verificables/);
  assert.match(xml, /Asociación Ejemplo/);
});
