(function () {
  const STORAGE_KEY = '3sn_ml_form';
  const sessionId = new URLSearchParams(location.search).get('session_id') || '';
  const status = document.getElementById('status');
  const result = document.getElementById('result');
  const errorEl = document.getElementById('error');
  const actions = document.getElementById('actions');
  const downloadBtn = document.getElementById('download-btn');
  const regenBtn = document.getElementById('regen-btn');
  const remainingEl = document.getElementById('remaining');
  let docxBase64 = null;
  let title = 'marco-logico';

  const cacheKey = `3sn_ml_result_${sessionId}`;
  const getForm = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };
  const getCache = () => { try { return JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { return null; } };
  const setCache = (v) => { try { localStorage.setItem(cacheKey, JSON.stringify(v)); } catch { /* opcional */ } };

  function show(data) {
    docxBase64 = data.docx;
    title = data.matrix.titulo || title;
    status.innerHTML = '';
    result.innerHTML = window.ML.renderFull(data.matrix);
    actions.classList.remove('hidden');
    regenBtn.disabled = data.remaining <= 0;
    remainingEl.textContent = data.remaining > 0 ? `Te quedan ${data.remaining} versiones.` : 'Has usado todas las versiones de este proyecto.';
  }

  async function generate() {
    errorEl.textContent = '';
    const form = getForm();
    if (!sessionId || !form) {
      status.innerHTML = '';
      errorEl.textContent = 'No encontramos los datos del proyecto en este navegador. Abre este enlace en el mismo navegador donde rellenaste el formulario, o escríbenos con el email de tu pago.';
      return;
    }
    status.innerHTML = '<p class="loading">Preparando tu matriz completa… Tarda entre 30 y 60 segundos. No cierres esta página.</p>';
    regenBtn.disabled = true;
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, form }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Error inesperado');
      setCache(json);
      show(json);
    } catch (err) {
      status.innerHTML = '';
      errorEl.textContent = err.message;
      regenBtn.disabled = false;
    }
  }

  downloadBtn.addEventListener('click', () => {
    if (!docxBase64) return;
    const bytes = Uint8Array.from(atob(docxBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Marco-Logico-${title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60)}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  regenBtn.addEventListener('click', generate);

  // Si ya se generó en este navegador, no gastamos otra versión al recargar.
  const cached = getCache();
  if (cached) show(cached); else generate();
})();
