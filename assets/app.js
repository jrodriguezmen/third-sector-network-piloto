(function () {
  const STORAGE_KEY = '3sn_ml_form';
  const form = document.getElementById('project-form');
  const previewBtn = document.getElementById('preview-btn');
  const buyBtn = document.getElementById('buy-btn');
  const formError = document.getElementById('form-error');
  const buyError = document.getElementById('buy-error');
  const previewSection = document.getElementById('preview');
  const previewContent = document.getElementById('preview-content');

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } },
    set(v) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch { /* sin almacenamiento: seguimos */ } },
  };

  function readForm() {
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) if (k !== 'web') data[k] = String(v).trim();
    return data;
  }

  // Recupera lo que la persona hubiera escrito antes (por ejemplo, si cancela el pago).
  const saved = store.get();
  if (saved) for (const [k, v] of Object.entries(saved)) if (form.elements[k]) form.elements[k].value = v;
  form.addEventListener('input', () => store.set(readForm()));

  async function post(url, payload) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Error inesperado');
    return json;
  }

  function busy(btn, on, text) {
    btn.disabled = on;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = text; } else if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    const data = readForm();
    const missing = [...form.querySelectorAll('[required]')].find((el) => el.value.trim().length < 3);
    if (missing) { formError.textContent = 'Rellena los campos obligatorios (*).'; missing.focus(); return; }
    store.set(data);
    busy(previewBtn, true, 'Generando vista previa… (unos 20 segundos)');
    try {
      const { matrix } = await post('/api/preview', { form: data, web: form.elements.web.value });
      previewContent.innerHTML = window.ML.renderPreview(matrix);
      previewSection.classList.remove('hidden');
      previewSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      formError.textContent = err.message;
    } finally {
      busy(previewBtn, false);
    }
  });

  // Código de acceso del piloto: lleva a la página de la matriz sin pasar por el pago.
  const codeForm = document.getElementById('code-form');
  codeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    buyError.textContent = '';
    const code = document.getElementById('code-input').value.trim();
    if (!code) { buyError.textContent = 'Escribe tu código de acceso.'; return; }
    store.set(store.get() || readForm());
    window.location.href = `gracias.html?codigo=${encodeURIComponent(code)}`;
  });

  buyBtn.addEventListener('click', async () => {
    buyError.textContent = '';
    const data = store.get() || readForm();
    busy(buyBtn, true, 'Redirigiendo al pago…');
    try {
      const { url } = await post('/api/checkout', { form: data });
      window.location.href = url;
    } catch (err) {
      buyError.textContent = err.message;
      busy(buyBtn, false);
    }
  });
})();
