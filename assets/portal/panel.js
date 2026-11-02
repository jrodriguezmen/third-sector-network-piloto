// Panel privado del portal 3SN: perfil, proyectos y líneas (ONG), compromisos, convenios,
// firmas, entregas y validaciones (ONG y financiador).
(async function () {
  const { esc, eur, estado, ODS } = window.P3;
  const app = document.getElementById('app');
  const errEl = document.getElementById('error');
  let sb; let user; let perfil;

  function fail(err) { errEl.textContent = err.message || String(err); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  const must = ({ data, error }) => { if (error) throw error; return data; };

  try {
    sb = await P3.client();
    const s = await P3.session();
    if (!s) { location.href = '/portal/entrar.html'; return; }
    user = s.user;
    document.getElementById('logout').addEventListener('click', async () => { await sb.auth.signOut(); location.href = '/portal/'; });
    perfil = must(await sb.from('perfiles').select('*').eq('id', user.id).maybeSingle());
    if (!perfil) return onboarding();
    const volver = P3.qs('volver');
    if (volver && volver.startsWith('/portal/')) { location.href = volver; return; }
    await render();
  } catch (err) { app.innerHTML = ''; fail(err); }

  // ---------- Alta de perfil ----------
  function onboarding() {
    app.innerHTML = `<section class="card narrow">
      <h1>Completa tu perfil</h1>
      <form id="f-perfil" novalidate>
        <fieldset class="choice"><legend>¿Qué tipo de entidad eres?</legend>
          <label><input type="radio" name="tipo" value="ong" required> ONG o entidad social <span class="small">(publica proyectos)</span></label>
          <label><input type="radio" name="tipo" value="financiador"> Empresa o entidad financiadora <span class="small">(financia líneas)</span></label>
        </fieldset>
        <label>Nombre de la entidad *<input name="nombre" maxlength="150" required></label>
        <div class="grid-2">
          <label>CIF<input name="cif" maxlength="20"></label>
          <label>Web<input name="web" type="url" maxlength="200" placeholder="https://"></label>
        </div>
        <label>Descripción breve<textarea name="descripcion" rows="3" maxlength="2000"></textarea></label>
        <button class="btn btn-primary" type="submit">Guardar perfil</button>
        <p class="error" id="msg-perfil"></p>
      </form></section>`;
    const f = document.getElementById('f-perfil');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tipo = f.tipo.value;
      if (!tipo || f.nombre.value.trim().length < 2) { P3.flash(document.getElementById('msg-perfil'), 'Elige el tipo de entidad y escribe su nombre.'); return; }
      try {
        perfil = must(await sb.from('perfiles').insert({
          id: user.id, tipo, nombre: f.nombre.value.trim(), cif: f.cif.value.trim() || null,
          web: f.web.value.trim() || null, descripcion: f.descripcion.value.trim() || null,
        }).select().single());
        await render();
      } catch (err) { P3.flash(document.getElementById('msg-perfil'), err.message); }
    });
  }

  // ---------- Panel principal ----------
  async function render() {
    errEl.textContent = '';
    const head = `<section class="panel-head">
      <div><p class="small">${perfil.tipo === 'ong' ? 'ONG' : 'Entidad financiadora'}</p><h1>${esc(perfil.nombre)}</h1></div>
      ${perfil.tipo === 'financiador' ? '<a class="btn btn-primary" href="/portal/">Explorar proyectos</a>' : ''}
    </section>`;
    const compromisos = await cargarCompromisos();
    if (perfil.tipo === 'ong') {
      const proyectos = must(await sb.from('proyectos').select('*,lineas(*,hitos(*))').eq('ong_id', user.id).order('creado', { ascending: false }));
      app.innerHTML = `${head}
        <h2 class="section-title">Compromisos de financiación</h2>
        <div id="compromisos">${compromisos.length ? compromisos.map(compromisoHtml).join('') : '<p class="muted">Todavía no has recibido propuestas. Publica tus proyectos para que las empresas puedan verlos.</p>'}</div>
        <h2 class="section-title">Mis proyectos</h2>
        <details class="card"><summary class="btn btn-primary">+ Nuevo proyecto</summary>${proyectoForm()}</details>
        <div id="proyectos">${proyectos.map(proyectoHtml).join('') || '<p class="muted">Aún no tienes proyectos.</p>'}</div>`;
      bindOng();
    } else {
      app.innerHTML = `${head}
        <h2 class="section-title">Mis compromisos</h2>
        <div id="compromisos">${compromisos.length ? compromisos.map(compromisoHtml).join('') : '<p class="muted">Aún no has financiado ninguna línea. <a href="/portal/">Explora los proyectos</a>.</p>'}</div>`;
    }
    bindCompromisos();
  }

  async function cargarCompromisos() {
    return must(await sb.from('compromisos')
      .select('*,perfiles(nombre),contratos(*),entregas(*),lineas(id,titulo,importe,estado,hitos(*),proyectos(id,titulo,ong_id,perfiles(nombre)))')
      .order('creado', { ascending: false }));
  }

  // ---------- ONG: proyectos y líneas ----------
  function proyectoForm() {
    return `<form id="f-proyecto" novalidate>
      <label>Título *<input name="titulo" maxlength="200" required></label>
      <label>Resumen *<textarea name="resumen" rows="3" maxlength="3000" required placeholder="Qué problema abordáis, con quién y qué cambiará"></textarea></label>
      <label>Ubicación<input name="ubicacion" maxlength="200" placeholder="Barrio, municipio, país"></label>
      <fieldset class="ods"><legend>Objetivos de Desarrollo Sostenible</legend>
        ${Object.entries(ODS).map(([n, t]) => `<label class="check"><input type="checkbox" name="ods" value="${n}"> ${n}. ${esc(t)}</label>`).join('')}
      </fieldset>
      <button class="btn btn-primary" type="submit">Crear proyecto (borrador)</button>
      <p class="error msg"></p>
    </form>`;
  }

  function proyectoHtml(p) {
    const lineas = (p.lineas || []).sort((a, b) => a.creado.localeCompare(b.creado));
    return `<article class="card" data-proyecto="${esc(p.id)}">
      <div class="linea-head"><h3>${esc(p.titulo)}</h3>${estado(p.estado)}</div>
      <p>${esc(p.resumen)}</p>
      <div class="row-actions">
        ${p.estado === 'publicado'
          ? `<a class="btn" href="/portal/proyecto.html?id=${esc(p.id)}">Ver ficha pública</a><button class="btn" data-accion="despublicar">Retirar del portal</button>`
          : `<button class="btn btn-primary" data-accion="publicar" ${lineas.length ? '' : 'disabled title="Añade al menos una línea"'}>Publicar en el portal</button>`}
      </div>
      <h4>Líneas</h4>
      ${lineas.map((l) => `<div class="mini">
          <div class="linea-head"><strong>${esc(l.titulo)}</strong><span>${eur(l.importe)} ${estado(l.estado)}</span></div>
          <ol class="hitos">${(l.hitos || []).sort((a, b) => a.orden - b.orden).map((h) => `<li>${esc(h.titulo)} · ${esc(h.porcentaje)} % ${estado(h.estado)}</li>`).join('')}</ol>
          ${l.estado === 'abierta' ? `<button class="linkbtn danger" data-borrar-linea="${esc(l.id)}">Eliminar línea</button>` : ''}
        </div>`).join('') || '<p class="muted small">Sin líneas todavía.</p>'}
      <details><summary class="btn">+ Añadir línea financiable</summary>${lineaForm()}</details>
    </article>`;
  }

  function hitoRow(i) {
    return `<div class="hito-row">
      <input name="h_titulo" maxlength="200" placeholder="Hito ${i}: p. ej. Talleres realizados" aria-label="Título del hito">
      <input name="h_entregable" maxlength="500" placeholder="Entregable: p. ej. vídeo de 2 min + listado" aria-label="Entregable">
      <input name="h_pct" type="number" min="1" max="100" step="0.01" placeholder="%" aria-label="Porcentaje">
      <input name="h_fecha" type="date" aria-label="Fecha prevista">
    </div>`;
  }

  function lineaForm() {
    return `<form class="f-linea" novalidate>
      <label>Título de la línea *<input name="titulo" maxlength="200" required placeholder="p. ej. Formación en agricultura ecológica"></label>
      <label>Descripción *<textarea name="descripcion" rows="3" maxlength="3000" required></textarea></label>
      <label>Importe que se busca (€) *<input name="importe" type="number" min="1" step="0.01" required></label>
      <label>Contrapartidas para quien financia <span class="small">(una por línea)</span><textarea name="contrapartidas" rows="3" placeholder="Vídeo de 2 minutos sobre el impacto&#10;Logo en los materiales del taller&#10;Jornada de voluntariado para su plantilla"></textarea></label>
      <p class="label">Hitos <span class="small">(los porcentajes deben sumar 100 %; cada hito libera su parte al validarse su entregable)</span></p>
      <div class="hitos-rows">${hitoRow(1)}${hitoRow(2)}</div>
      <button class="linkbtn" type="button" data-add-hito>+ Añadir hito</button>
      <p class="small suma">Suma: 0 %</p>
      <button class="btn btn-primary" type="submit">Guardar línea</button>
      <p class="error msg"></p>
    </form>`;
  }

  function bindOng() {
    const fp = document.getElementById('f-proyecto');
    fp.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = fp.querySelector('.msg');
      if (fp.titulo.value.trim().length < 3 || fp.resumen.value.trim().length < 10) { P3.flash(msg, 'Escribe un título y un resumen (mín. 10 caracteres).'); return; }
      try {
        must(await sb.from('proyectos').insert({
          ong_id: user.id, titulo: fp.titulo.value.trim(), resumen: fp.resumen.value.trim(),
          ubicacion: fp.ubicacion.value.trim() || null, ods: [...fp.querySelectorAll('[name=ods]:checked')].map((c) => Number(c.value)),
        }));
        await render();
      } catch (err) { P3.flash(msg, err.message); }
    });

    document.querySelectorAll('[data-proyecto]').forEach((card) => {
      const pid = card.dataset.proyecto;
      card.querySelectorAll('[data-accion]').forEach((b) => b.addEventListener('click', async () => {
        try {
          must(await sb.from('proyectos').update({ estado: b.dataset.accion === 'publicar' ? 'publicado' : 'borrador' }).eq('id', pid));
          await render();
        } catch (err) { fail(err); }
      }));
      card.querySelectorAll('[data-borrar-linea]').forEach((b) => b.addEventListener('click', async () => {
        if (!window.confirm('¿Eliminar esta línea y sus hitos?')) return;
        try { must(await sb.from('lineas').delete().eq('id', b.dataset.borrarLinea)); await render(); } catch (err) { fail(err); }
      }));
      const fl = card.querySelector('.f-linea');
      const rows = fl.querySelector('.hitos-rows');
      const suma = fl.querySelector('.suma');
      const actualizarSuma = () => {
        const s = [...rows.querySelectorAll('[name=h_pct]')].reduce((t, i) => t + Number(i.value || 0), 0);
        suma.textContent = `Suma: ${Math.round(s * 100) / 100} %`;
        suma.className = `small suma ${Math.round(s * 100) / 100 === 100 ? 'ok' : ''}`;
      };
      fl.addEventListener('input', actualizarSuma);
      fl.querySelector('[data-add-hito]').addEventListener('click', () => {
        rows.insertAdjacentHTML('beforeend', hitoRow(rows.children.length + 1));
      });
      fl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = fl.querySelector('.msg');
        const hitos = [...rows.querySelectorAll('.hito-row')].map((r, i) => ({
          orden: i + 1, titulo: r.querySelector('[name=h_titulo]').value.trim(), entregable: r.querySelector('[name=h_entregable]').value.trim(),
          porcentaje: Number(r.querySelector('[name=h_pct]').value), fecha_prevista: r.querySelector('[name=h_fecha]').value || null,
        })).filter((h) => h.titulo || h.entregable || h.porcentaje);
        const total = Math.round(hitos.reduce((s, h) => s + h.porcentaje, 0) * 100) / 100;
        if (fl.titulo.value.trim().length < 3 || fl.descripcion.value.trim().length < 10 || !(Number(fl.importe.value) > 0)) { P3.flash(msg, 'Rellena título, descripción (mín. 10 caracteres) e importe.'); return; }
        if (!hitos.length || hitos.some((h) => h.titulo.length < 3 || h.entregable.length < 3 || !(h.porcentaje > 0))) { P3.flash(msg, 'Cada hito necesita título, entregable y porcentaje.'); return; }
        if (total !== 100) { P3.flash(msg, `Los hitos suman ${total} %; deben sumar 100 %.`); return; }
        try {
          const linea = must(await sb.from('lineas').insert({
            proyecto_id: pid, titulo: fl.titulo.value.trim(), descripcion: fl.descripcion.value.trim(), importe: Number(fl.importe.value),
            contrapartidas: fl.contrapartidas.value.split('\n').map((s) => s.trim()).filter(Boolean),
          }).select().single());
          must(await sb.from('hitos').insert(hitos.map((h) => ({ ...h, linea_id: linea.id }))));
          await render();
        } catch (err) { P3.flash(msg, err.message); }
      });
    });
  }

  // ---------- Compromisos, convenios, entregas ----------
  function compromisoHtml(c) {
    const l = c.lineas;
    const p = l.proyectos;
    const soyOng = p.ong_id === user.id;
    const contrato = Array.isArray(c.contratos) ? c.contratos[0] : c.contratos;
    const entregas = c.entregas || [];
    const otra = soyOng ? `Financiador: ${esc(c.perfiles?.nombre || '')}` : `ONG: ${esc(p.perfiles?.nombre || '')}`;
    let cuerpo = '';
    if (c.mensaje) cuerpo += `<blockquote>${esc(c.mensaje)}</blockquote>`;
    if (c.estado === 'propuesto') {
      cuerpo += soyOng
        ? `<div class="row-actions"><button class="btn btn-primary" data-responder="aceptar">Aceptar y generar convenio</button><button class="btn" data-responder="rechazar">Rechazar</button></div>`
        : '<p class="muted">Esperando respuesta de la ONG.</p>';
    }
    if (contrato) {
      const yoFirme = soyOng ? contrato.firma_ong : contrato.firma_financiador;
      cuerpo += `<div class="contrato">
        <p><strong>Convenio</strong> · huella <a class="hash" href="/portal/verificar.html?hash=${esc(contrato.hash)}">${esc(contrato.hash.slice(0, 16))}…</a>
        · Comisión 3SN ${esc(contrato.comision_pct)} % (${eur(contrato.comision_importe)})</p>
        <p class="small">Firma ONG: ${contrato.firma_ong ? `✅ ${new Date(contrato.firma_ong).toLocaleString('es-ES')}` : '⏳ pendiente'} ·
        Firma financiador: ${contrato.firma_financiador ? `✅ ${new Date(contrato.firma_financiador).toLocaleString('es-ES')}` : '⏳ pendiente'}</p>
        <details><summary>Leer el convenio</summary><pre class="contrato-texto">${esc(contrato.texto)}</pre></details>
        <div class="row-actions">
          <button class="btn" data-descargar>Descargar convenio (.txt)</button>
          ${c.estado === 'aceptado' && !yoFirme ? '<button class="btn btn-primary" data-firmar>Firmar el convenio</button>' : ''}
        </div>
      </div>`;
    }
    if (['firmado', 'completado'].includes(c.estado)) {
      const hitos = (l.hitos || []).sort((a, b) => a.orden - b.orden);
      cuerpo += `<h4>Hitos</h4>${hitos.map((h) => {
        const deHito = entregas.filter((e) => e.hito_id === h.id).sort((a, b) => b.creado.localeCompare(a.creado));
        const ultima = deHito[0];
        let acciones = '';
        if (soyOng && ['pendiente', 'rechazado'].includes(h.estado) && c.estado === 'firmado') acciones = entregaForm(h);
        if (!soyOng && ultima && ultima.estado === 'pendiente') acciones = validarForm(ultima);
        return `<div class="mini">
          <div class="linea-head"><strong>${h.orden}. ${esc(h.titulo)}</strong><span>${esc(h.porcentaje)} % · ${eur((Number(c.importe) * Number(h.porcentaje)) / 100)} ${estado(h.estado)}</span></div>
          <p class="small">Entregable: ${esc(h.entregable)}</p>
          ${deHito.map((e) => `<p class="small entrega">${estado(e.estado)} ${esc(e.descripcion)} ·
            <button class="linkbtn" data-ver-entrega="${esc(e.id)}">Ver entrega</button> ·
            huella <a class="hash" href="/portal/verificar.html?hash=${esc(e.hash)}">${esc(e.hash.slice(0, 12))}…</a>
            ${e.comentario ? `<br><em>Comentario: ${esc(e.comentario)}</em>` : ''}</p>`).join('')}
          ${acciones}
        </div>`;
      }).join('')}`;
    }
    return `<article class="card compromiso" data-compromiso="${esc(c.id)}">
      <div class="linea-head"><h3>${esc(l.titulo)}</h3><p class="amount">${eur(c.importe)}</p></div>
      <p class="small">Proyecto: <a href="/portal/proyecto.html?id=${esc(p.id)}">${esc(p.titulo)}</a> · ${otra} · ${estado(c.estado)}</p>
      ${cuerpo}
      <p class="error msg"></p>
    </article>`;
  }

  function entregaForm(h) {
    return `<form class="f-entrega" data-hito="${esc(h.id)}" novalidate>
      <label>Descripción de la entrega<input name="descripcion" maxlength="2000" placeholder="p. ej. Vídeo resumen de los 4 talleres"></label>
      <div class="grid-2">
        <label>Archivo (vídeo, PDF, fotos…)<input name="archivo" type="file"></label>
        <label>…o enlace<input name="enlace" type="url" placeholder="https://"></label>
      </div>
      <button class="btn btn-primary" type="submit">Registrar entrega</button>
    </form>`;
  }

  function validarForm(e) {
    return `<form class="f-validar" data-entrega="${esc(e.id)}" novalidate>
      <label>Comentario (obligatorio si rechazas)<input name="comentario" maxlength="2000"></label>
      <div class="row-actions">
        <button class="btn btn-primary" type="submit" value="validar">Validar entrega</button>
        <button class="btn" type="submit" value="rechazar">Rechazar</button>
      </div>
    </form>`;
  }

  function bindCompromisos() {
    document.querySelectorAll('[data-compromiso]').forEach((card) => {
      const id = card.dataset.compromiso;
      const msg = card.querySelector('.msg');
      const run = async (btn, fn) => {
        if (btn) btn.disabled = true;
        try { await fn(); await render(); } catch (err) { P3.flash(msg, err.message); if (btn) btn.disabled = false; }
      };
      card.querySelectorAll('[data-responder]').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.responder === 'rechazar' && !window.confirm('¿Rechazar esta propuesta de financiación?')) return;
        run(b, () => P3.api('responder', { compromiso_id: id, accion: b.dataset.responder }));
      }));
      card.querySelector('[data-firmar]')?.addEventListener('click', (e) => {
        if (!window.confirm('Vas a firmar electrónicamente el convenio. ¿Lo has leído y estás de acuerdo?')) return;
        run(e.target, () => P3.api('firmar', { compromiso_id: id }));
      });
      card.querySelector('[data-descargar]')?.addEventListener('click', () => {
        const texto = card.querySelector('.contrato-texto').textContent;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
        a.download = `convenio-3sn-${id.slice(0, 8)}.txt`;
        document.body.appendChild(a); a.click(); a.remove();
      });
      card.querySelectorAll('[data-ver-entrega]').forEach((b) => b.addEventListener('click', async () => {
        try {
          const { url } = await P3.api('archivo', { entrega_id: b.dataset.verEntrega });
          if (url) window.open(url, '_blank', 'noopener');
        } catch (err) { P3.flash(msg, err.message); }
      }));
      card.querySelectorAll('.f-entrega').forEach((f) => f.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = f.querySelector('button');
        run(btn, async () => {
          const descripcion = f.descripcion.value.trim();
          const enlace = f.enlace.value.trim();
          const file = f.archivo.files[0];
          if (descripcion.length < 3) throw new Error('Describe la entrega.');
          if (!file && !enlace) throw new Error('Adjunta un archivo o un enlace.');
          let archivo = null;
          if (file) {
            if (file.size > 50 * 1024 * 1024) throw new Error('El archivo supera 50 MB. Usa un enlace (YouTube, Drive…).');
            archivo = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
            btn.textContent = 'Subiendo archivo…';
            must(await sb.storage.from('entregas').upload(archivo, file));
          }
          btn.textContent = 'Registrando en blockchain…';
          await P3.api('entregar', { compromiso_id: id, hito_id: f.dataset.hito, descripcion, enlace, archivo });
        });
      }));
      card.querySelectorAll('.f-validar').forEach((f) => f.addEventListener('submit', (e) => {
        e.preventDefault();
        const decision = e.submitter?.value || 'validar';
        if (decision === 'validar' && !window.confirm('Al validar, este tramo queda liberado para la ONG. ¿Confirmas?')) return;
        run(e.submitter, () => P3.api('validar', { entrega_id: f.dataset.entrega, decision, comentario: f.comentario.value.trim() }));
      }));
    });
  }
})();
