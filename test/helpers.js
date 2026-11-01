// Datos y dobles de prueba compartidos por los tests.
export const FORM = {
  titulo: 'Empleo digital para mujeres migrantes en Usera',
  organizacion: 'Asociación Ejemplo',
  problema: 'Las mujeres migrantes del barrio tienen muy baja inserción laboral por falta de competencias digitales y de red de contactos.',
  poblacion: '120 mujeres migrantes de 25 a 55 años',
  ubicacion: 'Usera, Madrid',
  duracion: '12 meses',
  presupuesto: '60.000 €',
  financiador: 'IRPF 0,7 % Comunidad de Madrid',
  enfoques: 'género',
  contexto: '',
};

const level = (d) => ({ descripcion: d, indicadores: ['Al mes 12, el 70 % de las 120 participantes…'], fuentes: ['Encuesta pre/post'], supuestos: ['El contexto económico se mantiene estable'] });

export const FULL_MATRIX = {
  titulo: FORM.titulo,
  resumen: 'Proyecto de formación digital e intermediación laboral.',
  arbol_problemas: { problema_central: 'Baja inserción laboral', causas: ['Brecha digital'], efectos: ['Pobreza'] },
  objetivo_general: level('Contribuir a la inclusión sociolaboral de las mujeres migrantes de Usera'),
  objetivo_especifico: level('Mejorada la empleabilidad de 120 mujeres migrantes'),
  resultados: [
    { codigo: 'R1', ...level('Adquiridas competencias digitales básicas'), actividades: [{ codigo: 'A1.1', descripcion: 'Talleres de alfabetización digital', recursos: 'Formadora, aula, 10 portátiles' }] },
    { codigo: 'R2', ...level('Fortalecida la red de contactos <script>alert(1)</script>'), actividades: [{ codigo: 'A2.1', descripcion: 'Encuentros con empresas', recursos: 'Técnica de empleo' }] },
  ],
  precondiciones: ['Cesión de aula por el centro municipal'],
  riesgos: [{ riesgo: 'Baja asistencia', mitigacion: 'Horarios flexibles y ludoteca' }],
};

export const PREVIEW_MATRIX = {
  titulo: FORM.titulo,
  resumen: 'Resumen',
  arbol_problemas: FULL_MATRIX.arbol_problemas,
  objetivo_general: { descripcion: 'OG' },
  objetivo_especifico: { descripcion: 'OE' },
  resultados: [{ codigo: 'R1', descripcion: 'Resultado 1' }],
};

// fetch falso que imita la API de Messages de Anthropic.
export function fakeFetch(responses) {
  const calls = [];
  const queue = [...responses];
  const fn = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    const text = queue.shift();
    return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text }] }), text: async () => text };
  };
  fn.calls = calls;
  return fn;
}

// Objeto res mínimo compatible con el de Vercel.
export function fakeRes() {
  const res = { statusCode: 200, headers: {}, payload: undefined };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (p) => { res.payload = p; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}

// Stripe falso con una sesión de checkout y su PaymentIntent.
export function fakeStripe({ paid = true, hash, genCount = '0' } = {}) {
  const state = { created: [], pi: { id: 'pi_123', metadata: { gen_count: genCount } }, updates: [] };
  return {
    state,
    checkout: {
      sessions: {
        create: async (params) => { state.created.push(params); return { id: 'cs_test_abc', url: 'https://checkout.stripe.test/abc' }; },
        retrieve: async (id) => ({ id, payment_status: paid ? 'paid' : 'unpaid', metadata: { form_hash: hash }, payment_intent: { ...state.pi, metadata: { ...state.pi.metadata } } }),
      },
    },
    paymentIntents: {
      update: async (id, params) => { state.updates.push(params.metadata.gen_count); state.pi.metadata = { ...params.metadata }; return state.pi; },
    },
  };
}
