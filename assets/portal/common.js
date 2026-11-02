// Utilidades compartidas del portal 3SN: configuración, cliente de Supabase, API y formato.
(function () {
  const ODS = {
    1: 'Fin de la pobreza', 2: 'Hambre cero', 3: 'Salud y bienestar', 4: 'Educación de calidad', 5: 'Igualdad de género',
    6: 'Agua limpia', 7: 'Energía asequible', 8: 'Trabajo decente', 9: 'Industria e innovación', 10: 'Reducción de desigualdades',
    11: 'Ciudades sostenibles', 12: 'Consumo responsable', 13: 'Acción por el clima', 14: 'Vida submarina', 15: 'Vida de ecosistemas',
    16: 'Paz y justicia', 17: 'Alianzas',
  };
  const ESTADOS = {
    borrador: 'Borrador', publicado: 'Publicado', archivado: 'Archivado',
    abierta: 'Abierta a financiación', comprometida: 'Con financiador', en_ejecucion: 'En ejecución', cerrada: 'Completada',
    pendiente: 'Pendiente', entregado: 'Entregado', validado: 'Validado', rechazado: 'Rechazado',
    propuesto: 'Propuesto', aceptado: 'Aceptado · pendiente de firmas', firmado: 'Firmado', completado: 'Completado', cancelado: 'Cancelado',
    validada: 'Validada', rechazada: 'Rechazada',
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n) => `${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
  const estado = (e) => `<span class="badge badge-${esc(e)}">${esc(ESTADOS[e] || e)}</span>`;
  const qs = (k) => new URLSearchParams(location.search).get(k);

  let cfgPromise = null;
  function config() {
    if (!cfgPromise) cfgPromise = fetch('/api/portal/config').then((r) => r.json());
    return cfgPromise;
  }

  let sb = null;
  async function client() {
    if (sb) return sb;
    const cfg = await config();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error('El portal todavía no está configurado (faltan las variables de Supabase).');
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    return sb;
  }

  async function session() {
    const c = await client();
    const { data } = await c.auth.getSession();
    return data.session;
  }

  // Llama a una función del servidor con la sesión del usuario.
  async function api(path, payload) {
    const s = await session();
    const res = await fetch(`/api/portal/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(s ? { authorization: `Bearer ${s.access_token}` } : {}) },
      body: JSON.stringify(payload || {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Error inesperado');
    return json;
  }

  async function nav() {
    const el = document.getElementById('nav-session');
    if (!el) return;
    try {
      const s = await session();
      el.innerHTML = s ? '<a href="/portal/panel.html">Mi panel</a>' : '<a href="/portal/entrar.html">Entrar</a>';
    } catch { el.innerHTML = ''; }
  }

  function flash(el, msg, kind = 'error') {
    el.textContent = msg;
    el.className = kind === 'error' ? 'error' : 'ok';
  }

  window.P3 = { ODS, ESTADOS, esc, eur, estado, qs, config, client, session, api, nav, flash };
  document.addEventListener('DOMContentLoaded', nav);
})();
