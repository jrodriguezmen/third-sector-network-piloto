(function () {
  const STORAGE_KEY = '3sn_ml_form';
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id') || '';
  const pilotCode = params.get('codigo') || '';
  const status = document.getElementById('status');
  const result = document.getElementById('result');
  const errorEl = document.getElementById('error');
  const actions = document.getElementById('actions');
  const downloadBtn = document.getElementById('download-btn');
  const regenBtn = document.getElementById('regen-btn');
  const remainingEl = document.getElementById('remaining');
  let docxBase64 = null;
  let title = 'marco-logico';

  const getForm = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };
  // Con código de piloto, la caché depende también del proyecto (el mismo código sirve para varios).
  const formKey = (f) => { const t = JSON.stringify(f || {}); let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return String(h >>> 0); };
  const cacheKey = pilotCode ? `3sn_ml_result_code_${pilotCode}_${formKey(getForm())}` : `3sn_ml_result_${sessionId}`;
  if (pilotCode) {
    document.querySelector('.hero h1').textContent = 'Tu matriz completa';
    document.querySelector('.hero .lead').textContent = 'Acceso de piloto: gracias por ayudarnos a mejorar 3SN. Tu opinión nos importa mucho.';
  }
  const getCache = () => { try { return JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { return null; } };
  const setCache = (v) => { try { localStorage.setItem(cacheKey, JSON.stringify(v)); } catch { /* opcional */ } };

  function show(data) {
    docxBase64 = data.docx;
    title = data.matrix.titulo || title;
    status.innerHTML = '';
    result.innerHTML = window.ML.renderFull(data.matrix);
    actions.classList.remove('hidden');
    if (data.pilot) {
      regenBtn.disabled = false;
      remainingEl.textContent = 'Acceso de piloto.';
    } else {
      regenBtn.disabled = data.remaining <= 0;
      remainingEl.textContent = data.remaining > 0 ? `Te quedan ${data.remaining} versiones.` : 'Has usado todas las versiones de este proyecto.';
    }
  }

  async function generate() {
    errorEl.textContent = '';
    const form = getForm();
    if ((!sessionId && !pilotCode) || !form) {
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
        body: JSON.stringify(pilotCode ? { pilot_code: pilotCode, form } : { session_id: sessionId, form }),
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
