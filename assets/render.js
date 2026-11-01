// Pinta la matriz en HTML. Todo el texto pasa por esc() porque viene de la IA.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = (items) => (items && items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '<span class="muted">—</span>');

  function problems(ap) {
    if (!ap || !ap.problema_central) return '';
    return `
      <h3>Árbol de problemas</h3>
      <div class="tree">
        <div><h4>Efectos</h4>${list(ap.efectos)}</div>
        <div class="core"><h4>Problema central</h4><p>${esc(ap.problema_central)}</p></div>
        <div><h4>Causas</h4>${list(ap.causas)}</div>
      </div>`;
  }

  function renderPreview(m) {
    return `
      <p class="summary"><strong>${esc(m.titulo)}</strong><br>${esc(m.resumen)}</p>
      ${problems(m.arbol_problemas)}
      <h3>Lógica de intervención</h3>
      <dl class="logic">
        <dt>Objetivo general</dt><dd>${esc(m.objetivo_general.descripcion)}</dd>
        <dt>Objetivo específico</dt><dd>${esc(m.objetivo_especifico.descripcion)}</dd>
        ${m.resultados.map((r) => `<dt>Resultado ${esc(r.codigo)}</dt><dd>${esc(r.descripcion)}</dd>`).join('')}
      </dl>
      <div class="locked">
        <table><thead><tr><th>Indicadores</th><th>Fuentes de verificación</th><th>Supuestos</th></tr></thead>
        <tbody><tr><td>████████ ██ ███</td><td>██████ ████</td><td>████ ██████</td></tr>
        <tr><td>██████ ████ ██</td><td>████████</td><td>██████ ███</td></tr></tbody></table>
        <p>🔒 Disponible en la matriz completa</p>
      </div>`;
  }

  function levelRow(label, l) {
    return `<tr><td><strong>${esc(label)}</strong><br>${esc(l.descripcion)}</td><td>${list(l.indicadores)}</td><td>${list(l.fuentes)}</td><td>${list(l.supuestos)}</td></tr>`;
  }

  function renderFull(m) {
    const rows = [levelRow('Objetivo general', m.objetivo_general), levelRow('Objetivo específico', m.objetivo_especifico)];
    for (const r of m.resultados) {
      rows.push(levelRow(`Resultado ${r.codigo}`, r));
      for (const a of r.actividades) {
        rows.push(`<tr class="act"><td><strong>${esc(a.codigo)}</strong> ${esc(a.descripcion)}</td><td colspan="3"><span class="muted">Recursos:</span> ${esc(a.recursos || '—')}</td></tr>`);
      }
    }
    const riesgos = m.riesgos && m.riesgos.length
      ? `<h3>Riesgos y mitigación</h3><ul>${m.riesgos.map((r) => `<li><strong>${esc(r.riesgo)}</strong> → ${esc(r.mitigacion)}</li>`).join('')}</ul>` : '';
    const precon = m.precondiciones && m.precondiciones.length ? `<h3>Precondiciones</h3>${list(m.precondiciones)}` : '';
    return `
      <p class="summary"><strong>${esc(m.titulo)}</strong><br>${esc(m.resumen)}</p>
      ${problems(m.arbol_problemas)}
      <h3>Matriz de planificación</h3>
      <div class="table-wrap"><table class="matrix">
        <thead><tr><th>Lógica de intervención</th><th>Indicadores (IOV)</th><th>Fuentes de verificación</th><th>Supuestos</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></div>
      ${precon}${riesgos}`;
  }

  window.ML = { esc, renderPreview, renderFull };
})();
