/* ══════════════════════════════════════════════════════════════
   api-manager.js — Backend Connection Console
   Replaces direct browser → LLM-provider calls with calls to our
   own FastAPI backend (main.py). The backend holds the LLM
   provider/key server-side (.env) — the browser only talks to
   OUR api, never to Gemini/Claude/etc. directly.
   Public interface kept identical to before: window.ApiManager.generate(prompt, opts)
   so chatbot.js / app.js / patient-ml.js need NO changes.
   ══════════════════════════════════════════════════════════════ */

(function () {
  const STORAGE_KEY = 'asthmai_backend_config';

  let config = {
    baseUrl: 'http://localhost:8000'
  };

  /* ── PERSISTENCE ─────────────────────────────────────────────── */
  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) config = Object.assign(config, saved);
    } catch (e) { /* ignore corrupt storage */ }
  }

  function saveConfig() {
    const input = document.getElementById('backend-url-input');
    config.baseUrl = (input.value || '').trim().replace(/\/+$/, '') || 'http://localhost:8000';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    renderSummary();
    const result = document.getElementById('conn-test-result');
    result.className = 'conn-test ok';
    result.textContent = window.T('api-config-saved');
  }

  /* ── UI RENDERING ────────────────────────────────────────────── */
  function renderFormFromConfig() {
    const input = document.getElementById('backend-url-input');
    if (input) input.value = config.baseUrl;
  }

  function renderSummary() {
    const el = document.getElementById('api-config-summary');
    if (!el) return;
    el.innerHTML = `
      <div class="mini-stat"><b style="font-size:13px;font-family:var(--font-mono);">${config.baseUrl}</b><span>BACKEND URL</span></div>`;
  }

  /* ── CONNECTION TEST ─────────────────────────────────────────── */
  async function testConnection() {
    const result = document.getElementById('conn-test-result');
    const btn = document.getElementById('api-test-btn');
    saveConfig();
    btn.disabled = true;
    result.className = 'conn-test ok';
    result.textContent = window.T('api-testing');
    try {
      const res = await fetchWithTimeout(config.baseUrl + '/api/health', {});
      const data = await res.json();
      if (!res.ok || data.status !== 'ok') throw new Error(JSON.stringify(data));
      result.className = 'conn-test ok';
      result.textContent = window.T('api-conn-ok');
    } catch (e) {
      result.className = 'conn-test err';
      result.textContent = window.T('api-conn-fail') + e.message;
    }
    btn.disabled = false;
  }

  /* ── LOW-LEVEL FETCH ─────────────────────────────────────────── */
  const REQUEST_TIMEOUT_MS = 45000;

  async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s — is the FastAPI backend running at ${config.baseUrl}?`);
      }
      throw new Error(`Could not reach backend at ${config.baseUrl} — is uvicorn running? (${e.message})`);
    } finally {
      clearTimeout(timer);
    }
  }

  /* ── PUBLIC: generate(prompt, options) ──────────────────────────
     Same signature as before. Internally calls our FastAPI
     /api/ai/generate endpoint, which forwards to whichever LLM
     provider is configured server-side in .env (LLM_PROVIDER/LLM_API_KEY). */
  async function generate(prompt, options) {
    const opts = Object.assign({ maxTokens: 1200, temperature: 0.3, system: null }, options || {});
    const res = await fetchWithTimeout(config.baseUrl + '/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        system: opts.system,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature
      })
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Backend ${res.status}: ${errBody.slice(0, 200)}`);
    }
    const data = await res.json();
    if (!data.text) throw new Error('Empty response from backend');
    return data.text;
  }

  /* ── EVENT WIRING ────────────────────────────────────────────── */
  function wireEvents() {
    const saveBtn = document.getElementById('api-save-btn');
    const testBtn = document.getElementById('api-test-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveConfig);
    if (testBtn) testBtn.addEventListener('click', testConnection);
  }

  function onLangChange() { renderSummary(); }

  function init() {
    loadConfig();
    renderFormFromConfig();
    renderSummary();
    wireEvents();
  }

  window.ApiManager = {
    init, generate, onLangChange,
    getBaseUrl: () => config.baseUrl,
    getConfig: () => ({ ...config })
  };
})();
